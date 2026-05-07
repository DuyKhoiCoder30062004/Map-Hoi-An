import React, { useState } from "react";
import axios from "axios";
import { 
  Users, Activity, Zap, Key, UserPlus, 
  Trash2, ShieldAlert, CheckCircle2, X 
} from "lucide-react";
import { API_URL } from "../../../config/constants";

export default function UserManager({ stats, onlineCount, usersList, fetchUsers }) {
  const [editingUserId, setEditingUserId] = useState(null);
  const [newUserForm, setNewUserForm] = useState({ username: "", password: "", role: "app" });

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      const endpoint = editingUserId ? `/api/users/${editingUserId}` : "/api/users";
      const method = editingUserId ? axios.put : axios.post;
      const res = await method(`${API_URL}${endpoint}`, newUserForm);
      
      if (res.data.error) alert("Lỗi: " + res.data.error);
      else {
        alert("Thành công!");
        setEditingUserId(null);
        setNewUserForm({ username: "", password: "", role: "app" });
        fetchUsers(); 
      }
    } catch (err) { alert("Lỗi kết nối máy chủ!"); }
  };

  const handleEditUserClick = (usr) => {
    setEditingUserId(usr.id);
    setNewUserForm({ username: usr.username, password: "", role: "app" });
  };

  const handleDeleteUser = async (id, username) => {
    if (window.confirm(`Xóa tài khoản "${username}"?`)) { 
      await axios.delete(`${API_URL}/api/users/${id}`);
      fetchUsers(); 
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* 1. THỐNG KÊ HOẠT ĐỘNG */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="bg-orange-100 text-orange-600 p-4 rounded-2xl">
            <Activity size={28} />
          </div>
          <div>
            <h3 className="text-3xl font-black text-slate-800 tracking-tighter">{stats.total_visits}</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Zap size={12} className="text-orange-400" /> Lượt truy cập hệ thống
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="bg-purple-100 text-purple-600 p-4 rounded-2xl">
            <Users size={28} />
          </div>
          <div>
            <h3 className="text-3xl font-black text-purple-600 tracking-tighter">{onlineCount}</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Người dùng đang Online
            </p>
          </div>
        </div>
      </div>

      {/* 2. FORM QUẢN LÝ TÀI KHOẢN */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl text-white ${editingUserId ? 'bg-orange-500' : 'bg-emerald-500'}`}>
              {editingUserId ? <Key size={20} /> : <UserPlus size={20} />}
            </div>
            <h3 className="font-black text-slate-800 tracking-tight">
              {editingUserId ? "Đổi Mật Khẩu Tài Khoản" : "Thêm Khách Hàng Mới"}
            </h3>
          </div>
          {editingUserId && (
            <button 
              onClick={() => {setEditingUserId(null); setNewUserForm({username:"", password:"", role:"app"});}}
              className="p-2 hover:bg-red-50 text-red-500 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>
        
        <div className="p-6">
          <form onSubmit={handleSaveUser} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input 
                required 
                placeholder="Tên đăng nhập" 
                className={`w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:bg-white focus:ring-2 transition-all outline-none ${editingUserId ? 'opacity-50 cursor-not-allowed' : 'focus:ring-emerald-500'}`}
                value={newUserForm.username} 
                onChange={e=>setNewUserForm({...newUserForm, username: e.target.value})} 
                disabled={!!editingUserId} 
              />
            </div>
            <div className="flex-1">
              <input 
                required={!editingUserId} 
                type="password" 
                placeholder={editingUserId ? "Nhập mật khẩu mới" : "Mật khẩu"} 
                className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                value={newUserForm.password} 
                onChange={e=>setNewUserForm({...newUserForm, password: e.target.value})} 
              />
            </div>
            <button 
              type="submit" 
              className={`px-8 py-3 rounded-2xl font-black text-sm text-white shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
                editingUserId 
                ? 'bg-orange-500 shadow-orange-100 hover:bg-orange-600' 
                : 'bg-emerald-600 shadow-emerald-100 hover:bg-emerald-700'
              }`}
            >
              {editingUserId ? <ShieldAlert size={18} /> : <CheckCircle2 size={18} />}
              {editingUserId ? "CẬP NHẬT" : "THÊM USER"}
            </button>
          </form>
        </div>
      </div>

      {/* 3. DANH SÁCH USER */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs flex items-center gap-2">
            <Users size={16} className="text-slate-400" /> 
            Danh sách khách hàng ứng dụng
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[10px] uppercase tracking-[0.2em] font-black border-b border-slate-100">
                <th className="px-8 py-4 w-20">Thứ tự</th>
                <th className="px-8 py-4">Tên Tài Khoản</th>
                <th className="px-8 py-4 text-right">Quản lý</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {usersList.filter(u => u.role === 'app').map((usr, index) => (
                <tr key={usr.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-4 text-slate-400 font-mono">
                    {String(index + 1).padStart(2, '0')}
                  </td>
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-[10px] group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                        {usr.username[0].toUpperCase()}
                      </div>
                      <span className="font-bold text-slate-700">{usr.username}</span>
                    </div>
                  </td>
                  <td className="px-8 py-4 text-right space-x-2">
                    <button 
                      onClick={() => handleEditUserClick(usr)} 
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all text-xs font-bold"
                    >
                      Sửa MK
                    </button>
                    <button 
                      onClick={() => handleDeleteUser(usr.id, usr.username)} 
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all text-xs font-bold"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}