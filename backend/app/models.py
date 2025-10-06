from .database import Base
from sqlalchemy import Column, Integer, String, ForeignKey, Date, Boolean, Text

class User(Base):
    __tablename__ = 'users'

    userid = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    password = Column(String(255),nullable=False)
    salesid = Column(Integer, unique=True, nullable=False)
    name = Column(String(255), nullable=False)

class Order(Base):
    __tablename__ = 'orders'
    
    orderid = Column(Integer, primary_key=True)
    userid = Column(Integer, ForeignKey('users.userid'), nullable=False)
    
    # Order reference information
    spectrum_reference = Column(String(255), nullable=False)
    customer_account_number = Column(String(255), nullable=False)
    customer_security_code = Column(String(255))
    job_number = Column(String(255))
    
    # Customer information
    business_name = Column(String(255), nullable=False)
    customer_name = Column(String(255), nullable=False)
    customer_address = Column(String(255))
    customer_phone = Column(String(255), nullable=False)
    
    # Installation details
    install_date = Column(Date, nullable=False)
    install_time = Column(String(100), nullable=False)
    
    # Product booleans and quantities
    has_internet = Column(Boolean, default=False)
    has_voice = Column(Integer, default=0)
    has_tv = Column(Boolean, default=False)
    has_sbc = Column(Integer, default=0)
    has_mobile = Column(Integer, default=0)
    mobile_activated = Column(Integer, default=0)
    has_wib = Column(Boolean, default=False)
    
    # Additional notes
    notes = Column(Text)