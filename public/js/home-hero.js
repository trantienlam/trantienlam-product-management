/**
 * Hero banner: đổi ảnh nền mỗi INTERVAL_MS (mặc định 5 giây)
 */
(function () {
  const banner = document.getElementById("clientHeroBanner");
  if (!banner) return;

  const slides = banner.querySelectorAll(".hero-slide");
  const dots = banner.querySelectorAll(".hero-dot");
  if (!slides.length) return;

  const INTERVAL_MS = 5000;
  let index = 0;
  let timerId = null;

  function goTo(i) {
    index = ((i % slides.length) + slides.length) % slides.length;
    slides.forEach((el, j) => {
      el.classList.toggle("is-active", j === index);
    });
    dots.forEach((el, j) => {
      el.classList.toggle("is-active", j === index);
    });
  }

  function next() {
    goTo(index + 1);
  }

  function start() {
    stop();
    timerId = window.setInterval(next, INTERVAL_MS);
  }

  function stop() {
    if (timerId !== null) {
      window.clearInterval(timerId);
      timerId = null;
    }
  }

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const i = parseInt(dot.getAttribute("data-index"), 10);
      if (!Number.isNaN(i)) {
        goTo(i);
        start();
      }
    });
  });

  banner.addEventListener("mouseenter", stop);
  banner.addEventListener("mouseleave", start);

  start();
})();
