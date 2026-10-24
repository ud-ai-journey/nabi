// ── Settings ─────────────────────────────────────────────────────────────
// Where waitlist emails go: an endpoint that accepts a JSON POST (Formspree, Getform, Basin…). Empty = "opens soon".
const WAITLIST_ENDPOINT = "";
// The X profile, e.g. "https://x.com/nabiapp". Shows an X link in the footer when set.
const X_URL = "";
// ─────────────────────────────────────────────────────────────────────────

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const tween = (ms, fn) => new Promise(done => {
  const start = performance.now();
  const step = now => { const t = Math.min(1, (now - start) / ms); fn(ease(t)); t < 1 ? requestAnimationFrame(step) : done(); };
  requestAnimationFrame(step);
});
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ── Page chrome ──
const nav = $("#nav");
addEventListener("scroll", () => nav.classList.toggle("scrolled", scrollY > 10), { passive: true });
const revealer = new IntersectionObserver(entries => entries.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add("in"); revealer.unobserve(e.target); }
}), { threshold: 0.12 });
$$("[data-reveal]").forEach(el => revealer.observe(el));
$$(".card").forEach(card => card.addEventListener("pointermove", e => {
  const r = card.getBoundingClientRect();
  card.style.setProperty("--mx", `${e.clientX - r.left}px`);
  card.style.setProperty("--my", `${e.clientY - r.top}px`);
}));
if (X_URL) $$("[data-x-link]").forEach(a => { a.href = X_URL; a.hidden = false; });
const onceVisible = (el, fn, threshold = 0.4) => {
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); fn(); } }, { threshold });
  io.observe(el);
};

// ── Waitlist ──
$$("[data-waitlist]").forEach(form => {
  const note = form.nextElementSibling;
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const email = form.email.value.trim();
    note.className = "form-note";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { note.textContent = "That email doesn't look quite right."; note.classList.add("err"); return; }
    if (!WAITLIST_ENDPOINT) { note.textContent = "The waitlist opens very soon ♡"; return; }
    const button = form.querySelector("button");
    button.disabled = true;
    try {
      const res = await fetch(WAITLIST_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email, source: location.hostname || "nabi" }) });
      if (!res.ok) throw new Error();
      form.reset();
      note.textContent = "You're on the list. We'll write when Nabi is ready 🦋";
      note.classList.add("ok");
    } catch { note.textContent = "Couldn't sign you up just now. Try again in a moment."; note.classList.add("err"); }
    finally { button.disabled = false; }
  });
});

// ── Film ──
const player = $("#film-player"), film = $("#film-video");
$("#play").addEventListener("click", () => { film.controls = true; film.play(); player.classList.add("playing"); });
film.addEventListener("ended", () => { film.controls = false; player.classList.remove("playing"); });

// ── Interactive demo ──
const stage = $("#stage"), viewport = stage.parentElement;
const W = 1120, H = 640;
let scale = 1;
function fit() { scale = viewport.clientWidth / W; stage.style.transform = `scale(${scale})`; viewport.style.height = `${H * scale}px`; }
new ResizeObserver(fit).observe(viewport); fit();
const toStage = e => { const r = stage.getBoundingClientRect(); return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale }; };

