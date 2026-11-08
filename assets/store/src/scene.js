// Draws the shared landscape scene as SVG. Units: the viewBox is 1000 tall and
// as wide as the canvas aspect, so nothing is cropped and the focal geyser stays centred.
(function () {
  function rng(seed) {
    let s = seed >>> 0;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  }

  // Smooth closed hill silhouette through evenly spaced points (Catmull-Rom -> cubic).
  function hillPath(vw, baseY, amp, seed, steps, bottom) {
    const r = rng(seed);
    const pts = [];
    for (let i = -1; i <= steps + 1; i++) {
      pts.push([(vw * i) / steps, baseY - amp * (0.35 + 0.65 * r())]);
    }
    let d = `M ${pts[1][0]} ${pts[1][1]}`;
    for (let i = 1; i < pts.length - 2; i++) {
      const [p0, p1, p2, p3] = [pts[i - 1], pts[i], pts[i + 1], pts[i + 2]];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C ${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${p2[0]} ${p2[1]}`;
    }
    d += ` L ${vw} ${bottom} L 0 ${bottom} Z`;
    return d;
  }

  // Background only: gradient sky, warm glow and fine contour rings (as on the screenshots).
  function background(v, vw, opts = {}) {
    const gx = opts.glowX ?? vw / 2;
    const gy = opts.glowY ?? 430;
    const cx = opts.ringX ?? vw / 2;
    const cy = opts.ringY ?? 1350;
    let rings = "";
    for (let r = 260; r < 2600; r += 64) {
      rings += `<circle cx="${cx}" cy="${cy}" r="${r}" />`;
    }
    let spokes = "";
    for (let i = -14; i <= 14; i++) {
      const a = (i / 14) * 1.25;
      const x2 = cx + Math.sin(a) * 2600;
      const y2 = cy - Math.cos(a) * 2600;
      const mx = cx + Math.sin(a * 0.86) * 1300 + 90 * Math.sign(i);
      const my = cy - Math.cos(a * 0.86) * 1300;
      spokes += `<path d="M ${cx} ${cy} Q ${mx} ${my} ${x2} ${y2}" />`;
    }
    return `
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${v.sky[0]}"/>
          <stop offset="0.55" stop-color="${v.sky[1]}"/>
          <stop offset="1" stop-color="${v.sky[2]}"/>
        </linearGradient>
        <radialGradient id="glow">
          <stop offset="0" stop-color="${v.glow.color}" stop-opacity="${v.glow.opacity}"/>
          <stop offset="1" stop-color="${v.glow.color}" stop-opacity="0"/>
        </radialGradient>
        <filter id="cloud" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="28"/></filter>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#241A12" flood-opacity="0.28"/>
        </filter>
      </defs>
      <rect width="${vw}" height="1000" fill="url(#sky)"/>
      <ellipse cx="${gx}" cy="${gy}" rx="${opts.glowR ?? 620}" ry="${(opts.glowR ?? 620) * 0.8}" fill="url(#glow)"/>
      <g fill="none" stroke="${v.contour.color}" stroke-opacity="${v.contour.opacity}" stroke-width="1.4">${rings}${spokes}</g>`;
  }

  // One soft steam cloud billowing behind the plume, plus a few spray droplets.
  function steamCloud(v, cx, base) {
    const r = rng(7);
    let c = "";
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const dx = Math.cos(a) * (150 + r() * 120);
      const dy = Math.sin(a) * (90 + r() * 60);
      c += `<circle cx="${cx + dx}" cy="${base - 610 + dy}" r="${95 + r() * 70}"/>`;
    }
    c += `<circle cx="${cx}" cy="${base - 640}" r="170"/>`;
    return `<g fill="${v.steam.color}" fill-opacity="${v.steam.opacity * 0.55}" filter="url(#cloud)">${c}</g>`;
  }
  function droplets(v, cx, base) {
    const col = v.theme === "dark" ? "#F2E4D0" : "#C1571C";
    const r = rng(19);
    let d = "";
    const tips = [[0, -640], [-158, -468], [158, -468], [-212, -262], [212, -262]];
    for (const [tx, ty] of tips) {
      for (let k = 0; k < 3; k++) {
        const a = -Math.PI / 2 + (r() - 0.5) * 2.2 + Math.sign(tx) * 0.5;
        const dist = 90 + r() * 70;
        const rr = 7 + r() * 9;
        d += `<circle cx="${cx + tx + Math.cos(a) * dist}" cy="${base + ty + Math.sin(a) * dist}" r="${rr}" fill="${col}" fill-opacity="0.85"/>`;
      }
    }
    return d;
  }

  // The app icon's geyser (five rounded jets from a ringed pool), grown into a hero.
  function geyser(v, cx, base) {
    const w = 96;
    const jet = (x1, y1, x2, y2, c) =>
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
    return `
      <ellipse cx="${cx}" cy="${base + 18}" rx="345" ry="74" fill="#8C3D10"/>
      <ellipse cx="${cx}" cy="${base + 12}" rx="300" ry="56" fill="none" stroke="#F2E4D0" stroke-width="13"/>
      <ellipse cx="${cx}" cy="${base + 14}" rx="270" ry="45" fill="#3F7068"/>
      ${steamCloud(v, cx, base)}
      ${jet(cx - 20, base, cx - 212, base - 262, "#C1571C")}
      ${jet(cx + 20, base, cx + 212, base - 262, "#C1571C")}
      ${jet(cx - 12, base, cx - 158, base - 468, "#8C3D10")}
      ${jet(cx + 12, base, cx + 158, base - 468, "#8C3D10")}
      ${jet(cx, base, cx, base - 640, "#C1571C")}
      <ellipse cx="${cx - 90}" cy="${base + 6}" rx="80" ry="13" fill="#6FA096" fill-opacity="0.75"/>
      ${droplets(v, cx, base)}`;
  }

  // Numbered day route (version B): stops 1-2-3 joined by a dashed path.
  function trail(cx) {
    const stops = [
      [cx - 590, 742, 1],
      [cx + 420, 905, 2],
      [cx + 690, 748, 3],
    ];
    const path = `M ${cx - 780} 930 C ${cx - 720} 820, ${cx - 660} 760, ${stops[0][0]} ${stops[0][1]}
      C ${cx - 470} 760, ${cx - 470} 960, ${cx - 200} 960
      C ${cx + 60} 960, ${cx + 260} 930, ${stops[1][0]} ${stops[1][1]}
      C ${cx + 560} 880, ${cx + 600} 770, ${stops[2][0]} ${stops[2][1]}`;
    const pins = stops
      .map(
        ([x, y, n]) => `
        <g filter="url(#shadow)">
          <circle cx="${x}" cy="${y}" r="40" fill="#C1571C" stroke="#FFFFFF" stroke-width="7"/>
          <text x="${x}" y="${y + 15}" text-anchor="middle" font-family="Inter" font-weight="800" font-size="42" fill="#FFFFFF">${n}</text>
        </g>`,
      )
      .join("");
    return `<path d="${path}" fill="none" stroke="#FBF7F1" stroke-width="9" stroke-linecap="round" stroke-dasharray="2 22"/>${pins}`;
  }

  function scene(v, W, H, opts = {}) {
    const vw = (1000 * W) / H;
    const cx = vw / 2;
    const base = 830;
    const h = v.hills;
    return `<svg class="scene" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw} 1000">
      ${background(v, vw)}
      <path d="${hillPath(vw, 700, 150, 11, 9, 1000)}" fill="${h[0]}"/>
      <path d="${hillPath(vw, 790, 120, 23, 7, 1000)}" fill="${h[1]}"/>
      <path d="${hillPath(vw, 905, 60, 5, 6, 1000)}" fill="${h[2]}"/>
      ${v.geyser ? geyser(v, cx, base) : ""}
      ${v.trail ? trail(cx) : ""}
    </svg>`;
  }

  window.Scene = { scene, background, hillPath };
})();
