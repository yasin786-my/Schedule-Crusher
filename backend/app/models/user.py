"""
User model for Schedule Crusher.

Handles user accounts, password hashing with bcrypt, and JSON-based settings storage.
"""

from datetime import datetime, timezone
import json
import bcrypt
from app.extensions import db


class User(db.Model):
    """Represents a registered user of Schedule Crusher."""

    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    settings_json = db.Column(db.Text, nullable=True)

    # Relationships
    schedules = db.relationship(
        'Schedule',
        back_populates='user',
        lazy='dynamic',
        cascade='all, delete-orphan'
    )

    def set_password(self, password: str) -> None:
        """Hash and store a plaintext password using bcrypt.

        Args:
            password: The plaintext password to hash.
        """
        password_bytes = password.encode('utf-8')
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(password_bytes, salt).decode('utf-8')

    def check_password(self, password: str) -> bool:
        """Verify a plaintext password against the stored hash.

        Args:
            password: The plaintext password to verify.

        Returns:
            True if the password matches, False otherwise.
        """
        password_bytes = password.encode('utf-8')
        hash_bytes = self.password_hash.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hash_bytes)

    def get_settings(self) -> dict:
        """Parse and return the user's settings with defaults.

        Returns:
            A dictionary of user settings, merged with defaults.
        """
        defaults = {
            'work_start_hour': 8,
            'work_end_hour': 21,
            'break_duration': 15,
            'work_block_duration': 90,
            'lunch_break_start': 13,
            'lunch_break_duration': 30,
            'ai_aggressiveness': 'medium',
        }
        if self.settings_json:
            try:
                user_settings = json.loads(self.settings_json)
                defaults.update(user_settings)
            except (json.JSONDecodeError, TypeError):
                pass
        return defaults

    def set_settings(self, settings: dict) -> None:
        """Serialize and store user settings as JSON.

        Args:
            settings: Dictionary of settings to store.
        """
        self.settings_json = json.dumps(settings)

    def to_dict(self) -> dict:
        """Serialize the user to a dictionary (excludes password hash).

        Returns:
            Dictionary representation of the user.
        """
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'settings': self.get_settings(),
        }

    def __repr__(self) -> str:
        return f'<User {self.username!r}>'
