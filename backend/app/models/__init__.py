"""
Models package for Schedule Crusher.

Imports all models so that SQLAlchemy can discover them when creating tables.
"""

from app.models.user import User
from app.models.schedule import Schedule
from app.models.unit import Unit
from app.models.task import Task

__all__ = ['User', 'Schedule', 'Unit', 'Task']
