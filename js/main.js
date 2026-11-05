"use strict";

/* ==========================================================================
   Interactions du site
   --------------------------------------------------------------------------
   1. Écrans thermiques (accueil + vignettes)   → rendu dans js/thermal.js
   2. Captures d'écran des projets + visionneuse
   3. Panneau « En savoir plus »
   4. Menu sur téléphone
   5. Lien actif dans la navigation
   ========================================================================== */

const lang = document.documentElement.lang;
const text = {
  fr: { soon: "capture à venir", view: "Voir les captures de", screenshot: "Capture" },
  en: { soon: "screenshot coming soon", view: "View screenshots of", screenshot: "Screenshot" },
}[lang] ?? {};

/* Écrans thermiques ------------------------------------------------------ */
// Le rendu est dans js/thermal.js. L'accueil est animé, les vignettes sont fixes.

const heroScreen = document.querySelector(".hero__screen");
if (heroScreen) {
  Thermal.create(heroScreen.querySelector(".screen__heat"), { animate: true, pointerArea: heroScreen });
}

const thumbs = [...document.querySelectorAll(".project__media")];

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

thumbs.forEach((media, index) => {
  const canvas = document.createElement("canvas");
  canvas.className = "screen__heat";
  canvas.setAttribute("aria-hidden", "true");
  media.prepend(canvas);
  Thermal.create(canvas, { seed: Number(media.dataset.seed) || index + 1 });

  if (media.dataset.project) setupMedia(media);
});

viewer?.querySelector(".viewer__close").addEventListener("click", () => viewer.close());
viewer?.addEventListener("click", (event) => {
  if (event.target === viewer) viewer.close();
});

/* Panneau « En savoir plus » --------------------------------------------- */
// Chaque bouton [data-detail="x"] affiche le contenu du <template id="detail-x">.
// Tant qu'une fiche contient encore un texte « À compléter » (.placeholder),
// son bouton est masqué : il réapparaît tout seul une fois la fiche remplie.

const drawer = document.querySelector(".drawer");
const drawerContent = drawer?.querySelector(".drawer__content");

document.querySelectorAll("[data-detail]").forEach((button) => {
  const template = document.getElementById(`detail-${button.dataset.detail}`);

  if (!template || template.content.querySelector(".placeholder")) {
    button.hidden = true;

    // Si la carte n'a plus aucun bouton visible, on masque aussi leur conteneur
    const actions = button.closest(".project__actions");
    if (actions && !actions.querySelector(":scope > :not([hidden])")) actions.hidden = true;
    return;
  }

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
