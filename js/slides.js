/* Walk-through sliders: any [data-slides] block becomes an interactive deck.
   Figures toggle .on; prev/next buttons and arrow keys page through. */
(function () {
  document.querySelectorAll("[data-slides]").forEach(function (root) {
    var figs = Array.prototype.slice.call(root.querySelectorAll(".wt__stage figure"));
    var count = root.querySelector(".wt__count");
    var prev = root.querySelector("[data-prev]");
    var next = root.querySelector("[data-next]");
    if (figs.length < 2 || !prev || !next) return;
    var i = 0;
    function show(n) {
      i = (n + figs.length) % figs.length;
      figs.forEach(function (f, k) { f.classList.toggle("on", k === i); });
      if (count) count.textContent = (i + 1) + " / " + figs.length;
    }
    prev.addEventListener("click", function () { show(i - 1); });
    next.addEventListener("click", function () { show(i + 1); });
    // arrow keys while the deck (or its buttons) have focus
    root.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { show(i - 1); e.preventDefault(); }
      if (e.key === "ArrowRight") { show(i + 1); e.preventDefault(); }
    });
    // click the image itself to advance — the laziest walkthrough
    root.querySelector(".wt__stage").addEventListener("click", function () { show(i + 1); });
    show(0);
  });
})();
