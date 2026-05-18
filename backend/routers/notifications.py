from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Notification, User
from schemas import NotificationOut
from auth import require_user

router = APIRouter()


@router.get("", response_model=List[NotificationOut])
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    return (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(30)
        .all()
    )


@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).count()
    return {"count": count}


@router.post("/{notification_id}/read")
def mark_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    n = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()
    if n:
        n.is_read = True
        db.commit()
    return {"ok": True}


@router.post("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).update({"is_read": True})
    db.commit()
    return {"ok": True}
