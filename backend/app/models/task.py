"""
Task model for Schedule Crusher.

A task is a single study point within a unit, scheduled to a specific date/time.
"""

from datetime import datetime, timezone
from app.extensions import db


class Task(db.Model):
    """Represents a single scheduled study task (one point of work)."""

    __tablename__ = 'tasks'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    unit_id = db.Column(db.Integer, db.ForeignKey('units.id'), nullable=False, index=True)
    point_index = db.Column(db.Integer, nullable=False)  # which point in the unit (1-based)
    description = db.Column(db.String(500), nullable=False)
    scheduled_date = db.Column(db.Date, nullable=False, index=True)
    scheduled_start_time = db.Column(db.String(10), nullable=False)  # e.g. '08:00'
    planned_duration = db.Column(db.Integer, nullable=False)  # minutes
    actual_completion_time = db.Column(db.DateTime, nullable=True)
    actual_duration = db.Column(db.Integer, nullable=True)  # minutes
    status = db.Column(db.String(20), nullable=False, default='pending')  # pending / completed

    # Relationships
    unit = db.relationship('Unit', back_populates='tasks')

    def to_dict(self) -> dict:
        """Serialize the task to a dictionary.

        Returns:
            Dictionary representation of the task.
        """
        return {
            'id': self.id,
            'unit_id': self.unit_id,
            'point_index': self.point_index,
            'description': self.description,
            'scheduled_date': self.scheduled_date.isoformat() if self.scheduled_date else None,
            'scheduled_start_time': self.scheduled_start_time,
            'planned_duration': self.planned_duration,
            'actual_completion_time': (
                self.actual_completion_time.isoformat()
                if self.actual_completion_time else None
            ),
            'actual_duration': self.actual_duration,
            'status': self.status,
        }

    def __repr__(self) -> str:
        return f'<Task {self.description!r} [{self.status}]>'
