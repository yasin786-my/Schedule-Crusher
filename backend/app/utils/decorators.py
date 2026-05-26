"""
Custom decorators and helpers for Schedule Crusher.

Provides utility functions to simplify common patterns in route handlers.
"""

from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity
from app.models.user import User


def get_current_user() -> User | None:
    """Retrieve the current authenticated user from the JWT identity.

    Must be called inside a request context where @jwt_required() has
    already been applied.

    Returns:
        The User object, or None if the user no longer exists.
    """
    user_id = get_jwt_identity()
    if user_id is None:
        return None
    return User.query.get(int(user_id))


def user_required(fn):
    """Decorator that injects the current user as the first argument.

    Combines with @jwt_required() — the JWT must already be validated.
    If the user does not exist in the database, returns a 404 error.

    Usage:
        @route.get('/profile')
        @jwt_required()
        @user_required
        def profile(current_user):
            return jsonify(current_user.to_dict())
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = get_current_user()
        if user is None:
            return jsonify({'error': 'User not found'}), 404
        return fn(user, *args, **kwargs)
    return wrapper
