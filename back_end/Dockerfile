# Sử dụng Python bản nhẹ
FROM python:3.10-slim

# Thiết lập thư mục làm việc
WORKDIR /app

# Cài đặt các thư viện hệ thống cần cho psycopg2 (kết nối Postgres)
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy file requirements và cài đặt dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy toàn bộ mã nguồn vào container
COPY . .

# Chạy server FastAPI (Lưu ý: --host 0.0.0.0 là bắt buộc để Docker nhận diện)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]