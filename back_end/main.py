from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
from psycopg2.extras import RealDictCursor
import requests
import jwt
from datetime import datetime, timedelta
from passlib.context import CryptContext
import json
import os
import base64
from typing import Optional
import hashlib
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# CẤU HÌNH HỆ THỐNG
# ==========================================
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") # Hãy giữ bí mật API Key này
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
VOICE_ID = "pNInz6obpgDQGcFmaJgB"

DB_CONFIG = {
    "dbname": "vinhkhanh_db",
    "user": "admin",
    "password": os.getenv("DB_PASSWORD"),
    "host": os.getenv("DB_HOST", "db"), # Mặc định là 'db' nếu chạy trong Docker
    # "host": "localhost"
    "port": "5432"
}

SECRET_KEY = "khoa_bi_mat_sieu_cap_cua_ban_khong_ai_biet"
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ==========================================
# MODELS (Cấu trúc dữ liệu)
# ==========================================
class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str
    role: str = 'user'

class AdminUserRequest(BaseModel):
    username: str
    password: str = ""
    role: str
class OwnerUpdate(BaseModel):
    username: str
    password: Optional[str] = None
    package_id: Optional[int] = None

class AudioRequest(BaseModel):
    text: str

class TranslateRequest(BaseModel):
    text: str
    target_languages: list[str]

class RestaurantData(BaseModel):
    name: str
    specialty_dish: str
    image_url: str
    description: str
    description_en: str = ""
    description_ko: str = ""
    description_zh: str = ""
    description_ja: str = ""
    description_fr: str = ""
    description_de: str = ""
    description_es: str = ""
    description_th: str = ""
    description_ru: str = ""
    description_ar: str = ""
    description_it: str = ""
    description_pt: str = ""
    description_hi: str = ""
    description_id: str = ""
    lat: float  # Bắt buộc có Vĩ độ
    lng: float  # Bắt buộc có Kinh độ
    audio_vi: str = ""
    audio_en: str = ""
    audio_ko: str = ""
    audio_zh: str = ""
    audio_ja: str = ""
    audio_fr: str = ""
    audio_de: str = ""
    audio_es: str = ""
    audio_th: str = ""
    audio_ru: str = ""
    audio_ar: str = ""
    audio_it: str = ""
    audio_pt: str = ""
    audio_hi: str = ""
    audio_pt: str = ""
    audio_hi: str = ""
    audio_id: str = ""
    owner_id: int = None



class PackageRequest(BaseModel):
    name: str
    price: float
    description: str
    features: list
    duration_days: int

class SubscribeRequest(BaseModel):
    owner_id: int
    package_id: int

class HistoryRequest(BaseModel):
    user_id: int
    restaurant_id: int
    lang: str = "vi"

class SettingsRequest(BaseModel):
    settings: dict

class OwnerCreate(BaseModel):
    username: str
    password: str
    package_id: int
    role: str = "owner"
# ==========================================
# 1. API QUẢN LÝ TÀI KHOẢN (AUTH)
# ==========================================
@app.post("/api/register")
def register_user(req: RegisterRequest):
    try:

        # Thêm 2 dòng này để theo dõi:
        print(f"🔥 MẬT KHẨU NHẬN ĐƯỢC: {req.password}")
        print(f"🔥 ĐỘ DÀI: {len(req.password)} ký tự")
        
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        cursor.execute("SELECT id FROM users WHERE username = %s", (req.username,))
        if cursor.fetchone():
            return {"error": "Tên đăng nhập đã tồn tại!"}
            
        # Fix lỗi 72 bytes của bcrypt
        safe_password = req.password[:70] 
        hashed_password = pwd_context.hash(safe_password)
        
        cursor.execute(
            "INSERT INTO users (username, password_hash, role) VALUES (%s, %s, %s)",
            (req.username, hashed_password, req.role)
        )
        conn.commit()
        cursor.close()
        conn.close()
        
        return {"message": "Đăng ký thành công!"}
    except Exception as e:
        print(f"❌ LỖI ĐĂNG KÝ: {str(e)}")
        return {"error": str(e)}

