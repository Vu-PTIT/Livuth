# User API Endpoints Documentation

## Mô Tả Chung

API User đã được cập nhật với các endpoints mới để quản lý profile chi tiết hơn, bao gồm sở thích (hobbies) và sự kiện đã tham gia (participated events).

Base URL: `http://localhost:8000/api/users`

---

## CRUD Endpoints Cơ Bản

### 1. Get All Users
```http
GET /api/users/all
```

**Response:**
```json
{
  "http_code": 200,
  "data": [
    {
      "id": "676c5f8a1234567890abcdef",
      "username": "nguyen_van_a",
      "email": "nva@example.com",
      "hobbies": ["du lịch", "nhiếp ảnh"],
      "bio": "Đam mê khám phá văn hóa",
      "participated_events": ["event_id_1"],
      "roles": ["guest"]
    }
  ],
  "metadata": {
    "total": 1,
    "page": 1,
    "page_size": 1
  }
}
```

### 2. Get User By ID
```http
GET /api/users/{user_id}
```

**Parameters:**
- `user_id` (path): MongoDB ObjectId của user

**Response:** Tương tự Get All Users (single object)

### 3. Create New User
```http
POST /api/users
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "nguyen_van_a",
  "email": "nva@example.com",
  "password": "password123",
  "first_name": "Văn A",
  "last_name": "Nguyễn",
  "hobbies": ["du lịch", "nhiếp ảnh", "văn hóa"],
  "bio": "Yêu thích khám phá lễ hội truyền thống"
}
```

**Required Fields:**
- `email`: Email address
- `password`: Plain text password (will be hashed)

**Optional Fields:**
- `username`: Username (auto-generated if not provided)
- `first_name`, `last_name`, `full_name`
- `hobbies`: Array of strings
- `bio`: Self-introduction text
- `dob`, `gender`, `phone`, `address`
- `identity_card`, `identity_card_date`, `identity_card_place`

### 4. Update User (Full Update)
```http
PUT /api/users/{user_id}
Content-Type: application/json
```

**Request Body:** (All fields optional)
```json
{
  "hobbies": ["du lịch", "nhiếp ảnh", "âm nhạc", "lịch sử"],
  "bio": "Bio đã được cập nhật",
  "participated_events": ["event_id_1", "event_id_2"]
}
```

### 5. Partial Update User
```http
PATCH /api/users/{user_id}
Content-Type: application/json
```

**Request Body:** (Chỉ gửi các trường cần update)
```json
{
  "bio": "Chỉ cập nhật bio, giữ nguyên các trường khác"
}
```

### 6. Delete User
```http
DELETE /api/users/{user_id}
```

**Response:** `204 No Content`

---

## Profile Management Endpoints (Mới)

### 7. Add Hobby
```http
POST /api/users/{user_id}/hobbies?hobby={hobby_name}
```

**Parameters:**
- `user_id` (path): User ID
- `hobby` (query): Tên sở thích muốn thêm

**Example:**
```bash
POST /api/users/676c5f8a1234567890abcdef/hobbies?hobby=nhiếp%20ảnh
```

**Response:**
```json
{
  "http_code": 200,
  "data": {
    "id": "676c5f8a1234567890abcdef",
    "username": "nguyen_van_a",
    "hobbies": ["du lịch", "nhiếp ảnh"],
    ...
  }
}
```

**Đặc điểm:**
- ✅ Tự động tránh trùng lặp
- ✅ Giữ nguyên các hobbies hiện có
- ✅ Chỉ thêm nếu chưa tồn tại

### 8. Remove Hobby
```http
DELETE /api/users/{user_id}/hobbies/{hobby_name}
```

**Parameters:**
- `user_id` (path): User ID
- `hobby` (path): Tên sở thích muốn xóa

**Example:**
```bash
DELETE /api/users/676c5f8a1234567890abcdef/hobbies/nhiếp%20ảnh
```

**Response:** Tương tự Add Hobby, nhưng hobby đã bị loại khỏi danh sách

### 9. Add Participated Event
```http
POST /api/users/{user_id}/events/{event_id}
```

**Parameters:**
- `user_id` (path): User ID
- `event_id` (path): Event MongoDB ObjectId

**Example:**
```bash
POST /api/users/676c5f8a1234567890abcdef/events/676d123abc456def78901234
```

**Response:**
```json
{
  "http_code": 200,
  "data": {
    "id": "676c5f8a1234567890abcdef",
    "username": "nguyen_van_a",
    "participated_events": ["676d123abc456def78901234"],
    ...
  }
}
```

**Đặc điểm:**
- ✅ Tránh trùng lặp event IDs
- ✅ Thêm event ID vào cuối danh sách

### 10. Remove Participated Event
```http
DELETE /api/users/{user_id}/events/{event_id}
```

**Parameters:**
- `user_id` (path): User ID
- `event_id` (path): Event MongoDB ObjectId cần xóa

**Example:**
```bash
DELETE /api/users/676c5f8a1234567890abcdef/events/676d123abc456def78901234
```

---

## Use Cases

### Use Case 1: User tham gia một event
```bash
# Khi user check-in tại event
POST /api/users/{user_id}/events/{event_id}
```

### Use Case 2: User thêm sở thích mới
```bash
# User chọn thêm sở thích "âm nhạc dân tộc"
POST /api/users/{user_id}/hobbies?hobby=âm%20nhạc%20dân%20tộc
```

### Use Case 3: User cập nhật bio
```bash
# User viết lại giới thiệu bản thân
PATCH /api/users/{user_id}
Content-Type: application/json

{
  "bio": "Tôi là người yêu thích khám phá các lễ hội truyền thống..."
}
```

### Use Case 4: Lấy danh sách events user đã tham gia
```bash
# 1. Get user info
GET /api/users/{user_id}

# 2. Extract participated_events array từ response
# 3. Với mỗi event_id, call:
GET /api/events/{event_id}
```

---

## Error Responses

### 404 Not Found
```json
{
  "http_code": 404,
  "message": "User not found"
}
```

### 409 Conflict
```json
{
  "http_code": 409,
  "message": "User already exists"
}
```

### 401 Unauthorized
```json
{
  "http_code": 401,
  "message": "Unauthorized"
}
```

---

## Testing với cURL

### Tạo user mới
```bash
curl -X POST http://localhost:8000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_user",
    "email": "test@example.com",
    "password": "password123",
    "hobbies": ["du lịch", "nhiếp ảnh"],
    "bio": "Testing user profile"
  }'
```

### Thêm sở thích
```bash
curl -X POST "http://localhost:8000/api/users/{user_id}/hobbies?hobby=văn%20hóa"
```

### Thêm event đã tham gia
```bash
curl -X POST http://localhost:8000/api/users/{user_id}/events/{event_id}
```

### Xóa sở thích
```bash
curl -X DELETE http://localhost:8000/api/users/{user_id}/hobbies/văn%20hóa
```

---

## Notes

> [!TIP]
> Sử dụng endpoints `/hobbies` và `/events` thay vì PATCH toàn bộ array để tránh race conditions khi nhiều client cập nhật cùng lúc.

> [!NOTE]
> Tất cả các string trong URL phải được URL-encoded. Ví dụ: "văn hóa" → "văn%20hóa"

> [!IMPORTANT]
> MongoDB ObjectId phải đúng format 24 ký tự hex, nếu không sẽ trả về 404 Not Found.
