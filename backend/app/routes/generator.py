"""
Schedule generator route for Schedule Crusher.

Accepts unit data and date range, runs the ISM scheduling algorithm,
persists the results, and returns the full schedule.
"""

from datetime import date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.user import User
from app.models.schedule import Schedule
from app.models.unit import Unit
from app.models.task import Task
from app.services.scheduler import generate_schedule
from app.services.fatigue import fatigue_predictor
from app.services.fatigue_helpers import train_user_fatigue_model, apply_fatigue_to_tasks

generator_bp = Blueprint('generator', __name__, url_prefix='/api')


@generator_bp.route('/generate-schedule', methods=['POST'])
@jwt_required()
def generate():
    """Generate a full study schedule from unit data.

    Expects JSON body:
        {
            "title": "Semester Exam Prep",
            "start_date": "2026-06-01",
            "end_date": "2026-06-15",
            "units": [
                {"name": "Unit 1", "importance": 8, "total_points": 20},
                ...
            ]
        }

    Returns:
        201: The created schedule with all units and tasks.
        400: Validation errors.
    """
    user_id = int(get_jwt_identity())
    data = request.get_json()

    if not data:
        return jsonify({'error': 'Request body must be JSON'}), 400

    # --- Validate fields ---
    title = data.get('title', '').strip()
    start_date_str = data.get('start_date', '').strip()
    end_date_str = data.get('end_date', '').strip()
    units_data = data.get('units', [])

    errors = []
    if not title:
        errors.append('Title is required')

    # Parse dates
    start_date = None
    end_date = None
    try:
        start_date = date.fromisoformat(start_date_str)
    except (ValueError, AttributeError):
        errors.append('start_date must be a valid ISO date (YYYY-MM-DD)')
    try:
        end_date = date.fromisoformat(end_date_str)
    except (ValueError, AttributeError):
        errors.append('end_date must be a valid ISO date (YYYY-MM-DD)')

    if start_date and end_date and end_date <= start_date:
        errors.append('end_date must be after start_date')

    if not units_data or not isinstance(units_data, list):
        errors.append('At least one unit is required')

    # Validate each unit
    for i, unit in enumerate(units_data):
        if not isinstance(unit, dict):
            errors.append(f'Unit at index {i} must be an object')
            continue
        if not unit.get('name', '').strip():
            errors.append(f'Unit at index {i}: name is required')
        importance = unit.get('importance')
        if importance is None or not isinstance(importance, (int, float)) or not (1 <= importance <= 10):
            errors.append(f'Unit at index {i}: importance must be an integer 1–10')
        total_points = unit.get('total_points')
        if total_points is None or not isinstance(total_points, (int, float)) or not (1 <= total_points <= 70):
            errors.append(f'Unit at index {i}: total_points must be an integer 1–70')

    if errors:
        return jsonify({'error': errors[0], 'errors': errors}), 400

    # --- Get user settings ---
    user = User.query.get(user_id)
    settings = user.get_settings() if user else {}

    # --- Run the scheduling algorithm ---
    try:
        generated_tasks = generate_schedule(start_date, end_date, units_data, settings)
    except Exception as exc:
        return jsonify({'error': f'Scheduling algorithm failed: {str(exc)}'}), 500

    # --- Persist schedule, units, and tasks ---
    schedule = Schedule(
        user_id=user_id,
        title=title,
        start_date=start_date,
        end_date=end_date,
        status='active',
    )
    db.session.add(schedule)
    db.session.flush()  # get schedule.id

    # Create Unit records and build an index→Unit map
    unit_map = {}  # unit_index → Unit ORM object
    for idx, unit_data in enumerate(units_data):
        unit = Unit(
            schedule_id=schedule.id,
            name=unit_data['name'].strip(),
            importance=int(unit_data['importance']),
            total_points=int(unit_data['total_points']),
            order_index=idx,
        )
        db.session.add(unit)
        db.session.flush()  # get unit.id
        unit_map[idx] = unit

    # Create Task records (including break/lunch entries)
    # Break entries use unit_index=-1; assign them to the first unit as a placeholder.
    first_unit = unit_map.get(0)
    for task_data in generated_tasks:
        unit_index = task_data['unit_index']
        task_type  = task_data.get('task_type', 'study')

        if task_type in ('break', 'lunch'):
            if first_unit is None:
                continue
            task = Task(
                unit_id=first_unit.id,
                point_index=0,
                description=task_data['description'],
                scheduled_date=date.fromisoformat(task_data['scheduled_date']),
                scheduled_start_time=task_data['scheduled_start_time'],
                planned_duration=task_data['planned_duration'],
                status='break',
            )
        else:
            unit_obj = unit_map.get(unit_index)
            if unit_obj is None:
                continue
            task = Task(
                unit_id=unit_obj.id,
                point_index=task_data['point_index'],
                description=task_data['description'],
                scheduled_date=date.fromisoformat(task_data['scheduled_date']),
                scheduled_start_time=task_data['scheduled_start_time'],
                planned_duration=task_data['planned_duration'],
                status='pending',
            )
        db.session.add(task)

    db.session.commit()

    # Reload to get the full nested structure
    db.session.refresh(schedule)

    return jsonify({
        'message': 'Schedule generated successfully',
        'schedule': schedule.to_dict(),
    }), 201


