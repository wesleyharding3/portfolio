/* =============================================================================
   SHOWCASE — "from markup to interface"
   The gallery cycles FINISHED interfaces. Every transition is a two-stage block
   wipe: first it wipes the current interface away to reveal the bare, unstyled
   HTML underneath (a quick code flash leading into it) — holds that skeleton a
   beat — then wipes the next finished interface in over it. So each transition
   reads: interface -> the naked markup -> the next interface.
   Each block's leading edge is lit by an electric gradient scanline (earth00's
   keyword-decode); incoming pixels hologram-flicker in (earth00's vector boot).
   Hand-coded Canvas2D. No dependencies.
   ========================================================================== */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
  var LAYER_SRC = { code: "assets/img/showcase/p-code.jpg", raw: "assets/img/showcase/p-raw.jpg" };
  var RAW_CAP = { label: "the bare html", sub: "what every browser shows, untouched" };

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
    function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }

    function start() {
      slides = GALLERY.filter(function (s) { return s.img; });
      if (!slides.length) return;
      buildDots(); resize();
      window.addEventListener("resize", resize);
      setCaption(0, true);
      cur = 0; nxt = 0; phase = "hold";
      var frz = (location.search.match(/[?&]frz=([0-9.]+)/) || [])[1];
      if (frz !== undefined && slides.length > 1) { draw(slides[0], slides[1], parseFloat(frz)); return; }
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
      if (!img || alpha <= 0) return;
      var iw = img.naturalWidth, ih = img.naturalHeight;
      var sc = Math.max(W / iw, H / ih), dw = iw * sc, dh = ih * sc;
      var dx = (W - dw) / 2 + (jx || 0), dy = (H - dh) / 2 + (jy || 0);
      ctx.save();
      ctx.beginPath(); ctx.rect(clipX, clipY, clipW, clipH); ctx.clip();
      ctx.globalAlpha = alpha < 1 ? alpha : 1;
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore(); ctx.globalAlpha = 1;
    }

    var HOLD = 2400, TRANS = 1750, GRID = 3, BEAT0 = 0.40, BEAT1 = 0.60;

    function loop() {
      if (!running) { cancelAnimationFrame(raf); return; }
      var t = now() - t0;
      if (phase === "hold") {
        draw(slides[cur], slides[cur], 0);
        if (t >= HOLD && slides.length > 1) { nxt = (cur + 1) % slides.length; phase = "trans"; t0 = now(); setCaptionRaw(); }
      } else {
        var p = clamp01(t / TRANS);
        draw(slides[cur], slides[nxt], p);
        if (t >= TRANS) { cur = nxt; phase = "hold"; t0 = now(); setCaption(cur); markDot(cur); }
      }
      raf = requestAnimationFrame(loop);
    }

    // two-stage wipe: interface -> bare html -> next interface
    function draw(from, to, p) {
      var tms = now(), fi = from.img, ti = to.img;
      ctx.clearRect(0, 0, W, H);
      if (p <= 0 || from === to) { coverDraw(fi, 0, 0, W, H, 1, 0, 0); vignette(); return; }
      if (p >= 1) { coverDraw(ti, 0, 0, W, H, 1, 0, 0); vignette(); return; }

      if (p < BEAT0) {
        // stage 1: wipe the interface away to reveal the bare HTML (code flashes in first)
        var wp = easeInOut(clamp01(p / BEAT0));
        var codeA = clamp01((0.16 - p) / 0.16);
        blockWipe(fi, function (rx, ry, rw, rh, a, jx, jy) {
          coverDraw(RAW, rx, ry, rw, rh, a, jx, jy);
          if (codeA > 0.01) coverDraw(CODE, rx, ry, rw, rh, a * codeA, jx, jy);
        }, wp, tms);
      } else if (p < BEAT1) {
        // beat: hold on the full bare HTML — a scanline sweeps it
        coverDraw(RAW, 0, 0, W, H, 1, 0, 0);
        scanline(((p - BEAT0) / (BEAT1 - BEAT0)) * H);
      } else {
        // stage 2: wipe the next interface in over the bare HTML
        var wp2 = easeInOut(clamp01((p - BEAT1) / (1 - BEAT1)));
        blockWipe(RAW, function (rx, ry, rw, rh, a, jx, jy) {
          coverDraw(ti, rx, ry, rw, rh, a, jx, jy);
        }, wp2, tms);
      }
      vignette();
    }

    function scanline(y) {
      ctx.save();
      ctx.shadowColor = "rgba(" + CLAY + ",0.8)"; ctx.shadowBlur = 18;
      var g = ctx.createLinearGradient(0, y - 24, 0, y);
      g.addColorStop(0, "rgba(" + AMBER + ",0)"); g.addColorStop(1, "rgba(" + AMBER + ",0.16)");
      ctx.fillStyle = g; ctx.fillRect(0, y - 24, W, 24);
      var lg = ctx.createLinearGradient(0, 0, W, 0);
      lg.addColorStop(0, "rgba(" + HOT + ",0)"); lg.addColorStop(.5, "rgba(" + HOT + ",0.85)"); lg.addColorStop(1, "rgba(" + HOT + ",0)");
      ctx.fillStyle = lg; ctx.fillRect(0, y - 1.5, W, 3);
      ctx.restore();
    }

    function blockWipe(baseImg, drawReveal, wp, tms) {
      var bw = W / GRID, bh = H / GRID;
      var dip = (Math.abs(wp - 0.30) < 0.045 || Math.abs(wp - 0.62) < 0.045) ? 0.6 : 1;
      for (var r = 0; r < GRID; r++) {
        for (var c = 0; c < GRID; c++) {
          var i = r * GRID + c, bx = c * bw, by = r * bh;
          var order = (r + c) / ((GRID - 1) * 2);
          var bp = clamp01((wp - order * 0.55) / 0.45);
          coverDraw(baseImg, bx, by, bw, bh, 1, 0, 0);
          if (bp <= 0) continue;
          var horiz = ((r + c) % 2) === 0;
          var jk = bp < 0.5 ? (0.5 - bp) * 7 : 0;
          var jx = Math.sin(tms * 0.035 + i) * jk, jy = Math.cos(tms * 0.04 + i) * jk;
          var flick = bp < 0.45 ? (0.5 + 0.5 * (0.5 + 0.5 * Math.sin(tms * 0.045 + i * 1.7))) : 1;
          var a = clamp01(flick * dip);
          var rx = bx, ry = by, rw = bw, rh = bh, edge;
          if (horiz) { rw = bw * bp; edge = bx + rw; } else { rh = bh * bp; edge = by + rh; }
          if (rw > 0.5 && rh > 0.5) drawReveal(rx, ry, rw, rh, a, jx, jy);
          if (bp > 0.86) {
            ctx.save(); ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
            ctx.globalAlpha = (1 - (bp - 0.86) / 0.14) * 0.08;
            ctx.fillStyle = "rgba(" + AMBER + ",1)"; ctx.fillRect(bx, by, bw, bh);
            ctx.restore(); ctx.globalAlpha = 1;
          }
          if (bp < 0.999) drawEdge(horiz, bx, by, bw, bh, edge);
        }
      }
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
    function _setCap(label, sub, instant) {
      if (!capLabel) return;
      var apply = function () { capLabel.textContent = label; if (capSub) capSub.textContent = sub; root.classList.remove("cap-out"); };
      if (instant) apply();
      else { root.classList.add("cap-out"); clearTimeout(capT); capT = setTimeout(apply, 240); }
    }
    function setCaption(i, instant) { var s = slides[i]; _setCap(s.label, s.sub, instant); }
    function setCaptionRaw() { _setCap(RAW_CAP.label, RAW_CAP.sub, false); }
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
