import React, { useState } from "react";
import axios from "axios";
import { API_URL } from "../../config/constants";
import { MapPin, User, Lock, ArrowRight, Map } from "lucide-react";

export default function LoginScreen({ authMode, setAuthMode, setUser }) {
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");

  const isLogin = authMode === "login";

  // Hàm xử lý logic API (Giữ nguyên 100% bản gốc của bạn)
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError("");
    const endpoint = isLogin ? "/api/login" : "/api/register";
    try {
      const res = await axios.post(`${API_URL}${endpoint}`, { username: usernameInput, password: passwordInput });
      if (res.data.error) setAuthError(res.data.error);
      else {
        if (isLogin) {
          const userData = { 
            id: res.data.id, username: res.data.username, role: res.data.role, 
            token: res.data.token, settings: res.data.settings || {},
            poi_limit: res.data.poi_limit, allowed_langs: res.data.allowed_langs, package_id: res.data.package_id
          };
          setUser(userData); 
          localStorage.setItem("vinhkhanh_user", JSON.stringify(userData)); 
          setAuthMode("app");
        } else { 
          alert("Đăng ký thành công! Hãy đăng nhập lại."); 
          setAuthMode("login");
        }
      }
    } catch (err) { setAuthError("Lỗi kết nối máy chủ. Vui lòng thử lại."); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 font-sans">
      
      {/* Thẻ Card chính với hiệu ứng kính mờ (Glassmorphism) */}
      <div className="max-w-md w-full bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 overflow-hidden">
        
        <div className="p-8 sm:p-10">
          {/* Tiêu đề & Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-5 shadow-sm ring-4 ring-white">
              <MapPin className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-800 tracking-tight">
              {isLogin ? "Đăng Nhập" : "Tạo Tài Khoản"}
            </h2>
            <p className="text-gray-500 text-sm mt-2">
              {isLogin ? "Chào mừng bạn quay trở lại bản đồ" : "Đăng ký để mở khóa các tiện ích quản lý"}
            </p>
          </div>

          {/* Hiển thị lỗi */}
          {authError && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-lg font-medium animate-pulse">
              {authError}
            </div>
          )}

          {/* Form nhập liệu */}
          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tên tài khoản</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type="text"
                  required
                  value={usernameInput}
                  onChange={e => setUsernameInput(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-800 bg-gray-50/50 hover:bg-white"
                  placeholder="Nhập tên đăng nhập..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Mật khẩu</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type="password"
                  required
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-800 bg-gray-50/50 hover:bg-white"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex justify-center items-center gap-2 py-3.5 px-4 mt-2 border border-transparent rounded-xl shadow-lg shadow-blue-500/30 text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all font-bold text-base hover:-translate-y-0.5"
            >
              {isLogin ? "Đăng Nhập Ngay" : "Hoàn Tất Đăng Ký"}
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>

        {/* Khu vực Footer chuyển hướng */}
        <div className="px-8 py-6 bg-gray-50/80 border-t border-gray-100 flex flex-col gap-4 items-center">
          <button
            type="button"
            onClick={() => { setAuthMode(isLogin ? "register" : "login"); setAuthError(""); }}
            className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
          >
            {isLogin ? "Chưa có tài khoản? Đăng ký tại đây" : "Đã có tài khoản? Quay lại đăng nhập"}
          </button>

          <button
            type="button"
            onClick={() => { setAuthError(""); setAuthMode("app"); }}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors bg-white px-5 py-2.5 rounded-full shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300"
          >
            <Map className="w-4 h-4 text-emerald-500" />
            Vào thẳng bản đồ (Khách vãng lai)
          </button>
        </div>
      </div>
    </div>
  );
}