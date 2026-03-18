# Báo Cáo Kiến Trúc AI - Hệ Thống Livuth (Ganvo AI)

Báo cáo này mô tả chi tiết cách thức hoạt động của các thành phần trí tuệ nhân tạo (AI) trong hệ thống Livuth, bao gồm Chatbot, RAG (Truy xuất dữ liệu) và tính năng tạo lộ trình (Map Roadmap).

---

## 1. Tổng Quan về Ganvo AI
**Ganvo AI** là trợ lý du lịch thông minh được tích hợp trực tiếp vào hệ thống Livuth. 
- **Công nghệ lõi:** Sử dụng mô hình **Google Gemini** (Gemini 1.5 Flash/Pro) thông qua Google GenAI SDK.
- **Vai trò:** Giải đáp thắc mắc về văn hóa, lễ hội, gợi ý tour và hỗ trợ người dùng lên lịch trình du lịch cá nhân hóa.

---

## 2. Cơ Chế Chatbot & RAG (Retrieval-Augmented Generation)
Để đảm bảo AI không trả lời sai (hallucination) và luôn có dữ liệu thực tế, hệ thống sử dụng kiến trúc **RAG**.

### Bước 1: Phân loại Ý định (Intent Detection)
Khi người dùng gửi tin nhắn, `srv_rag_mongo.py` sẽ phân tích và phân loại câu hỏi vào 5 nhóm chính:
1. `nearby_users`: Đếm số người ở gần một sự kiện cụ thể.
2. `nearby_events`: Tìm các sự kiện trong bán kính (ví dụ: 20km) từ vị trí người dùng.
3. `event_stats`: Tìm kiếm sự kiện theo thống kê (đông nhất, nhiều tim nhất, đánh giá cao nhất).
4. `tour_providers`: Tìm kiếm các nhà cung cấp dịch vụ tour liên quan.
5. `event_search`: Tìm kiếm thông tin sự kiện chung bằng từ khóa.

### Bước 2: Truy xuất Dữ liệu Thực tế (Context Retrieval)
Dựa trên ý định đã xác định, hệ thống sẽ truy vấn vào MongoDB để lấy dữ liệu:
- **Events:** Tên, địa điểm (tọa độ), thời gian (âm lịch/dương lịch), mô tả.
- **Presence:** Số lượng người dùng đang online và người dùng đang ở gần tọa độ của sự kiện dựa trên dịch vụ Real-time Presence.
- **Tour Providers:** Danh sách các tour liên kết với sự kiện.

### Bước 3: Đưa vào Prompt System
Dữ liệu từ MongoDB được định dạng thành một đoạn văn bản (Context) và đưa vào `system_instruction` của Gemini. AI sẽ ưu tiên sử dụng dữ liệu này để trả lời thay vì kiến thức chung chung.

---

## 3. Tạo Lộ trình & Bản đồ (AI Roadmap Generation)
Tính năng tạo Map tự động cho phép AI thiết kế một lịch trình di chuyển chi tiết.

- **Quy trình xử lý:**
    1. Người dùng cung cấp: Điểm đến, số ngày đi, và sở thích.
    2. AI đóng vai chuyên gia du lịch và tạo lịch trình dưới định dạng **JSON nguyên bản**.
    3. Định dạng JSON bao gồm: `title`, `duration`, và danh sách các ngày (`days`). Mỗi ngày sẽ có các `waypoints` (điểm dừng) với tọa độ `lat`, `lng` chính xác để hiển thị lên bản đồ.
- **Kiểm soát định dạng:** Hệ thống buộc AI phải trả về JSON để Frontend có thể render bản đồ và các điểm mốc (markers) ngay lập tức mà không cần xử lý thêm văn bản.

---

## 4. Xử lý Dữ liệu Real-time & Địa lý
Hệ thống AI của Livuth tích hợp sâu với dữ liệu vị trí:
- **Tính toán khoảng cách:** Sử dụng công thức Haversine (trong `geo_utils.py`) để xác định khoảng cách chính xác từ người dùng đến sự kiện.
- **Ưu tiên gần nhất:** AI được lệnh (System Prompt) luôn phải ưu tiên giới thiệu các sự kiện/vị trí có khoảng cách ngắn nhất trước.
- **Real-time Count:** Kết nối với `PresenceService` để đếm chính xác số người đang có mặt tại hiện trường dựa trên tọa độ GPS.

---

## 5. Cấu hình Kỹ thuật
-**Model:** `gemini-1.5-flash` (ưu tiên tốc độ và chi phí).
-**Tham số:**
  - `temperature`: Thường đặt ở mức thấp để đảm bảo tính thực tế.
  - `system_instruction`: Định nghĩa rõ vai trò là "Ganvo AI - Trợ lý du lịch Việt Nam".

---
*Báo cáo được thực hiện bởi Antigravity AI Assistant.*
