from pydantic import BaseModel
from typing import Optional, Dict, Any, List, Generic, TypeVar
from datetime import date, datetime

# Generic type for paginated responses
T = TypeVar('T')

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

class UserResponse(BaseModel):
    userid: int
    email: str
    salesid: int
    name: str
    email_verified: bool

    class Config:
        from_attributes = True

# Order Schemas
class OrderBase(BaseModel):
    spectrum_reference: str
    customer_account_number: str
    customer_security_code: Optional[str] = None
    job_number: Optional[str] = None
    business_name: str
    customer_name: str
    customer_email: str
    customer_address: Optional[str] = None
    customer_phone: str
    install_date: date
    install_time: str
    has_internet: bool = False
    has_voice: int = 0
    has_tv: bool = False
    has_sbc: int = 0
    has_mobile: int = 0
    mobile_activated: int = 0
    has_wib: bool = False
    notes: Optional[str] = None

class OrderCreate(OrderBase):
    pass

class OrderUpdate(BaseModel):
    spectrum_reference: Optional[str] = None
    customer_account_number: Optional[str] = None
    customer_security_code: Optional[str] = None
    job_number: Optional[str] = None
    business_name: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_address: Optional[str] = None
    customer_phone: Optional[str] = None
    install_date: Optional[date] = None
    install_time: Optional[str] = None
    has_internet: Optional[bool] = None
    has_voice: Optional[int] = None
    has_tv: Optional[bool] = None
    has_sbc: Optional[int] = None
    has_mobile: Optional[int] = None
    mobile_activated: Optional[int] = None
    has_wib: Optional[bool] = None
    notes: Optional[str] = None

class OrderResponse(OrderBase):
    orderid: int
    userid: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[int] = None

    class Config:
        from_attributes = True

class OrderStats(BaseModel):
    total_orders: int
    this_week: int
    this_month: int
    pending_installs: int
    total_internet: int
    total_tv: int
    total_mobile: int
    total_voice: int

# Pagination Schemas
class PaginationMeta(BaseModel):
    total: int
    skip: int
    limit: int
    has_more: bool

class PaginatedOrderResponse(BaseModel):
    data: List[OrderResponse]
    meta: PaginationMeta

# Audit Trail Schemas
class AuditLogResponse(BaseModel):
    auditid: int
    entity_type: str
    entity_id: int
    user_id: int
    user_name: str
    action: str
    field_name: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    snapshot: Optional[Dict[str, Any]] = None
    change_reason: Optional[str] = None
    ip_address: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True

class AuditHistoryResponse(BaseModel):
    order_id: int
    total_changes: int
    audit_logs: list[AuditLogResponse]

class RevertRequest(BaseModel):
    timestamp: datetime
    reason: Optional[str] = None

class UserActivitySummary(BaseModel):
    total_actions: int
    creates: int
    updates: int
    deletes: int
    bulk_operations: int
    reverts: int
    period_days: int