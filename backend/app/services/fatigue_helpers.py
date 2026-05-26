"""Helpers for collecting training data and applying fatigue adjustments."""

from datetime import datetime
from app.models.task import Task
from app.models.unit import Unit
from app.models.schedule import Schedule
from app.services.fatigue import fatigue_predictor


def collect_completed_tasks(user_id: int) -> list[dict]:
    """Gather completed task data for fatigue model training."""
    completed = (
        Task.query
        .join(Unit, Task.unit_id == Unit.id)
        .join(Schedule, Unit.schedule_id == Schedule.id)
        .filter(
            Schedule.user_id == user_id,
            Task.status == 'completed',
            Task.actual_duration.isnot(None),
            Task.planned_duration > 0,
        )
        .all()
    )

    training_data = []
    for task in completed:
        hour = 12
        if task.scheduled_start_time:
            try:
                hour = int(task.scheduled_start_time.split(':')[0])
            except (ValueError, IndexError):
                pass

        day_of_week = task.scheduled_date.weekday() if task.scheduled_date else 0

        tasks_before = (
            Task.query
            .join(Unit, Task.unit_id == Unit.id)
            .join(Schedule, Unit.schedule_id == Schedule.id)
            .filter(
                Schedule.user_id == user_id,
                Task.status == 'completed',
                Task.scheduled_date == task.scheduled_date,
                Task.id < task.id,
            )
            .count()
        )

        training_data.append({
            'hour_of_day': hour,
            'tasks_completed_today': tasks_before,
            'day_of_week': day_of_week,
            'actual_duration': task.actual_duration,
            'planned_duration': task.planned_duration,
        })

    return training_data


def train_user_fatigue_model(user_id: int) -> bool:
    """Train the global fatigue predictor on a user's completed tasks."""
    data = collect_completed_tasks(user_id)
    return fatigue_predictor.train(data)


def apply_fatigue_to_tasks(tasks: list[dict], aggressiveness: str = 'medium') -> list[dict]:
    """Adjust planned durations using the trained fatigue model."""
    if not fatigue_predictor.is_trained:
        return tasks

    multiplier_map = {'low': 0.5, 'medium': 1.0, 'high': 1.5}
    strength = multiplier_map.get(aggressiveness, 1.0)

    adjusted = []
    tasks_per_day: dict[str, int] = {}

    for task in tasks:
        date_key = task['scheduled_date']
        tasks_per_day[date_key] = tasks_per_day.get(date_key, 0)

        hour = 12
        try:
            hour = int(task['scheduled_start_time'].split(':')[0])
        except (ValueError, KeyError, AttributeError):
            pass

        day_of_week = datetime.fromisoformat(date_key).weekday()
        factor = fatigue_predictor.predict_fatigue_factor(
            hour, tasks_per_day[date_key], day_of_week
        )

        adjusted_factor = 1.0 + (factor - 1.0) * strength
        new_duration = max(5, round(task['planned_duration'] * adjusted_factor))

        updated = dict(task)
        updated['planned_duration'] = new_duration
        adjusted.append(updated)
        tasks_per_day[date_key] += 1

    return adjusted
