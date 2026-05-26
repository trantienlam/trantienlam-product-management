/**

 * Reveal sections khi scroll vào viewport (trang chủ)

 */

(function () {

  const page = document.querySelector(".home-page, .products-page");

  if (!page) return;



  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReduced) {

    page.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("is-revealed"));

    return;

  }



  const items = page.querySelectorAll("[data-reveal]");

  if (!items.length) return;



  const observer = new IntersectionObserver(

    (entries) => {

      entries.forEach((entry) => {

        if (!entry.isIntersecting) return;

        const el = entry.target;

        const delay = parseInt(el.getAttribute("data-reveal-delay") || "0", 10);

        window.setTimeout(() => {

          el.classList.add("is-revealed");

        }, delay);

        observer.unobserve(el);

      });

    },

    { root: null, rootMargin: "0px 0px -8% 0px", threshold: 0.12 }

  );



  items.forEach((el) => observer.observe(el));

})();