const T = (id, label) => ({ id, label });
const FILES = [
  { name: "trip.heic", kind: "photo", ext: "HEIC", targets: [T("jpg", "JPG"), T("png", "PNG"), T("pdf", "PDF"), T("cutout", "Cutout"), T("behind", "Behind"), T("text", "Text"), T("gif", "GIF"), T("small", "Smaller"), T("webp", "WEBP"), T("half", "½ Size")] },
  { name: "vlog.mov", kind: "video", ext: "MOV", targets: [T("mp4", "MP4"), T("mp3", "MP3"), T("gif", "GIF"), T("small", "Smaller"), T("m4a", "M4A"), T("720p", "720p"), T("webm", "WEBM"), T("hevc", "HEVC"), T("mkv", "MKV")] },
  { name: "notes.md", kind: "text", ext: "MD", targets: [T("pdf", "PDF"), T("docx", "DOCX"), T("html", "HTML"), T("rtf", "RTF")] },
  { name: "report.pdf", kind: "pdf", ext: "PDF", targets: [T("png", "PNG"), T("jpg", "JPG"), T("txt", "TXT"), T("small", "Smaller"), T("heic", "HEIC"), T("tiff", "TIFF")] },
];
const KIND = { jpg: "photo", png: "photo", heic: "photo", webp: "photo", gif: "photo", tiff: "photo", cutout: "photo", behind: "photo", half: "photo",
  mp4: "video", "720p": "video", webm: "video", hevc: "video", mkv: "video", mp3: "video", m4a: "video", pdf: "pdf", txt: "text", text: "text", docx: "text", html: "text", rtf: "text" };
function outputName(file, t) {
  const base = file.name.replace(/\.[^.]+$/, "");
  const tools = { cutout: [" cutout", "png"], behind: [" behind", "jpg"], text: [" text", "txt"], half: [" half", "jpg"], "720p": [" 720p", "mp4"], hevc: [" HEVC", "mp4"],
    small: [" small", { photo: "jpg", video: "mp4", pdf: "pdf", text: "pdf" }[file.kind]] };
  const [suffix, ext] = tools[t.id] || ["", t.id];
  return { name: `${base}${suffix}.${ext}`, kind: t.id === "small" ? file.kind : KIND[t.id] || file.kind, ext: ext.toUpperCase() };
}
function phrase(t) {
  return { cutout: "Cut me out! ✂︎", behind: "Put words behind me! ♡", text: "Read my words! ♡", half: "Make me half size! ♡", small: "Make me smaller! ♡" }[t.id]
    || `Turn me into ${t.label}! ♡`;
}

const filesEl = $("#files");
function tile(file, fresh = false) {
  const el = document.createElement("div");
  el.className = "file" + (fresh ? " fresh" : "");
  el.innerHTML = `<div class="doc ${file.kind}"><em>${file.ext}</em></div><div class="name">${file.name}</div>`;
  el.file = file;
  return el;
}
function resetFiles() { filesEl.innerHTML = ""; FILES.forEach(f => filesEl.append(tile(f))); }
resetFiles();

// Spot layouts from the app (left side; the right mirrors it), plus the tail spot for odd counts.
const LAYOUTS = {
  1: [[0.2, 0.355, 0.088, 1]],
  2: [[0.195, 0.345, 0.085, 1], [0.33, 0.755, 0.076, 0]],
  3: [[0.172, 0.25, 0.078, 1], [0.18, 0.47, 0.08, 1], [0.33, 0.755, 0.076, 0]],
  4: [[0.1607, 0.1999, 0.0701, 1], [0.2109, 0.3535, 0.0691, 1], [0.1658, 0.507, 0.0692, 1], [0.33, 0.755, 0.072, 0]],
  5: [[0.1607, 0.1999, 0.0701, 1], [0.2109, 0.3535, 0.0691, 1], [0.1658, 0.507, 0.0692, 1], [0.3029, 0.6919, 0.0672, 0], [0.3673, 0.829, 0.064, 0]],
};
const TAIL = [0.5, 0.84, 0.058, 0];
const S = 360;

const fly = document.createElement("div");
fly.className = "bfly";
fly.innerHTML = `<div class="bubble"></div><div class="box"><div class="wing l"></div><div class="wing r"></div>
  <img class="body" src="../assets/body.png" alt=""><svg class="ring" width="${S}" height="${S}"><circle cx="${S / 2}" cy="${S * 0.383}" r="${S * 0.15}" fill="none" stroke="rgba(255,255,255,.9)" stroke-width="8"/>
  <circle id="ring-p" cx="${S / 2}" cy="${S * 0.383}" r="${S * 0.15}" fill="none" stroke="#db4f8c" stroke-width="6" stroke-linecap="round" transform="rotate(-90 ${S / 2} ${S * 0.383})"/></svg></div>`;
