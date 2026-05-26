"""
ML-based Fatigue Prediction for Schedule Crusher.

Uses scikit-learn's LinearRegression to learn how long tasks actually take
compared to their planned duration, based on time-of-day and workload features.
This model can then adjust future schedule estimates.
"""

import numpy as np
from sklearn.linear_model import LinearRegression


class FatiguePredictor:
    """Predicts a fatigue multiplier based on historical task completion data.

    The model learns the relationship between contextual features and the
    actual/planned duration ratio. A ratio > 1.0 indicates fatigue (tasks
    taking longer than planned), while < 1.0 indicates momentum.

    Features used:
        - hour_of_day (0–23): the hour when the task was scheduled
        - tasks_completed_today (int): how many tasks the user already finished that day
        - day_of_week (0–6): Monday=0, Sunday=6

    Target:
        - actual_duration / planned_duration ratio
    """

    def __init__(self):
        """Initialize the predictor with an untrained model."""
        self.model = LinearRegression()
        self.is_trained = False
        self._feature_means = None
        self._feature_stds = None

    def train(self, completed_tasks: list[dict]) -> bool:
        """Train the fatigue model on completed task data.

        Args:
            completed_tasks: List of dicts, each containing:
                - 'hour_of_day' (int): hour the task was scheduled
                - 'tasks_completed_today' (int): tasks done before this one
                - 'day_of_week' (int): 0=Monday, 6=Sunday
                - 'actual_duration' (int|float): actual minutes taken
                - 'planned_duration' (int|float): planned minutes

        Returns:
            True if training succeeded, False if insufficient data.
        """
        if not completed_tasks or len(completed_tasks) < 3:
            # Need at least 3 data points for meaningful regression
            self.is_trained = False
            return False

        # Build feature matrix and target vector
        features = []
        targets = []

        for task in completed_tasks:
            planned = task.get('planned_duration', 0)
            actual = task.get('actual_duration', 0)

            if planned <= 0 or actual <= 0:
                continue

            hour = task.get('hour_of_day', 12)
            tasks_done = task.get('tasks_completed_today', 0)
            dow = task.get('day_of_week', 0)

            features.append([float(hour), float(tasks_done), float(dow)])
            targets.append(float(actual) / float(planned))

        if len(features) < 3:
            self.is_trained = False
            return False

        X = np.array(features, dtype=np.float64)
        y = np.array(targets, dtype=np.float64)

        # Standardize features for better regression stability
        self._feature_means = X.mean(axis=0)
        self._feature_stds = X.std(axis=0)
        # Avoid division by zero for constant features
        self._feature_stds[self._feature_stds == 0] = 1.0

        X_scaled = (X - self._feature_means) / self._feature_stds

        self.model.fit(X_scaled, y)
        self.is_trained = True
        return True

    def predict_fatigue_factor(
        self,
        hour: int,
        tasks_done_today: int,
        day_of_week: int,
    ) -> float:
        """Predict the fatigue multiplier for a given context.

        Args:
            hour: Hour of day (0–23) when the task would be scheduled.
            tasks_done_today: Number of tasks already completed today.
            day_of_week: Day of the week (0=Monday, 6=Sunday).

        Returns:
            Multiplier float. 1.0 means on-time, >1.0 means expected slowdown
            (e.g., 1.2 = 20% longer), <1.0 means faster than planned.
            Returns 1.0 if the model has not been trained yet.
        """
        if not self.is_trained:
            return 1.0

        X = np.array([[float(hour), float(tasks_done_today), float(day_of_week)]])
        X_scaled = (X - self._feature_means) / self._feature_stds
        prediction = self.model.predict(X_scaled)[0]

        # Clamp the prediction to a reasonable range [0.5, 2.5]
        prediction = max(0.5, min(2.5, prediction))
        return round(prediction, 3)

    def get_model_info(self) -> dict:
        """Return diagnostic information about the trained model.

        Returns:
            Dictionary with coefficients, intercept, and training status.
        """
        info = {
            'is_trained': self.is_trained,
        }
        if self.is_trained:
            info['coefficients'] = {
                'hour_of_day': round(float(self.model.coef_[0]), 4),
                'tasks_completed_today': round(float(self.model.coef_[1]), 4),
                'day_of_week': round(float(self.model.coef_[2]), 4),
            }
            info['intercept'] = round(float(self.model.intercept_), 4)
        return info


# Module-level singleton so the predictor persists across requests
fatigue_predictor = FatiguePredictor()
