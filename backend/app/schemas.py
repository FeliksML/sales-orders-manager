from pydantic import BaseModel

class UserSignup(BaseModel):
    email : str
    password : str
    salesid : int
    name : str

class UserLogin(BaseModel):
    email : str
    password : str