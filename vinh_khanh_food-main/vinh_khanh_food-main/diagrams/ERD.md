# ERD

```mermaid
erDiagram
    users {
        int id PK
        string username
        string password_hash
        string role
        jsonb settings
        timestamp last_active
    }

    restaurants {
        int id PK
        string name
        string specialty_dish
        string image_url
        text description
        text description_en
        text description_ko
        text description_zh
        text description_ja
        text description_fr
        text description_de
        text description_es
        text description_th
        text description_ru
        text description_ar
        text description_it
        text description_pt
        text description_hi
        text description_id
        text audio_vi
        text audio_en
        text audio_ko
        text audio_zh
        text audio_ja
        text audio_fr
        text audio_de
        text audio_es
        text audio_th
        text audio_ru
        text audio_ar
        text audio_it
        text audio_pt
        text audio_hi
        text audio_id
        geometry location
        int owner_id FK
    }

    subscription_packages {
        int id PK
        string name
        numeric price
        text description
        jsonb features
        int duration_days
        int poi_limit
        jsonb allowed_langs
    }

    owner_subscriptions {
        int id PK
        int owner_id FK
        int package_id FK
        timestamp start_date
        timestamp end_date
        string status
    }

    listen_history {
        int id PK
        int user_id FK
        int restaurant_id FK
        string lang
        timestamp listened_at
    }

    guest_sessions {
        string guest_id PK
        timestamp last_active
    }

    users ||--o{ restaurants : "owns"
    users ||--o{ owner_subscriptions : "holds"
    subscription_packages ||--o{ owner_subscriptions : "defines"
    users ||--o{ listen_history : "records"
    restaurants ||--o{ listen_history : "records"
```

> Lưu ý: `partners` và `interaction_logs` được tạo bởi `init_pois.sql` nhưng không phải là phần chính của luồng ứng dụng hiện tại.
