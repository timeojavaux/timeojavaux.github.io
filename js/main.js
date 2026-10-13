"use strict";

/* Rendu « bitmap » ------------------------------------------------------- */
// Tramage ordonné (matrice de Bayer 4×4) sur deux couleurs.
// Les couleurs sont lues dans le CSS (--accent et --paper) : changer --accent suffit.

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

function cssColor(name) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const ctx = document.createElement("canvas").getContext("2d");
  ctx.fillStyle = value;
  const hex = ctx.fillStyle; // le navigateur normalise en #rrggbb
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

// Générateur pseudo-aléatoire déterministe : même image à chaque chargement.
function random(seed) {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const gauss = (x, y, cx, cy, sx, sy) => Math.exp(-(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2));

// Champs de valeurs entre 0 et 1, en coordonnées normalisées.
const fields = {
  sky: (x, y) =>
    gauss(x, y, 0.25, 0.35, 0.28, 0.12) +
    gauss(x, y, 0.7, 0.6, 0.22, 0.1) * 0.9 +
    gauss(x, y, 0.9, 0.2, 0.15, 0.08) * 0.7 +
    y * 0.15,
  waves: (x, y) => 0.5 + 0.5 * Math.sin(x * 9 + y * 3),
  orb: (x, y) => Math.hypot(x - 0.5, (y - 0.5) * 0.5) * 2.2,
  bands: (x, y) => x * 0.8 + (Math.floor(y * 6) % 2) * 0.2,
  ridge: (x, y) => 1 - Math.abs(y - 0.5 - 0.25 * Math.sin(x * 7)) * 2.6,
  dune: (x, y) => y * 1.1 - 0.25 + 0.2 * Math.sin(x * 5),
};

/**
 * Dessine un champ tramé dans un canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {(x: number, y: number) => number} field
 * @param {object} options
 * @param {number} options.pixel  taille d'un pixel de trame à l'écran
 * @param {boolean} options.invert  inverse les deux couleurs
 * @param {number} options.streaks  nombre de traînées « glitch »
 * @param {number} options.seed
 */
function dither(canvas, field, { pixel = 4, invert = false, streaks = 14, seed = 1 } = {}) {
  const width = Math.max(1, Math.ceil(canvas.clientWidth / pixel));
  const height = Math.max(1, Math.ceil(canvas.clientHeight / pixel));
  canvas.width = width;
  canvas.height = height;

  const accent = cssColor("--accent");
  const paper = cssColor("--paper");
  const [low, high] = invert ? [paper, accent] : [accent, paper];

  const ctx = canvas.getContext("2d");
  const image = ctx.createImageData(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const value = Math.min(1, Math.max(0, field(x / width, y / height)));
      const color = value > (BAYER[y % 4][x % 4] + 0.5) / 16 ? high : low;
      const i = (y * width + x) * 4;
      image.data.set([...color, 255], i);
    }
  }
  ctx.putImageData(image, 0, 0);

  const rand = random(seed);
  for (let k = 0; k < streaks; k++) {
    const y = Math.floor(rand() * height);
    const x = Math.floor(rand() * width * 0.8);
    const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
    ctx.fillStyle = `rgb(${r} ${g} ${b})`;
    ctx.fillRect(x, y, 6 + Math.floor(rand() * width * 0.3), 1 + Math.floor(rand() * 2));
  }
}

const lang = document.documentElement.lang;
const text = {
  fr: { soon: "capture à venir", view: "Voir les captures de", screenshot: "Capture" },
  en: { soon: "screenshot coming soon", view: "View screenshots of", screenshot: "Screenshot" },
}[lang] ?? {};

/* Bandeau et vignettes tramés ------------------------------------------- */

const sky = document.querySelector(".hero__sky");
const thumbs = [...document.querySelectorAll(".project__media")];
const thumbFields = [fields.waves, fields.orb, fields.bands, fields.ridge, fields.dune];

function paint() {
  if (sky) dither(sky, fields.sky, { pixel: 4, seed: 11 });

  thumbs.forEach((media, index) => {
    const canvas = media.querySelector("canvas");
    const seed = Number(media.dataset.seed) || index + 1;
    dither(canvas, thumbFields[index % thumbFields.length], { pixel: 3, invert: true, seed: seed * 97 });
  });
}

/* Captures d'écran des projets ------------------------------------------ */

const viewer = document.querySelector(".viewer");
const viewerTitle = viewer?.querySelector("#viewer-title");
const viewerCount = viewer?.querySelector(".viewer__count");
const viewerImage = viewer?.querySelector(".viewer__image");
const gallery = { title: "", shots: [], index: 0 };

function showShot(index) {
  const total = gallery.shots.length;
  gallery.index = (index + total) % total; // boucle aux extrémités
  viewerImage.src = gallery.shots[gallery.index];
  viewerImage.alt = `${text.screenshot} ${gallery.index + 1} : ${gallery.title}`;
  viewerCount.textContent = `${gallery.index + 1} / ${total}`;
}

