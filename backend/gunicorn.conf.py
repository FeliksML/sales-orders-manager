"""
Gunicorn configuration file for production deployment
"""
import multiprocessing
import os

# Server socket
bind = f"0.0.0.0:{os.getenv('PORT', '8000')}"
backlog = 2048

# Worker processes
workers = multiprocessing.cpu_count() * 2 + 1  # Recommended formula
worker_class = "uvicorn.workers.UvicornWorker"  # ASGI worker for FastAPI
worker_connections = 1000
max_requests = 10000  # Restart worker after this many requests (prevents memory leaks)
max_requests_jitter = 1000  # Add randomness to max_requests
timeout = 120  # Worker timeout in seconds
keepalive = 5  # Seconds to wait for requests on a Keep-Alive connection

# Logging
accesslog = "-"  # Log to stdout
errorlog = "-"   # Log errors to stderr
loglevel = os.getenv("LOG_LEVEL", "info")  # debug, info, warning, error, critical
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = "sales-order-manager-api"

# Server mechanics
daemon = False  # Don't daemonize (Docker/containers manage this)
pidfile = None  # No pidfile needed in containers
user = None     # Run as container user
group = None
tmp_upload_dir = None

# SSL (if terminating SSL at application level - usually done at load balancer)
# keyfile = None
# certfile = None

# Security
limit_request_line = 4094
limit_request_fields = 100
limit_request_field_size = 8190

def on_starting(server):
    """Called just before the master process is initialized."""
    print("🚀 Gunicorn server is starting...")

def on_reload(server):
    """Called when a worker is reloaded."""
    print("🔄 Gunicorn server is reloading...")

def when_ready(server):
    """Called just after the server is started."""
    print(f"✅ Gunicorn server is ready. Listening on {bind}")
    print(f"   Workers: {workers}")
    print(f"   Worker class: {worker_class}")
    print(f"   Timeout: {timeout}s")

def on_exit(server):
    """Called just before exiting Gunicorn."""
    print("🛑 Gunicorn server is shutting down...")
