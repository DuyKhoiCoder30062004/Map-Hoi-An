# Sequence Diagrams

## 1. App khởi động và lấy dữ liệu

```mermaid
sequenceDiagram
    participant Browser
    participant Frontend
    participant Backend
    participant Database

    Browser ->> Frontend: Mở ứng dụng
    Frontend ->> Backend: GET /api/nearby
    Backend ->> Database: SELECT restaurants
    Database -->> Backend: Trả danh sách restaurants
    Backend -->> Frontend: JSON restaurants
    Frontend -->> Browser: Hiển thị bản đồ và marker

    Note over Frontend,Backend: Nếu user ở chế độ admin/owner
    Frontend ->> Backend: GET /api/admin/packages
    Backend ->> Database: SELECT subscription_packages
    Database -->> Backend: JSON packages
    Backend -->> Frontend: Trả packages

    Frontend ->> Backend: GET /api/stats
    Backend ->> Database: SELECT stats
    Database -->> Backend: JSON stats
    Backend -->> Frontend: Trả stats

    Frontend ->> Backend: GET /api/admin/online-count
    Backend ->> Database: SELECT online count
    Database -->> Backend: Trả online_count
    Backend -->> Frontend: JSON online_count

    Frontend ->> Backend: POST /api/users/heartbeat
    Backend ->> Database: INSERT/UPDATE guest_sessions hoặc users
    Database -->> Backend: OK
    Backend -->> Frontend: Xác nhận heartbeat
```

## 2. User đăng nhập và chuyển sang MapViewer

```mermaid
sequenceDiagram
    participant Browser
    participant Frontend
    participant Backend
    participant Database

    Browser ->> Frontend: Click đăng nhập / đăng ký
    Frontend ->> Backend: POST /api/login hoặc /api/register
    Backend ->> Database: SELECT/INSERT users
    Database -->> Backend: Thông tin user
    Backend -->> Frontend: Trả token + user info
    Frontend ->> Browser: Lưu localStorage (vinhkhanh_user)
    Frontend -->> Browser: Chuyển đến MapViewer hoặc Dashboard
```

## 3. Khách/Registered User nghe audio và lưu lịch sử

```mermaid
sequenceDiagram
    participant Browser
    participant Frontend
    participant Backend
    participant Database

    Browser ->> Frontend: Chọn nhà hàng và bấm nghe audio
    Frontend ->> Frontend: Lấy dữ liệu audio từ restaurant.audio_<lang>
    Frontend ->> Browser: Phát audio base64

    alt User đã đăng nhập
        Frontend ->> Backend: POST /api/user/history
        Backend ->> Database: INSERT listen_history(user_id, restaurant_id, lang)
        Database -->> Backend: OK
        Backend -->> Frontend: Xác nhận lưu lịch sử
        Frontend ->> Backend: GET /api/user/history/{user_id}
        Backend ->> Database: SELECT listen_history
        Database -->> Backend: JSON history
        Backend -->> Frontend: Trả history
        Frontend -->> Browser: Hiển thị lịch sử nghe
    end
```

## 4. Chủ quán quản lý quán và xây dựng nội dung đa ngôn ngữ

```mermaid
sequenceDiagram
    participant Owner
    participant Frontend
    participant Backend
    participant Database
    participant Gemini
    participant ElevenLabs

    Owner ->> Frontend: Mở Dashboard Owner
    Frontend ->> Backend: GET /api/owner/my_restaurants/{owner_id}
    Backend ->> Database: SELECT restaurants WHERE owner_id = owner_id
    Database -->> Backend: JSON restaurants
    Backend -->> Frontend: Trả restaurants
    Frontend -->> Owner: Hiển thị danh sách quán

    Owner ->> Frontend: Thêm/quản lý quán ăn
    Frontend ->> Backend: POST /api/restaurants hoặc PUT /api/restaurants/{rest_id}
    Backend ->> Database: INSERT/UPDATE restaurants
    Database -->> Backend: OK
    Backend -->> Frontend: Thông báo thành công

    Owner ->> Frontend: Yêu cầu dịch thuật nội dung
    Frontend ->> Backend: POST /api/translate
    Backend ->> Gemini: Gửi yêu cầu dịch đa ngôn ngữ
    Gemini -->> Backend: Trả translations
    Backend -->> Frontend: JSON translations
    Frontend -->> Owner: Hiển thị nội dung đã dịch

    Owner ->> Frontend: Yêu cầu tạo audio TTS
    Frontend ->> Backend: POST /api/tts
    Backend ->> ElevenLabs: Gọi API TTS
    ElevenLabs -->> Backend: Trả audio_base64
    Backend -->> Frontend: Trả audio_base64
    Frontend -->> Owner: Lưu audio lên restaurant.audio_<lang>
```

## 5. Admin quản lý users, owners và package

```mermaid
sequenceDiagram
    participant Admin
    participant Frontend
    participant Backend
    participant Database

    Admin ->> Frontend: Mở Dashboard Admin
    Frontend ->> Backend: GET /api/users
    Backend ->> Database: SELECT users
    Database -->> Backend: JSON users
    Backend -->> Frontend: Trả users

    Admin ->> Frontend: Tạo owner hoặc user
    Frontend ->> Backend: POST /api/admin/owners hoặc POST /api/users
    Backend ->> Database: INSERT users
    Database -->> Backend: OK
    Backend -->> Frontend: Trả kết quả

    Admin ->> Frontend: Quản lý package
    Frontend ->> Backend: GET /api/admin/packages
    Backend ->> Database: SELECT subscription_packages
    Database -->> Backend: JSON packages
    Backend -->> Frontend: Trả packages

    Admin ->> Frontend: Tạo/Cập nhật/Xóa package
    Frontend ->> Backend: POST /api/admin/packages hoặc PUT /api/admin/packages/{package_id} hoặc DELETE /api/admin/packages/{package_id}
    Backend ->> Database: INSERT/UPDATE/DELETE subscription_packages
    Database -->> Backend: OK
    Backend -->> Frontend: Trả kết quả
```
