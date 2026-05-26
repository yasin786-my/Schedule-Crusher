"""
User settings routes for Schedule Crusher.

Provides endpoints to read and update user preferences stored as JSON.
"""

import json
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.user import User

settings_bp = Blueprint('settings', __name__, url_prefix='/api/settings')

# Default settings returned when user has not customized anything
DEFAULT_SETTINGS = {
    'work_start_hour': 8,
    'work_end_hour': 21,
    'break_duration': 15,
    'work_block_duration': 90,
    'lunch_break_start': 13,
    'lunch_break_duration': 30,
    'ai_aggressiveness': 'medium',
}

# Allowed keys and their types for validation
SETTINGS_SCHEMA = {
    'work_start_hour': int,
    'work_end_hour': int,
    'break_duration': int,
    'work_block_duration': int,
    'lunch_break_start': int,
    'lunch_break_duration': int,
    'ai_aggressiveness': str,
}


@settings_bp.route('', methods=['GET'])
@jwt_required()
def get_settings():
    """Return the authenticated user's settings merged with defaults.

    Returns:
        200: Settings dictionary.
        404: User not found.
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if user is None:
        return jsonify({'error': 'User not found'}), 404

    return jsonify({'settings': user.get_settings()}), 200


@settings_bp.route('', methods=['PUT'])
@jwt_required()
def update_settings():
    """Update the authenticated user's settings.

    Expects JSON body with one or more setting keys. Unknown keys are
    silently ignored; type-mismatched values are rejected.

    Returns:
        200: Updated settings dictionary.
        400: Validation error.
        404: User not found.
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if user is None:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body must be JSON'}), 400

    # Start from current settings (with defaults)
    current = user.get_settings()

    # Validate and merge incoming values
    errors = []
    for key, expected_type in SETTINGS_SCHEMA.items():
        if key in data:
            value = data[key]
            if not isinstance(value, expected_type):
                errors.append(f'{key} must be of type {expected_type.__name__}')
            else:
                current[key] = value

    # Extra validation for ai_aggressiveness
    if 'ai_aggressiveness' in data:
        if data['ai_aggressiveness'] not in ('low', 'medium', 'high'):
            errors.append("ai_aggressiveness must be 'low', 'medium', or 'high'")

    # Validate hour ranges
    if current['work_start_hour'] < 0 or current['work_start_hour'] > 23:
        errors.append('work_start_hour must be between 0 and 23')
    if current['work_end_hour'] < 1 or current['work_end_hour'] > 24:
        errors.append('work_end_hour must be between 1 and 24')
    if current['work_start_hour'] >= current['work_end_hour']:
        errors.append('work_start_hour must be less than work_end_hour')

    if errors:
        return jsonify({'error': errors[0], 'errors': errors}), 400

    user.set_settings(current)
    db.session.commit()

    return jsonify({
        'message': 'Settings updated successfully',
        'settings': user.get_settings(),
    }), 200
