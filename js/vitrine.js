/* The sandbox pops up. Sidebar / index triggers open a project modal; inside,
   the real site runs live (iframe) or faux-browses via image hotspots and tabs.
   Without JS the modals fall back to :target and the screens simply stack. */
(function () {
  var doc = document;
  doc.documentElement.classList.add("js");

  function qsa(sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); }
  function qs(sel, root) { return (root || doc).querySelector(sel); }

  var modals = {};
  qsa(".modal").forEach(function (m) { modals[m.id] = m; });

  var lastFocus = null;
  var scrollY = 0;

  function activate(modal) {
    // lazy-load the live iframe only when its modal first opens
    qsa("iframe[data-src]", modal).forEach(function (f) {
      f.src = f.getAttribute("data-src");
      f.removeAttribute("data-src");
    });
  }

  function open(id, trigger) {
    var modal = modals[id];
    if (!modal) return;
    var already = qs(".modal.is-open");
    lastFocus = trigger || doc.activeElement;
    if (already && already !== modal) {
      already.classList.remove("is-open");           // switching projects — swap, don't stack
    } else if (!already) {
      scrollY = window.scrollY;                       // first open — lock scroll, arm keys
      doc.body.style.position = "fixed";
      doc.body.style.top = -scrollY + "px";
      doc.body.style.width = "100%";
      doc.addEventListener("keydown", onKey);
    }
    modal.classList.add("is-open");
    qsa(".panel__links [data-open]").forEach(function (el) {
      el.classList.toggle("is-active", el.getAttribute("data-open") === id);
    });
    activate(modal);
    var close = qs(".modal__close", modal);
    if (close) close.focus();
  }

  function close() {
    var modal = qs(".modal.is-open");
    if (!modal) return;
    modal.classList.remove("is-open");
    qsa(".panel__links [data-open].is-active").forEach(function (el) { el.classList.remove("is-active"); });
    doc.body.style.position = "";
    doc.body.style.top = "";
    doc.body.style.width = "";
    window.scrollTo(0, scrollY);
    doc.removeEventListener("keydown", onKey);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function onKey(e) {
    if (e.key === "Escape") { close(); return; }
    if (e.key === "Tab") trapTab(e);
  }

  // keep focus inside the open modal
  function trapTab(e) {
    var modal = qs(".modal.is-open");
    if (!modal) return;
    var focusable = qsa('a[href], button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])', modal)
      .filter(function (el) { return el.offsetParent !== null; });
    if (!focusable.length) return;
    var first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  // triggers: sidebar links + index rows
  qsa("[data-open]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      var id = el.getAttribute("data-open");
      if (modals[id]) { e.preventDefault(); open(id, el); }
    });
  });

  // close: scrim, × buttons
  qsa(".modal__scrim, .modal__close").forEach(function (el) {
    el.addEventListener("click", function (e) { e.preventDefault(); close(); });
  });

  // the split: a panel goes "live" (reel plays, text reveals) on hover / focus.
  // touch/no-hover devices can't hover, so both panels autoplay.
  var panels = qsa(".panel[data-panel]");
  var canHover = window.matchMedia && window.matchMedia("(hover: hover)").matches;
  if (canHover) {
    panels.forEach(function (p) {
      p.addEventListener("mouseenter", function () { p.classList.add("is-live"); });
      p.addEventListener("mouseleave", function () { p.classList.remove("is-live"); });
      // keyboard: reveal a panel when any control inside it is focused
      p.addEventListener("focusin", function () { p.classList.add("is-live"); });
      p.addEventListener("focusout", function (e) {
        if (!p.contains(e.relatedTarget)) p.classList.remove("is-live");
      });
    });
  } else {
    panels.forEach(function (p) { p.classList.add("is-live"); });
  }

  // swap screens within a sandbox — store nav hotspots + inventory/earth00 tabs
  qsa("[data-fig-ref]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      var id = el.getAttribute("data-fig-ref");
      // hotspots live inside .sandbox; tabs live in the modal bar, above it
      var box = el.closest(".sandbox") || (el.closest(".modal") && el.closest(".modal").querySelector(".sandbox"));
      if (!box) return;
      qsa("figure[data-fig]", box).forEach(function (f) {
        f.classList.toggle("on", f.getAttribute("data-fig") === id);
      });
      var tabs = el.closest(".tabs");
      if (tabs) qsa("[data-fig-ref]", tabs).forEach(function (t) {
        t.setAttribute("aria-selected", t === el ? "true" : "false");
      });
      box.scrollTop = 0;
    });
  });
})();
