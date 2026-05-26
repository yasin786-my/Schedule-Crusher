"""
Authentication routes for Schedule Crusher.

Provides signup, login, and current-user endpoints using JWT tokens.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity,
)
from app.extensions import db
from app.models.user import User

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/signup', methods=['POST'])
def signup():
    """Register a new user account.

    Expects JSON body:
        {
            "username": "string",
            "email": "string",
            "password": "string"
        }

    Returns:
        201: JWT access token and user data.
        400: Validation errors.
        409: Username or email already taken.
    """
    data = request.get_json()

    # --- Validate required fields ---
    if not data:
        return jsonify({'error': 'Request body must be JSON'}), 400

    username = data.get('username', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    errors = []
    if not username:
        errors.append('Username is required')
    if not email:
        errors.append('Email is required')
    if not password:
        errors.append('Password is required')
    if password and len(password) < 6:
        errors.append('Password must be at least 6 characters')
    if username and len(username) < 3:
        errors.append('Username must be at least 3 characters')

    if errors:
        return jsonify({'error': errors[0], 'errors': errors}), 400

    # --- Check uniqueness ---
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already taken'}), 409

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 409

    # --- Create user ---
    user = User(username=username, email=email)
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    # --- Issue JWT ---
    access_token = create_access_token(identity=str(user.id))

    return jsonify({
        'message': 'Account created successfully',
        'access_token': access_token,
        'user': user.to_dict(),
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate an existing user.

    Expects JSON body:
        {
            "email": "string",
            "password": "string"
        }

    Returns:
        200: JWT access token and user data.
        400: Missing fields.
        401: Invalid credentials.
    """
    data = request.get_json()

    if not data:
        return jsonify({'error': 'Request body must be JSON'}), 400

    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    # --- Look up user ---
    user = User.query.filter_by(email=email).first()

    if user is None or not user.check_password(password):
        return jsonify({'error': 'Invalid email or password'}), 401

    # --- Issue JWT ---
    access_token = create_access_token(identity=str(user.id))

    return jsonify({
        'message': 'Login successful',
        'access_token': access_token,
        'user': user.to_dict(),
    }), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Return the currently authenticated user's data.

    Requires: Authorization header with valid Bearer token.

    Returns:
        200: Current user data.
        401: Missing or invalid token.
        404: User not found (token references deleted user).
    """
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))

    if user is None:
        return jsonify({'error': 'User not found'}), 404

    return jsonify({'user': user.to_dict()}), 200
