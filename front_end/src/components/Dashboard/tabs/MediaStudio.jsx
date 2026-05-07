import React, { useState, useRef } from "react";
import axios from "axios";
import { 
  Search, Mic, Languages, Play, Square, 
  Sparkles, CheckCircle2, ChevronRight, Music, AlertCircle 
} from "lucide-react";
import { API_URL, LANGUAGES, defaultRest } from "../../../config/constants";

export default function MediaStudio({ user, restaurants, fetchRestaurants }) {
  const [mediaSearchQuery, setMediaSearchQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [newRest, setNewRest] = useState({ ...defaultRest });
  const [selectedLangs, setSelectedLangs] = useState(["en", "zh", "ko", "ja"]);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [generatingAudioLang, setGeneratingAudioLang] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);

  const audioSourceRef = useRef(null);

  const stopAudio = () => {
    if (audioSourceRef.current) {
      audioSourceRef.current.pause();
      audioSourceRef.current = null;
    }
    setAudioUrl(null);
  };

  const playAudio = (base64Data, langCode) => {
    if (!base64Data) return;
    stopAudio();
    const audio = new Audio("data:audio/mp3;base64," + base64Data);
    audio.onended = () => setAudioUrl(null);
    audioSourceRef.current = audio;
    audio.play();
    setAudioUrl(`${langCode}_studio`);
  };

  const autoGenerateContent = async () => {
    if (!newRest.description) return alert("Vui lòng nhập Kịch bản Tiếng Việt!");
    setIsGeneratingAll(true);
    let workingRest = { ...newRest };
    try {
      const transRes = await axios.post(`${API_URL}/api/translate`, 
        { text: workingRest.description,
        target_languages: selectedLangs, },
      );
      for (const lang of selectedLangs) {
        if (transRes.data[lang]) workingRest[`description_${lang}`] = transRes.data[lang];
      }
      setNewRest({ ...workingRest });
    } catch (err) {
      alert("Lỗi dịch thuật");
    } finally {
      setIsGeneratingAll(false);
    }
  };

  const generateSingleAudio = async (langCode, langName) => {
    const textKey = langCode === "vi" ? "description" : `description_${langCode}`;
    const textToSpeak = newRest[textKey];
    if (!textToSpeak) return alert("Chưa có nội dung text!");
    setGeneratingAudioLang(langCode);
    try {
      const res = await axios.post(`${API_URL}/api/tts`, { text: textToSpeak });
      if (res.data.audio_base64)
        setNewRest((prev) => ({ ...prev, [`audio_${langCode}`]: res.data.audio_base64 }));
    } catch (err) {
      alert("Lỗi tạo Audio");
    } finally {
      setGeneratingAudioLang(null);
    }
  };

  const handleEditClick = (rest) => {
    setEditingId(rest.id);
    const editState = { ...defaultRest };
    Object.keys(defaultRest).forEach((k) => {
      if (rest[k] !== undefined && rest[k] !== null) editState[k] = rest[k];
    });
    setNewRest(editState);
  };

  const displayedRestaurants =
    user?.role === "owner" ? restaurants.filter((r) => r.owner_id === user.id) : restaurants;

    const toggleLanguage = (langCode) => {
  if (selectedLangs.includes(langCode)) {
    // Nếu đang chọn thì bỏ chọn (nhưng giữ lại ít nhất 1 ngôn ngữ)
    if (selectedLangs.length > 1) {
      setSelectedLangs(selectedLangs.filter(l => l !== langCode));
    }
  } else {
    // Nếu chưa chọn thì thêm vào
    setSelectedLangs([...selectedLangs, langCode]);
  }
};
  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in duration-500">
      
      {/* CỘT TRÁI: DANH SÁCH QUÁN */}
      <div className="lg:w-1/3 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
            <Music className="text-red-600" size={20} />
            Danh sách địa điểm
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              placeholder="Tìm nhanh quán..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 transition-all outline-none"
              value={mediaSearchQuery}
              onChange={(e) => setMediaSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {displayedRestaurants
            .filter((r) => r.name.toLowerCase().includes(mediaSearchQuery.toLowerCase()))
            .map((rest) => (
              <button
                key={rest.id}
                onClick={() => handleEditClick(rest)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all group ${
                  editingId === rest.id
                    ? "bg-red-50 text-red-700 shadow-sm border border-red-100"
                    : "bg-white text-slate-600 hover:bg-slate-50 border border-transparent"
                }`}
              >
                <div className="flex flex-col items-start overflow-hidden">
                  <span className="font-bold truncate w-full">{rest.name}</span>
                  <span className="text-xs opacity-60 truncate w-full">{rest.address}</span>
                </div>
                <ChevronRight size={18} className={`shrink-0 transition-transform ${editingId === rest.id ? 'translate-x-1' : 'opacity-0 group-hover:opacity-100'}`} />
              </button>
            ))}
        </div>
      </div>

      {/* CỘT PHẢI: KHU VỰC BIÊN TẬP */}
      <div className="lg:w-2/3 flex flex-col gap-6">
        {editingId ? (
          <div className="space-y-6">
            {/* Header Biên Tập */}
            {/* Header Biên Tập */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h4 className="text-xl font-black text-slate-800">Studio: {newRest.name}</h4>
                  <p className="text-sm text-slate-500">Chọn ngôn ngữ mục tiêu và soạn kịch bản</p>
                </div>
                
                <button
                  onClick={autoGenerateContent}
                  disabled={isGeneratingAll}
                  className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-white transition-all shadow-lg active:scale-95 ${
                    isGeneratingAll ? "bg-slate-400" : "bg-gradient-to-r from-blue-600 to-blue-500 shadow-blue-200 hover:shadow-blue-300"
                  }`}
                >
                  {isGeneratingAll ? <Sparkles className="animate-spin" size={18} /> : <Languages size={18} />}
                  {isGeneratingAll ? "Đang dịch..." : "Dịch Đa Ngôn Ngữ"}
                </button>
              </div>

              {/* BỘ CHỌN NGÔN NGỮ (CHIPS) */}
              <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">
                  Ngôn ngữ mục tiêu (Dịch sang)
                </label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.filter(l => l.code !== 'vi').map(lang => {
                    const isSelected = selectedLangs.includes(lang.code);
                    return (
                      <button
                        key={lang.code}
                        onClick={() => toggleLanguage(lang.code)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${
                          isSelected 
                          ? "bg-white border-blue-500 text-blue-600 shadow-sm ring-2 ring-blue-100" 
                          : "bg-transparent border-slate-200 text-slate-400 hover:border-slate-300"
                        }`}
                      >
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                        {isSelected && <CheckCircle2 size={12} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  Kịch bản gốc (Tiếng Việt)
                </label>
                <textarea
                  placeholder="Nhập nội dung giới thiệu quán..."
                  className="w-full h-32 p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-red-500 transition-all outline-none text-slate-700 leading-relaxed"
                  value={newRest.description}
                  onChange={(e) => setNewRest({ ...newRest, description: e.target.value })}
                />
              </div>
            </div>

            {/* Danh sách ngôn ngữ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {LANGUAGES.map((lang) => {
                const textKey = lang.code === "vi" ? "description" : `description_${lang.code}`;
                const audioKey = `audio_${lang.code}`;
                if (!newRest[textKey] && !newRest[audioKey]) return null;

                const isCurrentPlaying = audioUrl === `${lang.code}_studio`;

                return (
                  <div key={lang.code} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:border-blue-200 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{lang.flag}</span>
                        <span className="font-bold text-slate-700 text-sm">Tiếng {lang.name}</span>
                      </div>
                      {newRest[audioKey] && <CheckCircle2 className="text-emerald-500" size={16} />}
                    </div>

                    <textarea
                      value={newRest[textKey] || ""}
                      onChange={(e) => setNewRest({ ...newRest, [textKey]: e.target.value })}
                      className="w-full h-24 p-3 bg-slate-50 border-none rounded-xl text-xs text-slate-600 focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all outline-none resize-none mb-3"
                    />

                    <div className="flex gap-2">
                      {newRest[audioKey] ? (
                        <button
                          onClick={() => (isCurrentPlaying ? stopAudio() : playAudio(newRest[audioKey], lang.code))}
                          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                            isCurrentPlaying 
                            ? "bg-red-100 text-red-600 hover:bg-red-200" 
                            : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-100"
                          }`}
                        >
                          {isCurrentPlaying ? <Square size={14} /> : <Play size={14} />}
                          {isCurrentPlaying ? "Dừng Phát" : "Nghe Thử"}
                        </button>
                      ) : (
                        <button
                          onClick={() => generateSingleAudio(lang.code, lang.name)}
                          disabled={generatingAudioLang === lang.code}
                          className="flex-1 flex items-center justify-center gap-2 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-orange-100"
                        >
                          {generatingAudioLang === lang.code ? (
                            <Mic className="animate-pulse" size={14} />
                          ) : (
                            <Mic size={14} />
                          )}
                          {generatingAudioLang === lang.code ? "Đang tạo..." : "Tạo Audio AI"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-3xl border border-dashed border-slate-300 text-slate-400 h-[600px] p-8 text-center animate-pulse">
            <div className="bg-slate-50 p-6 rounded-full mb-4">
              <Mic size={48} className="opacity-20" />
            </div>
            <h5 className="text-lg font-bold text-slate-800 mb-2">Chưa chọn nội dung</h5>
            <p className="max-w-xs text-sm">Chọn một quán ăn từ danh sách bên trái để bắt đầu biên tập kịch bản và thuyết minh AI.</p>
          </div>
        )}
      </div>
    </div>
  );
}