stage.append(fly);
const bubble = $(".bubble", fly), wingL = $(".wing.l", fly), wingR = $(".wing.r", fly), box = $(".box", fly), ringP = $("#ring-p", fly), ring = $(".ring", fly);
const circ = 2 * Math.PI * S * 0.15;
ringP.style.strokeDasharray = circ;

let open = null; // { file, spots: [{el, x, y, r, t}], origin }
function openFly(file, x, y) {
  $$(".spot", fly).forEach(s => s.remove());
  const n = file.targets.length, perSide = Math.min(5, Math.floor(n / 2)), layout = LAYOUTS[perSide] || [];
  const spots = [];
  layout.forEach((slot, s) => [0, 1].forEach(side => {
    const i = s * 2 + side; if (i >= n) return;
    const [sx, sy, r, upper] = slot, cx = side ? (1 - sx) * S : sx * S, cy = sy * S;
    const el = document.createElement("div");
    el.className = "spot" + (upper ? "" : " lower");
    el.style.cssText = `width:${r * 2 * S}px;height:${r * 2 * S}px;left:${side ? cx - S / 2 : cx}px;top:${cy}px;font-size:${file.targets[i].label.length > 4 ? 10 : 12}px`;
    el.textContent = file.targets[i].label;
    (side ? wingR : wingL).append(el);
    spots.push({ el, x: cx, y: cy, r: r * S, t: file.targets[i] });
  }));
  if (n % 2 === 1) {
    const [sx, sy, r] = TAIL, el = document.createElement("div");
    el.className = "spot lower";
    el.style.cssText = `width:${r * 2 * S}px;height:${r * 2 * S}px;left:${sx * S}px;top:${sy * S}px;font-size:11px`;
    el.textContent = file.targets[n - 1].label;
    box.append(el);
    spots.push({ el, x: sx * S, y: sy * S, r: r * S, t: file.targets[n - 1] });
  }
  const left = Math.max(10, Math.min(W - S - 10, x - S / 2)), top = Math.max(70, Math.min(H - S - 10, y - S / 2));
  fly.style.left = `${left}px`; fly.style.top = `${top}px`;
  open = { file, spots, left, top };
  bubble.className = "bubble"; bubble.textContent = file.name;
  fly.className = "bfly idle shown";
  spots.forEach(sp => sp.el.onclick = () => convert(sp));
}
function spotAt(p) {
  if (!open) return null;
  return open.spots.find(sp => Math.hypot(p.x - open.left - sp.x, p.y - open.top - sp.y) <= sp.r + 6) || null;
}
function hover(sp) {
  if (!open) return;
  open.spots.forEach(s => s.el.classList.toggle("lit", s === sp));
  bubble.textContent = sp ? phrase(sp.t) : open.file.name;
}
function closeFly() { fly.classList.remove("shown"); open = null; }
let converting = false;
async function convert(sp) {
  if (!open || converting) return;
  converting = true;
  const file = open.file, out = outputName(file, sp.t);
  hover(null);
  open.spots.forEach(s => (s.el.style.opacity = 0));
  fly.className = "bfly working shown";
  ring.classList.add("on");
  $("#menu-icon").classList.add("busy");
  await tween(reduced ? 200 : 1300, t => { ringP.style.strokeDashoffset = circ * (1 - t); bubble.textContent = `Converting… ${Math.round(t * 100)}%`; });
  ring.classList.remove("on");
  $("#menu-icon").classList.remove("busy");
  fly.className = "bfly happy shown";
  bubble.textContent = `✓ ${out.name}`; bubble.classList.add("done");
  for (let i = 0; i < 6; i++) {
    const h = document.createElement("div");
    h.className = "heart";
    h.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.6 4.5c2.1 0 3.6 1.2 5.4 3.3 1.8-2.1 3.3-3.3 5.4-3.3 3.6 0 5.7 3.9 4.2 7.3C19.5 16.4 12 21 12 21z" fill="#ff7eb6"/></svg>`;
    h.style.left = `${S / 2 - 11 + (Math.random() - 0.5) * 180}px`; h.style.top = `${S * 0.3 + (Math.random() - 0.5) * 80}px`;
    h.style.animationDelay = `${i * 0.08}s`;
    box.append(h); setTimeout(() => h.remove(), 1800);
  }
  const fresh = tile(out, true);
  filesEl.append(fresh);
  while (filesEl.children.length > 8) filesEl.children[FILES.length].remove();
  await sleep(1500);
  closeFly();
  converting = false;
}

