/* =============================================================================
   SHOWCASE — "from markup to interface"
   The gallery cycles FINISHED interfaces, and every transition briefly exposes
   what's underneath — the real code (VS Code) or the bare, unstyled HTML,
   alternating each time. The transitions themselves rotate through four
   choreographies borrowed from earth00's vector_3d panel materialize studies:

     holo      hologram boot-up — slices glitch-flicker in under a scanline
     grid      3x3 tic-tac-toe wipe — a thin band peeks through at each seam
     assemble  point-cloud collapse — the interface dissolves to the code
               beneath, then tiles fly back in and land inside-out
     sweep     diagonal wavefront — granular cells resolve corner-to-corner
               behind a hot glowing front

   Hand-coded Canvas2D. No libraries.
   ========================================================================== */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var GALLERY = [
    { src: "assets/img/showcase/p-final.jpg",           label: "this very page",                 sub: "hand-coded — no framework, no build" },
    { src: "assets/img/storefronts/bealice-home.jpg",   label: "bealice.com",                    sub: "the handbag label I designed" },
    { src: "assets/img/storefronts/bealice-shop.jpg",   label: "bealice.com / shop all",         sub: "high fashion, Minnesota-born" },
    { src: "assets/img/storefronts/wtf-home.jpg",       label: "wear-thefuture.com",             sub: "the showroom's storefront" },
    { src: "assets/img/showcase/wtf-admin.jpg",         label: "showroom inventory",             sub: "the operator dashboard I built" },
    { src: "assets/img/showcase/wtf-press.jpg",         label: "earned media",                   sub: "press, valued & tied to each loan" },
    { src: "assets/img/showcase/e-globe.jpg",           label: "earth00",                        sub: "the 3D news globe" },
    { src: "assets/img/showcase/e-feed.jpg",            label: "earth00 / threads",              sub: "the news feed" },
    { src: "assets/img/showcase/e-keyword.jpg",         label: "earth00 / keyword intelligence", sub: "the electric decode" },
    { src: "assets/img/showcase/e-vector.jpg",          label: "earth00 / vector lab",           sub: "3D hologram boot-up" }
  ];
  var LAYER_SRC = { code: "assets/img/showcase/p-vscode.jpg", raw: "assets/img/showcase/p-raw.jpg" };

  var CLAY = "206,95,68", AMBER = "246,162,58", HOT = "255,240,214";
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function easeInOut(x) { return x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
  function smooth(x) { x = clamp01(x); return x * x * (3 - 2 * x); }
  function eob(x) { var c1 = 1.10, c3 = c1 + 1; x = clamp01(x); return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }

  function init(root) {
    var canvas = root.querySelector("canvas");
    var capLabel = root.querySelector("[data-cap-label]");
    var capSub = root.querySelector("[data-cap-sub]");
    var dotsWrap = root.querySelector("[data-dots]");
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0, CODE = null, RAW = null;

    var pending = GALLERY.length + 2;
    GALLERY.forEach(function (s) {
      var img = new Image(); img.decoding = "async";
      img.onload = function () { s.img = img; settle(); };
      img.onerror = function () { settle(); };
      img.src = s.src;
    });
    loadLayer(LAYER_SRC.code, function (im) { CODE = im; });
    loadLayer(LAYER_SRC.raw, function (im) { RAW = im; });
    function loadLayer(src, set) {
      var img = new Image(); img.decoding = "async";
      img.onload = function () { set(img); settle(); };
      img.onerror = function () { settle(); };
      img.src = src;
    }
    function settle() { if (--pending === 0) start(); }

    var slides = [], cur = 0, nxt = 0, phase = "hold", t0 = 0, raf = 0, running = false;
    var tcount = 0, underImg = null;
    function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }

    /* transition styles rotate; the under-layer alternates code <-> bare html */
    var STYLES = ["holo", "grid", "assemble", "sweep"];
    var DUR = { holo: 1700, grid: 2000, assemble: 2400, sweep: 1700 };
    var style = "holo";

    function start() {
      slides = GALLERY.filter(function (s) { return s.img; });
      if (!slides.length) return;
      buildDots(); resize();
      window.addEventListener("resize", resize);
      setCaption(0, true);
      cur = 0; nxt = 0; phase = "hold";
      var frz = (location.search.match(/[?&]frz=([0-9.]+)/) || [])[1];
      if (frz !== undefined && slides.length > 1) {
        underImg = /u=code/.test(location.search) ? CODE : RAW;
        var st = (location.search.match(/[?&]st=(\w+)/) || [])[1];
        if (st && STYLES.indexOf(st) !== -1) style = st;
        draw(slides[0], slides[1], parseFloat(frz)); return;
      }
      draw(slides[0], slides[0], 0);
      if (reduce) return;
      running = true; t0 = now(); raf = requestAnimationFrame(loop);
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (es) {
          es.forEach(function (e) {
            if (e.isIntersecting) { if (!running) { running = true; t0 = now(); raf = requestAnimationFrame(loop); } }
            else { running = false; }
          });
        }, { threshold: 0 }).observe(canvas);
      }
    }

    function resize() {
      var r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (slides.length) draw(slides[cur] || slides[0], slides[cur] || slides[0], 0);
    }

    function coverDraw(img, clipX, clipY, clipW, clipH, alpha, jx, jy) {
      if (!img || alpha <= 0 || clipW <= 0 || clipH <= 0) return;
      var iw = img.naturalWidth, ih = img.naturalHeight;
      var sc = Math.max(W / iw, H / ih), dw = iw * sc, dh = ih * sc;
      var dx = (W - dw) / 2 + (jx || 0), dy = (H - dh) / 2 + (jy || 0);
      ctx.save();
      ctx.beginPath(); ctx.rect(clipX, clipY, clipW, clipH); ctx.clip();
      ctx.globalAlpha = alpha < 1 ? alpha : 1;
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore(); ctx.globalAlpha = 1;
    }

    var HOLD = 2600;

    function loop() {
      if (!running) { cancelAnimationFrame(raf); return; }
      var t = now() - t0;
      if (phase === "hold") {
        draw(slides[cur], slides[cur], 0);
        if (t >= HOLD && slides.length > 1) {
          nxt = (cur + 1) % slides.length; phase = "trans"; t0 = now();
          underImg = (CODE && tcount % 2 === 0) ? CODE : RAW;      // alternate code <-> bare html
          style = STYLES[tcount % STYLES.length];                   // alternate the choreography too
          tcount++;
          setCaption(nxt);
        }
      } else {
        var p = clamp01(t / (DUR[style] || 2000));
        draw(slides[cur], slides[nxt], p);
        if (t >= (DUR[style] || 2000)) { cur = nxt; phase = "hold"; t0 = now(); markDot(cur); }
      }
      raf = requestAnimationFrame(loop);
    }

    function draw(from, to, p) {
      var tms = now(), fi = from.img, ti = to.img, under = underImg || RAW || CODE;
      ctx.clearRect(0, 0, W, H);
      if (p <= 0 || from === to) { coverDraw(fi, 0, 0, W, H, 1, 0, 0); vignette(); return; }
      if (p >= 1) { coverDraw(ti, 0, 0, W, H, 1, 0, 0); vignette(); return; }
      if (style === "holo") drawHolo(fi, ti, under, p, tms);
      else if (style === "assemble") drawAssemble(fi, ti, under, p, tms);
      else if (style === "sweep") drawSweep(fi, ti, under, p, tms);
      else drawGrid(fi, ti, under, p, tms);
      vignette();
    }

    /* ---- GRID — the 3x3 tic-tac-toe wipe (with the under-layer seam peek) - */
    var GRID_N = 3, PEEK = 0.17;
    function drawGrid(fi, ti, under, p, tms) {
      var wp = easeInOut(p), bw = W / GRID_N, bh = H / GRID_N;
      for (var r = 0; r < GRID_N; r++) {
        for (var c = 0; c < GRID_N; c++) {
          var i = r * GRID_N + c, bx = c * bw, by = r * bh;
          var order = (r + c) / ((GRID_N - 1) * 2);
          var bp = clamp01((wp - order * 0.28) / 0.72);
          coverDraw(fi, bx, by, bw, bh, 1, 0, 0);
          if (bp <= 0) continue;
          var horiz = ((r + c) % 2) === 0;
          var jk = bp < 0.5 ? (0.5 - bp) * 6 : 0;
          var jx = Math.sin(tms * 0.035 + i) * jk, jy = Math.cos(tms * 0.04 + i) * jk;
          var flick = bp < 0.4 ? (0.55 + 0.45 * (0.5 + 0.5 * Math.sin(tms * 0.045 + i * 1.7))) : 1;
          var a = clamp01(flick);
          var rw = bw, rh = bh, edge;
          if (horiz) { rw = bw * bp; edge = bx + rw; } else { rh = bh * bp; edge = by + rh; }
          if (rw > 0.5 && rh > 0.5) {
            coverDraw(ti, bx, by, rw, rh, a, jx, jy);
            var band = (horiz ? bw : bh) * PEEK * clamp01(bp / 0.10) * clamp01((1 - bp) / 0.14);
            if (band > 1) {
              if (horiz) { var bs = Math.max(bx, edge - band); coverDraw(under, bs, by, edge - bs, rh, a, jx, jy); }
              else { var bs2 = Math.max(by, edge - band); coverDraw(under, bx, bs2, rw, edge - bs2, a, jx, jy); }
            }
          }
          if (bp < 0.999) seamGlow(horiz, bx, by, bw, bh, edge);
        }
      }
    }

    function seamGlow(horiz, bx, by, bw, bh, pos) {
      ctx.save();
      ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
      ctx.shadowColor = "rgba(" + CLAY + ",0.9)"; ctx.shadowBlur = 22;
      var thick = 3, trail = 28;
      if (horiz) {
        var g = ctx.createLinearGradient(pos - trail, 0, pos, 0);
        g.addColorStop(0, "rgba(" + CLAY + ",0)"); g.addColorStop(1, "rgba(" + AMBER + ",0.24)");
        ctx.fillStyle = g; ctx.fillRect(pos - trail, by, trail, bh);
        var lg = ctx.createLinearGradient(0, by, 0, by + bh);
        lg.addColorStop(0, "rgba(" + HOT + ",0)"); lg.addColorStop(.5, "rgba(" + HOT + ",0.95)"); lg.addColorStop(1, "rgba(" + HOT + ",0)");
        ctx.fillStyle = lg; ctx.fillRect(pos - thick / 2, by, thick, bh);
      } else {
        var g2 = ctx.createLinearGradient(0, pos - trail, 0, pos);
        g2.addColorStop(0, "rgba(" + CLAY + ",0)"); g2.addColorStop(1, "rgba(" + AMBER + ",0.24)");
        ctx.fillStyle = g2; ctx.fillRect(bx, pos - trail, bw, trail);
        var lg2 = ctx.createLinearGradient(bx, 0, bx + bw, 0);
        lg2.addColorStop(0, "rgba(" + HOT + ",0)"); lg2.addColorStop(.5, "rgba(" + HOT + ",0.95)"); lg2.addColorStop(1, "rgba(" + HOT + ",0)");
        ctx.fillStyle = lg2; ctx.fillRect(bx, pos - thick / 2, bw, thick);
      }
      ctx.restore();
    }

    /* ---- HOLO — hologram boot-up (vector_3d "holo" study) ------------------
       The old interface drops out; the next one glitch-flickers in as slices
       under a sweeping scanline, dips twice to the layer beneath, then blooms
       stable. */
    var HOLO_SLICES = 24, holoApp = [], holoSeed = [];
    for (var hs = 0; hs < HOLO_SLICES; hs++) {
      // deterministic pseudo-random appearance thresholds, like L.app in the demo
      var v = Math.sin(hs * 127.1) * 43758.5453; v = v - Math.floor(v);
      holoApp.push(0.06 + v * 0.5);
      var v2 = Math.sin(hs * 311.7) * 12543.85; v2 = v2 - Math.floor(v2);
      holoSeed.push(v2 * 6.28);
    }
    function drawHolo(fi, ti, under, p, tms) {
      ctx.fillStyle = "#0a0908"; ctx.fillRect(0, 0, W, H);
      coverDraw(under, 0, 0, W, H, 0.20, 0, 0);                    // the layer beneath, faint
      coverDraw(fi, 0, 0, W, H, 1 - smooth(p / 0.14), 0, 0);       // old interface cuts out fast
      var sh = H / HOLO_SLICES;
      var dip = (Math.abs(p - 0.30) < 0.03 || Math.abs(p - 0.55) < 0.03) ? 0.3 : 1;
      for (var i = 0; i < HOLO_SLICES; i++) {
        var app = holoApp[i];
        if (p < app) continue;
        var since = p - app;
        var flick = since < 0.18 ? (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(tms * 0.07 + holoSeed[i]))) : 1;
        var k = since < 0.22 ? (0.22 - since) * 26 : 0;            // jitter dies as the slice stabilises
        var jx = Math.sin(tms * 0.09 + holoSeed[i]) * k;
        var a = clamp01(flick * dip);
        if (a < 0.42) coverDraw(under, 0, i * sh, W, sh + 1, 0.85, jx * 0.4, 0);  // dropout shows the code
        else coverDraw(ti, 0, i * sh, W, sh + 1, a, jx, 0);
      }
      // scanline sweep
      var sy = ((p * 2.2) % 1) * (H + 60) - 30;
      var g = ctx.createLinearGradient(0, sy - 26, 0, sy + 26);
      g.addColorStop(0, "rgba(" + AMBER + ",0)"); g.addColorStop(.5, "rgba(" + HOT + ",0.34)"); g.addColorStop(1, "rgba(" + AMBER + ",0)");
      ctx.fillStyle = g; ctx.fillRect(0, sy - 26, W, 52);
      // final bloom-resolve
      if (p > 0.84) {
        var bl = (1 - (p - 0.84) / 0.16) * 0.16;
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = "rgba(" + HOT + "," + bl.toFixed(3) + ")";
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = "source-over";
      }
    }

    /* ---- ASSEMBLE — point-cloud collapse (vector_3d "cloud" study) ---------
       The interface dissolves to the code beneath, holds a beat, then tiles of
       the next interface fly in radially and land inside-out, covering it. */
    var AS_C = 6, AS_R = 4, asOrder = null;
    function asPrep() {
      asOrder = [];
      var cx = (AS_C - 1) / 2, cy = (AS_R - 1) / 2, maxD = Math.hypot(cx, cy);
      for (var r = 0; r < AS_R; r++) for (var c = 0; c < AS_C; c++) {
        var d = Math.hypot(c - cx, r - cy) / maxD;
        var v = Math.sin((r * AS_C + c) * 91.3) * 4172.33; v = v - Math.floor(v);
        asOrder.push({ c: c, r: r, land: 0.30 + d * 0.42 + v * 0.06, dirx: (c - cx), diry: (r - cy), rnd: v });
      }
      asOrder.forEach(function (t) {
        var m = Math.hypot(t.dirx, t.diry) || 1;
        t.dirx = t.dirx / m; t.diry = t.diry / m;
        if (m < 0.01) { t.dirx = 0; t.diry = -1; }
      });
    }
    function drawAssemble(fi, ti, under, p, tms) {
      if (!asOrder) asPrep();
      coverDraw(under, 0, 0, W, H, 1, 0, 0);                       // the code, fully revealed
      coverDraw(fi, 0, 0, W, H, 1 - smooth(p / 0.16), 0, 0);       // old interface dissolves away
      var bw = W / AS_C, bh = H / AS_R, D = Math.hypot(W, H) * 0.5;
      for (var i = 0; i < asOrder.length; i++) {
        var t = asOrder[i];
        var d = clamp01((p - t.land) / 0.26);
        if (d <= 0) continue;
        var e = eob(d);
        var off = (1 - e) * D;
        var ox = t.dirx * off, oy = t.diry * off;
        var a = smooth(d / 0.3);
        coverDraw(ti, t.c * bw + ox, t.r * bh + oy, bw + 0.5, bh + 0.5, a, ox, oy);
        if (d > 0.2 && d < 0.9) {                                  // hot rim as each tile lands
          ctx.save();
          ctx.strokeStyle = "rgba(" + AMBER + "," + (0.5 * (1 - d)).toFixed(3) + ")";
          ctx.lineWidth = 1.2;
          ctx.strokeRect(t.c * bw + ox + 0.5, t.r * bh + oy + 0.5, bw - 1, bh - 1);
          ctx.restore();
        }
      }
    }

    /* ---- SWEEP — diagonal wavefront (vector_3d "diag" study) ---------------
       A granular front moves corner-to-corner; right at the front each cell
       flashes the layer beneath before resolving into the next interface. */
    var SW_C = 12, SW_R = 8;
    function drawSweep(fi, ti, under, p, tms) {
      coverDraw(fi, 0, 0, W, H, 1, 0, 0);
      var bw = W / SW_C, bh = H / SW_R, front = p * 1.32;
      for (var r = 0; r < SW_R; r++) {
        for (var c = 0; c < SW_C; c++) {
          var th = (c + r) / (SW_C + SW_R - 2) * 0.9;
          var local = clamp01((front - th) / 0.22);
          if (local <= 0) continue;
          var bx = c * bw, by = r * bh;
          if (local < 0.3) coverDraw(under, bx, by, bw + 0.5, bh + 0.5, smooth(local / 0.3) * 0.95, 0, 0);
          else coverDraw(ti, bx, by, bw + 0.5, bh + 0.5, smooth((local - 0.3) / 0.35), 0, 0);
          if (local < 0.35) {                                      // hot granular front
            ctx.fillStyle = "rgba(" + AMBER + "," + (0.22 * (1 - local / 0.35)).toFixed(3) + ")";
            ctx.fillRect(bx, by, bw + 0.5, bh + 0.5);
          }
        }
      }
      // glowing diagonal seam
      var g = ctx.createLinearGradient(0, 0, W, H);
      var fpos = clamp01(front / 1.12);
      g.addColorStop(Math.max(0, fpos - 0.07), "rgba(" + HOT + ",0)");
      g.addColorStop(fpos, "rgba(" + HOT + "," + (0.5 * Math.sin(Math.PI * clamp01(p)) + 0.2).toFixed(3) + ")");
      g.addColorStop(Math.min(1, fpos + 0.012), "rgba(" + HOT + ",0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }

    function vignette() {
      var g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(8,7,6,0.5)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }

    var capT = 0;
    function _setCap(label, sub, instant) {
      if (!capLabel) return;
      var apply = function () { capLabel.textContent = label; if (capSub) capSub.textContent = sub; root.classList.remove("cap-out"); };
      if (instant) apply();
      else { root.classList.add("cap-out"); clearTimeout(capT); capT = setTimeout(apply, 240); }
    }
    function setCaption(i, instant) { var s = slides[i]; _setCap(s.label, s.sub, instant); }
    function buildDots() {
      if (!dotsWrap) return; dotsWrap.innerHTML = "";
      slides.forEach(function (_, i) { var d = document.createElement("span"); d.className = "sc-dot" + (i === 0 ? " on" : ""); dotsWrap.appendChild(d); });
    }
    function markDot(i) {
      if (!dotsWrap) return; var ds = dotsWrap.children;
      for (var k = 0; k < ds.length; k++) ds[k].className = "sc-dot" + (k === i ? " on" : "");
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    var el = document.querySelector("[data-showcase]");
    if (el) init(el);
  });
})();
