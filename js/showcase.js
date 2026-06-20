/* =============================================================================
   SHOWCASE — "from markup to interface"
   The gallery cycles through FINISHED interfaces. Every transition is a 3x3
   "tic-tac-toe" block wipe whose revealed region crossfades through the build
   layers — hand-written code → raw browser default → the finished slide — so
   each wipe literally shows code becoming the site. Each block's leading edge
   is lit by an electric gradient scanline (earth00's keyword-decode) and the
   incoming pixels hologram-flicker in (earth00's 3D-vector boot-up).
   Hand-coded Canvas2D. No dependencies.
   ========================================================================== */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // finished interfaces (missing files are skipped gracefully)
  var GALLERY = [
    { src: "assets/img/showcase/p-final.jpg", label: "this very page",          sub: "hand-coded — no framework, no build" },
    { src: "assets/img/showcase/wtf-home.jpg",label: "wearthefuture.com",        sub: "the storefront" },
    { src: "assets/img/showcase/wtf-shop.jpg",label: "wearthefuture.com / shop", sub: "the collections" },
    { src: "assets/img/showcase/wtf-admin.jpg",label: "showroom inventory",      sub: "the operator dashboard I built" },
    { src: "assets/img/showcase/wtf-press.jpg",label: "earned media",           sub: "press, valued & tied to each loan" },
    { src: "assets/img/showcase/e-globe.jpg", label: "earth00",                 sub: "the 3D news globe" },
    { src: "assets/img/showcase/e-feed.jpg",  label: "earth00 / threads",        sub: "the news feed" },
    { src: "assets/img/showcase/e-keyword.jpg",label: "earth00 / keyword intelligence", sub: "the electric decode" },
    { src: "assets/img/showcase/e-vector.jpg",label: "earth00 / vector lab",     sub: "3D hologram boot-up" }
  ];
  // build layers glimpsed during every wipe
  var LAYER_SRC = { code: "assets/img/showcase/p-code.jpg", raw: "assets/img/showcase/p-raw.jpg" };

  var CLAY = "206,95,68", AMBER = "246,162,58", HOT = "255,240,214";
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function easeInOut(x) { return x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }

  function init(root) {
    var canvas = root.querySelector("canvas");
    var capLabel = root.querySelector("[data-cap-label]");
    var capSub = root.querySelector("[data-cap-sub]");
    var dotsWrap = root.querySelector("[data-dots]");
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0;
    var CODE = null, RAW = null;

    // ---- load gallery + build layers ----
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
    function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }

    function start() {
      slides = GALLERY.filter(function (s) { return s.img; });
      if (!slides.length) return;
      buildDots(); resize();
      window.addEventListener("resize", resize);
      setCaption(0, true);
      cur = 0; nxt = 0; phase = "hold";
      var frz = (location.search.match(/[?&]frz=([0-9.]+)/) || [])[1];   // dev: freeze a wipe
      if (frz !== undefined && slides.length > 1) { draw(slides[0], slides[1], parseFloat(frz)); return; }
      draw(slides[0], slides[0], 0);                 // immediate first frame
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
      if (!img || alpha <= 0) return;
      var iw = img.naturalWidth, ih = img.naturalHeight;
      var sc = Math.max(W / iw, H / ih);
      var dw = iw * sc, dh = ih * sc;
      var dx = (W - dw) / 2 + (jx || 0), dy = (H - dh) / 2 + (jy || 0);
      ctx.save();
      ctx.beginPath(); ctx.rect(clipX, clipY, clipW, clipH); ctx.clip();
      ctx.globalAlpha = alpha < 1 ? alpha : 1;
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore(); ctx.globalAlpha = 1;
    }

    var HOLD = 2700, TRANS = 1150, GRID = 3;

    function loop() {
      if (!running) { cancelAnimationFrame(raf); return; }
      var t = now() - t0;
      if (phase === "hold") {
        draw(slides[cur], slides[cur], 0);
        if (t >= HOLD && slides.length > 1) { nxt = (cur + 1) % slides.length; phase = "trans"; t0 = now(); setCaption(nxt); }
      } else {
        var p = clamp01(t / TRANS);
        draw(slides[cur], slides[nxt], easeInOut(p));
        if (t >= TRANS) { cur = nxt; phase = "hold"; t0 = now(); markDot(cur); }
      }
      raf = requestAnimationFrame(loop);
    }

    // ---- the transition: block wipe, revealed region crossfades code -> raw -> finished ----
    function draw(from, to, p) {
      var tms = now(), fi = from.img, ti = to.img;
      ctx.clearRect(0, 0, W, H);
      if (p <= 0 || from === to) { coverDraw(ti, 0, 0, W, H, 1, 0, 0); vignette(); return; }
      if (p >= 1) { coverDraw(ti, 0, 0, W, H, 1, 0, 0); vignette(); return; }

      var bw = W / GRID, bh = H / GRID;
      var dip = (Math.abs(p - 0.30) < 0.03 || Math.abs(p - 0.56) < 0.03) ? 0.6 : 1;   // glitch dips

      for (var r = 0; r < GRID; r++) {
        for (var c = 0; c < GRID; c++) {
          var i = r * GRID + c;
          var bx = c * bw, by = r * bh;
          var order = (r + c) / ((GRID - 1) * 2);
          var bp = clamp01((p - order * 0.55) / 0.45);

          coverDraw(fi, bx, by, bw, bh, 1, 0, 0);        // previous finished, underneath
          if (bp <= 0) continue;

          var horiz = ((r + c) % 2) === 0;
          var ep = easeInOut(bp);
          var jk = bp < 0.5 ? (0.5 - bp) * 7 : 0;          // holo jitter, decays
          var jx = Math.sin(tms * 0.035 + i) * jk, jy = Math.cos(tms * 0.04 + i) * jk;
          var flick = bp < 0.45 ? (0.5 + 0.5 * (0.5 + 0.5 * Math.sin(tms * 0.045 + i * 1.7))) : 1;
          var a = clamp01(flick * dip);

          var rx = bx, ry = by, rw = bw, rh = bh, edge;
          if (horiz) { rw = bw * ep; edge = bx + rw; } else { rh = bh * ep; edge = by + rh; }
          if (rw > 0.5 && rh > 0.5) {
            // crossfade: code (early) -> raw (mid) -> finished (late), over the finished base
            coverDraw(ti, rx, ry, rw, rh, a, jx, jy);
            var wRaw = clamp01(1 - Math.abs(bp - 0.46) / 0.30) * clamp01((0.74 - bp) / 0.18);
            var wCode = clamp01(1 - Math.abs(bp - 0.16) / 0.24);
            coverDraw(RAW, rx, ry, rw, rh, a * wRaw, jx, jy);
            coverDraw(CODE, rx, ry, rw, rh, a * wCode, jx, jy);
          }

          if (bp > 0.82) {                                  // glow bloom as it resolves
            ctx.save(); ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
            ctx.globalAlpha = (1 - (bp - 0.82) / 0.18) * 0.14;
            ctx.fillStyle = "rgba(" + AMBER + ",1)"; ctx.fillRect(bx, by, bw, bh);
            ctx.restore(); ctx.globalAlpha = 1;
          }
          if (bp < 0.999) drawEdge(horiz, bx, by, bw, bh, edge);
        }
      }
      vignette();
    }

    function drawEdge(horiz, bx, by, bw, bh, pos) {
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

    function vignette() {
      var g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(8,7,6,0.5)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }

    var capT = 0;
    function setCaption(i, instant) {
      if (!capLabel) return;
      var s = slides[i];
      var apply = function () { capLabel.textContent = s.label; if (capSub) capSub.textContent = s.sub; root.classList.remove("cap-out"); };
      if (instant) apply();
      else { root.classList.add("cap-out"); clearTimeout(capT); capT = setTimeout(apply, 240); }
    }
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