// Real pointer interaction.
let drag = null, autoplay = !reduced, cursor = null;
const keys = { ctrl: $("#k-ctrl"), cmd: $("#k-cmd") };
function stopAutoplay() { autoplay = false; cursor?.remove(); cursor = null; }
stage.addEventListener("pointerdown", e => {
  stopAutoplay();
  const el = e.target.closest(".file");
  if (!el) { if (open && !converting && !e.target.closest(".spot")) closeFly(); return; }
  if (converting) return;
  stage.setPointerCapture(e.pointerId);
  $$(".file", filesEl).forEach(f => f.classList.toggle("selected", f === el));
  drag = { el, file: el.file, start: toStage(e), moved: false, ghost: null, timer: null };
});
stage.addEventListener("pointermove", e => {
  const p = toStage(e);
  if (!drag) { if (open && !converting) hover(spotAt(p)); return; }
  if (!drag.moved && Math.hypot(p.x - drag.start.x, p.y - drag.start.y) > 6) {
    drag.moved = true;
    drag.el.classList.add("lifted");
    drag.ghost = drag.el.querySelector(".doc").cloneNode(true);
    drag.ghost.classList.add("drag-ghost");
    stage.append(drag.ghost);
    // No keyboard (phones) or no ⌃⌘? Nabi opens after a moment anyway.
    drag.timer = setTimeout(() => drag && !open && openFly(drag.file, drag.last.x, drag.last.y), 900);
  }
  drag.last = p;
  if (drag.ghost) { drag.ghost.style.left = `${p.x}px`; drag.ghost.style.top = `${p.y}px`; }
  if (open) hover(spotAt(p));
});
stage.addEventListener("pointerup", e => {
  if (!drag) return;
  const p = toStage(e);
  clearTimeout(drag.timer);
  drag.ghost?.remove();
  drag.el.classList.remove("lifted");
  if (!drag.moved) openFly(drag.file, 760, 340);           // a tap opens it, like ⌃⌘ on a selection
  else if (open) { const sp = spotAt(p); sp ? convert(sp) : closeFly(); }
  drag = null;
});
addEventListener("keydown", e => {
  if (e.ctrlKey) keys.ctrl.classList.add("down");
  if (e.metaKey) keys.cmd.classList.add("down");
  if (e.ctrlKey && e.metaKey && !open) {
    if (drag?.moved) openFly(drag.file, drag.last.x, drag.last.y);
    else { const sel = $(".file.selected", filesEl); if (sel) { stopAutoplay(); openFly(sel.file, 760, 340); } }
  }
});
addEventListener("keyup", e => { if (!e.ctrlKey) keys.ctrl.classList.remove("down"); if (!e.metaKey) keys.cmd.classList.remove("down"); });

