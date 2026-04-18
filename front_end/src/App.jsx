import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const API_URL = import.meta.env.VITE_API_URL;

// --- CẤU HÌNH BIỂU TƯỢNG BẢN ĐỒ ---
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
  { code: "fr", name: "French", flag: "🇫🇷", dbCol: "description_fr" },
  { code: "de", name: "German", flag: "🇩🇪", dbCol: "description_de" },
  { code: "es", name: "Spanish", flag: "🇪🇸", dbCol: "description_es" },
  { code: "th", name: "Thai", flag: "🇹🇭", dbCol: "description_th" },
  { code: "ru", name: "Russian", flag: "🇷🇺", dbCol: "description_ru" },
  { code: "ar", name: "Arabic", flag: "🇸🇦", dbCol: "description_ar" },
  { code: "it", name: "Italian", flag: "🇮🇹", dbCol: "description_it" },
  { code: "pt", name: "Portuguese", flag: "🇵🇹", dbCol: "description_pt" },
  { code: "hi", name: "Hindi", flag: "🇮🇳", dbCol: "description_hi" },
  { code: "id", name: "Indonesian", flag: "🇮🇩", dbCol: "description_id" }
];

const defaultRest = {
  name: "", specialty_dish: "", image_url: "", lat: 10.7612, lng: 106.7055
};
LANGUAGES.forEach(l => {
  defaultRest[l.dbCol] = "";
  defaultRest[`audio_${l.code}`] = "";
});

