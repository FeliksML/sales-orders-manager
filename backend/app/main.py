from fastapi import FastAPI
from .auth import router as auth_router
from .orders import router as orders_router
from .scheduled_reports import router as scheduled_reports_router
from .notifications import router as notifications_router
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .scheduler import start_scheduler, shutdown_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    start_scheduler()
    yield
    # Shutdown
    shutdown_scheduler()

app = FastAPI(lifespan=lifespan)
app.include_router(auth_router, prefix="/auth")
app.include_router(orders_router, prefix="/api/orders", tags=["orders"])
app.include_router(scheduled_reports_router, prefix="/api/scheduled-reports", tags=["scheduled-reports"])
app.include_router(notifications_router, prefix="/api/notifications", tags=["notifications"])
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get("/")
def get_root():
    return {"message": "API is running"}