@app.post("/api/login")
def login_user(req: LoginRequest):
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT u.id, u.username, u.password_hash, u.role, u.settings, 
                   COALESCE(p.poi_limit, 1) as poi_limit, 
                   COALESCE(p.allowed_langs, '["vi","en","zh","ko","ja"]'::jsonb) as allowed_langs,
                   os.package_id  -- ✨ THÊM DÒNG NÀY VÀO SQL
            FROM users u
            LEFT JOIN LATERAL (
                SELECT package_id FROM owner_subscriptions WHERE owner_id = u.id AND status = 'active' ORDER BY start_date DESC LIMIT 1
            ) os ON true
            LEFT JOIN subscription_packages p ON p.id = os.package_id
            WHERE u.username = %s
        """, (req.username,))
        user = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not user or not pwd_context.verify(req.password[:70], user['password_hash']):
            return {"error": "Sai tài khoản hoặc mật khẩu!"}
            
        expire = datetime.utcnow() + timedelta(hours=24)
        payload = {"sub": user['username'], "role": user['role'], "exp": expire}
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        
        return {
            "message": "Đăng nhập thành công!", 
            "token": token, 
            "role": user['role'], 
            "username": user['username'], 
            "id": user['id'], 
            "settings": user.get('settings', {}), 
            "poi_limit": user.get("poi_limit", 1), 
            "allowed_langs": user.get("allowed_langs", ["vi","en","zh","ko","ja"]),
            "package_id": user.get("package_id")  
        }
    except Exception as e:
        return {"error": str(e)}
        return {"error": str(e)}

@app.get("/api/users")
def get_users():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            SELECT u.id, u.username, u.role, u.settings, p.name as package_name,os.package_id, p.features as package_features, p.poi_limit, p.allowed_langs
            FROM users u
            LEFT JOIN LATERAL (
                SELECT package_id 
                FROM owner_subscriptions 
                WHERE owner_id = u.id AND status = 'active'
                ORDER BY start_date DESC 
                LIMIT 1
            ) os ON true
            LEFT JOIN subscription_packages p ON p.id = os.package_id
            ORDER BY u.id ASC
        """)
        users_list = cursor.fetchall()
        cursor.close()
        conn.close()
        return users_list
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/users")
def create_user(req: AdminUserRequest):
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE username = %s", (req.username,))
        if cursor.fetchone():
            return {"error": "Tên đăng nhập đã tồn tại!"}
            
        safe_password = (req.password[:70]) if req.password else "123456"
        hashed_password = pwd_context.hash(safe_password)
        
        cursor.execute(
            "INSERT INTO users (username, password_hash, role) VALUES (%s, %s, %s)",
            (req.username, hashed_password, req.role)
        )
        conn.commit()
        cursor.close()
        conn.close()
        return {"message": "Tạo user thành công!"}
    except Exception as e:
        return {"error": str(e)}

@app.put("/api/users/{user_id}")
def update_user(user_id: int, req: AdminUserRequest):
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        cursor.execute("SELECT id FROM users WHERE username = %s AND id != %s", (req.username, user_id))
        if cursor.fetchone():
            return {"error": "Tên đăng nhập đã tồn tại ở tài khoản khác!"}

        if req.password:
            safe_password = req.password[:70] 
            hashed_password = pwd_context.hash(safe_password)
            cursor.execute(
                "UPDATE users SET username = %s, password_hash = %s, role = %s WHERE id = %s",
                (req.username, hashed_password, req.role, user_id)
            )
        else:
            cursor.execute(
                "UPDATE users SET username = %s, role = %s WHERE id = %s",
                (req.username, req.role, user_id)
            )
            
        conn.commit()
        cursor.close()
        conn.close()
        return {"message": "Cập nhật user thành công!"}
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/admin/owners")
def create_owner(data: OwnerCreate):
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()

        # 1. Sử dụng Bcrypt đồng bộ với hàm Login và Update [cite: 2, 28]
        # Cắt chuỗi 70 ký tự để đảm bảo an toàn cho Bcrypt [cite: 7, 17, 28]
        safe_password = data.password[:70] 
        hashed_password = pwd_context.hash(safe_password)

        # 2. Chèn vào bảng users [cite: 23]
        cursor.execute("""
            INSERT INTO users (username, password_hash, role) 
            VALUES (%s, %s, %s) RETURNING id
        """, (data.username, hashed_password, data.role))
        
        new_owner_id = cursor.fetchone()[0]

        # 3. Kích hoạt gói đăng ký cho Owner này [cite: 23]
        cursor.execute("""
            INSERT INTO owner_subscriptions (owner_id, package_id, status, start_date) 
            VALUES (%s, %s, 'active', CURRENT_TIMESTAMP)
        """, (new_owner_id, data.package_id))

        conn.commit()
        cursor.close()
        conn.close()
        return {"message": "Tạo chủ quán thành công", "id": new_owner_id}
    except Exception as e:
        print(f"❌ LỖI TẠO OWNER: {str(e)}")
        return {"error": str(e)}

