import os
from app import create_app

env_mode = os.getenv("FLASK_ENV", "development")
app = create_app(env_mode)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    host = os.getenv("HOST", "127.0.0.1")
    debug = env_mode == "development"

    print(f"==================================================")
    print(f" AI Academic & Career Copilot API")
    print(f" An Intelligent Student Success Platform")
    print(f" Running at: http://{host}:{port}")
    print(f" Health check: http://{host}:{port}/api/health")
    print(f"==================================================")

    app.run(host=host, port=port, debug=debug)
