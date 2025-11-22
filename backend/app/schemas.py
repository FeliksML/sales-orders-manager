from pydantic import BaseModel
from typing import Optional

class UserSignup(BaseModel):
    email : str
    password : str
    salesid : int
    name : str
    recaptcha_token : Optional[str] = None

class UserLogin(BaseModel):
    email : str
    password : str
    recaptcha_token : Optional[str] = None