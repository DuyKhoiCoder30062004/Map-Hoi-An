# Use Case Diagram: VoiceMap Vĩnh Khánh - Nhóm 33

Tài liệu này mô tả các tác nhân (Actors) và các kịch bản sử dụng (Use Cases) của hệ thống dựa trên cấu trúc cơ sở dữ liệu hiện tại.

## 1. Tác nhân (Actors)

| Tác nhân | Mô tả |
| :--- | :--- |
| **Khách/Người dùng (User)** | Người tham quan, sử dụng ứng dụng để quét mã QR, xem bản đồ và nghe giới thiệu món ăn. |
| **Chủ quán (Owner/Partner)** | Người sở hữu nhà hàng/POI, quản lý nội dung đa ngôn ngữ và gói dịch vụ. |
| **Quản trị viên (Admin)** | Người quản lý hệ thống, phê duyệt đối tác, quản lý gói cước và theo dõi logs. |

---

## 2. Biểu đồ Use Case (Mermaid)

```mermaid
flowchart LR
    %% Định nghĩa Actors
    User["👤 Khách / Người dùng"]
    Owner["🏢 Chủ quán / Đối tác"]
    Admin["⚖️ Quản trị viên"]

    subgraph System ["Hệ thống VoiceMap"]
        direction TB
        UC1(["Xem bản đồ POI"])
        UC2(["Quét QR & Xem thông tin"])
        UC3(["Chọn ngôn ngữ"])
        UC4(["Nghe Audio giới thiệu"])
        UC5(["Lưu lịch sử nghe"])
        
        UC6(["Quản lý Profile Quán"])
        UC7(["Tạo nội dung AI"])
        UC8(["Đăng ký Gói dịch vụ"])
        UC9(["Xem thống kê truy cập"])
        
        UC10(["Quản lý Người dùng"])
        UC11(["Phê duyệt Đối tác"])
        UC12(["Cấu hình Gói cước"])
        UC13(["Giám sát System Logs"])
    end

    %% Mối quan hệ User
    User --> UC1
    User --> UC2
    User --> UC3
    User --> UC4
    UC4 -. include .-> UC5

    %% Mối quan hệ Owner
    Owner --> UC6
    Owner --> UC7
    Owner --> UC8
    Owner --> UC9

    %% Mối quan hệ Admin
    Admin --> UC10
    Admin --> UC11
    Admin --> UC12
    Admin --> UC13
```

---

## 3. Mô tả chi tiết các Use Case chính

### A. Nhóm cho Người dùng (User/Listen History)
*   **Nghe Audio giới thiệu (UC4):** Dựa trên bảng `restaurants` (các cột `audio_vi`, `audio_en`, ...). Khi thực hiện, hệ thống tự động ghi lại bản ghi vào `listen_history`.
*   **Quét QR (UC2):** Sử dụng dữ liệu từ cột `qr_data` để định danh nhà hàng.

### B. Nhóm cho Chủ quán (Owner/Subscription)
*   **Quản lý Profile Quán (UC6):** Cập nhật Tên, Đặc sản, Ảnh, Vị trí (Geometry) vào bảng `restaurants`.
*   **Tạo nội dung AI (UC7):** Sử dụng logic AI để điền dữ liệu vào các cột `description_[lang]` và `audio_[lang]`.
*   **Đăng ký Gói dịch vụ (UC8):** Tương tác với bảng `subscription_packages` và `owner_subscriptions` để xác định giới hạn ngôn ngữ (`allowed_langs`) và số lượng POI (`poi_limit`).

### C. Nhóm cho Quản trị viên (Admin/Interaction Logs)
*   **Phê duyệt Đối tác (UC11):** Chuyển trạng thái (`status`) của bản ghi trong bảng `partners` từ 'pending' sang 'active'.
*   **Giám sát System Logs (UC13):** Truy vấn từ bảng `interaction_logs` để theo dõi mọi hành vi đáng ngờ hoặc hiệu suất hệ thống.

---

## 4. Ràng buộc nghiệp vụ (Business Rules)
1.  **Subscription Limit:** Chủ quán chỉ được thêm số lượng POI dựa trên `poi_limit` của gói họ đang dùng.
2.  **Language Scope:** Danh sách ngôn ngữ hiển thị tại `UC3` phải nằm trong mảng `allowed_langs` của gói dịch vụ.
3.  **Interaction Logging:** Mọi hành động nhạy cảm (Xóa quán, Thay đổi gói) phải được ghi vào `interaction_logs`.
