// One entry per lettered design version. Edit text and palette here, then re-render:
//   node assets/store/src/render.mjs A B
// Keep any number accurate: 89 = active locations in scripts/sites.json.
window.VERSIONS = {
  A: {
    note: "Dusk green: geyser icon grown into a landscape, no header text.",
    theme: "dark",
    sky: ["#123329", "#1F4B3D", "#2B5A48"],
    glow: { color: "#E0A040", opacity: 0.42 },
    contour: { color: "#FBF7F1", opacity: 0.09 },
    hills: ["#2E6150", "#24513F", "#163A2E"],
    steam: { color: "#FBF7F1", opacity: 0.5 },
    geyser: true, // superseded: owner rejected the icon-geyser art
    trail: false,
    headline: ["Plan Your", "Rotorua Trip"],
    sub: ["89 places, day by day,", "with drive times between stops"],
    textColor: "#FBF7F1",
    subColor: "rgba(251,247,241,0.82)",
  },
  B: {
    note: "Daylight cream: geyser plus a numbered day route across the hills, no header text.",
    theme: "light",
    sky: ["#F4E6D6", "#FBF7F1", "#EEF0E6"],
    glow: { color: "#E7A97E", opacity: 0.45 },
    contour: { color: "#8C7A63", opacity: 0.13 },
    hills: ["#C9D5C4", "#8FAE9A", "#1F4B3D"],
    steam: { color: "#FFFFFF", opacity: 0.9 },
    geyser: true, // superseded: owner rejected the icon-geyser art
    trail: true,
    headline: ["Plan Your", "Rotorua Trip"],
    sub: ["89 places, day by day,", "with drive times between stops"],
    textColor: "#241A12",
    subColor: "#6B5A48",
  },
};
