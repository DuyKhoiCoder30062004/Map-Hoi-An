import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "./config/constants";

// Import 3 Component chính
import LoginScreen from "./components/Auth/LoginScreen";
import MapViewer from "./components/Map/MapViewer";
import DashboardLayout from "./components/Dashboard/DashboardLayout";

export default function App() {
  // 1. KHAI BÁO TOÀN BỘ STATE TỔNG
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("user");
  const [userLocation, setUserLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState([10.7612, 106.7055]);
  const [restaurants, setRestaurants] = useState([]);
  const [stats, setStats] = useState({ total_users: 0, total_restaurants: 0, total_visits: 0 });
  const [usersList, setUsersList] = useState([]);
  const [packages, setPackages] = useState([]);
  const [onlineCount, setOnlineCount] = useState(0);

  // 2. GIỮ LẠI CÁC HÀM FETCH DATA [cite: 56-60]
  const fetchRestaurants = async () => { 
    try {
      const res = await axios.get(`${API_URL}/api/nearby`); 
      // Chỉ cập nhật nếu dữ liệu trả về đúng là một mảng
      if (Array.isArray(res.data)) {
        setRestaurants(res.data); 
      } else {
        console.warn("API không trả về mảng:", res.data);
        setRestaurants([]); // Ép về mảng rỗng để không bị lỗi
      }
    } catch (error) {
      console.error("Lỗi khi tải quán ăn:", error);
      setRestaurants([]); // Nếu API sập, cũng ép về mảng rỗng
    }
  };

  const fetchStats = async () => { 
    try { 
      const res = await axios.get(`${API_URL}/api/stats`);
      setStats(res.data); 
    } catch(e) {} 
  };

  const fetchPackages = async () => {
    try { 
      const res = await axios.get(`${API_URL}/api/admin/packages`);
      setPackages(res.data); 
    } catch(e) {} 
  };

  const fetchUsers = async () => {
    try { 
      const res = await axios.get(`${API_URL}/api/users`); 
      setUsersList(res.data); 
    } catch(e) {} 
  };

  // 3. GIỮ LẠI USEEFFECT CHẠY GPS & LẤY DATA [cite: 36-45]
  useEffect(() => {
    const savedUser = localStorage.getItem("vinhkhanh_user");
    if (savedUser) { setUser(JSON.parse(savedUser)); setAuthMode("app"); }
  }, []);



  useEffect(() => {
    fetchRestaurants();
    if (authMode === "admin") { fetchStats(); fetchUsers(); fetchPackages(); }
    
    // GPS Tracking
    let watchId;
    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setUserLocation([pos.coords.latitude, pos.coords.longitude]);
          if (!userLocation) setMapCenter([pos.coords.latitude, pos.coords.longitude]);
        },
        (error) => console.error(error),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    }
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, [authMode]);

  /// Đếm người online và gửi Heartbeat
  useEffect(() => {
    const sendHeartbeat = async () => {
      try {
        let guestId = localStorage.getItem("guest_id") || "guest_" + Math.random().toString(36).substring(2, 11);
        localStorage.setItem("guest_id", guestId);
        
        // 1. Gọi GET kèm Header
        if (authMode === "admin" || authMode === "app") {
          const res = await axios.get(`${API_URL}/api/admin/online-count`);
          setOnlineCount(res.data.online_count);
        }
        
        // 2. Gọi POST kèm Header
        await axios.post(
          `${API_URL}/api/users/heartbeat`, 
          { user_id: user?.id || null, guest_id: user?.id ? null : guestId }
        );
      } catch (e) {}
    };

    sendHeartbeat(); // Gọi ngay lập tức khi mount
    const interval = setInterval(sendHeartbeat, 5000);
    
    return () => clearInterval(interval);
  }, [authMode, user]);

  const handleLogout = () => { 
    localStorage.removeItem("vinhkhanh_user"); 
    setUser(null); 
    setAuthMode("login"); 
  };

  // 4. RENDER GIAO DIỆN CHÍNH
  if (authMode === "login" || authMode === "register") {
    return <LoginScreen authMode={authMode} setAuthMode={setAuthMode} setUser={setUser} />;
  }

  if (authMode === "admin" && (user?.role === "admin" || user?.role === "owner")) {
    return (
      <DashboardLayout 
        user={user} setAuthMode={setAuthMode} setUser={setUser}
        restaurants={restaurants} fetchRestaurants={fetchRestaurants}
        stats={stats} usersList={usersList} fetchUsers={fetchUsers}
        packages={packages} onlineCount={onlineCount} fetchPackages={fetchPackages}
      />
    );
  }

  return (
    <MapViewer 
      user={user} setAuthMode={setAuthMode} handleLogout={handleLogout}
      restaurants={restaurants} userLocation={userLocation} mapCenter={mapCenter}
    />
  );
}