@app.put("/api/admin/owners/{owner_id}")
def update_owner(owner_id: int, data: OwnerUpdate):
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()

        # 1. Cập nhật Username [cite: 22]
        cursor.execute("""
            UPDATE users SET username = %s WHERE id = %s
        """, (data.username, owner_id))

        # 2. Xử lý Gói cước (Package) [cite: 22, 23]
        if data.package_id:
            cursor.execute("SELECT id FROM owner_subscriptions WHERE owner_id = %s AND status = 'active'", (owner_id,))
            sub_exists = cursor.fetchone()
            
            if sub_exists:
                cursor.execute("""
                    UPDATE owner_subscriptions SET package_id = %s 
                    WHERE owner_id = %s AND status = 'active'
                """, (data.package_id, owner_id))
            else:
                cursor.execute("""
                    INSERT INTO owner_subscriptions (owner_id, package_id, status) 
                    VALUES (%s, %s, 'active')
                """, (owner_id, data.package_id))

        # 3. Cập nhật Mật khẩu bằng Bcrypt (Phần đã sửa) [cite: 2, 25, 26]
        if data.password and data.password.strip() != "":
            # Cắt chuỗi 70 ký tự để tránh giới hạn 72 bytes của bcrypt [cite: 7, 19]
            safe_password = data.password[:70] 
            hashed_password = pwd_context.hash(safe_password)
            
            cursor.execute("UPDATE users SET password_hash = %s WHERE id = %s", (hashed_password, owner_id))

        conn.commit()
        cursor.close()
        conn.close()
        return {"message": "Cập nhật thành công"}

    except Exception as e:
        print(f"Lỗi Backend: {str(e)}")
        return {"error": str(e)}

@app.delete("/api/users/{user_id}")
def delete_user(user_id: int):
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
        conn.commit()
        cursor.close()
        conn.close()
        return {"message": "Xóa user thành công!"}
    except Exception as e:
        return {"error": str(e)}

