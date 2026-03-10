"""
AI Agent Service using Google Gemini
Handles all interactions with the LLM.
"""
from google import genai
from google.genai import types
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
        self.client = None
        self._setup_gemini()

    def _setup_gemini(self):
        """Configure and initialize Gemini client"""
        if settings.GEMINI_API_KEY:
            self.client = genai.Client(api_key=settings.GEMINI_API_KEY)

    def _format_history(self, history: list) -> list:
        """Convert history from old format (list of strings in parts) to new format"""
        formatted_history = []
        for msg in history:
            role = msg.get("role")
            parts = msg.get("parts", [])
            
            # Convert list of string parts to list of dict parts
            new_parts = []
            for part in parts:
                if isinstance(part, str):
                    new_parts.append({"text": part})
                else:
                    new_parts.append(part)
            
            formatted_history.append({
                "role": role,
                "parts": new_parts
            })
        return formatted_history

    def get_response(self, user_message: str, history: list = None, context: str = None) -> str:
        """
        Get response from AI based on user message and chat history.
        
        Args:
            user_message: The current message from user
            history: List of previous messages in Gemini format
            context: Optional knowledge context retrieved from database
            
        Returns:
            AI response text
        """
        if not self.client:
            return "Xin lỗi, trợ lý AI chưa được cấu hình. Vui lòng liên hệ quản trị viên."

        try:
            # Prepare system prompt with context if available
            system_instruction = self.DEFAULT_SYSTEM_PROMPT
            if context:
                system_instruction += f"\n\n{context}\n\nLƯU Ý QUAN TRỌNG: Hãy sử dụng thông tin THỰC TẾ từ hệ thống cung cấp ở trên để trả lời câu hỏi nếu liên quan (như tên sự kiện, thời gian, địa điểm, nội dung). Chỉ dùng kiến thức ngoài khi thông tin hệ thống không đủ."

            # Prepare configuration
            config = types.GenerateContentConfig(
                temperature=settings.GENERATION_TEMPERATURE,
                top_p=0.95,
                top_k=40,
                max_output_tokens=4096,
                system_instruction=system_instruction
            )

            # Format history (the new SDK is stricter about parts structure)
            formatted_history = self._format_history(history or [])

            # Create chat session
            chat = self.client.chats.create(
                model=settings.GEMINI_MODEL,
                config=config,
                history=formatted_history
            )
            
            # Send message
            response = chat.send_message(user_message)
                
            return response.text
            
        except Exception as e:
            import traceback
            print(f"Gemini API Error: {str(e)}")
            print(traceback.format_exc())
            return "Xin lỗi, tôi không thể trả lời ngay bây giờ. Vui lòng thử lại sau."
