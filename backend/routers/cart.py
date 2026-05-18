from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import CartItemDB, Product, User
from schemas import CartOut, CartItemOut, CartQuantity, ProductOut
from auth import require_user

router = APIRouter()


@router.get("", response_model=CartOut)
def get_cart(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    items = (
        db.query(CartItemDB)
        .filter(CartItemDB.user_id == current_user.id)
        .all()
    )
    out = [
        CartItemOut(
            product_id=item.product_id,
            quantity=item.quantity,
            product=ProductOut.model_validate(item.product),
        )
        for item in items
        if item.product is not None
    ]
    return CartOut(items=out, total=len(out))


@router.post("/{product_id}", response_model=CartItemOut)
def add_to_cart(
    product_id: int,
    body: CartQuantity = CartQuantity(quantity=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if body.quantity < 1:
        raise HTTPException(status_code=422, detail="Quantity must be at least 1")

    item = (
        db.query(CartItemDB)
        .filter(CartItemDB.user_id == current_user.id, CartItemDB.product_id == product_id)
        .first()
    )
    if item:
        item.quantity += body.quantity
    else:
        item = CartItemDB(user_id=current_user.id, product_id=product_id, quantity=body.quantity)
        db.add(item)

    db.commit()
    db.refresh(item)
    return CartItemOut(
        product_id=item.product_id,
        quantity=item.quantity,
        product=ProductOut.model_validate(product),
    )


@router.put("/{product_id}", response_model=CartItemOut)
def update_cart_item(
    product_id: int,
    body: CartQuantity,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    if body.quantity < 1:
        raise HTTPException(status_code=422, detail="Quantity must be at least 1")

    item = (
        db.query(CartItemDB)
        .filter(CartItemDB.user_id == current_user.id, CartItemDB.product_id == product_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Item not in cart")

    item.quantity = body.quantity
    db.commit()
    db.refresh(item)
    return CartItemOut(
        product_id=item.product_id,
        quantity=item.quantity,
        product=ProductOut.model_validate(item.product),
    )


@router.delete("/{product_id}")
def remove_from_cart(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    item = (
        db.query(CartItemDB)
        .filter(CartItemDB.user_id == current_user.id, CartItemDB.product_id == product_id)
        .first()
    )
    if item:
        db.delete(item)
        db.commit()
    return {"ok": True}


@router.delete("")
def clear_cart(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    db.query(CartItemDB).filter(CartItemDB.user_id == current_user.id).delete()
    db.commit()
    return {"ok": True}