# ==========================================
# 2. API QUẢN LÝ QUÁN ĂN (CRUD)
# ==========================================
@app.get("/api/nearby")
def get_nearby_restaurants():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        # Bổ sung lấy 5 cột audio và bóc tách tọa độ bản đồ
        cursor.execute("""
            SELECT id, owner_id, name, description, specialty_dish, image_url, 
                   description_en, description_ko, description_zh, description_ja, description_fr, description_de, description_es, description_th, description_ru, description_ar, description_it, description_pt, description_hi, description_id,
                   audio_vi, audio_en, audio_ko, audio_zh, audio_ja, audio_fr, audio_de, audio_es, audio_th, audio_ru, audio_ar, audio_it, audio_pt, audio_hi, audio_id,
                   ST_X(location) as lng, ST_Y(location) as lat
            FROM restaurants;
        """)
        restaurants = cursor.fetchall()
        cursor.close()
        conn.close()
        return restaurants
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/restaurants")
def add_restaurant(req: RestaurantData):
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Lấy giới hạn POI của Owner (nếu có owner_id)
        if req.owner_id:
            cursor.execute("""
                SELECT p.poi_limit 
                FROM owner_subscriptions os
                JOIN subscription_packages p ON p.id = os.package_id
                WHERE os.owner_id = %s AND os.status = 'active'
                ORDER BY os.start_date DESC LIMIT 1
            """, (req.owner_id,))
            limit_row = cursor.fetchone()
            poi_limit = limit_row['poi_limit'] if limit_row and hasattr(limit_row, 'keys') else (limit_row[0] if limit_row else 1) # Support both dict vs tuple cursor 
            # In our setup, cursor isn't dict everywhere. Let's do a fast distinct check.
            # wait, the cursor setup for add_restaurant is `cursor = conn.cursor()`, so it is a tuple.
            poi_limit = limit_row[0] if limit_row else 1
            
            cursor.execute("SELECT COUNT(*) FROM restaurants WHERE owner_id = %s", (req.owner_id,))
            current_count = cursor.fetchone()[0]
            if current_count >= poi_limit:
                 return {"error": f"Chủ quán đã đạt giới hạn mở ({poi_limit} quán)!"}

        # Kiểm tra trùng lặp tên quán ăn
        cursor.execute("SELECT id FROM restaurants WHERE name = %s", (req.name,))
        if cursor.fetchone():
            return {"error": "Quán ăn này đã tồn tại trên bản đồ!"}
            
        cursor.execute("""
            INSERT INTO restaurants 
            (name, specialty_dish, image_url, description, description_en, description_ko, description_zh, description_ja, description_fr, description_de, description_es, description_th, description_ru, description_ar, description_it, description_pt, description_hi, description_id,
             audio_vi, audio_en, audio_ko, audio_zh, audio_ja, audio_fr, audio_de, audio_es, audio_th, audio_ru, audio_ar, audio_it, audio_pt, audio_hi, audio_id, owner_id, location) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326))
        """, (req.name, req.specialty_dish, req.image_url, req.description, req.description_en, req.description_ko, req.description_zh, req.description_ja, req.description_fr, req.description_de, req.description_es, req.description_th, req.description_ru, req.description_ar, req.description_it, req.description_pt, req.description_hi, req.description_id,
              req.audio_vi, req.audio_en, req.audio_ko, req.audio_zh, req.audio_ja, req.audio_fr, req.audio_de, req.audio_es, req.audio_th, req.audio_ru, req.audio_ar, req.audio_it, req.audio_pt, req.audio_hi, req.audio_id, req.owner_id, req.lng, req.lat))
        conn.commit()
        cursor.close()
        conn.close()
        return {"message": "Đã thêm quán ăn thành công!"}
    except Exception as e:
        return {"error": str(e)}

@app.put("/api/restaurants/{rest_id}")
def update_restaurant(rest_id: int, req: RestaurantData):
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        # --- THÊM MỚI: KIỂM TRA LIMIT NẾU ĐỔI CHỦ QUÁN ---
        if req.owner_id:
            cursor.execute("SELECT owner_id FROM restaurants WHERE id = %s", (rest_id,))
            old_owner_id_row = cursor.fetchone()
            old_owner_id = old_owner_id_row[0] if old_owner_id_row else None

            # Nếu Admin đổi quán này sang một chủ quán khác, phải check limit của người đó
            if req.owner_id != old_owner_id:
                cursor.execute("""
                    SELECT p.poi_limit 
                    FROM owner_subscriptions os
                    JOIN subscription_packages p ON p.id = os.package_id
                    WHERE os.owner_id = %s AND os.status = 'active'
                    ORDER BY os.start_date DESC LIMIT 1
                """, (req.owner_id,))
                limit_row = cursor.fetchone()
                poi_limit = limit_row[0] if limit_row else 1
                
                cursor.execute("SELECT COUNT(*) FROM restaurants WHERE owner_id = %s", (req.owner_id,))
                current_count = cursor.fetchone()[0]
                if current_count >= poi_limit:
                    return {"error": f"Không thể gán! Chủ quán này đã đạt giới hạn ({poi_limit} quán)."}
        # Kiểm tra trùng lặp tên quán ăn với các quán khác
        cursor.execute("SELECT id FROM restaurants WHERE name = %s AND id != %s", (req.name, rest_id))
        if cursor.fetchone():
             return {"error": "Tên quán ăn này bị trùng với một quán khác đã có trên bản đồ!"}
             
        cursor.execute("""
            UPDATE restaurants 
            SET name=%s, specialty_dish=%s, image_url=%s, description=%s, 
                description_en=%s, description_ko=%s, description_zh=%s, description_ja=%s, description_fr=%s, description_de=%s, description_es=%s, description_th=%s, description_ru=%s, description_ar=%s, description_it=%s, description_pt=%s, description_hi=%s, description_id=%s,
                audio_vi=%s, audio_en=%s, audio_ko=%s, audio_zh=%s, audio_ja=%s, audio_fr=%s, audio_de=%s, audio_es=%s, audio_th=%s, audio_ru=%s, audio_ar=%s, audio_it=%s, audio_pt=%s, audio_hi=%s, audio_id=%s, owner_id=%s,
                location=ST_SetSRID(ST_MakePoint(%s, %s), 4326)
            WHERE id=%s
        """, (req.name, req.specialty_dish, req.image_url, req.description, req.description_en, req.description_ko, req.description_zh, req.description_ja, req.description_fr, req.description_de, req.description_es, req.description_th, req.description_ru, req.description_ar, req.description_it, req.description_pt, req.description_hi, req.description_id,
              req.audio_vi, req.audio_en, req.audio_ko, req.audio_zh, req.audio_ja, req.audio_fr, req.audio_de, req.audio_es, req.audio_th, req.audio_ru, req.audio_ar, req.audio_it, req.audio_pt, req.audio_hi, req.audio_id, req.owner_id, req.lng, req.lat, rest_id))
        conn.commit()
        cursor.close()
        conn.close()
        return {"message": "Đã cập nhật quán ăn thành công!"}
    except Exception as e:
        return {"error": str(e)}