// A ghost cursor shows the gesture until someone tries it.
async function demoLoop() {
  if (!autoplay) return;
  const scenarios = [["trip.heic", "jpg"], ["vlog.mov", "gif"], ["notes.md", "pdf"], ["trip.heic", "cutout"]];
  cursor = document.createElement("div");
  cursor.className = "cursor";
  cursor.innerHTML = `<svg viewBox="0 0 22 30"><path d="M2 2l0 22 6-5.5 4 9 3.5-1.5-4-9 8.5 0z" fill="#111" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/></svg>`;
  stage.append(cursor);
  let pos = { x: 760, y: 560 };
  const move = (to, ms) => { const from = { ...pos }; return tween(ms, t => { pos = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }; cursor.style.left = `${pos.x}px`; cursor.style.top = `${pos.y}px`; }); };
  for (let round = 0; autoplay; round++) {
    const [name, id] = scenarios[round % scenarios.length];
    if (round % scenarios.length === 0) resetFiles();
    const el = $$(".file", filesEl).find(f => f.file.name === name), file = el.file;
    const r = el.getBoundingClientRect(), s = stage.getBoundingClientRect();
    const at = { x: (r.left - s.left) / scale + r.width / scale / 2, y: (r.top - s.top) / scale + 30 };
    await move(at, 900); if (!autoplay) break;
    cursor.classList.add("press"); el.classList.add("selected", "lifted");
    const ghost = el.querySelector(".doc").cloneNode(true); ghost.classList.add("drag-ghost"); stage.append(ghost);
    const drop = { x: 790, y: 360 };
    await tween(900, t => { const x = at.x + (drop.x - at.x) * t, y = at.y + (drop.y - at.y) * t; pos = { x, y };
      cursor.style.left = `${x}px`; cursor.style.top = `${y}px`; ghost.style.left = `${x}px`; ghost.style.top = `${y}px`; });
    if (!autoplay) { ghost.remove(); el.classList.remove("lifted"); break; }
    keys.ctrl.classList.add("down"); keys.cmd.classList.add("down");
    openFly(file, drop.x, drop.y);
    await sleep(350); keys.ctrl.classList.remove("down"); keys.cmd.classList.remove("down");
    const sp = open.spots.find(x => x.t.id === id);
    await move({ x: open.left + sp.x, y: open.top + sp.y }, 800);
    ghost.style.left = `${pos.x}px`; ghost.style.top = `${pos.y}px`;
    hover(sp); await sleep(700);
    if (!autoplay) { ghost.remove(); el.classList.remove("lifted"); break; }
    cursor.classList.remove("press"); ghost.remove(); el.classList.remove("lifted", "selected");
    await convert(sp);
    await sleep(900);
  }
}
if (autoplay) onceVisible(stage, () => sleep(600).then(demoLoop), 0.3);

// ── Bento: before / after ──
const ba = $("#ba");
let baTouched = false;
const setBA = e => { const r = ba.getBoundingClientRect(); ba.style.setProperty("--pos", `${Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100))}%`); };
ba.addEventListener("pointerdown", e => { baTouched = true; ba.setPointerCapture(e.pointerId); setBA(e); ba.onpointermove = setBA; });
ba.addEventListener("pointerup", () => (ba.onpointermove = null));
if (!reduced) onceVisible(ba, async () => { for (let i = 0; i < 3 && !baTouched; i++) {
  await tween(1400, t => !baTouched && ba.style.setProperty("--pos", `${50 + 35 * Math.sin(t * Math.PI * 2)}%`)); } });

// ── Bento: smaller ──
const meter = $("#meter");
const runMeter = () => tween(reduced ? 10 : 1800, t => { $("#meter-num").textContent = (48.2 - (48.2 - 6.1) * t).toFixed(1); $("#meter-bar").style.width = `${100 - 87 * t}%`; });
onceVisible(meter, runMeter);
meter.closest(".card").addEventListener("mouseenter", runMeter);

