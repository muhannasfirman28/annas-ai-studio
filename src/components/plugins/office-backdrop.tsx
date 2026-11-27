import { DEPARTMENT_ROOMS } from "./office-types";

const CITY_WINDOWS = Array.from({ length: 30 }, (_, i) => ({
  x: 306 + (i % 10) * 18,
  y: 178 + Math.floor(i / 10) * 17,
  on: i % 3 !== 1,
}));

function roomTiles(columns: number, rows: number) {
  const left = 24;
  const top = 132;
  const width = 1152;
  const height = 360;
  const gap = 10;
  const tileWidth = (width - gap * (columns - 1)) / columns;
  const tileHeight = (height - gap * (rows - 1)) / rows;

  return DEPARTMENT_ROOMS.map((room, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = left + column * (tileWidth + gap);
    const y = top + row * (tileHeight + gap);
    return (
      <g key={`${columns}-${room.name}`}>
        <rect x={x} y={y} width={tileWidth} height={tileHeight} rx="8" fill="#0f1a2e" fillOpacity="0.34" stroke="#9fb8d6" strokeOpacity="0.3" strokeWidth="2" />
        <rect x={x} y={y} width="6" height={tileHeight} rx="3" fill={room.color} fillOpacity="0.9" />
        <text x={x + 18} y={y + 26} fill="#dbeafe" fillOpacity="0.62" fontSize="14" fontWeight="700" letterSpacing="1.2">{room.label}</text>
      </g>
    );
  });
}

