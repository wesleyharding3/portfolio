/* Chapter figures become clickable — an in-page window shows the image
   larger, without leaving the page. Click the scrim, press Escape, or hit
   the close button to dismiss. */
(function () {
  var targets = document.querySelectorAll(".ch-fig img");
  if (!targets.length) return;

  var overlay = document.createElement("div");
  overlay.className = "lightbox";
  overlay.innerHTML =
    '<a class="lightbox__scrim" href="#" aria-label="Close"></a>' +
    '<figure class="lightbox__card">' +
      '<button class="lightbox__close" type="button" aria-label="Close">&times;</button>' +
      '<img class="lightbox__img" src="" alt="">' +
      '<figcaption class="lightbox__cap"></figcaption>' +
    '</figure>';
  document.body.appendChild(overlay);

  var img = overlay.querySelector(".lightbox__img");
  var cap = overlay.querySelector(".lightbox__cap");
  var lastFocus = null;

  function open(src, alt) {
    lastFocus = document.activeElement;
    img.src = src;
    img.alt = alt || "";
    cap.textContent = alt || "";
    overlay.classList.add("is-open");
    document.documentElement.classList.add("lightbox-lock");
    overlay.querySelector(".lightbox__close").focus();
  }
  function close() {
    overlay.classList.remove("is-open");
    document.documentElement.classList.remove("lightbox-lock");
    img.src = "";
    if (lastFocus) lastFocus.focus();
  }

  targets.forEach(function (im) {
    im.style.cursor = "zoom-in";
    im.tabIndex = 0;
    im.setAttribute("role", "button");
    im.setAttribute("aria-label", "Expand image" + (im.alt ? ": " + im.alt : ""));
    im.addEventListener("click", function () { open(im.src, im.alt); });
    im.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(im.src, im.alt); }
    });
  });

  overlay.querySelector(".lightbox__scrim").addEventListener("click", function (e) { e.preventDefault(); close(); });
  overlay.querySelector(".lightbox__close").addEventListener("click", close);
  window.addEventListener("keydown", function (e) { if (e.key === "Escape" && overlay.classList.contains("is-open")) close(); });
})();
