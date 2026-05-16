from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List
from pydantic import BaseModel
from datetime import datetime

from database import get_db
from models import Message, Notification, User
from auth import require_user

router = APIRouter()


class MessageOut(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    sender_name: str
    text: str
    is_read: bool
    created_at: str

    model_config = {"from_attributes": False}


class ContactOut(BaseModel):
    id: int
    name: str
    email: str
    is_seller: bool
    unread_count: int


class SendMessage(BaseModel):
    receiver_id: int
    text: str


def _fmt(dt: datetime) -> str:
    return dt.isoformat()


@router.get("/user-info/{user_id}")
def get_user_info(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_user),
):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return {"id": u.id, "name": u.name, "is_seller": u.is_seller}


@router.get("/sellers", response_model=List[ContactOut])
def get_sellers(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    sellers = db.query(User).filter(
        User.is_seller == True,
        User.id != current_user.id,
    ).all()

    result = []
    for s in sellers:
        unread = db.query(Message).filter(
            Message.sender_id == s.id,
            Message.receiver_id == current_user.id,
            Message.is_read == False,
        ).count()
        result.append(ContactOut(id=s.id, name=s.name, email=s.email, is_seller=True, unread_count=unread))
    return result


@router.get("/conversation/{user_id}", response_model=List[MessageOut])
def get_conversation(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    msgs = (
        db.query(Message)
        .filter(
            or_(
                and_(Message.sender_id == current_user.id, Message.receiver_id == user_id),
                and_(Message.sender_id == user_id, Message.receiver_id == current_user.id),
            )
        )
        .order_by(Message.created_at)
        .all()
    )

    for m in msgs:
        if m.receiver_id == current_user.id and not m.is_read:
            m.is_read = True
    db.commit()

    return [
        MessageOut(
            id=m.id,
            sender_id=m.sender_id,
            receiver_id=m.receiver_id,
            sender_name=m.sender.name,
            text=m.text,
            is_read=m.is_read,
            created_at=_fmt(m.created_at),
        )
        for m in msgs
    ]


@router.post("", response_model=MessageOut)
def send_message(
    data: SendMessage,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    if not data.text.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    receiver = db.query(User).filter(User.id == data.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")

    msg = Message(
        sender_id=current_user.id,
        receiver_id=data.receiver_id,
        text=data.text.strip(),
    )
    db.add(msg)

    notif = Notification(
        user_id=data.receiver_id,
        title=f"Жаңа хабарлама / Новое сообщение от {current_user.name}",
        body=data.text.strip()[:100],
        type="message",
        link=f"/chat/{current_user.id}",
    )
    db.add(notif)

    db.commit()
    db.refresh(msg)

    return MessageOut(
        id=msg.id,
        sender_id=msg.sender_id,
        receiver_id=msg.receiver_id,
        sender_name=current_user.name,
        text=msg.text,
        is_read=msg.is_read,
        created_at=_fmt(msg.created_at),
    )


@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    count = db.query(Message).filter(
        Message.receiver_id == current_user.id,
        Message.is_read == False,
    ).count()
    return {"count": count}
