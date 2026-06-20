/* =============================================================================
   SHOWCASE — "from markup to interface"
   A 3x3 block wipe between slides, each block's leading edge lit by an electric
   gradient scanline (borrowed from earth00's keyword-intelligence decode), and
   the incoming slide hologram-flickers in (unstable opacity passes + glitch dips
   + jitter + glow bloom, from earth00's 3D-vector boot-up) before resolving.
   Hand-coded Canvas2D. No dependencies.
   ========================================================================== */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // slide manifest — missing files are skipped gracefully (onerror)
  var SLIDES = [
    { src: "assets/img/showcase/p-code.jpg",  label: "01 — the HTML I write",          sub: "semantic markup, by hand" },
    { src: "assets/img/showcase/p-raw.jpg",   label: "02 — what the browser shows",     sub: "raw, unstyled default" },
    { src: "assets/img/showcase/p-final.jpg", label: "03 — what I turn it into",        sub: "this page" },
    { src: "assets/img/showcase/wtf-home.jpg",label: "wearthefuture.com",               sub: "the storefront" },
    { src: "assets/img/showcase/wtf-shop.jpg",label: "wearthefuture.com / shop",        sub: "the collections" },
    { src: "assets/img/showcase/wtf-admin.jpg",label: "showroom inventory",             sub: "the operator dashboard I built" },
    { src: "assets/img/showcase/wtf-press.jpg",label: "earned media",                   sub: "press coverage, valued & tied to each loan" },
    { src: "assets/img/showcase/e-feed.jpg",  label: "earth00 / threads",               sub: "the news feed" },
    { src: "assets/img/showcase/e-keyword.jpg",label: "earth00 / keyword intelligence", sub: "the electric decode" },
    { src: "assets/img/showcase/e-vector.jpg",label: "earth00 / vector lab",            sub: "3D hologram boot-up" }
  ];

  // accent stops (warm clay -> amber -> hot)
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

    // ---- load images, keep only the ones that exist ----
    var slides = [];
    var pending = SLIDES.length;
    SLIDES.forEach(function (s) {
      var img = new Image();
      img.decoding = "async";
      img.onload = function () { s.img = img; settle(s); };
      img.onerror = function () { settle(null); };
      img.src = s.src;
    });
    var settled = [];
    function settle(s) { if (s) settled.push(s); if (--pending === 0) start(); }

    function start() {
      // preserve manifest order, drop missing
      slides = SLIDES.filter(function (s) { return s.img; });
      if (!slides.length) return;
      buildDots();
      resize();
      window.addEventListener("resize", resize);
      setCaption(0, true);
      cur = 0; nxt = 0; phase = "hold";
      var frz = (location.search.match(/[?&]frz=([0-9.]+)/) || [])[1];   // dev: freeze the wipe at a progress
      if (frz !== undefined && slides.length > 1) { draw(slides[0], slides[1], parseFloat(frz)); return; }
      draw(slides[0], slides[0], 0);                 // immediate first frame — never blank
      if (reduce) return;                            // static, no loop
      running = true; t0 = now(); raf = requestAnimationFrame(loop);   // start now
      // IO only PAUSES when fully offscreen (saves CPU); never the sole start trigger
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (es) {
          es.forEach(function (e) {
            if (e.isIntersecting) { if (!running) { running = true; t0 = now(); raf = requestAnimationFrame(loop); } }
            else { running = false; }
          });
        }, { threshold: 0 }).observe(canvas);
      }
    }

    // ---- sizing (cover-fit a 3:2 stage) ----
    function resize() {
      var r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduce && slides.length) draw(slides[cur || 0], slides[cur || 0], 1);
    }

    function coverDraw(img, clipX, clipY, clipW, clipH, alpha, jx, jy) {
      var iw = img.naturalWidth, ih = img.naturalHeight;
      var sc = Math.max(W / iw, H / ih);
      var dw = iw * sc, dh = ih * sc;
      var dx = (W - dw) / 2 + (jx || 0), dy = (H - dh) / 2 + (jy || 0);
      ctx.save();
      ctx.beginPath(); ctx.rect(clipX, clipY, clipW, clipH); ctx.clip();
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // ---- timing ----
    var HOLD = 2700, TRANS = 1050;
    var GRID = 3;
    var cur = 0, nxt = 0, phase = "hold", t0 = 0, raf = 0, running = false;
    function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }

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

    // ---- the transition: 3x3 block wipe + electric edge + holo flicker ----
    function draw(from, to, p) {
      var tms = now(), fi = from.img, ti = to.img;
      ctx.clearRect(0, 0, W, H);
      if (p <= 0 || from === to) { coverDraw(ti, 0, 0, W, H, 1, 0, 0); vignette(); return; }
      if (p >= 1) { coverDraw(ti, 0, 0, W, H, 1, 0, 0); vignette(); return; }

      var bw = W / GRID, bh = H / GRID;
      // global glitch dips (two brief brightness dropouts, from the holo boot)
      var dip = (Math.abs(p - 0.32) < 0.03 || Math.abs(p - 0.58) < 0.03) ? 0.55 : 1;

      for (var r = 0; r < GRID; r++) {
        for (var c = 0; c < GRID; c++) {
          var i = r * GRID + c;
          var bx = c * bw, by = r * bh;
          // diagonal cascade stagger
          var order = (r + c) / ((GRID - 1) * 2);          // 0..1
          var spread = 0.55, dur = 0.45;
          var bp = clamp01((p - order * spread) / dur);     // this block's progress

          // old slide always underneath
          coverDraw(fi, bx, by, bw, bh, 1, 0, 0);
          if (bp <= 0) continue;

          // woven sub-wipe direction (the tic-tac-toe weave)
          var horiz = ((r + c) % 2) === 0;
          var ep = easeInOut(bp);                            // edge position 0..1 across the block

          // jitter (decays over the block's first half), from holo instability
          var jk = bp < 0.5 ? (0.5 - bp) * 7 : 0;
          var jx = Math.sin(tms * 0.035 + i) * jk, jy = Math.cos(tms * 0.04 + i) * jk;

          // holo flicker: unstable opacity passes in the first 45% of the block's life
          var flick = bp < 0.45 ? (0.5 + 0.5 * (0.5 + 0.5 * Math.sin(tms * 0.045 + i * 1.7))) : 1;
          var a = clamp01(flick * dip);

          // revealed sub-rect (the wipe)
          var rx = bx, ry = by, rw = bw, rh = bh, edgeX, edgeY;
          if (horiz) { rw = bw * ep; edgeX = bx + rw; }
          else { rh = bh * ep; edgeY = by + rh; }
          if (rw > 0.5 && rh > 0.5) coverDraw(ti, rx, ry, rw, rh, a, jx, jy);

          // glow bloom near completion
          if (bp > 0.8) {
            ctx.save(); ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
            ctx.globalAlpha = (1 - (bp - 0.8) / 0.2) * 0.16;
            ctx.fillStyle = "rgba(" + AMBER + ",1)"; ctx.fillRect(bx, by, bw, bh);
            ctx.restore(); ctx.globalAlpha = 1;
          }

          // electric scanline edge at the wipe boundary
          if (bp < 0.999) drawEdge(horiz, bx, by, bw, bh, horiz ? edgeX : edgeY);
        }
      }
      vignette();
    }

    function drawEdge(horiz, bx, by, bw, bh, pos) {
      ctx.save();
      ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
      ctx.shadowColor = "rgba(" + CLAY + ",0.9)";
      ctx.shadowBlur = 22;
      var thick = 3, trail = 26;
      if (horiz) {
        // glow trail behind the line
        var g = ctx.createLinearGradient(pos - trail, 0, pos, 0);
        g.addColorStop(0, "rgba(" + CLAY + ",0)"); g.addColorStop(1, "rgba(" + AMBER + ",0.22)");
        ctx.fillStyle = g; ctx.fillRect(pos - trail, by, trail, bh);
        // the bright line
        var lg = ctx.createLinearGradient(0, by, 0, by + bh);
        lg.addColorStop(0, "rgba(" + HOT + ",0)"); lg.addColorStop(.5, "rgba(" + HOT + ",0.95)"); lg.addColorStop(1, "rgba(" + HOT + ",0)");
        ctx.fillStyle = lg; ctx.fillRect(pos - thick / 2, by, thick, bh);
      } else {
        var g2 = ctx.createLinearGradient(0, pos - trail, 0, pos);
        g2.addColorStop(0, "rgba(" + CLAY + ",0)"); g2.addColorStop(1, "rgba(" + AMBER + ",0.22)");
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

    // ---- caption + dots ----
    var capT = 0;
    function setCaption(i, instant) {
      if (!capLabel) return;
      var s = slides[i];
      var apply = function () { capLabel.textContent = s.label; if (capSub) capSub.textContent = s.sub; root.classList.remove("cap-out"); };
      if (instant) { apply(); }
      else { root.classList.add("cap-out"); clearTimeout(capT); capT = setTimeout(apply, 220); }
    }
    function buildDots() {
      if (!dotsWrap) return;
      dotsWrap.innerHTML = "";
      slides.forEach(function (_, i) {
        var d = document.createElement("span"); d.className = "sc-dot" + (i === 0 ? " on" : ""); dotsWrap.appendChild(d);
      });
    }
    function markDot(i) {
      if (!dotsWrap) return;
      var ds = dotsWrap.children;
      for (var k = 0; k < ds.length; k++) ds[k].className = "sc-dot" + (k === i ? " on" : "");
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    var el = document.querySelector("[data-showcase]");
    if (el) init(el);
  });
})();
