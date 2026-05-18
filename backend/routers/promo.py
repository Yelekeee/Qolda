from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from database import get_db
from models import PromoCode, User
from schemas import PromoValidate, PromoResult, PromoCodeCreate, PromoCodeOut
from auth import require_user, require_admin

router = APIRouter()


def validate_promo(code: str, order_total: float, db: Session) -> PromoResult:
    promo = db.query(PromoCode).filter(
        PromoCode.code == code.upper().strip(),
        PromoCode.is_active == True,
    ).first()

    if not promo:
        return PromoResult(valid=False, message="Промокод не найден / Промокод табылмады")

    if promo.expires_at and promo.expires_at < datetime.utcnow():
        return PromoResult(valid=False, message="Промокод истёк / Промокод мерзімі өтті")

    if promo.max_uses and promo.used_count >= promo.max_uses:
        return PromoResult(valid=False, message="Промокод исчерпан / Промокод таусылды")

    discount_amount = round(order_total * promo.discount_percent / 100, 2)
    return PromoResult(
        valid=True,
        discount_percent=promo.discount_percent,
        discount_amount=discount_amount,
        message=f"Скидка {promo.discount_percent}% применена!",
    )


@router.post("/validate", response_model=PromoResult)
def validate_promo_code(
    data: PromoValidate,
    db: Session = Depends(get_db),
    _: User = Depends(require_user),
):
    return validate_promo(data.code, data.order_total, db)


# ── Admin endpoints ───────────────────────────────────────────────────────────

@router.get("", response_model=List[PromoCodeOut])
def list_promos(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return db.query(PromoCode).order_by(PromoCode.created_at.desc()).all()


@router.post("", response_model=PromoCodeOut)
def create_promo(
    data: PromoCodeCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    existing = db.query(PromoCode).filter(PromoCode.code == data.code.upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Промокод уже существует")
    promo = PromoCode(
        code=data.code.upper().strip(),
        discount_percent=data.discount_percent,
        max_uses=data.max_uses,
        expires_at=data.expires_at,
    )
    db.add(promo)
    db.commit()
    db.refresh(promo)
    return promo


@router.delete("/{promo_id}")
def delete_promo(
    promo_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    promo = db.query(PromoCode).filter(PromoCode.id == promo_id).first()
    if not promo:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(promo)
    db.commit()
    return {"ok": True}
