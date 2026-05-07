import React, { useState } from "react";
import { 
  LayoutDashboard, Users, Briefcase, MapPin, 
  Music, Gift, ArrowLeft, Menu, X, ChevronRight 
} from "lucide-react";

// IMPORT CÁC TABS ĐÃ TÁCH
import RestaurantManager from "./tabs/RestaurantManager";
import UserManager from "./tabs/UserManager";
import OwnerManager from "./tabs/OwnerManager";
import MediaStudio from "./tabs/MediaStudio";
import PackageManager from "./tabs/PackageManager";

export default function DashboardLayout({ 
  user, setAuthMode, setUser,
  restaurants, fetchRestaurants, 
  stats, usersList, fetchUsers, 
  packages, onlineCount, fetchPackages
}) {
  const [adminTab, setAdminTab] = useState("restaurants");
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  // Danh sách Menu dựa trên Role
  const menuItems = [
    { id: "owners", label: "Chủ Quán", icon: <Briefcase size={20}/>, show: user?.role === 'admin' },
    { id: "users", label: "Khách Hàng", icon: <Users size={20}/>, show: user?.role === 'admin' },
    { id: "restaurants", label: user?.role === 'owner' ? "Quán Của Tôi" : "Quán Ăn", icon: <MapPin size={20}/>, show: true },
    { id: "media", label: "Thuyết Minh", icon: <Music size={20}/>, show: true },
    { id: "packages", label: "Gói Đăng Ký", icon: <Gift size={20}/>, show: true },
  ];

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-sans">
      
      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 transition-all duration-300 shadow-sm ${isSidebarOpen ? 'w-64' : 'w-20'} flex flex-col`}>
        {/* Logo Section */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-50 overflow-hidden">
          <div className="bg-red-600 p-2 rounded-xl text-white shrink-0 shadow-lg shadow-red-200">
            <LayoutDashboard size={24} />
          </div>
          {isSidebarOpen && <span className="font-bold text-xl text-slate-800 truncate">Vinh Khanh</span>}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => item.show && (
            <button
              key={item.id}
              onClick={() => setAdminTab(item.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all group ${
                adminTab === item.id 
                ? 'bg-red-50 text-red-600 shadow-sm' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className={`${adminTab === item.id ? 'scale-110' : ''} transition-transform`}>{item.icon}</span>
              {isSidebarOpen && <span className="font-semibold text-sm truncate">{item.label}</span>}
              {adminTab === item.id && isSidebarOpen && <ChevronRight size={16} className="ml-auto" />}
            </button>
          ))}
        </nav>

        {/* Back to Map Button */}
        <div className="p-4 border-t border-slate-50">
          <button 
            onClick={() => setAuthMode("app")}
            className="w-full flex items-center gap-3 p-3 text-slate-500 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all"
          >
            <ArrowLeft size={20} />
            {isSidebarOpen && <span className="font-medium">Về Bản Đồ</span>}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        
        {/* HEADER */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">
              {isSidebarOpen ? <X size={20}/> : <Menu size={20}/>}
            </button>
            <h2 className="text-lg font-bold text-slate-800">
               {user?.role === 'admin' ? "⚙️ Hệ Thống Quản Trị" : "🏪 Bảng Điều Khiển"}
            </h2>
          </div>

          <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-800">{user?.username}</p>
                <span className="text-[10px] px-2 py-0.5 bg-slate-100 rounded-full text-slate-500 uppercase font-bold tracking-wider">
                  {user?.role}
                </span>
             </div>
             <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-red-600 to-pink-600 flex items-center justify-center text-white font-bold shadow-md shadow-red-200">
                {user?.username?.[0].toUpperCase()}
             </div>
          </div>
        </header>

        {/* TAB CONTENT */}
        <main className="p-8 max-w-7xl mx-auto w-full">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 min-h-[calc(100vh-160px)]">
            {adminTab === "restaurants" && (
              <RestaurantManager 
                user={user} usersList={usersList} 
                restaurants={restaurants} fetchRestaurants={fetchRestaurants} stats={stats} 
              />
            )}

            {adminTab === "users" && user?.role === 'admin' && (
              <UserManager 
                stats={stats} onlineCount={onlineCount} 
                usersList={usersList} fetchUsers={fetchUsers} 
              />
            )}

            {adminTab === "owners" && user?.role === 'admin' && (
              <OwnerManager 
                user={user} usersList={usersList} 
                restaurants={restaurants} packages={packages} fetchUsers={fetchUsers} 
              />
            )}

            {adminTab === "media" && (
              <MediaStudio 
                user={user} restaurants={restaurants} fetchRestaurants={fetchRestaurants} 
              />
            )}

            {adminTab === "packages" && (
              <PackageManager 
                user={user} setUser={setUser} packages={packages}   fetchPackages={fetchPackages}
              />
            )}
          </div>
        </main>

      </div>
    </div>
  );
}