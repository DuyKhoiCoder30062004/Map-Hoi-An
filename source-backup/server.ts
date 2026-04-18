import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs/promises";

const JWT_SECRET = process.env.JWT_SECRET || "vinhkhanh-secret-key";
const DB_FILE = "./database.json";

interface DbSchema {
  users: any[];
  restaurants: any[];
  requests: any[];
  plans: any[];
}

const DEFAULT_PLANS = [
  { id: "basic", name: "Gói Cơ Bản", max_pois: 1, max_langs: 2, price: "Miễn phí" },
  { id: "pro", name: "Gói Chuyên Nghiệp", max_pois: 5, max_langs: 5, price: "500.000đ/tháng" },
  { id: "enterprise", name: "Gói Doanh Nghiệp", max_pois: 20, max_langs: 5, price: "2.000.000đ/tháng" }
];

async function getDb(): Promise<DbSchema> {
  try {
    const data = await fs.readFile(DB_FILE, "utf-8");
    const db = JSON.parse(data);
    if (!db.requests) db.requests = [];
    if (!db.restaurants) db.restaurants = [];
    if (!db.users) db.users = [];
    if (!db.plans) db.plans = DEFAULT_PLANS;
    return db;
  } catch (error) {
    const initialDb = { users: [], restaurants: [], requests: [], plans: DEFAULT_PLANS };
    await fs.writeFile(DB_FILE, JSON.stringify(initialDb, null, 2));
    return initialDb;
  }
}