@app.delete("/api/restaurants/{rest_id}")
def delete_restaurant(rest_id: int):
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM restaurants WHERE id = %s", (rest_id,))
        conn.commit()
        cursor.close()
        conn.close()
        return {"message": "Đã xóa quán ăn khỏi hệ thống!"}
    except Exception as e:
        return {"error": str(e)}



# ==========================================
# 3. API PHÂN QUYỀN VÀ TÍNH NĂNG MỚI (Packages & Subscriptions)
# ==========================================
@app.get("/api/admin/packages")
def get_packages():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SELECT * FROM subscription_packages ORDER BY id ASC")
        data = cursor.fetchall()
        cursor.close()
        conn.close()
        return data
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/admin/packages")
def create_package(req: PackageRequest):
    try:
        from psycopg2.extras import Json
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("INSERT INTO subscription_packages (name, price, description, features, duration_days) VALUES (%s, %s, %s, %s, %s)",
            (req.name, req.price, req.description, Json(req.features), req.duration_days))
        conn.commit()
        cursor.close()
        conn.close()
        return {"message": "Tạo gói thành công!"}
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/owner/subscribe")
def subscribe_package(req: SubscribeRequest):
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("INSERT INTO owner_subscriptions (owner_id, package_id) VALUES (%s, %s)", (req.owner_id, req.package_id))
        conn.commit()
        cursor.close()
        conn.close()
        return {"message": "Đăng ký gói thành công!"}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/owner/my_restaurants/{owner_id}")
def get_owner_restaurants(owner_id: int):
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            SELECT id, owner_id, name, description, specialty_dish, image_url, 
                   description_en, description_ko, description_zh, description_ja, description_fr, description_de, description_es, description_th, description_ru, description_ar, description_it, description_pt, description_hi, description_id,
                   audio_vi, audio_en, audio_ko, audio_zh, audio_ja, audio_fr, audio_de, audio_es, audio_th, audio_ru, audio_ar, audio_it, audio_pt, audio_hi, audio_id,
                   ST_X(location) as lng, ST_Y(location) as lat
            FROM restaurants WHERE owner_id = %s;
        """, (owner_id,))
        restaurants = cursor.fetchall()
        cursor.close()
        conn.close()
        return restaurants
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/user/history")
def add_listen_history(req: HistoryRequest):
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("INSERT INTO listen_history (user_id, restaurant_id, lang) VALUES (%s, %s, %s)", (req.user_id, req.restaurant_id, req.lang))
        conn.commit()
        cursor.close()
        conn.close()
        return {"message": "Đã lưu lịch sử nghe!"}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/user/history/{user_id}")
def get_listen_history(user_id: int):
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            SELECT h.id, h.listened_at, h.lang, r.name as restaurant_name 
            FROM listen_history h
            LEFT JOIN restaurants r ON h.restaurant_id = r.id
            WHERE h.user_id = %s
            ORDER BY h.listened_at DESC LIMIT 50;
        """, (user_id,))
        history = cursor.fetchall()
        cursor.close()
        conn.close()
        return history
    except Exception as e:
        return {"error": str(e)}

