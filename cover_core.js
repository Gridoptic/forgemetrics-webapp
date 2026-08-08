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

function coverSvg(cfg){
  const W = 1200, H = 675, p = palOf(cfg.pal);
  const uid = ++UID;
  const seed = cfg.seed;
  const shape = cfg.shape === "auto"
    ? SHAPES[Math.floor(srand(seed * 61) * SHAPES.length) % SHAPES.length]
    : cfg.shape;
  const geoSeed = (cfg.shape && cfg.shape !== "auto") ? 7 : seed;
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
      return `<text x="${left}" y="${y0 + i * lh}" font-size="${f.fs}" font-weight="800"
        letter-spacing="-1">${ln.map(function(t){
          return `<tspan fill="${t[1]}">${esc(t[0])}</tspan>`; }).join(" ")}</text>`;
    }).join("");
  } else if (lay === "num"){
    const numFs = Math.min(200, Math.round(textW / Math.max(1, item[0].length) * 1.55));
    const cap = fitLines(item[2].split(/\s+/).map(function(t){ return [t, p.mut]; }),
                         textW, 90, 30, 400);
    body = `<text x="${left}" y="${midY + numFs * 0.18}" font-size="${numFs}" font-weight="800"
      fill="${p.ink}" letter-spacing="-8">${esc(item[0])}<tspan font-size="${Math.round(numFs*0.26)}"
      fill="${p.acc}" dx="24" dy="-${Math.round(numFs*0.06)}" letter-spacing="0"
      font-weight="700">${esc(item[1])}</tspan></text>` +
      cap.lines.map(function(ln, i){
        return `<text x="${left}" y="${midY + numFs * 0.5 + i * cap.fs * 1.3}"
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
      <text x="${left}" y="${nameY}" font-size="${fs}" font-weight="800"
        fill="${p.ink}">${esc(item[1])}</text>
      <rect x="${left}" y="${lineY}" width="${Math.min(halfW, item[1].length * fs * 0.5)}"
        height="4" rx="2" fill="${p.ink}" opacity=".22"/>
      <text x="${rx}" y="${capY}" font-size="22" fill="${p.dim}"
        letter-spacing=".5">${esc(item[2])}</text>
      <text x="${rx}" y="${nameY}" font-size="${fs}" font-weight="800"
        fill="${p.acc}">${esc(item[3])}</text>
      <rect x="${rx}" y="${lineY}" width="${Math.min(halfW, item[3].length * fs * 0.5)}"
        height="4" rx="2" fill="${p.acc}" opacity=".5"/>`;
  } else if (lay === "list"){
    const head = fitLines(item[0].split(/\s+/).map(function(t){ return [t, p.ink]; }),
                          textW, 110, 44, 800);
    const rowH = 62;
    const startY = midY - (item[1].length * rowH) / 2 + head.lines.length * head.fs * 0.42;
    body = head.lines.map(function(ln, i){
      return `<text x="${left}" y="${bandTop + 46 + i * head.fs * 1.14}" font-size="${head.fs}"
        font-weight="800" fill="${p.ink}">${ln.map(function(t){ return esc(t[0]); }).join(" ")}</text>`;
    }).join("") + item[1].map(function(t, i){
      const y = startY + i * rowH + 26;
      return `<rect x="${left}" y="${y - 25}" width="34" height="34" rx="10" fill="${p.acc}"
        opacity=".16"/>
        <text x="${left + 17}" y="${y}" font-size="20" font-weight="800" fill="${p.acc}"
          text-anchor="middle">${i + 1}</text>
        <text x="${left + 52}" y="${y}" font-size="29" fill="${p.ink}" opacity=".92">${esc(t)}</text>`;
    }).join("");
  } else {
    const f = fitLines(item[0].split(/\s+/).map(function(t){ return [t, p.ink]; }),
                       W - pad * 2 - 60, bandBot - bandTop - 90, 58, 800);
    const lh = f.fs * 1.16;
    const y0 = midY - (f.lines.length - 1) * lh / 2 + f.fs * 0.34 + 26;
    body = `<text x="${W/2}" y="${y0 - f.lines.length * lh / 2 - 44}" font-size="86"
      fill="${p.acc}" opacity=".4" text-anchor="middle" font-weight="800">?</text>` +
      f.lines.map(function(ln, i){
        return `<text x="${W/2}" y="${y0 + i * lh}" font-size="${f.fs}" font-weight="800"
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

window.__coverSvg = coverSvg;

})();
