"""
Shared utility functions used across multiple modules.
Consolidates common business logic to avoid duplication.
"""


def calculate_psu_from_order(order) -> int:
    """Calculate PSU (Primary Service Units) from a single order.
    
    PSU = 1 per product category (not per unit quantity):
    - Internet = 1 PSU (if has_internet is True)
    - Voice = 1 PSU (if has_voice > 0, regardless of line count)
    - Mobile = 1 PSU (if has_mobile > 0, regardless of line count)
    - TV = 1 PSU (if has_tv is True)
    - SBC = 1 PSU (if has_sbc > 0, regardless of seat count)
    
    WIB does NOT count as PSU (a-la-carte bonus only)
    
    Args:
        order: Order object with has_internet, has_voice, has_mobile, has_tv, has_sbc attributes
        
    Returns:
        int: Total PSU count for the order (0-5)
    """
    psu = 0
    if order.has_internet:
        psu += 1
    if order.has_voice and order.has_voice > 0:
        psu += 1
    if order.has_mobile and order.has_mobile > 0:
        psu += 1
    if order.has_tv:
        psu += 1
    if order.has_sbc and order.has_sbc > 0:
        psu += 1
    return psu


def calculate_metrics_from_orders(orders: list) -> dict:
    """Calculate all metrics from a list of orders.
    
    Args:
        orders: List of Order objects
        
    Returns:
        dict with keys: orders, internet, tv, mobile, voice, sbc, wib, psu, revenue
    """
    return {
        'orders': len(orders),
        'internet': sum(1 for o in orders if o.has_internet),
        'tv': sum(1 for o in orders if o.has_tv),
        'mobile': sum(1 for o in orders if o.has_mobile and o.has_mobile > 0),
        'voice': sum(1 for o in orders if o.has_voice and o.has_voice > 0),
        'sbc': sum(1 for o in orders if o.has_sbc and o.has_sbc > 0),
        'wib': sum(1 for o in orders if o.has_wib),
        'psu': sum(calculate_psu_from_order(o) for o in orders),
        'revenue': sum(o.monthly_total or 0 for o in orders)
    }
