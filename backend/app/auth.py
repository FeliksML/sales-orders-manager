from fastapi import APIRouter
from .schemas import UserSignup, UserLogin
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
    with SessionLocal() as db:
        db.add(new_user)
        db.commit()
    

    return {"message": "successful signup"}

@router.post("/login")
def login(user_data: UserLogin):
    with SessionLocal() as db:
        user = db.query(User).filter(User.email == user_data.email).first()
    
    if user == None:
        return {"message":"Incorrect Login or Password"}
    else:
        password_bytes = user_data.password.encode('utf-8')
        if bcrypt.checkpw(password_bytes, user.password):
            return {"message": "Welcome!"}
        else:
            return {"message":"Incorrect Login or Password"}