function openViewer(title, shots) {
  gallery.title = title;
  gallery.shots = shots;
  viewerTitle.textContent = title;
  viewer.classList.toggle("viewer--single", shots.length < 2);
  showShot(0);
  viewer.showModal();
}

viewer?.querySelector(".viewer__nav--prev").addEventListener("click", () => showShot(gallery.index - 1));
viewer?.querySelector(".viewer__nav--next").addEventListener("click", () => showShot(gallery.index + 1));
viewer?.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") showShot(gallery.index - 1);
  if (event.key === "ArrowRight") showShot(gallery.index + 1);
});

// Les captures sont trouvées automatiquement dans img/projects/ :
// <data-project>-1.png, <data-project>-2.png… (png, jpg, jpeg, webp ou gif).
const SHOTS_DIR = new URL("../img/projects/", document.currentScript.src);
const EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif"];
const MAX_SHOTS = 10;

function loads(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

async function findShots(name) {
  const shots = [];
  for (let i = 1; i <= MAX_SHOTS; i++) {
    let found = null;
    for (const ext of EXTENSIONS) {
      const src = new URL(`${name}-${i}.${ext}`, SHOTS_DIR).href;
      if (await loads(src)) {
        found = src;
        break;
      }
    }
    if (!found) break;
    shots.push(found);
  }
  return shots;
}

async function setupMedia(media) {
  const title = media.closest(".project").querySelector("h3").textContent;
  const shots = await findShots(media.dataset.project);

  if (shots.length === 0) {
    media.disabled = true;
    media.insertAdjacentHTML("beforeend", `<span class="project__media-label">${text.soon}</span>`);
    return;
  }

  const preview = new Image();
  preview.src = shots[0];
  preview.alt = "";
  media.append(preview);
  media.insertAdjacentHTML(
    "beforeend",
    `<span class="project__zoom" aria-hidden="true">
      <svg viewBox="0 0 16 16" width="14" height="14"><circle cx="6.5" cy="6.5" r="4.5" /><path d="M10 10l4.5 4.5" /></svg>
      ${shots.length}
    </span>`,
  );
  media.setAttribute("aria-label", `${text.view} ${title}`);
  media.addEventListener("click", () => openViewer(title, shots));
}

thumbs.forEach((media) => {
  media.prepend(document.createElement("canvas"));
  if (media.dataset.project) setupMedia(media);
});

viewer?.querySelector(".viewer__close").addEventListener("click", () => viewer.close());
viewer?.addEventListener("click", (event) => {
  if (event.target === viewer) viewer.close();
});

/* Panneau « En savoir plus » --------------------------------------------- */
// Chaque bouton [data-detail="x"] affiche le contenu du <template id="detail-x">.

const drawer = document.querySelector(".drawer");
const drawerContent = drawer?.querySelector(".drawer__content");

document.querySelectorAll("[data-detail]").forEach((button) => {
  const template = document.getElementById(`detail-${button.dataset.detail}`);
  if (!template) return;

  button.addEventListener("click", () => {
    drawerContent.replaceChildren(template.content.cloneNode(true));
    drawer.showModal();
    drawer.scrollTop = 0;
  });
});

drawer?.querySelector(".drawer__close").addEventListener("click", () => drawer.close());
drawer?.addEventListener("click", (event) => {
  if (event.target === drawer) drawer.close();
});

/* Menu sur téléphone ------------------------------------------------------ */

const toggle = document.querySelector(".nav-toggle");
const navList = document.querySelector(".nav-list");

toggle?.addEventListener("click", () => {
  const open = toggle.getAttribute("aria-expanded") === "true";
  toggle.setAttribute("aria-expanded", String(!open));
  navList.classList.toggle("is-open", !open);
});

navList?.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    toggle.setAttribute("aria-expanded", "false");
    navList.classList.remove("is-open");
  }
});

/* Lien actif dans la navigation ----------------------------------------- */

const navLinks = [...document.querySelectorAll('.nav-list a[href^="#"]')];

const observer = new IntersectionObserver(
  (entries) => {
    entries
      .filter((entry) => entry.isIntersecting)
      .forEach((entry) => {
        navLinks.forEach((link) => {
          const active = link.getAttribute("href") === `#${entry.target.id}`;
          if (active) link.setAttribute("aria-current", "true");
          else link.removeAttribute("aria-current");
        });
      });
  },
  { rootMargin: "-40% 0px -55% 0px" },
);

navLinks.forEach((link) => {
  const section = document.querySelector(link.getAttribute("href"));
  if (section) observer.observe(section);
});

/* Démarrage --------------------------------------------------------------- */

paint();

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(paint, 150);
});
