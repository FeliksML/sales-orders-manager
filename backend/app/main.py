from fastapi import FastAPI
from .auth import router

app = FastAPI()
app.include_router(router, prefix="/auth")

@app.get("/")
def get_root():
    return {"message": "API is running"}