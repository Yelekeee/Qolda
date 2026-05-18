from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from datetime import datetime, timedelta

from database import get_db
from models import Product, Order, OrderItem, User
from schemas import SellerStats, RevenuePoint
from auth import require_seller

router = APIRouter()

DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']


@router.get("/stats", response_model=SellerStats)
def get_seller_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_seller),
):
    seller_products = db.query(Product).filter(Product.seller_id == current_user.id).all()
    seller_product_ids = [p.id for p in seller_products]
    total_products = len(seller_product_ids)
    low_stock_count = sum(1 for p in seller_products if 0 < p.stock <= 10)

    empty = SellerStats(
        total_products=total_products,
        total_orders=0,
        total_revenue=0.0,
        month_revenue=0.0,
        prev_month_revenue=0.0,
        cancelled_orders=0,
        returned_orders=0,
        low_stock_count=low_stock_count,
        revenue_by_day=[RevenuePoint(name=n, revenue=0) for n in DAY_NAMES],
        revenue_by_week=[RevenuePoint(name=f'Нед {i+1}', revenue=0) for i in range(4)],
    )

    empty = SellerStats(
        total_products=total_products,
        total_orders=0,
        total_revenue=0.0,
        month_revenue=0.0,
        prev_month_revenue=0.0,
        cancelled_orders=0,
        returned_orders=0,
        low_stock_count=sum(1 for p in seller_products if 0 < p.stock <= 10),
        revenue_by_day=[RevenuePoint(name=n, revenue=0) for n in DAY_NAMES],
        revenue_by_week=[RevenuePoint(name=f'Нед {i+1}', revenue=0) for i in range(4)],
    )

    if not seller_product_ids:
        return empty

    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    prev_month_end = month_start - timedelta(seconds=1)
    prev_month_start = prev_month_end.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # IDs of orders that contain seller's products
    order_id_subq = (
        db.query(OrderItem.order_id)
        .filter(OrderItem.product_id.in_(seller_product_ids))
        .distinct()
        .subquery()
    )

    # Aggregate totals via SQL — no Python loops over all orders
    agg = db.query(
        func.count(Order.id).label("total_orders"),
        func.coalesce(func.sum(Order.total_amount), 0.0).label("total_revenue"),
        func.coalesce(
            func.sum(case((Order.created_at >= month_start, Order.total_amount), else_=0)),
            0.0
        ).label("month_revenue"),
        func.coalesce(
            func.sum(case(
                (Order.created_at.between(prev_month_start, prev_month_end), Order.total_amount),
                else_=0
            )),
            0.0
        ).label("prev_month_revenue"),
        func.count(case((Order.status == 'cancelled', 1))).label("cancelled_orders"),
        func.count(case((Order.status == 'returned', 1))).label("returned_orders"),
    ).filter(Order.id.in_(order_id_subq)).one()

    total_orders = agg.total_orders
    total_revenue = float(agg.total_revenue)
    month_revenue = float(agg.month_revenue)
    prev_month_revenue = float(agg.prev_month_revenue)
    cancelled_orders = agg.cancelled_orders
    returned_orders = agg.returned_orders

    # Revenue by day — last 7 days via SQL
    revenue_by_day = []
    for i in range(6, -1, -1):
        day = now - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day.replace(hour=23, minute=59, second=59, microsecond=999999)
        rev = db.query(func.coalesce(func.sum(Order.total_amount), 0.0)).filter(
            Order.id.in_(order_id_subq),
            Order.created_at.between(day_start, day_end),
        ).scalar()
        revenue_by_day.append(RevenuePoint(name=DAY_NAMES[day.weekday()], revenue=round(float(rev), 2)))

    # Revenue by week — last 4 weeks via SQL
    revenue_by_week = []
    for i in range(3, -1, -1):
        week_end = now - timedelta(weeks=i)
        week_start = week_end - timedelta(weeks=1)
        rev = db.query(func.coalesce(func.sum(Order.total_amount), 0.0)).filter(
            Order.id.in_(order_id_subq),
            Order.created_at.between(week_start, week_end),
        ).scalar()
        revenue_by_week.append(RevenuePoint(name=f'Нед {4 - i}', revenue=round(float(rev), 2)))

    return SellerStats(
        total_products=total_products,
        total_orders=total_orders,
        total_revenue=round(total_revenue, 2),
        month_revenue=round(month_revenue, 2),
        prev_month_revenue=round(prev_month_revenue, 2),
        cancelled_orders=cancelled_orders,
        returned_orders=returned_orders,
        low_stock_count=low_stock_count,
        revenue_by_day=revenue_by_day,
        revenue_by_week=revenue_by_week,
    )
