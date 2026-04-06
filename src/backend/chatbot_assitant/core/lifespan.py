from contextlib import asynccontextmanager
from fastapi import FastAPI

from core.logger import system_logger
from core.exception import LoadModelError


class AIEngine :
    def __init__(self):
        self.is_ready = False

    def load_model (self) :
        system_logger.info("Đang nạp dữ liệu từ kho sản phẩm vào mô hình ngôn ngữ")
        self.is_ready = True
        system_logger.info("AI Model đã sẵn sàng phục vụ!")

    def cleanup (self) :
        system_logger.info("Đang giải phóng RAM, xóa cache bộ nhớ...")
        self.is_ready= False

    
ai_engine =  AIEngine()

@asynccontextmanager
async def lifespan (app : FastAPI) :
    system_logger.info("=== HỆ THỐNG KHỞI ĐỘNG ===")
    try :
        ai_engine.load_model()
    except LoadModelError as e:
        system_logger.error(f'khởi động hệ thống thất bại {e}')
    yield

    system_logger.info("=== HỆ THỐNG CHUẨN BỊ TẮT ===")
    ai_engine.cleanup()
    system_logger.info("Đã tắt hệ thống an toàn.")

app = FastAPI(lifespan=lifespan)