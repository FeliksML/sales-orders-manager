from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from .auth import router as auth_router
from .orders import router as orders_router
from .scheduled_reports import router as scheduled_reports_router
from .notifications import router as notifications_router
from .audit import router as audit_router
from .admin import router as admin_router
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
from .scheduler import start_scheduler, shutdown_scheduler
from .models import ErrorLog
from .database import SessionLocal
from .config import validate_environment
from .security_headers import SecurityHeadersMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import traceback
from jose import jwt
from .auth import SECRET_KEY, ALGORITHM

# Validate environment variables at module load time (before app starts)
validate_environment()

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Application starting (scheduler disabled for debugging)...")
    # start_scheduler()  # Temporarily disabled for debugging
    yield
    # Shutdown
    print("🛑 Application shutting down...")
    # shutdown_scheduler()  # Temporarily disabled for debugging

app = FastAPI(lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Error logging middleware
@app.middleware("http")
async def error_logging_middleware(request: Request, call_next):
    """Middleware to catch and log errors"""
    try:
        response = await call_next(request)
        return response
    except Exception as exc:
        # Get user info if available
        user_id = None
        user_email = None
        try:
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                user_id = int(payload.get("sub"))
                # We'd need to query DB for email, but let's skip for performance
        except:
            pass

        # Get client IP
        client_ip = request.client.host if request.client else None

        # Get user agent
        user_agent = request.headers.get("User-Agent", "")

        # Log the error
        try:
            with SessionLocal() as db:
                error_log = ErrorLog(
                    error_type="api_error",
                    error_message=str(exc),
                    stack_trace=traceback.format_exc(),
                    endpoint=str(request.url.path),
                    method=request.method,
                    status_code=500,
                    user_id=user_id,
                    user_email=user_email,
                    ip_address=client_ip,
                    user_agent=user_agent
                )
                db.add(error_log)
                db.commit()
                print(f"🔴 Error logged to database: {str(exc)[:100]}")
        except Exception as log_error:
            print(f"❌ Failed to log error to database: {str(log_error)}")

        # Re-raise the exception for FastAPI to handle
        raise exc

# Add custom validation error handler for debugging
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print("=" * 80)
    print("❌ VALIDATION ERROR:")
    print(f"Path: {request.url.path}")
    print(f"Method: {request.method}")
    print(f"Errors: {exc.errors()}")
    print(f"Body: {exc.body}")
    print("=" * 80)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
    )

app.include_router(auth_router, prefix="/auth")
app.include_router(orders_router, prefix="/api/orders", tags=["orders"])
app.include_router(scheduled_reports_router, prefix="/api/scheduled-reports", tags=["scheduled-reports"])
app.include_router(notifications_router, prefix="/api/notifications", tags=["notifications"])
app.include_router(audit_router, prefix="/api/audit", tags=["audit"])
app.include_router(admin_router)

# Add security headers middleware (first, so it applies to all responses)
app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add GZip compression for responses > 1000 bytes
app.add_middleware(GZipMiddleware, minimum_size=1000)

@app.get("/")
def get_root():
    return {"message": "API is running"}

@app.get("/health")
def health_check():
    """
    Health check endpoint for load balancers and monitoring.
    Returns 200 if the application is running.
    """
    return {
        "status": "healthy",
        "service": "sales-order-manager-api"
    }

@app.get("/readiness")
def readiness_check():
    """
    Readiness check endpoint that verifies the application can handle requests.
    Checks database connectivity.
    """
    try:
        # Test database connection
        with SessionLocal() as db:
            db.execute("SELECT 1")

        return {
            "status": "ready",
            "database": "connected",
            "service": "sales-order-manager-api"
        }
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={
                "status": "not ready",
                "database": "disconnected",
                "error": str(e),
                "service": "sales-order-manager-api"
            }
        )