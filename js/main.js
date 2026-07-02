/* =============================================================================
   Interactions — sticky/shrinking nav, scroll reveals, count-ups, and the
   load-in choreography: decoded kickers, the name flash, the typed claim.
   Progressive enhancement: the page is fully readable with JS disabled.
   ========================================================================== */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.documentElement.classList.add("js");

  var REVEAL_SEL = ".reveal, .reveal-l, .reveal--wipe, .reveal--flash, .reveal--right";

  /* --- kicker decode: glyph noise resolves left-to-right into the words --- */
  var GLYPHS = "█▓▒░<>/[]{}=+*#%&";
  function decode(el, dur) {
    var txt = el.getAttribute("data-text");
    if (txt === null) { txt = el.textContent; el.setAttribute("data-text", txt); }
    if (reduce || !txt.trim()) { el.textContent = txt; return; }
    var t0 = null;
    el.classList.add("decoding");
    function tick(ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      if (p >= 1) { el.textContent = txt; el.classList.remove("decoding"); return; }
      var n = Math.floor(p * txt.length), out = txt.slice(0, n);
      for (var i = n; i < txt.length; i++) {
        var c = txt.charAt(i);
        out += (c === " " || c === "—" || c === "·") ? c : GLYPHS.charAt((Math.random() * GLYPHS.length) | 0);
      }
      el.textContent = out;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* --- typewriter that preserves nested markup (walks the node tree) ------ */
  function typeInto(el, cps, done) {
    var src = el.cloneNode(true);
    el.innerHTML = "";
    var caret = document.createElement("span");
    caret.className = "type-caret";
    el.appendChild(caret);

    // flatten the source into a queue of "open element" / "char" steps
    var queue = [];
    (function flatten(node, parentKey) {
      for (var i = 0; i < node.childNodes.length; i++) {
        var n = node.childNodes[i];
        if (n.nodeType === 3) {
          var t = n.textContent;
          for (var j = 0; j < t.length; j++) queue.push({ p: parentKey, ch: t.charAt(j) });
        } else if (n.nodeType === 1) {
          var key = {};
          queue.push({ p: parentKey, open: n.cloneNode(false), key: key });
          flatten(n, key);
        }
      }
    })(src, null);

    var live = {};        // key id -> live element (null parent = el itself)
    var keyId = 0, textNode = null, textParent = null, idx = 0;
    queue.forEach(function (s) { if (s.key) { s.key.i = ++keyId; } });

    // time-based, not frame-based: if the tab is hidden mid-type, we catch up
    var t0 = null;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var target = Math.min(queue.length, 1 + Math.floor((ts - t0) / 1000 * cps));
      while (idx < target) {
        var s = queue[idx++];
        var parent = s.p === null ? el : live[s.p.i];
        if (s.open) {
          var elx = s.open;
          live[s.key.i] = elx;
          if (parent === el) el.insertBefore(elx, caret); else parent.appendChild(elx);
          textNode = null;
        } else {
          if (textNode && textParent === parent) textNode.data += s.ch;
          else {
            textNode = document.createTextNode(s.ch); textParent = parent;
            if (parent === el) el.insertBefore(textNode, caret); else parent.appendChild(textNode);
          }
        }
      }
      if (idx < queue.length) requestAnimationFrame(step);
      else {
        caret.classList.add("done");
        setTimeout(function () { if (caret.parentNode) caret.parentNode.removeChild(caret); }, 2300);
        if (done) done();
      }
    }
    requestAnimationFrame(step);
  }

  /* --- hero load choreography ---------------------------------------------
     kicker decodes → "Wesley" / "Harding" flash in → the claim types itself
     → the CTA slides in from the right, the email and the code link fade.  */
  var hero = document.querySelector("[data-hero]");
  var revealAll = location.search.indexOf("reveal=all") !== -1;
  function heroNow() {
    if (!hero) return;
    hero.classList.add("go", "typing", "cta");
    var k = hero.querySelector("[data-decode]");
    if (k && k.getAttribute("data-text")) k.textContent = k.getAttribute("data-text");
  }
  function heroSequence() {
    if (!hero) return;
    if (reduce || revealAll) { heroNow(); return; }
    var kicker = hero.querySelector("[data-decode]");
    var claim = hero.querySelector("[data-typer]");
    if (kicker) decode(kicker, 950);
    setTimeout(function () { hero.classList.add("go"); }, 260);
    setTimeout(function () {
      hero.classList.add("typing");
      if (claim) typeInto(claim, 74, function () { hero.classList.add("cta"); });
      else hero.classList.add("cta");
    }, 1500);
  }

  /* screenshot aid: ?reveal=all shows every section immediately */
  if (revealAll) {
    document.addEventListener("DOMContentLoaded", function () {
      var st = document.createElement("style");
      st.textContent = "*,*::before,*::after{transition:none!important;animation:none!important}" +
        ".js .reveal,.js .reveal--flash{opacity:1!important;transform:none!important}" +
        ".js .reveal--wipe{clip-path:none!important}" +
        ".js [data-hero] .hero__name .ln{opacity:1!important}";
      document.head.appendChild(st);
      heroNow();
      document.querySelectorAll(REVEAL_SEL).forEach(function (e) { e.classList.add("in"); });
      document.querySelectorAll("[data-n]").forEach(function (n) {
        var t = parseFloat(n.getAttribute("data-n"));
        n.textContent = t >= 1000 ? Math.round(t).toLocaleString() : Math.round(t).toString();
      });
      var to = (location.search.match(/scroll=([\w-]+)/) || [])[1];
      if (to && document.getElementById(to)) {
        document.documentElement.style.scrollBehavior = "auto";
        document.getElementById(to).scrollIntoView();
      }
    });
  } else {
    document.addEventListener("DOMContentLoaded", heroSequence);
  }

  /* --- sticky topbar state (large at top, compact once scrolling) --- */
  var topbar = document.querySelector(".topbar");
  function onScroll() {
    if (topbar) topbar.classList.toggle("scrolled", window.scrollY > 24);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* --- scroll reveals (all variants) + kicker decode on first view --- */
  var revealEls = document.querySelectorAll(REVEAL_SEL);
  if ("IntersectionObserver" in window && !reduce && !revealAll) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); ro.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el) { ro.observe(el); });

    var kickers = document.querySelectorAll(".kicker:not([data-decode])");
    var ko = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { decode(e.target, 720); ko.unobserve(e.target); }
      });
    }, { threshold: 0.5 });
    kickers.forEach(function (k) { ko.observe(k); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* --- count-up for stats --- */
  function countUp(el) {
    var target = parseFloat(el.getAttribute("data-n"));
    var dur = 1300, t0 = null;
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = target * eased;
      el.textContent = target >= 100 ? Math.round(val).toLocaleString() : val.toFixed(0);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = (target >= 1000 ? Math.round(target).toLocaleString() : Math.round(target).toString());
    }
    requestAnimationFrame(step);
  }
  var nums = document.querySelectorAll("[data-n]");
  if ("IntersectionObserver" in window && !reduce && !revealAll) {
    var no = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { countUp(e.target); no.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    nums.forEach(function (n) { no.observe(n); });
  } else {
    nums.forEach(function (n) {
      var t = parseFloat(n.getAttribute("data-n"));
      n.textContent = t >= 1000 ? Math.round(t).toLocaleString() : Math.round(t).toString();
    });
  }

  /* --- current year --- */
  var yr = document.querySelector("[data-year]");
  if (yr) yr.textContent = new Date().getFullYear();
})();
