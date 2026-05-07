import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import axios from "axios";
import { 
  User, Shield, Store, Settings, LogOut, 
  LogIn, Volume2, Square, Navigation, MapPin, 
  History, Globe, ChevronRight 
} from "lucide-react";
import "leaflet/dist/leaflet.css";
import { API_URL, redIcon, blueIcon, LANGUAGES } from "../../config/constants";

// Component con điều khiển Camera
function MapController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 16, { animate: true, duration: 1.5 });
  }, [center, map]);
  return null;
}

// Component tự động mở Popup từ QR Code
function QRController({ restaurants, markerRefs }) {
  const map = useMap();
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const qrRestId = urlParams.get('restId');
    if (restaurants?.length > 0 && qrRestId) {
      const rest = restaurants.find(r => r.id === parseInt(qrRestId));
      if (rest) {
        // Di chuyển bản đồ đến vị trí quán
        map.flyTo([parseFloat(rest.lat), parseFloat(rest.lng)], 18, { animate: true, duration: 1.5 });
        
        // Đợi một chút cho map tải xong rồi mở popup
        setTimeout(() => {
          if (markerRefs.current[rest.id]) {
            markerRefs.current[rest.id].openPopup();
          }
        }, 1000);
      }
    }
  }, [restaurants, map, markerRefs]);
  return null;
}

