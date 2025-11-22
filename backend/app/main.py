from fastapi import FastAPI
from .auth import router as auth_router
from .orders import router as orders_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.include_router(auth_router, prefix="/auth")
app.include_router(orders_router, prefix="/api/orders", tags=["orders"])
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