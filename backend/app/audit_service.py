"""
Audit Trail Service
Handles logging of all changes to orders for compliance and accountability
"""

import json
from datetime import datetime, date
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import inspect

from .models import AuditLog, Order, User


def serialize_value(value: Any) -> str:
    """Convert a value to a string for storage in audit log"""
    if value is None:
        return None
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, (dict, list)):
        return json.dumps(value)
    return str(value)


def get_order_snapshot(order: Order) -> Dict[str, Any]:
    """Create a complete snapshot of an order's current state"""
    inspector = inspect(order)
    snapshot = {}

    for column in inspector.mapper.column_attrs:
        attr_name = column.key
        value = getattr(order, attr_name)

        # Convert special types to serializable format
        if isinstance(value, datetime):
            snapshot[attr_name] = value.isoformat()
        elif isinstance(value, date):
            snapshot[attr_name] = value.isoformat()
        else:
            snapshot[attr_name] = value

    return snapshot


def log_order_creation(
    db: Session,
    order: Order,
    user: User,
    ip_address: Optional[str] = None,
    reason: Optional[str] = None
):
    """Log the creation of a new order"""
    snapshot = get_order_snapshot(order)

    audit_entry = AuditLog(
        entity_type='order',
        entity_id=order.orderid,
        user_id=user.userid,
        user_name=user.name,
        action='create',
        field_name=None,
        old_value=None,
        new_value=None,
        snapshot=snapshot,
        change_reason=reason,
        ip_address=ip_address,
        timestamp=datetime.utcnow()
    )

    db.add(audit_entry)
    db.commit()


def log_order_update(
    db: Session,
    order: Order,
    old_values: Dict[str, Any],
    new_values: Dict[str, Any],
    user: User,
    ip_address: Optional[str] = None,
    reason: Optional[str] = None
):
    """Log updates to an order, tracking each field that changed"""
    changes_logged = 0

    for field_name, new_value in new_values.items():
        old_value = old_values.get(field_name)

        # Only log if value actually changed
        if old_value != new_value:
            audit_entry = AuditLog(
                entity_type='order',
                entity_id=order.orderid,
                user_id=user.userid,
                user_name=user.name,
                action='update',
                field_name=field_name,
                old_value=serialize_value(old_value),
                new_value=serialize_value(new_value),
                snapshot=None,
                change_reason=reason,
                ip_address=ip_address,
                timestamp=datetime.utcnow()
            )

            db.add(audit_entry)
            changes_logged += 1

    if changes_logged > 0:
        db.commit()

    return changes_logged


def log_order_deletion(
    db: Session,
    order: Order,
    user: User,
    ip_address: Optional[str] = None,
    reason: Optional[str] = None
):
    """Log the deletion of an order"""
    snapshot = get_order_snapshot(order)

    audit_entry = AuditLog(
        entity_type='order',
        entity_id=order.orderid,
        user_id=user.userid,
        user_name=user.name,
        action='delete',
        field_name=None,
        old_value=None,
        new_value=None,
        snapshot=snapshot,
        change_reason=reason,
        ip_address=ip_address,
        timestamp=datetime.utcnow()
    )

    db.add(audit_entry)
    db.commit()


def log_bulk_operation(
    db: Session,
    action: str,
    entity_type: str,
    entity_ids: List[int],
    user: User,
    field_changes: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    reason: Optional[str] = None
):
    """Log bulk operations (bulk update, bulk delete)"""
    for entity_id in entity_ids:
        snapshot = field_changes if field_changes else None

        audit_entry = AuditLog(
            entity_type=entity_type,
            entity_id=entity_id,
            user_id=user.userid,
            user_name=user.name,
            action=f'bulk_{action}',
            field_name=None,
            old_value=None,
            new_value=json.dumps(field_changes) if field_changes else None,
            snapshot=snapshot,
            change_reason=reason,
            ip_address=ip_address,
            timestamp=datetime.utcnow()
        )

        db.add(audit_entry)

    db.commit()


