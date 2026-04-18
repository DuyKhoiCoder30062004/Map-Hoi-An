import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// 1. Configure Python Backend URL
axios.defaults.baseURL = "http://localhost:8000";

// Fix Leaflet default icon issue in Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import "./App.css";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// --- MAP ICON CONFIGURATION ---
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const LANGUAGES = [
  { code: "vi", name: "Tiếng Việt", flag: "🇻🇳", dbCol: "description" },
  { code: "en", name: "English", flag: "🇺🇸", dbCol: "description_en" },
  { code: "zh", name: "Chinese", flag: "🇨🇳", dbCol: "description_zh" },
  { code: "ko", name: "Korean", flag: "🇰🇷", dbCol: "description_ko" },
  { code: "ja", name: "Japanese", flag: "🇯🇵", dbCol: "description_ja" },
];

interface Restaurant {
  id: number;
  name: string;
  specialty_dish: string;
  image_url: string;
  description: string;
  description_en: string;
  description_ko: string;
  description_zh: string;
  description_ja: string;
  audio_vi: string;
  audio_en: string;
  audio_ko: string;
  audio_zh: string;
  audio_ja: string;
  lat: number;
  lng: number;
}

interface User {
  username: string;
  role: string;
  token: string;
}

function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, 16); }, [center, map]);
  return null;
}

