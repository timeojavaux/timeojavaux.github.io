"use strict";

/* ==========================================================================
   Image thermique
   --------------------------------------------------------------------------
   Des « sources de chaleur » se déplacent lentement ; leur somme donne une
   température, convertie en couleur grâce à la palette --heat-palette du CSS.
   L'image est calculée en basse définition puis floutée en CSS.
   ========================================================================== */

const Thermal = (() => {
  const WIDTH = 120;
  const HEIGHT = 60;

  // Lit la palette dans le CSS : "--heat-palette: #000 #123 …"
  function readPalette() {
    const value = getComputedStyle(document.documentElement).getPropertyValue("--heat-palette").trim();
    return value.split(/\s+/).map((hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)));
  }

  // Positions de départ des sources, décalées selon la graine
  function makeSources(seed) {
    const base = [
      [0.2, 0.4, 0.7],
      [0.6, 0.5, 1],
      [0.85, 0.3, 0.8],
      [0.4, 0.75, 0.6],
      [0.75, 0.8, 0.5],
    ];
    return base.map(([x, y, speed]) => [(x + seed * 0.37) % 1, (y + seed * 0.23) % 1, speed]);
  }

  /**
   * Prépare un canvas thermique.
   * @param {HTMLCanvasElement} canvas
   * @param {object} options
   * @param {number} options.seed     change la disposition des taches
   * @param {boolean} options.animate anime l'image (sinon une seule image fixe)
   * @param {HTMLElement} options.pointerArea zone où la souris « réchauffe » l'image
   */
  function create(canvas, { seed = 0, animate = false, pointerArea = null } = {}) {
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    const ctx = canvas.getContext("2d");
    const image = ctx.createImageData(WIDTH, HEIGHT);
    const palette = readPalette();
    const sources = makeSources(seed);
    const pointer = { x: -9, y: -9 };

    function draw(time) {
      const t = time / 1000 + seed * 7;

      for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
          const u = x / WIDTH;
          const v = y / HEIGHT;
          let heat = 0;

          sources.forEach(([sx, sy, speed], i) => {
            const cx = sx + 0.12 * Math.sin(t * speed * 0.5 + i);
            const cy = sy + 0.18 * Math.cos(t * speed * 0.4 + i * 2);
            heat += 0.018 / (((u - cx) * 2.2) ** 2 + (v - cy) ** 2 + 0.01);
          });
          heat += 0.035 / (((u - pointer.x) * 2.2) ** 2 + (v - pointer.y) ** 2 + 0.012);

          // Température (0 → 1) convertie en couleur par interpolation dans la palette
          const level = Math.min(0.999, heat * 0.55) * (palette.length - 1);
          const index = Math.floor(level);
          const mix = level - index;
          const [a, b] = [palette[index], palette[index + 1]];
          const offset = (y * WIDTH + x) * 4;

          image.data[offset] = a[0] + (b[0] - a[0]) * mix;
          image.data[offset + 1] = a[1] + (b[1] - a[1]) * mix;
          image.data[offset + 2] = a[2] + (b[2] - a[2]) * mix;
          image.data[offset + 3] = 255;
        }
      }
      ctx.putImageData(image, 0, 0);
    }

    draw(0);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!animate || reducedMotion) return;

    // La souris réchauffe l'image
    pointerArea?.addEventListener("pointermove", (event) => {
      const box = canvas.getBoundingClientRect();
      pointer.x = (event.clientX - box.left) / box.width;
      pointer.y = (event.clientY - box.top) / box.height;
    });
    pointerArea?.addEventListener("pointerleave", () => {
      pointer.x = pointer.y = -9;
    });

    // Animation, mise en pause quand l'écran n'est pas visible
    let visible = true;
    new IntersectionObserver(([entry]) => (visible = entry.isIntersecting)).observe(canvas);

    (function loop(time) {
      if (visible && !document.hidden) draw(time);
      requestAnimationFrame(loop);
    })(0);
  }

  return { create };
})();
