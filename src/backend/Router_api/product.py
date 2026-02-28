from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List

from src.backend.connect_database import engine , get_session
from src.backend.schemas import ProductRead
from src.backend.models import Product
router_product = APIRouter(
    prefix="/products",
)

@router_product.get("/", response_model=List[ProductRead])
def get_products(session: Session = Depends(get_session), limit: int = 18):
    products = session.exec(select(Product).limit(limit)).all()
    return products


@router_product.get("/{product_id}", response_model=Product)
def get_product_detail(product_id: int, session: Session = Depends(get_session)):
    """Lấy chi tiết 1 sản phẩm"""
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

# API tìm kiếm thường (không dùng AI) - dành cho ô search bar trên header
@router_product.get("/search/", response_model=List[Product])
def search_products(q: str, session: Session = Depends(get_session)):
    """Tìm kiếm sản phẩm theo tên (SQL ILIKE)"""
    statement = select(Product).where(Product.name.ilike(f"%{q}%"))
    results = session.exec(statement).all()
    return results