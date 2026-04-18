FROM node:20-alpine

WORKDIR /app

# Copy các file quản lý thư viện
COPY package*.json ./

# Cài đặt thư viện
RUN npm install

# Copy toàn bộ code
COPY . .

# Mở port cho Vite
EXPOSE 5173

# Chạy Vite với flag --host để cho phép truy cập từ bên ngoài container
CMD ["npm", "run", "dev", "--", "--host"]