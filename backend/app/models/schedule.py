"""
Schedule model for Schedule Crusher.

A schedule is a study plan spanning a date range, containing units and tasks.
"""

from datetime import datetime, timezone
from app.extensions import db


class Schedule(db.Model):
    """Represents a study schedule created by a user."""

    __tablename__ = 'schedules'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(20), nullable=False, default='active')  # active / archived / completed
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = db.relationship('User', back_populates='schedules')
    units = db.relationship(
        'Unit',
        back_populates='schedule',
        lazy='joined',
        cascade='all, delete-orphan',
        order_by='Unit.order_index'
    )

    def to_dict(self) -> dict:
        """Serialize the schedule including all nested units and tasks.

        Returns:
            Dictionary with schedule data, units, and their tasks.
        """
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'units': [unit.to_dict() for unit in self.units],
        }

    def __repr__(self) -> str:
        return f'<Schedule {self.title!r}>'
