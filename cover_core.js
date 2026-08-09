(function () {
const PALETTES = [
  {id:"indigo",  name:"Индиго",    bg:"#0a0d18", ink:"#e8eaf1", mut:"#8d93a8", dim:"#585e73", acc:"#818cf8", acc2:"#c084fc"},
  {id:"cobalt",  name:"Кобальт",   bg:"#070c1a", ink:"#e6ebf7", mut:"#8a95b0", dim:"#535d78", acc:"#6366f1", acc2:"#38bdf8"},
  {id:"steel",   name:"Сталь",     bg:"#0b1016", ink:"#e6ecf3", mut:"#8b97a6", dim:"#535e6c", acc:"#60a5fa", acc2:"#5eead4"},
  {id:"ice",     name:"Лёд",       bg:"#06121c", ink:"#e4f0f8", mut:"#88a4b8", dim:"#4f6a7e", acc:"#38bdf8", acc2:"#67e8f9"},
  {id:"ocean",   name:"Океан",     bg:"#05131a", ink:"#e2f1f5", mut:"#83a3ad", dim:"#4c6a73", acc:"#22d3ee", acc2:"#818cf8"},
  {id:"turquo",  name:"Бирюза",    bg:"#06141a", ink:"#e3f2f1", mut:"#84a8a4", dim:"#4d6d69", acc:"#2dd4bf", acc2:"#7dd3fc"},
  {id:"emerald", name:"Изумруд",   bg:"#06120f", ink:"#e6f2ed", mut:"#86a396", dim:"#4d6a5d", acc:"#34d399", acc2:"#a3e635"},
  {id:"pine",    name:"Хвоя",      bg:"#08150f", ink:"#e3efe6", mut:"#8aa793", dim:"#4f6b58", acc:"#4ade80", acc2:"#22d3ee"},
  {id:"lime",    name:"Лайм",      bg:"#0d1206", ink:"#eef4e0", mut:"#a0ab86", dim:"#657049", acc:"#a3e635", acc2:"#fde047"},
  {id:"khaki",   name:"Хаки",      bg:"#0f1109", ink:"#eceedf", mut:"#a3a68c", dim:"#686b52", acc:"#bef264", acc2:"#a8a29e"},
  {id:"sand",    name:"Песок",     bg:"#14110a", ink:"#f2eddf", mut:"#a89e85", dim:"#6b6350", acc:"#eab308", acc2:"#d6d3d1"},
  {id:"amber",   name:"Янтарь",    bg:"#140f06", ink:"#f4ecdd", mut:"#a89577", dim:"#6d5c42", acc:"#fbbf24", acc2:"#fb923c"},
  {id:"copper",  name:"Медь",      bg:"#150e09", ink:"#f4e9de", mut:"#ac927c", dim:"#6f5b49", acc:"#f59e0b", acc2:"#fcd34d"},
  {id:"terra",   name:"Терракота", bg:"#160d09", ink:"#f4e7df", mut:"#ab8b7b", dim:"#6f574a", acc:"#f97316", acc2:"#facc15"},
  {id:"sunset",  name:"Закат",     bg:"#1a0c08", ink:"#f7e8e2", mut:"#b48f83", dim:"#775a51", acc:"#fb7185", acc2:"#fbbf24"},
  {id:"blood",   name:"Кармин",    bg:"#150707", ink:"#f6e3e3", mut:"#b08585", dim:"#735252", acc:"#ef4444", acc2:"#f97316"},
  {id:"cherry",  name:"Вишня",     bg:"#16090c", ink:"#f6e4e8", mut:"#b0868f", dim:"#73535b", acc:"#f43f5e", acc2:"#fb923c"},
  {id:"rose",    name:"Малина",    bg:"#170a12", ink:"#f6e6ef", mut:"#b28ba1", dim:"#75546a", acc:"#fb7185", acc2:"#f0abfc"},
  {id:"fuchsia", name:"Фуксия",    bg:"#150a14", ink:"#f5e6f4", mut:"#b08bad", dim:"#735474", acc:"#e879f9", acc2:"#f0abfc"},
  {id:"plum",    name:"Слива",     bg:"#140a16", ink:"#f0e6f6", mut:"#a58bb4", dim:"#6a5478", acc:"#c084fc", acc2:"#f472b6"},
  {id:"violet",  name:"Пурпур",    bg:"#100a1a", ink:"#eee6f8", mut:"#9d8cb5", dim:"#63557a", acc:"#a78bfa", acc2:"#f472b6"},
  {id:"night",   name:"Ночь",      bg:"#080a12", ink:"#e7eaf4", mut:"#8b93ab", dim:"#545c73", acc:"#a5b4fc", acc2:"#7dd3fc"},
  {id:"graphite",name:"Графит",    bg:"#101114", ink:"#eceef2", mut:"#9498a2", dim:"#5e626c", acc:"#cbd5e1", acc2:"#94a3b8"},
  {id:"ink",     name:"Тушь",      bg:"#0c0c0d", ink:"#f0f0f1", mut:"#9a9a9e", dim:"#616164", acc:"#e5e5e7", acc2:"#a1a1aa"},
  {id:"mint",    name:"Мята",      bg:"#071614", ink:"#e2f3f0", mut:"#85a8a2", dim:"#4d6e69", acc:"#2dd4bf", acc2:"#86efac"},
  {id:"olive",   name:"Олива",     bg:"#111206", ink:"#f0f0dd", mut:"#a5a683", dim:"#6a6b4c", acc:"#d9f99d", acc2:"#fde047"},
  {id:"coral",   name:"Коралл",    bg:"#180b09", ink:"#f7e7e2", mut:"#b48d84", dim:"#775952", acc:"#fb923c", acc2:"#fda4af"},
  {id:"azure",   name:"Лазурь",    bg:"#050f1c", ink:"#e2eef8", mut:"#84a0bb", dim:"#4c6781", acc:"#3b82f6", acc2:"#a5b4fc"},
  {id:"jade",    name:"Нефрит",    bg:"#04130f", ink:"#e0f1eb", mut:"#82a498", dim:"#4a6b5f", acc:"#10b981", acc2:"#5eead4"},
  {id:"wine",    name:"Бордо",     bg:"#12070c", ink:"#f2e2e9", mut:"#a98595", dim:"#6d5260", acc:"#e11d48", acc2:"#c084fc"}
];

const SHAPES = ["arc", "rings", "diag", "grid", "bars", "blob", "dots", "wave",
                "rays", "hex", "topo", "cross", "stairs", "orbit", "prism",
                "ripple", "mesh", "chart", "spiral", "scatter"];

function srand(n){ let x = Math.sin(n * 9301 + 49297) * 233280; return x - Math.floor(x); }

function palOf(id){
  let p = null;
  for (let i = 0; i < PALETTES.length; i++) if (PALETTES[i].id === id) p = PALETTES[i];
  if (!p) p = PALETTES[0];
  return {bg: p.bg, ink: p.ink, mut: p.mut, dim: p.dim, acc: p.acc, acc2: p.acc2, name: p.name};
}

function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

function shapeSvg(kind, p, seed, W, H, zone, uid, mode){
  if (ORN2[kind]){
    var d2 = ORN2_BACK[kind]
      ? (mode === "back" ? 0.25 : 0.3)
      : (mode === "back" ? 0.4 : (mode === "edge" ? 0.5 : 0.85));
    return '<g opacity="' + d2 + '" transform="scale(' + (W / 440) + ')">' +
      ORN2[kind](p, seed) + "</g>";
  }
  const a = p.acc;
  const dim = mode === "back" ? 0.24 : (mode === "edge" ? 0.55 : 1);
  const o = (0.26 + srand(seed * 3) * 0.22) * dim;
  const cx = zone.x + zone.w * (mode === "side" ? (0.34 + srand(seed * 5) * 0.42)
                                                 : (0.22 + srand(seed * 5) * 0.6));
  const cy = zone.y + zone.h * (0.24 + srand(seed * 7) * 0.5);
  const base = mode === "side" ? Math.min(zone.w, zone.h) : Math.max(zone.w, zone.h) * 0.62;
  const r = base * (0.52 + srand(seed * 11) * 0.46);
  const rot = Math.floor(srand(seed * 13) * 360);
  const clip = `clip-path="url(#z${uid})"`;
  if (kind === "arc")
    return `<g ${clip} opacity="${o}" transform="rotate(${rot} ${cx} ${cy})">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${a}" stroke-width="${H*0.022}"
        stroke-dasharray="${r*2.6} ${r*3}" stroke-linecap="round"/>
      <circle cx="${cx}" cy="${cy}" r="${r*0.62}" fill="none" stroke="${a}"
        stroke-width="${H*0.007}" opacity=".55"/></g>`;
  if (kind === "rings"){
    let s = "";
    for (let i = 0; i < 5; i++)
      s += `<circle cx="${cx}" cy="${cy}" r="${r*(0.3+i*0.18)}" fill="none" stroke="${a}"
             stroke-width="${H*0.005}" opacity="${0.75-i*0.12}"/>`;
    return `<g ${clip} opacity="${o+.1}">${s}</g>`;
  }
  if (kind === "diag"){
    const x = zone.x + zone.w * (0.16 + srand(seed*17) * 0.3);
    return `<g ${clip} opacity="${o}"><path d="M${x} 0 L${W} 0 L${W} ${H} L${x - H*0.4} ${H} Z"
      fill="${a}" opacity=".2"/><path d="M${x} 0 L${x - H*0.4} ${H}" stroke="${a}"
      stroke-width="${H*0.005}"/></g>`;
  }
  if (kind === "grid"){
    let s = "";
    const step = H / (8 + Math.floor(srand(seed*19) * 4));
    for (let x = cx - r; x < cx + r; x += step)
      for (let y = cy - r; y < cy + r; y += step){
        const d = Math.hypot(x - cx, y - cy);
        if (d < r) s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${H*0.0055}"
          fill="${a}" opacity="${(1 - d / r).toFixed(2)}"/>`;
      }
    return `<g ${clip} opacity="${o + .2 * dim}">${s}</g>`;
  }
  if (kind === "bars"){
    let s = "";
    const n = 5 + Math.floor(srand(seed*23) * 4);
    const bw = zone.w / n;
    for (let i = 0; i < n; i++){
      const h = zone.h * (0.18 + srand(seed * 29 + i) * 0.7);
      s += `<rect x="${zone.x + i * bw + bw*0.2}" y="${zone.y + zone.h - h}"
        width="${bw*0.55}" height="${h}" rx="${H*0.012}"
        fill="${i % 3 === 1 ? p.acc2 : a}" opacity="${0.4 + srand(seed*31+i) * 0.45}"/>`;
    }
    return `<g ${clip} opacity="${o + .22 * dim}">${s}</g>`;
  }
  if (kind === "blob")
    return `<g ${clip} opacity="${o + .16 * dim}"><ellipse cx="${cx}" cy="${cy}" rx="${r*1.1}"
      ry="${r*0.86}" fill="url(#gl${uid})" transform="rotate(${rot} ${cx} ${cy})"/></g>`;
  if (kind === "dots"){
    let s = "";
    for (let i = 0; i < 26; i++){
      const ang = srand(seed * 37 + i) * Math.PI * 2;
      const rad = r * (0.2 + srand(seed * 41 + i) * 0.85);
      s += `<circle cx="${(cx + Math.cos(ang)*rad).toFixed(1)}"
        cy="${(cy + Math.sin(ang)*rad*0.85).toFixed(1)}"
        r="${H*(0.004 + srand(seed*43+i)*0.011)}" fill="${i % 4 === 0 ? p.acc2 : a}"
        opacity="${0.3 + srand(seed*47+i)*0.5}"/>`;
    }
    return `<g ${clip} opacity="${o + .28 * dim}">${s}</g>`;
  }
  if (kind === "rays"){
    let s = "";
    const n = 7 + Math.floor(srand(seed*61) * 6);
    for (let i = 0; i < n; i++){
      const ang = (-0.5 + i / n) * Math.PI * 0.9 + srand(seed*67+i) * 0.08;
      s += `<path d="M${cx} ${cy} L${cx + Math.cos(ang)*r*2.2} ${cy + Math.sin(ang)*r*2.2}"
        stroke="${i % 3 === 0 ? p.acc2 : a}" stroke-width="${H*(0.004 + srand(seed*71+i)*0.012)}"
        opacity="${0.3 + srand(seed*73+i)*0.5}" stroke-linecap="round"/>`;
    }
    return `<g ${clip} opacity="${o + .14 * dim}">${s}</g>`;
  }
  if (kind === "hex"){
    let s = "";
    const R = H * (0.055 + srand(seed*79) * 0.03);
    const dx = R * 1.72, dy = R * 1.5;
    for (let row = 0; row * dy < zone.h + dy; row++)
      for (let col = 0; col * dx < zone.w + dx; col++){
        const x = zone.x + col * dx + (row % 2 ? dx / 2 : 0);
        const y = zone.y + row * dy;
        const pts = [];
        for (let k = 0; k < 6; k++){
          const ang = Math.PI / 180 * (60 * k - 30);
          pts.push(`${(x + R * Math.cos(ang)).toFixed(1)},${(y + R * Math.sin(ang)).toFixed(1)}`);
        }
        const f = srand(seed * 83 + row * 31 + col);
        s += `<polygon points="${pts.join(" ")}" fill="${f > 0.86 ? a : "none"}"
          fill-opacity=".5" stroke="${a}" stroke-width="${H*0.0035}" opacity="${0.25 + f*0.5}"/>`;
      }
    return `<g ${clip} opacity="${o}">${s}</g>`;
  }
  if (kind === "topo"){
    let s = "";
    for (let i = 0; i < 7; i++){
      const yy = zone.y + zone.h * (0.1 + i * 0.13);
      let d2 = `M ${zone.x} ${yy}`;
      for (let k = 0; k < 6; k++){
        const x0 = zone.x + k * zone.w / 6;
        d2 += ` Q ${x0 + zone.w/12} ${yy + (srand(seed*89+i*7+k) - .5) * H * 0.14}
                 ${x0 + zone.w/6} ${yy}`;
      }
      s += `<path d="${d2}" fill="none" stroke="${i % 3 === 1 ? p.acc2 : a}"
        stroke-width="${H*0.004}" opacity="${0.4 + srand(seed*97+i)*0.4}"/>`;
    }
    return `<g ${clip} opacity="${o + .1 * dim}">${s}</g>`;
  }
  if (kind === "cross"){
    let s = "";
    const step = H * (0.08 + srand(seed*101) * 0.04);
    const c = H * 0.012;
    for (let x = zone.x; x < zone.x + zone.w; x += step)
      for (let y = zone.y; y < zone.y + zone.h; y += step){
        const f = srand(seed * 103 + x * 0.7 + y);
        if (f < 0.25) continue;
        s += `<path d="M${(x-c).toFixed(1)} ${y.toFixed(1)} H${(x+c).toFixed(1)}
          M${x.toFixed(1)} ${(y-c).toFixed(1)} V${(y+c).toFixed(1)}" stroke="${a}"
          stroke-width="${H*0.003}" opacity="${(f * 0.8).toFixed(2)}"/>`;
      }
    return `<g ${clip} opacity="${o + .16 * dim}">${s}</g>`;
  }
  if (kind === "stairs"){
    let s = "";
    const n = 6 + Math.floor(srand(seed*107) * 4);
    const w = zone.w / n, hh = zone.h / n;
    for (let i = 0; i < n; i++)
      s += `<rect x="${zone.x + i * w}" y="${zone.y + zone.h - (i + 1) * hh}"
        width="${w * 0.9}" height="${(i + 1) * hh}" rx="${H*0.01}"
        fill="${i % 2 ? p.acc2 : a}" opacity="${(0.16 + i * 0.05).toFixed(2)}"/>`;
    return `<g ${clip} opacity="${o + .2 * dim}">${s}</g>`;
  }
  if (kind === "orbit"){
    let s = "";
    for (let i = 0; i < 4; i++){
      const rr = r * (0.45 + i * 0.2);
      s += `<ellipse cx="${cx}" cy="${cy}" rx="${rr}" ry="${rr * 0.42}" fill="none"
        stroke="${a}" stroke-width="${H*0.004}" opacity="${0.7 - i * 0.13}"
        transform="rotate(${(rot + i * 37) % 360} ${cx} ${cy})"/>`;
      const ang = srand(seed * 109 + i) * Math.PI * 2;
      s += `<circle cx="${(cx + Math.cos(ang) * rr).toFixed(1)}"
        cy="${(cy + Math.sin(ang) * rr * 0.42).toFixed(1)}" r="${H*0.009}"
        fill="${i % 2 ? p.acc2 : a}"/>`;
    }
    return `<g ${clip} opacity="${o + .16 * dim}">${s}</g>`;
  }
  if (kind === "prism"){
    let s = "";
    const n = 5 + Math.floor(srand(seed*113) * 4);
    for (let i = 0; i < n; i++){
      const x = zone.x + srand(seed * 127 + i) * zone.w * 0.8;
      const y = zone.y + srand(seed * 131 + i) * zone.h * 0.8;
      const sz = H * (0.06 + srand(seed * 137 + i) * 0.14);
      s += `<polygon points="${x.toFixed(1)},${(y - sz).toFixed(1)}
        ${(x + sz * 0.9).toFixed(1)},${(y + sz * 0.7).toFixed(1)}
        ${(x - sz * 0.9).toFixed(1)},${(y + sz * 0.7).toFixed(1)}"
        fill="${i % 3 === 0 ? p.acc2 : a}" opacity="${0.2 + srand(seed*139+i) * 0.45}"
        transform="rotate(${Math.floor(srand(seed*149+i)*360)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
    }
    return `<g ${clip} opacity="${o + .12 * dim}">${s}</g>`;
  }
  if (kind === "ripple"){
    let s = "";
    const ox = zone.x + zone.w * (srand(seed*151) > .5 ? 0.9 : 0.15);
    const oy = zone.y + zone.h * (srand(seed*157) > .5 ? 0.85 : 0.2);
    for (let i = 0; i < 8; i++)
      s += `<circle cx="${ox}" cy="${oy}" r="${H * (0.07 + i * 0.11)}" fill="none"
        stroke="${i % 3 === 2 ? p.acc2 : a}" stroke-width="${H * 0.0045}"
        opacity="${(0.75 - i * 0.08).toFixed(2)}"/>`;
    return `<g ${clip} opacity="${o + .1 * dim}">${s}</g>`;
  }
  if (kind === "mesh"){
    let s = "";
    const n = 5 + Math.floor(srand(seed*163) * 3);
    const pts = [];
    for (let i = 0; i < n * 2; i++)
      pts.push([zone.x + srand(seed * 167 + i) * zone.w,
                zone.y + srand(seed * 173 + i) * zone.h]);
    pts.forEach(function(a1, i){
      pts.forEach(function(b1, k){
        if (k <= i) return;
        const d2 = Math.hypot(a1[0]-b1[0], a1[1]-b1[1]);
        if (d2 > H * 0.42) return;
        s += `<line x1="${a1[0].toFixed(1)}" y1="${a1[1].toFixed(1)}" x2="${b1[0].toFixed(1)}"
          y2="${b1[1].toFixed(1)}" stroke="${a}" stroke-width="${H*0.0028}"
          opacity="${(1 - d2 / (H * 0.42)).toFixed(2)}"/>`;
      });
      s += `<circle cx="${a1[0].toFixed(1)}" cy="${a1[1].toFixed(1)}" r="${H*0.007}"
        fill="${i % 4 === 0 ? p.acc2 : a}" opacity=".8"/>`;
    });
    return `<g ${clip} opacity="${o + .2 * dim}">${s}</g>`;
  }
  if (kind === "chart"){
    const n = 7 + Math.floor(srand(seed*179) * 5);
    let d2 = "", area = "";
    const stepx = zone.w / (n - 1);
    for (let i = 0; i < n; i++){
      const x = zone.x + i * stepx;
      const y = zone.y + zone.h * (0.78 - srand(seed * 181 + i) * 0.5);
      d2 += (i ? " L" : "M") + `${x.toFixed(1)} ${y.toFixed(1)}`;
      area += (i ? " L" : `M${zone.x} ${zone.y + zone.h} L`) + `${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    area += ` L${zone.x + zone.w} ${zone.y + zone.h} Z`;
    return `<g ${clip} opacity="${o + .18 * dim}"><path d="${area}" fill="${a}" opacity=".14"/>
      <path d="${d2}" fill="none" stroke="${a}" stroke-width="${H*0.008}"
      stroke-linecap="round" stroke-linejoin="round"/></g>`;
  }
  if (kind === "spiral"){
    let d2 = "";
    for (let t = 0; t < 32; t++){
      const ang = t * 0.42 + rot / 60;
      const rr = r * (0.06 + t * 0.031);
      const x = cx + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr * 0.92;
      d2 += (t ? " L" : "M") + `${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return `<g ${clip} opacity="${o + .12 * dim}"><path d="${d2}" fill="none" stroke="${a}"
      stroke-width="${H*0.006}" stroke-linecap="round"/></g>`;
  }
  if (kind === "scatter"){
    let s = "";
    for (let i = 0; i < 40; i++){
      const x = zone.x + srand(seed * 191 + i) * zone.w;
      const y = zone.y + srand(seed * 193 + i) * zone.h;
      const rr = H * (0.002 + srand(seed * 197 + i) * 0.016);
      s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rr.toFixed(2)}"
        fill="${i % 5 === 0 ? p.acc2 : a}" opacity="${(0.15 + srand(seed*199+i) * 0.6).toFixed(2)}"/>`;
    }
    return `<g ${clip} opacity="${o + .18 * dim}">${s}</g>`;
  }
  const amp = zone.h * (0.10 + srand(seed*53) * 0.14);
  let d = `M ${zone.x} ${cy}`;
  const stepx = zone.w / 8;
  for (let k = 0; k < 8; k++){
    const x0 = zone.x + k * stepx;
    d += ` Q ${x0 + stepx*0.5} ${cy + (k % 2 ? amp : -amp)} ${x0 + stepx} ${cy}`;
  }
  return `<g ${clip} opacity="${o + .18 * dim}"><path d="${d}" fill="none" stroke="${a}"
    stroke-width="${H*0.018}" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="${p.acc2}" stroke-width="${H*0.005}"
    transform="translate(0 ${amp*0.6})" opacity=".6"/></g>`;
}

function wrap(words, maxW, fs, weight){
  const k = weight >= 700 ? 0.545 : 0.5;
  const lines = [[]];
  let w = 0;
  words.forEach(function(t){
    const tw = (t[0].length + 1) * fs * k;
    if (w + tw > maxW && lines[lines.length - 1].length){ lines.push([]); w = 0; }
    lines[lines.length - 1].push(t);
    w += tw;
  });
  return lines;
}

function lineW(ln, fs, weight){
  const k = weight >= 700 ? 0.545 : 0.5;
  return ln.reduce(function(a, t){ return a + (t[0].length + 1) * fs * k; }, 0);
}

function fitLines(words, maxW, maxH, base, weight){
  let fs = base;
  for (let i = 0; i < 26; i++){
    const lines = wrap(words, maxW, fs, weight);
    const widest = Math.max.apply(null, lines.map(function(l){ return lineW(l, fs, weight); }));
    if (widest <= maxW && lines.length * fs * 1.16 <= maxH && lines.length <= 4)
      return {fs: fs, lines: lines};
    fs = Math.round(fs * 0.93);
    if (fs < 20) break;
  }
  return {fs: fs, lines: wrap(words, maxW, fs, weight)};
}

let UID = 0;


const ORN2 = (function () {
  var W = 440, H = 248;
  function sr(n){ var x = Math.sin(n * 9301 + 49297) * 233280; return x - Math.floor(x); }
  var ORN = {};
ORN.dna = function(p,s){
  function helix(cx, cy, len, rot, amp, per, col1, col2, o, lw){
    var g = '<g transform="rotate(' + rot + ' ' + cx + ' ' + cy + ')" opacity="' + o + '">';
    var d1 = "", d2 = "", rungs = "", dots = "";
    for (var t = 0; t <= 30; t++){
      var y = cy - len/2 + t*len/30;
      var ph = y/per*Math.PI*2 + s;
      var x1 = cx + Math.sin(ph)*amp, x2 = cx + Math.sin(ph+Math.PI)*amp;
      d1 += (t ? " L" : "M") + x1.toFixed(1) + " " + y.toFixed(1);
      d2 += (t ? " L" : "M") + x2.toFixed(1) + " " + y.toFixed(1);
      if (t % 3 === 1){
        var vis = Math.cos(ph);
        rungs += '<line x1="'+x1.toFixed(1)+'" y1="'+y.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y.toFixed(1)+'" stroke="'+col1+'" stroke-width="'+(lw*0.7)+'" opacity="'+(0.25+Math.abs(vis)*0.4)+'"/>';
        dots += '<circle cx="'+x1.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+(lw*1.15)+'" fill="'+col1+'"/>' +
                '<circle cx="'+x2.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+(lw*1.15)+'" fill="'+col2+'"/>';
      }
    }
    g += rungs;
    g += '<path d="'+d1+'" fill="none" stroke="'+col1+'" stroke-width="'+lw+'" opacity=".85"/>';
    g += '<path d="'+d2+'" fill="none" stroke="'+col2+'" stroke-width="'+lw+'" opacity=".6"/>';
    g += dots + "</g>";
    return g;
  }
  return helix(W*0.74, H*0.5, H*1.3, 24, 40, 118, p.acc, p.acc2, 0.9, 2.4) +
         helix(W*0.58, H*0.9, H*0.5, -28, 20, 70, p.acc, p.acc2, 0.35, 1.6) +
         helix(W*0.95, H*0.24, H*0.55, -12, 20, 66, p.acc2, p.acc, 0.35, 1.5);
}
ORN.molecules = function(p,s){
  var nodes = [], out = "";
  for (var i = 0; i < 9; i++)
    nodes.push([W*0.35 + sr(s+i)*W*0.6, H*0.08 + sr(s+i*7)*H*0.86, 5 + sr(s+i*13)*9]);
  for (i = 0; i < 8; i++){
    var a = nodes[i], b = nodes[(i+2)%9];
    out += '<line x1="'+a[0]+'" y1="'+a[1]+'" x2="'+b[0]+'" y2="'+b[1]+'" stroke="'+p.acc+'" stroke-width="1.3" opacity=".35"/>';
  }
  for (i = 0; i < 9; i++)
    out += '<circle cx="'+nodes[i][0]+'" cy="'+nodes[i][1]+'" r="'+nodes[i][2]+'" fill="none" stroke="'+(i%3?p.acc:p.acc2)+'" stroke-width="2" opacity=".8"/>';
  return out;
};
ORN.hexchain = function(p,s){
  function hex(cx,cy,r,o,col){ var pts=[]; for(var k=0;k<6;k++){var a=Math.PI/3*k+Math.PI/6; pts.push((cx+r*Math.cos(a)).toFixed(1)+","+(cy+r*Math.sin(a)).toFixed(1));} return '<polygon points="'+pts.join(" ")+'" fill="none" stroke="'+col+'" stroke-width="2" opacity="'+o+'"/>'; }
  var out = "", x = W*0.56, y = H*0.72;
  for (var i = 0; i < 5; i++){
    out += hex(x, y, 34, .75 - i*0.09, i%2 ? p.acc2 : p.acc);
    x += 52; y -= 34 * (i%2 ? 1 : -0.3);
  }
  out += hex(W*0.7, H*0.18, 20, .5, p.acc);
  return out;
};
ORN.heartbeat = function(p,s){
  var y = H*0.58, d = "M-10 "+y;
  var x = 30 + sr(s)*40;
  while (x < W + 20){
    d += " L"+x+" "+y+" l10 -6 l8 34 l9 -58 l8 34 l9 -10 l12 6";
    x += 190; d += " L"+x+" "+y;
  }
  return '<path d="'+d+'" fill="none" stroke="'+p.acc+'" stroke-width="2.4" opacity=".8" stroke-linejoin="round"/>' +
         '<circle cx="'+(W*0.72)+'" cy="'+(y-2)+'" r="4" fill="'+p.acc2+'" opacity=".9"/>';
};
ORN.capsule = function(p,s){
  var out = "";
  for (var i = 0; i < 7; i++){
    var x = W*0.3 + sr(s+i)*W*0.62, y = H*0.1 + sr(s+i*5)*H*0.8;
    var rot = Math.floor(sr(s+i*9)*360), w = 44, h = 18;
    out += '<g transform="rotate('+rot+' '+x+' '+y+')" opacity="'+(0.4+sr(s+i*3)*0.45)+'">' +
      '<rect x="'+(x-w/2)+'" y="'+(y-h/2)+'" width="'+w+'" height="'+h+'" rx="'+h/2+'" fill="none" stroke="'+(i%2?p.acc:p.acc2)+'" stroke-width="2"/>' +
      '<line x1="'+x+'" y1="'+(y-h/2)+'" x2="'+x+'" y2="'+(y+h/2)+'" stroke="'+(i%2?p.acc:p.acc2)+'" stroke-width="1.4"/></g>';
  }
  return out;
};

ORN.route = function(p,s){
  var pts = [[W*0.3,H*0.85],[W*0.48,H*0.55],[W*0.68,H*0.68],[W*0.82,H*0.3],[W*0.94,H*0.42]];
  var d = "M"+pts[0][0]+" "+pts[0][1], out = "";
  for (var i = 1; i < pts.length; i++){
    var mx = (pts[i-1][0]+pts[i][0])/2;
    d += " Q"+mx+" "+(pts[i-1][1]-30)+" "+pts[i][0]+" "+pts[i][1];
  }
  out += '<path d="'+d+'" fill="none" stroke="'+p.acc+'" stroke-width="2" stroke-dasharray="7 8" opacity=".75"/>';
  for (i = 0; i < pts.length - 1; i++)
    out += '<circle cx="'+pts[i][0]+'" cy="'+pts[i][1]+'" r="4.5" fill="none" stroke="'+p.acc+'" stroke-width="2" opacity=".8"/>';
  var e = pts[pts.length-1];
  out += '<path d="M'+e[0]+' '+(e[1]-24)+' a12 12 0 1 1 -0.1 0 Z" fill="none" stroke="'+p.acc2+'" stroke-width="2.4" opacity=".95"/>' +
         '<circle cx="'+e[0]+'" cy="'+(e[1]-12-0)+'" r="4" fill="'+p.acc2+'"/>' ;
  return out;
};
ORN.contrails = function(p,s){
  var out = "";
  for (var i = 0; i < 3; i++){
    var y0 = H*(0.75 - i*0.22), x1 = W*0.25 + i*30;
    out += '<path d="M'+x1+' '+y0+' Q'+(W*0.65)+' '+(y0-70)+' '+(W+10)+' '+(y0-95)+'" fill="none" stroke="'+(i===1?p.acc2:p.acc)+'" stroke-width="2" stroke-dasharray="'+(i===1?'2 7':'14 9')+'" opacity="'+(0.7-i*0.15)+'"/>';
  }
  out += '<circle cx="'+(W*0.86)+'" cy="'+(H*0.2)+'" r="5" fill="'+p.acc2+'" opacity=".9"/>';
  return out;
};
ORN.mountains = function(p,s){
  var out = "";
  for (var l = 0; l < 3; l++){
    var base = H*(0.66 + l*0.16), d = "M-10 "+base, x = -10;
    var i = 0;
    while (x < W + 30){
      x += 60 + sr(s+l*9+i)*70;
      d += " L"+x+" "+(base - 40 - sr(s+l*7+i)*55 - l*8);
      x += 55 + sr(s+l*3+i)*60;
      d += " L"+x+" "+base;
      i++;
    }
    out += '<path d="'+d+'" fill="none" stroke="'+(l===0?p.acc2:p.acc)+'" stroke-width="2" opacity="'+(0.8-l*0.25)+'" stroke-linejoin="round"/>';
  }
  return out;
};
ORN.compass = function(p,s){
  var cx = W*0.72, cy = H*0.5, r = 78, out = "";
  out += '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+p.acc+'" stroke-width="2" opacity=".65"/>';
  out += '<circle cx="'+cx+'" cy="'+cy+'" r="'+(r*0.72)+'" fill="none" stroke="'+p.acc+'" stroke-width="1" opacity=".35"/>';
  for (var k = 0; k < 16; k++){
    var a = Math.PI/8*k, l = (k%4===0) ? 12 : 6;
    out += '<line x1="'+(cx+(r-l)*Math.cos(a))+'" y1="'+(cy+(r-l)*Math.sin(a))+'" x2="'+(cx+r*Math.cos(a))+'" y2="'+(cy+r*Math.sin(a))+'" stroke="'+p.acc+'" stroke-width="2" opacity=".6"/>';
  }
  out += '<polygon points="'+cx+','+(cy-r*0.55)+' '+(cx-10)+','+cy+' '+cx+','+(cy-6)+'" fill="'+p.acc2+'" opacity=".9"/>' +
         '<polygon points="'+cx+','+(cy+r*0.55)+' '+(cx+10)+','+cy+' '+cx+','+(cy+6)+'" fill="'+p.acc+'" opacity=".6"/>';
  return out;
};
ORN.horizon = function(p,s){
  var out = '<circle cx="'+(W*0.7)+'" cy="'+(H*0.42)+'" r="52" fill="none" stroke="'+p.acc2+'" stroke-width="2.4" opacity=".85"/>';
  for (var i = 0; i < 5; i++){
    var y = H*0.62 + i*16;
    out += '<path d="M'+(W*0.3 - i*20)+' '+y+' q 40 -12 80 0 t 80 0 t 80 0 t 80 0" fill="none" stroke="'+p.acc+'" stroke-width="1.8" opacity="'+(0.7-i*0.12)+'"/>';
  }
  return out;
};

ORN.gears = function(p,s){
  function gear(cx,cy,r,teeth,col,o){
    var out2 = "", step = Math.PI*2/teeth;
    for (var k = 0; k < teeth; k++){
      var a = step*k;
      out2 += '<rect x="'+(cx+r-3)+'" y="'+(cy-4)+'" width="12" height="8" rx="2" fill="'+col+'" opacity="'+o+'" transform="rotate('+(a*180/Math.PI)+' '+cx+' '+cy+')"/>';
    }
    out2 += '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+col+'" stroke-width="2.4" opacity="'+o+'"/>' +
            '<circle cx="'+cx+'" cy="'+cy+'" r="'+(r*0.4)+'" fill="none" stroke="'+col+'" stroke-width="2" opacity="'+o+'"/>';
    return out2;
  }
  return gear(W*0.74, H*0.32, 42, 10, p.acc, .8) + gear(W*0.92, H*0.62, 30, 8, p.acc2, .65) + gear(W*0.58, H*0.78, 22, 7, p.acc, .4);
};
ORN.speedo = function(p,s){
  var cx = W*0.68, cy = H*0.78, r = 105, out = "";
  out += '<path d="M'+(cx-r)+' '+cy+' A'+r+' '+r+' 0 0 1 '+(cx+r)+' '+cy+'" fill="none" stroke="'+p.acc+'" stroke-width="2.4" opacity=".7"/>';
  for (var k = 0; k <= 10; k++){
    var a = Math.PI + Math.PI*k/10, l = (k%5===0)?16:8;
    out += '<line x1="'+(cx+(r-l)*Math.cos(a))+'" y1="'+(cy+(r-l)*Math.sin(a))+'" x2="'+(cx+r*Math.cos(a))+'" y2="'+(cy+r*Math.sin(a))+'" stroke="'+p.acc+'" stroke-width="2" opacity=".65"/>';
  }
  var na = Math.PI + Math.PI*0.72;
  out += '<line x1="'+cx+'" y1="'+cy+'" x2="'+(cx+(r-26)*Math.cos(na))+'" y2="'+(cy+(r-26)*Math.sin(na))+'" stroke="'+p.acc2+'" stroke-width="3.4" opacity=".95" stroke-linecap="round"/>' +
         '<circle cx="'+cx+'" cy="'+cy+'" r="7" fill="'+p.acc2+'" opacity=".9"/>';
  return out;
};
ORN.tread = function(p,s){
  var out = "";
  for (var i = 0; i < 9; i++){
    var x = W*0.34 + i*36;
    out += '<path d="M'+x+' -10 l26 46 l-26 46 l26 46 l-26 46 l26 46 l-26 46" fill="none" stroke="'+(i%3===1?p.acc2:p.acc)+'" stroke-width="'+(i%3===1?3:2)+'" opacity="'+(0.55-Math.abs(i-4)*0.06)+'" stroke-linejoin="round"/>';
  }
  return out;
};
ORN.nuts = function(p,s){
  function hexn(cx,cy,r,col,o){ var pts=[]; for(var k=0;k<6;k++){var a=Math.PI/3*k; pts.push((cx+r*Math.cos(a)).toFixed(1)+","+(cy+r*Math.sin(a)).toFixed(1));} return '<polygon points="'+pts.join(" ")+'" fill="none" stroke="'+col+'" stroke-width="2.4" opacity="'+o+'"/><circle cx="'+cx+'" cy="'+cy+'" r="'+(r*0.45)+'" fill="none" stroke="'+col+'" stroke-width="2" opacity="'+o+'"/>'; }
  var out = "";
  for (var i = 0; i < 6; i++)
    out += hexn(W*0.34 + sr(s+i)*W*0.58, H*0.12 + sr(s+i*7)*H*0.76, 14 + sr(s+i*11)*16, i%2?p.acc:p.acc2, 0.35 + sr(s+i*5)*0.5);
  return out;
};
ORN.road = function(p,s){
  return '<path d="M'+(W*0.34)+' '+(H+10)+' L'+(W*0.66)+' -10" stroke="'+p.acc+'" stroke-width="2" opacity=".5"/>' +
    '<path d="M'+(W*0.52)+' '+(H+10)+' L'+(W*0.84)+' -10" stroke="'+p.acc+'" stroke-width="2" opacity=".5"/>' +
    '<path d="M'+(W*0.43)+' '+(H+10)+' L'+(W*0.75)+' -10" stroke="'+p.acc2+'" stroke-width="3" stroke-dasharray="18 14" opacity=".8"/>';
};

ORN.plates = function(p,s){
  var out = "";
  var sets = [[W*0.74,H*0.4,50],[W*0.92,H*0.7,32],[W*0.55,H*0.84,22]];
  for (var i = 0; i < 3; i++){
    var c = sets[i];
    out += '<circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+c[2]+'" fill="none" stroke="'+p.acc+'" stroke-width="2.2" opacity=".75"/>' +
           '<circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+(c[2]*0.62)+'" fill="none" stroke="'+(i?p.acc:p.acc2)+'" stroke-width="1.6" opacity=".5"/>';
  }
  return out;
};
ORN.steam = function(p,s){
  var out = "";
  for (var i = 0; i < 4; i++){
    var x = W*0.45 + i*46;
    out += '<path d="M'+x+' '+(H*0.9)+' q 14 -28 0 -52 q -14 -24 0 -50 q 12 -22 4 -44" fill="none" stroke="'+(i%2?p.acc2:p.acc)+'" stroke-width="2.2" opacity="'+(0.7-i*0.12)+'" stroke-linecap="round"/>';
  }
  return out;
};
ORN.beans = function(p,s){
  var out = "";
  for (var i = 0; i < 7; i++){
    var x = W*0.32 + sr(s+i)*W*0.6, y = H*0.1 + sr(s+i*7)*H*0.8;
    var rot = Math.floor(sr(s+i*9)*360);
    out += '<g transform="rotate('+rot+' '+x+' '+y+')" opacity="'+(0.4+sr(s+i*3)*0.45)+'">' +
      '<ellipse cx="'+x+'" cy="'+y+'" rx="17" ry="24" fill="none" stroke="'+(i%2?p.acc:p.acc2)+'" stroke-width="2.2"/>' +
      '<path d="M'+x+' '+(y-22)+' q 8 22 0 44" fill="none" stroke="'+(i%2?p.acc:p.acc2)+'" stroke-width="1.8"/></g>';
  }
  return out;
};
ORN.fizz = function(p,s){
  var out = "";
  for (var i = 0; i < 18; i++){
    var x = W*0.4 + sr(s+i)*W*0.5;
    var y = H - sr(s+i*3)*H*1.05;
    var r = 2.5 + sr(s+i*7)*7 * (y/H);
    out += '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="none" stroke="'+(i%4?p.acc:p.acc2)+'" stroke-width="1.8" opacity="'+(0.25+ (1-y/H)*0.55)+'"/>';
  }
  return out;
};
ORN.citrus = function(p,s){
  var cx = W*0.72, cy = H*0.5, r = 72, out = "";
  out += '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+p.acc+'" stroke-width="2.4" opacity=".8"/>' +
         '<circle cx="'+cx+'" cy="'+cy+'" r="'+(r-9)+'" fill="none" stroke="'+p.acc+'" stroke-width="1.2" opacity=".45"/>';
  for (var k = 0; k < 8; k++){
    var a = Math.PI/4*k + 0.18;
    out += '<path d="M'+cx+' '+cy+' L'+(cx+(r-12)*Math.cos(a))+' '+(cy+(r-12)*Math.sin(a))+'" stroke="'+p.acc2+'" stroke-width="2" opacity=".55"/>';
  }
  return out;
};

ORN.candles = function(p,s){
  var out = "", base = H*0.85;
  for (var i = 0; i < 8; i++){
    var x = W*0.36 + i*38, up = sr(s+i)>0.45;
    var bh = 26 + sr(s+i*7)*52, y = base - bh - sr(s+i*3)*60;
    var col = up ? p.acc : p.acc2;
    out += '<line x1="'+(x+8)+'" y1="'+(y-14)+'" x2="'+(x+8)+'" y2="'+(y+bh+14)+'" stroke="'+col+'" stroke-width="2" opacity=".6"/>' +
           '<rect x="'+x+'" y="'+y+'" width="16" height="'+bh+'" rx="3" fill="none" stroke="'+col+'" stroke-width="2.2" opacity=".85"/>';
  }
  return out;
};
ORN.trendup = function(p,s){
  var pts = [[W*0.3,H*0.82],[W*0.45,H*0.6],[W*0.56,H*0.7],[W*0.72,H*0.36],[W*0.83,H*0.46],[W*0.95,H*0.16]];
  var d = "M"+pts.map(function(q){return q[0]+" "+q[1];}).join(" L");
  var e = pts[pts.length-1];
  return '<path d="'+d+'" fill="none" stroke="'+p.acc+'" stroke-width="2.6" opacity=".85" stroke-linejoin="round"/>' +
    '<path d="M'+(e[0]-16)+' '+(e[1]+2)+' L'+e[0]+' '+e[1]+' L'+(e[0]-4)+' '+(e[1]+18)+'" fill="none" stroke="'+p.acc2+'" stroke-width="2.6" opacity=".95"/>' +
    pts.slice(0,-1).map(function(q,i){ return '<circle cx="'+q[0]+'" cy="'+q[1]+'" r="3.4" fill="'+(i%2?p.acc2:p.acc)+'" opacity=".8"/>'; }).join("");
};
ORN.coins = function(p,s){
  var out = "", stacks = [[W*0.56,4],[W*0.7,7],[W*0.85,5]];
  for (var i = 0; i < 3; i++){
    var x = stacks[i][0], n = stacks[i][1];
    for (var k = 0; k < n; k++){
      var y = H*0.82 - k*13;
      out += '<ellipse cx="'+x+'" cy="'+y+'" rx="30" ry="9" fill="none" stroke="'+(k===n-1?p.acc2:p.acc)+'" stroke-width="2" opacity="'+(0.4+k*0.08)+'"/>';
    }
  }
  return out;
};
ORN.blocks = function(p,s){
  var out = "", x = W*0.32, y = H*0.62;
  for (var i = 0; i < 5; i++){
    out += '<rect x="'+x+'" y="'+(y-21)+'" width="42" height="42" rx="9" fill="none" stroke="'+(i%2?p.acc2:p.acc)+'" stroke-width="2.2" opacity="'+(0.85-i*0.1)+'"/>';
    if (i < 4) out += '<line x1="'+(x+42)+'" y1="'+y+'" x2="'+(x+62)+'" y2="'+y+'" stroke="'+p.acc+'" stroke-width="2" opacity=".5" stroke-dasharray="4 4"/>';
    x += 62; y -= 26;
  }
  return out;
};
ORN.pie = function(p,s){
  var cx = W*0.7, cy = H*0.5, r = 70;
  function arc(a0,a1,col,o,rr){
    var x0=cx+rr*Math.cos(a0), y0=cy+rr*Math.sin(a0), x1=cx+rr*Math.cos(a1), y1=cy+rr*Math.sin(a1);
    return '<path d="M'+x0+' '+y0+' A'+rr+' '+rr+' 0 '+((a1-a0)>Math.PI?1:0)+' 1 '+x1+' '+y1+'" fill="none" stroke="'+col+'" stroke-width="13" opacity="'+o+'"/>';
  }
  return arc(-1.4, 0.9, p.acc, .8, r) + arc(1.05, 2.6, p.acc2, .7, r) + arc(2.75, 4.6, p.acc, .35, r) +
    '<circle cx="'+cx+'" cy="'+cy+'" r="'+(r-26)+'" fill="none" stroke="'+p.acc+'" stroke-width="1.4" opacity=".3"/>';
};

ORN.barbell = function(p,s){
  var cy = H*0.52, out = '<line x1="'+(W*0.3)+'" y1="'+cy+'" x2="'+(W*0.96)+'" y2="'+cy+'" stroke="'+p.acc+'" stroke-width="3" opacity=".7"/>';
  [[W*0.42,30],[W*0.47,40],[W*0.79,40],[W*0.84,30]].forEach(function(dset, i){
    out += '<rect x="'+(dset[0]-6)+'" y="'+(cy-dset[1])+'" width="12" height="'+(dset[1]*2)+'" rx="6" fill="none" stroke="'+(i===1||i===2?p.acc2:p.acc)+'" stroke-width="2.6" opacity=".85"/>';
  });
  return out;
};
ORN.track = function(p,s){
  var out = "";
  for (var i = 0; i < 4; i++){
    var r = 60 + i*24;
    out += '<path d="M'+(W*0.35)+' '+(H+10)+' A'+r+' '+r+' 0 0 1 '+(W*0.35+r*1.7)+' '+(H+10)+'" fill="none" stroke="'+(i===1?p.acc2:p.acc)+'" stroke-width="2.2" opacity="'+(0.75-i*0.14)+'" '+(i===2?'stroke-dasharray="10 10"':'')+'/>';
  }
  return out;
};
ORN.stepsup = function(p,s){
  var out = "", x = W*0.34, y = H*0.86;
  for (var i = 0; i < 6; i++){
    out += '<path d="M'+x+' '+y+' h 46 v -34" fill="none" stroke="'+(i%2?p.acc2:p.acc)+'" stroke-width="2.6" opacity="'+(0.45+i*0.09)+'" stroke-linejoin="round"/>';
    x += 46; y -= 34;
  }
  return out;
};
ORN.rings3 = function(p,s){
  return '<circle cx="'+(W*0.64)+'" cy="'+(H*0.46)+'" r="50" fill="none" stroke="'+p.acc+'" stroke-width="2.6" opacity=".75"/>' +
    '<circle cx="'+(W*0.79)+'" cy="'+(H*0.6)+'" r="50" fill="none" stroke="'+p.acc2+'" stroke-width="2.6" opacity=".65"/>' +
    '<circle cx="'+(W*0.94)+'" cy="'+(H*0.44)+'" r="50" fill="none" stroke="'+p.acc+'" stroke-width="2.6" opacity=".45"/>';
};
ORN.target = function(p,s){
  var cx = W*0.72, cy = H*0.5, out = "";
  for (var i = 0; i < 4; i++)
    out += '<circle cx="'+cx+'" cy="'+cy+'" r="'+(18+i*20)+'" fill="none" stroke="'+(i===0?p.acc2:p.acc)+'" stroke-width="2.2" opacity="'+(0.85-i*0.16)+'"/>';
  out += '<line x1="'+(cx-100)+'" y1="'+(cy+70)+'" x2="'+(cx-8)+'" y2="'+(cy+6)+'" stroke="'+p.acc2+'" stroke-width="2.4" opacity=".8"/>' +
    '<path d="M'+(cx-26)+' '+(cy+4)+' L'+(cx-8)+' '+(cy+6)+' L'+(cx-14)+' '+(cy+22)+'" fill="none" stroke="'+p.acc2+'" stroke-width="2.4" opacity=".8"/>';
  return out;
};

ORN.petals = function(p,s){
  var cx = W*0.78, cy = H*0.48, out = "";
  for (var k = 0; k < 10; k++){
    var a = Math.PI*2/10*k + sr(s)*0.6;
    out += '<ellipse cx="'+(cx+52*Math.cos(a))+'" cy="'+(cy+52*Math.sin(a))+'" rx="30" ry="13" fill="none" stroke="'+(k%2?p.acc:p.acc2)+'" stroke-width="2" opacity="'+(0.35+ (k%3)*0.2)+'" transform="rotate('+(a*180/Math.PI)+' '+(cx+52*Math.cos(a))+' '+(cy+52*Math.sin(a))+')"/>';
  }
  out += '<circle cx="'+cx+'" cy="'+cy+'" r="12" fill="none" stroke="'+p.acc2+'" stroke-width="2.4" opacity=".9"/>';
  return out;
};
ORN.silk = function(p,s){
  var out = "";
  for (var i = 0; i < 5; i++){
    var y = H*0.2 + i*34;
    out += '<path d="M'+(W*0.26)+' '+y+' C '+(W*0.45)+' '+(y-46)+', '+(W*0.6)+' '+(y+52)+', '+(W*0.8)+' '+(y-6)+' S '+(W+30)+' '+(y+8)+', '+(W+30)+' '+(y-20)+'" fill="none" stroke="'+(i===2?p.acc2:p.acc)+'" stroke-width="2" opacity="'+(0.65-i*0.1)+'"/>';
  }
  return out;
};
ORN.sparkle = function(p,s){
  var out = "";
  for (var i = 0; i < 8; i++){
    var x = W*0.35 + sr(s+i)*W*0.6, y = H*0.1 + sr(s+i*7)*H*0.8, r = 7 + sr(s+i*3)*15;
    out += '<path d="M'+x+' '+(y-r)+' Q '+x+' '+y+' '+(x+r)+' '+y+' Q '+x+' '+y+' '+x+' '+(y+r)+' Q '+x+' '+y+' '+(x-r)+' '+y+' Q '+x+' '+y+' '+x+' '+(y-r)+' Z" fill="'+(i%3?p.acc:p.acc2)+'" opacity="'+(0.25+sr(s+i*5)*0.6)+'"/>';
  }
  return out;
};
ORN.veil = function(p,s){
  var cx = W*0.66, cy = H*0.96, out = "";
  for (var i = 0; i < 4; i++){
    var r = 62 + i*36;
    out += '<path d="M'+(cx - r*Math.cos(0.42))+' '+(cy - r*Math.sin(0.42))+' A'+r+' '+r+' 0 0 1 '+(cx + r*Math.cos(0.42))+' '+(cy - r*Math.sin(0.42))+'" fill="none" stroke="'+(i===1?p.acc2:p.acc)+'" stroke-width="'+(2.6-i*0.3)+'" opacity="'+(0.85-i*0.16)+'"/>';
  }
  for (var k = 0; k <= 7; k++){
    var a = 0.45 + (Math.PI - 0.9)*k/7;
    out += '<line x1="'+(cx + 30*Math.cos(a))+'" y1="'+(cy - 30*Math.sin(a))+'" x2="'+(cx + 178*Math.cos(a))+'" y2="'+(cy - 178*Math.sin(a))+'" stroke="'+(k%2?p.acc:p.acc2)+'" stroke-width="1.6" opacity=".45"/>';
  }
  out += '<circle cx="'+cx+'" cy="'+(cy-14)+'" r="8" fill="none" stroke="'+p.acc2+'" stroke-width="2.4" opacity=".9"/>';
  return out;
}
ORN.beads = function(p,s){
  var out = "";
  for (var l = 0; l < 3; l++){
    var y0 = -20 + l*10, sag = 90 + l*44;
    out += '<path d="M'+(W*0.3)+' '+y0+' Q '+(W*0.66)+' '+(y0+sag)+' '+(W+16)+' '+(y0+18)+'" fill="none" stroke="'+p.acc+'" stroke-width="1.4" opacity=".4"/>';
    for (var k = 1; k < 8; k++){
      var t = k/8, x = (1-t)*(1-t)*(W*0.3) + 2*(1-t)*t*(W*0.66) + t*t*(W+16);
      var y = (1-t)*(1-t)*y0 + 2*(1-t)*t*(y0+sag) + t*t*(y0+18);
      out += '<circle cx="'+x+'" cy="'+y+'" r="'+(4+((k+l)%3)*2.6)+'" fill="none" stroke="'+((k+l)%2?p.acc:p.acc2)+'" stroke-width="2" opacity=".75"/>';
    }
  }
  return out;
};

ORN.circuit = function(p,s){
  var out = "", segs = [
    "M"+(W*0.52)+" "+(H+10)+" V"+(H*0.62)+" H"+(W*0.66)+" V"+(H*0.32),
    "M"+(W*0.72)+" -10 V"+(H*0.28)+" H"+(W*0.86)+" V"+(H*0.62),
    "M"+(W*0.62)+" "+(H*0.8)+" H"+(W*0.82)+" V"+(H*0.94)
  ];
  segs.forEach(function(d, i){
    out += '<path d="'+d+'" fill="none" stroke="'+(i===1?p.acc2:p.acc)+'" stroke-width="2.2" opacity=".65"/>';
  });
  [[W*0.66,H*0.32],[W*0.86,H*0.62],[W*0.82,H*0.94],[W*0.52,H*0.62]].forEach(function(pt, i){
    out += '<circle cx="'+pt[0]+'" cy="'+pt[1]+'" r="6" fill="none" stroke="'+(i%2?p.acc2:p.acc)+'" stroke-width="2.4" opacity=".9"/>';
  });
  return out;
};
ORN.pixels = function(p,s){
  var out = "";
  for (var gx = 0; gx < 9; gx++)
    for (var gy = 0; gy < 6; gy++){
      var v = sr(s + gx*7 + gy*13);
      if (v < 0.45) continue;
      out += '<rect x="'+(W*0.36+gx*26)+'" y="'+(H*0.12+gy*26)+'" width="17" height="17" rx="4" fill="'+(v>0.85?p.acc2:p.acc)+'" opacity="'+((v-0.4)*0.9)+'"/>';
    }
  return out;
};
ORN.chevrons = function(p,s){
  var out = "";
  for (var i = 0; i < 5; i++){
    var x = W*0.4 + i*44;
    out += '<path d="M'+x+' '+(H*0.24)+' l 34 '+(H*0.26)+' l -34 '+(H*0.26)+'" fill="none" stroke="'+(i===2?p.acc2:p.acc)+'" stroke-width="3" opacity="'+(0.85-i*0.14)+'" stroke-linejoin="round" stroke-linecap="round"/>';
  }
  return out;
};
ORN.terminal = function(p,s){
  var out = "", rows = [[0.5,0.34],[0.72,0.3],[0.4,0.26],[0.62,0.22],[0.3,0.18]];
  for (var i = 0; i < 5; i++){
    var y = H*0.2 + i*30;
    out += '<rect x="'+(W*0.36)+'" y="'+y+'" width="'+(W*rows[i][0]*0.8)+'" height="10" rx="5" fill="'+(i===1?p.acc2:p.acc)+'" opacity="'+rows[i][1]+'"/>';
  }
  out += '<rect x="'+(W*0.36)+'" y="'+(H*0.2+150)+'" width="26" height="12" rx="3" fill="'+p.acc2+'" opacity=".95"/>';
  return out;
};
ORN.netgraph = function(p,s){
  var nodes = [], out = "";
  for (var i = 0; i < 7; i++)
    nodes.push([W*0.36 + sr(s+i*3)*W*0.58, H*0.1 + sr(s+i*11)*H*0.8]);
  for (i = 0; i < 7; i++)
    for (var j = i+1; j < 7; j++){
      if (sr(s+i*17+j*7) > 0.55) continue;
      out += '<line x1="'+nodes[i][0]+'" y1="'+nodes[i][1]+'" x2="'+nodes[j][0]+'" y2="'+nodes[j][1]+'" stroke="'+p.acc+'" stroke-width="1.2" opacity=".3"/>';
    }
  for (i = 0; i < 7; i++)
    out += '<circle cx="'+nodes[i][0]+'" cy="'+nodes[i][1]+'" r="'+(4+sr(s+i*5)*5)+'" fill="'+(i%3?p.acc:p.acc2)+'" opacity=".85"/>';
  return out;
};

ORN.playset = function(p,s){
  var out = "";
  var sets = [[W*0.74,H*0.34,32],[W*0.9,H*0.62,24],[W*0.58,H*0.8,18]];
  for (var i = 0; i < 3; i++){
    var c = sets[i], r = c[2];
    out += '<circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+r+'" fill="none" stroke="'+(i?p.acc:p.acc2)+'" stroke-width="2.4" opacity="'+(0.85-i*0.2)+'"/>' +
      '<polygon points="'+(c[0]-r*0.28)+','+(c[1]-r*0.42)+' '+(c[0]+r*0.5)+','+c[1]+' '+(c[0]-r*0.28)+','+(c[1]+r*0.42)+'" fill="'+(i?p.acc:p.acc2)+'" opacity="'+(0.8-i*0.2)+'"/>';
  }
  return out;
};
ORN.frames = function(p,s){
  var out = "";
  for (var i = 0; i < 3; i++){
    out += '<rect x="'+(W*0.58+i*24)+'" y="'+(H*0.22+i*20)+'" width="'+(W*0.4)+'" height="'+(H*0.5)+'" rx="14" fill="none" stroke="'+(i===0?p.acc2:p.acc)+'" stroke-width="2.2" opacity="'+(0.85-i*0.25)+'"/>';
  }
  out += '<circle cx="'+(W*0.63)+'" cy="'+(H*0.3)+'" r="5" fill="'+p.acc2+'" opacity=".9"/>';
  return out;
};
ORN.wavebars = function(p,s){
  var out = "", cy = H*0.52;
  for (var i = 0; i < 26; i++){
    var x = W*0.32 + i*11;
    var h = 8 + Math.abs(Math.sin(i*0.55 + s))*62;
    out += '<line x1="'+x+'" y1="'+(cy-h/2)+'" x2="'+x+'" y2="'+(cy+h/2)+'" stroke="'+(i%5===2?p.acc2:p.acc)+'" stroke-width="4" stroke-linecap="round" opacity="'+(0.35+Math.abs(Math.sin(i*0.55+s))*0.5)+'"/>';
  }
  return out;
};
ORN.filmstrip = function(p,s){
  var out = '<path d="M'+(W*0.3)+' '+(H*0.7)+' Q '+(W*0.6)+' '+(H*0.2)+' '+(W+20)+' '+(H*0.44)+'" fill="none" stroke="'+p.acc+'" stroke-width="34" opacity=".18"/>';
  for (var t = 0; t < 12; t++){
    var tt = t/12, x = (1-tt)*(1-tt)*(W*0.3) + 2*(1-tt)*tt*(W*0.6) + tt*tt*(W+20);
    var y = (1-tt)*(1-tt)*(H*0.7) + 2*(1-tt)*tt*(H*0.2) + tt*tt*(H*0.44);
    out += '<rect x="'+(x-5)+'" y="'+(y-5)+'" width="10" height="10" rx="2" fill="'+p.acc2+'" opacity=".6"/>';
  }
  return out;
};
ORN.spotlight = function(p,s){
  var out = "";
  for (var i = 0; i < 4; i++){
    var a = 0.5 + i*0.24;
    out += '<path d="M'+(W+16)+' -16 L'+(W - Math.cos(a)*W*0.75)+' '+(Math.sin(a)*H*1.1)+'" stroke="'+(i%2?p.acc2:p.acc)+'" stroke-width="'+(14-i*3)+'" opacity="'+(0.18+i*0.04)+'" stroke-linecap="round"/>';
  }
  out += '<circle cx="'+(W*0.42)+'" cy="'+(H*0.76)+'" r="9" fill="none" stroke="'+p.acc2+'" stroke-width="2.4" opacity=".8"/>';
  return out;
};

ORN.confetti = function(p,s){
  var out = "";
  for (var i = 0; i < 16; i++){
    var x = W*0.32 + sr(s+i)*W*0.62, y = H*0.06 + sr(s+i*7)*H*0.88;
    var rot = Math.floor(sr(s+i*9)*360), kind = i%3;
    var col = i%2 ? p.acc : p.acc2, o = 0.3 + sr(s+i*3)*0.55;
    if (kind === 0) out += '<rect x="'+x+'" y="'+y+'" width="14" height="6" rx="2" fill="'+col+'" opacity="'+o+'" transform="rotate('+rot+' '+x+' '+y+')"/>';
    else if (kind === 1) out += '<circle cx="'+x+'" cy="'+y+'" r="5" fill="none" stroke="'+col+'" stroke-width="2" opacity="'+o+'"/>';
    else out += '<path d="M'+x+' '+y+' q 7 -8 14 0 q -7 8 -14 0" fill="'+col+'" opacity="'+o+'"/>';
  }
  return out;
};
ORN.zigzag = function(p,s){
  var out = "";
  for (var l = 0; l < 4; l++){
    var y = H*0.24 + l*46, d = "M"+(W*0.28)+" "+y, x = W*0.28;
    while (x < W + 20){ x += 34; d += " L"+x+" "+(y - 22); x += 34; d += " L"+x+" "+y; }
    out += '<path d="'+d+'" fill="none" stroke="'+(l===1?p.acc2:p.acc)+'" stroke-width="2.6" opacity="'+(0.7-l*0.13)+'" stroke-linejoin="round"/>';
  }
  return out;
};
ORN.doodle = function(p,s){
  var d = "M"+(W*0.38)+" "+(H*0.74), x = W*0.38;
  for (var i = 0; i < 4; i++){
    x += 70;
    d += " a 26 26 0 1 1 26 -26 q 8 30 44 " + (i%2 ? "8" : "-4");
  }
  return '<path d="'+d+'" fill="none" stroke="'+p.acc+'" stroke-width="2.4" opacity=".7" stroke-linecap="round"/>' +
    '<circle cx="'+(W*0.88)+'" cy="'+(H*0.32)+'" r="6" fill="'+p.acc2+'" opacity=".85"/>';
};
ORN.speech = function(p,s){
  var out = "";
  var sets = [[W*0.62,H*0.28,92,52],[W*0.82,H*0.64,70,42]];
  for (var i = 0; i < 2; i++){
    var c = sets[i];
    out += '<rect x="'+(c[0]-c[2]/2)+'" y="'+(c[1]-c[3]/2)+'" width="'+c[2]+'" height="'+c[3]+'" rx="'+(c[3]/2.4)+'" fill="none" stroke="'+(i?p.acc2:p.acc)+'" stroke-width="2.4" opacity="'+(0.85-i*0.2)+'"/>' +
      '<path d="M'+(c[0]-10)+' '+(c[1]+c[3]/2)+' l -6 16 l 20 -16" fill="none" stroke="'+(i?p.acc2:p.acc)+'" stroke-width="2.4" opacity="'+(0.85-i*0.2)+'"/>';
    for (var k = 0; k < 3; k++)
      out += '<circle cx="'+(c[0]-16+k*16)+'" cy="'+c[1]+'" r="3" fill="'+(i?p.acc2:p.acc)+'" opacity=".8"/>';
  }
  return out;
};
ORN.burst = function(p,s){
  var cx = W*0.78, cy = H*0.46, out = "";
  for (var k = 0; k < 14; k++){
    var a = Math.PI*2/14*k, r0 = 34 + sr(s+k)*10, r1 = r0 + 20 + sr(s+k*3)*30;
    out += '<line x1="'+(cx+r0*Math.cos(a))+'" y1="'+(cy+r0*Math.sin(a))+'" x2="'+(cx+r1*Math.cos(a))+'" y2="'+(cy+r1*Math.sin(a))+'" stroke="'+(k%3?p.acc:p.acc2)+'" stroke-width="3" opacity="'+(0.4+sr(s+k*7)*0.4)+'" stroke-linecap="round"/>';
  }
  out += '<circle cx="'+cx+'" cy="'+cy+'" r="16" fill="none" stroke="'+p.acc2+'" stroke-width="2.4" opacity=".9"/>';
  return out;
};

ORN.books = function(p,s){
  var out = "", x = W*0.74, y = H*0.88;
  var ws = [120, 104, 112, 88, 96];
  for (var i = 0; i < 5; i++){
    var h = 22, off = (sr(s+i*7) - 0.5) * 26;
    out += '<rect x="'+(x+off-ws[i]/2)+'" y="'+(y-h)+'" width="'+ws[i]+'" height="'+h+'" rx="5" fill="none" stroke="'+(i%2?p.acc2:p.acc)+'" stroke-width="2.2" opacity="'+(0.45+i*0.11)+'"/>' +
      '<line x1="'+(x+off-ws[i]/2+10)+'" y1="'+(y-h/2)+'" x2="'+(x+off-ws[i]/2+22)+'" y2="'+(y-h/2)+'" stroke="'+(i%2?p.acc2:p.acc)+'" stroke-width="2" opacity=".5"/>';
    y -= h + 4;
  }
  return out;
};
ORN.page = function(p,s){
  var x = W*0.6, y = H*0.14, w = 140, h = 180, f = 26;
  var out = '<path d="M'+x+' '+y+' H'+(x+w-f)+' L'+(x+w)+' '+(y+f)+' V'+(y+h)+' H'+x+' Z" fill="none" stroke="'+p.acc+'" stroke-width="2.4" opacity=".8"/>' +
    '<path d="M'+(x+w-f)+' '+y+' V'+(y+f)+' H'+(x+w)+'" fill="none" stroke="'+p.acc2+'" stroke-width="2.2" opacity=".85"/>';
  for (var i = 1; i <= 5; i++)
    out += '<line x1="'+(x+18)+'" y1="'+(y+22+i*24)+'" x2="'+(x+w-18-(i===5?40:0))+'" y2="'+(y+22+i*24)+'" stroke="'+p.acc+'" stroke-width="1.8" opacity=".4"/>';
  return out;
};
ORN.bulb = function(p,s){
  var cx = W*0.74, cy = H*0.42, r = 46, out = "";
  out += '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+p.acc+'" stroke-width="2.6" opacity=".85"/>' +
    '<path d="M'+(cx-14)+' '+(cy+r)+' v 16 h 28 v -16" fill="none" stroke="'+p.acc+'" stroke-width="2.4" opacity=".7"/>' +
    '<line x1="'+(cx-14)+'" y1="'+(cy+r+22)+'" x2="'+(cx+14)+'" y2="'+(cy+r+22)+'" stroke="'+p.acc+'" stroke-width="2.4" opacity=".55"/>' +
    '<path d="M'+(cx-12)+' '+(cy+6)+' q 12 -18 24 0" fill="none" stroke="'+p.acc2+'" stroke-width="2.2" opacity=".8"/>';
  for (var k = 0; k < 7; k++){
    var a = -Math.PI*0.85 + k*Math.PI*0.28;
    if (Math.abs(Math.sin(a)) < 0.2) continue;
    out += '<line x1="'+(cx+(r+12)*Math.cos(a))+'" y1="'+(cy+(r+12)*Math.sin(a))+'" x2="'+(cx+(r+26)*Math.cos(a))+'" y2="'+(cy+(r+26)*Math.sin(a))+'" stroke="'+p.acc2+'" stroke-width="2.4" opacity=".7"/>';
  }
  return out;
};
ORN.pencilline = function(p,s){
  return '<path d="M'+(W*0.3)+' '+(H*0.78)+' C '+(W*0.5)+' '+(H*0.6)+', '+(W*0.55)+' '+(H*0.95)+', '+(W*0.72)+' '+(H*0.8)+' S '+(W*0.95)+' '+(H*0.55)+', '+(W+20)+' '+(H*0.68)+'" fill="none" stroke="'+p.acc+'" stroke-width="3" opacity=".7" stroke-linecap="round"/>' +
    '<path d="M'+(W*0.84)+' '+(H*0.2)+' l 26 -8 l -6 26 Z" fill="none" stroke="'+p.acc2+'" stroke-width="2.2" opacity=".85"/>' +
    '<line x1="'+(W*0.84)+'" y1="'+(H*0.2)+'" x2="'+(W*0.7)+'" y2="'+(H*0.34)+'" stroke="'+p.acc2+'" stroke-width="2" opacity=".5" stroke-dasharray="3 6"/>';
};
ORN.progress = function(p,s){
  var out = "", x = W*0.62, w = 140;
  for (var i = 0; i < 4; i++){
    var y = H*0.26 + i*42, f = [1, 0.7, 0.45, 0.2][i];
    out += '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="12" rx="6" fill="none" stroke="'+p.acc+'" stroke-width="1.8" opacity=".5"/>' +
      '<rect x="'+x+'" y="'+y+'" width="'+(w*f)+'" height="12" rx="6" fill="'+(i?p.acc:p.acc2)+'" opacity="'+(0.7-i*0.12)+'"/>' +
      (f === 1 ? '<circle cx="'+(x+w+24)+'" cy="'+(y+6)+'" r="9" fill="none" stroke="'+p.acc2+'" stroke-width="2.2" opacity=".9"/><path d="M'+(x+w+19)+' '+(y+6)+' l 4 4 l 7 -8" fill="none" stroke="'+p.acc2+'" stroke-width="2.2" opacity=".9"/>' : '');
  }
  return out;
};

ORN.maze = function(p,s){
  var cx = W*0.74, cy = H*0.5, out = "", r = 16;
  var d = "M"+cx+" "+cy;
  for (var i = 0; i < 7; i++){
    var dir = i % 4, len = r * (i + 1) * 0.62;
    if (dir === 0) d += " h " + len;
    else if (dir === 1) d += " v " + len;
    else if (dir === 2) d += " h -" + len;
    else d += " v -" + len;
  }
  out += '<path d="'+d+'" fill="none" stroke="'+p.acc+'" stroke-width="2.6" opacity=".8" stroke-linejoin="round"/>' +
    '<circle cx="'+cx+'" cy="'+cy+'" r="5" fill="'+p.acc2+'" opacity=".9"/>' +
    '<circle cx="'+(cx+r*7*0.62-20)+'" cy="'+(cy-r*4*0.62-14)+'" r="6" fill="none" stroke="'+p.acc2+'" stroke-width="2.2" opacity=".85"/>';
  return out;
};
ORN.balance = function(p,s){
  var cx = W*0.74, cy = H*0.5, R = 74;
  return '<path d="M'+cx+' '+(cy-R)+' A'+R+' '+R+' 0 0 1 '+cx+' '+(cy+R)+'" fill="none" stroke="'+p.acc+'" stroke-width="2.6" opacity=".8"/>' +
    '<path d="M'+cx+' '+(cy-R)+' A'+R+' '+R+' 0 0 0 '+cx+' '+(cy+R)+'" fill="none" stroke="'+p.acc2+'" stroke-width="2.6" opacity=".55"/>' +
    '<circle cx="'+cx+'" cy="'+(cy-R/2)+'" r="10" fill="none" stroke="'+p.acc2+'" stroke-width="2.4" opacity=".9"/>' +
    '<circle cx="'+cx+'" cy="'+(cy+R/2)+'" r="10" fill="'+p.acc+'" opacity=".7"/>';
};
ORN.thoughts = function(p,s){
  var out = "", cx = W*0.68, y = H*0.86;
  var rs = [7, 11, 16, 24, 34];
  for (var i = 0; i < 5; i++){
    var x = cx + (sr(s+i*7) - 0.5) * 60 + i*18;
    out += '<circle cx="'+x+'" cy="'+y+'" r="'+rs[i]+'" fill="none" stroke="'+(i%2?p.acc2:p.acc)+'" stroke-width="2.2" opacity="'+(0.4+i*0.12)+'"/>';
    y -= rs[i] + 26;
  }
  return out;
};
ORN.branches = function(p,s){
  function br(x, y, ang, len, depth, col){
    if (depth === 0 || len < 12) return "";
    var x2 = x + Math.cos(ang)*len, y2 = y + Math.sin(ang)*len;
    var out2 = '<line x1="'+x.toFixed(1)+'" y1="'+y.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="'+col+'" stroke-width="'+(depth*0.8)+'" opacity="'+(0.25+depth*0.15)+'"/>';
    out2 += br(x2, y2, ang - 0.5 - sr(s+depth)*0.3, len*0.72, depth-1, col);
    out2 += br(x2, y2, ang + 0.45 + sr(s+depth*3)*0.3, len*0.72, depth-1, col);
    if (depth === 1) out2 += '<circle cx="'+x2.toFixed(1)+'" cy="'+y2.toFixed(1)+'" r="3.4" fill="'+p.acc2+'" opacity=".7"/>';
    return out2;
  }
  return br(W*0.76, H*1.02, -Math.PI/2, 62, 5, p.acc);
};
ORN.calmwaves = function(p,s){
  var out = "";
  for (var i = 0; i < 5; i++){
    var y = H*0.3 + i*(26 + i*7);
    out += '<path d="M'+(W*0.3)+' '+y+' q 55 -'+(16-i*2)+' 110 0 t 110 0 t 110 0" fill="none" stroke="'+(i===2?p.acc2:p.acc)+'" stroke-width="2" opacity="'+(0.65-i*0.1)+'"/>';
  }
  return out;
};

ORN.skyline = function(p,s){
  var out = "", x = W*0.5;
  var hs = [90, 150, 118, 176, 96, 140];
  for (var i = 0; i < 6; i++){
    var w = 34 + sr(s+i)*22, h = hs[i];
    out += '<rect x="'+x+'" y="'+(H-h+8)+'" width="'+w+'" height="'+h+'" fill="none" stroke="'+(i%2?p.acc2:p.acc)+'" stroke-width="2.2" opacity="'+(0.4+i*0.09)+'"/>';
    for (var wy = H-h+26; wy < H - 16; wy += 24)
      for (var wx = x+9; wx < x+w-8; wx += 16)
        if (sr(s+wx*3+wy*7) > 0.45)
          out += '<rect x="'+wx+'" y="'+wy+'" width="6" height="8" fill="'+(i%2?p.acc2:p.acc)+'" opacity=".5"/>';
    x += w + 9;
  }
  return out;
};
ORN.roofs = function(p,s){
  var out = "", x = W*0.46;
  for (var i = 0; i < 4; i++){
    var w = 74 + sr(s+i)*30, peak = 40 + sr(s+i*3)*22, base = H*0.72;
    out += '<path d="M'+x+' '+base+' l '+(w/2)+' -'+peak+' l '+(w/2)+' '+peak+'" fill="none" stroke="'+(i%2?p.acc2:p.acc)+'" stroke-width="2.6" opacity="'+(0.5+i*0.12)+'" stroke-linejoin="round"/>' +
      '<line x1="'+(x+w*0.18)+'" y1="'+(base-peak*0.36)+'" x2="'+(x+w*0.18)+'" y2="'+(base-peak*0.36-22)+'" stroke="'+(i%2?p.acc2:p.acc)+'" stroke-width="2.2" opacity=".5"/>';
    x += w * 0.6;
  }
  return out;
};
ORN.wingrid = function(p,s){
  var out = "", x0 = W*0.66, y0 = H*0.18;
  for (var gx = 0; gx < 4; gx++)
    for (var gy = 0; gy < 4; gy++){
      var lit = sr(s + gx*7 + gy*13) > 0.4;
      out += '<rect x="'+(x0+gx*40)+'" y="'+(y0+gy*40)+'" width="28" height="28" rx="4" fill="'+(lit ? p.acc : 'none')+'" stroke="'+p.acc+'" stroke-width="1.8" opacity="'+(lit?0.35:0.55)+'"/>';
    }
  return out + '<rect x="'+(x0-14)+'" y="'+(y0-14)+'" width="'+(4*40+16)+'" height="'+(4*40+16)+'" rx="8" fill="none" stroke="'+p.acc2+'" stroke-width="2.2" opacity=".6"/>';
};
ORN.keyring = function(p,s){
  var cx = W*0.76, cy = H*0.36;
  return '<circle cx="'+cx+'" cy="'+cy+'" r="34" fill="none" stroke="'+p.acc+'" stroke-width="3" opacity=".85"/>' +
    '<circle cx="'+cx+'" cy="'+cy+'" r="14" fill="none" stroke="'+p.acc+'" stroke-width="2" opacity=".5"/>' +
    '<path d="M'+(cx+24)+' '+(cy+24)+' l 52 52 h 18 v -14 h -14 v -12 h -14 l -14 -14" fill="none" stroke="'+p.acc2+'" stroke-width="2.6" opacity=".85" stroke-linejoin="round"/>';
};
ORN.blueprint = function(p,s){
  var x = W*0.52, y = H*0.18, w = 200, h = 150;
  return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="none" stroke="'+p.acc+'" stroke-width="2.4" opacity=".7"/>' +
    '<line x1="'+(x+w*0.44)+'" y1="'+y+'" x2="'+(x+w*0.44)+'" y2="'+(y+h*0.55)+'" stroke="'+p.acc+'" stroke-width="2" opacity=".6"/>' +
    '<line x1="'+x+'" y1="'+(y+h*0.55)+'" x2="'+(x+w*0.62)+'" y2="'+(y+h*0.55)+'" stroke="'+p.acc+'" stroke-width="2" opacity=".6"/>' +
    '<path d="M'+(x+w*0.44)+' '+(y+h*0.24)+' a 22 22 0 0 1 22 22" fill="none" stroke="'+p.acc2+'" stroke-width="1.8" opacity=".8"/>' +
    '<path d="M'+(x+w*0.2)+' '+(y+h*0.55)+' a 20 20 0 0 1 20 -20" fill="none" stroke="'+p.acc2+'" stroke-width="1.8" opacity=".8"/>' +
    '<line x1="'+x+'" y1="'+(y+h+16)+'" x2="'+(x+w)+'" y2="'+(y+h+16)+'" stroke="'+p.acc2+'" stroke-width="1.6" opacity=".5" stroke-dasharray="4 5"/>';
};

ORN.pyramid = function(p,s){
  var out = "", cx = W*0.72, y = H*0.84;
  var ws = [150, 118, 88, 58, 30];
  for (var i = 0; i < 5; i++){
    out += '<rect x="'+(cx-ws[i]/2)+'" y="'+(y-30)+'" width="'+ws[i]+'" height="30" rx="14" fill="none" stroke="'+(i%2?p.acc2:p.acc)+'" stroke-width="2.4" opacity="'+(0.5+i*0.11)+'"/>';
    y -= 36;
  }
  return out;
};
ORN.balloons = function(p,s){
  var out = "";
  for (var i = 0; i < 4; i++){
    var x = W*0.58 + i*46 + (sr(s+i)-0.5)*20, y = H*0.3 + sr(s+i*7)*H*0.24;
    var r = 22 + sr(s+i*3)*12;
    out += '<ellipse cx="'+x+'" cy="'+y+'" rx="'+r+'" ry="'+(r*1.15)+'" fill="none" stroke="'+(i%2?p.acc2:p.acc)+'" stroke-width="2.2" opacity="'+(0.5+sr(s+i*5)*0.35)+'"/>' +
      '<path d="M'+x+' '+(y+r*1.15)+' q '+((i%2?-1:1)*10)+' 30 0 60" fill="none" stroke="'+(i%2?p.acc2:p.acc)+'" stroke-width="1.6" opacity=".5"/>';
  }
  return out;
};
ORN.cubes = function(p,s){
  var out = "", positions = [[W*0.62,H*0.72],[W*0.74,H*0.72],[W*0.68,H*0.5],[W*0.88,H*0.66]];
  for (var i = 0; i < 4; i++){
    var x = positions[i][0], y = positions[i][1], a = 46;
    out += '<g transform="rotate('+((sr(s+i)-0.5)*14)+' '+x+' '+y+')">' +
      '<rect x="'+(x-a/2)+'" y="'+(y-a/2)+'" width="'+a+'" height="'+a+'" rx="7" fill="none" stroke="'+(i%2?p.acc2:p.acc)+'" stroke-width="2.4" opacity="'+(0.55+i*0.1)+'"/>' +
      '<circle cx="'+x+'" cy="'+y+'" r="7" fill="none" stroke="'+(i%2?p.acc2:p.acc)+'" stroke-width="2" opacity=".6"/></g>';
  }
  return out;
};
ORN.garland = function(p,s){
  var out = '<path d="M'+(W*0.3)+' '+(H*0.14)+' Q '+(W*0.62)+' '+(H*0.4)+' '+(W+16)+' '+(H*0.18)+'" fill="none" stroke="'+p.acc+'" stroke-width="1.8" opacity=".5"/>';
  for (var k = 1; k < 9; k++){
    var t = k/9;
    var x = (1-t)*(1-t)*(W*0.3) + 2*(1-t)*t*(W*0.62) + t*t*(W+16);
    var y = (1-t)*(1-t)*(H*0.14) + 2*(1-t)*t*(H*0.4) + t*t*(H*0.18);
    out += '<path d="M'+(x-11)+' '+y+' h 22 l -11 26 Z" fill="'+(k%2?p.acc:p.acc2)+'" opacity="'+(0.4+sr(s+k)*0.4)+'"/>';
  }
  return out;
};
ORN.paperplane = function(p,s){
  var x = W*0.78, y = H*0.32;
  return '<path d="M'+x+' '+y+' l -64 26 l 26 10 l 6 24 l 12 -18 l 34 12 Z" fill="none" stroke="'+p.acc2+'" stroke-width="2.4" opacity=".9" stroke-linejoin="round"/>' +
    '<path d="M'+(x-64+26)+' '+(y+36)+' l 12 -18" fill="none" stroke="'+p.acc2+'" stroke-width="1.8" opacity=".6"/>' +
    '<path d="M'+(W*0.34)+' '+(H*0.78)+' Q '+(W*0.5)+' '+(H*0.86)+' '+(W*0.6)+' '+(H*0.6)+' T '+(x-40)+' '+(y+30)+'" fill="none" stroke="'+p.acc+'" stroke-width="2" opacity=".55" stroke-dasharray="4 9"/>';
};

ORN.staff = function(p,s){
  var out = "", x0 = W*0.5, w = W*0.48;
  for (var i = 0; i < 5; i++)
    out += '<line x1="'+x0+'" y1="'+(H*0.6+i*16)+'" x2="'+(x0+w)+'" y2="'+(H*0.6+i*16)+'" stroke="'+p.acc+'" stroke-width="1.6" opacity=".45"/>';
  var notes = [[0.1,1],[0.28,3],[0.44,0],[0.6,2],[0.78,4],[0.9,1]];
  notes.forEach(function(n, i){
    var nx = x0 + w*n[0], ny = H*0.6 + n[1]*16;
    out += '<ellipse cx="'+nx+'" cy="'+ny+'" rx="10" ry="7.5" fill="'+(i%2?p.acc2:p.acc)+'" opacity=".85" transform="rotate(-18 '+nx+' '+ny+')"/>' +
      '<line x1="'+(nx+9)+'" y1="'+ny+'" x2="'+(nx+9)+'" y2="'+(ny-42)+'" stroke="'+(i%2?p.acc2:p.acc)+'" stroke-width="2.2" opacity=".85"/>';
  });
  return out;
};
ORN.vinyl = function(p,s){
  var cx = W*0.74, cy = H*0.5, out = "";
  for (var i = 0; i < 5; i++)
    out += '<circle cx="'+cx+'" cy="'+cy+'" r="'+(88-i*15)+'" fill="none" stroke="'+p.acc+'" stroke-width="'+(i===0?2.6:1.4)+'" opacity="'+(0.75-i*0.1)+'"/>';
  out += '<circle cx="'+cx+'" cy="'+cy+'" r="17" fill="none" stroke="'+p.acc2+'" stroke-width="2.6" opacity=".9"/>' +
    '<circle cx="'+cx+'" cy="'+cy+'" r="4" fill="'+p.acc2+'" opacity=".9"/>' +
    '<path d="M'+(cx-88)+' '+cy+' A 88 88 0 0 1 '+(cx-30)+' '+(cy-82)+'" fill="none" stroke="'+p.acc2+'" stroke-width="3" opacity=".5"/>';
  return out;
};
ORN.strings = function(p,s){
  var out = "";
  for (var i = 0; i < 5; i++){
    var x = W*0.56 + i*36;
    out += '<line x1="'+x+'" y1="-10" x2="'+x+'" y2="'+(H+10)+'" stroke="'+(i===2?p.acc2:p.acc)+'" stroke-width="'+(1.4+i*0.35)+'" opacity="'+(0.6-Math.abs(i-2)*0.1)+'"/>' +
      '<circle cx="'+x+'" cy="'+(H*0.2+sr(s+i*7)*H*0.6)+'" r="6" fill="'+(i===2?p.acc2:p.acc)+'" opacity=".8"/>';
  }
  return out;
};
ORN.sinewave = function(p,s){
  var out = "";
  for (var l = 0; l < 3; l++){
    var d = "M"+(W*0.3)+" "+(H*0.5), amp = 34 - l*9;
    for (var x = 0; x <= W*0.72; x += 8)
      d += " L"+(W*0.3+x)+" "+(H*0.5 + Math.sin(x/46 + s + l*0.8)*amp);
    out += '<path d="'+d+'" fill="none" stroke="'+(l===1?p.acc2:p.acc)+'" stroke-width="2" opacity="'+(0.7-l*0.2)+'"/>';
  }
  return out;
};
ORN.pianokeys = function(p,s){
  var out = "", x = W*0.5, y = H*0.62, kw = 30, kh = 96;
  for (var i = 0; i < 7; i++)
    out += '<rect x="'+(x+i*kw)+'" y="'+y+'" width="'+kw+'" height="'+kh+'" fill="none" stroke="'+p.acc+'" stroke-width="2" opacity=".65"/>';
  for (var b = 0; b < 6; b++){
    if (b === 2) continue;
    out += '<rect x="'+(x+(b+1)*kw-9)+'" y="'+y+'" width="18" height="'+(kh*0.6)+'" rx="3" fill="'+p.acc2+'" opacity=".75"/>';
  }
  return out;
};

ORN.joystick = function(p,s){
  var cx = W*0.62, cy = H*0.5;
  var out = '<path d="M'+(cx-14)+' '+(cy-44)+' h 28 v 30 h 30 v 28 h -30 v 30 h -28 v -30 h -30 v -28 h 30 Z" fill="none" stroke="'+p.acc+'" stroke-width="2.6" opacity=".8" stroke-linejoin="round"/>';
  var bx = W*0.87, positions = [[0,-26],[26,0],[0,26],[-26,0]];
  positions.forEach(function(o, i){
    out += '<circle cx="'+(bx+o[0])+'" cy="'+(cy+o[1])+'" r="12" fill="none" stroke="'+(i%2?p.acc2:p.acc)+'" stroke-width="2.4" opacity="'+(0.6+ (i%2)*0.25)+'"/>';
  });
  return out;
};
ORN.shield = function(p,s){
  var cx = W*0.8, cy = H*0.46;
  return '<path d="M'+cx+' '+(cy-58)+' l 52 20 v 42 q 0 40 -52 62 q -52 -22 -52 -62 v -42 Z" fill="none" stroke="'+p.acc+'" stroke-width="2.6" opacity=".85" stroke-linejoin="round"/>' +
    '<path d="M'+(cx-20)+' '+cy+' l 14 16 l 28 -30" fill="none" stroke="'+p.acc2+'" stroke-width="3" opacity=".9" stroke-linecap="round" stroke-linejoin="round"/>';
};
ORN.levelup = function(p,s){
  var out = "", x = W*0.5, y = H*0.8;
  for (var i = 0; i < 4; i++){
    out += '<rect x="'+x+'" y="'+(y-16)+'" width="74" height="16" rx="6" fill="none" stroke="'+(i%2?p.acc2:p.acc)+'" stroke-width="2.4" opacity="'+(0.5+i*0.12)+'"/>';
    x += 60; y -= 52;
  }
  out += '<line x1="'+(x+20)+'" y1="'+(y+4)+'" x2="'+(x+20)+'" y2="'+(y-40)+'" stroke="'+p.acc2+'" stroke-width="2.6" opacity=".9"/>' +
    '<path d="M'+(x+20)+' '+(y-40)+' l 32 10 l -32 12 Z" fill="'+p.acc2+'" opacity=".9"/>';
  return out;
};
ORN.dice = function(p,s){
  var out = "", sets = [[W*0.64,H*0.4,-10],[W*0.84,H*0.66,12]];
  var pips = [[[0,0],[-14,-14],[14,14],[-14,14],[14,-14]],[[-13,-13],[13,-13],[0,0],[-13,13],[13,13]]];
  for (var i = 0; i < 2; i++){
    var x = sets[i][0], y = sets[i][1], a = 62;
    out += '<g transform="rotate('+sets[i][2]+' '+x+' '+y+')">' +
      '<rect x="'+(x-a/2)+'" y="'+(y-a/2)+'" width="'+a+'" height="'+a+'" rx="12" fill="none" stroke="'+(i?p.acc2:p.acc)+'" stroke-width="2.6" opacity=".85"/>';
    pips[i].forEach(function(o){
      out += '<circle cx="'+(x+o[0])+'" cy="'+(y+o[1])+'" r="4.4" fill="'+(i?p.acc2:p.acc)+'" opacity=".85"/>';
    });
    out += "</g>";
  }
  return out;
};
ORN.aim = function(p,s){
  var cx = W*0.72, cy = H*0.48, r = 62;
  var out = '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+p.acc+'" stroke-width="2.4" opacity=".8"/>' +
    '<circle cx="'+cx+'" cy="'+cy+'" r="'+(r*0.55)+'" fill="none" stroke="'+p.acc+'" stroke-width="1.8" opacity=".5"/>' +
    '<circle cx="'+cx+'" cy="'+cy+'" r="5" fill="'+p.acc2+'" opacity=".95"/>';
  [[0,-1],[0,1],[-1,0],[1,0]].forEach(function(v){
    out += '<line x1="'+(cx+v[0]*(r-14))+'" y1="'+(cy+v[1]*(r-14))+'" x2="'+(cx+v[0]*(r+16))+'" y2="'+(cy+v[1]*(r+16))+'" stroke="'+p.acc2+'" stroke-width="2.6" opacity=".85"/>';
  });
  return out;
};

ORN.scales = function(p,s){
  var cx = W*0.78, top = H*0.14, beam = H*0.3;
  var out = '<line x1="'+cx+'" y1="'+top+'" x2="'+cx+'" y2="'+(H*0.78)+'" stroke="'+p.acc+'" stroke-width="2.6" opacity=".8"/>' +
    '<line x1="'+(cx-92)+'" y1="'+beam+'" x2="'+(cx+92)+'" y2="'+(beam-14)+'" stroke="'+p.acc+'" stroke-width="2.6" opacity=".85"/>' +
    '<line x1="'+(cx-110)+'" y1="'+(H*0.78)+'" x2="'+(cx+110)+'" y2="'+(H*0.78)+'" stroke="'+p.acc+'" stroke-width="2.6" opacity=".6"/>';
  [[-92, beam, 1], [92, beam-14, 0]].forEach(function(a, i){
    var px = cx + a[0], py = a[1] + 44;
    out += '<line x1="'+(cx+a[0])+'" y1="'+a[1]+'" x2="'+(px-24)+'" y2="'+py+'" stroke="'+p.acc+'" stroke-width="1.8" opacity=".6"/>' +
      '<line x1="'+(cx+a[0])+'" y1="'+a[1]+'" x2="'+(px+24)+'" y2="'+py+'" stroke="'+p.acc+'" stroke-width="1.8" opacity=".6"/>' +
      '<path d="M'+(px-26)+' '+py+' A 26 26 0 0 0 '+(px+26)+' '+py+'" fill="none" stroke="'+(i?p.acc2:p.acc)+'" stroke-width="2.4" opacity=".85"/>';
  });
  return out;
};
ORN.columns = function(p,s){
  var out = "", x = W*0.52;
  for (var i = 0; i < 4; i++){
    out += '<rect x="'+x+'" y="'+(H*0.3)+'" width="26" height="'+(H*0.54)+'" fill="none" stroke="'+(i%2?p.acc2:p.acc)+'" stroke-width="2.2" opacity="'+(0.5+i*0.1)+'"/>' +
      '<rect x="'+(x-8)+'" y="'+(H*0.24)+'" width="42" height="16" rx="3" fill="none" stroke="'+(i%2?p.acc2:p.acc)+'" stroke-width="2.2" opacity="'+(0.5+i*0.1)+'"/>' +
      '<rect x="'+(x-8)+'" y="'+(H*0.84)+'" width="42" height="14" rx="3" fill="none" stroke="'+(i%2?p.acc2:p.acc)+'" stroke-width="2.2" opacity="'+(0.5+i*0.1)+'"/>';
    x += 66;
  }
  out += '<line x1="'+(W*0.48)+'" y1="'+(H*0.18)+'" x2="'+(W*0.52+4*66)+'" y2="'+(H*0.18)+'" stroke="'+p.acc+'" stroke-width="2.6" opacity=".7"/>';
  return out;
};
ORN.stamp = function(p,s){
  var cx = W*0.79, cy = H*0.5, r = 62, out = "";
  var teeth = 26;
  for (var k = 0; k < teeth; k++){
    var a = Math.PI*2/teeth*k;
    out += '<circle cx="'+(cx+r*Math.cos(a)).toFixed(1)+'" cy="'+(cy+r*Math.sin(a)).toFixed(1)+'" r="3.6" fill="'+p.acc+'" opacity=".6"/>';
  }
  out += '<circle cx="'+cx+'" cy="'+cy+'" r="'+(r-12)+'" fill="none" stroke="'+p.acc+'" stroke-width="2.2" opacity=".8"/>' +
    '<circle cx="'+cx+'" cy="'+cy+'" r="'+(r-30)+'" fill="none" stroke="'+p.acc2+'" stroke-width="2" opacity=".7"/>' +
    '<line x1="'+(cx-r+34)+'" y1="'+cy+'" x2="'+(cx+r-34)+'" y2="'+cy+'" stroke="'+p.acc2+'" stroke-width="2.4" opacity=".8"/>';
  return out;
};
ORN.signature = function(p,s){
  return '<path d="M'+(W*0.4)+' '+(H*0.62)+' C '+(W*0.48)+' '+(H*0.3)+', '+(W*0.54)+' '+(H*0.86)+', '+(W*0.62)+' '+(H*0.56)+' S '+(W*0.74)+' '+(H*0.3)+', '+(W*0.78)+' '+(H*0.6)+' q 6 26 24 10" fill="none" stroke="'+p.acc+'" stroke-width="2.6" opacity=".85" stroke-linecap="round"/>' +
    '<line x1="'+(W*0.38)+'" y1="'+(H*0.76)+'" x2="'+(W*0.9)+'" y2="'+(H*0.76)+'" stroke="'+p.acc2+'" stroke-width="2" opacity=".6"/>' +
    '<circle cx="'+(W*0.86)+'" cy="'+(H*0.52)+'" r="4" fill="'+p.acc2+'" opacity=".9"/>';
};
ORN.paragraphs = function(p,s){
  var out = "", y = H*0.2;
  var ws = [0.42, 0.36, 0.3];
  for (var b = 0; b < 3; b++){
    out += '<circle cx="'+(W*0.52)+'" cy="'+(y+5)+'" r="4" fill="'+p.acc2+'" opacity=".85"/>';
    for (var l = 0; l < 2; l++){
      out += '<rect x="'+(W*0.56)+'" y="'+y+'" width="'+(W*ws[b]*(l?0.7:1))+'" height="9" rx="4.5" fill="'+p.acc+'" opacity="'+(0.4-l*0.13)+'"/>';
      y += 22;
    }
    y += 22;
  }
  return out;
};

ORN.funnel = function(p,s){
  var out = "", cx = W*0.72, y = H*0.16;
  var ws = [190, 138, 92, 52];
  for (var i = 0; i < 4; i++){
    out += '<path d="M'+(cx-ws[i]/2)+' '+y+' h '+ws[i]+' l -'+((ws[i]-(ws[i+1]||36))/2)+' 34 h -'+(ws[i+1]||36)+' Z" fill="none" stroke="'+(i%2?p.acc2:p.acc)+'" stroke-width="2.2" opacity="'+(0.45+i*0.14)+'" stroke-linejoin="round"/>';
    y += 46;
  }
  out += '<circle cx="'+cx+'" cy="'+(y+18)+'" r="7" fill="'+p.acc2+'" opacity=".9"/>';
  return out;
};
ORN.megaphone = function(p,s){
  var x = W*0.62, y = H*0.54;
  var out = '<path d="M'+x+' '+(y-16)+' h 40 l 66 -34 v 100 l -66 -34 h -40 Z" fill="none" stroke="'+p.acc+'" stroke-width="2.6" opacity=".85" stroke-linejoin="round"/>' +
    '<path d="M'+(x+18)+' '+(y+16)+' v 30 h 22 v -28" fill="none" stroke="'+p.acc+'" stroke-width="2.2" opacity=".6"/>';
  for (var i = 0; i < 3; i++){
    var r = 26 + i*20;
    out += '<path d="M'+(x+120)+' '+(y-r)+' A '+r+' '+r+' 0 0 1 '+(x+120)+' '+(y+r)+'" fill="none" stroke="'+p.acc2+'" stroke-width="2.2" opacity="'+(0.75-i*0.2)+'"/>';
  }
  return out;
};
ORN.cursorclick = function(p,s){
  var x = W*0.8, y = H*0.48;
  var out = '<path d="M'+x+' '+y+' v 44 l 12 -12 l 10 22 l 10 -5 l -10 -21 l 17 -2 Z" fill="none" stroke="'+p.acc2+'" stroke-width="2.4" opacity=".9" stroke-linejoin="round"/>';
  for (var i = 0; i < 3; i++){
    var r = 20 + i*16;
    out += '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="none" stroke="'+p.acc+'" stroke-width="1.8" opacity="'+(0.6-i*0.16)+'" stroke-dasharray="5 7"/>';
  }
  return out;
};
ORN.heartflow = function(p,s){
  function heart(cx, cy, sc, col, o){
    return '<path transform="translate('+cx+' '+cy+') scale('+sc+')" d="M0 6 C -7 -4, -18 0, -12 10 C -8 16, 0 20, 0 20 C 0 20, 8 16, 12 10 C 18 0, 7 -4, 0 6 Z" fill="none" stroke="'+col+'" stroke-width="'+(2.4/sc)+'" opacity="'+o+'" stroke-linejoin="round"/>';
  }
  var out = "";
  for (var i = 0; i < 6; i++){
    var x = W*0.6 + sr(s+i)*W*0.32;
    var y = H*0.85 - i*H*0.13;
    out += heart(x, y, 0.8 + sr(s+i*7)*1.3, i%2 ? p.acc2 : p.acc, 0.35 + i*0.09);
  }
  return out;
};
ORN.reach = function(p,s){
  var cx = W*0.7, cy = H*0.82, out = '<circle cx="'+cx+'" cy="'+cy+'" r="9" fill="'+p.acc2+'" opacity=".95"/>';
  for (var i = 0; i < 4; i++){
    var r = 40 + i*34;
    out += '<path d="M'+(cx+r*Math.cos(-2.4))+' '+(cy+r*Math.sin(-2.4))+' A '+r+' '+r+' 0 0 1 '+(cx+r*Math.cos(0.42))+' '+(cy+r*Math.sin(0.42))+'" fill="none" stroke="'+(i===1?p.acc2:p.acc)+'" stroke-width="2.2" opacity="'+(0.8-i*0.16)+'"/>';
  }
  for (var k = 0; k < 5; k++){
    var a = -2.2 + k*0.55, rr = 40 + 3*34 + 18;
    out += '<circle cx="'+(cx+rr*Math.cos(a))+'" cy="'+(cy+rr*Math.sin(a))+'" r="4" fill="'+p.acc+'" opacity="'+(0.4+sr(s+k)*0.4)+'"/>';
  }
  return out;
};

ORN.drops = function(p,s){
  var out = "";
  for (var i = 0; i < 6; i++){
    var x = W*0.58 + sr(s+i)*W*0.34, y = H*0.14 + sr(s+i*7)*H*0.7;
    var r = 9 + sr(s+i*3)*10;
    out += '<path d="M'+x+' '+(y-r*1.5)+' C '+(x+r)+' '+(y-r*0.3)+', '+(x+r)+' '+(y+r*0.5)+', '+x+' '+(y+r*0.7)+' C '+(x-r)+' '+(y+r*0.5)+', '+(x-r)+' '+(y-r*0.3)+', '+x+' '+(y-r*1.5)+' Z" fill="none" stroke="'+(i%2?p.acc2:p.acc)+'" stroke-width="2.2" opacity="'+(0.4+sr(s+i*5)*0.45)+'"/>';
  }
  return out;
};
ORN.cells = function(p,s){
  var out = "";
  for (var i = 0; i < 5; i++){
    var x = W*0.58 + sr(s+i)*W*0.34, y = H*0.14 + sr(s+i*7)*H*0.72;
    var rx = 22 + sr(s+i*3)*16, ry = rx * (0.7 + sr(s+i*11)*0.3);
    var rot = Math.floor(sr(s+i*9)*180);
    out += '<g transform="rotate('+rot+' '+x+' '+y+')" opacity="'+(0.45+sr(s+i*5)*0.4)+'">' +
      '<ellipse cx="'+x+'" cy="'+y+'" rx="'+rx+'" ry="'+ry+'" fill="none" stroke="'+(i%2?p.acc2:p.acc)+'" stroke-width="2.2"/>' +
      '<circle cx="'+(x+rx*0.2)+'" cy="'+(y-ry*0.15)+'" r="'+(rx*0.3)+'" fill="none" stroke="'+(i%2?p.acc2:p.acc)+'" stroke-width="1.8"/></g>';
  }
  return out;
};
ORN.pluses = function(p,s){
  var out = "";
  for (var i = 0; i < 7; i++){
    var x = W*0.56 + sr(s+i)*W*0.38, y = H*0.1 + sr(s+i*7)*H*0.8;
    var a = 7 + sr(s+i*3)*9;
    out += '<path d="M'+(x-a/3)+' '+(y-a)+' h '+(a*2/3)+' v '+(a*2/3)+' h '+(a*2/3)+' v '+(a*2/3)+' h -'+(a*2/3)+' v '+(a*2/3)+' h -'+(a*2/3)+' v -'+(a*2/3)+' h -'+(a*2/3)+' v -'+(a*2/3)+' h '+(a*2/3)+' Z" fill="none" stroke="'+(i%2?p.acc2:p.acc)+'" stroke-width="2" opacity="'+(0.35+sr(s+i*5)*0.5)+'"/>';
  }
  return out;
};
ORN.pulsering = function(p,s){
  var cx = W*0.79, cy = H*0.5, r = 60;
  var d = "M"+(cx-r*0.7)+" "+cy+" l 12 0 l 8 -18 l 10 34 l 10 -26 l 8 10 l 14 0";
  return '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+p.acc+'" stroke-width="2.6" opacity=".8"/>' +
    '<circle cx="'+cx+'" cy="'+cy+'" r="'+(r+14)+'" fill="none" stroke="'+p.acc+'" stroke-width="1.4" opacity=".35"/>' +
    '<path d="'+d+'" fill="none" stroke="'+p.acc2+'" stroke-width="2.4" opacity=".9" stroke-linejoin="round"/>';
};
ORN.atomorbit = function(p,s){
  var cx = W*0.8, cy = H*0.48, out = "";
  for (var i = 0; i < 3; i++){
    out += '<ellipse cx="'+cx+'" cy="'+cy+'" rx="72" ry="26" fill="none" stroke="'+(i===1?p.acc2:p.acc)+'" stroke-width="2" opacity="'+(0.65-i*0.12)+'" transform="rotate('+(i*60)+' '+cx+' '+cy+')"/>';
    var a = sr(s+i*7)*Math.PI*2;
    var ex = 72*Math.cos(a), ey = 26*Math.sin(a), rot = i*60*Math.PI/180;
    out += '<circle cx="'+(cx+ex*Math.cos(rot)-ey*Math.sin(rot))+'" cy="'+(cy+ex*Math.sin(rot)+ey*Math.cos(rot))+'" r="5" fill="'+(i===1?p.acc2:p.acc)+'" opacity=".85"/>';
  }
  out += '<circle cx="'+cx+'" cy="'+cy+'" r="8" fill="none" stroke="'+p.acc2+'" stroke-width="2.4" opacity=".9"/>';
  return out;
};

ORN.suitcase = function(p,s){
  var x = W*0.64, y = H*0.36, w = 130, h = 100;
  return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="14" fill="none" stroke="'+p.acc+'" stroke-width="2.6" opacity=".85"/>' +
    '<path d="M'+(x+w*0.32)+' '+y+' v -16 q 0 -8 8 -8 h '+(w*0.36-16)+' q 8 0 8 8 v 16" fill="none" stroke="'+p.acc+'" stroke-width="2.4" opacity=".8"/>' +
    '<line x1="'+(x+26)+'" y1="'+y+'" x2="'+(x+26)+'" y2="'+(y+h)+'" stroke="'+p.acc2+'" stroke-width="2.2" opacity=".6"/>' +
    '<line x1="'+(x+w-26)+'" y1="'+y+'" x2="'+(x+w-26)+'" y2="'+(y+h)+'" stroke="'+p.acc2+'" stroke-width="2.2" opacity=".6"/>' +
    '<circle cx="'+(x+w+34)+'" cy="'+(y+h-6)+'" r="10" fill="none" stroke="'+p.acc2+'" stroke-width="2" opacity=".5"/>';
};
ORN.palmtree = function(p,s){
  var x = W*0.76, y = H*0.88, out = "";
  out += '<path d="M'+x+' '+y+' C '+(x+6)+' '+(y-50)+', '+(x-4)+' '+(y-90)+', '+(x+8)+' '+(y-128)+'" fill="none" stroke="'+p.acc+'" stroke-width="3" opacity=".8"/>';
  for (var i = 0; i < 5; i++){
    var a = -2.6 + i*0.55;
    out += '<path d="M'+(x+8)+' '+(y-128)+' q '+(56*Math.cos(a))+' '+(40*Math.sin(a)-18)+' '+(96*Math.cos(a))+' '+(52*Math.sin(a))+'" fill="none" stroke="'+(i%2?p.acc2:p.acc)+'" stroke-width="2.2" opacity="'+(0.75-Math.abs(i-2)*0.12)+'"/>';
  }
  out += '<line x1="'+(x-56)+'" y1="'+y+'" x2="'+(x+70)+'" y2="'+y+'" stroke="'+p.acc+'" stroke-width="2" opacity=".4"/>';
  return out;
};
ORN.ticket = function(p,s){
  var x = W*0.56, y = H*0.34, w = 190, h = 84;
  var out = '<g transform="rotate(-8 '+(x+w/2)+' '+(y+h/2)+')">' +
    '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="12" fill="none" stroke="'+p.acc+'" stroke-width="2.4" opacity=".85"/>' +
    '<line x1="'+(x+w*0.66)+'" y1="'+y+'" x2="'+(x+w*0.66)+'" y2="'+(y+h)+'" stroke="'+p.acc+'" stroke-width="2" opacity=".6" stroke-dasharray="5 6"/>';
  for (var i = 0; i < 3; i++)
    out += '<line x1="'+(x+16)+'" y1="'+(y+24+i*18)+'" x2="'+(x+w*0.56)+'" y2="'+(y+24+i*18)+'" stroke="'+p.acc2+'" stroke-width="2" opacity=".5"/>';
  out += '<circle cx="'+(x+w*0.83)+'" cy="'+(y+h/2)+'" r="13" fill="none" stroke="'+p.acc2+'" stroke-width="2.2" opacity=".8"/></g>';
  return out;
};
ORN.globe2 = function(p,s){
  var cx = W*0.79, cy = H*0.5, r = 70, out = "";
  out += '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+p.acc+'" stroke-width="2.4" opacity=".8"/>';
  for (var i = 1; i < 3; i++)
    out += '<ellipse cx="'+cx+'" cy="'+cy+'" rx="'+(r*i/3)+'" ry="'+r+'" fill="none" stroke="'+p.acc+'" stroke-width="1.6" opacity=".45"/>';
  for (var j = 1; j < 3; j++){
    var yy = cy - r + 2*r*j/3;
    var half = Math.sqrt(Math.max(0, r*r - (yy-cy)*(yy-cy)));
    out += '<line x1="'+(cx-half)+'" y1="'+yy+'" x2="'+(cx+half)+'" y2="'+yy+'" stroke="'+p.acc+'" stroke-width="1.6" opacity=".45"/>';
  }
  out += '<circle cx="'+(cx+r*0.4)+'" cy="'+(cy-r*0.3)+'" r="5" fill="'+p.acc2+'" opacity=".9"/>';
  return out;
};
ORN.footsteps = function(p,s){
  var out = "";
  var pts = [[0.5,0.82],[0.58,0.72],[0.62,0.56],[0.7,0.46],[0.74,0.3],[0.82,0.2]];
  for (var i = 0; i < 6; i++){
    var x = W*pts[i][0], y = H*pts[i][1], fl = i%2 ? 1 : -1;
    out += '<g transform="rotate('+(fl*14)+' '+x+' '+y+')" opacity="'+(0.35+i*0.1)+'">' +
      '<ellipse cx="'+x+'" cy="'+y+'" rx="8" ry="13" fill="none" stroke="'+(i%2?p.acc2:p.acc)+'" stroke-width="2"/>' +
      '<ellipse cx="'+x+'" cy="'+(y-19)+'" rx="5" ry="6" fill="none" stroke="'+(i%2?p.acc2:p.acc)+'" stroke-width="1.8"/></g>';
  }
  return out;
};

ORN.wheelrim = function(p,s){
  var cx = W*0.79, cy = H*0.5, r = 68, out = "";
  out += '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+p.acc+'" stroke-width="3" opacity=".8"/>' +
    '<circle cx="'+cx+'" cy="'+cy+'" r="'+(r-14)+'" fill="none" stroke="'+p.acc+'" stroke-width="1.6" opacity=".45"/>' +
    '<circle cx="'+cx+'" cy="'+cy+'" r="12" fill="none" stroke="'+p.acc2+'" stroke-width="2.4" opacity=".9"/>';
  for (var k = 0; k < 5; k++){
    var a = Math.PI*2/5*k + sr(s)*0.8;
    out += '<line x1="'+(cx+12*Math.cos(a))+'" y1="'+(cy+12*Math.sin(a))+'" x2="'+(cx+(r-14)*Math.cos(a))+'" y2="'+(cy+(r-14)*Math.sin(a))+'" stroke="'+p.acc2+'" stroke-width="2.6" opacity=".7"/>';
  }
  return out;
};
ORN.trafficlight = function(p,s){
  var x = W*0.72, y = H*0.2, w = 56, h = 150;
  return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="16" fill="none" stroke="'+p.acc+'" stroke-width="2.4" opacity=".8"/>' +
    '<circle cx="'+(x+w/2)+'" cy="'+(y+30)+'" r="15" fill="none" stroke="'+p.acc+'" stroke-width="2.2" opacity=".55"/>' +
    '<circle cx="'+(x+w/2)+'" cy="'+(y+h/2)+'" r="15" fill="none" stroke="'+p.acc+'" stroke-width="2.2" opacity=".55"/>' +
    '<circle cx="'+(x+w/2)+'" cy="'+(y+h-30)+'" r="15" fill="'+p.acc2+'" opacity=".85"/>' +
    '<line x1="'+(x+w/2)+'" y1="'+(y+h)+'" x2="'+(x+w/2)+'" y2="'+(y+h+34)+'" stroke="'+p.acc+'" stroke-width="2.4" opacity=".6"/>';
};
ORN.cone = function(p,s){
  var out = "";
  var sets = [[W*0.64,H*0.7,1],[W*0.82,H*0.78,0.82],[W*0.9,H*0.52,0.6]];
  for (var i = 0; i < 3; i++){
    var x = sets[i][0], y = sets[i][1], k = sets[i][2];
    out += '<g opacity="'+(0.85-i*0.2)+'">' +
      '<path d="M'+(x-16*k)+' '+y+' L'+(x-4*k)+' '+(y-58*k)+' h '+(8*k)+' L'+(x+16*k)+' '+y+'" fill="none" stroke="'+(i?p.acc:p.acc2)+'" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<line x1="'+(x-13*k)+'" y1="'+(y-19*k)+'" x2="'+(x+13*k)+'" y2="'+(y-19*k)+'" stroke="'+(i?p.acc:p.acc2)+'" stroke-width="'+(5*k)+'" opacity=".7"/>' +
      '<line x1="'+(x-26*k)+'" y1="'+y+'" x2="'+(x+26*k)+'" y2="'+y+'" stroke="'+(i?p.acc:p.acc2)+'" stroke-width="2.4"/></g>';
  }
  return out;
};
ORN.battery = function(p,s){
  var x = W*0.64, y = H*0.42, w = 160, h = 72;
  var out = '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="12" fill="none" stroke="'+p.acc+'" stroke-width="2.6" opacity=".85"/>' +
    '<rect x="'+(x+w)+'" y="'+(y+h*0.3)+'" width="14" height="'+(h*0.4)+'" rx="4" fill="none" stroke="'+p.acc+'" stroke-width="2.4" opacity=".7"/>';
  for (var i = 0; i < 3; i++)
    out += '<rect x="'+(x+12+i*50)+'" y="'+(y+12)+'" width="38" height="'+(h-24)+'" rx="7" fill="'+p.acc2+'" opacity="'+(0.75-i*0.22)+'"/>';
  return out;
};
ORN.headlights = function(p,s){
  var out = "";
  for (var i = 0; i < 2; i++){
    var cy = H*(0.36 + i*0.3), cx = W*0.68;
    out += '<ellipse cx="'+cx+'" cy="'+cy+'" rx="20" ry="26" fill="none" stroke="'+p.acc+'" stroke-width="2.6" opacity=".85"/>';
    for (var b = 0; b < 3; b++){
      var yy = cy - 14 + b*14;
      out += '<path d="M'+(cx+24)+' '+yy+' L'+(W+20)+' '+(yy + (b-1)*26 - (i?-10:10))+'" stroke="'+p.acc2+'" stroke-width="'+(7-b)+'" opacity="'+(0.2+b*0.05)+'" stroke-linecap="round"/>';
    }
  }
  return out;
};

ORN.pizza = function(p,s){
  var cx = W*0.79, cy = H*0.52, r = 72, out = "";
  out += '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+p.acc+'" stroke-width="2.6" opacity=".85"/>' +
    '<circle cx="'+cx+'" cy="'+cy+'" r="'+(r-11)+'" fill="none" stroke="'+p.acc+'" stroke-width="1.6" opacity=".5"/>';
  for (var k = 0; k < 4; k++){
    var a = Math.PI/4 + Math.PI/2*k;
    out += '<line x1="'+cx+'" y1="'+cy+'" x2="'+(cx+(r-11)*Math.cos(a))+'" y2="'+(cy+(r-11)*Math.sin(a))+'" stroke="'+p.acc+'" stroke-width="1.8" opacity=".5"/>';
  }
  for (var i = 0; i < 8; i++){
    var aa = sr(s+i)*Math.PI*2, rr = (r-30)*Math.sqrt(sr(s+i*7));
    out += '<circle cx="'+(cx+rr*Math.cos(aa))+'" cy="'+(cy+rr*Math.sin(aa))+'" r="6" fill="'+p.acc2+'" opacity=".7"/>';
  }
  return out;
};
ORN.whisk = function(p,s){
  var x = W*0.72, y = H*0.3, out = "";
  out += '<line x1="'+x+'" y1="'+(y-26)+'" x2="'+x+'" y2="'+(y+22)+'" stroke="'+p.acc+'" stroke-width="3" opacity=".8"/>';
  for (var i = 0; i < 3; i++){
    var wdt = 20 + i*13;
    out += '<path d="M'+x+' '+(y+18)+' C '+(x-wdt)+' '+(y+58)+', '+(x-wdt)+' '+(y+96)+', '+x+' '+(y+112)+' C '+(x+wdt)+' '+(y+96)+', '+(x+wdt)+' '+(y+58)+', '+x+' '+(y+18)+'" fill="none" stroke="'+(i===1?p.acc2:p.acc)+'" stroke-width="2" opacity="'+(0.75-i*0.15)+'"/>';
  }
  return out;
};
ORN.pot = function(p,s){
  var x = W*0.66, y = H*0.48, w = 140, h = 84;
  var out = '<path d="M'+x+' '+y+' h '+w+' v '+(h-18)+' q 0 18 -18 18 h -'+(w-36)+' q -18 0 -18 -18 Z" fill="none" stroke="'+p.acc+'" stroke-width="2.6" opacity=".85"/>' +
    '<line x1="'+(x-24)+'" y1="'+(y+22)+'" x2="'+x+'" y2="'+(y+22)+'" stroke="'+p.acc+'" stroke-width="2.6" opacity=".7"/>' +
    '<line x1="'+(x+w)+'" y1="'+(y+22)+'" x2="'+(x+w+24)+'" y2="'+(y+22)+'" stroke="'+p.acc+'" stroke-width="2.6" opacity=".7"/>' +
    '<line x1="'+(x-6)+'" y1="'+y+'" x2="'+(x+w+6)+'" y2="'+y+'" stroke="'+p.acc+'" stroke-width="3" opacity=".9"/>';
  for (var i = 0; i < 3; i++){
    var sx = x + 30 + i*45;
    out += '<path d="M'+sx+' '+(y-12)+' q 10 -16 0 -30 q -10 -14 0 -28" fill="none" stroke="'+p.acc2+'" stroke-width="2.2" opacity="'+(0.7-i*0.15)+'" stroke-linecap="round"/>';
  }
  return out;
};
ORN.spices = function(p,s){
  var out = "";
  for (var i = 0; i < 26; i++){
    var x = W*0.54 + sr(s+i)*W*0.42, y = H*0.1 + sr(s+i*3)*H*0.8;
    var kind = i % 3;
    if (kind === 0) out += '<circle cx="'+x+'" cy="'+y+'" r="'+(2+sr(s+i*7)*3)+'" fill="'+p.acc+'" opacity="'+(0.3+sr(s+i*5)*0.5)+'"/>';
    else if (kind === 1) out += '<ellipse cx="'+x+'" cy="'+y+'" rx="5" ry="2.6" fill="'+p.acc2+'" opacity="'+(0.3+sr(s+i*5)*0.4)+'" transform="rotate('+(sr(s+i*9)*180)+' '+x+' '+y+')"/>';
    else out += '<path d="M'+x+' '+y+' l 6 -8" stroke="'+p.acc+'" stroke-width="2.4" opacity="'+(0.3+sr(s+i*5)*0.4)+'" stroke-linecap="round"/>';
  }
  return out;
};
ORN.teacup = function(p,s){
  var cx = W*0.72, cy = H*0.5;
  return '<path d="M'+(cx-58)+' '+cy+' h 116 v 34 q 0 34 -34 34 h -48 q -34 0 -34 -34 Z" fill="none" stroke="'+p.acc+'" stroke-width="2.6" opacity=".85"/>' +
    '<path d="M'+(cx+58)+' '+(cy+8)+' q 34 0 34 26 q 0 26 -34 22" fill="none" stroke="'+p.acc+'" stroke-width="2.4" opacity=".7"/>' +
    '<path d="M'+(cx-80)+' '+(cy+82)+' h 160" stroke="'+p.acc+'" stroke-width="2.2" opacity=".5"/>' +
    '<path d="M'+(cx-20)+' '+(cy-14)+' q 8 -14 0 -26 q -8 -12 0 -24" fill="none" stroke="'+p.acc2+'" stroke-width="2.2" opacity=".7" stroke-linecap="round"/>' +
    '<path d="M'+(cx+16)+' '+(cy-14)+' q 8 -14 0 -26" fill="none" stroke="'+p.acc2+'" stroke-width="2.2" opacity=".5" stroke-linecap="round"/>';
};

ORN.wallet2 = function(p,s){
  var x = W*0.6, y = H*0.36, w = 160, h = 104;
  return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="14" fill="none" stroke="'+p.acc+'" stroke-width="2.6" opacity=".85"/>' +
    '<path d="M'+(x+w)+' '+(y+h*0.3)+' h -44 q -14 0 -14 14 v 4 q 0 14 14 14 h 44" fill="none" stroke="'+p.acc2+'" stroke-width="2.4" opacity=".85"/>' +
    '<circle cx="'+(x+w-40)+'" cy="'+(y+h*0.3+16)+'" r="4.4" fill="'+p.acc2+'" opacity=".9"/>' +
    '<line x1="'+(x+14)+'" y1="'+(y+22)+'" x2="'+(x+58)+'" y2="'+(y+22)+'" stroke="'+p.acc+'" stroke-width="2" opacity=".5"/>';
};
ORN.safe = function(p,s){
  var x = W*0.64, y = H*0.28, a = 128;
  var cx = x + a/2, cy = y + a/2;
  var out = '<rect x="'+x+'" y="'+y+'" width="'+a+'" height="'+a+'" rx="16" fill="none" stroke="'+p.acc+'" stroke-width="2.6" opacity=".85"/>' +
    '<circle cx="'+cx+'" cy="'+cy+'" r="34" fill="none" stroke="'+p.acc2+'" stroke-width="2.6" opacity=".9"/>' +
    '<circle cx="'+cx+'" cy="'+cy+'" r="10" fill="none" stroke="'+p.acc2+'" stroke-width="2.2" opacity=".8"/>';
  for (var k = 0; k < 8; k++){
    var an = Math.PI/4*k;
    out += '<line x1="'+(cx+16*Math.cos(an))+'" y1="'+(cy+16*Math.sin(an))+'" x2="'+(cx+28*Math.cos(an))+'" y2="'+(cy+28*Math.sin(an))+'" stroke="'+p.acc2+'" stroke-width="2.2" opacity=".7"/>';
  }
  out += '<line x1="'+(x+a+12)+'" y1="'+(y+20)+'" x2="'+(x+a+12)+'" y2="'+(y+a-20)+'" stroke="'+p.acc+'" stroke-width="3" opacity=".5"/>';
  return out;
};
ORN.percentup = function(p,s){
  var out = "";
  var sets = [[W*0.6,H*0.66,26],[W*0.76,H*0.4,34],[W*0.9,H*0.62,22]];
  for (var i = 0; i < 3; i++){
    var x = sets[i][0], y = sets[i][1], r = sets[i][2];
    out += '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="none" stroke="'+(i===1?p.acc2:p.acc)+'" stroke-width="2.4" opacity="'+(0.85-i*0.18)+'"/>' +
      '<circle cx="'+(x-r*0.35)+'" cy="'+(y-r*0.35)+'" r="'+(r*0.18)+'" fill="none" stroke="'+(i===1?p.acc2:p.acc)+'" stroke-width="1.8" opacity=".8"/>' +
      '<circle cx="'+(x+r*0.35)+'" cy="'+(y+r*0.35)+'" r="'+(r*0.18)+'" fill="none" stroke="'+(i===1?p.acc2:p.acc)+'" stroke-width="1.8" opacity=".8"/>' +
      '<line x1="'+(x+r*0.38)+'" y1="'+(y-r*0.38)+'" x2="'+(x-r*0.38)+'" y2="'+(y+r*0.38)+'" stroke="'+(i===1?p.acc2:p.acc)+'" stroke-width="2" opacity=".8"/>';
  }
  return out;
};
ORN.growthbars = function(p,s){
  var out = "", x = W*0.56, base = H*0.8;
  var hs = [42, 68, 56, 96, 122];
  for (var i = 0; i < 5; i++){
    out += '<rect x="'+x+'" y="'+(base-hs[i])+'" width="30" height="'+hs[i]+'" rx="7" fill="none" stroke="'+(i===4?p.acc2:p.acc)+'" stroke-width="2.4" opacity="'+(0.5+i*0.11)+'"/>';
    x += 44;
  }
  out += '<path d="M'+(W*0.56)+' '+(base-60)+' L'+(W*0.56+3*44)+' '+(base-110)+' L'+(x-14)+' '+(base-134)+'" fill="none" stroke="'+p.acc2+'" stroke-width="2.2" opacity=".7" stroke-dasharray="5 6"/>';
  return out;
};
ORN.exchange = function(p,s){
  var cx = W*0.72, cy = H*0.48, r = 62;
  return '<path d="M'+(cx-r)+' '+cy+' A '+r+' '+r+' 0 0 1 '+(cx+r*0.7)+' '+(cy-r*0.7)+'" fill="none" stroke="'+p.acc+'" stroke-width="2.6" opacity=".85"/>' +
    '<path d="M'+(cx+r*0.7)+' '+(cy-r*0.7)+' l -22 -4 m 22 4 l -6 22" fill="none" stroke="'+p.acc+'" stroke-width="2.6" opacity=".85"/>' +
    '<path d="M'+(cx+r)+' '+cy+' A '+r+' '+r+' 0 0 1 '+(cx-r*0.7)+' '+(cy+r*0.7)+'" fill="none" stroke="'+p.acc2+'" stroke-width="2.6" opacity=".85"/>' +
    '<path d="M'+(cx-r*0.7)+' '+(cy+r*0.7)+' l 22 4 m -22 -4 l 6 -22" fill="none" stroke="'+p.acc2+'" stroke-width="2.6" opacity=".85"/>' +
    '<circle cx="'+cx+'" cy="'+cy+'" r="14" fill="none" stroke="'+p.acc+'" stroke-width="2" opacity=".5"/>';
};

ORN.ball = function(p,s){
  var cx = W*0.79, cy = H*0.5, r = 64;
  return '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+p.acc+'" stroke-width="2.6" opacity=".85"/>' +
    '<path d="M'+(cx-r)+' '+cy+' Q '+cx+' '+(cy-38)+' '+(cx+r)+' '+cy+'" fill="none" stroke="'+p.acc2+'" stroke-width="2.2" opacity=".7"/>' +
    '<path d="M'+(cx-r)+' '+cy+' Q '+cx+' '+(cy+38)+' '+(cx+r)+' '+cy+'" fill="none" stroke="'+p.acc2+'" stroke-width="2.2" opacity=".7"/>' +
    '<path d="M'+(cx-r*0.5)+' '+(cy-r*0.86)+' Q '+(cx+20)+' '+cy+' '+(cx-r*0.5)+' '+(cy+r*0.86)+'" fill="none" stroke="'+p.acc2+'" stroke-width="2" opacity=".55"/>';
};
ORN.medal = function(p,s){
  var cx = W*0.74, cy = H*0.56, r = 46;
  return '<path d="M'+(cx-20)+' '+(cy-r-6)+' l -22 -64 h 30 l 14 40" fill="none" stroke="'+p.acc+'" stroke-width="2.4" opacity=".7" stroke-linejoin="round"/>' +
    '<path d="M'+(cx+20)+' '+(cy-r-6)+' l 22 -64 h -30 l -14 40" fill="none" stroke="'+p.acc+'" stroke-width="2.4" opacity=".7" stroke-linejoin="round"/>' +
    '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+p.acc2+'" stroke-width="2.8" opacity=".9"/>' +
    '<circle cx="'+cx+'" cy="'+cy+'" r="'+(r-13)+'" fill="none" stroke="'+p.acc2+'" stroke-width="1.8" opacity=".6"/>' +
    '<path d="M'+cx+' '+(cy-16)+' l 5 11 l 12 1 l -9 8 l 3 12 l -11 -6 l -11 6 l 3 -12 l -9 -8 l 12 -1 Z" fill="'+p.acc2+'" opacity=".8"/>';
};
ORN.jumprope = function(p,s){
  var out = "";
  for (var i = 0; i < 8; i++){
    var x = W*0.52 + i*30;
    out += '<circle cx="'+x+'" cy="'+(H*0.5 + Math.sin(i*1.1+s)*40)+'" r="16" fill="none" stroke="'+(i%2?p.acc2:p.acc)+'" stroke-width="2.2" opacity="'+(0.4+ (i%3)*0.18)+'"/>';
  }
  return out;
};
ORN.stopwatch = function(p,s){
  var cx = W*0.74, cy = H*0.52, r = 62;
  return '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+p.acc+'" stroke-width="2.6" opacity=".85"/>' +
    '<line x1="'+cx+'" y1="'+(cy-r-18)+'" x2="'+cx+'" y2="'+(cy-r-4)+'" stroke="'+p.acc+'" stroke-width="4" opacity=".8"/>' +
    '<line x1="'+(cx-16)+'" y1="'+(cy-r-14)+'" x2="'+(cx+16)+'" y2="'+(cy-r-14)+'" stroke="'+p.acc+'" stroke-width="3" opacity=".7"/>' +
    '<line x1="'+cx+'" y1="'+cy+'" x2="'+(cx+r*0.55)+'" y2="'+(cy-r*0.35)+'" stroke="'+p.acc2+'" stroke-width="2.8" opacity=".9" stroke-linecap="round"/>' +
    '<circle cx="'+cx+'" cy="'+cy+'" r="5" fill="'+p.acc2+'"/>' +
    '<path d="M'+(cx-r*0.55)+' '+(cy+r*0.72)+' A '+r+' '+r+' 0 0 1 '+(cx-r*0.72)+' '+(cy+r*0.5)+'" fill="none" stroke="'+p.acc2+'" stroke-width="3" opacity=".6"/>';
};
ORN.bikewheels = function(p,s){
  var out = "", cy = H*0.62;
  [[W*0.6, 54], [W*0.88, 54]].forEach(function(c, i){
    out += '<circle cx="'+c[0]+'" cy="'+cy+'" r="'+c[1]+'" fill="none" stroke="'+p.acc+'" stroke-width="2.6" opacity=".8"/>';
    for (var k = 0; k < 6; k++){
      var a = Math.PI/3*k + i;
      out += '<line x1="'+c[0]+'" y1="'+cy+'" x2="'+(c[0]+c[1]*Math.cos(a))+'" y2="'+(cy+c[1]*Math.sin(a))+'" stroke="'+p.acc+'" stroke-width="1.4" opacity=".4"/>';
    }
  });
  out += '<path d="M'+(W*0.6)+' '+cy+' L'+(W*0.7)+' '+(cy-58)+' L'+(W*0.88)+' '+cy+' M'+(W*0.7)+' '+(cy-58)+' L'+(W*0.66)+' '+(cy-70)+' M'+(W*0.6)+' '+cy+' L'+(W*0.66)+' '+(cy-62)+'" fill="none" stroke="'+p.acc2+'" stroke-width="2.4" opacity=".8" stroke-linejoin="round"/>';
  return out;
};

ORN.mirror = function(p,s){
  var cx = W*0.77, cy = H*0.42;
  return '<ellipse cx="'+cx+'" cy="'+cy+'" rx="56" ry="74" fill="none" stroke="'+p.acc+'" stroke-width="2.6" opacity=".85"/>' +
    '<ellipse cx="'+cx+'" cy="'+cy+'" rx="44" ry="60" fill="none" stroke="'+p.acc+'" stroke-width="1.4" opacity=".4"/>' +
    '<path d="M'+(cx-24)+' '+(cy-30)+' q 14 -22 34 -22" fill="none" stroke="'+p.acc2+'" stroke-width="2.4" opacity=".8" stroke-linecap="round"/>' +
    '<line x1="'+cx+'" y1="'+(cy+74)+'" x2="'+cx+'" y2="'+(cy+108)+'" stroke="'+p.acc+'" stroke-width="2.6" opacity=".7"/>' +
    '<line x1="'+(cx-30)+'" y1="'+(cy+112)+'" x2="'+(cx+30)+'" y2="'+(cy+112)+'" stroke="'+p.acc+'" stroke-width="2.6" opacity=".7"/>';
};
ORN.lipstick2 = function(p,s){
  var x = W*0.7, y = H*0.4;
  return '<g transform="rotate(14 '+x+' '+y+')">' +
    '<path d="M'+x+' '+y+' q 0 -30 14 -34 q 14 4 14 34 Z" fill="'+p.acc2+'" opacity=".85"/>' +
    '<rect x="'+(x-2)+'" y="'+y+'" width="32" height="26" rx="4" fill="none" stroke="'+p.acc+'" stroke-width="2.4" opacity=".85"/>' +
    '<rect x="'+(x-8)+'" y="'+(y+26)+'" width="44" height="58" rx="8" fill="none" stroke="'+p.acc+'" stroke-width="2.6" opacity=".85"/>' +
    '<line x1="'+(x-8)+'" y1="'+(y+44)+'" x2="'+(x+36)+'" y2="'+(y+44)+'" stroke="'+p.acc2+'" stroke-width="2" opacity=".6"/></g>';
};
ORN.perfume = function(p,s){
  var x = W*0.73, y = H*0.42, out = "";
  out += '<rect x="'+x+'" y="'+y+'" width="92" height="104" rx="18" fill="none" stroke="'+p.acc+'" stroke-width="2.6" opacity=".85"/>' +
    '<rect x="'+(x+32)+'" y="'+(y-22)+'" width="28" height="22" rx="5" fill="none" stroke="'+p.acc+'" stroke-width="2.4" opacity=".8"/>' +
    '<circle cx="'+(x-16)+'" cy="'+(y-16)+'" r="11" fill="none" stroke="'+p.acc2+'" stroke-width="2.2" opacity=".8"/>';
  for (var i = 0; i < 5; i++)
    out += '<circle cx="'+(x-34-i*13)+'" cy="'+(y-22-sr(s+i)*20)+'" r="'+(2.5+sr(s+i*3)*2)+'" fill="'+p.acc2+'" opacity="'+(0.7-i*0.12)+'"/>';
  return out;
};
ORN.combrow = function(p,s){
  var x = W*0.64, y = H*0.34, w = 156;
  var out = '<path d="M'+x+' '+y+' h '+w+' q 14 0 14 14 v 6 h -'+(w+14)+' Z" fill="none" stroke="'+p.acc+'" stroke-width="2.4" opacity=".85"/>';
  for (var i = 0; i < 12; i++)
    out += '<line x1="'+(x+10+i*13)+'" y1="'+(y+20)+'" x2="'+(x+10+i*15)+'" y2="'+(y+20+46+(i%2)*10)+'" stroke="'+(i%3===1?p.acc2:p.acc)+'" stroke-width="2.2" opacity="'+(0.5+(i%2)*0.2)+'"/>';
  return out;
};
ORN.gemring = function(p,s){
  var cx = W*0.74, cy = H*0.56, r = 52;
  return '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+p.acc+'" stroke-width="3" opacity=".85"/>' +
    '<circle cx="'+cx+'" cy="'+cy+'" r="'+(r-8)+'" fill="none" stroke="'+p.acc+'" stroke-width="1.6" opacity=".45"/>' +
    '<path d="M'+cx+' '+(cy-r-38)+' l 22 16 l -22 30 l -22 -30 Z" fill="none" stroke="'+p.acc2+'" stroke-width="2.4" opacity=".9" stroke-linejoin="round"/>' +
    '<path d="M'+(cx-22)+' '+(cy-r-22)+' h 44 M'+(cx-11)+' '+(cy-r-30)+' l 11 38 M'+(cx+11)+' '+(cy-r-30)+' l -11 38" fill="none" stroke="'+p.acc2+'" stroke-width="1.4" opacity=".6"/>';
};

ORN.cloudup = function(p,s){
  var cx = W*0.76, cy = H*0.44;
  return '<path d="M'+(cx-70)+' '+(cy+22)+' a 26 26 0 0 1 6 -50 a 34 34 0 0 1 64 -14 a 28 28 0 0 1 42 22 a 22 22 0 0 1 -6 42 Z" fill="none" stroke="'+p.acc+'" stroke-width="2.6" opacity=".85" stroke-linejoin="round"/>' +
    '<line x1="'+cx+'" y1="'+(cy+80)+'" x2="'+cx+'" y2="'+(cy+30)+'" stroke="'+p.acc2+'" stroke-width="2.8" opacity=".9"/>' +
    '<path d="M'+(cx-14)+' '+(cy+46)+' l 14 -16 l 14 16" fill="none" stroke="'+p.acc2+'" stroke-width="2.8" opacity=".9" stroke-linejoin="round"/>';
};
ORN.lockpad = function(p,s){
  var x = W*0.66, y = H*0.44, w = 108, h = 84;
  var out = '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="14" fill="none" stroke="'+p.acc+'" stroke-width="2.6" opacity=".85"/>' +
    '<path d="M'+(x+22)+' '+y+' v -20 a 32 32 0 0 1 64 0 v 20" fill="none" stroke="'+p.acc+'" stroke-width="2.6" opacity=".8"/>' +
    '<circle cx="'+(x+w/2)+'" cy="'+(y+34)+'" r="10" fill="none" stroke="'+p.acc2+'" stroke-width="2.4" opacity=".9"/>' +
    '<line x1="'+(x+w/2)+'" y1="'+(y+42)+'" x2="'+(x+w/2)+'" y2="'+(y+58)+'" stroke="'+p.acc2+'" stroke-width="2.4" opacity=".9"/>';
  return out;
};
ORN.curly = function(p,s){
  return '<path d="M'+(W*0.62)+' '+(H*0.2)+' q -22 0 -22 24 v 26 q 0 22 -20 26 q 20 4 20 26 v 26 q 0 24 22 24" fill="none" stroke="'+p.acc+'" stroke-width="3" opacity=".85" stroke-linecap="round"/>' +
    '<path d="M'+(W*0.86)+' '+(H*0.2)+' q 22 0 22 24 v 26 q 0 22 20 26 q -20 4 -20 26 v 26 q 0 24 -22 24" fill="none" stroke="'+p.acc+'" stroke-width="3" opacity=".85" stroke-linecap="round"/>' +
    '<circle cx="'+(W*0.74)+'" cy="'+(H*0.5)+'" r="6" fill="'+p.acc2+'" opacity=".9"/>';
};
ORN.wifi = function(p,s){
  var cx = W*0.74, cy = H*0.66, out = "";
  for (var i = 0; i < 3; i++){
    var r = 34 + i*30;
    out += '<path d="M'+(cx-r*0.72)+' '+(cy-r*0.7)+' A '+r+' '+r+' 0 0 1 '+(cx+r*0.72)+' '+(cy-r*0.7)+'" fill="none" stroke="'+(i===1?p.acc2:p.acc)+'" stroke-width="2.8" opacity="'+(0.85-i*0.2)+'" stroke-linecap="round"/>';
  }
  out += '<circle cx="'+cx+'" cy="'+cy+'" r="7" fill="'+p.acc2+'" opacity=".95"/>';
  return out;
};
ORN.chip2 = function(p,s){
  var x = W*0.64, y = H*0.32, a = 110;
  var out = '<rect x="'+x+'" y="'+y+'" width="'+a+'" height="'+a+'" rx="14" fill="none" stroke="'+p.acc+'" stroke-width="2.6" opacity=".85"/>' +
    '<rect x="'+(x+30)+'" y="'+(y+30)+'" width="'+(a-60)+'" height="'+(a-60)+'" rx="7" fill="none" stroke="'+p.acc2+'" stroke-width="2.2" opacity=".85"/>';
  for (var i = 0; i < 4; i++){
    var o = y + 18 + i*26;
    out += '<line x1="'+(x-18)+'" y1="'+o+'" x2="'+x+'" y2="'+o+'" stroke="'+p.acc+'" stroke-width="2.4" opacity=".6"/>' +
      '<line x1="'+(x+a)+'" y1="'+o+'" x2="'+(x+a+18)+'" y2="'+o+'" stroke="'+p.acc+'" stroke-width="2.4" opacity=".6"/>';
  }
  return out;
};

  return ORN;
})();
const ORN2_BACK = {
  drops: 1, cells: 1, pluses: 1, footsteps: 1, spices: 1, jumprope: 1,
  calmwaves: 1, skyline: 1, roofs: 1, strings: 1, sinewave: 1, balloons: 1,
  garland: 1, heartflow: 1, thoughts: 1, branches: 1, paragraphs: 1,
  heartbeat: 1, mountains: 1, horizon: 1, tread: 1, road: 1, silk: 1,
  track: 1, zigzag: 1, wavebars: 1, pixels: 1, confetti: 1, terminal: 1, candles: 1,
  stepsup: 1, doodle: 1, barbell: 1, filmstrip: 1, netgraph: 1, molecules: 1,
  capsule: 1, nuts: 1, beans: 1, fizz: 1, sparkle: 1, beads: 1 };
const ORN2_SETS = {
  med: ["dna", "molecules", "hexchain", "heartbeat", "capsule", "drops", "cells", "pluses", "pulsering", "atomorbit"],
  edu: ["books", "page", "bulb", "pencilline", "progress"],
  psy: ["maze", "balance", "thoughts", "branches", "calmwaves"],
  estate: ["skyline", "roofs", "wingrid", "keyring", "blueprint"],
  kids: ["pyramid", "balloons", "cubes", "garland", "paperplane"],
  music: ["staff", "vinyl", "strings", "sinewave", "pianokeys"],
  games: ["joystick", "shield", "levelup", "dice", "aim"],
  law: ["scales", "columns", "stamp", "signature", "paragraphs"],
  mkt: ["funnel", "megaphone", "cursorclick", "heartflow", "reach"],

  travel: ["route", "contrails", "mountains", "compass", "horizon", "suitcase", "palmtree", "ticket", "globe2", "footsteps"],
  auto: ["gears", "speedo", "tread", "nuts", "road", "wheelrim", "trafficlight", "cone", "battery", "headlights"],
  food: ["plates", "steam", "beans", "fizz", "citrus", "pizza", "whisk", "pot", "spices", "teacup"],
  fin: ["candles", "trendup", "coins", "blocks", "pie", "wallet2", "safe", "percentup", "growthbars", "exchange"],
  sport: ["barbell", "track", "stepsup", "rings3", "target", "ball", "medal", "jumprope", "stopwatch", "bikewheels"],
  beauty: ["petals", "silk", "sparkle", "veil", "beads", "mirror", "lipstick2", "perfume", "combrow", "gemring"],
  tech: ["circuit", "pixels", "chevrons", "terminal", "netgraph", "cloudup", "lockpad", "curly", "wifi", "chip2"],
  vlog: ["playset", "frames", "wavebars", "filmstrip", "spotlight"],
  fun: ["confetti", "zigzag", "doodle", "speech", "burst"]
};

function coverSvg(cfg){
  const W = 1200, H = 675;
  const seed0 = cfg.seed || 1;
  const palId = (cfg.pal === "auto")
    ? PALETTES[Math.floor(srand(seed0 * 23) * PALETTES.length) % PALETTES.length].id
    : cfg.pal;
  const p = palOf(palId);
  const uid = ++UID;
  const seed = cfg.seed;
  const pool = (cfg.shape === "auto" && cfg.pool && cfg.pool.length) ? cfg.pool : null;
  const shape = cfg.shape === "auto"
    ? (pool ? pool[Math.floor(srand(seed * 61) * pool.length) % pool.length]
            : SHAPES[Math.floor(srand(seed * 61) * SHAPES.length) % SHAPES.length])
    : cfg.shape;
  const vnum = Math.min(12, Math.max(1, cfg.variant || 1));
  const geoSeed = (cfg.shape && cfg.shape !== "auto") ? 7 + (vnum - 1) * 13 : seed;
  const pad = 84;
  const left = pad;
  const sign = cfg.sign || cfg.sig || "full";
  const sigTop = true;
  let lay = cfg.lay;
  if (lay === "auto"){
    const order = ["thesis", "num", "vs", "list", "ask"];
    lay = order[Math.floor(srand(seed * 79) * order.length) % order.length];
  }
  const item = cfg.item;

  const centred = (lay === "ask");
  const wide = (lay === "vs" || lay === "list");
  const textW = centred ? W - pad * 2 : (wide ? W - pad * 2 : W * 0.52);

  let zone, zmode;
  if (lay === "thesis" || lay === "num"){
    zmode = "side";
    zone = {x: left + textW + 46, y: 0, w: W - (left + textW + 46), h: H};
  } else if (lay === "ask"){
    zmode = "edge";
    zone = {x: 0, y: 0, w: W, h: H};
  } else {
    zmode = "back";
    zone = {x: 0, y: 0, w: W, h: H};
  }

  const topY = pad + 30, botY = H - pad + 4;
  const bandTop = sigTop ? topY + 34 : topY - 20;
  const bandBot = (sigTop ? botY : botY - 46) - 40;

  let sig = "";
  if (sign !== "none"){
    const y = sigTop ? topY : botY;
    const av = (sign === "full" && cfg.avatar)
      ? `<clipPath id="a${uid}"><circle cx="${left + 19}" cy="${y - 7}" r="19"/></clipPath>
         <image href="${cfg.avatar}" x="${left}" y="${y - 26}" width="38" height="38"
           clip-path="url(#a${uid})"/>`
      : "";
    sig = `${av}<text x="${left + ((sign === "full" && cfg.avatar) ? 50 : 0)}" y="${y}" fill="${p.mut}"
      font-size="25" font-weight="600">${esc(cfg.name)}</text>`;
  }
  const rub = lay === "ask" ? "вопрос читателям" : lay === "vs" ? "сравнение" :
              lay === "list" ? "подборка" : lay === "num" ? "разбор исследования" : "обзор добавки";
  const foot = `<text x="${left}" y="${botY}"
    fill="${p.dim}" font-size="22">${esc(rub)}</text>`;

  const midY = (bandTop + bandBot) / 2;
  let body = "";

  if (lay === "thesis"){
    const words = [];
    item[0].trim().split(/\s+/).forEach(function(t){ words.push([t, p.ink]); });
    item[1].trim().split(/\s+/).forEach(function(t){ words.push([t, p.acc]); });
    const tail = item[2].trim();
    if (tail.charAt(0) === ","){ words[words.length - 1] = [words[words.length - 1][0] + ",", p.acc]; }
    tail.replace(/^,\s*/, "").split(/\s+/).filter(Boolean)
      .forEach(function(t){ words.push([t, p.ink]); });
    const f = fitLines(words, textW, bandBot - bandTop, 68, 800);
    const lh = f.fs * 1.14;
    const y0 = midY - (f.lines.length - 1) * lh / 2 + f.fs * 0.34;
    body = f.lines.map(function(ln, i){
      return `<text x="${left}" y="${y0 + i * lh}" data-mw="${textW}" font-size="${f.fs}" font-weight="800"
        letter-spacing="-1">${ln.map(function(t){
          return `<tspan fill="${t[1]}">${esc(t[0])}</tspan>`; }).join(" ")}</text>`;
    }).join("");
  } else if (lay === "num"){
    const numFs = Math.min(200, Math.round(textW / Math.max(1, item[0].length) * 1.55));
    const cap = fitLines(item[2].split(/\s+/).map(function(t){ return [t, p.mut]; }),
                         textW, 90, 30, 400);
    body = `<text x="${left}" y="${midY + numFs * 0.18}" data-mw="${textW}" font-size="${numFs}" font-weight="800"
      fill="${p.ink}" letter-spacing="-8">${esc(item[0])}<tspan font-size="${Math.round(numFs*0.26)}"
      fill="${p.acc}" dx="24" dy="-${Math.round(numFs*0.06)}" letter-spacing="0"
      font-weight="700">${esc(item[1])}</tspan></text>` +
      cap.lines.map(function(ln, i){
        return `<text x="${left}" y="${midY + numFs * 0.5 + i * cap.fs * 1.3}" data-mw="${textW}"
          font-size="${cap.fs}" fill="${p.mut}">${ln.map(function(t){ return esc(t[0]); }).join(" ")}</text>`;
      }).join("");
  } else if (lay === "vs"){
    const halfW = (W - pad * 2 - 96) / 2;
    const rx = left + halfW + 96;
    const f1 = fitLines(item[1].split(/\s+/).map(function(t){ return [t, p.ink]; }),
                        halfW, 180, 72, 800);
    const f2 = fitLines(item[3].split(/\s+/).map(function(t){ return [t, p.acc]; }),
                        halfW, 180, 72, 800);
    const fs = Math.min(f1.fs, f2.fs);
    const capY = midY - fs * 0.86;
    const nameY = midY + fs * 0.22;
    const lineY = nameY + fs * 0.42;
    body = `<line x1="${left + halfW + 48}" y1="${bandTop + 6}" x2="${left + halfW + 48}"
      y2="${bandBot - 2}" stroke="${p.ink}" opacity=".12"/>
      <text x="${left}" y="${capY}" font-size="22" fill="${p.dim}"
        letter-spacing=".5">${esc(item[0])}</text>
      <text x="${left}" y="${nameY}" data-mw="${halfW}" data-fitgroup="vs" font-size="${fs}" font-weight="800"
        fill="${p.ink}">${esc(item[1])}</text>
      <rect x="${left}" y="${lineY}" width="${Math.min(halfW, item[1].length * fs * 0.5)}"
        height="4" rx="2" fill="${p.ink}" opacity=".22"/>
      <text x="${rx}" y="${capY}" font-size="22" fill="${p.dim}"
        letter-spacing=".5">${esc(item[2])}</text>
      <text x="${rx}" y="${nameY}" data-mw="${halfW}" data-fitgroup="vs" font-size="${fs}" font-weight="800"
        fill="${p.acc}">${esc(item[3])}</text>
      <rect x="${rx}" y="${lineY}" width="${Math.min(halfW, item[3].length * fs * 0.5)}"
        height="4" rx="2" fill="${p.acc}" opacity=".5"/>`;
  } else if (lay === "list"){
    const head = fitLines(item[0].split(/\s+/).map(function(t){ return [t, p.ink]; }),
                          textW, 110, 44, 800);
    const rowH = 62;
    const startY = midY - (item[1].length * rowH) / 2 + head.lines.length * head.fs * 0.42;
    body = head.lines.map(function(ln, i){
      return `<text x="${left}" y="${bandTop + 46 + i * head.fs * 1.14}" data-mw="${textW}" font-size="${head.fs}"
        font-weight="800" fill="${p.ink}">${ln.map(function(t){ return esc(t[0]); }).join(" ")}</text>`;
    }).join("") + item[1].map(function(t, i){
      const y = startY + i * rowH + 26;
      return `<rect x="${left}" y="${y - 25}" width="34" height="34" rx="10" fill="${p.acc}"
        opacity=".16"/>
        <text x="${left + 17}" y="${y}" font-size="20" font-weight="800" fill="${p.acc}"
          text-anchor="middle">${i + 1}</text>
        <text x="${left + 52}" y="${y}" data-mw="${textW - 60}" font-size="29" fill="${p.ink}" opacity=".92">${esc(t)}</text>`;
    }).join("");
  } else {
    const f = fitLines(item[0].split(/\s+/).map(function(t){ return [t, p.ink]; }),
                       W - pad * 2 - 60, bandBot - bandTop - 90, 58, 800);
    const lh = f.fs * 1.16;
    const y0 = midY - (f.lines.length - 1) * lh / 2 + f.fs * 0.34 + 26;
    body = `<text x="${W/2}" y="${y0 - f.lines.length * lh / 2 - 44}" font-size="86"
      fill="${p.acc}" opacity=".4" text-anchor="middle" font-weight="800">?</text>` +
      f.lines.map(function(ln, i){
        return `<text x="${W/2}" y="${y0 + i * lh}" data-mw="${W - pad * 2 - 60}" font-size="${f.fs}" font-weight="800"
          fill="${p.ink}" text-anchor="middle">${ln.map(function(t){ return esc(t[0]); }).join(" ")}</text>`;
      }).join("");
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"
    font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif">
    <defs>
      <radialGradient id="gl${uid}"><stop offset="0" stop-color="${p.acc}" stop-opacity=".55"/>
        <stop offset="1" stop-color="${p.acc}" stop-opacity="0"/></radialGradient>
      <clipPath id="z${uid}">${zmode === "edge"
        ? `<rect x="0" y="0" width="${W}" height="${H * 0.2}"/>
           <rect x="0" y="${H * 0.8}" width="${W}" height="${H * 0.2}"/>
           <rect x="0" y="0" width="${W * 0.16}" height="${H}"/>
           <rect x="${W * 0.84}" y="0" width="${W * 0.16}" height="${H}"/>`
        : `<rect x="${zone.x}" y="${zone.y}" width="${zone.w}" height="${zone.h}"/>`}</clipPath>
    </defs>
    <rect width="${W}" height="${H}" fill="${p.bg}"/>
    ${shape === 'none' ? '' : shapeSvg(shape, p, geoSeed, W, H, zone, uid, zmode)}
    ${sig}${foot}${body}</svg>`;
}


function __fitTexts(root) {
  var texts = root.querySelectorAll("text[data-mw]");
  for (var i = 0; i < texts.length; i++) {
    var t = texts[i];
    var mw = parseFloat(t.getAttribute("data-mw"));
    if (!mw) continue;
    var fs = parseFloat(t.getAttribute("font-size")) || 30;
    for (var k = 0; k < 6; k++) {
      var len = 0;
      try { len = t.getComputedTextLength(); } catch (e) { break; }
      if (len <= mw || fs <= 15) break;
      fs = Math.max(15, Math.floor(fs * mw / len * 0.97));
      t.setAttribute("font-size", fs);
    }
  }
  var groups = {};
  var gt = root.querySelectorAll("text[data-fitgroup]");
  for (var g = 0; g < gt.length; g++) {
    var key = gt[g].getAttribute("data-fitgroup");
    var v = parseFloat(gt[g].getAttribute("font-size")) || 30;
    if (!(key in groups) || v < groups[key]) groups[key] = v;
  }
  for (var g2 = 0; g2 < gt.length; g2++) {
    gt[g2].setAttribute("font-size", groups[gt[g2].getAttribute("data-fitgroup")]);
  }
}

window.__coverSvg = function (spec) {
  var svg = coverSvg(spec);
  var host = document.createElement("div");
  host.style.cssText = "position:absolute;left:-99999px;top:0;width:1200px";
  host.innerHTML = svg;
  document.body.appendChild(host);
  __fitTexts(host);
  var out = host.innerHTML;
  host.remove();
  return out;
};
window.__coverSvgRaw = coverSvg;

})();
