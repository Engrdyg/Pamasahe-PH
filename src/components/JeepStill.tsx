/** Lightweight static jeepney drawn in SVG: shown at once on Home, kept when
 *  WebGL is unavailable, and faded out once the 3D jeep is ready. */
export function JeepStill() {
  return (
    <svg viewBox="0 0 320 170" className="hero-still" aria-hidden="true" data-testid="hero-still">
      <ellipse cx="160" cy="150" rx="140" ry="10" fill="rgba(0,0,0,.18)" />
      {/* roof and rack */}
      <rect x="62" y="28" width="214" height="10" rx="4" fill="#d9dee6" />
      <rect x="70" y="20" width="198" height="6" rx="3" fill="#9aa4b2" />
      {/* body */}
      <path d="M40 70 L62 38 H276 V128 H24 V92 Q24 74 40 70 Z" fill="#0b3d91" />
      <path d="M24 104 H276 V118 H24 Z" fill="#ffc72c" />
      <path d="M24 112 C80 96 120 122 170 104 S250 100 276 110 V118 H24 Z" fill="#e4002b" />
      {/* hood and grille */}
      <path d="M4 92 Q8 76 40 72 V128 H8 Q4 120 4 110 Z" fill="#c9ced6" />
      <rect x="6" y="96" width="20" height="18" rx="3" fill="#6b7480" />
      <circle cx="16" cy="88" r="5" fill="#fff6c8" stroke="#9aa4b2" strokeWidth="2" />
      {/* windows */}
      <path d="M48 70 L66 44 H94 V70 Z" fill="#a9c7ea" />
      {[104, 136, 168, 200, 232].map((x) => (
        <rect key={x} x={x} y="46" width="26" height="30" rx="4" fill="#a9c7ea" />
      ))}
      {/* rear door opening */}
      <rect x="262" y="46" width="12" height="80" rx="2" fill="#123063" />
      {/* bumper and wheels */}
      <rect x="2" y="124" width="282" height="8" rx="4" fill="#d9dee6" />
      {[64, 230].map((x) => (
        <g key={x}>
          <circle cx={x} cy="134" r="20" fill="#1c2430" />
          <circle cx={x} cy="134" r="10" fill="#c9ced6" />
          <circle cx={x} cy="134" r="3" fill="#6b7480" />
        </g>
      ))}
      {/* horse ornament */}
      <path d="M30 70 l4 -10 l6 2 l-2 8 Z" fill="#e5e7eb" />
    </svg>
  )
}
