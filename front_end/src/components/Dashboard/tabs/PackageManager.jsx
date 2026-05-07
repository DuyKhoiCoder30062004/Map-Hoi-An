import React, { useState } from "react";
import axios from "axios";
import { 
  PlusCircle, Edit3, Trash2, Save, X, 
  CheckCircle2, Package as PackageIcon, 
  DollarSign, Clock, ListPlus 
} from "lucide-react";
import { API_URL } from "../../../config/constants";

export default function PackageManager({ user, setUser, packages, fetchPackages }) {
  // State quản lý Form (dùng chung cho cả Thêm và Sửa)
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    duration_days: "",
    description: "",
    features: [""] // Bắt đầu với 1 dòng tính năng trống
  });

  // --- LOGIC XỬ LÝ FEATURES (MẢNG) ---
  const handleFeatureChange = (index, value) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData({ ...formData, features: newFeatures });
  };

  const addFeatureInput = () => {
    setFormData({ ...formData, features: [...formData.features, ""] });
  };

  const removeFeatureInput = (index) => {
    const newFeatures = formData.features.filter((_, i) => i !== index);
    setFormData({ ...formData, features: newFeatures });
  };

  // --- LOGIC CRUD ---
  const handleSavePackage = async (e) => {
    e.preventDefault();
    try {
      const endpoint = editingId ? `/api/admin/packages/${editingId}` : "/api/admin/packages";
      const method = editingId ? axios.put : axios.post;
      
      const res = await method(`${API_URL}${endpoint}`, formData);
      
      if (res.data.error) alert("Lỗi: " + res.data.error);
      else {
        alert("Lưu gói thành công!");
        resetForm();
        if (fetchPackages) fetchPackages(); // Tải lại danh sách gói từ server
      }
    } catch (err) { alert("Lỗi máy chủ khi lưu gói."); }
  };

  const handleDeletePackage = async (id, name) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa gói "${name}" không?`)) {
      try {
        await axios.delete(`${API_URL}/api/admin/packages/${id}`);
        if (fetchPackages) fetchPackages();
      } catch (err) { alert("Lỗi khi xóa gói."); }
    }
  };

  const startEdit = (pkg) => {
    setEditingId(pkg.id);
    setFormData({
      name: pkg.name,
      price: pkg.price,
      duration_days: pkg.duration_days,
      description: pkg.description,
      features: pkg.features || [""]
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: "", price: "", duration_days: "", description: "", features: [""] });
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      
      {/* 1. FORM THÊM / SỬA (Chỉ Admin mới thấy) */}
      {user?.role === 'admin' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-100">
                {editingId ? <Edit3 size={20}/> : <PlusCircle size={20} />}
              </div>
              <h3 className="font-black text-slate-800 text-xl tracking-tight">
                {editingId ? "Cập nhật Gói dịch vụ" : "Thiết lập Gói mới"}
              </h3>
            </div>
          </div>

          <form onSubmit={handleSavePackage} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Tên gói</label>
                <div className="relative">
                  <PackageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input required className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ví dụ: Gói Premium..." />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Giá (VND)</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input required type="number" className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="500000" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Thời hạn (Ngày)</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input required type="number" className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    value={formData.duration_days} onChange={e => setFormData({...formData, duration_days: e.target.value})} placeholder="30" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Mô tả ngắn</label>
              <textarea className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl h-20 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>

            {/* QUẢN LÝ DANH SÁCH TÍNH NĂNG */}
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex justify-between">
                Danh sách tính năng đi kèm
                <button type="button" onClick={addFeatureInput} className="text-blue-600 flex items-center gap-1 hover:underline">
                  <ListPlus size={14} /> Thêm dòng
                </button>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {formData.features.map((feature, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input className="flex-1 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm"
                      value={feature} onChange={e => handleFeatureChange(idx, e.target.value)} placeholder="VD: Hỗ trợ 24/7..." />
                    <button type="button" onClick={() => removeFeatureInput(idx)} className="p-2 text-slate-300 hover:text-red-500">
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button type="submit" className="flex-1 bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                <Save size={20} /> {editingId ? "CẬP NHẬT GÓI" : "TẠO GÓI DỊCH VỤ"}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} className="px-8 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all">
                  Hủy
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* 2. DANH SÁCH GÓI HIỆN TẠI (DẠNG CARD NHƯ CŨ) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {packages.map((pkg) => (
          <div key={pkg.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col relative group overflow-hidden">
            <h4 className="text-xl font-black text-slate-800 mb-2">{pkg.name}</h4>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-3xl font-black text-blue-600">{parseInt(pkg.price).toLocaleString()}</span>
              <span className="text-xs font-bold text-slate-400">VND</span>
            </div>
            
            <div className="flex-1 space-y-3 mb-8">
              {pkg.features?.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                  <CheckCircle2 size={16} className="text-emerald-500" /> {f}
                </div>
              ))}
            </div>

            {/* NÚT ĐIỀU KHIỂN DÀNH CHO ADMIN */}
            {user?.role === 'admin' && (
              <div className="flex gap-2 pt-4 border-t border-slate-50 mt-auto">
                <button onClick={() => startEdit(pkg)} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-50 text-blue-600 rounded-xl font-bold hover:bg-blue-100 transition-all">
                  <Edit3 size={16} /> Sửa
                </button>
                <button onClick={() => handleDeletePackage(pkg.id, pkg.name)} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                  <Trash2 size={18} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}