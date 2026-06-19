/* =============================================================================
   WIREFRAME GLOBE — hand-rolled Canvas2D, no dependencies.
   Orthographic projection · graticule · camera-facing city illumination
   · animated great-circle arcs ("cross-border flow").
   ========================================================================== */
(function () {
  "use strict";

  var TAU = Math.PI * 2;
  var DEG = Math.PI / 180;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // colour read from CSS so the globe always matches the theme
  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }
  var BLUE = cssVar("--blue", "#5b86d8");
  var BLUE_BRIGHT = cssVar("--blue-bright", "#9bb8f5");

  // --- vector helpers (rotate a unit point on the sphere) -------------------
  function sph(latDeg, lonDeg) {
    var lat = latDeg * DEG, lon = lonDeg * DEG;
    var cl = Math.cos(lat);
    return { x: cl * Math.sin(lon), y: Math.sin(lat), z: cl * Math.cos(lon) };
  }
  function rotY(p, a) {
    var c = Math.cos(a), s = Math.sin(a);
    return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c };
  }
  function rotX(p, a) {
    var c = Math.cos(a), s = Math.sin(a);
    return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
  }

  // --- graticule geometry (sampled polylines) -------------------------------
  function buildGraticule() {
    var lines = [], lat, lon, pts;
    // parallels every 20deg
    for (lat = -80; lat <= 80; lat += 20) {
      pts = [];
      for (lon = -180; lon <= 180; lon += 6) pts.push(sph(lat, lon));
      lines.push(pts);
    }
    // meridians every 20deg
    for (lon = -180; lon < 180; lon += 20) {
      pts = [];
      for (lat = -90; lat <= 90; lat += 6) pts.push(sph(lat, lon));
      lines.push(pts);
    }
    return lines;
  }

  // a sparse coastline-ish ring set to add density without a real map
  var CITIES = [
    [40.7, -74.0], [34.0, -118.2], [51.5, -0.1], [48.9, 2.35], [52.5, 13.4],
    [55.75, 37.6], [35.7, 51.4], [32.1, 34.8], [24.7, 46.7], [39.9, 116.4],
    [35.7, 139.7], [37.6, 127.0], [28.6, 77.2], [1.35, 103.8], [-33.9, 151.2],
    [-23.5, -46.6], [30.0, 31.2], [6.5, 3.4], [19.4, -99.1], [-1.3, 36.8]
  ].map(function (c) { return sph(c[0], c[1]); });

  var ARCS = [
    [2, 0], [6, 5], [9, 1], [10, 14], [3, 16], [12, 13], [0, 17], [4, 15]
  ]; // index pairs into CITIES

  // great-circle interpolation between two unit vectors
  function slerp(a, b, t) {
    var dot = a.x * b.x + a.y * b.y + a.z * b.z;
    dot = Math.max(-1, Math.min(1, dot));
    var th = Math.acos(dot);
    if (th < 1e-4) return a;
    var s = Math.sin(th), w1 = Math.sin((1 - t) * th) / s, w2 = Math.sin(t * th) / s;
    return { x: a.x * w1 + b.x * w2, y: a.y * w1 + b.y * w2, z: a.z * w1 + b.z * w2 };
  }

  function init(canvas) {
    var ctx = canvas.getContext("2d");
    var grat = buildGraticule();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0, R = 0, cx = 0, cy = 0;
    var yaw = -0.4, tilt = -23 * DEG;
    var running = false, t0 = 0;

    function resize() {
      var rect = canvas.getBoundingClientRect();
      W = rect.width; H = rect.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = Math.min(W, H) * 0.42;
      cx = W / 2; cy = H / 2;
    }

    function project(p) {
      // returns screen coords + depth (z>0 = facing camera)
      var q = rotY(p, yaw);
      q = rotX(q, tilt);
      return { sx: cx + q.x * R, sy: cy - q.y * R, z: q.z };
    }

    function drawLine(pts) {
      var started = false, prevFront = false;
      for (var i = 0; i < pts.length; i++) {
        var pr = project(pts[i]);
        var front = pr.z > -0.02;
        var a = (pr.z + 1) / 2;            // 0 (back) .. 1 (front)
        var alpha = 0.04 + a * a * 0.30;
        if (front) {
          if (!started || !prevFront) { ctx.beginPath(); ctx.moveTo(pr.sx, pr.sy); started = true; }
          else { ctx.lineTo(pr.sx, pr.sy); }
          // stroke incrementally so alpha follows depth
          ctx.strokeStyle = "rgba(205,193,172," + alpha.toFixed(3) + ")";
          ctx.stroke();
          ctx.beginPath(); ctx.moveTo(pr.sx, pr.sy);
        }
        prevFront = front;
      }
    }

    function drawCity(p, pulse) {
      var pr = project(p);
      if (pr.z < -0.05) return;
      var face = Math.max(0, pr.z);          // camera-facing illumination
      var r = 1.1 + face * 2.0;
      var glow = 0.15 + face * 0.7;
      ctx.beginPath();
      ctx.arc(pr.sx, pr.sy, r + 4 * face, 0, TAU);
      ctx.fillStyle = "rgba(232,133,106," + (glow * 0.16).toFixed(3) + ")";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(pr.sx, pr.sy, r, 0, TAU);
      ctx.fillStyle = "rgba(238,230,216," + glow.toFixed(3) + ")";
      ctx.fill();
    }

    function drawArc(a, b, phase) {
      var N = 48, i, prev = null, lift;
      ctx.lineWidth = 1;
      for (i = 0; i <= N; i++) {
        var t = i / N;
        var s = slerp(a, b, t);
        lift = 1 + 0.16 * Math.sin(t * Math.PI);   // raise above surface
        var p = { x: s.x * lift, y: s.y * lift, z: s.z * lift };
        var pr = project(p);
        if (pr.z < -0.1) { prev = null; continue; }
        if (prev) {
          // comet: brightest near the moving head
          var d = Math.abs(((t - phase) % 1 + 1) % 1);
          d = Math.min(d, 1 - d);
          var head = Math.max(0, 1 - d * 6);
          var base = 0.05 + Math.max(0, pr.z) * 0.10;
          ctx.strokeStyle = "rgba(232,133,106," + (base + head * 0.55).toFixed(3) + ")";
          ctx.lineWidth = 0.8 + head * 1.4;
          ctx.beginPath(); ctx.moveTo(prev.sx, prev.sy); ctx.lineTo(pr.sx, pr.sy); ctx.stroke();
        }
        prev = pr;
      }
    }

    function frame(ts) {
      if (!running) return;
      if (!t0) t0 = ts;
      var dt = (ts - t0) / 1000;
      if (!reduce) yaw = -0.4 + dt * 0.085;

      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1;
      ctx.lineCap = "round";

      // halo
      var g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.25);
      g.addColorStop(0, "rgba(205,193,172,0.05)");
      g.addColorStop(1, "rgba(205,193,172,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.25, 0, TAU); ctx.fill();

      // limb circle
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU);
      ctx.strokeStyle = "rgba(205,193,172,0.22)"; ctx.lineWidth = 1; ctx.stroke();

      for (var i = 0; i < grat.length; i++) drawLine(grat[i]);

      var phase = (dt * 0.18) % 1;
      for (var j = 0; j < ARCS.length; j++) drawArc(CITIES[ARCS[j][0]], CITIES[ARCS[j][1]], phase + j * 0.13);
      for (var k = 0; k < CITIES.length; k++) drawCity(CITIES[k]);

      if (reduce) { running = false; return; }   // single static frame
      requestAnimationFrame(frame);
    }

    function start() { if (running) return; running = true; t0 = 0; requestAnimationFrame(frame); }
    function stop() { running = false; }

    resize();
    window.addEventListener("resize", function () { resize(); if (reduce) { running = true; frame(performance.now()); } });

    // pause when offscreen
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { e.isIntersecting ? start() : stop(); });
      }, { threshold: 0.05 });
      io.observe(canvas);
    } else { start(); }

    if (reduce) { running = true; frame(performance.now()); }
  }

  window.WHGlobe = { init: init };

  // auto-init any canvas with [data-globe]
  document.addEventListener("DOMContentLoaded", function () {
    var nodes = document.querySelectorAll("canvas[data-globe]");
    for (var i = 0; i < nodes.length; i++) init(nodes[i]);
  });
})();