// ── Bento: text behind ──
const words = $("#tb-words"), tbBox = $("#tb");
let tbStyle = "chunky";
function fitWords() {
  words.className = `words ${tbStyle}`;
  const text = $("#tb-input").value.trim() || "NABI";
  words.textContent = tbStyle === "script" ? text : text.toUpperCase();
  words.style.fontSize = "100px";
  const w = words.scrollWidth || 1;
  words.style.fontSize = `${Math.min((tbBox.clientWidth * 0.96 / w) * 100, tbBox.clientHeight * 0.58)}px`;
}
$("#tb-input").addEventListener("input", fitWords);
$$(".chip-btn").forEach(b => b.addEventListener("click", () => { tbStyle = b.dataset.style; $$(".chip-btn").forEach(x => x.classList.toggle("on", x === b)); fitWords(); }));
document.fonts.ready.then(fitWords);
new ResizeObserver(fitWords).observe(tbBox);

// ── Bento: markdown typing ──
const MD = `# Release notes ♡\n\nNabi is a **cute** converter.\n\n## What's new\n\n- Background cut-outs\n- Text behind you\n- \`⌃⌘\` anywhere\n\n| From | To  |\n| HEIC | JPG |\n| MOV  | GIF |`;
onceVisible($("#md"), async () => {
  const pre = $("#md-src"), blocks = $$("#md-page > *");
  for (let i = 0; i <= MD.length; i++) {
    const typed = MD.slice(0, i), line = typed.split("\n").length - 1;
    pre.innerHTML = typed.replace(/&/g, "&amp;").replace(/</g, "&lt;") + '<span class="caret"></span>';
    blocks.forEach(b => b.classList.toggle("hidden", line < +b.dataset.at));
    if (!reduced) await sleep(MD[i] === "\n" ? 120 : 22);
  }
});

// ── Bento: copy text ──
onceVisible($("#ocr"), async () => {
  const lines = ["Shopping list ♡", "Strawberries — 2 boxes", "Oat milk · Stickers", "Total: $18.40"];
  for (const l of lines) { await sleep(reduced ? 0 : 650); $("#ocr").innerHTML += `${l}<br>`; }
});

// ── Bento: formats ──
const A = ["HEIC → JPG", "PDF → Word", "MOV → GIF", "Video → Subtitles", "MP4 → MP3", "16:9 → 9:16", "PDF → Pages", "Markdown → PDF", "Scan → Searchable", "PNG → WEBP", "Photo → Cutout", "Video → Smaller"];
const B = ["JPG", "PNG", "HEIC", "WEBP", "TIFF", "GIF", "PDF", "MP4", "MOV", "HEVC", "WEBM", "MKV", "MP3", "M4A", "WAV", "FLAC", "OGG", "DOCX", "RTF", "ODT", "MD", "HTML", "EPUB", "TXT"];
const fill = (el, items) => (el.innerHTML = [...items, ...items].map((x, i) => `<span class="${i % 4 === 0 ? "hl" : ""}">${x}</span>`).join(""));
fill($("#row-a"), A); fill($("#row-b"), B);

// ── Frozen states for screenshots: #shot=open, #shot=video, #shot=working ──
const shot = new URLSearchParams(location.hash.slice(1)).get("shot");
if (shot) {
  stopAutoplay();
  document.documentElement.style.scrollBehavior = "auto";
  $$("[data-reveal]").forEach(el => { el.style.transition = "none"; el.classList.add("in"); });
  fly.style.transition = "none";
  const video = shot === "video";
  openFly(FILES[video ? 1 : 0], 790, 360);
  hover(open.spots.find(sp => sp.t.id === (video ? "gif" : "jpg")));
  if (shot === "working") {
    open.spots.forEach(sp => (sp.el.style.opacity = 0));
    fly.className = "bfly shown"; ring.classList.add("on");
    ringP.style.strokeDashoffset = circ * 0.38; bubble.textContent = "Converting… 62%";
    wingL.style.transform = "rotateY(-42deg)"; wingR.style.transform = "rotateY(42deg)";
  }
}
