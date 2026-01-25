"""
AI Agent Service using Google Gemini
Handles all interactions with the LLM.
"""
import google.generativeai as genai
from backend.core.config import settings

class AIAgent:
    """Agent for handling AI interactions via Google Gemini"""
    
    # Default System Prompt
    DEFAULT_SYSTEM_PROMPT = """Chào bạn! Tôi là Ganvo AI - Trợ lý du lịch thông minh chuyên về Văn hóa và Lễ hội Việt Nam 🇻🇳.

    Tôi ở đây để giúp bạn:
    - Khám phá các lễ hội đặc sắc trên khắp cả nước 🏮
    - Tìm kiếm địa điểm du lịch văn hóa, tâm linh, lịch sử 
    - Gợi ý lịch trình và kinh nghiệm đi lại, ăn uống 🍜
    - Giải đáp thắc mắc về phong tục, tập quán Việt Nam

    Hãy hỏi tôi bất cứ điều gì về du lịch Việt Nam nhé! Tôi sẽ trả lời ngắn gọn, chính xác và thân thiện."""

    def __init__(self):
        self.model = None
        self._setup_gemini()

    def _setup_gemini(self):
        """Configure and initialize Gemini model"""
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.model = genai.GenerativeModel(
                model_name=settings.GEMINI_MODEL,
                generation_config={
                    "temperature": settings.GENERATION_TEMPERATURE,
                    "top_p": 0.95,
                    "top_k": 40,
                    "max_output_tokens": 4096,
                }
            )

    def get_response(self, user_message: str, history: list = None) -> str:
        """
        Get response from AI based on user message and chat history.
        
        Args:
            user_message: The current message from user
            history: List of previous messages in Gemini format
            
        Returns:
            AI response text
        """
        if not self.model:
            return "Xin lỗi, trợ lý AI chưa được cấu hình. Vui lòng liên hệ quản trị viên."

        try:
            # Start chat session
            chat = self.model.start_chat(history=history or [])
            
            # If no history, inject system prompt with the first message
            if not history:
                prompt = f"{self.DEFAULT_SYSTEM_PROMPT}\n\nUser: {user_message}"
                response = chat.send_message(prompt)
            else:
                response = chat.send_message(user_message)
                
            return response.text
            
        except Exception as e:
            import traceback
            print(f"Gemini API Error: {str(e)}")
            print(traceback.format_exc())
            return "Xin lỗi, tôi không thể trả lời ngay bây giờ. Vui lòng thử lại sau."
