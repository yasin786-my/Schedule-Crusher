"""Backend tests for Schedule Crusher (MySQL)."""

import pytest
from datetime import date, timedelta
from app import create_app
from app.extensions import db
from app.services.scheduler import generate_schedule
from app.services.fatigue import FatiguePredictor


@pytest.fixture
def app():
    app = create_app('config.TestConfig')

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


def test_signup_and_login(client):
    signup = client.post('/api/auth/signup', json={
        'username': 'testuser',
        'email': 'test@example.com',
        'password': 'secret12',
    })
    assert signup.status_code == 201
    assert 'access_token' in signup.get_json()

    login = client.post('/api/auth/login', json={
        'email': 'test@example.com',
        'password': 'secret12',
    })
    assert login.status_code == 200
    assert 'access_token' in login.get_json()


def test_generate_schedule(client):
    signup = client.post('/api/auth/signup', json={
        'username': 'student',
        'email': 'student@example.com',
        'password': 'secret12',
    })
    token = signup.get_json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}

    start = date.today().isoformat()
    end = (date.today() + timedelta(days=7)).isoformat()

    res = client.post('/api/generate-schedule', json={
        'title': 'Test Schedule',
        'start_date': start,
        'end_date': end,
        'units': [
            {'name': 'Unit 1', 'importance': 8, 'total_points': 10},
            {'name': 'Unit 2', 'importance': 5, 'total_points': 15},
        ],
    }, headers=headers)

    assert res.status_code == 201
    data = res.get_json()
    assert 'schedule' in data
    assert len(data['schedule']['units']) == 2


def test_scheduler_algorithm():
    units = [
        {'name': 'High', 'importance': 9, 'total_points': 10},
        {'name': 'Low', 'importance': 3, 'total_points': 10},
    ]
    settings = {'work_start_hour': 8, 'work_end_hour': 21}
    start = date(2026, 6, 1)
    end = date(2026, 6, 5)

    tasks = generate_schedule(start, end, units, settings)
    assert len(tasks) == 20
    assert all('planned_duration' in t for t in tasks)


def test_fatigue_predictor():
    predictor = FatiguePredictor()
    data = [
        {'hour_of_day': 9, 'tasks_completed_today': 0, 'day_of_week': 0, 'actual_duration': 60, 'planned_duration': 50},
        {'hour_of_day': 14, 'tasks_completed_today': 2, 'day_of_week': 1, 'actual_duration': 70, 'planned_duration': 50},
        {'hour_of_day': 20, 'tasks_completed_today': 5, 'day_of_week': 2, 'actual_duration': 80, 'planned_duration': 50},
    ]
    assert predictor.train(data) is True
    factor = predictor.predict_fatigue_factor(20, 5, 2)
    assert 0.5 <= factor <= 2.5
