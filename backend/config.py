"""
Configuration module for Schedule Crusher backend.

Reads environment variables from .env file and exposes them
as class attributes for Flask app configuration.
"""

import os
from datetime import timedelta
from urllib.parse import quote_plus
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


def _build_database_url() -> str:
    """Build MySQL connection URL from env vars."""
    explicit_url = os.environ.get('DATABASE_URL')
    if explicit_url:
        if not explicit_url.startswith('mysql'):
            raise ValueError(
                'Only MySQL is supported. Use DATABASE_URL=mysql+pymysql://... '
                'or set MYSQL_USER, MYSQL_PASSWORD, MYSQL_HOST, MYSQL_PORT, MYSQL_DATABASE.'
            )
        return explicit_url

    user = os.environ.get('MYSQL_USER', 'root')
    password = quote_plus(os.environ.get('MYSQL_PASSWORD', ''))
    host = os.environ.get('MYSQL_HOST', 'localhost')
    port = os.environ.get('MYSQL_PORT', '3306')
    database = os.environ.get('MYSQL_DATABASE', 'schedule_crusher')
    return f'mysql+pymysql://{user}:{password}@{host}:{port}/{database}'


def _build_test_database_url() -> str:
    """Build MySQL test database URL from env vars."""
    explicit_url = os.environ.get('TEST_DATABASE_URL')
    if explicit_url:
        return explicit_url

    user = os.environ.get('MYSQL_USER', 'root')
    password = quote_plus(os.environ.get('MYSQL_PASSWORD', ''))
    host = os.environ.get('MYSQL_HOST', 'localhost')
    port = os.environ.get('MYSQL_PORT', '3306')
    database = os.environ.get('MYSQL_TEST_DATABASE', 'schedule_crusher_test')
    return f'mysql+pymysql://{user}:{password}@{host}:{port}/{database}'


class Config:
    """Application configuration class.

    All settings are read from environment variables with sensible defaults
    for local development.
    """

    # --- Flask Core ---
    SECRET_KEY = os.environ.get('SECRET_KEY', 'schedule-crusher-secret-key-change-in-production')
    DEBUG = os.environ.get('FLASK_ENV', 'development') == 'development'

    # --- SQLAlchemy ---
    SQLALCHEMY_DATABASE_URI = _build_database_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
    }

    # --- JWT ---
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-super-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_TOKEN_LOCATION = ['headers']
    JWT_HEADER_NAME = 'Authorization'
    JWT_HEADER_TYPE = 'Bearer'

    # --- CORS ---
    CORS_ORIGINS = ['http://localhost:5173']


class TestConfig(Config):
    """Test configuration using a separate MySQL database."""

    TESTING = True
    SQLALCHEMY_DATABASE_URI = _build_test_database_url()
    JWT_SECRET_KEY = 'test-jwt-secret-key'