export default function App() {
  // --- AUTH STATE ---
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState("login");
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");

  // --- APP STATE ---
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([10.7612, 106.7055]);
  const [language, setLanguage] = useState("vi");
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [stats, setStats] = useState({ total_users: 0, total_restaurants: 0, total_visits: 0 });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newRest, setNewRest] = useState<Partial<Restaurant>>({
    name: "", specialty_dish: "", image_url: "", 
    description: "", description_en: "", description_ko: "", description_zh: "", description_ja: "",
    audio_vi: "", audio_en: "", audio_ko: "", audio_zh: "", audio_ja: "",
    lat: 10.7612, lng: 106.7055
  });
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  // --- 1. INITIAL LOAD ---
  useEffect(() => {
    const savedUser = localStorage.getItem("vinhkhanh_user");
    if (savedUser) { 
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser); 
      axios.defaults.headers.common['Authorization'] = `Bearer ${parsedUser.token}`;
      if (parsedUser.role === 'admin') setAuthMode('admin');
      else if (parsedUser.role === 'partner') setAuthMode('partner');
      else setAuthMode('app');
    }
  }, []);

  useEffect(() => {
    if (authMode !== "login" && authMode !== "register") {
      fetchRestaurants();
      if (authMode === "admin") fetchStats();
      
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition((pos) => { 
          const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(loc); setMapCenter(loc); 
        });
      }
    }
  }, [authMode]);

  // --- 2. AUTH HANDLERS ---
   const handleGuestLogin = () => {
    const guestUser = { username: "Khách", role: "guest", token: "" };
    setUser(guestUser);
    setAuthMode("app");
  };
  const handleAuth = async (e: React.FormEvent, isLogin: boolean) => {
    e.preventDefault(); setAuthError("");
    const endpoint = isLogin ? "/api/login" : "/api/register";
    try {
      const res = await axios.post(endpoint, { username: usernameInput, password: passwordInput });
      if (res.data.error) setAuthError(res.data.error);
      else {
        if (isLogin) {
          const userData = { ...res.data };
          setUser(userData);
          localStorage.setItem("vinhkhanh_user", JSON.stringify(userData));
          axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
          if (userData.role === 'admin') setAuthMode("admin");
          else if (userData.role === 'partner') setAuthMode("partner");
          else setAuthMode("app");
        } else { 
          alert("Đăng ký thành công!"); setAuthMode("login"); 
        }
      }
    } catch (err) { setAuthError("Lỗi kết nối server."); }
  };

  const handleLogout = () => {
    localStorage.removeItem("vinhkhanh_user");
    setUser(null);
    setAuthMode("login");
    delete axios.defaults.headers.common['Authorization'];
  };

  // --- 3. DATA FETCHING ---
  const fetchRestaurants = async () => { 
    try {
      const res = await axios.get("/api/nearby");
      setRestaurants(res.data);
    } catch(e) { console.error(e); }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get("/api/stats");
      setStats(res.data);
    } catch(e) {}
  };

  // --- 4. AI LOGIC (BACKEND CALLS) ---
  const autoGenerateContent = async () => {
    if (!newRest.description) return alert("Vui lòng nhập mô tả Tiếng Việt!");
     if (!editingId) return alert("Bạn cần lưu quán trước khi tạo nội dung AI!");
    setIsGeneratingAll(true);
    try {
      // 1. Dịch văn bản qua Gemini Backend
      const transRes = await axios.post("/api/translate", { 
  text: newRest.description, 
  rest_id: editingId 
});
      const { en, ko, zh, ja } = transRes.data;
      
      // Cập nhật state text ngay để client thấy
      setNewRest(prev => ({ ...prev, description_en: en, description_ko: ko, description_zh: zh, description_ja: ja }));

      // 2. Tạo Audio qua ElevenLabs Backend (chạy song song cho nhanh)
      const langs = [
        { key: "audio_vi", text: newRest.description },
        { key: "audio_en", text: newRest.description_en },
        { key: "audio_ko", text: newRest.description_ko },
        { key: "audio_zh", text: newRest.description_zh },
        { key: "audio_ja", text: newRest.description_ja }
      ];

      const audioResults: any = {};
      for (const item of langs) {
        const res = await axios.post("/api/tts", { 
  text: item.text, 
  rest_id: editingId,   // or newRest.id if available
  lang: item.key.replace("audio_", "") // "vi", "en", "ko", "zh", "ja"
});
audioResults[item.key] = res.data.audio_base64 || "";      
}

      setNewRest(prev => ({ ...prev, ...audioResults }));
      alert("✅ Hoàn tất xử lý AI từ server!");
    } catch (err) {
      alert("Lỗi khi xử lý AI từ Server.");
    } finally {
      setIsGeneratingAll(false);
    }
  };

  // --- 5. CRUD HANDLERS ---
  const handleSaveRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingId ? axios.put : axios.post;
      const url = editingId ? `/api/restaurants/${editingId}` : "/api/restaurants";
      const res = await method(url, newRest);
      if (res.data.error) alert(res.data.error);
      else {
        alert(res.data.message);
        setEditingId(null);
        setNewRest({ name: "", specialty_dish: "", image_url: "", description: "", lat: 10.7612, lng: 106.7055 });
        fetchRestaurants();
      }
    } catch (err) { alert("Lỗi khi lưu dữ liệu."); }
  };

  const handleDeleteRestaurant = async (id: number, name: string) => {
    if (window.confirm(`Xóa quán "${name}"?`)) { 
      await axios.delete(`/api/restaurants/${id}`); 
      fetchRestaurants();
    }
  };

  // --- 6. AUDIO PLAYBACK ---
  const playAudio = (base64Data: string) => {
    if (!base64Data) return alert("Không có dữ liệu âm thanh!");
    const audio = new Audio(`data:audio/mpeg;base64,${base64Data}`);
    audio.play();
  };

  // --- UI RENDERING ---
  if (authMode === "login" || authMode === "register") {
    const isLogin = authMode === "login";
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>{isLogin ? "🔐 Đăng Nhập" : "📝 Đăng Ký"}</h2>
          {authError && <p className="error">{authError}</p>}
          <form onSubmit={(e) => handleAuth(e, isLogin)}>
            <input placeholder="Tài khoản" value={usernameInput} onChange={e => setUsernameInput(e.target.value)} required />
            <input type="password" placeholder="Mật khẩu" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} required />
            <button type="submit">{isLogin ? "Đăng Nhập" : "Đăng Ký"}</button>
            <button type="button" className="guest-btn" onClick={handleGuestLogin} style={{ marginTop: "0.5rem", background: "#64748b" }}>
              Tiếp tục với tư cách Khách 👤
            </button> 
          </form>
          <p onClick={() => setAuthMode(isLogin ? "register" : "login")}>
            {isLogin ? "Chưa có tài khoản? Đăng ký" : "Đã có tài khoản? Đăng nhập"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Floating Header */}
      <div className="floating-bar">
        <span>👋 {user?.username} ({user?.role})</span>
        <button onClick={handleLogout}>Thoát</button>
      </div>

      {/* Admin/Partner Panel Link */}
      {(user?.role === "admin" || user?.role === "partner") && (
         <div className="portal-toggle">
            <button onClick={() => setAuthMode(authMode === "app" ? user.role : "app")}>
              {authMode === "app" ? "📂 Quản Lý Data" : "📍 Xem Bản Đồ"}
            </button>
         </div>
      )}

      {authMode === "app" ? (
        <>
          <div className="lang-selector">
            {LANGUAGES.map(l => (
              <button key={l.code} onClick={() => setLanguage(l.code)} className={language === l.code ? "active" : ""}>
                {l.flag}
              </button>
            ))}
          </div>

          <MapContainer center={mapCenter} zoom={16} style={{ height: "100vh", width: "100vw" }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapController center={mapCenter} />
            {restaurants.map(rest => {
              const langConfig = LANGUAGES.find(l => l.code === language);
              const desc = rest[langConfig?.dbCol as keyof Restaurant] as string;
              return (
                <Marker key={rest.id} position={[rest.lat, rest.lng]} icon={redIcon}>
                  <Popup>
                    <div className="popup-card">
                      <img src={rest.image_url} alt={rest.name} referrerPolicy="no-referrer" />
                      <h3>{rest.name}</h3>
                      <p>{desc}</p>
                      <button onClick={() => playAudio(rest[`audio_${language}` as keyof Restaurant] as string)}>
                        🔊 Nghe Giới Thiệu
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </>
      ) : (
        <div className="admin-portal">
          <div className="admin-grid">
            {/* Form Section */}
            <div className="admin-card">
              <h3>{editingId ? "✏️ Sửa Quán" : "➕ Thêm Quán"}</h3>
              <form onSubmit={handleSaveRestaurant}>
                <input placeholder="Tên quán" value={newRest.name} onChange={e=>setNewRest({...newRest, name:e.target.value})} required/>
                <input placeholder="Đặc sản" value={newRest.specialty_dish} onChange={e=>setNewRest({...newRest, specialty_dish:e.target.value})} required/>
                <input placeholder="Link ảnh" value={newRest.image_url} onChange={e=>setNewRest({...newRest, image_url:e.target.value})} />
                <div className="geo-inputs">
                  <input type="number" step="any" placeholder="Lat" value={newRest.lat} onChange={e=>setNewRest({...newRest, lat:parseFloat(e.target.value)})}/>
                  <input type="number" step="any" placeholder="Lng" value={newRest.lng} onChange={e=>setNewRest({...newRest, lng:parseFloat(e.target.value)})}/>
                </div>
                <textarea placeholder="Mô tả Tiếng Việt" value={newRest.description} onChange={e=>setNewRest({...newRest, description:e.target.value})} required />
                <button type="button" onClick={autoGenerateContent} disabled={isGeneratingAll}>
                   {isGeneratingAll ? "AI Đang xử lý..." : "🪄 Tự động AI (Dịch & Voice)"}
                </button>
                <div className="form-actions">
                  <button type="submit" className="save-btn">Lưu Vào Database</button>
                  {editingId && <button type="button" onClick={() => setEditingId(null)}>Hủy</button>}
                </div>
              </form>
            </div>

            {/* List Section */}
            <div className="admin-card">
              <h3>📋 Danh Sách Quán</h3>
              <div className="scroll-list">
                {restaurants.map(r => (
                  <div key={r.id} className="list-item">
                    <span>{r.name}</span>
                    <div className="item-actions">
                      <button onClick={() => { setEditingId(r.id); setNewRest(r); }}>Sửa</button>
                      <button onClick={() => handleDeleteRestaurant(r.id, r.name)} className="delete-btn">Xóa</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats Section (Admin Only) */}
            {user?.role === "admin" && (
                <div className="admin-card">
                  <h3>📈 Thống Kê Hệ Thống</h3>
                  <div className="stats-box">
                    <p>Users: {stats.total_users}</p>
                    <p>Restaurants: {stats.total_restaurants}</p>
                    <p>Visits: {stats.total_visits}</p>
                  </div>
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}