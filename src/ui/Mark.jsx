// The app's mark, "Centre strip" (a football centre circle and halfway line with a cricket pitch
// through it), in both themes: the icon's green in light; in dark the night version the phone's dark
// opening ends on — night ground, teal lines, periwinkle pitch (the user's note on the canvas,
// 2026-11-26). ui.css shows the one that matches <html data-mode>.

export default function Mark({ size = 30 }) {
  return (
    <span className="kc-mark" aria-hidden="true">
      <svg className="on-dark" width={size} height={size} viewBox="0 0 30 30">
        <rect width="30" height="30" rx="8" fill="#0B1020" />
        <rect x="0.5" y="0.5" width="29" height="29" rx="7.5" fill="none" stroke="rgba(255,255,255,0.16)" />
        <rect x="0" y="5" width="30" height="5" fill="rgba(255,255,255,0.035)" />
        <rect x="0" y="15" width="30" height="5" fill="rgba(255,255,255,0.035)" />
        <line x1="15" y1="3" x2="15" y2="27" stroke="#7FE8DC" strokeWidth="1.4" />
        <circle cx="15" cy="15" r="7" fill="none" stroke="#7FE8DC" strokeWidth="1.4" />
        <rect x="13" y="8.5" width="4" height="13" rx="1" fill="#9DB0FF" />
      </svg>
      <svg className="on-light" width={size} height={size} viewBox="0 0 30 30">
        <rect width="30" height="30" rx="8" fill="#17402E" />
        <rect x="0" y="0" width="30" height="5" fill="#1D4D38" />
        <rect x="0" y="10" width="30" height="5" fill="#1D4D38" />
        <rect x="0" y="20" width="30" height="5" fill="#1D4D38" />
        <line x1="15" y1="3" x2="15" y2="27" stroke="#fff" strokeWidth="1.4" />
        <circle cx="15" cy="15" r="7" fill="none" stroke="#fff" strokeWidth="1.4" />
        <rect x="13" y="8.5" width="4" height="13" rx="1" fill="#E3CF9A" />
      </svg>
    </span>
  );
}
