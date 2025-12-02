Add a new API endpoint: $ARGUMENTS

## Checklist
1. **Schema** (backend/app/schemas.py)
   - Request model with Field validators
   - Response model

2. **Route** (backend/app/[router].py)
   - Async handler with proper decorators
   - Auth dependency if needed
   - Audit logging for mutations

3. **Service** (frontend/src/services/api.js)
   - Axios function with error handling

4. **Tests** (backend/tests/)
   - Success case
   - Validation errors
   - Auth failures
   - Edge cases

## Pattern to Follow
```python
# Schema
class ThingCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

class ThingResponse(BaseModel):
    id: int
    name: str
    created_at: datetime

    class Config:
        from_attributes = True

# Route
@router.post("/things", response_model=ThingResponse)
async def create_thing(
    thing: ThingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_thing = Thing(**thing.dict(), user_id=current_user.userid)
    db.add(db_thing)
    db.commit()
    db.refresh(db_thing)
    return db_thing
```
