from flask import Flask
from .extensions import db, jwt, cors

def create_app(config_class='config.Config'):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "http://localhost:5173"}})

    # Register blueprints
    from .routes.auth import auth_bp
    from .routes.schedules import schedules_bp
    from .routes.tasks import tasks_bp
    from .routes.generator import generator_bp
    from .routes.settings import settings_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(schedules_bp, url_prefix='/api/schedules')
    app.register_blueprint(tasks_bp, url_prefix='/api/tasks')
    app.register_blueprint(generator_bp, url_prefix='/api')
    app.register_blueprint(settings_bp, url_prefix='/api/settings')

    with app.app_context():
        db.create_all()

    return app
