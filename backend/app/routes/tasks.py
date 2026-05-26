"""
Task completion routes for Schedule Crusher.

Provides endpoints to mark tasks as completed or revert them to pending.
"""

from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.task import Task
from app.models.unit import Unit
from app.models.schedule import Schedule

tasks_bp = Blueprint('tasks', __name__, url_prefix='/api/tasks')


def _get_task_or_error(task_id: int, user_id: int):
    """Fetch a task and verify the current user owns the parent schedule.

    Args:
        task_id: ID of the task.
        user_id: ID of the authenticated user.

    Returns:
        Tuple of (task, None) on success or (None, error_response) on failure.
    """
    task = Task.query.get(task_id)

    if task is None:
        return None, (jsonify({'error': 'Task not found'}), 404)

    # Walk up: task -> unit -> schedule to verify ownership
    unit = Unit.query.get(task.unit_id)
    if unit is None:
        return None, (jsonify({'error': 'Parent unit not found'}), 404)

    schedule = Schedule.query.get(unit.schedule_id)
    if schedule is None:
        return None, (jsonify({'error': 'Parent schedule not found'}), 404)

    if schedule.user_id != user_id:
        return None, (jsonify({'error': 'Access denied'}), 403)

    return task, None


@tasks_bp.route('/<int:task_id>/complete', methods=['POST'])
@jwt_required()
def complete_task(task_id: int):
    """Mark a task as completed.

    Records the current UTC time as actual_completion_time.
    Optionally accepts actual_duration (minutes) in the JSON body.

    Args:
        task_id: ID of the task to complete.

    Returns:
        200: Updated task dictionary.
        403: Not the owner.
        404: Task not found.
    """
    user_id = int(get_jwt_identity())
    task, error = _get_task_or_error(task_id, user_id)
    if error:
        return error

    # Parse optional body
    data = request.get_json(silent=True) or {}
    actual_duration = data.get('actual_duration')

    task.status = 'completed'
    task.actual_completion_time = datetime.now(timezone.utc)

    if actual_duration is not None:
        try:
            task.actual_duration = int(actual_duration)
        except (ValueError, TypeError):
            return jsonify({'error': 'actual_duration must be an integer (minutes)'}), 400

    db.session.commit()

    return jsonify({
        'message': 'Task marked as completed',
        'task': task.to_dict(),
    }), 200


@tasks_bp.route('/<int:task_id>/uncomplete', methods=['POST'])
@jwt_required()
def uncomplete_task(task_id: int):
    """Revert a completed task back to pending.

    Clears actual_completion_time and actual_duration.

    Args:
        task_id: ID of the task to uncomplete.

    Returns:
        200: Updated task dictionary.
        403: Not the owner.
        404: Task not found.
    """
    user_id = int(get_jwt_identity())
    task, error = _get_task_or_error(task_id, user_id)
    if error:
        return error

    task.status = 'pending'
    task.actual_completion_time = None
    task.actual_duration = None

    db.session.commit()

    return jsonify({
        'message': 'Task reverted to pending',
        'task': task.to_dict(),
    }), 200
