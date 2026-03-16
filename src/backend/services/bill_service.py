from sqlmodel import Session
from src.backend.models import Bill, BillDetail
from src.backend.schemas import CreateBill

class BillService:
    @staticmethod
    async def create_bill(bill_data: CreateBill, session: Session) -> Bill:
        try:
            # 1. Tạo hóa đơn chính (Bill)
            new_bill = Bill(
                customer_id=bill_data.customer_id,
                total_price=bill_data.total_price,
                total_shipping=bill_data.total_shipping,
                status=bill_data.status,
                payment_method=bill_data.payment_method,
                payment_status=bill_data.payment_status,
                discount_product=bill_data.discount_product,
                discount_shipping=bill_data.discount_shipping,
                shopee_voucher_id=bill_data.shopee_voucher_id,
                seller_voucher_id=bill_data.seller_voucher_id
            )
            session.add(new_bill)
            session.commit() 
            session.refresh(new_bill) # Lấy new_bill.id vừa được tạo

            # 2. Tạo các chi tiết hóa đơn (BillDetail)
            for detail in bill_data.details:
                new_detail = BillDetail(
                    bill_id=new_bill.id,
                    product_id=detail.product_id,
                    quantity=detail.quantity,
                    price_at_purchase=detail.price_at_purchase
                )
                session.add(new_detail)

            # 3. Lưu toàn bộ chi tiết vào database
            session.commit()
            session.refresh(new_bill)
            
            return new_bill

        except Exception as e:
            session.rollback()
            print(f"❌ Database Error (Create Bill): {e}")
            raise Exception("Lỗi khi tạo hóa đơn và chi tiết hóa đơn.")