@app.put("/api/user/settings/{user_id}")
def update_user_settings(user_id: int, req: SettingsRequest):
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        from psycopg2.extras import Json
        cursor.execute("UPDATE users SET settings = %s WHERE id = %s", (Json(req.settings), user_id))
        conn.commit()
        cursor.close()
        conn.close()
        return {"message": "Cập nhật cấu hình thành công!"}
    except Exception as e:
        return {"error": str(e)}

# ==========================================
# 4. API AI VÀ THỐNG KÊ (HỖ TRỢ ADMIN)
# ==========================================
@app.get("/api/stats")
def get_system_stats():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'user'")
        total_users = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM restaurants")
        total_rests = cursor.fetchone()[0]
        total_visits = total_users * 12 + 154 
        cursor.close()
        conn.close()
        return {"total_users": total_users, "total_restaurants": total_rests, "total_visits": total_visits}
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/translate")
def translate_text(req: TranslateRequest):
    # Kiểm tra API Key trước khi chạy
    if not GEMINI_API_KEY:
        return {"error": "Chưa cấu hình GEMINI_API_KEY trong file .env"}
        
    try:
        # Sử dụng f-string để găm API Key từ biến môi trường vào URL
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
        headers = {'Content-Type': 'application/json'}
        
        langs_str = ", ".join(f'"{lang}": "..."' for lang in req.target_languages)
        prompt = f"""Dịch đoạn văn sau sang các ngôn ngữ: {", ".join(req.target_languages)}. 
        Trả về kết quả DẠNG JSON CHUẨN (không có markdown, không có code block):
        {{{langs_str}}}
        Văn bản gốc: {req.text}"""
        
        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        
        response = requests.post(url, headers=headers, json=payload)
        data = response.json()
        
        if 'error' in data:
            return {"error": data['error'].get('message', 'Lỗi không xác định từ Google API')}
            
        raw_text = data['candidates'][0]['content']['parts'][0]['text']
        raw_json = raw_text.replace("```json", "").replace("```", "").strip()
        
        return json.loads(raw_json)
    except Exception as e:
        return {"error": f"Lỗi dịch thuật: {str(e)}"}
    
@app.post("/api/tts")
def generate_audio(request_data: dict):
    text = request_data.get("text")
    if not text:
        return {"error": "Thiếu văn bản đầu vào"}

    if not ELEVENLABS_API_KEY:
        return {"error": "Chưa cấu hình ELEVENLABS_API_KEY trong file .env"}

    # Đường dẫn gọi API của ElevenLabs
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"

    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY
    }

    # Cấu hình dữ liệu gửi đi
    data = {
        "text": text,
        # BẮT BUỘC dùng model v2 này vì đồ án của bạn có 5 ngôn ngữ (Việt, Anh, Trung, Nhật, Hàn)
        "model_id": "eleven_multilingual_v2", 
        "voice_settings": {
            "stability": 0.5,        # 0.0 - 1.0: Độ ổn định của giọng (thấp = cảm xúc hơn)
            "similarity_boost": 0.75 # 0.0 - 1.0: Độ bám sát giọng gốc
        }
    }

    try:
        # Bắn request sang ElevenLabs
        response = requests.post(url, json=data, headers=headers)

        # Kiểm tra nếu bị lỗi (hết quota, sai key...)
        if response.status_code != 200:
            return {"error": f"Lỗi từ ElevenLabs: {response.text}"}

        # ElevenLabs trả về file âm thanh (dạng byte). 
        # Ta biến nó thành Base64 để gửi về cho React phát luôn!
        audio_base64 = base64.b64encode(response.content).decode("utf-8")
        
        return {"audio_base64": audio_base64}

    except Exception as e:
        return {"error": str(e)}