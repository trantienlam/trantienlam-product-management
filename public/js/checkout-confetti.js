(function () {
  const canvas = document.getElementById("confetti-canvas");
  if (!canvas) return;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) {
    canvas.remove();
    return;
  }

  const ctx = canvas.getContext("2d");
  const colors = ["#f05423", "#ff7a45", "#10b981", "#3b82f6", "#8b5cf6", "#f59e0b"];
  let particles = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function createParticles() {
    particles = [];
    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        w: Math.random() * 8 + 4,
        h: Math.random() * 5 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: Math.random() * 2.5 + 1.5,
        angle: Math.random() * 6.28,
        spin: (Math.random() - 0.5) * 0.15,
        drift: (Math.random() - 0.5) * 1.5,
      });
    }
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
      p.y += p.speed;
      p.x += p.drift;
      p.angle += p.spin;
      if (p.y > canvas.height + 20) {
        p.y = -20;
        p.x = Math.random() * canvas.width;
      }
    });
    requestAnimationFrame(animate);
  }

  resize();
  createParticles();
  animate();

  window.addEventListener("resize", () => {
    resize();
    createParticles();
  });

  setTimeout(() => {
    canvas.style.transition = "opacity 1.5s";
    canvas.style.opacity = "0";
    setTimeout(() => canvas.remove(), 1500);
  }, 4500);
})();
