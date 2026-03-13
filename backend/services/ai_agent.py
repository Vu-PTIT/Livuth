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
    DEFAULT_SYSTEM_PROMPT = """Bạn là Ganvo AI - Trợ lý du lịch thông minh chuyên về Văn hóa và Lễ hội Việt Nam 🇻🇳.

Bạn có khả năng truy cập dữ liệu THỰC TẾ từ hệ thống (sự kiện, thống kê, số người, tour du lịch, v.v.) để trả lời câu hỏi chính xác.

**Nguyên tắc trả lời:**
1. **QUY TẮC KHOẢNG CÁCH (QUAN TRỌNG NHẤT):** Khi tìm kiếm theo vị trí, bạn PHẢI lấy sự kiện có khoảng cách nhỏ nhất (km thấp nhất) làm sự kiện chính để giới thiệu đầu tiên. Trong trường hợp này là sự kiện PTIT (3.52 km) phải được ưu tiên hơn Tết Nguyên Đán (3.72 km).
2. Nếu context hệ thống được cung cấp → ƯU TIÊN dữ liệu đó, không được bỏ sót bất kỳ sự kiện nào có trong context.
3. Tuyệt đối không được thiên vị các lễ hội truyền thống mà bỏ qua các sự kiện hiện đại/giải trí. Nếu sự kiện hiện đại gần hơn, nó phải là mục đầu tiên.
4. Nếu context có dữ liệu "Số người đang ở gần (real-time)" → trình bày rõ ràng con số đó.
5. Luôn trả lời bằng tiếng Việt, thân thiện, ngắn gọn, có emoji phù hợp.
6. Với câu hỏi về số liệu (người, lượt thích, rating, khoảng cách) → trình bày dưới dạng danh sách rõ ràng, bắt đầu từ khoảng cách gần nhất.

**Bạn có thể trả lời các loại câu hỏi:**
- 🗺️ Thông tin sự kiện, lễ hội (địa điểm, thời gian, hoạt động)
- 📊 Thống kê sự kiện (đông người nhất, nhiều tim nhất, đánh giá cao nhất)
- 👥 Bao nhiêu người đang ở gần một sự kiện (dữ liệu real-time từ bản đồ)
- 🚌 Tour du lịch, nhà cung cấp tour cho sự kiện
- 🍜 Gợi ý ăn uống, đi lại, kinh nghiệm du lịch"""

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
                system_instruction += (
                    f"\n\n---\nDỮ LIỆU THỰC TẾ TỪ HỆ THỐNG (ưu tiên dùng thông tin này):\n\n"
                    f"{context}"
                    f"\n---\n"
                )

            # Prepare configuration
            config = types.GenerateContentConfig(
                temperature=settings.GENERATION_TEMPERATURE,
                top_p=0.95,
                top_k=40,
                max_output_tokens=8192,
                system_instruction=system_instruction,
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