export default function MapViewer({ 
  user, setAuthMode, handleLogout, 
  restaurants, userLocation, mapCenter 
}) {
  const [language, setLanguage] = useState("vi");
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [history, setHistory] = useState([]);
  
  const audioSourceRef = useRef(null);
  const markerRefs = useRef({});
  const [autoOpenedRestId, setAutoOpenedId] = useState(null);

  // --- LẤY LỊCH SỬ ---
  const fetchHistory = async () => { 
    if(user?.id) { 
      try { 
        const res = await axios.get(`${API_URL}/api/user/history/${user.id}`); 
        setHistory(res.data);
      } catch(e){} 
    } 
  };

  // --- LOGIC PHÁT AUDIO ---
  const stopAudio = () => {
    if (audioSourceRef.current) { 
      try { audioSourceRef.current.pause(); } catch(e){} 
      audioSourceRef.current = null; 
    }
    setAudioUrl(null);
  };

  const playAudio = (base64Data) => {
    try {
      if (!base64Data || base64Data.length < 50) return alert("Âm thanh chưa sẵn sàng!");
      stopAudio(); 
      const audio = new Audio("data:audio/mp3;base64," + base64Data);
      audio.onended = () => setAudioUrl(null); 
      audioSourceRef.current = audio; 
      audio.play();
      setAudioUrl("playing");
    } catch (err) { alert("Lỗi âm thanh."); }
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
      alert("Audio ngôn ngữ này đang được cập nhật!");
    }
  };

  // --- LOGIC KHOẢNG CÁCH ---
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const p1 = lat1 * Math.PI/180;
    const p2 = lat2 * Math.PI/180;
    const deltaP = (lat2 - lat1) * Math.PI/180;
    const deltaLon = (lon2 - lon1) * Math.PI/180;
    const a = Math.sin(deltaP/2) * Math.sin(deltaP/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  };

  useEffect(() => {
    if (!userLocation || !restaurants?.length) return;
    let closestRest = null;
    let minDistance = Infinity;

    restaurants.forEach(rest => {
      const dist = calculateDistance(userLocation[0], userLocation[1], parseFloat(rest.lat), parseFloat(rest.lng));
      if (dist <= 30 && dist < minDistance) {
        minDistance = dist;
        closestRest = rest;
      }
    });

    if (closestRest && autoOpenedRestId !== closestRest.id) {
      setSelectedRestaurant(closestRest); 
      setAutoOpenedId(closestRest.id);    
      
      // Mở popup tự động khi đến gần
      if (markerRefs.current[closestRest.id]) {
        markerRefs.current[closestRest.id].openPopup();
      }
    } else if (!closestRest) {
      setAutoOpenedId(null);
    }
  }, [userLocation, restaurants]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-900 font-sans">
      
      {/* 1. TOP HEADER OVERLAY */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex justify-between items-start pointer-events-none">
        {/* Logo / Title */}
        <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl border border-white/20 pointer-events-auto flex items-center gap-3">
          <div className="bg-red-600 p-1.5 rounded-lg text-white">
            <Navigation size={20} fill="currentColor" />
          </div>
          <h1 className="font-black text-slate-800 tracking-tighter text-lg hidden sm:block">VinhKhanh Food</h1>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pointer-events-auto">
          {!user ? (
            <button 
              onClick={() => setAuthMode("login")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-2xl shadow-lg flex items-center gap-2 font-bold transition-all active:scale-95"
            >
              <LogIn size={18} /> <span className="hidden sm:inline">Đăng nhập</span>
            </button>
          ) : (
            <div className="flex gap-2">
              {user.role === 'admin' && (
                <button onClick={() => setAuthMode("admin")} className="p-3 bg-orange-500 text-white rounded-2xl shadow-lg hover:bg-orange-600 transition-all">
                  <Shield size={20} />
                </button>
              )}
              {user.role === 'owner' && (
                <button onClick={() => setAuthMode("admin")} className="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg hover:bg-emerald-600 transition-all">
                  <Store size={20} />
                </button>
              )}
              <button 
                onClick={() => { fetchHistory(); setShowSettings(true); }}
                className="p-3 bg-white/90 backdrop-blur-md text-slate-700 rounded-2xl shadow-lg border border-white/20 hover:bg-white transition-all"
              >
                <Settings size={20} />
              </button>
              <button 
                onClick={handleLogout}
                className="p-3 bg-white/90 backdrop-blur-md text-red-500 rounded-2xl shadow-lg border border-white/20 hover:bg-red-50 transition-all"
              >
                <LogOut size={20} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. LANGUAGE PICKER (RIGHT SIDE) */}
      <div className="absolute right-4 top-24 z-[1000] flex flex-col gap-3">
        <div className="bg-white/80 backdrop-blur-md p-2 rounded-3xl shadow-2xl border border-white/40 flex flex-col gap-2">
          <div className="p-2 text-slate-400 flex justify-center">
            <Globe size={18} />
          </div>
          <div className="max-h-[60vh] overflow-y-auto no-scrollbar space-y-2 py-1">
            {LANGUAGES.map(l => (
              <button 
                key={l.code} 
                onClick={() => { setLanguage(l.code); stopAudio(); }}
                className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all shadow-sm relative group ${
                  language === l.code 
                  ? 'bg-blue-600 scale-110 ring-4 ring-blue-100 ring-offset-2' 
                  : 'bg-white hover:bg-slate-50'
                }`}
              >
                {l.flag}
                {language === l.code && <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-4 bg-blue-600 rounded-r-full" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. BẢN ĐỒ CHÍNH */}
      <MapContainer center={mapCenter} zoom={15} className="w-full h-full z-0" zoomControl={false}>
        <TileLayer 
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
          attribution='&copy; OpenStreetMap' 
        />
        <MapController center={mapCenter} />
        <QRController restaurants={restaurants} markerRefs={markerRefs} />
        
        {userLocation && (
          <Marker position={userLocation} icon={blueIcon}>
            <Popup className="custom-popup">
              <div className="text-center font-bold text-blue-600 p-1">Vị trí của bạn</div>
            </Popup>
          </Marker>
        )}
        
        {restaurants.map(rest => {
          const hasAudio = !!rest[`audio_${language}`];
          const isPlaying = audioUrl === "playing";

          return (
            <Marker 
              key={rest.id} 
              position={[parseFloat(rest.lat), parseFloat(rest.lng)]} 
              icon={redIcon}
              ref={(m) => { if (m) markerRefs.current[rest.id] = m; }}
            >
              <Popup maxWidth={300} className="modern-popup">
                <div className="p-1 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-red-50 p-2 rounded-lg text-red-600">
                      <MapPin size={18} />
                    </div>
                    <h3 className="font-black text-slate-800 m-0 text-base leading-tight">{rest.name}</h3>
                  </div>
                  
                  <p className="text-slate-500 italic text-xs mb-4 px-1 leading-relaxed">
                    "{rest.specialty_dish}"
                  </p>
                  
                  <button 
                    onClick={() => handlePlayAudioForUser(rest)}
                    disabled={!hasAudio}
                    className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 font-black text-xs transition-all shadow-md active:scale-95 ${
                      hasAudio 
                        ? (isPlaying ? 'bg-orange-500 text-white animate-pulse' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200') 
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {isPlaying ? (
                      <><Square size={14} fill="white" /> ĐANG PHÁT...</>
                    ) : (
                      <><Volume2 size={14} /> NGHE THUYẾT MINH</>
                    )}
                  </button>

                  {!hasAudio && (
                    <p className="text-[10px] text-red-400 mt-2 text-center font-bold">
                      ⚠️ Ngôn ngữ này chưa có Audio
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* 4. MODAL LỊCH SỬ / CÁ NHÂN (NẾU CẦN) */}
      {showSettings && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowSettings(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8">
               <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                    <History className="text-blue-600" /> Hành trình
                  </h3>
                  <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-100 rounded-full">
                    <X size={24} />
                  </button>
               </div>
               
               <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2">
                 {history.length > 0 ? history.map((item, idx) => (
                   <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-lg text-slate-400"><MapPin size={16}/></div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{item.restaurant_name}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{item.visited_at}</p>
                        </div>
                      </div>
                      <span className="text-xl opacity-50">{LANGUAGES.find(l=>l.code===item.lang)?.flag}</span>
                   </div>
                 )) : (
                   <div className="text-center py-10 text-slate-400 italic">Chưa có lịch sử tham quan.</div>
                 )}
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Thêm một chút CSS global để fix các Popup của Leaflet cho đẹp
const style = document.createElement('style');
style.innerHTML = `
  .modern-popup .leaflet-popup-content-wrapper {
    border-radius: 1.5rem !important;
    padding: 4px !important;
    box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1) !important;
  }
  .modern-popup .leaflet-popup-tip {
    background: white !important;
  }
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
`;
document.head.appendChild(style);