function MapController({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, 16); }, [center, map]);
  return null;
}
function MapClickHandler({ newRest, setNewRest, adminTab }) {
  useMapEvents({
    click(e) {
      // Chỉ tự động ghim tọa độ nếu đang ở Tab "Quản lý Quán Ăn" (adminTab === 'restaurants')
      if (adminTab === "restaurants") {
        setNewRest({ ...newRest, lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
}
export default function App() {
  // --- STATE TÀI KHOẢN ---
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  // --- STATE QUẢN LÝ POPUP SỬA CHỦ QUÁN ---
  const [editingOwner, setEditingOwner] = useState(null);
  // --- STATE BẢN ĐỒ & ỨNG DỤNG ---
  const [userLocation, setUserLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState([10.7612, 106.7055]);
  const [language, setLanguage] = useState("vi");
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  // --- STATE TÌM KIẾM ĐỊA CHỈ ---
  const [searchQuery, setSearchQuery] = useState("");
  // --- STATE ADMIN MỚI ---
  const [stats, setStats] = useState({ total_users: 0, total_restaurants: 0, total_visits: 0 });
  const [editingId, setEditingId] = useState(null);
  const [newRest, setNewRest] = useState({...defaultRest});
  const [selectedLangs, setSelectedLangs] = useState(["en", "zh", "ko", "ja"]);
  // --- THÊM STATE CHO QUẢN LÝ USER ---
  const [adminTab, setAdminTab] = useState("restaurants"); // 'restaurants' hoặc 'users'
  const [usersList, setUsersList] = useState([]);
  const [editingUserId, setEditingUserId] = useState(null);
  const [newUserForm, setNewUserForm] = useState({ username: "", password: "", role: "app" });
  const [newOwnerForm, setNewOwnerForm] = useState({username: "",password: "",package_id: ""});
  // --- THÊM STATE CHO RBAC ---
  const [packages, setPackages] = useState([]);
  const [history, setHistory] = useState([]);
  const [showSettings, setShowSettings] = useState(false);

 
  // --- STATE ÂM THANH ---
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [generatingAudioLang, setGeneratingAudioLang] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const audioSourceRef = useRef(null);
  const audioContextRef = useRef(null);

  // --- STATE TÌM KIẾM QUÁN ĂN TRONG TAB MEDIA ---
  const [mediaSearchQuery, setMediaSearchQuery] = useState("");

  // --- 1. KIỂM TRA ĐĂNG NHẬP KHI MỞ WEB ---
  useEffect(() => {
    const savedUser = localStorage.getItem("vinhkhanh_user");
    if (savedUser) { setUser(JSON.parse(savedUser)); setAuthMode("app"); }
  }, []);

  // --- 2. LẤY DỮ LIỆU & GPS ---
  useEffect(() => {
    if (authMode === "app" || authMode === "admin") {
      fetchRestaurants();
      if (authMode === "admin") {
        fetchStats();
        fetchUsers();
        fetchPackages();
        }
      if ("geolocation" in navigator && !userLocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => { setUserLocation([pos.coords.latitude, pos.coords.longitude]); setMapCenter([pos.coords.latitude, pos.coords.longitude]); },
          () => {}
        );
      }
    }
  }, [authMode]);

  // --- 3. XỬ LÝ TÀI KHOẢN ---
  const handleAuth = async (e, isLogin) => {
    e.preventDefault(); setAuthError("");
    const endpoint = isLogin ? "/api/login" : "/api/register";
    try {
      const res = await axios.post(`${API_URL}${endpoint}`, { username: usernameInput, password: passwordInput });
      if (res.data.error) setAuthError(res.data.error);
      else {
        if (isLogin) {
          const userData = { id: res.data.id, 
            username: res.data.username, 
            role: res.data.role, token: res.data.token, 
            settings: res.data.settings || {},
            poi_limit: res.data.poi_limit,
            allowed_langs: res.data.allowed_langs
          };
          setUser(userData); localStorage.setItem("vinhkhanh_user", JSON.stringify(userData)); setAuthMode("app");
        } else { alert("Đăng ký thành công! Hãy đăng nhập lại."); setAuthMode("login"); }
      }
    } catch (err) { setAuthError("Lỗi kết nối."); }
  };
  const handleLogout = () => { localStorage.removeItem("vinhkhanh_user"); setUser(null); setAuthMode("login"); setUsernameInput(""); setPasswordInput(""); setHistory([]); };

  // --- 4. DATA FETCHING ---
  const fetchRestaurants = async () => { const res = await axios.get(`${API_URL}/api/nearby`); setRestaurants(res.data); };
  const fetchStats = async () => { try { const res = await axios.get(`${API_URL}/api/stats`); setStats(res.data); } catch(e){} };
  const fetchPackages = async () => { try { const res = await axios.get(`${API_URL}/api/admin/packages`); setPackages(res.data); } catch(e){} };
  const fetchHistory = async () => { if(user?.id) { try { const res = await axios.get(`${API_URL}/api/user/history/${user.id}`); setHistory(res.data); } catch(e){} } };

  
  // --- 5. HÀM MA THUẬT AI (PHIÊN BẢN CHẬM MÀ CHẮC - CHỐNG TRÀN XÔ) ---
 // --- 5. HÀM DỊCH THUẬT BẰNG AI (CHỈ SINH TEXT) ---
  const autoGenerateContent = async () => {
    if (!newRest.description) return alert("Vui lòng nhập Kịch bản Tiếng Việt trước!");
    if (selectedLangs.length === 0) return alert("Vui lòng chọn ít nhất 1 ngôn ngữ!");
    
    setIsGeneratingAll(true);
    let workingRest = { ...newRest };

    try {
      console.log("Đang gọi API Dịch thuật...");
      let transRes = null;
      let success = false;
      let lastError = null;

      for (let i = 0; i < 3; i++) {
        try {
          transRes = await axios.post(`${API_URL}/api/translate`, { 
            text: workingRest.description,
            target_languages: selectedLangs // Dịch tất cả các ngôn ngữ được tick chọn
          });
          if (transRes.data.error) throw new Error(transRes.data.error);
          success = true; break;
        } catch(err) {
          lastError = err; await new Promise(r => setTimeout(r, 4000));
        }
      }
      
      if (!success) throw lastError;

      // Lưu kết quả dịch vào Form
      for (const lang of selectedLangs) {
        if (transRes.data[lang]) workingRest[`description_${lang}`] = transRes.data[lang];
      }
      setNewRest({ ...workingRest });
      alert("✅ Đã dịch xong kịch bản! Bạn có thể chỉnh sửa lại chữ trước khi bấm 'Tạo Audio'.");
      
    } catch (err) { 
      alert("Lỗi hệ thống dịch thuật: " + err.message);
    } finally { 
      setIsGeneratingAll(false); 
    }
  };
  
  // --- 6. QUẢN LÝ QUÁN (CRUD) ---
  const handleSaveRestaurant = async (e) => {
    e.preventDefault();
    try {
      const endpoint = editingId ? `/api/restaurants/${editingId}` : "/api/restaurants";
      const method = editingId ? axios.put : axios.post;
      const res = await method(`${API_URL}${endpoint}`, newRest);
      
      if (res.data.error) alert("Lỗi: " + res.data.error);
      else {
        alert(editingId ? "Đã cập nhật quán ăn!" : "Đã lưu quán mới!");
        setEditingId(null);
        setNewRest({ ...defaultRest });
        setSelectedLangs(["en", "zh", "ko", "ja"]);
        fetchRestaurants(); fetchStats();
      }
    } catch (err) { alert("Lỗi máy chủ!"); }
  };

  const handleEditClick = (rest) => {
    setEditingId(rest.id);
    const editState = { ...defaultRest };
    Object.keys(defaultRest).forEach(k => {
        if (rest[k] !== undefined && rest[k] !== null) editState[k] = rest[k];
    });
    setNewRest(editState);
    
    // Auto select languages that have data
    const hasDataLangs = LANGUAGES.filter(l => l.code !== 'vi' && (rest[l.dbCol] || rest[`audio_${l.code}`])).map(l => l.code);
    setSelectedLangs(hasDataLangs.length > 0 ? hasDataLangs : ["en", "zh", "ko", "ja"]);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteRestaurant = async (id, name) => {
    if (window.confirm(`Xóa quán "${name}"?`)) { await axios.delete(`${API_URL}/api/restaurants/${id}`); fetchRestaurants(); fetchStats(); }
  };
  // --- HÀM CRUD CHO USER ---
  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/users`);
      setUsersList(res.data);
    } catch(e) { console.warn("Chưa có API lấy danh sách User"); }
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      const endpoint = editingUserId ? `/api/users/${editingUserId}` : "/api/users";
      const method = editingUserId ? axios.put : axios.post;
      const res = await method(`${API_URL}${endpoint}`, newUserForm);
      
      if (res.data.error) alert("Lỗi: " + res.data.error);
      else {
        alert(editingUserId ? "Cập nhật User thành công!" : "Thêm User mới thành công!");
        setEditingUserId(null);
        setNewUserForm({ username: "", password: "", role: "app" });
        fetchUsers(); fetchStats();
      }
    } catch (err) { alert("Lỗi kết nối máy chủ!"); }
  };

  const handleEditUserClick = (usr) => {
  // Lấy danh sách quán đang sở hữu
  const ownedRests = restaurants
    .filter(r => r.owner_id === usr.id)
    .map(r => r.id);

  setEditingOwner({
    ...usr,
    newPassword: "", 
    // Quan trọng: lấy package_id từ API bạn vừa sửa ở Bước 1
    package_id: usr.package_id || "", 
    owned_restaurant_ids: ownedRests
  });
};

  const handleDeleteUser = async (id, username) => {
    if (window.confirm(`Bạn có chắc muốn xóa tài khoản "${username}"?`)) { 
      await axios.delete(`${API_URL}/api/users/${id}`); 
      fetchUsers(); fetchStats(); 
    }
  };


  // --- 7. XỬ LÝ ÂM THANH (PHÁT TỪ BASE64 MP3) ---
  const stopAudio = () => {
    if (audioSourceRef.current) { 
      try { audioSourceRef.current.pause(); } catch(e){} 
      audioSourceRef.current = null; 
    }
    setAudioUrl(null);
  };

  const playAudio = (base64Data) => {
    try {
      if (!base64Data || base64Data.length < 50) return alert("File âm thanh chưa có sẵn!");
      stopAudio(); 
      
      // Gắn mác MP3 cho cục Base64
      const audioSrc = "data:audio/mp3;base64," + base64Data;
      const audio = new Audio(audioSrc);
      
      audio.onended = () => setAudioUrl(null); 
      audioSourceRef.current = audio; 
      audio.play();
      
      setAudioUrl("playing");
    } catch (err) { 
      console.error(err); 
      alert("Lỗi khi giải mã âm thanh MP3."); 
    }
  };

  const handlePlayAudioForUser = async (restaurant) => {
    const audioData = restaurant[`audio_${language}`];
    if (audioData) {
      playAudio(audioData);
      if (user?.id) {
         await axios.post(`${API_URL}/api/user/history`, {
           user_id: user.id, restaurant_id: restaurant.id, lang: language
         }).catch(()=>{});
         fetchHistory();
      }
    } else {
      alert("Xin lỗi, Audio cho ngôn ngữ này đang được cập nhật!");
    }
  };
  // --- 8. HÀM TÌM KIẾM TỌA ĐỘ TỪ ĐỊA CHỈ (DÙNG API MIỄN PHÍ) ---
  const handleSearchAddress = async (e) => {
    e.preventDefault();
    if (!searchQuery) return alert("Vui lòng nhập địa chỉ cần tìm!");
    
    try {
      // Gọi API Nominatim của OpenStreetMap (Hoàn toàn miễn phí, không cần Key)
      const res = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
      
      if (res.data && res.data.length > 0) {
        const foundLat = parseFloat(res.data[0].lat);
        const foundLng = parseFloat(res.data[0].lon);
        
        // Cập nhật tọa độ vào Form và đưa bản đồ bay đến đó
        setNewRest({ ...newRest, lat: foundLat, lng: foundLng });
        setMapCenter([foundLat, foundLng]); 
      } else {
        alert("Không tìm thấy địa chỉ này trên bản đồ. Vui lòng thử từ khóa khác (ví dụ: Tên đường, Quận, Thành phố)!");
      }
    } catch (err) {
      alert("Lỗi khi tìm kiếm địa chỉ.");
    }
  };

  // --- HÀM TẠO AUDIO ĐỘC LẬP CHO TỪNG NGÔN NGỮ ---
  const generateSingleAudio = async (langCode, langName) => {
    const textKey = langCode === 'vi' ? 'description' : `description_${langCode}`;
    const textToSpeak = newRest[textKey];

    if (!textToSpeak || textToSpeak.trim() === "") {
       return alert(`Vui lòng nhập hoặc sinh nội dung tiếng ${langName} trước khi tạo Audio!`);
    }

    setGeneratingAudioLang(langCode); // Bật hiệu ứng loading cho nút bấm
    try {
       const res = await axios.post(`${API_URL}/api/tts`, { text: textToSpeak });
       if (res.data.error) throw new Error(res.data.error);

       if (res.data.audio_base64) {
          // Lưu audio mới vào State
          setNewRest(prev => ({
             ...prev,
             [`audio_${langCode}`]: res.data.audio_base64
          }));
       }
    } catch (err) {
       alert("Lỗi khi tạo Audio: " + err.message);
    } finally {
       setGeneratingAudioLang(null); // Tắt hiệu ứng loading
    }
  };

  // --- HÀM LƯU THÔNG TIN CHỦ QUÁN ---
  const handleSaveOwnerChanges = async (e) => {
  e.preventDefault();
  try {
      const res = await axios.put(`${API_URL}/api/admin/owners/${editingOwner.id}`, {
        username: editingOwner.username,
        password: editingOwner.newPassword || "", 
        package_id: editingOwner.package_id
      });

      if (res.data.error) return alert(res.data.error);
      
      alert("✅ Cập nhật thông tin chủ quán thành công!");
      setEditingOwner(null);
      fetchUsers();
  } catch (err) {
      alert("Lỗi khi kết nối đến máy chủ.");
    }
  };

  const handleAddOwner = async (e) => {
  e.preventDefault();
  try {
    const res = await axios.post("http://localhost:8000/api/admin/owners", {
      username: newOwnerForm.username,
      password: newOwnerForm.password,
      package_id: parseInt(newOwnerForm.package_id),
      role: 'owner'
    });

    if (res.data.error) return alert(res.data.error);

    alert("✅ Đã tạo tài khoản Chủ Quán thành công!");
    setNewOwnerForm({ username: "", password: "", package_id: "" }); // Reset form
    fetchUsers(); // Tải lại danh sách để hiện người mới
  } catch (err) {
    alert("Lỗi khi tạo chủ quán. Vui lòng kiểm tra lại!");
  }
};

  // ==========================================
  // GIAO DIỆN 1: ĐĂNG NHẬP
  // ==========================================
  if (authMode === "login" || authMode === "register") {
    const isLogin = authMode === "login";
    return (
      <div style={{...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e0f2f1'}}>
        <div style={{...styles.card, padding: '30px', width: '100%', maxWidth: '400px'}}>
          <h2 style={{textAlign: 'center', color: '#009688'}}> {isLogin ? "🔐 Đăng Nhập Bản Đồ" : "📝 Đăng Ký Tài Khoản"} </h2>
          {authError && <div style={{color: 'red', background: '#ffebee', padding: '10px', borderRadius: '5px', marginBottom: '15px'}}>{authError}</div>}
          <form onSubmit={(e) => handleAuth(e, isLogin)}>
            <div style={{marginBottom: '15px'}}><label style={styles.label}>Tài khoản:</label><input required value={usernameInput} onChange={e => setUsernameInput(e.target.value)} style={styles.input} /></div>
            <div style={{marginBottom: '20px'}}><label style={styles.label}>Mật khẩu:</label><input type="password" required value={passwordInput} onChange={e => setPasswordInput(e.target.value)} style={styles.input} /></div>
            <button type="submit" style={styles.primaryBtn}>{isLogin ? "Vào Bản Đồ" : "Tạo Tài Khoản"}</button>
          </form>
          <div style={{textAlign: 'center', marginTop: '20px', fontSize: '14px'}}>
            <span onClick={() => { setAuthMode(isLogin ? "register" : "login"); setAuthError(""); }} style={{color: '#009688', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline'}}>{isLogin ? "Đăng ký ngay" : "Đăng nhập lại"}</span>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // GIAO DIỆN 2: TRANG QUẢN TRỊ ADMIN (CMS)
  // ==========================================
  if (authMode === "admin" && (user?.role === "admin" || user?.role === "owner")) {
    return (
      <div style={{fontFamily: 'Arial', background: '#f5f5f5', minHeight: '100vh', padding: '20px'}}>
        <div style={{maxWidth: '1000px', margin: '0 auto'}}>
          {/* HEADER ADMIN */}
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
            <h2 style={{color: '#d32f2f', margin: 0}}>⚙️ Hệ Thống Quản Trị (Admin Panel)</h2>
            <button onClick={() => setAuthMode("app")} style={{padding: '8px 15px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer'}}>⬅ Về Bản Đồ</button>
          </div>

                    {/* THANH MENU TABS */}
          <div style={{display: 'flex', gap: '10px', marginBottom: '25px', borderBottom: '2px solid #ddd', paddingBottom: '10px', flexWrap: 'wrap'}}>
            {user?.role === 'admin' && (
              <>
                <button onClick={() => setAdminTab("owners")} style={adminTab === "owners" ? styles.adminTabActive : styles.adminTabInactive}>👔 Quản lý Chủ Quán</button>
                <button onClick={() => setAdminTab("users")} style={adminTab === "users" ? styles.adminTabActive : styles.adminTabInactive}>👥 Quản lý Khách Hàng</button>
              </>
            )}
            <button onClick={() => setAdminTab("restaurants")} style={adminTab === "restaurants" ? styles.adminTabActive : styles.adminTabInactive}>
              {user?.role === 'owner' ? "🏪 Quản lý Quán Ăn Của Tôi" : "📍 Quản lý Quán Ăn"}
            </button>
            <button onClick={() => setAdminTab("media")} style={adminTab === "media" ? styles.adminTabActive : styles.adminTabInactive}>🎧 Quản lý Nội Dung Thuyết Minh</button>
            <button onClick={() => { setAdminTab("packages"); fetchPackages(); }} style={adminTab === "packages" ? styles.adminTabActive : styles.adminTabInactive}>🎁 Quản lý Gói Đăng Ký</button>
          </div>

          {/* ==========================================
              TAB 1: QUẢN LÝ QUÁN ĂN 
              ========================================== */}
          {adminTab === "restaurants" && (
            <>
              {/* THỐNG KÊ (Chỉ hiện ở Tab Quán ăn) */}
              <div style={{display: 'flex', gap: '15px', marginBottom: '25px'}}>
                <div style={{...styles.statCard, borderLeft: '5px solid #2196F3'}}><div style={{fontSize: '24px', fontWeight: 'bold'}}>{stats.total_users}</div><div style={{fontSize: '13px', color: '#666'}}>👥 Khách hàng</div></div>
                <div style={{...styles.statCard, borderLeft: '5px solid #4CAF50'}}><div style={{fontSize: '24px', fontWeight: 'bold'}}>{stats.total_restaurants}</div><div style={{fontSize: '13px', color: '#666'}}>🍽️ Quán ăn</div></div>
                <div style={{...styles.statCard, borderLeft: '5px solid #ff9800'}}><div style={{fontSize: '24px', fontWeight: 'bold'}}>{stats.total_visits}</div><div style={{fontSize: '13px', color: '#666'}}>📈 Lượt quét QR (Dự kiến)</div></div>
              </div>

              {/* FORM THÊM/SỬA QUÁN & AI GENERATOR */}
              <div style={{...styles.card, padding: '20px', marginBottom: '30px', borderTop: editingId ? '4px solid #9c27b0' : '4px solid #4CAF50'}}>
                {/* --- KHU VỰC TIÊU ĐỀ MỚI: CHỨA CHỮ VÀ NÚT --- */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', marginBottom: '15px', paddingBottom: '10px' }}>
                  <h3 style={{ margin: 0 }}>
                    {editingId ? "✏️ Chỉnh Sửa Quán Ăn" : "➕ Thêm Quán Ăn Mới"}
                  </h3>
                  
                  {/* Nút "Thêm mới" chỉ xuất hiện khi bạn đang trong chế độ "Sửa" */}
                  {editingId && (
                    <button 
                      type="button"
                      onClick={() => {
                        setEditingId(null); 
                        setNewRest({ ...defaultRest }); 
                        setSelectedLangs(["en", "zh", "ko", "ja"]);
                      }} 
                      style={{ ...styles.secondaryBtn, padding: '5px 15px', fontSize: '13px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      ➕ Tạo quán mới
                    </button>
                  )}
                </div>
                <form onSubmit={handleSaveRestaurant}>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                    <div><label style={styles.label}>Tên quán ăn (*)</label><input required value={newRest.name} onChange={e=>setNewRest({...newRest, name: e.target.value})} style={styles.input} /></div>
                    <div><label style={styles.label}>Món đặc sản (*)</label><input required value={newRest.specialty_dish} onChange={e=>setNewRest({...newRest, specialty_dish: e.target.value})} style={styles.input} /></div>
                    {/* KHU VỰC TÌM KIẾM VÀ CHỌN TỌA ĐỘ */}
                      <div style={{gridColumn: '1 / -1', background: '#e3f2fd', padding: '15px', borderRadius: '8px', border: '1px dashed #2196F3', marginBottom: '10px'}}>
                      <label style={styles.label}>📍 Vị trí trên Bản đồ (Nhập địa chỉ hoặc Click trực tiếp lên bản đồ bên dưới)</label>
                      
                      <div style={{display: 'flex', gap: '10px', marginBottom: '10px'}}>
                        <input 
                          placeholder="Nhập địa chỉ (VD: Chợ Bến Thành, Quận 1)" 
                          value={searchQuery} 
                          onChange={e => setSearchQuery(e.target.value)} 
                          style={{...styles.input, flex: 1}} 
                          onKeyDown={(e) => e.key === 'Enter' && handleSearchAddress(e)}
                        />
                        <button type="button" onClick={handleSearchAddress} style={{...styles.primaryBtn, background: '#ff9800'}}>🔍 Tìm & Ghim</button>
                      </div>

                      <div style={{display: 'flex', gap: '15px', fontSize: '13px', color: '#555', marginBottom: '15px'}}>
                        <div><strong>Vĩ độ (Lat):</strong> <input type="number" step="any" required value={newRest.lat} onChange={e=>setNewRest({...newRest, lat: parseFloat(e.target.value)})} style={{...styles.input, width: '120px', display: 'inline-block', padding: '4px'}} /></div>
                        <div><strong>Kinh độ (Lng):</strong> <input type="number" step="any" required value={newRest.lng} onChange={e=>setNewRest({...newRest, lng: parseFloat(e.target.value)})} style={{...styles.input, width: '120px', display: 'inline-block', padding: '4px'}} /></div>
                      </div>

                      {/* --- KHUNG BẢN ĐỒ THU NHỎ (MINI MAP) --- */}
                      <div style={{height: '300px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '2px solid #ccc', position: 'relative', zIndex: 0}}>
                        <MapContainer center={[newRest.lat || 10.7612, newRest.lng || 106.7055]} zoom={15} style={{width: '100%', height: '100%'}}>
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                          
                          {/* Cập nhật tâm bản đồ khi tìm kiếm */}
                          <MapController center={[newRest.lat || 10.7612, newRest.lng || 106.7055]} />
                          
                          {/* Bắt sự kiện click chuột trên bản đồ thu nhỏ */}
                          <MapClickHandler newRest={newRest} setNewRest={setNewRest} adminTab={adminTab} />
                          
                          {/* Hiển thị Marker (cái ghim) màu đỏ tại vị trí đang chọn */}
                          <Marker position={[newRest.lat || 10.7612, newRest.lng || 106.7055]} icon={redIcon}>
                            <Popup>Vị trí quán ăn sẽ lưu</Popup>
                          </Marker>
                        </MapContainer>
                      </div>
                    </div>
                    <div style={{gridColumn: '1 / -1'}}><label style={styles.label}>Link Hình Ảnh (URL)</label><input value={newRest.image_url} onChange={e=>setNewRest({...newRest, image_url: e.target.value})} style={styles.input} /></div>

                    {/* OWNER ID XUẤT HIỆN KHI LÀ ADMIN */}
                    {user?.role === 'admin' && (
                      <div style={{gridColumn: '1 / -1', marginTop: '10px'}}>
                        <label style={styles.label}>Thuộc quyền sở hữu của (Chủ quán)</label>
                        <select 
                            value={newRest.owner_id || ""} 
                            onChange={e => setNewRest({...newRest, owner_id: e.target.value ? parseInt(e.target.value) : null})} 
                            style={styles.input}
                        >
                            <option value="">-- Thuộc về Hệ thống (Không giao cho Chủ Quán) --</option>
                            
                            {/* --- CẬP NHẬT MỚI: HIỂN THỊ POI VÀ BLOCK --- */}
                            {usersList.filter(u => u.role === 'owner').map(o => {
                                // Đếm số quán chủ này đang sở hữu
                                const currentCount = restaurants.filter(r => r.owner_id === o.id).length;
                                const limit = o.poi_limit || 1;
                                const isFull = currentCount >= limit;
                                // Nếu đang Edit quán mà chủ này ĐANG SỞ HỮU, thì không bị disable
                                const isCurrentlyOwningThis = editingId && newRest.owner_id === o.id;

                                return (
                                    <option 
                                        key={o.id} 
                                        value={o.id}
                                        disabled={isFull && !isCurrentlyOwningThis}
                                    >
                                        {o.username} ({currentCount}/{limit} POI) {isFull && !isCurrentlyOwningThis ? " 🚫 [ĐÃ ĐẦY]" : ""}
                                    </option>
                                );
                            })}
                        </select>
                        <p style={{fontSize: '11px', color: '#666', marginTop: '4px'}}>* Chỉ khi gắn Chủ Quán, họ mới có thể thấy và quản lý quán ăn này.</p>
                      </div>
                    )}
                    
                    
                    

                  </div>
                  {(() => {
                      let isOverLimit = false;
                      if (user?.role === 'owner' && !editingId) {
                         const currentCount = (user?.role === 'owner' ? restaurants.filter(r => r.owner_id === user.id) : restaurants).length;
                         if (restaurants.filter(r => r.owner_id === user.id).length >= (user.poi_limit || 1)) isOverLimit = true;
                      } else if (user?.role === 'admin' && !editingId && newRest.owner_id) {
                        const ownerObj = usersList.find(u => u.id === newRest.owner_id);
                        const currentCount = restaurants.filter(r => r.owner_id === newRest.owner_id).length;
                        const limit = ownerObj ? (ownerObj.poi_limit || 1) : 1;
                        // Nếu tạo mới, check bình thường. Nếu là Edit nhưng đổi sang chủ khác, cũng check.
                        const isEditingButChangedOwner = editingId && newRest.owner_id !== restaurants.find(r=>r.id === editingId)?.owner_id;
                        if ((!editingId || isEditingButChangedOwner) && currentCount >= limit) {
                            isOverLimit = true;
                        }
                      }

                      return (
                         <div style={{marginTop: '15px'}}>
                            {isOverLimit && <div style={{color: 'red', fontWeight: 'bold', marginBottom: '10px', textAlign: 'center'}}>🚫 Chủ quán này đã hết giới hạn mở quán! Vui lòng nâng cấp gói.</div>}
                            <button type="submit" disabled={isOverLimit} style={{...styles.primaryBtn, width: '100%', background: isOverLimit ? '#aaa' : '#4CAF50', cursor: isOverLimit ? 'not-allowed' : 'pointer'}}>
                               {editingId ? "Ghi Lại Chỉnh Sửa" : "Thêm Quán Mới"}
                            </button>
                         </div>
                      )
                  })()}
                  {editingId && <button type="button" onClick={() => {setEditingId(null); setNewRest({...defaultRest});}} style={{...styles.secondaryBtn, width: '100%', marginTop: '10px'}}>Hủy chỉnh sửa</button>}
                </form>
              </div>

              {/* LIST RESTAURANTS */}
              <div style={styles.card}>
                <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px'}}>
                  <thead>
                    <tr style={{background: '#f5f5f5', borderBottom: '2px solid #ddd'}}>
                      <th style={styles.th}>Tên Quán</th>
                      <th style={styles.th}>Món Đặc Sản</th>
                      {user?.role === 'admin' && <th style={styles.th}>Chủ Quán</th>}
                      <th style={styles.th}>Tình Trạng (AI Audio)</th>
                      <th style={styles.th}>Hành Động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(user?.role === 'owner' ? restaurants.filter(r => r.owner_id === user.id) : restaurants).map(rest => (
                      <tr key={rest.id} style={{borderBottom: '1px solid #eee'}}>
                        <td style={styles.td}>{rest.name}</td>
                        <td style={styles.td}>{rest.specialty_dish}</td>
                        {user?.role === 'admin' && <td style={styles.td}>{rest.owner_id || "Trống"}</td>}
                        <td style={styles.td}>
                          <div style={{display: 'flex', gap: '5px'}}>
                             {LANGUAGES.map(l => (rest[`audio_${l.code}`] ? <span key={l.code} title={l.name}>{l.flag}</span> : null))}
                          </div>
                        </td>
                        <td style={styles.td}>
                          <button onClick={() => handleEditClick(rest)} style={{...styles.iconBtn, background: '#2196F3', color: 'white'}}>✏️ Sửa</button>
                          <button onClick={() => handleDeleteRestaurant(rest.id, rest.name)} style={{...styles.iconBtn, background: '#f44336', color: 'white'}}>🗑️ Xóa</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* TAB 2: QUẢN LÝ NGƯỜI DÙNG */}
          {adminTab === "users" && user?.role === 'admin' && (
            <>
              <div style={{...styles.card, padding: '20px', marginBottom: '30px', borderTop: editingUserId ? '4px solid #9c27b0' : '4px solid #4CAF50'}}>
                <h3 style={{marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '10px'}}>{editingUserId ? "✏️ Đổi Mật Khẩu User" : "➕ Thêm User Mới"}</h3>
                <form onSubmit={handleSaveUser}>
                  <div style={{display: 'flex', gap: '15px'}}>
                    <div style={{flex: 1}}><label style={styles.label}>Tên đăng nhập (*)</label><input required value={newUserForm.username} onChange={e=>setNewUserForm({...newUserForm, username: e.target.value})} style={styles.input} disabled={!!editingUserId} /></div>
                    <div style={{flex: 1}}><label style={styles.label}>Mật khẩu {editingUserId ? "(Mới)" : "(*)"}</label><input required={!editingUserId} type="password" value={newUserForm.password} onChange={e=>setNewUserForm({...newUserForm, password: e.target.value})} style={styles.input} /></div>
                    <div style={{flex: 1}}><label style={styles.label}>Phân quyền</label>
                      <div style={{ flex: 1 }}>
                        <select 
                          disabled // <--- Dòng này cực kỳ quan trọng: Nó sẽ làm mờ ô chọn, không cho bấm
                          value="user" // <--- Luôn luôn hiển thị là Khách hàng
                          style={{ ...styles.input, background: '#f5f5f5', color: '#888', cursor: 'not-allowed' }}
                        >
                          <option value="user">Khách hàng (User)</option>
                        </select>
                        <p style={{ fontSize: '11px', color: '#0288d1', marginTop: '5px' }}>
                          ℹ️ Tài khoản tạo tại đây sẽ mặc định là Khách hàng.
                        </p>
                      </div>
                    </div>
                  </div>
                  <button type="submit" style={{...styles.primaryBtn, marginTop: '15px'}}>{editingUserId ? "Cập Nhật Mật Khẩu" : "Thêm Nhanh"}</button>
                  {editingUserId && <button type="button" onClick={() => {setEditingUserId(null); setNewUserForm({username:"", password:"", role:"app"});}} style={{...styles.secondaryBtn, marginLeft: '10px'}}>Hủy</button>}
                </form>
              </div>

              <div style={styles.card}>
                <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left'}}>
                  <thead><tr style={{background: '#f5f5f5'}}><th style={styles.th}>ID</th><th style={styles.th}>Tài Khoản</th><th style={styles.th}>Quyền hạn (Role)</th><th style={styles.th}>Hành Động</th></tr></thead>
                  <tbody>
                      {usersList.filter(u => u.role && u.role.toLowerCase() === 'app') .map((usr, index) => (
                        <tr key={usr.id} style={{borderBottom: '1px solid #eee'}}>
                          <td style={styles.td}>{index + 1}</td>
                          <td style={styles.td}><strong>{usr.username}</strong></td>
                          <td style={styles.td}>
                            <span style={{background: '#e1f5fe', color: '#0288d1', padding: '4px 8px', borderRadius: '12px', fontSize: '12px'}}>
                              👥 User
                            </span>
                          </td>
                          <td style={styles.td}>
                            <button onClick={() => handleEditUserClick(usr)} style={{...styles.iconBtn, background: '#FF9800', color: 'white'}}>✏️ Sửa thông tin</button>
                            <button onClick={() => handleDeleteUser(usr.id, usr.username)} style={{...styles.iconBtn, background: '#f44336', color: 'white'}}>🗑️ Xóa</button>
                          </td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* TAB: OWNERS */}
          {adminTab === "owners" && user?.role === 'admin' && (
          <>
            <div style={{...styles.card, padding: '20px', marginBottom: '30px', borderLeft: '4px solid #2196F3'}}>
              <h3 style={{marginTop: 0, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px'}}>
                <span style={{fontSize: '24px'}}>➕</span> Thêm Chủ Quán (Owner) Hệ Thống
              </h3>
              
              <form onSubmit={handleAddOwner} style={{display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end'}}>
                <div style={{flex: 1, minWidth: '200px'}}>
                  <label style={styles.label}>Tên đăng nhập (*)</label>
                  <input 
                    required 
                    value={newOwnerForm.username} 
                    onChange={e => setNewOwnerForm({...newOwnerForm, username: e.target.value})} 
                    placeholder="VD: owner_quan_1"
                    style={styles.input} 
                  />
                </div>

                <div style={{flex: 1, minWidth: '200px'}}>
                  <label style={styles.label}>Mật khẩu (*)</label>
                  <input 
                    required 
                    type="password"
                    value={newOwnerForm.password} 
                    onChange={e => setNewOwnerForm({...newOwnerForm, password: e.target.value})} 
                    placeholder="••••••••"
                    style={styles.input} 
                  />
                </div>

                <div style={{flex: 1, minWidth: '200px'}}>
                  <label style={styles.label}>Gói đăng ký ban đầu</label>
                  <select 
                    required
                    value={newOwnerForm.package_id} 
                    onChange={e => setNewOwnerForm({...newOwnerForm, package_id: e.target.value})} 
                    style={styles.input}
                  >
                    <option value="">-- Chọn gói cước --</option>
                    {packages.map(pkg => (
                      <option key={pkg.id} value={pkg.id}>{pkg.name} (Hạn mức: {pkg.poi_limit} quán)</option>
                    ))}
                  </select>
                </div>

                <button type="submit" style={{...styles.primaryBtn, background: '#2196F3', height: '42px', padding: '0 25px'}}>
                  🚀 Tạo Tài Khoản
                </button>
              </form>
            </div>
            <div style={styles.card}>
                <h3 style={{marginTop: 0, padding: '15px', paddingBottom: 0}}>👔 Bảng Quản Lý Chủ Quán (Owner)</h3>
                <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left'}}>
                  <thead><tr style={{background: '#f5f5f5'}}><th style={styles.th}>STT</th><th style={styles.th}>Tài Khoản</th><th style={styles.th}>Gói Đăng Ký (Active)</th><th style={styles.th}>Quán Đang Sở Hữu</th><th style={styles.th}>Hành Động</th></tr></thead>
                  <tbody>
                    {usersList.filter(u => u.role === 'owner').map((usr, index) => {
                      const ownedRests = restaurants.filter(r => r.owner_id === usr.id);
                      return (
                      <tr key={usr.id} style={{borderBottom: '1px solid #eee'}}>
                        <td style={styles.td}>{index + 1}</td>
                        <td style={styles.td}><strong>{usr.username}</strong></td>
                        <td style={styles.td}>
                           {usr.package_name ? (
                             <span style={{background: '#e8f5e9', border: '1px solid #c8e6c9', color: '#2e7d32', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold'}}>
                               🎁 {usr.package_name}
                             </span>
                           ) : (
                             <span style={{background: '#ffebee', color: '#c62828', padding: '4px 8px', borderRadius: '4px', fontSize: '12px'}}>
                               Chưa đăng ký gói
                             </span>
                           )}
                           {usr.package_features && Array.isArray(usr.package_features) && (
                              <div style={{fontSize: '11px', color: '#666', marginTop: '6px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                 - {usr.package_features[0]}
                              </div>
                           )}
                        </td>
                        <td style={styles.td}>
                          <strong style={{color: '#1565c0'}}>{ownedRests.length} Quán</strong>
                          {ownedRests.length > 0 && (
                             <div style={{fontSize: '11px', color: '#555', marginTop: '4px', maxHeight: '40px', overflowY: 'auto'}}>
                               {ownedRests.map(r => "🍽️ " + r.name).join(', ')}
                             </div>
                          )}
                        </td>
                        <td style={styles.td}>
                          <button onClick={() => handleEditUserClick(usr)} style={{...styles.iconBtn, background: '#2196F3', color: 'white'}}>✏️ Sửa MK</button>
                          {usr.id !== user.id && <button onClick={() => handleDeleteUser(usr.id, usr.username)} style={{...styles.iconBtn, background: '#f44336', color: 'white'}}>🗑️ Xóa</button>}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
                {/* --- POPUP CHỈNH SỬA THÔNG TIN CHỦ QUÁN --- */}
                {editingOwner && (
                  <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
                    <div style={{ background: '#fff', padding: '25px', borderRadius: '10px', width: '500px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 5px 15px rgba(0,0,0,0.3)' }}>
                      <h3 style={{ marginTop: 0, borderBottom: '2px solid #2196F3', paddingBottom: '10px', color: '#1976D2' }}>
                        ⚙️ Cập nhật tài khoản: {editingOwner.username}
                      </h3>

                      <form onSubmit={handleSaveOwnerChanges} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
                        
                        {/* 1. TÊN TÀI KHOẢN */}
                        <div>
                          <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Tên đăng nhập:</label>
                          <input type="text" value={editingOwner.username} onChange={e => setEditingOwner({...editingOwner, username: e.target.value})} required style={{ ...styles.input, width: '100%', boxSizing: 'border-box' }} />
                        </div>

                        {/* 2. MẬT KHẨU */}
                        <div>
                          <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Mật khẩu mới <span style={{color: '#999', fontWeight: 'normal'}}>(Để trống nếu không muốn đổi)</span>:</label>
                          <input type="text" placeholder="Nhập mật khẩu mới..." value={editingOwner.newPassword} onChange={e => setEditingOwner({...editingOwner, newPassword: e.target.value})} style={{ ...styles.input, width: '100%', boxSizing: 'border-box' }} />
                        </div>

                        {/* 3. GÓI ĐĂNG KÝ */}
                        <div>
                          <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Gói dịch vụ hiện tại:</label>
                          <select value={editingOwner.package_id} onChange={e => setEditingOwner({...editingOwner, package_id: parseInt(e.target.value) || ""})} style={{ ...styles.input, width: '100%', boxSizing: 'border-box' }}>
                            <option value="">-- Chưa có gói (Miễn phí) --</option>
                            {packages.map(pkg => (
                              <option key={pkg.id} value={pkg.id}>{pkg.name} (Giới hạn: {pkg.poi_limit} quán)</option>
                            ))}
                          </select>
                        </div>

                        {/* 4. DANH SÁCH QUÁN ĂN THUỘC SỞ HỮU (CHỈ HIỂN THỊ) */}
                        <div>
                          <label style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '10px', display: 'block' }}>
                            🏰 Các quán ăn thuộc chủ sở hữu:
                          </label>
                          
                          <div style={{ 
                            border: '1px solid #ddd', 
                            borderRadius: '5px', 
                            padding: '12px', 
                            background: '#fcfcfc', 
                            minHeight: '60px',
                            maxHeight: '200px', 
                            overflowY: 'auto' 
                          }}>
                            {restaurants.filter(r => r.owner_id === editingOwner.id).length > 0 ? (
                              <ul style={{ margin: 0, paddingLeft: '20px', color: '#333' }}>
                                {restaurants
                                  .filter(r => r.owner_id === editingOwner.id)
                                  .map(rest => (
                                    <li key={rest.id} style={{ marginBottom: '8px', fontSize: '14px' }}>
                                      <span style={{ fontWeight: '600' }}>{rest.name}</span> 
                                      <span style={{ color: '#888', fontSize: '12px', marginLeft: '8px' }}>(ID: {rest.id})</span>
                                    </li>
                                  ))
                                }
                              </ul>
                            ) : (
                              <div style={{ color: '#999', fontSize: '13px', fontStyle: 'italic', textAlign: 'center', paddingTop: '10px' }}>
                                Chủ sở hữu này hiện chưa quản lý quán ăn nào.
                              </div>
                            )}
                          </div>

                          <div style={{ fontSize: '11px', color: '#666', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span>ℹ️</span>
                            <span>Để thay đổi quyền sở hữu, vui lòng thực hiện tại tab <strong>Quản lý quán ăn</strong>.</span>
                          </div>
                        </div>

                        {/* CÁC NÚT BẤM */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                          <button type="button" onClick={() => setEditingOwner(null)} style={{ padding: '8px 15px', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', background: '#f5f5f5' }}>Hủy bỏ</button>
                          <button type="submit" style={{ ...styles.primaryBtn, background: '#4CAF50', padding: '8px 20px' }}>💾 Lưu Thay Đổi</button>
                        </div>

                      </form>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
          {/* TAB 3: MEDIA / AI THUYẾT MINH */}
          {adminTab === "media" && (
            <div style={{...styles.card, padding: '20px'}}>
              <h3 style={{marginTop: 0}}>🎤 Studio AI Thuyết Minh / Phiên Dịch</h3>
              <p>Chọn quán ăn bên dưới và thiết lập Kịch bản Tiếng Việt, sau đó AI sẽ dịch ra đa ngôn ngữ và tạo Giọng đọc.</p>
              
              <div style={{display: 'flex', gap: '20px'}}>
                <div style={{flex: 1, borderRight: '1px solid #ddd', paddingRight: '20px'}}>
                   {/* --- THÊM TIÊU ĐỀ VÀ THANH TÌM KIẾM --- */}
                  <h3 style={{marginTop: 0, marginBottom: '15px', color: '#1976D2', fontSize: '18px'}}>📋 Danh sách quán ăn</h3>
                  
                  <input 
                    type="text"
                    placeholder="🔍 Tìm nhanh tên quán..."
                    value={mediaSearchQuery}
                    onChange={(e) => setMediaSearchQuery(e.target.value)}
                    style={{ 
                        width: '100%', 
                        padding: '8px', 
                        marginBottom: '15px', 
                        border: '1px solid #ddd', 
                        borderRadius: '4px',
                        boxSizing: 'border-box'
                    }}
                  />

                  {/* --- DANH SÁCH QUÁN ĂN ĐÃ ĐƯỢC LỌC --- */}
                  <ul style={{listStyle: 'none', padding: 0, margin: 0, maxHeight: '500px', overflowY: 'auto'}}>
                    {(user?.role === 'owner' ? restaurants.filter(r => r.owner_id === user.id) : restaurants)
                      // Thêm logic filter để tìm kiếm theo tên 
                      .filter(rest => rest.name.toLowerCase().includes(mediaSearchQuery.toLowerCase()))
                      .map(rest => (
                        <li 
                          key={rest.id} 
                          onClick={() => handleEditClick(rest)} 
                          style={{
                            padding: '10px', 
                            background: editingId === rest.id ? '#e3f2fd' : '#f9f9f9', 
                            border: '1px solid #eee', 
                            marginBottom: '5px', 
                            cursor: 'pointer', 
                            borderRadius: '4px'
                          }}
                        >
                          <strong>{rest.name}</strong> 
                          <div style={{fontSize: '12px', color: '#666', marginTop: '5px'}}>
                            {LANGUAGES.map(l => (rest[`audio_${l.code}`] ? <span key={l.code}>{l.flag} </span> : null))}
                          </div>
                        </li>
                    ))}
                    
                    {/* Hiển thị nếu không tìm thấy quán nào  */}
                    {(user?.role === 'owner' ? restaurants.filter(r => r.owner_id === user.id) : restaurants)
                      .filter(rest => rest.name.toLowerCase().includes(mediaSearchQuery.toLowerCase())).length === 0 && (
                      <li style={{textAlign: 'center', padding: '20px', color: '#999', fontSize: '14px'}}>
                        Không tìm thấy quán nào phù hợp.
                      </li>
                    )}
                  </ul>
                </div>
                <div style={{flex: 2}}>
                   {editingId ? (
                     <div>
                       <h4>Biên tập Audio AI cho quán: <span style={{color: '#2196F3'}}>{newRest.name}</span></h4>
                       <label style={styles.label}>Kịch Bản Gốc (Tiếng Việt)</label>
                       <textarea value={newRest.description} onChange={e=>setNewRest({...newRest, description: e.target.value})} style={{...styles.input, height: '100px'}} />
                       
                       <label style={{ ...styles.label, marginTop: '15px', display: 'block' }}>Chọn Các Ngôn Ngữ MUỐN TẠO MỚI/CẬP NHẬT AUDIO & DỊCH THUẬT:</label>
                       <div style={{display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '20px'}}>
                          {LANGUAGES.filter(l => l.code !== 'vi').map(lang => {
                            const isAllowed = user?.role === 'admin' || (user?.allowed_langs || ['vi','en','zh','ko','ja']).includes(lang.code);
                            return (
                            <label key={lang.code} style={{display: 'flex', alignItems: 'center', gap: '5px', cursor: isAllowed ? 'pointer' : 'not-allowed', fontSize: '14px', background: isAllowed ? '#f5f5f5' : '#eaeaea', padding: '5px 10px', borderRadius: '5px', opacity: isAllowed ? 1 : 0.5}}>
                              <input type="checkbox" disabled={!isAllowed} checked={selectedLangs.includes(lang.code)} onChange={(e) => { const checked = e.target.checked; setSelectedLangs(prev => checked ? [...prev, lang.code] : prev.filter(l => l !== lang.code)); }} />
                              <span>{lang.flag} {lang.name} {!isAllowed && "(Cần gói cao hơn)"}</span>
                            </label>
                            );
                          })}
                        </div>

                        <div style={{display: 'flex', gap: '10px'}}>
                           <button onClick={autoGenerateContent} disabled={isGeneratingAll} style={{...styles.primaryBtn, flex: 1, background: isGeneratingAll ? '#ccc' : '#2196F3'}}>{isGeneratingAll ? "⏳ Hệ thống đang xử lý..." : "✨ Bắt Đầu Sinh AI"}</button>
                           <button onClick={handleSaveRestaurant} style={{...styles.primaryBtn, flex: 1, background: '#4CAF50'}}>💾 Lưu Lại Chỉnh Sửa</button>

                        </div>
                        {/* --- PHẦN MỚI: XEM TRƯỚC, NGHE THỬ VÀ SỬA LỖI AI --- */}
                        <div style={{ marginTop: '30px', borderTop: '2px dashed #ccc', paddingTop: '20px' }}>
                          <h4 style={{ color: '#e65100', marginBottom: '15px' }}>🎧 Quản Lý Nội Dung Đã Tạo</h4>
                          
                          {LANGUAGES.map(lang => {
                            // Xác định tên cột trong DB tương ứng với ngôn ngữ
                            const textKey = lang.code === 'vi' ? 'description' : `description_${lang.code}`;
                            const audioKey = `audio_${lang.code}`;

                            // Chỉ hiển thị khung này nếu ngôn ngữ đó đã có text hoặc có audio
                            if (!newRest[textKey] && !newRest[audioKey]) return null;

                            return (
                              <div key={lang.code} style={{ background: '#fff', border: '1px solid #ddd', padding: '15px', borderRadius: '8px', marginBottom: '15px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
  
                                <strong style={{ fontSize: '15px' }}>{lang.flag} Tiếng {lang.name}</strong>

                                {/* BƯỚC 3: THAY THẾ LOGIC NÚT BẤM TẠI ĐÂY */}
                                {newRest[audioKey] ? (
                                  // NẾU ĐÃ CÓ AUDIO: Hiển thị nút Nghe thử (Dùng context 'studio' để tránh trùng với bản đồ)
                                  <button 
                                    type="button" 
                                    onClick={() => playAudio(newRest[audioKey], lang.code, 'studio')} 
                                    style={{ 
                                      background: audioUrl === `${lang.code}_studio` ? '#ff9800' : '#4CAF50', 
                                      color: 'white', border: 'none', padding: '6px 15px', borderRadius: '20px', 
                                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', 
                                      fontSize: '13px', fontWeight: 'bold' 
                                    }}
                                  >
                                    {audioUrl === `${lang.code}_studio` ? "⏹ Đang phát..." : "▶ Nghe Audio"}
                                  </button>
                                ) : (
                                  // NẾU CHƯA CÓ AUDIO: Hiển thị nút Tạo Audio độc lập
                                  <button 
                                    type="button" 
                                    onClick={() => generateSingleAudio(lang.code, lang.name)} 
                                    disabled={generatingAudioLang === lang.code}
                                    style={{ 
                                      background: generatingAudioLang === lang.code ? '#ccc' : '#2196F3', 
                                      color: 'white', border: 'none', padding: '6px 15px', borderRadius: '20px', 
                                      cursor: generatingAudioLang === lang.code ? 'wait' : 'pointer', 
                                      display: 'flex', alignItems: 'center', gap: '5px', 
                                      fontSize: '13px', fontWeight: 'bold' 
                                    }}
                                  >
                                    {generatingAudioLang === lang.code ? "⏳ Đang tạo..." : "🎙️ Tạo Audio"}
                                  </button>
                                )}

                              </div>
                                
                                {/* Khung Textarea cho phép Chủ quán tự sửa lỗi dịch của AI */}
                                <textarea
                                  value={newRest[textKey] || ""}
                                  onChange={(e) => setNewRest({...newRest, [textKey]: e.target.value})}
                                  style={{ ...styles.input, height: '80px', fontSize: '13px', background: '#f9f9f9' }}
                                  placeholder={`Nội dung dịch tiếng ${lang.name}...`}
                                />
                                <div style={{ fontSize: '11px', color: '#666', marginTop: '5px' }}>
                                  * Bạn có thể sửa thủ công văn bản này nếu AI dịch chưa sát nghĩa, sau đó tích chọn ngôn ngữ ở trên và bấm "Sinh AI" lại để tạo Audio mới.
                                </div>
                              </div>
                            );
                          })}
                          
                          {/* Hiển thị câu thông báo nếu quán chưa có bất kỳ dữ liệu nào */}
                          {LANGUAGES.every(lang => !newRest[lang.code === 'vi' ? 'description' : `description_${lang.code}`]) && (
                            <div style={{ textAlign: 'center', color: '#999', fontSize: '13px', padding: '20px' }}>
                              Chưa có nội dung nào được tạo. Hãy nhập Kịch bản gốc ở trên và bấm "Bắt Đầu Sinh AI".
                            </div>
                          )}
                        </div>
                     </div>
                   ) : (
                     <div style={{textAlign: 'center', color: '#999', paddingTop: '50px'}}>
                       <i>👈 Chọn một quán ăn bên trái để bắt đầu tạo Audio.</i>
                     </div>
                   )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PACKAGES */}
          {adminTab === "packages" && (
            <div style={{...styles.card, padding: '20px'}}>
              <h3 style={{marginTop: 0}}>🎁 Gói Đăng Ký Subscriptions</h3>
              <div style={{display: 'flex', gap: '15px', flexWrap: 'wrap'}}>
                {packages.map(pkg => (
                  <div key={pkg.id} style={{border: '1px solid #ddd', borderRadius: '8px', padding: '15px', width: '300px', background: '#f9f9f9'}}>
                     <h4 style={{margin: '0 0 10px 0', color: '#1976D2'}}>{pkg.name}</h4>
                     <p style={{fontSize: '18px', fontWeight: 'bold', margin: '5px 0'}}>{parseInt(pkg.price).toLocaleString()} VND / {pkg.duration_days} ngày</p>
                     <p style={{fontSize: '13px', color: '#666'}}>{pkg.description}</p>
                     <ul style={{fontSize: '13px', paddingLeft: '20px'}}>
                       {pkg.features && pkg.features.map((f, i) => <li key={i}>{f}</li>)}
                     </ul>
                     {user?.role === 'owner' && (
                        <button onClick={async () => {
                          try {
                            await axios.post('${API_URL}/api/owner/subscribe', {owner_id: user.id, package_id: pkg.id});
                            // 2. CẬP NHẬT MỚI: Lấy lại thông tin quyền hạn mới từ gói vừa mua
                            // Ta có thể dùng chính thông tin của gói (pkg) để cập nhật nhanh cho User state  
                            const updatedUser = {
                              ...user,
                              poi_limit: pkg.poi_limit,
                              allowed_langs: pkg.allowed_langs
                            };
                            // 3. Lưu vào State và LocalStorage để các Tab khác (Media, Quán ăn) nhận ngay lập tức
                            setUser(updatedUser);
                            localStorage.setItem("vinhkhanh_user", JSON.stringify(updatedUser));
                            alert(`Chúc mừng! Bạn đã nâng cấp lên gói ${pkg.name} thành công.`);
                          } catch(e) { alert("Lỗi khi mua gói!"); }
                        }} style={{width: '100%', padding: '10px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px'}}>
                          Đăng ký gói này
                        </button>
                     )}
                     {user?.role === 'admin' && (
                        <div style={{color: '#9e9e9e', fontSize: '12px', textAlign: 'center', marginTop: '10px'}}>Chế độ xem của Admin</div>
                     )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  // ==========================================
  // GIAO DIỆN 3: BẢN ĐỒ VÀ MÁY PHÁT NHẠC APP 
  // ==========================================
  return (
    <div style={{position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden'}}>
      
      <div style={styles.floatingHeader}>
        <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
          {user?.role === 'admin' && <button onClick={() => setAuthMode("admin")} style={{background: '#ff9800', border: 'none', color: 'white', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold'}}>⚙️ Admin</button>}
          {user?.role === 'owner' && <button onClick={() => setAuthMode("admin")} style={{background: '#4CAF50', border: 'none', color: 'white', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold'}}>🏪 My POI</button>}
          {user?.role === 'app' && <button onClick={() => { fetchHistory(); setShowSettings(true); }} style={{background: '#2196F3', border: 'none', color: 'white', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold'}}>⚙️ Cá nhân</button>}
          <button onClick={handleLogout} style={{background: 'transparent', border: '1px solid white', color: 'white', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'}}>Thoát</button>
        </div>
      </div>

      {/* USER SETTINGS MODAL */}
      {showSettings && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
           <div style={{background: 'white', padding: '20px', borderRadius: '8px', minWidth: '400px', maxHeight: '80vh', overflowY: 'auto'}}>
              <h2 style={{marginTop: 0, borderBottom: '2px solid #2196F3', paddingBottom: '10px'}}>⚙️ Cá nhân & Lịch sử</h2>
              
              <h4 style={{marginBottom: '5px'}}>🎧 Lịch sử nghe của bạn ({history?.length || 0} mục)</h4>
              <ul style={{fontSize: '13px', background: '#f5f5f5', padding: '10px', borderRadius: '5px', maxHeight: '150px', overflowY: 'auto', listStyle: 'none', margin: 0}}>
                {history?.map(h => (
                  <li key={h.id} style={{borderBottom: '1px solid #ddd', padding: '5px 0'}}>
                    <strong>{h.restaurant_name}</strong> - <span>{new Date(h.listened_at).toLocaleString()}</span> ({h.lang})
                  </li>
                ))}
                {(!history || history.length === 0) && <li>Bạn chưa nghe audio nào.</li>}
              </ul>

              <h4 style={{marginBottom: '5px'}}>🔧 Cài đặt mở rộng (Demo JSON)</h4>
              <textarea 
                value={JSON.stringify(user?.settings || {}, null, 2)} 
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    setUser({...user, settings: parsed});
                  } catch(err) { /* ignore parse error while typing */ }
                }}
                style={{width: '100%', height: '80px', fontFamily: 'monospace', fontSize: '12px'}}
              />
              <div style={{display: 'flex', gap: '10px', marginTop: '15px'}}>
                <button onClick={async () => {
                   await axios.put(`${API_URL}/api/user/settings/${user.id}`, { settings: user.settings });
                   alert("Đã lưu cài đặt"); setShowSettings(false);
                }} style={{padding: '8px 15px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', flex: 1}}>Lưu & Đóng</button>
                <button onClick={() => setShowSettings(false)} style={{padding: '8px 15px', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>Hủy</button>
              </div>
           </div>
        </div>
      )}

      {/* LANGUAGE SELECTOR */}
      <div style={styles.floatingLang}>
        {LANGUAGES.map(l => (
          <button key={l.code} onClick={() => { setLanguage(l.code); stopAudio(); }} style={language === l.code ? styles.langBtnActive : styles.langBtn}>
            <span style={{fontSize: '20px'}}>{l.flag}</span>
            <span style={{fontSize: '10px', display: 'block'}}>{l.name}</span>
          </button>
        ))}
      </div>

      <MapContainer center={mapCenter} zoom={15} style={{width: '100%', height: '100%'}}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
        <MapController center={mapCenter} />
        {/* ĐÂY CHÍNH LÀ ĐÔI MẮT NHÌN CÚ CLICK CỦA BẠN */}
        <MapClickHandler newRest={newRest} setNewRest={setNewRest} adminTab={adminTab} />
        {userLocation && <Marker position={userLocation} icon={blueIcon}><Popup>Bạn đang ở đây</Popup></Marker>}
        {/* Hiển thị Marker Tạm thời (Pin) khi đang thêm/sửa quán */}
        {(authMode === 'admin' && adminTab === 'restaurants') && (
          <Marker position={[newRest.lat, newRest.lng]} icon={blueIcon}>
            <Popup>📍 Vị trí bạn đang chọn cho quán</Popup>
          </Marker>
        )}
        {userLocation && <Marker position={userLocation} icon={blueIcon}><Popup>Bạn đang ở đây</Popup></Marker>}
        
        {restaurants.map(rest => {
          const transDesc = language === "vi" ? rest.description : rest[`description_${language}`];
          const hasAudio = !!rest[`audio_${language}`];
          
          return (
            <Marker key={rest.id} position={[parseFloat(rest.lat), parseFloat(rest.lng)]} icon={redIcon}>
              <Popup maxWidth={300} minWidth={250}>
                <div>
                  <h3 style={{margin: '0 0 5px 0', color: '#D32F2F'}}>{rest.name}</h3>
                  <div style={{fontStyle: 'italic', marginBottom: '8px', borderBottom: '1px solid #ccc', paddingBottom: '5px'}}>🍲 {rest.specialty_dish}</div>
                  {rest.image_url && <img src={rest.image_url} alt="Quán" style={{width: '100%', height: '120px', objectFit: 'cover', borderRadius: '4px', marginBottom: '8px'}} />}
                  
                  <div style={{maxHeight: '100px', overflowY: 'auto', marginBottom: '10px', fontSize: '13px'}}>
                    {transDesc ? transDesc : <i style={{color: '#999'}}>Nội dung đang được cập nhật cho ngôn ngữ này...</i>}
                  </div>

                  {/* MINI AUDIO PLAYER (THUYẾT MINH) */}
                  <div style={{background: '#f1f8e9', padding: '10px', borderRadius: '8px', border: '1px solid #c5e1a5', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                     <span style={{fontSize: '12px', fontWeight: 'bold', color: '#2e7d32'}}>🎧 Áp tai nghe Audio</span>
                     <button 
                       onClick={() => handlePlayAudioForUser(rest)}
                       style={{background: hasAudio ? (audioUrl === "playing" ? '#ff9800' : '#4CAF50') : '#ccc', color: 'white', border: 'none', borderRadius: '50%', width: '35px', height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: hasAudio ? 'pointer' : 'not-allowed'}}
                       title={hasAudio ? "Phát Thuyết Minh" : "Chưa có Audio ngôn ngữ này"}
                     >
                       {audioUrl === "playing" ? "⏹" : "▶"}
                     </button>
                  </div>

                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', padding: '20px', fontFamily: 'Arial' },
  card: { background: 'white', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', overflow: 'hidden' },
  statCard: { flex: 1, background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' },
  input: { width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' },
  label: { display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#555', marginBottom: '4px' },
  primaryBtn: { background: '#2196F3', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  secondaryBtn: { background: '#e0e0e0', color: '#333', border: 'none', padding: '10px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  iconBtn: { padding: '5px 10px', border: 'none', borderRadius: '4px', cursor: 'pointer', margin: '0 2px', fontSize: '12px' },
  th: { padding: '12px 10px', borderBottom: '2px solid #ddd' },
  td: { padding: '10px', borderBottom: '1px solid #eee' },
  adminTabActive: { background: '#2196F3', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' },
  adminTabInactive: { background: '#e0e0e0', color: '#555', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' },
  floatingHeader: { position: 'absolute', top: '10px', right: '10px', zIndex: 1000, background: 'rgba(0,0,0,0.7)', padding: '10px', borderRadius: '8px' },
  floatingLang: { position: 'absolute', top: '70px', right: '10px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: 'calc(100vh - 100px)', overflowY: 'auto', background: 'rgba(255,255,255,0.8)', padding: '5px', borderRadius: '8px' },
  langBtn: { background: 'white', border: '1px solid #ddd', borderRadius: '50%', width: '45px', height: '45px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  langBtnActive: { background: '#e3f2fd', border: '2px solid #2196F3', borderRadius: '50%', width: '45px', height: '45px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }
};
