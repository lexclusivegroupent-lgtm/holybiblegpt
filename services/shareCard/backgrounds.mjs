// Share-card backgrounds drawn with canvas gradients and shapes.
// No photos, no remote images, no emoji.

function rgba(hex, alpha) {
  const n = hex.replace('#', '');
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fillLinear(ctx, w, h, stops, x1 = 0, y1 = 0, x2 = 0, y2 = h) {
  const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

function orb(ctx, x, y, radius, inner, outer) {
  const gradient = ctx.createRadialGradient(x, y, radius * 0.08, x, y, radius);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(1, outer);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function specks(ctx, w, h, seed, color, count, maxRadius = 1.6) {
  const random = mulberry32(seed);
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < count; i += 1) {
    const x = random() * w;
    const y = random() * h;
    const radius = random() * maxRadius + 0.3;
    ctx.globalAlpha = random() * 0.35 + 0.05;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function vignette(ctx, w, h, color, innerRadius = 0.35) {
  const gradient = ctx.createRadialGradient(
    w / 2,
    h * 0.48,
    Math.min(w, h) * innerRadius,
    w / 2,
    h * 0.5,
    Math.max(w, h) * 0.72,
  );
  gradient.addColorStop(0, rgba(color, 0));
  gradient.addColorStop(1, rgba(color, 0.45));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

function paintDawn(ctx, w, h) {
  fillLinear(ctx, w, h, [
    [0, '#6d8298'],
    [0.22, '#e7a894'],
    [0.4, '#f6c9a4'],
    [0.58, '#f7e0cc'],
    [1, '#f4d2b8'],
  ]);
  orb(ctx, w * 0.5, h * 0.3, w * 0.42, 'rgba(255,246,230,0.9)', 'rgba(255,220,190,0)');
  orb(ctx, w * 0.22, h * 0.34, w * 0.18, 'rgba(255,255,255,0.28)', 'rgba(255,255,255,0)');
  orb(ctx, w * 0.78, h * 0.38, w * 0.2, 'rgba(255,236,220,0.32)', 'rgba(255,236,220,0)');
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.beginPath();
  ctx.ellipse(w * 0.3, h * 0.72, w * 0.28, h * 0.03, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  vignette(ctx, w, h, '#8a6248', 0.55);
}

function paintLinen(ctx, w, h) {
  fillLinear(ctx, w, h, [
    [0, '#fbf6ee'],
    [0.5, '#f6f1e6'],
    [1, '#efe6d6'],
  ]);
  const random = mulberry32(11);
  ctx.save();
  ctx.strokeStyle = 'rgba(120,96,64,0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 70; i += 1) {
    const y = random() * h;
    const x = random() * w;
    ctx.globalAlpha = 0.35 + random() * 0.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 40 + random() * 120, y + (random() - 0.5) * 2);
    ctx.stroke();
  }
  ctx.restore();
  specks(ctx, w, h, 12, '#8a704e', 500, 1.1);
  vignette(ctx, w, h, '#c2b29a', 0.5);
}

function paintNavy(ctx, w, h) {
  fillLinear(ctx, w, h, [
    [0, '#1b2b4a'],
    [0.45, '#10192e'],
    [1, '#0b1222'],
  ], 0, 0, w, h);
  orb(ctx, w * 0.5, h * 0.42, w * 0.55, 'rgba(212,175,90,0.14)', 'rgba(212,175,90,0)');
  ctx.save();
  ctx.strokeStyle = 'rgba(231,215,168,0.45)';
  ctx.lineWidth = Math.max(1.5, w / 700);
  const inset = w * 0.055;
  ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
  ctx.strokeStyle = 'rgba(231,215,168,0.18)';
  ctx.strokeRect(inset + 10, inset + 10, w - (inset + 10) * 2, h - (inset + 10) * 2);
  ctx.restore();
  specks(ctx, w, h, 21, '#f0e2bc', 80, 1.8);
  vignette(ctx, w, h, '#05080f', 0.42);
}

function paintBokeh(ctx, w, h) {
  fillLinear(ctx, w, h, [
    [0, '#1c1e26'],
    [1, '#101218'],
  ]);
  const lights = [
    [0.18, 0.16, 0.28, 'rgba(232,196,130,0.34)', 'rgba(232,196,130,0)'],
    [0.82, 0.2, 0.22, 'rgba(186,150,160,0.28)', 'rgba(186,150,160,0)'],
    [0.72, 0.74, 0.32, 'rgba(130,160,190,0.22)', 'rgba(130,160,190,0)'],
    [0.16, 0.78, 0.26, 'rgba(210,176,120,0.2)', 'rgba(210,176,120,0)'],
    [0.48, 0.46, 0.18, 'rgba(255,244,220,0.08)', 'rgba(255,244,220,0)'],
    [0.58, 0.12, 0.12, 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0)'],
  ];
  for (const [x, y, r, inner, outer] of lights) {
    orb(ctx, w * x, h * y, Math.min(w, h) * r, inner, outer);
  }
}

function paintMist(ctx, w, h) {
  fillLinear(ctx, w, h, [
    [0, '#d5e2ea'],
    [0.45, '#e7eef2'],
    [1, '#d9e4ea'],
  ]);
  orb(ctx, w * 0.3, h * 0.22, w * 0.4, 'rgba(255,255,255,0.65)', 'rgba(255,255,255,0)');
  orb(ctx, w * 0.75, h * 0.62, w * 0.36, 'rgba(255,255,255,0.4)', 'rgba(255,255,255,0)');
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  for (const y of [0.3, 0.55, 0.78]) {
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * y, w * 0.55, h * 0.035, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function paintOlive(ctx, w, h) {
  fillLinear(ctx, w, h, [
    [0, '#2c3a28'],
    [0.5, '#1a2418'],
    [1, '#12180f'],
  ]);
  orb(ctx, w * 0.15, h * 0.2, w * 0.28, 'rgba(170,160,90,0.16)', 'rgba(170,160,90,0)');
  orb(ctx, w * 0.86, h * 0.78, w * 0.3, 'rgba(90,110,70,0.28)', 'rgba(90,110,70,0)');
  ctx.save();
  ctx.fillStyle = 'rgba(214,206,160,0.06)';
  ctx.beginPath();
  ctx.ellipse(w * 0.12, h * 0.7, w * 0.08, h * 0.14, -0.5, 0, Math.PI * 2);
  ctx.ellipse(w * 0.9, h * 0.22, w * 0.07, h * 0.12, 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  vignette(ctx, w, h, '#0c100a', 0.48);
}

function paintParchment(ctx, w, h) {
  fillLinear(ctx, w, h, [
    [0, '#f7f1e2'],
    [0.55, '#f4ecd9'],
    [1, '#eadfc8'],
  ]);
  specks(ctx, w, h, 33, '#a08058', 350, 1.2);
  const inset = Math.round(Math.min(w, h) * 0.06);
  ctx.save();
  ctx.strokeStyle = 'rgba(90,62,32,0.28)';
  ctx.lineWidth = Math.max(1, w / 800);
  ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
  ctx.strokeStyle = 'rgba(90,62,32,0.14)';
  ctx.strokeRect(inset + 8, inset + 8, w - (inset + 8) * 2, h - (inset + 8) * 2);
  ctx.restore();
  vignette(ctx, w, h, '#c4b498', 0.55);
}

function paintSea(ctx, w, h) {
  fillLinear(ctx, w, h, [
    [0, '#0a2a30'],
    [0.42, '#0e3338'],
    [0.72, '#146068'],
    [1, '#0c3338'],
  ]);
  orb(ctx, w * 0.7, h * 0.28, w * 0.34, 'rgba(190,230,220,0.16)', 'rgba(190,230,220,0)');
  orb(ctx, w * 0.25, h * 0.62, w * 0.28, 'rgba(160,210,200,0.1)', 'rgba(160,210,200,0)');
  specks(ctx, w, h, 44, '#d5ece6', 40, 1.4);
  vignette(ctx, w, h, '#06181c', 0.4);
}

function paintCandle(ctx, w, h) {
  ctx.fillStyle = '#140e0a';
  ctx.fillRect(0, 0, w, h);
  orb(ctx, w * 0.5, h * 0.46, Math.min(w, h) * 0.62, 'rgba(176,104,48,0.55)', 'rgba(42,28,18,0)');
  orb(ctx, w * 0.5, h * 0.46, Math.min(w, h) * 0.22, 'rgba(255,214,150,0.28)', 'rgba(255,214,150,0)');
  specks(ctx, w, h, 52, '#f0d7a4', 30, 1.5);
  vignette(ctx, w, h, '#0c0806', 0.35);
}

function paintBlossom(ctx, w, h) {
  fillLinear(ctx, w, h, [
    [0, '#f8ecea'],
    [0.5, '#f8e8e6'],
    [1, '#f0d6d4'],
  ]);
  orb(ctx, w * 0.12, h * 0.18, w * 0.28, 'rgba(255,255,255,0.7)', 'rgba(255,255,255,0)');
  orb(ctx, w * 0.88, h * 0.22, w * 0.22, 'rgba(214,150,160,0.22)', 'rgba(214,150,160,0)');
  orb(ctx, w * 0.8, h * 0.84, w * 0.26, 'rgba(255,255,255,0.45)', 'rgba(255,255,255,0)');
  ctx.save();
  ctx.fillStyle = 'rgba(196,120,132,0.08)';
  ctx.beginPath();
  ctx.ellipse(w * 0.08, h * 0.55, w * 0.05, h * 0.09, 0.8, 0, Math.PI * 2);
  ctx.ellipse(w * 0.94, h * 0.48, w * 0.045, h * 0.08, -0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function paintTwilight(ctx, w, h) {
  fillLinear(ctx, w, h, [
    [0, '#100e24'],
    [0.4, '#16132c'],
    [0.72, '#2a2040'],
    [1, '#1a1430'],
  ]);
  orb(ctx, w * 0.5, h * 0.78, w * 0.7, 'rgba(176,110,130,0.22)', 'rgba(176,110,130,0)');
  specks(ctx, w, h, 64, '#f4efe4', 70, 1.5);
  vignette(ctx, w, h, '#07060f', 0.4);
}

function paintStone(ctx, w, h) {
  fillLinear(ctx, w, h, [
    [0, '#f1ece4'],
    [0.5, '#e8e3da'],
    [1, '#ddd6cb'],
  ]);
  const random = mulberry32(71);
  ctx.save();
  ctx.strokeStyle = 'rgba(80,70,60,0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 40; i += 1) {
    const y = random() * h;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y + (random() - 0.5) * 30);
    ctx.stroke();
  }
  ctx.restore();
  specks(ctx, w, h, 72, '#6e655c', 280, 1.1);
  vignette(ctx, w, h, '#b7aea2', 0.45);
}

export const BACKGROUNDS = [
  {
    id: 'dawn',
    name: 'Dawn',
    ink: '#241910',
    muted: '#4a3b2a',
    reference: '#4a3b2a',
    field: '#f7e0cc',
    veil: 0.84,
    paint: paintDawn,
  },
  {
    id: 'linen',
    name: 'Linen',
    ink: '#241910',
    muted: '#4e4030',
    reference: '#4e4030',
    field: '#f6f1e6',
    veil: 0.8,
    paint: paintLinen,
  },
  {
    id: 'navy-gold',
    name: 'Navy',
    ink: '#f7f3ea',
    muted: '#e7d7a8',
    reference: '#e7d7a8',
    field: '#10192e',
    veil: 0.86,
    paint: paintNavy,
  },
  {
    id: 'bokeh',
    name: 'Bokeh',
    ink: '#f7f3ea',
    muted: '#e7d7a8',
    reference: '#e7d7a8',
    field: '#14161c',
    veil: 0.88,
    paint: paintBokeh,
  },
  {
    id: 'mist',
    name: 'Mist',
    ink: '#1a242c',
    muted: '#314049',
    reference: '#314049',
    field: '#e7eef2',
    veil: 0.82,
    paint: paintMist,
  },
  {
    id: 'olive',
    name: 'Olive',
    ink: '#f4f1e6',
    muted: '#e4d5a4',
    reference: '#e4d5a4',
    field: '#1a2418',
    veil: 0.86,
    paint: paintOlive,
  },
  {
    id: 'parchment',
    name: 'Parchment',
    ink: '#2a2116',
    muted: '#5a4630',
    reference: '#5a4630',
    field: '#f4ecd9',
    veil: 0.8,
    paint: paintParchment,
  },
  {
    id: 'sea',
    name: 'Sea',
    ink: '#f3f7f5',
    muted: '#d5e4df',
    reference: '#d5e4df',
    field: '#0e3338',
    veil: 0.86,
    paint: paintSea,
  },
  {
    id: 'candle',
    name: 'Candle',
    ink: '#f8f1e4',
    muted: '#f0d7a4',
    reference: '#f0d7a4',
    field: '#2a1c12',
    veil: 0.88,
    paint: paintCandle,
  },
  {
    id: 'blossom',
    name: 'Blossom',
    ink: '#3a2228',
    muted: '#6a3d48',
    reference: '#6a3d48',
    field: '#f8e8e6',
    veil: 0.82,
    paint: paintBlossom,
  },
  {
    id: 'twilight',
    name: 'Twilight',
    ink: '#f6f2ec',
    muted: '#e6d3a1',
    reference: '#e6d3a1',
    field: '#16132c',
    veil: 0.86,
    paint: paintTwilight,
  },
  {
    id: 'stone',
    name: 'Stone',
    ink: '#1f1c19',
    muted: '#4a433c',
    reference: '#4a433c',
    field: '#e8e3da',
    veil: 0.82,
    paint: paintStone,
  },
];

export function backgroundById(id) {
  return BACKGROUNDS.find((entry) => entry.id === id) || BACKGROUNDS[0];
}

export function rotatingBackgroundId(date = new Date()) {
  const utc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const start = Date.UTC(date.getFullYear(), 0, 0);
  const day = Math.floor((utc - start) / 86400000);
  const index = ((day % BACKGROUNDS.length) + BACKGROUNDS.length) % BACKGROUNDS.length;
  return BACKGROUNDS[index].id;
}
