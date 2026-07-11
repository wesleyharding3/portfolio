/* Draws "Wesley Harding" left to right as if by a pen (a clip-path reveal
   carries solid ink; a thin nib stroke rides the drawing edge), then docks
   the whole mark into the nav's top-left corner.

   Two plain-colored copies of the text stand in for one color-inverting
   layer: a black copy clipped to only the portion over the white half, a
   white copy clipped to only the portion over the black half. This works
   around a genuine, repeatable Chrome bug where `clip-path` on an SVG <text>
   that also has `mix-blend-mode` paints the element invisible — not just
   mid-animation, but for any static clip value, and the corruption persists
   even after mix-blend-mode is removed again. Plain-color clip-path (no
   blend-mode, ever) is unaffected, so that's the whole workaround.

   The reveal and dock are driven by a JS rAF loop rather than CSS @keyframes
   for the same underlying reason: this bug's animated cousin made even
   plain top/left/width/height animations on an ancestor of a blend-mode
   element paint wrong. That's moot now that blend-mode is gone entirely, but
   direct per-frame writes are what's proven to work, so this keeps using
   them. CSS carries the static already-drawn, already-docked state as the
   no-JS/reduced-motion fallback. */
(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isMobile = window.matchMedia && window.matchMedia("(max-width: 820px)").matches;
  var namewrap = document.querySelector(".namewrap");
  var inkB = document.querySelector(".drawname__ink--b");
  var inkW = document.querySelector(".drawname__ink--w");
  var nib = document.querySelector(".drawname__nib");
  if (!namewrap || !inkB || !inkW || !nib || !window.requestAnimationFrame) return;
  if (reduce || isMobile) return;   // CSS base is already the correct static state

  var NIB_W = 5;                        // percent width of the traveling nib window
  var INK_DELAY = 280, INK_DUR = 550;   // ms
  var DOCK_DELAY = 1050, DOCK_DUR = 400;

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function easeDock(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  // Where "Harding" begins, as a viewBox-unit x-coordinate — measured once
  // from the text's own metrics (font-size is fixed in viewBox units, so this
  // never changes with viewport width). "Wesley Harding": chars 0-6 are
  // "Wesley " (W-e-s-l-e-y-space), so index 7 is where "Harding" starts.
  // getSubStringLength gives the typographic advance, not the visual ink
  // extent — an italic "H" leans such that its ink starts a little before its
  // advance origin, so a small buffer pushes the split safely clear of it.
  var ITALIC_OVERHANG = 12;   // viewBox units (string is ~1105 units wide)
  var wordBoundaryX = null;
  function measureWordBoundary() {
    if (wordBoundaryX != null) return wordBoundaryX;
    try {
      var bbox = inkB.getBBox();
      wordBoundaryX = bbox.x + inkB.getSubStringLength(0, 7) - ITALIC_OVERHANG;
    } catch (e) {
      wordBoundaryX = null;   // fall back to plain centering below
    }
    return wordBoundaryX;
  }

  function bigBox() {
    var w = Math.min(window.innerWidth * 0.7, 660), h = w * 0.21;
    var left = window.innerWidth / 2 - w / 2;
    var wb = measureWordBoundary();
    if (wb != null) {
      // position so the "Wesley "/"Harding" boundary lands exactly at the
      // seam (viewport center) — not wherever the whole string's midpoint
      // happens to fall — so "Harding" is guaranteed fully on the black side
      var scale = w / 1000;
      left = window.innerWidth / 2 - wb * scale;
    }
    return { w: w, h: h, top: window.innerHeight / 2 - h / 2, left: left };
  }
  function dockBox() {
    return { w: 89, h: 18.7, top: 21.6, left: Math.min(Math.max(window.innerWidth * 0.03, 20), 44) };
  }
  function setBox(box) {
    namewrap.style.width = box.w + "px"; namewrap.style.height = box.h + "px";
    namewrap.style.top = box.top + "px"; namewrap.style.left = box.left + "px";
    namewrap.style.marginLeft = "0"; namewrap.style.marginTop = "0";
  }

  // where the seam falls, expressed as a percentage of the ink's OWN
  // bounding box (not the viewport) — clip-path percentages on an SVG text
  // element resolve against its fill-box, so this is the unit we need
  function seamPercent() {
    var r = inkB.getBoundingClientRect();
    if (r.width <= 0) return 50;
    return clamp01((window.innerWidth / 2 - r.left) / r.width) * 100;
  }

  var big, dock, start = null, raf = null;

  // split the (revealed part of the) name at wherever the seam currently
  // falls — recomputed every frame, because the box MOVES during the dock and
  // the black/white split has to travel with it. A stale split is exactly the
  // bug that left the docked mark cut off at "Wesley H".
  function applyClips(revealPct) {
    var seamNow = seamPercent();
    inkB.style.clipPath = "inset(0 " + (100 - Math.min(revealPct, seamNow)) + "% 0 0)";
    if (seamNow >= 99.9 || revealPct <= seamNow) {
      // nothing of the revealed part lies on the black half
      inkW.style.display = "none";
    } else {
      inkW.style.display = "inline";
      inkW.style.clipPath = "inset(0 " + (100 - revealPct) + "% 0 " + seamNow + "%)";
    }
  }

  function frame(ts) {
    if (start == null) start = ts;
    var t = ts - start;

    var p = t >= INK_DELAY ? clamp01((t - INK_DELAY) / INK_DUR) * 100 : 0;
    if (t >= INK_DELAY) {
      var leftCut = Math.max(0, p - NIB_W), rightCut = Math.max(0, 100 - p);
      nib.style.clipPath = "inset(0 " + rightCut + "% 0 " + leftCut + "%)";
      nib.style.opacity = p >= 100 ? String(Math.max(0, 1 - (t - INK_DELAY - INK_DUR) / 80)) : "1";
    }

    var done = false;
    if (t >= DOCK_DELAY) {
      var dp = clamp01((t - DOCK_DELAY) / DOCK_DUR);
      var e = easeDock(dp);
      setBox({
        w: big.w + (dock.w - big.w) * e, h: big.h + (dock.h - big.h) * e,
        top: big.top + (dock.top - big.top) * e, left: big.left + (dock.left - big.left) * e
      });
      done = dp >= 1;
    }
    applyClips(p);                      // after setBox, so the seam math sees this frame's box
    if (!done) raf = requestAnimationFrame(frame);
  }

  function start_() {
    big = bigBox(); dock = dockBox();
    setBox(big);
    applyClips(0);                    // nothing revealed yet
    nib.style.display = "inline"; nib.style.clipPath = "inset(0 100% 0 0%)"; nib.style.opacity = "1";
    start = null;
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }

  start_();
  window.addEventListener("keydown", function (e) { if (e.key === "r" || e.key === "R") start_(); });
})();
