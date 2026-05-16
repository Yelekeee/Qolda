from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import WishlistItem, Product, User
from schemas import WishlistOut, WishlistItemOut, ProductOut
from auth import require_user

router = APIRouter()


@router.get("", response_model=WishlistOut)
def get_wishlist(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    items = (
        db.query(WishlistItem)
        .filter(WishlistItem.user_id == current_user.id)
        .order_by(WishlistItem.added_at.desc())
        .all()
    )
    out = [
        WishlistItemOut(
            product_id=item.product_id,
            product=ProductOut.model_validate(item.product),
            added_at=item.added_at,
        )
        for item in items
        if item.product is not None
    ]
    return WishlistOut(items=out, total=len(out))


@router.post("/{product_id}")
def toggle_wishlist(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    existing = (
        db.query(WishlistItem)
        .filter(WishlistItem.user_id == current_user.id, WishlistItem.product_id == product_id)
        .first()
    )
    if existing:
        db.delete(existing)
        db.commit()
        return {"added": False}

    db.add(WishlistItem(user_id=current_user.id, product_id=product_id))
    db.commit()
    return {"added": True}


@router.delete("/{product_id}")
def remove_from_wishlist(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    item = (
        db.query(WishlistItem)
        .filter(WishlistItem.user_id == current_user.id, WishlistItem.product_id == product_id)
        .first()
    )
    if item:
        db.delete(item)
        db.commit()
    return {"ok": True}
