"""
Schedule management routes for Schedule Crusher.

Provides CRUD operations for schedules owned by the authenticated user.
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.schedule import Schedule

schedules_bp = Blueprint('schedules', __name__, url_prefix='/api/schedules')


@schedules_bp.route('', methods=['GET'])
@jwt_required()
def list_schedules():
    """List all schedules for the current user.

    Active schedules are returned first, then archived, then completed.
    Each schedule includes its full nested units and tasks.

    Returns:
        200: List of schedule dictionaries.
    """
    user_id = int(get_jwt_identity())

    # Custom ordering: active first, then archived, then completed
    schedules = (
        Schedule.query
        .filter_by(user_id=user_id)
        .order_by(
            db.case(
                (Schedule.status == 'active', 0),
                (Schedule.status == 'archived', 1),
                (Schedule.status == 'completed', 2),
                else_=3,
            ),
            Schedule.created_at.desc(),
        )
        .all()
    )

    return jsonify({
        'schedules': [s.to_dict() for s in schedules],
    }), 200


@schedules_bp.route('/<int:schedule_id>', methods=['GET'])
@jwt_required()
def get_schedule(schedule_id: int):
    """Get a single schedule with all units and tasks.

    Args:
        schedule_id: ID of the schedule to retrieve.

    Returns:
        200: Schedule dictionary.
        403: Not the owner.
        404: Schedule not found.
    """
    user_id = int(get_jwt_identity())
    schedule = Schedule.query.get(schedule_id)

    if schedule is None:
        return jsonify({'error': 'Schedule not found'}), 404

    if schedule.user_id != user_id:
        return jsonify({'error': 'Access denied'}), 403

    return jsonify({'schedule': schedule.to_dict()}), 200


@schedules_bp.route('/<int:schedule_id>', methods=['DELETE'])
@jwt_required()
def delete_schedule(schedule_id: int):
    """Delete a schedule and all its units/tasks (cascade).

    Args:
        schedule_id: ID of the schedule to delete.

    Returns:
        200: Success message.
        403: Not the owner.
        404: Schedule not found.
    """
    user_id = int(get_jwt_identity())
    schedule = Schedule.query.get(schedule_id)

    if schedule is None:
        return jsonify({'error': 'Schedule not found'}), 404

    if schedule.user_id != user_id:
        return jsonify({'error': 'Access denied'}), 403

    db.session.delete(schedule)
    db.session.commit()

    return jsonify({'message': 'Schedule deleted successfully'}), 200


@schedules_bp.route('/<int:schedule_id>', methods=['PATCH'])
@jwt_required()
def update_schedule(schedule_id: int):
    """Update a schedule's status (archive or complete).

    Expects JSON body:
        {
            "status": "active" | "archived" | "completed"
        }

    Args:
        schedule_id: ID of the schedule to update.

    Returns:
        200: Updated schedule dictionary.
        400: Invalid status.
        403: Not the owner.
        404: Schedule not found.
    """
    user_id = int(get_jwt_identity())
    schedule = Schedule.query.get(schedule_id)

    if schedule is None:
        return jsonify({'error': 'Schedule not found'}), 404

    if schedule.user_id != user_id:
        return jsonify({'error': 'Access denied'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body must be JSON'}), 400

    new_status = data.get('status')
    valid_statuses = ('active', 'archived', 'completed')

    if new_status not in valid_statuses:
        return jsonify({
            'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'
        }), 400

    schedule.status = new_status
    db.session.commit()

    return jsonify({
        'message': f'Schedule status updated to {new_status}',
        'schedule': schedule.to_dict(),
    }), 200
