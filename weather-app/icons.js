// Inline SVG icon generators. Each returns an HTML string ready for innerHTML.

export function iconDropletSvg() {
  return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M12 2s7 8 7 13a7 7 0 1 1-14 0c0-5 7-13 7-13Z" stroke="rgba(255,255,255,.86)" stroke-width="2" fill="rgba(255,255,255,.14)"/>
  </svg>`;
}

export function iconUvSvg() {
  return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="6" fill="rgba(255,255,255,.10)" stroke="rgba(255,255,255,.84)" stroke-width="2"/>
    <path d="M12 5.2v2.1M12 16.7v2.1M5.2 12h2.1M16.7 12h2.1M7.2 7.2l1.5 1.5M15.3 15.3l1.5 1.5M16.8 7.2l-1.5 1.5M8.7 15.3l-1.5 1.5" stroke="rgba(255,215,138,.85)" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="12" cy="12" r="3.2" fill="rgba(255,215,138,.18)" stroke="rgba(255,215,138,.75)" stroke-width="1.8"/>
    <text x="12" y="15.6" text-anchor="middle" font-size="7.2" font-weight="800" fill="rgba(255,255,255,.88)" style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">UV</text>
  </svg>`;
}

export function iconSunSvg() {
  return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="12" cy="12" r="4.5" stroke="rgba(255,255,255,.86)" stroke-width="2" fill="rgba(255,255,255,.14)"/>
    <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M19.8 4.2l-2.1 2.1M6.3 17.7l-2.1 2.1" stroke="rgba(255,255,255,.86)" stroke-width="2" stroke-linecap="round"/>
  </svg>`;
}

export function iconMoonSvg() {
  return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M15.5 2.5a8 8 0 1 0 6 13.6A7 7 0 0 1 15.5 2.5Z" stroke="rgba(255,255,255,.86)" stroke-width="2" fill="rgba(255,255,255,.12)"/>
  </svg>`;
}

export function iconRefreshSvg() {
  return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M4.05 11A8 8 0 1 1 5.9 17.2" stroke="rgba(255,255,255,.86)" stroke-width="2" stroke-linecap="round"/>
    <polyline points="4 5 4 11 10 11" stroke="rgba(255,255,255,.86)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

export function iconWindArrowSvg(deg) {
  const rot = Number.isFinite(deg) ? deg : 0;
  return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g transform="translate(12 12) rotate(${rot}) translate(-12 -12)">
      <path d="M12 3l4 7-4-2-4 2 4-7Z" fill="rgba(255,255,255,.82)"/>
      <path d="M12 9v12" stroke="rgba(255,255,255,.82)" stroke-width="2" stroke-linecap="round"/>
    </g>
  </svg>`;
}

// Weather condition icon — maps Open-Meteo WMO codes to one of 6 shapes.
export function wxIconSvg(code) {
  const c = Number(code);
  const stroke = "rgba(255,255,255,.86)";
  const fill = "rgba(255,255,255,.16)";

  const isStorm = c === 95 || c === 96 || c === 99;
  const isSnow  = c === 71 || c === 73 || c === 75 || c === 77 || c === 85 || c === 86;
  const isRain  = [51,53,55,56,57,61,63,65,66,67,80,81,82].includes(c);
  const isFog   = c === 45 || c === 48;
  const isCloud = c === 1 || c === 2 || c === 3;

  if (isStorm) return `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M16 30c-6 0-10-3-10-9 0-5 4-9 9-9 1 0 2 0 3 .4C19 8.6 22.4 6 27 6c6 0 11 5 11 11v.2C41.4 18 44 21 44 25c0 5-4 9-10 9H16Z" stroke="${stroke}" stroke-width="2" fill="${fill}"/>
    <path d="M23 42l4-8h-6l4-10" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

  if (isSnow) return `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M16 26c-6 0-10-3-10-9 0-5 4-9 9-9 1 0 2 0 3 .4C19 4.6 22.4 2 27 2c6 0 11 5 11 11v.2C41.4 14 44 17 44 21c0 5-4 9-10 9H16Z" stroke="${stroke}" stroke-width="2" fill="${fill}"/>
    <path d="M18 34l2 2m0-2l-2 2m12-2l2 2m0-2l-2 2M24 34l2 2m0-2l-2 2" stroke="${stroke}" stroke-width="2" stroke-linecap="round"/>
  </svg>`;

  if (isRain) return `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M16 26c-6 0-10-3-10-9 0-5 4-9 9-9 1 0 2 0 3 .4C19 4.6 22.4 2 27 2c6 0 11 5 11 11v.2C41.4 14 44 17 44 21c0 5-4 9-10 9H16Z" stroke="${stroke}" stroke-width="2" fill="${fill}"/>
    <path d="M18 34l-2 6m10-6l-2 6m10-6l-2 6" stroke="${stroke}" stroke-width="2" stroke-linecap="round"/>
  </svg>`;

  if (isFog) return `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M16 24c-6 0-10-3-10-9 0-5 4-9 9-9 1 0 2 0 3 .4C19 2.6 22.4 0 27 0c6 0 11 5 11 11v.2C41.4 12 44 15 44 19c0 5-4 9-10 9H16Z" stroke="${stroke}" stroke-width="2" fill="${fill}"/>
    <path d="M10 32h28M12 37h24M14 42h20" stroke="${stroke}" stroke-width="2" stroke-linecap="round" opacity=".9"/>
  </svg>`;

  if (isCloud) return `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M16 30c-6 0-10-3-10-9 0-5 4-9 9-9 1 0 2 0 3 .4C19 8.6 22.4 6 27 6c6 0 11 5 11 11v.2C41.4 18 44 21 44 25c0 5-4 9-10 9H16Z" stroke="${stroke}" stroke-width="2" fill="${fill}"/>
  </svg>`;

  // Clear / unknown
  return `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="24" cy="24" r="8" stroke="${stroke}" stroke-width="2" fill="${fill}"/>
    <path d="M24 4v6M24 38v6M4 24h6M38 24h6M9 9l4 4M35 35l4 4M39 9l-4 4M13 35l-4 4" stroke="${stroke}" stroke-width="2" stroke-linecap="round"/>
  </svg>`;
}