async function saveDb(db: DbSchema) {
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // Seed admin user if not exists
  const db = await getDb();
  const adminExists = db.users.find(u => u.username === 'admin');
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    db.users.push({
      id: Date.now(),
      username: "admin",
      password: hashedPassword,
      role: "admin"
    });
    await saveDb(db);
  }

  // Middleware xác thực
  const authenticate = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // API Routes
  app.post("/api/register", async (req, res) => {
    const { username, password, role, plan_id } = req.body;
    const db = await getDb();
    if (db.users.find(u => u.username === username)) {
      return res.status(400).json({ error: "Tên đăng nhập đã tồn tại!" });
    }
    try {
      const safePassword = password.substring(0, 70);
      const hashedPassword = await bcrypt.hash(safePassword, 10);
      db.users.push({
        id: Date.now(),
        username,
        password: hashedPassword,
        role: role || "app",
        plan_id: plan_id || "basic"
      });
      await saveDb(db);
      res.json({ message: "Đăng ký thành công!" });
    } catch (error) {
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    const db = await getDb();
    const user = db.users.find(u => u.username === username);
    const safePassword = password.substring(0, 70);
    if (user && await bcrypt.compare(safePassword, user.password)) {
      const plan = db.plans.find(p => p.id === (user.plan_id || "basic"));
      const token = jwt.sign({ id: user.id, username: user.username, role: user.role, plan_id: user.plan_id || "basic" }, JWT_SECRET);
      res.json({ 
        message: "Đăng nhập thành công!", 
        id: user.id, 
        username: user.username, 
        role: user.role, 
        token,
        plan: plan || DEFAULT_PLANS[0]
      });
    } else {
      res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu!" });
    }
  });

  app.get("/api/nearby", async (req, res) => {
    const db = await getDb();
    const { ownerId } = req.query;
    if (ownerId) {
      return res.json(db.restaurants.filter(r => r.owner_id === parseInt(ownerId as string)));
    }
    res.json(db.restaurants);
  });

  app.get("/api/stats", async (req, res) => {
    const db = await getDb();
    const total_users = db.users.filter(u => u.role === 'app').length;
    const total_restaurants = db.restaurants.length;
    const total_visits = total_users * 12 + 154;
    const pending_requests = db.requests.filter(r => r.status === 'pending').length;
    res.json({
      total_users,
      total_restaurants,
      total_visits,
      pending_requests
    });
  });

  app.get("/api/users", async (req, res) => {
    const db = await getDb();
    const users = db.users.map(u => ({ 
      id: u.id, 
      username: u.username, 
      role: u.role, 
      plan_id: u.plan_id || "basic" 
    }));
    res.json(users);
  });

  app.post("/api/users", async (req, res) => {
    const { username, password, role, plan_id } = req.body;
    const db = await getDb();
    if (db.users.find(u => u.username === username)) {
      return res.status(400).json({ error: "Tên đăng nhập đã tồn tại!" });
    }
    const safePassword = password.substring(0, 70);
    const hashedPassword = await bcrypt.hash(safePassword, 10);
    db.users.push({
      id: Date.now(),
      username,
      password: hashedPassword,
      role,
      plan_id: plan_id || "basic"
    });
    await saveDb(db);
    res.json({ message: "User created successfully" });
  });

  app.put("/api/users/:id", async (req, res) => {
    const { id } = req.params;
    const { username, password, role, plan_id } = req.body;
    const db = await getDb();
    const userIndex = db.users.findIndex(u => u.id === parseInt(id));
    if (userIndex !== -1) {
      db.users[userIndex].username = username;
      db.users[userIndex].role = role;
      db.users[userIndex].plan_id = plan_id || db.users[userIndex].plan_id || "basic";
      if (password) {
        const safePassword = password.substring(0, 70);
        db.users[userIndex].password = await bcrypt.hash(safePassword, 10);
      }
      await saveDb(db);
      res.json({ message: "User updated successfully" });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    const { id } = req.params;
    const db = await getDb();
    db.users = db.users.filter(u => u.id !== parseInt(id));
    await saveDb(db);
    res.json({ message: "User deleted successfully" });
  });

  app.post("/api/restaurants", authenticate, async (req: any, res) => {
    const r = req.body;
    const db = await getDb();
    db.restaurants.push({
      ...r,
      id: Date.now(),
      owner_id: req.user.role === 'admin' ? (r.owner_id || req.user.id) : req.user.id
    });
    await saveDb(db);
    res.json({ message: "Restaurant added successfully" });
  });

  app.put("/api/restaurants/:id", authenticate, async (req: any, res) => {
    const { id } = req.params;
    const r = req.body;
    const db = await getDb();
    const index = db.restaurants.findIndex(rest => rest.id === parseInt(id));
    if (index !== -1) {
      // Kiểm tra quyền sở hữu
      if (req.user.role !== 'admin' && db.restaurants[index].owner_id !== req.user.id) {
        return res.status(403).json({ error: "Bạn không có quyền sửa quán này!" });
      }
      db.restaurants[index] = { 
        ...r, 
        id: parseInt(id),
        owner_id: db.restaurants[index].owner_id // Giữ nguyên chủ sở hữu
      };
      await saveDb(db);
      res.json({ message: "Restaurant updated successfully" });
    } else {
      res.status(404).json({ error: "Restaurant not found" });
    }
  });

  // --- API REQUESTS (CHỜ DUYỆT) ---
  app.get("/api/requests", authenticate, async (req: any, res) => {
    const db = await getDb();
    if (req.user.role === 'admin') {
      res.json(db.requests);
    } else {
      res.json(db.requests.filter(r => r.owner_id === req.user.id));
    }
  });

  app.get("/api/plans", async (req, res) => {
    const db = await getDb();
    res.json(db.plans);
  });

  app.post("/api/requests", authenticate, async (req: any, res) => {
    const db = await getDb();
    
    // Kiểm tra giới hạn gói dịch vụ
    const user = db.users.find(u => u.id === req.user.id);
    const plan = db.plans.find(p => p.id === (user?.plan_id || "basic"));
    const myPois = db.restaurants.filter(r => r.owner_id === req.user.id);
    const myPendingRequests = db.requests.filter(r => r.owner_id === req.user.id && r.status === 'pending');
    
    // Nếu là tạo mới (không có restaurant_id), kiểm tra giới hạn
    if (!req.body.restaurant_id && myPois.length + myPendingRequests.length >= plan.max_pois) {
      return res.status(403).json({ error: `Gói ${plan.name} của bạn chỉ cho phép tối đa ${plan.max_pois} quán ăn!` });
    }

    const request = {
      ...req.body,
      id: Date.now(),
      owner_id: req.user.id,
      owner_name: req.user.username,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    db.requests.push(request);
    await saveDb(db);
    res.json({ message: "Yêu cầu đã được gửi và đang chờ duyệt!" });
  });

  app.post("/api/requests/:id/approve", authenticate, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const { id } = req.params;
    const db = await getDb();
    const reqIndex = db.requests.findIndex(r => r.id === parseInt(id));
    if (reqIndex === -1) return res.status(404).json({ error: "Request not found" });

    const requestData = db.requests[reqIndex];
    
    // Tìm xem quán này đã tồn tại chưa (để cập nhật) hoặc tạo mới
    let restIndex = -1;
    if (requestData.restaurant_id) {
      restIndex = db.restaurants.findIndex(r => r.id === requestData.restaurant_id);
    }
    
    const restaurantData = {
      name: requestData.name,
      specialty_dish: requestData.specialty_dish,
      image_url: requestData.image_url,
      description: requestData.description,
      description_en: requestData.description_en,
      description_ko: requestData.description_ko,
      description_zh: requestData.description_zh,
      description_ja: requestData.description_ja,
      audio_vi: requestData.audio_vi,
      audio_en: requestData.audio_en,
      audio_ko: requestData.audio_ko,
      audio_zh: requestData.audio_zh,
      audio_ja: requestData.audio_ja,
      lat: requestData.lat,
      lng: requestData.lng,
      owner_id: requestData.owner_id
    };

    if (restIndex !== -1) {
      db.restaurants[restIndex] = { ...restaurantData, id: db.restaurants[restIndex].id };
    } else {
      db.restaurants.push({ ...restaurantData, id: Date.now() });
    }

    db.requests[reqIndex].status = 'approved';
    await saveDb(db);
    res.json({ message: "Đã duyệt yêu cầu thành công!" });
  });

  app.post("/api/requests/:id/reject", authenticate, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const { id } = req.params;
    const db = await getDb();
    const reqIndex = db.requests.findIndex(r => r.id === parseInt(id));
    if (reqIndex !== -1) {
      db.requests[reqIndex].status = 'rejected';
      await saveDb(db);
      res.json({ message: "Đã từ chối yêu cầu." });
    } else {
      res.status(404).json({ error: "Request not found" });
    }
  });

  // Start listening immediately
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });

  // Vite middleware for development (Lazy loaded)
  if (process.env.NODE_ENV !== "production") {
    console.log("Initializing Vite middleware...");
    const startTime = Date.now();
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log(`Vite initialized in ${Date.now() - startTime}ms`);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

startServer();

