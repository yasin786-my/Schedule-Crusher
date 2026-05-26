"""
Flask extension singletons.

These instances are created here without being bound to any specific app.
They are initialized with the app inside create_app() via init_app().
"""

from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS

# Database ORM instance
db = SQLAlchemy()

# JWT authentication manager
jwt = JWTManager()

# Cross-origin resource sharing
cors = CORS()
