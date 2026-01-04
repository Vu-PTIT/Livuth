# Chat API Endpoints Documentation

## Overview

API Chat cho phép người dùng tạo và quản lý các cuộc hội thoại với AI chatbot. Chatbot sử dụng **Google Gemini 2.0 Flash** để trả lời câu hỏi về lễ hội, văn hóa và các chủ đề liên quan.

Base URL: `http://localhost:8000/api/chat`

**Authentication:** Tất cả endpoints yêu cầu JWT token (Bearer token)

---

## Endpoints

### 1. Create Conversation

Tạo cuộc hội thoại mới với chatbot.

```http
POST /api/chat/conversations
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Hỏi về lễ hội Tết"
}
```

**Response:**
```json
{
  "http_code": 201,
  "data": {
    "id": "676e123abc456def78901234",
    "user_id": "676c5f8a1234567890abcdef",
    "title": "Hỏi về lễ hội Tết",
    "created_at": 1735550400.0,
    "updated_at": 1735550400.0
  }
}
```

---

### 2. Get My Conversations

Lấy tất cả các cuộc hội thoại của user hiện tại.

```http
GET /api/chat/conversations
Authorization: Bearer {token}
```

**Response:**
```json
{
  "http_code": 200,
  "data": [
    {
      "id": "676e123abc456def78901234",
      "user_id": "676c5f8a1234567890abcdef",
      "title": "Hỏi về lễ hội Tết",
      "created_at": 1735550400.0,
      "updated_at": 1735550500.0
    }
  ],
  "metadata": {
    "total": 1,
    "user_id": "676c5f8a1234567890abcdef"
  }
}
```

---

### 3. Get Conversation History

Lấy chi tiết cuộc hội thoại với toàn bộ lịch sử tin nhắn.

```http
GET /api/chat/conversations/{conversation_id}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "http_code": 200,
  "data": {
    "id": "676e123abc456def78901234",
    "user_id": "676c5f8a1234567890abcdef",
    "title": "Hỏi về lễ hội Tết",
    "created_at": 1735550400.0,
    "updated_at": 1735550500.0,
    "messages": [
      {
        "id": "676e234bcd567890abcdef12",
        "conversation_id": "676e123abc456def78901234",
        "role": "user",
        "content": "Lễ hội Tết có ý nghĩa gì?",
        "created_at": 1735550450.0
      },
      {
        "id": "676e345cde678901bcdef123",
        "conversation_id": "676e123abc456def78901234",
        "role": "assistant",
        "content": "Lễ hội Tết Nguyên Đán là dịp lễ quan trọng nhất của người Việt Nam...",
        "created_at": 1735550452.0
      }
    ]
  }
}
```

---

### 4. Send Message

Gửi tin nhắn đến chatbot và nhận phản hồi từ AI.

```http
POST /api/chat/conversations/{conversation_id}/messages
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "content": "Lễ hội Tết có những phong tục gì?"
}
```

**Response:** Trả về tin nhắn phản hồi từ AI
```json
{
  "http_code": 200,
  "data": {
    "id": "676e456def789012cdef1234",
    "conversation_id": "676e123abc456def78901234",
    "role": "assistant",
    "content": "Lễ hội Tết có nhiều phong tục như: mâm ngũ quả, bánh chưng, lì xì, xông nhà...",
    "created_at": 1735550500.0
  }
}
```

> [!NOTE]
> Tin nhắn của user sẽ được lưu trước, sau đó chatbot sẽ trả lời dựa trên context của toàn bộ cuộc hội thoại.

---

### 5. Delete Conversation

Xóa cuộc hội thoại và tất cả tin nhắn liên quan.

```http
DELETE /api/chat/conversations/{conversation_id}
Authorization: Bearer {token}
```

**Response:** `204 No Content`

---

## Workflow Example

### Tạo cuộc hội thoại và chat với bot

```bash
# 1. Login để lấy token
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_user",
    "password": "password123"
  }'

# Response: { "data": { "access_token": "eyJ..." } }

# 2. Tạo conversation mới
curl -X POST http://localhost:8000/api/chat/conversations \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Hỏi về lễ hội"
  }'

# Response: { "data": { "id": "676e123...", ... } }

# 3. Gửi message đầu tiên
curl -X POST http://localhost:8000/api/chat/conversations/676e123.../messages \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Cho tôi biết về lễ hội Chùa Hương"
  }'

# Response: AI trả lời về lễ hội Chùa Hương

# 4. Tiếp tục hỏi (có context)
curl -X POST http://localhost:8000/api/chat/conversations/676e123.../messages \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Lễ hội đó diễn ra khi nào?"
  }'

# AI sẽ hiểu "lễ hội đó" là Chùa Hương từ context

# 5. Xem toàn bộ lịch sử chat
curl -X GET http://localhost:8000/api/chat/conversations/676e123... \
  -H "Authorization: Bearer eyJ..."

# 6. Xóa conversation khi không cần
curl -X DELETE http://localhost:8000/api/chat/conversations/676e123... \
  -H "Authorization: Bearer eyJ..."
```

---

## Features

### 🤖 AI Context Awareness
Chatbot ghi nhớ toàn bộ lịch sử hội thoại để trả lời có ngữ cảnh.

### 🇻🇳 Vietnamese Cultural Knowledge
Chatbot được cấu hình với system prompt về văn hóa và lễ hội Việt Nam.

### 💾 Persistent Storage
Tất cả conversations và messages được lưu trong MongoDB.

### 🔒 User-scoped Conversations
Mỗi user chỉ thấy và quản lý conversation của chính họ.

---

## Error Responses

### 401 Unauthorized
```json
{
  "http_code": 401,
  "message": "Unauthorized"
}
```

### 404 Not Found
```json
{
  "http_code": 404,
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "http_code": 500,
  "message": "Gemini API key not configured"
}
```

---

## Technical Details

### Google Gemini Configuration
- **Model:** `gemini-2.0-flash-exp` (from settings.GEMINI_MODEL)
- **Temperature:** 0.4 (from settings.GENERATION_TEMPERATURE)
- **API Key:** Required in `GEMINI_API_KEY` environment variable

### System Instruction
```
Bạn là trợ lý AI thông minh, hiểu biết về văn hóa và lễ hội Việt Nam. 
Hãy trả lời một cách hữu ích, thân thiện và chính xác bằng tiếng Việt.
```
(Được gửi cùng message đầu tiên trong conversation)

### Database Collections
- `chat_conversations` - Store conversation metadata
- `chat_messages` - Store all messages with role (user/assistant/system)

---

## Notes

> [!IMPORTANT]
> Đảm bảo `GEMINI_API_KEY` đã được cấu hình trong `.env` file. Lấy API key tại: https://aistudio.google.com/apikey

> [!TIP]
> Sử dụng title có ý nghĩa khi tạo conversation để dễ quản lý.

> [!WARNING]
> Xóa conversation sẽ xóa vĩnh viễn tất cả messages, không thể khôi phục.
