import React, { useState, useEffect } from "react";
import axios from "axios";
import { QRCodeCanvas } from "qrcode.react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import { 
  MapPin, Search, PlusCircle, Save, QrCode, 
  Edit3, Trash2, Utensils, Navigation, X 
} from "lucide-react";
import "leaflet/dist/leaflet.css";
import { API_URL, defaultRest, redIcon, LANGUAGES } from "../../../config/constants";

// Map Controllers
function MapController({ center }) { 
  const map = useMap(); 
  useEffect(() => { if (center) map.flyTo(center, 16); }, [center, map]); 
  return null; 
}

function MapClickHandler({ newRest, setNewRest }) { 
  useMapEvents({ 
    click(e) { setNewRest({ ...newRest, lat: e.latlng.lat, lng: e.latlng.lng }); } 
  }); 
  return null; 
}

export default function RestaurantManager({ 
  user, usersList, restaurants, fetchRestaurants, stats 
}) {
  const [editingId, setEditingId] = useState(null);
  const [newRest, setNewRest] = useState({...defaultRest});
  const [searchQuery, setSearchQuery] = useState("");
  const [qrData, setQrData] = useState(null);

  const handleSearchAddress = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    try {
      const res = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
      if (res.data && res.data.length > 0) {
        setNewRest({ ...newRest, lat: parseFloat(res.data[0].lat), lng: parseFloat(res.data[0].lon) });
      } else alert("Không tìm thấy địa chỉ!");
    } catch (err) { alert("Lỗi tìm kiếm"); }
  };

  const handleSaveRestaurant = async (e) => {
    e.preventDefault();
    try {
      let dataToSend = { ...newRest };
      if (user?.role === 'owner') dataToSend.owner_id = user.id;

      const endpoint = editingId ? `/api/restaurants/${editingId}` : "/api/restaurants";
      const method = editingId ? axios.put : axios.post;
      const res = await method(`${API_URL}${endpoint}`, dataToSend);
      
      if (res.data.error) alert("Lỗi: " + res.data.error);
      else {
        alert("Thành công!");
        setEditingId(null);
        setNewRest({ ...defaultRest });
        fetchRestaurants(); 
      }
    } catch (err) { alert("Lỗi máy chủ!"); }
  };

  const displayedRestaurants = user?.role === 'owner' 
    ? restaurants.filter(r => r.owner_id === user.id) 
    : restaurants;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* 1. THỐNG KÊ NHANH */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-emerald-100 text-emerald-600 p-3 rounded-2xl">
            <Utensils size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tổng quán ăn</p>
            <h3 className="text-2xl font-black text-slate-800">{displayedRestaurants.length}</h3>
          </div>
        </div>
      </div>

      {/* 2. KHU VỰC BIÊN TẬP (FORM + MAP) */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 p-2 rounded-xl text-white shadow-lg shadow-red-100">
              {editingId ? <Edit3 size={20}/> : <PlusCircle size={20} />}
            </div>
            <h3 className="font-black text-slate-800 text-xl tracking-tight">
              {editingId ? "Cập nhật địa điểm" : "Thêm địa điểm mới"}
            </h3>
          </div>
          {editingId && (
            <button 
              onClick={() => {setEditingId(null); setNewRest({...defaultRest});}}
              className="text-xs font-bold text-red-600 hover:underline"
            >
              Hủy chỉnh sửa
            </button>
          )}
        </div>

        <form onSubmit={handleSaveRestaurant} className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* CỘT TRÁI: THÔNG TIN TEXT */}
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase ml-1">Tên quán ăn / POI</label>
              <input 
                required 
                placeholder="Ví dụ: Phở Vinh Khánh..." 
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all font-medium text-slate-700"
                value={newRest.name} 
                onChange={e=>setNewRest({...newRest, name: e.target.value})} 
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase ml-1">Đặc sản tiêu biểu</label>
              <input 
                required 
                placeholder="Nhập món ăn nổi tiếng nhất..." 
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all font-medium text-slate-700"
                value={newRest.specialty_dish} 
                onChange={e=>setNewRest({...newRest, specialty_dish: e.target.value})} 
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-3xl shadow-lg shadow-red-100 flex items-center justify-center gap-2 transition-all active:scale-95 mt-4"
            >
              <Save size={20} />
              {editingId ? "CẬP NHẬT THÔNG TIN" : "LƯU ĐỊA ĐIỂM MỚI"}
            </button>
          </div>

          {/* CỘT PHẢI: GHIM VỊ TRÍ */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Navigation size={18} className="text-blue-600" />
              <span className="text-sm font-bold text-slate-700">Xác định tọa độ (Latitude/Longitude)</span>
            </div>
            
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  placeholder="Nhập địa chỉ để tìm nhanh..." 
                  className="w-full pl-10 pr-4 py-2.5 bg-blue-50/50 border border-blue-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={searchQuery} 
                  onChange={e=>setSearchQuery(e.target.value)}
                />
              </div>
              <button 
                type="button" 
                onClick={handleSearchAddress}
                className="px-6 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
              >
                TÌM
              </button>
            </div>

            <div className="h-[280px] w-full rounded-3xl overflow-hidden border-4 border-white shadow-inner relative z-0">
               <MapContainer center={[newRest.lat || 10.7612, newRest.lng || 106.7055]} zoom={15} className="h-full w-full">
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <MapController center={[newRest.lat, newRest.lng]} />
                  <MapClickHandler newRest={newRest} setNewRest={setNewRest} />
                  <Marker position={[newRest.lat, newRest.lng]} icon={redIcon} />
               </MapContainer>
               <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold text-slate-600 shadow-sm z-[1000]">
                 LAT: {newRest.lat.toFixed(6)} | LNG: {newRest.lng.toFixed(6)}
               </div>
            </div>
          </div>
        </form>
      </div>

      {/* 3. BẢNG DANH SÁCH ĐỊA ĐIỂM */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
            <MapPin size={20} className="text-slate-400" />
            Dữ liệu địa điểm thực tế
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[10px] uppercase tracking-widest font-black border-b border-slate-100">
                <th className="px-8 py-4">Tên Quán Ăn</th>
                <th className="px-8 py-4">Đặc Sản</th>
                <th className="px-8 py-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {displayedRestaurants.map(rest => (
                <tr key={rest.id} className="hover:bg-slate-50/50 transition-all group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-black">
                        {rest.name[0]}
                      </div>
                      <span className="font-bold text-slate-700">{rest.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-sm text-slate-500 italic">
                    {rest.specialty_dish}
                  </td>
                  <td className="px-8 py-5 text-right space-x-2">
                    <button 
                      onClick={() => {setEditingId(rest.id); setNewRest(rest); window.scrollTo({top: 0, behavior: 'smooth'});}} 
                      className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                      title="Chỉnh sửa"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button 
                      onClick={() => setQrData(rest)} 
                      className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-800 hover:text-white transition-all shadow-sm"
                      title="Xuất mã QR"
                    >
                      <QrCode size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* POPUP QR CODE (GLASSMORPHISM) */}
      {qrData && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setQrData(null)}></div>
            <div className="relative bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-200 text-center w-full max-w-sm animate-in zoom-in-95 duration-300">
                <button 
                  onClick={() => setQrData(null)} 
                  className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full text-slate-400"
                >
                  <X size={24} />
                </button>
                
                <div className="bg-red-50 w-16 h-16 rounded-3xl flex items-center justify-center text-red-600 mx-auto mb-6 shadow-sm">
                  <QrCode size={32} />
                </div>
                
                <h3 className="text-2xl font-black text-slate-800 mb-2 leading-tight">Mã QR Địa Điểm</h3>
                <p className="text-sm font-medium text-slate-500 mb-8">{qrData.name}</p>
                
                <div className="bg-white p-6 rounded-[2rem] border-4 border-slate-50 inline-block shadow-inner mb-8">
                  <QRCodeCanvas 
                    value={`${window.location.origin}?restId=${qrData.id}`} 
                    size={220} 
                    level="H"
                    includeMargin={false}
                  />
                </div>
                
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-2">Quét để truy cập bản đồ</p>
                <div className="h-1 w-20 bg-slate-100 mx-auto rounded-full"></div>
            </div>
          </div>
      )}
    </div>
  );
}