/** Latar kantor berbasis SVG: tidak bergantung gambar eksternal atau kredensial. */
export function OfficeBackdrop() {
  return (
    <svg className="office-backdrop" viewBox="0 0 1200 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="of-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d2b45" />
          <stop offset="0.62" stopColor="#2b3d5c" />
          <stop offset="1" stopColor="#33465f" />
        </linearGradient>
        <linearGradient id="of-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5c6472" />
          <stop offset="1" stopColor="#2f3746" />
        </linearGradient>
        <linearGradient id="of-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#13233f" />
          <stop offset="0.55" stopColor="#31527d" />
          <stop offset="1" stopColor="#c98a64" />
        </linearGradient>
        <linearGradient id="of-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="0.45" stopColor="#ffffff" stopOpacity="0.02" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.12" />
        </linearGradient>
        <linearGradient id="of-board" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f8fafc" />
          <stop offset="1" stopColor="#dce6f2" />
        </linearGradient>
        <radialGradient id="of-glow">
          <stop offset="0" stopColor="#ffe9b8" stopOpacity="0.5" />
          <stop offset="1" stopColor="#ffe9b8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="of-vignette">
          <stop offset="0.55" stopColor="#000000" stopOpacity="0" />
          <stop offset="1" stopColor="#050914" stopOpacity="0.5" />
        </radialGradient>
      </defs>

      <rect width="1200" height="520" fill="url(#of-wall)" />
      <polygon points="0,330 1200,330 1200,520 0,520" fill="url(#of-floor)" />
      <g stroke="#dbe6f5" strokeOpacity="0.1" strokeWidth="1.5">
        <path d="M600 330 L-120 520 M600 330 L180 520 M600 330 L420 520 M600 330 L780 520 M600 330 L1020 520 M600 330 L1320 520" />
        <path d="M0 366 H1200 M0 404 H1200 M0 448 H1200 M0 498 H1200" />
      </g>

      {/* Jendela gedung + cakrawala kota */}
      <g>
        {[296, 516, 736].map((x) => (
          <g key={x}>
            <rect x={x} y="34" width="196" height="248" rx="4" fill="url(#of-sky)" stroke="#e2e8f0" strokeOpacity="0.28" strokeWidth="5" />
            <path d={`M${x + 6} 214 H${x + 190} V282 H${x + 6} Z`} fill="#16243a" />
            <path d={`M${x + 10} 232 H${x + 44} V282 H${x + 10} Z M${x + 52} 196 H${x + 88} V282 H${x + 52} Z M${x + 96} 222 H${x + 134} V282 H${x + 96} Z M${x + 142} 178 H${x + 186} V282 H${x + 142} Z`} fill="#1d2f4b" />
            {CITY_WINDOWS.filter((w) => w.x >= x + 6 && w.x < x + 190).map((w) => (
              <rect key={`${w.x}-${w.y}`} x={w.x} y={w.y} width="5" height="7" rx="1" fill={w.on ? "#ffd79a" : "#6f819b"} opacity={w.on ? 0.85 : 0.35} />
            ))}
            <rect x={x} y="34" width="196" height="248" rx="4" fill="url(#of-glass)" />
            <path d={`M${x + 98} 34 V282 M${x} 158 H${x + 196}`} stroke="#e2e8f0" strokeOpacity="0.3" strokeWidth="4" />
          </g>
        ))}
      </g>

      {/* Lampu gantung */}
      <g>
        {[240, 600, 960].map((x) => (
          <g key={x}>
            <ellipse cx={x} cy="112" rx="86" ry="62" fill="url(#of-glow)" />
            <path d={`M${x} 0 V84`} stroke="#cbd5e1" strokeOpacity="0.55" strokeWidth="3" />
            <path d={`M${x - 34} 84 L${x + 34} 84 L${x + 22} 108 L${x - 22} 108 Z`} fill="#e2e8f0" opacity="0.85" />
            <ellipse cx={x} cy="108" rx="22" ry="5" fill="#fff3d0" />
          </g>
        ))}
      </g>

      {/* Papan tulis tim */}
      <g>
        <rect x="34" y="78" width="204" height="150" rx="6" fill="#aab6c6" />
        <rect x="40" y="84" width="192" height="138" rx="3" fill="url(#of-board)" />
        <text x="58" y="110" fill="#334155" fontSize="14" fontWeight="700" letterSpacing="2">SPRINT INI</text>
        <g stroke="#64748b" strokeWidth="3" strokeLinecap="round" opacity="0.65">
          <path d="M58 130 H190 M58 149 H172 M58 168 H198 M58 187 H150" />
        </g>
        <g fill="#2563eb">
          <circle cx="208" cy="130" r="4" /><circle cx="208" cy="149" r="4" /><circle cx="208" cy="168" r="4" />
        </g>
        <path d="M58 202 Q86 190 114 202 T170 202" fill="none" stroke="#f97316" strokeWidth="3" />
      </g>

      {/* Rak buku */}
      <g>
        <rect x="1010" y="76" width="158" height="184" rx="4" fill="#8d6a4d" />
        <rect x="1018" y="84" width="142" height="168" fill="#a67c58" />
        <path d="M1018 134 H1160 M1018 188 H1160" stroke="#7a563a" strokeWidth="7" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={`top-${i}`} x={1024 + i * 23} y={92 + (i % 2) * 8} width="16" height={34 - (i % 2) * 8} rx="2" fill={["#38bdf8", "#fb7185", "#fbbf24", "#34d399", "#a78bfa", "#f472b6"][i]} opacity="0.85" />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <rect key={`bottom-${i}`} x={1030 + i * 30} y={146 + (i % 2) * 7} width="20" height={34 - (i % 2) * 7} rx="2" fill={["#60a5fa", "#f59e0b", "#10b981", "#c084fc"][i]} opacity="0.8" />
        ))}
      </g>

      {/* Tanaman */}
      <g>
        <path d="M142 300 Q112 246 128 214 Q154 246 142 300 M142 300 Q176 250 176 220 Q146 244 142 300 M142 300 Q96 276 84 252 Q122 256 142 300 M142 300 Q190 282 202 258 Q164 262 142 300" fill="#3f9b74" opacity="0.9" />
        <path d="M118 296 H166 L158 342 H126 Z" fill="#b97858" />
        <ellipse cx="142" cy="296" rx="24" ry="6" fill="#d18d6a" />
      </g>

      {/* Mesin kopi */}
      <g>
        <rect x="1062" y="246" width="74" height="86" rx="8" fill="#263449" stroke="#94a3b8" strokeOpacity="0.6" strokeWidth="3" />
        <rect x="1072" y="258" width="54" height="20" rx="4" fill="#0f172a" />
        <circle cx="1082" cy="268" r="4" fill="#38bdf8" /><circle cx="1098" cy="268" r="4" fill="#fbbf24" />
        <path d="M1084 284 H1114 V296 H1084 Z" fill="#475569" />
        <rect x="1094" y="300" width="12" height="18" rx="2" fill="#f8fafc" />
      </g>

      {/* Delapan petak ruangan: 4×2 di desktop, 2×4 di layar sempit. */}
      <g className="office-backdrop-wide">{roomTiles(4, 2)}</g>
      <g className="office-backdrop-tall">{roomTiles(2, 4)}</g>

      <rect width="1200" height="520" fill="url(#of-vignette)" />
    </svg>
  );
}