def get_order_audit_history(
    db: Session,
    order_id: int,
    limit: Optional[int] = None
) -> List[AuditLog]:
    """Retrieve the complete audit history for an order"""
    query = db.query(AuditLog).filter(
        AuditLog.entity_type == 'order',
        AuditLog.entity_id == order_id
    ).order_by(AuditLog.timestamp.desc())

    if limit:
        query = query.limit(limit)

    return query.all()


def get_order_at_timestamp(
    db: Session,
    order_id: int,
    timestamp: datetime
) -> Optional[Dict[str, Any]]:
    """Reconstruct an order's state at a specific point in time"""
    # Get the creation log
    creation_log = db.query(AuditLog).filter(
        AuditLog.entity_type == 'order',
        AuditLog.entity_id == order_id,
        AuditLog.action == 'create'
    ).first()

    if not creation_log or not creation_log.snapshot:
        return None

    # Start with the initial state
    state = creation_log.snapshot.copy()

    # Apply all changes up to the target timestamp
    changes = db.query(AuditLog).filter(
        AuditLog.entity_type == 'order',
        AuditLog.entity_id == order_id,
        AuditLog.action == 'update',
        AuditLog.timestamp > creation_log.timestamp,
        AuditLog.timestamp <= timestamp
    ).order_by(AuditLog.timestamp.asc()).all()

    for change in changes:
        if change.field_name and change.new_value is not None:
            # Apply the change
            state[change.field_name] = change.new_value

    return state


def revert_order_to_timestamp(
    db: Session,
    order_id: int,
    timestamp: datetime,
    user: User,
    ip_address: Optional[str] = None
) -> Optional[Order]:
    """Revert an order to its state at a specific timestamp"""
    # Get the order's state at the target timestamp
    target_state = get_order_at_timestamp(db, order_id, timestamp)

    if not target_state:
        return None

    # Get the current order
    order = db.query(Order).filter(Order.orderid == order_id).first()

    if not order:
        return None

    # Store old values for audit logging
    old_values = get_order_snapshot(order)

    # Apply the target state
    for field_name, value in target_state.items():
        # Skip system fields
        if field_name in ['orderid', 'created_at', 'updated_at', 'created_by']:
            continue

        # Convert back from serialized format if needed
        if hasattr(order, field_name):
            column_type = type(getattr(Order, field_name).type)

            # Handle date conversion
            if 'Date' in str(column_type) and isinstance(value, str):
                from datetime import datetime
                value = datetime.fromisoformat(value).date()
            # Handle datetime conversion
            elif 'DateTime' in str(column_type) and isinstance(value, str):
                from datetime import datetime
                value = datetime.fromisoformat(value)

            setattr(order, field_name, value)

    db.commit()
    db.refresh(order)

    # Log the revert operation
    new_values = get_order_snapshot(order)
    audit_entry = AuditLog(
        entity_type='order',
        entity_id=order.orderid,
        user_id=user.userid,
        user_name=user.name,
        action='revert',
        field_name=None,
        old_value=json.dumps(old_values),
        new_value=json.dumps(new_values),
        snapshot=new_values,
        change_reason=f'Reverted to state at {timestamp.isoformat()}',
        ip_address=ip_address,
        timestamp=datetime.utcnow()
    )

    db.add(audit_entry)
    db.commit()

    return order


def get_user_activity_summary(
    db: Session,
    user_id: int,
    days: int = 30
) -> Dict[str, Any]:
    """Get a summary of a user's activity over the last N days"""
    from datetime import timedelta

    cutoff_date = datetime.utcnow() - timedelta(days=days)

    logs = db.query(AuditLog).filter(
        AuditLog.user_id == user_id,
        AuditLog.timestamp >= cutoff_date
    ).all()

    summary = {
        'total_actions': len(logs),
        'creates': sum(1 for log in logs if log.action == 'create'),
        'updates': sum(1 for log in logs if log.action == 'update'),
        'deletes': sum(1 for log in logs if log.action == 'delete'),
        'bulk_operations': sum(1 for log in logs if 'bulk' in log.action),
        'reverts': sum(1 for log in logs if log.action == 'revert'),
        'period_days': days
    }

    return summary
