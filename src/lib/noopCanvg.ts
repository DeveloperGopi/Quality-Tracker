// Perf brief 3.4 — an empty stand-in for the optional `canvg` peer jspdf pulls
// for `addSvgAsImage()`. We never call that API (PDF exports use autoTable
// text only), so aliasing canvg here removes ~53 KB gz of canvg+rgbcolor from
// the first PDF click without touching jspdf itself.
export default {};