@generator_bp.route('/schedules/<int:schedule_id>/regenerate', methods=['POST'])
@jwt_required()
def regenerate(schedule_id: int):
    """Re-generate pending tasks with fatigue-adjusted durations."""
    user_id = int(get_jwt_identity())
    schedule = Schedule.query.get(schedule_id)

    if schedule is None:
        return jsonify({'error': 'Schedule not found'}), 404
    if schedule.user_id != user_id:
        return jsonify({'error': 'Access denied'}), 403

    user = User.query.get(user_id)
    settings = user.get_settings() if user else {}

    units_data = [
        {
            'name': u.name,
            'importance': u.importance,
            'total_points': u.total_points,
        }
        for u in sorted(schedule.units, key=lambda u: u.order_index)
    ]

    if not units_data:
        return jsonify({'error': 'Schedule has no units to regenerate'}), 400

    train_user_fatigue_model(user_id)

    try:
        generated_tasks = generate_schedule(
            schedule.start_date, schedule.end_date, units_data, settings
        )
        generated_tasks = apply_fatigue_to_tasks(
            generated_tasks, settings.get('ai_aggressiveness', 'medium')
        )
    except Exception as exc:
        return jsonify({'error': f'Scheduling algorithm failed: {str(exc)}'}), 500

    for unit in schedule.units:
        Task.query.filter_by(unit_id=unit.id, status='pending').delete()
        Task.query.filter_by(unit_id=unit.id, status='break').delete()

    unit_map = {idx: u for idx, u in enumerate(sorted(schedule.units, key=lambda u: u.order_index))}
    first_unit = unit_map.get(0)

    for task_data in generated_tasks:
        task_type  = task_data.get('task_type', 'study')
        unit_index = task_data['unit_index']

        if task_type in ('break', 'lunch'):
            if first_unit is None:
                continue
            task = Task(
                unit_id=first_unit.id,
                point_index=0,
                description=task_data['description'],
                scheduled_date=date.fromisoformat(task_data['scheduled_date']),
                scheduled_start_time=task_data['scheduled_start_time'],
                planned_duration=task_data['planned_duration'],
                status='break',
            )
        else:
            unit_obj = unit_map.get(unit_index)
            if unit_obj is None:
                continue
            task = Task(
                unit_id=unit_obj.id,
                point_index=task_data['point_index'],
                description=task_data['description'],
                scheduled_date=date.fromisoformat(task_data['scheduled_date']),
                scheduled_start_time=task_data['scheduled_start_time'],
                planned_duration=task_data['planned_duration'],
                status='pending',
            )
        db.session.add(task)

    db.session.commit()
    db.session.refresh(schedule)

    return jsonify({
        'message': 'Schedule regenerated with fatigue adjustments',
        'schedule': schedule.to_dict(),
        'fatigue_model': fatigue_predictor.get_model_info(),
    }), 200
