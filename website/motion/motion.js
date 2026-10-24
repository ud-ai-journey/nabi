// Motion for the landing page: smooth scrolling, the companion butterfly, sparkles, the pinned "how it works"
// story, split-text entrances, the scroll-speed band, tilt and magnetic buttons. Uses GSAP + ScrollTrigger + Lenis;
// does nothing when they didn't load or when the visitor prefers reduced motion.
(() => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || !window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const finePointer = matchMedia("(pointer: fine)").matches;
  const shot = new URLSearchParams(location.hash.slice(1)).get("shot");

  // Elements animated here leave the simple CSS reveal, so its transitions don't fight GSAP.
  $$(".bento .card, .catalog .cat, .places, .steps, .film-frame, .cta .mark").forEach(el => { el.removeAttribute("data-reveal"); el.style.transitionDelay = "0s"; });

  // ── Smooth scroll ──
  let velocity = 0;
  if (window.Lenis && !shot) {
    const lenis = new Lenis({ lerp: 0.1, anchors: true });
    lenis.on("scroll", e => { velocity = e.velocity; ScrollTrigger.update(); });
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    let last = scrollY;
    addEventListener("scroll", () => { velocity = scrollY - last; last = scrollY; }, { passive: true });
  }

  // ── Scroll progress line ──
  gsap.to("#progress", { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });

  // ── One canvas for sparkles, hearts and the butterfly's trail ──
  const fx = $("#fx"), ctx = fx.getContext("2d");
  const dpr = Math.min(2, devicePixelRatio || 1);
  const size = () => { fx.width = innerWidth * dpr; fx.height = innerHeight * dpr; };
  size(); addEventListener("resize", size);
  const parts = [];
  const COLORS = ["#ffb4d5", "#ff7eb6", "#b9a3ff", "#9cc2ff", "#ffffff"];
  const spawn = (x, y, o = {}) => parts.push({
    x, y, vx: o.vx ?? (Math.random() - 0.5) * 1.2, vy: o.vy ?? -Math.random() * 1.2 - 0.3,
    life: 0, max: o.max ?? 50 + Math.random() * 30, r: o.r ?? 2 + Math.random() * 3.5,
    heart: o.heart ?? Math.random() < 0.25, c: COLORS[(Math.random() * COLORS.length) | 0], g: o.g ?? 0.012, spin: Math.random() * 6,
  });
  const drawHeart = (x, y, r) => {
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.9);
    ctx.bezierCurveTo(x - r * 2, y - r * 0.4, x - r * 0.9, y - r * 1.8, x, y - r * 0.6);
    ctx.bezierCurveTo(x + r * 0.9, y - r * 1.8, x + r * 2, y - r * 0.4, x, y + r * 0.9);
    ctx.fill();
  };
  const drawStar = (x, y, r, a) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.beginPath();
    for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.lineTo(0, -r * 2.2); ctx.lineTo(r * 0.45, -r * 0.45); }
    ctx.closePath(); ctx.fill(); ctx.restore();
  };
  gsap.ticker.add(() => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life++; p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= 0.985;
      const k = 1 - p.life / p.max;
      if (k <= 0) { parts.splice(i, 1); continue; }
      ctx.globalAlpha = k; ctx.fillStyle = p.c;
      p.heart ? drawHeart(p.x, p.y, p.r * (0.6 + k * 0.4)) : drawStar(p.x, p.y, p.r * k, p.spin + p.life * 0.05);
    }
    ctx.globalAlpha = 1;
  });
  // A soft sparkle trail behind the cursor.
  if (finePointer) {
    let lastSpawn = 0;
    addEventListener("pointermove", e => {
      const now = performance.now();
      if (now - lastSpawn < 28) return;
      lastSpawn = now;
      spawn(e.clientX, e.clientY, { r: 1.4 + Math.random() * 2, max: 34 + Math.random() * 20 });
    }, { passive: true });
  }
  // Hearts burst out of the download buttons.
  $$("[data-download]").forEach(btn => btn.addEventListener("click", () => {
    const r = btn.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (let i = 0; i < 46; i++) {
      const a = Math.random() * Math.PI * 2, v = 3 + Math.random() * 7;
      spawn(cx, cy, { vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, r: 4 + Math.random() * 5, heart: Math.random() < 0.6, max: 70 + Math.random() * 40, g: 0.16 });
    }
  }));

  // ── Hero: letters assemble, dust drifts away from the cursor ──
  const title = $("#hero-title");
  if (title) {
    const chars = [];
    [...title.childNodes].forEach(node => {
      if (node.nodeType === 3) {
        const frag = document.createDocumentFragment();
        [...node.textContent].forEach(c => {
          if (c === " ") { frag.append(" "); return; }
          const s = document.createElement("span"); s.className = "ch"; s.textContent = c; frag.append(s); chars.push(s);
        });
        node.replaceWith(frag);
      } else if (node.nodeName === "EM") {
        node.classList.add("ch"); chars.push(node);
      }
    });
    gsap.from(chars, { yPercent: 70, rotate: () => gsap.utils.random(-14, 14), opacity: 0, filter: "blur(12px)", duration: 1.2, ease: "expo.out", stagger: 0.035, delay: 0.15 });
    // The flutter word keeps a gentle bob.
    gsap.to(title.querySelector("em"), { y: -6, duration: 2.2, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 1.6 });
  }
  const dust = $("#dust");
  if (dust) {
    const d = dust.getContext("2d");
    let w, h, mx = -999, my = -999;
    const resize = () => { w = dust.width = dust.offsetWidth * dpr; h = dust.height = dust.offsetHeight * dpr; };
    resize(); addEventListener("resize", resize);
    dust.parentElement.addEventListener("pointermove", e => { const r = dust.getBoundingClientRect(); mx = (e.clientX - r.left) * dpr; my = (e.clientY - r.top) * dpr; });
    const motes = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), z: 0.3 + Math.random() * 0.7, ox: 0, oy: 0, t: Math.random() * 10 }));
    gsap.ticker.add(() => {
      if (!w) return;
      d.clearRect(0, 0, w, h);
      for (const m of motes) {
        m.t += 0.004 * m.z; m.y -= 0.00035 * m.z; if (m.y < -0.05) m.y = 1.05;
        let x = (m.x + Math.sin(m.t) * 0.02) * w, y = m.y * h;
        const dx = x - mx, dy = y - my, dist = Math.hypot(dx, dy);
        if (dist < 140 * dpr) { m.ox += dx / dist * 2.4; m.oy += dy / dist * 2.4; }
        m.ox *= 0.94; m.oy *= 0.94; x += m.ox * dpr; y += m.oy * dpr;
        d.globalAlpha = 0.25 + m.z * 0.5;
        d.fillStyle = m.z > 0.75 ? "#ffb4d5" : "#b9a3ff";
        d.beginPath(); d.arc(x, y, m.z * 1.8 * dpr, 0, Math.PI * 2); d.fill();
      }
    });
  }

  // ── Section titles rise in, word by word ──
  $$(".section-head h2, .cta h2").forEach(h2 => {
    const words = [];
    const wrap = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(part); return; }
            const line = document.createElement("span"); line.className = "wl";
            const w = document.createElement("span"); w.className = "w"; w.textContent = part;
            line.append(w); frag.append(line); words.push(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.classList.contains("grad")) {
          // Gradient text can't be split (each piece would lose the gradient), so it rises as one.
          const line = document.createElement("span"); line.className = "wl";
          const w = document.createElement("span"); w.className = "w";
          n.replaceWith(line); w.append(n); line.append(w); words.push(w);
        } else if (n.nodeType === 1 && !["KBD", "BR"].includes(n.nodeName) && !n.classList.contains("count")) {
          wrap(n);
        }
      });
    };
    wrap(h2);
    gsap.from(words, { yPercent: 115, rotate: 4, duration: 1, ease: "expo.out", stagger: 0.06, scrollTrigger: { trigger: h2, start: "top 86%" } });
  });
  // The "60+" rolls up.
  $$(".count").forEach(el => {
    const end = +el.dataset.count, o = { v: 0 };
    gsap.to(o, { v: end, duration: 1.6, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 85%" }, onUpdate: () => (el.textContent = Math.round(o.v)) });
  });

  // ── Cards: stagger in, tilt toward the cursor ──
  ScrollTrigger.batch(".bento .card, .catalog .cat, .places .place, .steps li", {
    start: "top 88%",
    onEnter: els => gsap.fromTo(els, { y: 60, opacity: 0, rotateX: 8 }, { y: 0, opacity: 1, rotateX: 0, duration: 1, ease: "expo.out", stagger: 0.08, overwrite: true }),
  });
  if (finePointer) {
    $$(".card, .cat").forEach(card => {
      const rx = gsap.quickTo(card, "rotationX", { duration: 0.6, ease: "power3" });
      const ry = gsap.quickTo(card, "rotationY", { duration: 0.6, ease: "power3" });
      gsap.set(card, { transformPerspective: 900 });
      card.addEventListener("pointermove", e => {
        const r = card.getBoundingClientRect();
        rx(((e.clientY - r.top) / r.height - 0.5) * -7);
        ry(((e.clientX - r.left) / r.width - 0.5) * 9);
      });
      card.addEventListener("pointerleave", () => { rx(0); ry(0); });
    });
    // Magnetic buttons.
    $$(".btn").forEach(btn => {
      const x = gsap.quickTo(btn, "x", { duration: 0.5, ease: "elastic.out(1, 0.4)" });
      const y = gsap.quickTo(btn, "y", { duration: 0.5, ease: "elastic.out(1, 0.4)" });
      btn.addEventListener("pointermove", e => {
        const r = btn.getBoundingClientRect();
        x((e.clientX - r.left - r.width / 2) * 0.28); y((e.clientY - r.top - r.height / 2) * 0.4);
      });
      btn.addEventListener("pointerleave", () => { x(0); y(0); });
    });
  }

  // ── How it works: a pinned story played by scrolling ──
  const story = $("#how");
  if (story) {
    const steps = $$(".story-step", story);
    const v = $("#story-visual"), cursor = $("#sv-cursor"), file = $("#sv-file"), fly = $("#sv-fly"), keys = $$("#sv-keys kbd");
    const jpg = $("#sv-jpg"), ghost = $("#sv-ghost"), ring = $("#sv-ring"), ringP = $("#sv-ring-p"), bubble = $("#sv-bubble"), result = $("#sv-result");
    // Points inside the visual, measured when the layout settles.
    const at = (el, fx = 0.5, fy = 0.5) => {
      const a = v.getBoundingClientRect(), b = el.getBoundingClientRect();
      return { x: b.left - a.left + b.width * fx, y: b.top - a.top + b.height * fy };
    };
    let tl;
    const build = () => {
      tl && tl.scrollTrigger && tl.scrollTrigger.kill(); tl && tl.kill();
      gsap.set(fly, { scale: 1 });
      const pFile = at(file.querySelector(".doc")), pFly = at(fly, 0.5, 0.42), pJpg = at(jpg);
      gsap.set(fly, { scale: 0 });
      gsap.set(cursor, { x: v.offsetWidth * 0.55, y: v.offsetHeight * 0.85 });
      gsap.set(ghost, { x: pFile.x - 26, y: pFile.y - 30, opacity: 0 });
      tl = gsap.timeline({
        defaults: { ease: "power2.inOut" },
        scrollTrigger: {
          trigger: story, pin: ".story-pin", start: "top top", end: "+=320%", scrub: 0.6,
          onUpdate: self => {
            const i = Math.min(3, Math.floor(self.progress * 4.0001));
            steps.forEach((s, n) => s.classList.toggle("on", n === i));
            $("#story-bar").style.transform = `scaleX(${self.progress})`;
            fly.classList.toggle("working", self.progress > 0.76 && self.progress < 0.93);
            bubble.classList.toggle("done", self.progress >= 0.93);
            bubble.textContent = self.progress >= 0.93 ? "✓ trip.jpg" : self.progress > 0.62 ? "Turn me into JPG! ♡" : "trip.heic";
          },
        },
      });
      // 1 · Select
      tl.to(cursor, { x: pFile.x, y: pFile.y, duration: 1 })
        .to(file, { backgroundColor: "rgba(10,132,255,0.32)", duration: 0.2 }, ">-0.1")
      // 2 · ⌃⌘ while dragging
        .to(ghost, { opacity: 0.92, duration: 0.2 }, ">0.2")
        .to([cursor], { x: pFly.x, y: pFly.y, duration: 1 }, "<")
        .to(ghost, { x: pFly.x - 20, y: pFly.y - 20, duration: 1 }, "<")
        .to(keys, { y: 4, backgroundColor: "rgba(255,126,182,0.3)", borderColor: "rgba(255,126,182,0.7)", boxShadow: "0 0 26px rgba(255,126,182,0.5)", duration: 0.25 }, ">-0.1")
        .to(fly, { scale: 1, duration: 0.7, ease: "back.out(1.8)" }, "<")
        .to(keys, { y: 0, backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.14)", boxShadow: "none", duration: 0.25 }, ">0.2")
      // 3 · Drop on JPG
        .to([cursor], { x: pJpg.x, y: pJpg.y, duration: 0.9 }, ">")
        .to(ghost, { x: pJpg.x - 20, y: pJpg.y - 20, duration: 0.9 }, "<")
        .to(jpg, { backgroundColor: "#db4f8c", color: "#fff", scale: 1.2, duration: 0.2 }, ">-0.15")
        .to([ghost, cursor], { opacity: 0, duration: 0.2 }, ">0.15")
      // 4 · Working, then done
        .to(ring, { opacity: 1, duration: 0.15 }, "<")
        .to(ringP, { strokeDashoffset: 0, duration: 1.2, ease: "none" }, ">")
        .to(ring, { opacity: 0, duration: 0.15 }, ">")
        .to(jpg, { backgroundColor: "#fff", color: "#db4f8c", scale: 1, duration: 0.2 }, "<")
        .to(result, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(2)" }, "<")
        .add(() => {
          if (tl.scrollTrigger && tl.scrollTrigger.direction > 0) {
            const r = fly.getBoundingClientRect();
            for (let i = 0; i < 18; i++) spawn(r.left + r.width / 2, r.top + r.height * 0.35, { vx: (Math.random() - 0.5) * 6, vy: -2 - Math.random() * 4, heart: true, r: 4 + Math.random() * 4, max: 70, g: 0.08 });
          }
        }, "<")
        .to({}, { duration: 0.6 });
    };
    build();
    ScrollTrigger.addEventListener("refreshInit", () => gsap.set(fly, { scale: 1 }));
    addEventListener("resize", () => { clearTimeout(build.t); build.t = setTimeout(() => { build(); ScrollTrigger.refresh(); }, 250); });
  }

  // ── The band: two giant rows that move with your scroll ──
  const bandA = $("#band-a"), bandB = $("#band-b");
  if (bandA && bandB) {
    const A = ["HEIC → JPG", "PDF → Word", "Subtitles", "16:9 → 9:16", "Cutout", "MOV → GIF"];
    const B = ["Blur", "Watermark", "OCR", "Smaller", "Text behind", "Lock PDF"];
    const fill = (el, items) => (el.innerHTML = [...items, ...items, ...items].map((t, i) =>
      `<span class="${["", "g", "o"][i % 3]}">${t}</span><i>✦</i>`).join(""));
    fill(bandA, A); fill(bandB, B);
    let xa = 0, xb = 0, skew = 0;
    gsap.ticker.add((_, dt) => {
      const boost = Math.min(6, Math.abs(velocity) * 0.25);
      const dir = velocity < -0.5 ? -1 : 1;
      xa -= (0.5 + boost) * dir * dt * 0.06; xb += (0.5 + boost) * dir * dt * 0.06;
      const wa = bandA.scrollWidth / 3, wb = bandB.scrollWidth / 3;
      if (xa < -wa) xa += wa; if (xa > 0) xa -= wa;
      if (xb > 0) xb -= wb; if (xb < -wb) xb += wb;
      skew += (gsap.utils.clamp(-8, 8, velocity * 0.35) - skew) * 0.1;
      bandA.style.transform = `translate3d(${xa}px,0,0) skewX(${-skew}deg)`;
      bandB.style.transform = `translate3d(${xb - wb / 2}px,0,0) skewX(${-skew}deg)`;
    });
  }

  // ── The film grows to full width as you reach it ──
  gsap.fromTo(".film-frame", { scale: 0.82, y: 60, filter: "brightness(0.6)" },
    { scale: 1, y: 0, filter: "brightness(1)", ease: "none", scrollTrigger: { trigger: "#film", start: "top 95%", end: "top 20%", scrub: 0.5 } });
  // The download mark spins in and settles.
  ScrollTrigger.create({
    trigger: ".cta", start: "top 75%", once: true,
    onEnter: () => gsap.fromTo(".cta .mark", { scale: 0.2, rotate: -40, opacity: 0 }, { scale: 1, rotate: 0, opacity: 1, duration: 1.4, ease: "elastic.out(1, 0.5)" }),
  });

  // ── The companion butterfly ──
  const buddy = $("#buddy");
  if (buddy) {
    // Which side it flies on (-1 left, 1 right) and how far down the screen, over the length of the page. It stays in
    // the margins beside the content and only crosses over between sections.
    const path = [[1, 0.2], [1, 0.32], [-1, 0.38], [-1, 0.6], [1, 0.62], [1, 0.3], [-1, 0.4], [-1, 0.66], [1, 0.3], [1, 0.22]];
    const cr = (p0, p1, p2, p3, t) => 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
    const point = u => {
      const n = path.length - 1, f = Math.min(n - 1e-6, Math.max(0, u * n)), i = Math.floor(f), t = f - i;
      const g = k => path[Math.min(n, Math.max(0, k))];
      return [0, 1].map(a => cr(g(i - 1)[a], g(i)[a], g(i + 1)[a], g(i + 2)[a], t));
    };
    let shown = false, prev = point(0), time = 0, trail = 0;
    gsap.ticker.add((t, dt) => {
      time += dt / 1000;
      const max = document.documentElement.scrollHeight - innerHeight;
      const u = max > 0 ? scrollY / max : 0;
      const margin = (innerWidth - Math.min(1180, innerWidth - 48)) / 2;
      const visible = scrollY > innerHeight * 0.55 && margin > 80;
      if (visible !== shown) { shown = visible; gsap.to(buddy, { opacity: visible ? 1 : 0, scale: visible ? 1 : 0.4, duration: 0.5, ease: "back.out(2)" }); }
      const [px, py] = point(u);
      const side = margin / 2, x = innerWidth / 2 + px * (innerWidth / 2 - side) + Math.sin(time * 1.3) * 8;
      const y = py * innerHeight + Math.sin(time * 2.1) * 10;
      const dx = x - prev[0];
      prev = [x, y];
      const speed = Math.abs(velocity);
      buddy.style.setProperty("--flap", `${Math.max(0.13, 0.5 - speed * 0.02)}s`);
      gsap.set(buddy, { x: x - buddy.offsetWidth / 2, y: y - buddy.offsetHeight / 2, rotation: gsap.utils.clamp(-25, 25, dx * 1.5) + Math.sin(time * 1.7) * 4 });
      if (shown && speed > 6 && (trail += speed) > 40) {
        trail = 0;
        spawn(x, y + 10, { heart: true, r: 3 + Math.random() * 2.5, vx: (Math.random() - 0.5) * 1.5, vy: 0.4 + Math.random(), g: -0.01, max: 55 });
      }
    });
  }

  addEventListener("load", () => ScrollTrigger.refresh());
})();
