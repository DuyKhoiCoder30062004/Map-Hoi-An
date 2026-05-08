# Sequence Diagram: VoiceMap SaaS Interaction Flow

Tài liệu này mô tả trình tự tương tác (Sequence) giữa các thành phần trong hệ thống phục vụ cho các nghiệp vụ cốt lõi.

## 1. Luồng Người dùng: Khám phá & Nghe Thuyết minh (User Flow)

Mô tả cách một khách du lịch tương tác với bản đồ và nhận phản hồi âm thanh từ hệ thống.

```mermaid
sequenceDiagram
    participant User as 👤 Người dùng (Khách)
    participant App as 📱 React App (Vite)
    participant API as 🖥️ FastAPI Server
    participant DB as 🗄️ Postgres + PostGIS

    Note over User, DB: Giai đoạn Khám phá
    User->>App: Mở ứng dụng / Quét QR
    App->>API: GET /api/nearby
    API->>DB: SELECT * FROM restaurants (ST_AsText)
    DB-->>API: Trả về danh sách POIs (Tọa độ + Base64)
    API-->>App: Trả về JSON Data
    App-->>User: Hiển thị các Marker trên Bản đồ

    Note over User, DB: Giai đoạn Tương tác
    User->>App: Chọn Marker & Chọn ngôn ngữ
    App->>User: Hiển thị Popup (Tên, Ảnh, Mô tả dịch)
    User->>App: Nhấn nút "Nghe thuyết minh"
    
    App->>App: Giải mã Base64 sang Audio Object
    App-->>User: Phát âm thanh (Audio.play)
    
    App->>API: POST /api/user/history (Background)
    API->>DB: INSERT INTO listen_history
```

---

## 2. Luồng Chủ quán: Tạo nội dung AI (Owner AI Workflow)

Mô tả quy trình tự động hóa kịch bản đa ngôn ngữ bằng AI.

```mermaid
sequenceDiagram
    participant Owner as 👔 Chủ quán (Owner)
    participant App as 🖥️ Admin Dashboard
    participant API as ⚙️ Backend Logic
    participant Gemini as 🤖 Google Gemini
    participant Eleven as 🗣️ ElevenLabs API
    participant DB as 🗄️ Postgres DB

    Owner->>App: Nhập mô tả gốc (VN) -> Nhấn "Sinh AI"
    App->>API: POST /api/translate {text}
    API->>Gemini: Request Translation (JSON prompt)
    Gemini-->>API: Response JSON (4-15 languages)
    API-->>App: Trả về các bản dịch văn bản
    App-->>Owner: Hiển thị các bản dịch trên Form

    Owner->>App: Kiểm tra & Nhấn "Tạo Audio"
    loop Cho mỗi ngôn ngữ đã chọn
        App->>API: POST /api/tts {text, lang}
        API->>Eleven: Request TTS (Multilingual v2)
        Eleven-->>API: MP3 Byte Stream
        API->>API: Encode to Base64 String
        API->>DB: UPDATE restaurants SET audio_{lang} = b64
        API-->>App: Trả về trạng thái Thành công
    end
    App-->>Owner: Hiển thị trạng thái ✅ Hoàn tất
```

---

## 3. Luồng Quản trị: Quản lý Dashboard & Phân quyền (Admin Flow)

```mermaid
sequenceDiagram
    participant Admin as ⚖️ Quản trị viên
    participant App as 🛠️ Admin Panel
    participant API as ⚙️ Backend API
    participant DB as 🗄️ DB (Postgres)

    Admin->>App: Xem Thống kê / Quản lý User
    App->>API: GET /api/stats
    API->>DB: SELECT COUNT(*) FROM tables
    DB-->>API: Số liệu thô
    API-->>App: Trả về JSON Stats
    App-->>Admin: Hiển thị Dashboard (Visits, Users)

    Admin->>App: Nâng cấp gói cước cho Owner
    App->>API: PUT /api/admin/owners/{id} {package_id}
    API->>DB: UPDATE owner_subscriptions
    DB-->>API: Confirm Update
    API-->>App: Response SUCCESS
    App-->>Admin: Thông báo ✅ Đã cập nhật gói
```

---

## 4. Đặc điểm Kỹ thuật của Trình tự
*   **Decoupling:** Hệ thống tách biệt luồng Dịch (Translate) và luồng Giọng nói (TTS) để Owner có thể điều chỉnh văn bản trước khi sinh âm thanh (tiết kiệm chi phí API).
*   **Base64 Delivery:** Âm thanh không được tải như một file độc lập mà được đính kèm trong payload JSON của POI, giúp giảm số lượng request HTTP khi người dùng khám phá bản đồ.
*   **Asynchronous Logging:** Việc ghi lại lịch sử nghe của người dùng được thực hiện bất đồng bộ (Background process) để không làm gián đoạn trải nghiệm nghe của khách du lịch.
