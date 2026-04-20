"""
enrich_descriptions.py
Script độc lập — Làm giàu (Enrich) cột description cho toàn bộ bảng Product.
Dùng Gemini API (google-generativeai) + SQLModel + PostgreSQL.

Chạy: cd D:/shope/src/backend && python scripts/enrich_descriptions.py
"""

import os
import sys
import time
import logging
from pathlib import Path

# ── Setup đường dẫn để import được module backend ──────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parents[2]   # src/backend/scripts → src/backend → project root
sys.path.insert(0, str(PROJECT_ROOT))

from dotenv import load_dotenv
from tqdm import tqdm
from sqlmodel import Session, select, func

from src.backend.connect_database import engine
from src.backend.models import Product

# ── Load .env ──────────────────────────────────────────────────────────────
dotenv_path = PROJECT_ROOT / ".env"
load_dotenv(dotenv_path)

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if not GOOGLE_API_KEY:
    raise RuntimeError("Thieu GOOGLE_API_KEY trong file .env")

# ── Cấu hình logging ───────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("enrich_description")


# ── 1. Khởi tạo Gemini client ───────────────────────────────────────────────
def build_llm():
    """Tạo Gemini chat client. Dùng gemini-2.0-flash thay vì gemini-1.5-flash."""
    try:
        import google.generativeai as genai
    except ImportError:
        raise RuntimeError(
            "Chua cai google-generativeai.\n"
            "   Chay: pip install google-generativeai"
        )

    genai.configure(api_key=GOOGLE_API_KEY)
    # Model mới: gemini-2.0-flash (thay vì gemini-1.5-flash bị 404)
    model = genai.GenerativeModel("gemini-2.0-flash")
    logger.info("Gemini client khoi tao thanh cong (model: gemini-2.0-flash)")
    return model


LLM = build_llm()


# ── 2. Prompt cho LLM ───────────────────────────────────────────────────────
SYSTEM_PROMPT = """Bạn là một copywriter SEO xuất sắc, chuyên viết mô tả sản phẩm thương mại điện tử.

Nhiệm vụ: Từ tên sản phẩm và mô tả cũ, hãy viết một đoạn mô tả mới CHI TIẾT, THU HÚT, TỐI ƯU SEO.

YÊU CẦU BẮT BUỘC:
- Độ dài: khoảng 4–5 câu văn, rõ ràng, mạch lạc.
- Tự động suy luận và CHÈN THÊM các từ khóa tự nhiên về:
    * Màu sắc phổ biến của sản phẩm
    * Chất liệu / vật liệu sản phẩm
    * Đối tượng sử dụng phù hợp
    * Ứng dụng / công dụng thực tế trong đời sống
- Mục đích: Tối ưu cho hệ thống Hybrid Search (BM25 Keyword + Vector Semantic Search).
- TUYỆT ĐỐI KHÔNG dùng emoji/icon.
- KHÔNG viết định dạng markdown (không **, không ###, không bullet list).
- CHỈ trả về một đoạn văn bản thuần, không có prefix "Mô tả:", "Kết quả:", hay bất kỳ dòng hướng dẫn nào khác.
- Nếu mô tả cũ quá ngắn hoặc rỗng, vẫn viết đầy đủ dựa trên tên sản phẩm.
"""


def generate_rich_description(product_name: str, old_description: str) -> str:
    """
    Gọi Gemini sinh mô tả mới cho một sản phẩm.
    """
    user_prompt = f"""Tên sản phẩm: {product_name}
Mô tả cũ: {old_description if old_description else '(trống)'}

Hãy viết mô tả mới:"""

    try:
        response = LLM.generate_content(
            contents=[
                {"role": "user", "parts": [{"text": SYSTEM_PROMPT}]},
                {"role": "model", "parts": [{"text": "Tôi đã hiểu. Bắt đầu viết mô tả ngay cho bạn."}]},
                {"role": "user", "parts": [{"text": user_prompt}]},
            ],
            generation_config={
                "temperature": 0.7,
                "max_output_tokens": 512,
            },
        )
        text = response.text.strip()

        if not text:
            raise ValueError("Gemini tra ve response rong")

        logger.debug(f"  Gemini: {text[:60]}...")
        return text

    except Exception as e:
        logger.warning(f"  Loi Gemini: {e}")
        raise


# ── 3. Main Loop ────────────────────────────────────────────────────────────
def main():
    logger.info("=" * 60)
    logger.info("BAT DAU ENRICH DESCRIPTION")
    logger.info("=" * 60)

    total_updated = 0
    total_skipped = 0
    batch_size = 10

    with Session(engine) as session:
        # Đếm tổng sản phẩm
        total_products = session.exec(select(func.count(Product.id))).one() or 0
        logger.info(f"Tong san pham can xu ly: {total_products}")

        if total_products == 0:
            logger.warning("Khong co san pham nao trong bang Product.")
            return

        # Lấy toàn bộ sản phẩm (sắp xếp theo id để track tiến độ)
        stmt = select(Product).order_by(Product.id)
        all_products = session.exec(stmt).all()

        # Progress bar
        pbar = tqdm(
            all_products,
            desc="Enriching",
            unit="sp",
            colour="green",
            ncols=80,
        )

        for idx, product in enumerate(pbar, start=1):
            pid   = product.id
            name  = product.name or ""
            old_d = product.description or ""

            pbar.set_postfix_str(f"#{pid} | {name[:30]}", refresh=True)

            try:
                # Gọi LLM sinh mô tả mới
                new_description = generate_rich_description(name, old_d)

                # Cập nhật
                product.description = new_description
                session.add(product)

                # Commit sau mỗi batch hoặc sản phẩm cuối cùng
                if idx % batch_size == 0 or idx == total_products:
                    session.commit()
                    logger.info(
                        f"  Da commit batch {idx // batch_size} "
                        f"({idx}/{total_products} san pham)"
                    )

                total_updated += 1

            except Exception as e:
                session.rollback()
                total_skipped += 1
                logger.warning(f"  Bo qua san pham #{pid} — Loi: {e}")

            # ── Rate Limit protection ─────────────────────────────
            # Sau mỗi sản phẩm, chờ 2 giây để tránh 429
            time.sleep(2)

    # ── Kết quả ────────────────────────────────────────────────────────────────
    logger.info("")
    logger.info("=" * 60)
    logger.info("HOAN TAT ENRICH DESCRIPTION")
    logger.info(f"   Cap nhat thanh cong : {total_updated} san pham")
    logger.info(f"   Bo qua (loi LLM)   : {total_skipped} san pham")
    logger.info(f"   Tong xu ly         : {total_updated + total_skipped} san pham")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
