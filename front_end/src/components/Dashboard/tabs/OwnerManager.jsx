import React, { useState } from "react";
import axios from "axios";
import { 
  UserPlus, ShieldCheck, Briefcase, Trash2, 
  Edit3, X, Save, User, Package as PackageIcon 
} from "lucide-react";
import { API_URL } from "../../../config/constants";

export default function OwnerManager({ user, usersList, restaurants, packages, fetchUsers }) {
  const [newOwnerForm, setNewOwnerForm] = useState({ username: "", password: "", package_id: "" });
  const [editingOwner, setEditingOwner] = useState(null);

  const handleAddOwner = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/api/admin/owners`, {
        username: newOwnerForm.username,
        password: newOwnerForm.password,
        package_id: parseInt(newOwnerForm.package_id),
        role: 'owner'
      });
      if (res.data.error) return alert(res.data.error);
      alert("✅ Đã tạo tài khoản Chủ Quán thành công!");
      setNewOwnerForm({ username: "", password: "", package_id: "" });
      fetchUsers();
    } catch (err) { alert("Lỗi khi tạo chủ quán."); }
  };

  const handleEditClick = (usr) => {
    const ownedRests = restaurants.filter(r => r.owner_id === usr.id).map(r => r.id);
    setEditingOwner({ ...usr, newPassword: "", package_id: usr.package_id || "", owned_restaurant_ids: ownedRests });
  };

  const handleSaveOwnerChanges = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.put(`${API_URL}/api/admin/owners/${editingOwner.id}`, {
        username: editingOwner.username,
        password: editingOwner.newPassword || "",
        package_id: editingOwner.package_id
      });
      if (res.data.error) return alert(res.data.error);
      alert("✅ Cập nhật thành công!");
      setEditingOwner(null);
      fetchUsers();
    } catch (err) { alert("Lỗi máy chủ."); }
  };

  const handleDeleteUser = async (id, username) => {
    if (window.confirm(`Xóa tài khoản "${username}"?`)) {
      await axios.delete(`${API_URL}/api/users/${id}`);
      fetchUsers();
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* 1. FORM THÊM CHỦ QUÁN */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-100">
            <UserPlus size={20} />
          </div>
          <div>
            <h3 className="font-black text-slate-800">Thêm Chủ Quán Mới</h3>
            <p className="text-xs text-slate-500 font-medium">Cấp tài khoản cho quản lý hệ thống</p>
          </div>
        </div>
        
        <div className="p-6">
          <form onSubmit={handleAddOwner} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                required 
                placeholder="Tên đăng nhập" 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                value={newOwnerForm.username} 
                onChange={e => setNewOwnerForm({...newOwnerForm, username: e.target.value})} 
              />
            </div>
            <div className="relative">
              <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                required 
                type="password" 
                placeholder="Mật khẩu" 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                value={newOwnerForm.password} 
                onChange={e => setNewOwnerForm({...newOwnerForm, password: e.target.value})} 
              />
            </div>
            <div className="relative">
              <PackageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <select 
                required 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none appearance-none"
                value={newOwnerForm.package_id} 
                onChange={e => setNewOwnerForm({...newOwnerForm, package_id: e.target.value})}
              >
                <option value="">Chọn gói cước</option>
                {packages.map(pkg => (<option key={pkg.id} value={pkg.id}>{pkg.name}</option>))}
              </select>
            </div>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition-all shadow-md shadow-blue-100 active:scale-95">
              Tạo Tài Khoản
            </button>
          </form>
        </div>
      </div>

      {/* 2. DANH SÁCH CHỦ QUÁN */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="bg-slate-100 p-2 rounded-xl text-slate-600">
                <Briefcase size={20} />
             </div>
             <h3 className="font-black text-slate-800 uppercase tracking-tight">Quản Lý Chủ Quán</h3>
          </div>
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            {usersList.filter(u => u.role === 'owner').length} Tài khoản
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[10px] uppercase tracking-widest font-black border-b border-slate-100">
                <th className="px-6 py-4">Tài Khoản</th>
                <th className="px-6 py-4">Gói Dịch Vụ</th>
                <th className="px-6 py-4">Sở Hữu</th>
                <th className="px-6 py-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {usersList.filter(u => u.role === 'owner').map((usr) => {
                const ownedRests = restaurants.filter(r => r.owner_id === usr.id);
                return (
                  <tr key={usr.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                          {usr.username[0]}
                        </div>
                        <span className="font-bold text-slate-700">{usr.username}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-black border border-emerald-100">
                        {usr.package_name || "Free"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-500 font-medium">{ownedRests.length} quán ăn</span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button 
                        onClick={() => handleEditClick(usr)} 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all text-xs font-bold"
                      >
                        <Edit3 size={14} /> Sửa
                      </button>
                      {usr.id !== user.id && (
                        <button 
                          onClick={() => handleDeleteUser(usr.id, usr.username)} 
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all text-xs font-bold"
                        >
                          <Trash2 size={14} /> Xóa
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. MODAL SỬA CHỦ QUÁN */}
      {editingOwner && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setEditingOwner(null)}></div>
          
          {/* Content */}
          <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">Cập Nhật</h3>
                  <p className="text-sm text-slate-500 font-medium italic">Chỉnh sửa tài khoản: {editingOwner.username}</p>
                </div>
                <button onClick={() => setEditingOwner(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSaveOwnerChanges} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Tên tài khoản</label>
                  <input 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    value={editingOwner.username} 
                    onChange={e => setEditingOwner({...editingOwner, username: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Mật khẩu mới</label>
                  <input 
                    type="password"
                    placeholder="Bỏ trống nếu giữ nguyên" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    value={editingOwner.newPassword} 
                    onChange={e => setEditingOwner({...editingOwner, newPassword: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Gói cước active</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
                    value={editingOwner.package_id} 
                    onChange={e => setEditingOwner({...editingOwner, package_id: parseInt(e.target.value) || ""})}
                  >
                    <option value="">-- Chưa có gói --</option>
                    {packages.map(pkg => (<option key={pkg.id} value={pkg.id}>{pkg.name}</option>))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-3xl transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2">
                    <Save size={18} /> Lưu Thay Đổi
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}