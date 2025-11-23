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
import traceback
from jose import jwt
from .auth import SECRET_KEY, ALGORITHM

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    start_scheduler()
    yield
    # Shutdown
    shutdown_scheduler()

app = FastAPI(lifespan=lifespan)

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