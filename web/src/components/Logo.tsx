/** شعار ميزان — كفّتا ميزان + قوس مدار وقمرا GRACE فوق خط منسوب ماء (الدستور §19) */
export default function Logo({ size = 38 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-label="MIZAN logo">
      {/* قوس المدار */}
      <path
        d="M6 26 A30 30 0 0 1 58 26"
        stroke="#38BDF8"
        strokeWidth="1.6"
        strokeDasharray="3 4"
        opacity="0.8"
      />
      {/* قمرا GRACE توأم */}
      <circle cx="22" cy="13.5" r="2.4" fill="#38BDF8" />
      <circle cx="42" cy="13.5" r="2.4" fill="#38BDF8" />
      <line x1="24.4" y1="13.5" x2="39.6" y2="13.5" stroke="#38BDF8" strokeWidth="0.9" strokeDasharray="2 2" />
      {/* عمود الميزان */}
      <line x1="32" y1="20" x2="32" y2="44" stroke="#2DD4BF" strokeWidth="2.4" />
      <line x1="14" y1="26" x2="50" y2="26" stroke="#2DD4BF" strokeWidth="2.4" />
      <circle cx="32" cy="22" r="2.6" fill="#2DD4BF" />
      {/* الكفّتان */}
      <path d="M14 26 L9 38 H19 Z" stroke="#2DD4BF" strokeWidth="1.8" fill="rgba(45,212,191,0.12)" />
      <path d="M50 26 L45 38 H55 Z" stroke="#2DD4BF" strokeWidth="1.8" fill="rgba(45,212,191,0.12)" />
      {/* خط منسوب الماء */}
      <path
        d="M10 52 Q16 48 22 52 T34 52 T46 52 T58 52"
        stroke="#38BDF8"
        strokeWidth="1.8"
        fill="none"
        opacity="0.9"
      />
      <path
        d="M14 58 Q20 54 26 58 T38 58 T50 58"
        stroke="#1B6E8C"
        strokeWidth="1.4"
        fill="none"
        opacity="0.7"
      />
    </svg>
  );
}
