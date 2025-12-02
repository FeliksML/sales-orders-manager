# Backend: FastAPI + SQLAlchemy

## Structure
- main.py: App setup, middleware, routers
- models.py: SQLAlchemy ORM models
- schemas.py: Pydantic request/response schemas
- auth.py: JWT authentication, password reset
- orders.py: Order CRUD, filtering, PDF extraction
- admin.py: User management, system stats
- commission.py: Fiscal month calculations
- notification_service.py: Email/SMS/browser notifications

## Patterns

```python
# Router with auth
@router.get("/orders", response_model=List[OrderResponse])
async def get_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Implementation

# Error handling
raise HTTPException(status_code=400, detail="Specific error message")

# Validation - always use schemas
class OrderCreate(BaseModel):
    customer_name: str = Field(..., min_length=1, max_length=100)
    install_date: date
```

## Testing
```bash
pytest backend/tests/ --cov=app -v
# Tests use fixtures from conftest.py
# Mock external services (email, SMS, Stripe)
```

## Rules
- All new endpoints need Pydantic request/response schemas
- Add audit logging for data mutations
- Use idempotency keys for POST operations
- Keep database migrations backward-compatible
