from starlette import status

class AIChatbotBaseException(Exception):
    """Lỗi gốc của hệ thống. Nhận các tham số mặc định nếu class con không truyền lên."""
    def __init__(
        self, 
        message: str = 'Lỗi hệ thống AI Chatbot rồi' ,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR, 
        user_message: str = 'Chatbot hiện tại đang bị lỗi hệ thống.'
    ):
        super().__init__(message)
        self.status_code = status_code
        self.user_message = user_message


class LoadModelError(AIChatbotBaseException):
    def __init__(self, message: str = "Lỗi khi nạp mô hình AI"):
        super().__init__(
            message=message,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
            user_message='Hiện tại AI đang tải dữ liệu, vui lòng quay lại sau nhé!'
        )


class ProductKnowledgeError(AIChatbotBaseException):
    def __init__(self, message: str = "Không tìm thấy dữ liệu để trả lời"):
        super().__init__(
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
            user_message='Hiện tại AI chưa có kiến thức cho câu hỏi hoặc sản phẩm này.'
        )

