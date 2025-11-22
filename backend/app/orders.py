from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract, or_
from typing import List, Optional
from datetime import datetime, timedelta, date
from .database import get_db
from .models import Order, User
from .schemas import OrderCreate, OrderUpdate, OrderResponse, OrderStats
from .auth import get_current_user

router = APIRouter()

@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    order: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new order for the current user"""
    db_order = Order(
        userid=current_user.userid,
        **order.model_dump()
    )
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    return db_order

@router.get("/", response_model=List[OrderResponse])
def get_orders(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = Query(None, description="Search by customer name, account number, or spectrum reference"),
    date_from: Optional[date] = Query(None, description="Filter by install date from"),
    date_to: Optional[date] = Query(None, description="Filter by install date to"),
    product_types: Optional[str] = Query(None, description="Comma-separated product types: internet,tv,mobile,voice,wib,sbc"),
    install_status: Optional[str] = Query(None, description="Filter by install status: installed,pending,today"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all orders for the current user with optional search and filters"""
    # Base query - filter by user
    query = db.query(Order).filter(Order.userid == current_user.userid)

    # Search filter - search across customer name, account number, and spectrum reference
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Order.customer_name.ilike(search_term),
                Order.customer_account_number.ilike(search_term),
                Order.spectrum_reference.ilike(search_term),
                Order.business_name.ilike(search_term)
            )
        )

    # Date range filter
    if date_from:
        query = query.filter(Order.install_date >= date_from)
    if date_to:
        query = query.filter(Order.install_date <= date_to)

    # Product type filter
    if product_types:
        product_list = [p.strip().lower() for p in product_types.split(',')]
        product_conditions = []

        if 'internet' in product_list:
            product_conditions.append(Order.has_internet == True)
        if 'tv' in product_list:
            product_conditions.append(Order.has_tv == True)
        if 'mobile' in product_list:
            product_conditions.append(Order.has_mobile > 0)
        if 'voice' in product_list:
            product_conditions.append(Order.has_voice > 0)
        if 'wib' in product_list:
            product_conditions.append(Order.has_wib == True)
        if 'sbc' in product_list:
            product_conditions.append(Order.has_sbc > 0)

        if product_conditions:
            query = query.filter(or_(*product_conditions))

    # Install status filter
    if install_status:
        today = date.today()
        status_list = [s.strip().lower() for s in install_status.split(',')]
        status_conditions = []

        if 'installed' in status_list:
            status_conditions.append(Order.install_date < today)
        if 'today' in status_list:
            status_conditions.append(Order.install_date == today)
        if 'pending' in status_list:
            status_conditions.append(Order.install_date > today)

        if status_conditions:
            query = query.filter(or_(*status_conditions))

    # Apply pagination and return results
    orders = query.offset(skip).limit(limit).all()
    return orders

@router.get("/stats", response_model=OrderStats)
def get_order_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get order statistics for the dashboard"""
    user_id = current_user.userid

    # Total orders
    total_orders = db.query(func.count(Order.orderid)).filter(
        Order.userid == user_id
    ).scalar() or 0

    # This week
    today = date.today()
    week_ago = today - timedelta(days=7)
    this_week = db.query(func.count(Order.orderid)).filter(
        and_(
            Order.userid == user_id,
            Order.install_date >= week_ago
        )
    ).scalar() or 0

    # This month
    this_month = db.query(func.count(Order.orderid)).filter(
        and_(
            Order.userid == user_id,
            extract('month', Order.install_date) == today.month,
            extract('year', Order.install_date) == today.year
        )
    ).scalar() or 0

    # Pending installs (future dates)
    pending_installs = db.query(func.count(Order.orderid)).filter(
        and_(
            Order.userid == user_id,
            Order.install_date >= today
        )
    ).scalar() or 0

    # Product totals
    total_internet = db.query(func.count(Order.orderid)).filter(
        and_(Order.userid == user_id, Order.has_internet == True)
    ).scalar() or 0

    total_tv = db.query(func.count(Order.orderid)).filter(
        and_(Order.userid == user_id, Order.has_tv == True)
    ).scalar() or 0

    total_mobile = db.query(func.sum(Order.has_mobile)).filter(
        Order.userid == user_id
    ).scalar() or 0

    total_voice = db.query(func.sum(Order.has_voice)).filter(
        Order.userid == user_id
    ).scalar() or 0

    return OrderStats(
        total_orders=total_orders,
        this_week=this_week,
        this_month=this_month,
        pending_installs=pending_installs,
        total_internet=total_internet,
        total_tv=total_tv,
        total_mobile=int(total_mobile),
        total_voice=int(total_voice)
    )

@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific order by ID"""
    order = db.query(Order).filter(
        and_(
            Order.orderid == order_id,
            Order.userid == current_user.userid
        )
    ).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    return order

@router.put("/{order_id}", response_model=OrderResponse)
def update_order(
    order_id: int,
    order_update: OrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing order"""
    db_order = db.query(Order).filter(
        and_(
            Order.orderid == order_id,
            Order.userid == current_user.userid
        )
    ).first()

    if not db_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    for key, value in order_update.model_dump().items():
        setattr(db_order, key, value)

    db.commit()
    db.refresh(db_order)
    return db_order

@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an order"""
    db_order = db.query(Order).filter(
        and_(
            Order.orderid == order_id,
            Order.userid == current_user.userid
        )
    ).first()

    if not db_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    db.delete(db_order)
    db.commit()
    return None
