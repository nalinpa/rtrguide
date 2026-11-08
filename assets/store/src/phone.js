// The app's Plans tab, rebuilt from the real screen (app/(app)/(tabs)/itinerary,
// lib/ui/tokens.ts) at iPhone XR logical size 414 x 896. Swap in a real capture by
// setting PHONE_SCREENSHOT (a 828 x 1792 PNG path relative to this folder).
(function () {
  const PHONE_SCREENSHOT = null; // e.g. "screens/plans.png"

  const W = 414, H = 896;
  const ico = {
    list: '<path d="M3 5h.01"/><path d="M3 12h.01"/><path d="M3 19h.01"/><path d="M8 5h13"/><path d="M8 12h13"/><path d="M8 19h13"/>',
    cal: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M8 2v4"/><path d="M16 2v4"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/>',
    map: '<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/>',
    home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    tram: '<rect width="16" height="16" x="4" y="3" rx="2"/><path d="M4 11h16"/><path d="M12 3v8"/><path d="m8 19-2 3"/><path d="m18 22-2-3"/><path d="M8 15h.01"/><path d="M16 15h.01"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  };
  const svg = (name, size, color, sw = 2) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${ico[name]}</svg>`;

  const css = `
  .ph-screen { position:absolute; left:0; top:0; width:${W}px; height:${H}px; background:#FBF7F1; overflow:hidden; color:#241A12; font-family:Inter, sans-serif; }
  .ph-status { position:absolute; top:0; left:0; right:0; height:48px; display:flex; align-items:center; justify-content:space-between; padding:6px 30px 0 34px; font-weight:600; font-size:17px; letter-spacing:-0.2px; }
  .ph-title { position:absolute; left:17px; top:62px; font-size:25px; font-weight:900; letter-spacing:-0.9px; }
  .ph-more { position:absolute; right:16px; top:64px; width:32px; height:32px; border-radius:16px; background:#F0DEC9; display:flex; align-items:center; justify-content:center; gap:3px; }
  .ph-more i { width:4px; height:4px; border-radius:2px; background:#6B5A48; display:block; }
  .ph-tabs { position:absolute; left:0; right:0; top:110px; height:56px; border-bottom:1px solid #DCC9AE; }
  .ph-day { position:absolute; top:6px; font-weight:700; font-size:16.5px; line-height:1.15; color:#6B5A48; }
  .ph-day small { display:block; font-size:12.5px; font-weight:500; }
  .ph-day.on { color:#C1571C; }
  .ph-day.on::after { content:""; position:absolute; left:-12px; right:-12px; bottom:-12px; height:2px; background:#C1571C; }
  .ph-add { position:absolute; left:197px; top:14px; color:#C1571C; font-weight:600; font-size:16px; display:flex; align-items:center; gap:6px; }
  .ph-line { position:absolute; left:72px; right:0; height:1px; background:#EADBC6; }
  .ph-line.half { left:124px; background:#F2E7D8; }
  .ph-time { position:absolute; left:0; width:66px; text-align:right; font-size:11.5px; font-weight:600; color:#6B5A48; letter-spacing:0.3px; transform:translateY(-50%); }
  .ph-card { position:absolute; left:82px; right:16px; border-radius:14px; background:#C1571C; overflow:hidden; display:flex; align-items:center; }
  .ph-card::before { content:""; position:absolute; left:0; top:0; bottom:0; width:5px; background:#DDA27F; }
  .ph-card .grip { position:absolute; right:0; top:0; bottom:0; width:28px; background:#AA4A16; display:flex; align-items:center; justify-content:center; }
  .ph-card .grip b { display:grid; grid-template-columns:4px 4px; gap:3px; }
  .ph-card .grip b i { width:3.4px; height:3.4px; border-radius:2px; background:rgba(255,255,255,0.55); display:block; }
  .ph-card .txt { padding-left:18px; }
  .ph-card .nm { color:#fff; font-size:17px; font-weight:700; letter-spacing:-0.2px; }
  .ph-card .mt { color:rgba(255,255,255,0.74); font-size:11.5px; font-weight:600; letter-spacing:1.3px; margin-top:5px; text-transform:uppercase; }
  .ph-dots { position:absolute; left:107px; width:0; border-left:1.5px dashed #E3CDB0; }
  .ph-pill { position:absolute; left:123px; height:24px; padding:0 12px 0 10px; border-radius:12px; background:#F5EDE1; border:1px solid #EADBC6; display:flex; align-items:center; gap:8px; font-size:11px; font-weight:600; letter-spacing:1.2px; color:#8C7A63; transform:translateY(-50%); }
  .ph-tabbar { position:absolute; left:0; right:0; bottom:0; height:90px; background:#fff; border-top:1px solid #DCC9AE; display:flex; padding:10px 10px 0; }
  .ph-tab { flex:1; display:flex; flex-direction:column; align-items:center; gap:7px; font-size:10.5px; font-weight:700; letter-spacing:1.5px; color:#6B5A48; padding-top:8px; height:58px; border-radius:16px; margin:0 6px; }
  .ph-tab.on { background:rgba(31,75,61,0.12); color:#1F4B3D; }
  .ph-home { position:absolute; left:50%; bottom:8px; width:136px; height:5px; border-radius:3px; background:#111; transform:translateX(-50%); }
  `;

  // Timeline: 120pt per hour, starting at 11:30 just below the day tabs.
  const TOP = 167, HOUR = 120, START = 11.5;
  const y = (t) => TOP + (t - START) * HOUR;
  const fmt = (t) => {
    const h = Math.floor(t), m = Math.round((t - h) * 60);
    const hh = ((h + 11) % 12) + 1;
    return `${hh}:${String(m).padStart(2, "0")} PM`;
  };
  const items = [
    { name: "Redwoods Treewalk", from: 12, to: 13.5, dur: "1.5 hours" },
    { name: "Eat Streat", from: 14, to: 16, dur: "2 hours" },
    { name: "Polynesian Spa", from: 16.5, to: 18, dur: "1.5 hours" },
  ];
  const transits = [11.5, 13.5, 16]; // each followed by 30 min transit

  function screenHTML() {
    if (PHONE_SCREENSHOT) {
      return `<div class="ph-screen"><img src="${PHONE_SCREENSHOT}" style="width:${W}px;height:${H}px;display:block"></div>`;
    }
    let tl = "";
    for (let t = 12; t <= 18; t++) {
      tl += `<div class="ph-line" style="top:${y(t)}px"></div><div class="ph-time" style="top:${y(t)}px">${fmt(t)}</div>`;
      tl += `<div class="ph-line half" style="top:${y(t + 0.5)}px"></div>`;
    }
    for (const t of transits) {
      tl += `<div class="ph-dots" style="top:${y(t)}px;height:${HOUR / 2}px"></div>`;
      tl += `<div class="ph-pill" style="top:${y(t + 0.25)}px">${svg("tram", 15, "#8C7A63", 1.8)}TRANSIT 30 MIN</div>`;
    }
    for (const it of items) {
      tl += `<div class="ph-card" style="top:${y(it.from) + 2}px;height:${(it.to - it.from) * HOUR - 4}px">
        <div class="txt"><div class="nm">${it.name}</div><div class="mt">${fmt(it.from)} · ${it.dur}</div></div>
        <div class="grip"><b><i></i><i></i><i></i><i></i><i></i><i></i></b></div></div>`;
    }
    const tab = (n, label, on) =>
      `<div class="ph-tab ${on ? "on" : ""}">${svg(n, 25, on ? "#1F4B3D" : "#6B5A48", on ? 2.2 : 1.7)}${label}</div>`;
    return `<div class="ph-screen">
      ${tl}
      <div style="position:absolute;left:0;right:0;top:0;height:${TOP}px;background:#FBF7F1"></div>
      <div class="ph-status"><span>2:30</span>
        <span style="display:flex;gap:6px;align-items:center">
          <svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1" fill="#241A12"/><rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="#241A12"/><rect x="10" y="3" width="3" height="9" rx="1" fill="#241A12"/><rect x="15" y="0" width="3" height="12" rx="1" fill="#241A12"/></svg>
          <svg width="17" height="12" viewBox="0 0 17 12"><path d="M8.5 11.5l2.4-2.9a3.6 3.6 0 0 0-4.8 0z M8.5 3.2a8 8 0 0 1 5.5 2.2l1.4-1.6A10.2 10.2 0 0 0 8.5 1 10.2 10.2 0 0 0 1.6 3.8L3 5.4a8 8 0 0 1 5.5-2.2z M8.5 6.2a5 5 0 0 1 3.5 1.4l1.4-1.6a7.2 7.2 0 0 0-9.8 0L5 7.6a5 5 0 0 1 3.5-1.4z" fill="#241A12"/></svg>
          <svg width="27" height="13" viewBox="0 0 27 13"><rect x="0.5" y="0.5" width="23" height="12" rx="3.5" fill="none" stroke="#241A12" stroke-opacity="0.4"/><rect x="2.5" y="2.5" width="16" height="8" rx="2" fill="#241A12"/><path d="M25 4.5v4a2 2 0 0 0 0-4z" fill="#241A12" fill-opacity="0.4"/></svg>
        </span></div>
      <div class="ph-title">Rotorua Trip</div>
      <div class="ph-more"><i></i><i></i><i></i></div>
      <div class="ph-tabs">
        <div class="ph-day on" style="left:48px">Day 1<small>13 Sep</small></div>
        <div class="ph-day" style="left:122px">Day 2<small>14 Sep</small></div>
        <div class="ph-add">${svg("plus", 17, "#C1571C", 2)}Add Day</div>
      </div>
      <div class="ph-tabbar">${tab("list", "EXPLORE")}${tab("cal", "PLANS", true)}${tab("map", "MAP")}${tab("home", "HOME")}</div>
      <div class="ph-home"></div>
    </div>`;
  }

  // Dark device frame like the existing screenshots. Returns an element sized to
  // `width` CSS px (screen + bezel), positioned by the caller.
  function phone(width) {
    const bezel = 12;
    const outerW = W + bezel * 2, outerH = H + bezel * 2;
    const s = width / outerW;
    const el = document.createElement("div");
    el.style.cssText = `position:absolute;width:${outerW}px;height:${outerH}px;transform-origin:0 0;transform:scale(${s});`;
    el.innerHTML = `<style>${css}</style>
      <div style="position:absolute;inset:0;border-radius:64px;background:#1B1410;box-shadow:0 30px 60px rgba(20,12,6,0.35), 0 8px 18px rgba(20,12,6,0.25), inset 0 0 0 2px #3A2E26;"></div>
      <div style="position:absolute;left:${bezel}px;top:${bezel}px;width:${W}px;height:${H}px;border-radius:52px;overflow:hidden;">${screenHTML()}</div>`;
    el.dataset.h = outerH * s;
    return el;
  }

  window.Phone = { phone, W, H };
})();
