/* =============================================================================
   Interactions — sticky nav, scroll reveals, live chapter counter, count-ups.
   Progressive enhancement: the page is fully readable with JS disabled.
   ========================================================================== */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.documentElement.classList.add("js");

  /* screenshot aid: ?reveal=all shows every section immediately (no scroll needed) */
  var revealAll = location.search.indexOf("reveal=all") !== -1;
  if (revealAll) {
    document.addEventListener("DOMContentLoaded", function () {
      document.querySelectorAll(".reveal,.reveal-l").forEach(function (e) { e.classList.add("in"); });
      document.querySelectorAll("[data-n]").forEach(function (n) {
        var t = parseFloat(n.getAttribute("data-n"));
        n.textContent = t >= 1000 ? Math.round(t).toLocaleString() : Math.round(t).toString();
      });
      document.querySelectorAll(".bar__fill[data-w]").forEach(function (b) { b.style.width = b.getAttribute("data-w"); });
    });
  }

  /* --- sticky topbar state --- */
  var topbar = document.querySelector(".topbar");
  function onScroll() {
    if (topbar) topbar.classList.toggle("scrolled", window.scrollY > 24);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* --- scroll reveals --- */
  var revealEls = document.querySelectorAll(".reveal, .reveal-l");
  if ("IntersectionObserver" in window && !reduce) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); ro.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el) { ro.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* --- progress bars (education etc.) --- */
  var bars = document.querySelectorAll(".bar__fill[data-w]");
  if ("IntersectionObserver" in window) {
    var bo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.style.width = e.target.getAttribute("data-w"); bo.unobserve(e.target); }
      });
    }, { threshold: 0.5 });
    bars.forEach(function (b) { bo.observe(b); });
  } else {
    bars.forEach(function (b) { b.style.width = b.getAttribute("data-w"); });
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
  if ("IntersectionObserver" in window && !reduce) {
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

  /* --- live editorial running-head in the rail --- */
  var rhEl = document.querySelector("[data-rh-target]");
  var rhSections = Array.prototype.slice.call(document.querySelectorAll("section[data-rh]"));
  if (rhEl && rhSections.length) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) rhEl.textContent = e.target.getAttribute("data-rh");
      });
    }, { threshold: 0.35 });
    rhSections.forEach(function (s) { co.observe(s); });
  }

  /* --- current year --- */
  var yr = document.querySelector("[data-year]");
  if (yr) yr.textContent = new Date().getFullYear();
})();
