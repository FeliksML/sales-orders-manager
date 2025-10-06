from fastapi import APIRouter
from .schemas import UserSignup
from .models import User
from .database import SessionLocal
import bcrypt

router = APIRouter()

@router.post("/signup")
def signup(user_data: UserSignup):
    password_bytes = user_data.password.encode('utf-8')
    hashed_password = bcrypt.hashpw(password_bytes, bcrypt.gensalt())

    new_user = User(
        email = user_data.email,
        password = hashed_password,
        salesid = user_data.salesid,
        name = user_data.name
    )

    # Add the user to the user db
    db = SessionLocal()
    db.add(new_user)
    db.commit()
    db.close()

    return {"message": "successful signup"}