"""
Unit model for Schedule Crusher.

A unit is a subject/topic within a schedule, containing multiple tasks (study points).
"""

from app.extensions import db


class Unit(db.Model):
    """Represents a study unit (subject/topic) within a schedule."""

    __tablename__ = 'units'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    schedule_id = db.Column(db.Integer, db.ForeignKey('schedules.id'), nullable=False, index=True)
    name = db.Column(db.String(200), nullable=False)
    importance = db.Column(db.Integer, nullable=False)  # 1–10
    total_points = db.Column(db.Integer, nullable=False)  # 1–70
    order_index = db.Column(db.Integer, nullable=False, default=0)

    # Relationships
    schedule = db.relationship('Schedule', back_populates='units')
    tasks = db.relationship(
        'Task',
        back_populates='unit',
        lazy='joined',
        cascade='all, delete-orphan',
        order_by='Task.scheduled_date, Task.scheduled_start_time'
    )

    def to_dict(self) -> dict:
        """Serialize the unit including all nested tasks.

        Returns:
            Dictionary with unit data and its tasks.
        """
        return {
            'id': self.id,
            'schedule_id': self.schedule_id,
            'name': self.name,
            'importance': self.importance,
            'total_points': self.total_points,
            'order_index': self.order_index,
            'tasks': [task.to_dict() for task in self.tasks],
        }

    def __repr__(self) -> str:
        return f'<Unit {self.name!r} importance={self.importance}>'
