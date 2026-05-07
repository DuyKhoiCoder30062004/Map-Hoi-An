import L from "leaflet";

// Cấu hình API
// Dùng biến môi trường của Vite, nếu không có thì fallback về localhost
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Cấu hình Icon Bản đồ [cite: 4, 5]
export const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

export const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

// Danh sách ngôn ngữ [cite: 6, 7]
export const LANGUAGES = [
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

// Trạng thái mặc định của Quán ăn [cite: 8, 9]
export const defaultRest = {
  name: "", specialty_dish: "", image_url: "", lat: 10.7612, lng: 106.7055
};
LANGUAGES.forEach(l => {
  defaultRest[l.dbCol] = "";
  defaultRest[`audio_${l.code}`] = "";
});