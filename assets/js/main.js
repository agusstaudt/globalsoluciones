
/// ================================= HERO =====================================================
document.addEventListener("DOMContentLoaded", () => {
  const video = document.getElementById("heroVideo");
  const overlay = document.getElementById("videoEndOverlay");
  const slideshowEl = document.getElementById("heroSlideshow");
  const volumeBtn = document.getElementById("volumeToggle");
  const heroContent = document.querySelector(".hero-content");
  const heroMore = document.querySelector(".hero-more");
  const nextSection = document.getElementById("next-section");

  // =========================
  // CONFIG
  // =========================
  const EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
  const TOTAL_IMAGES = 8;

  const SLIDE_MS = 3200;

  // cuánto tiempo queda el logo grande (antes de pasar a chico)
  const HOLD_CENTER_MS = 6000;

  // delay para mostrar frase/botón (si querés que aparezca junto al logo grande, ponelo en 0)
  const HERO_CONTENT_DELAY_MS = 0;

  // DEBUG: forzar transición rápido (0 para desactivar)
  const DEBUG_FORCE_END_MS = 0;

  // cuánto tiempo mostrar el CTA final (frase + botón) antes de permitir scroll (si es que el usuario no hace click). IMPORTANTE: debe ser mayor o igual a HERO_CONTENT_DELAY_MS
  const CTA_SHOW_MS = 12000;

  // =========================
  // Slideshow state
  // =========================
  let images = [];
  let slides = [];
  let current = 0;
  let timer = null;
  let transitioning = false;

  // =========================
  // VOLUME
  // =========================
  function updateVolumeIcon() {
    if (!volumeBtn || !video) return;
    if (video.muted) {
      volumeBtn.classList.add("is-muted");
      volumeBtn.setAttribute("aria-pressed", "false");
      volumeBtn.setAttribute("aria-label", "Activar sonido");
    } else {
      volumeBtn.classList.remove("is-muted");
      volumeBtn.setAttribute("aria-pressed", "true");
      volumeBtn.setAttribute("aria-label", "Silenciar");
    }
  }

  if (volumeBtn && video) {
    volumeBtn.addEventListener("click", () => {
      video.muted = !video.muted;
      updateVolumeIcon();
      if (video.paused) video.play().catch(() => {});
    });
    updateVolumeIcon();
  }

  // =========================
  // Helpers: detectar imágenes
  // =========================
  function imageExists(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }

  async function resolveMainImagePath(index) {
    for (const ext of EXTENSIONS) {
      const url = `assets/img/main${index}.${ext}`;
      // eslint-disable-next-line no-await-in-loop
      const ok = await imageExists(url);
      if (ok) return url;
    }
    return null;
  }

  async function buildImagesList() {
    const found = [];
    for (let i = 1; i <= TOTAL_IMAGES; i++) {
      // eslint-disable-next-line no-await-in-loop
      const url = await resolveMainImagePath(i);
      if (url) found.push(url);
      else console.warn(`No se encontró main${i} (jpg/jpeg/png/webp)`);
    }
    if (!found.length) found.push("assets/img/main1.jpg");
    images = found;
  }

  // =========================
  // Slideshow
  // =========================
  function buildSlides() {
    if (!slideshowEl) return;
    slideshowEl.innerHTML = "";
    slides = images.map((src, idx) => {
      const d = document.createElement("div");
      d.className = "hero-slide" + (idx === 0 ? " is-active" : "");
      d.style.backgroundImage = `url("${src}")`;
      slideshowEl.appendChild(d);
      return d;
    });
  }

  function startLoop() {
    if (timer) clearInterval(timer);
    if (!slides.length) return;

    timer = setInterval(() => {
      const prev = current;
      current = (current + 1) % slides.length;
      slides[prev].classList.remove("is-active");
      slides[current].classList.add("is-active");

      // actualizar fondo suave para “integrar” con la imagen actual
      try {
        document.documentElement.style.setProperty("--blur-bg", `url("${images[current]}")`);
      } catch (e) {}
    }, SLIDE_MS);
  }

  // =========================
  // UI helpers
  // =========================
  function showOverlay() {
    if (!overlay) return;
    overlay.classList.add("visible");
    overlay.setAttribute("aria-hidden", "false");
  }

  function dockLogo() {
    if (!overlay) return;
    overlay.classList.add("is-docked");
  }

  function showHeroContent() {
    if (!heroContent) return;
    heroContent.classList.add("is-visible");
  }

  // =========================
  // Mostrar botón SABER MÁS después de X ms (en caso de que el usuario no haga click y no se note la transición)
  // =========================
  if (heroMore && heroContent) {
    setTimeout(() => {
      // si ya transicionaste a imágenes, no hace falta
      if (overlay && overlay.classList.contains("visible")) return;

      // mostramos el contenedor pero en modo "solo CTA"
      heroContent.classList.add("is-cta");
      heroMore.classList.add("is-early");
    }, CTA_SHOW_MS);
  }
  // =========================
  // Transition: video -> slideshow
  // =========================
  async function transitionToSlideshow() {
    if (!video || transitioning) return;

    // Al pasar a imágenes: salimos del modo "solo CTA"
    if (heroContent) heroContent.classList.remove("is-cta");
    // if (heroMore) heroMore.classList.remove("is-early");

    if (overlay && overlay.classList.contains("visible")) return;

    transitioning = true;

    if (!images.length) await buildImagesList();
    if (!slides.length) buildSlides();

    if (slideshowEl) {
      slideshowEl.classList.add("is-visible");
      slideshowEl.setAttribute("aria-hidden", "false");
    }

    if (slides.length) {
      slides.forEach((s, i) => s.classList.toggle("is-active", i === 0));
      current = 0;
    }

    try {
      document.documentElement.style.setProperty("--blur-bg", `url("${images[0]}")`);
    } catch (e) {}

    // overlay (logo grande)
    showOverlay();

    // mostrar frase/botón (junto al logo grande si delay=0)
    setTimeout(showHeroContent, HERO_CONTENT_DELAY_MS);

    // fade out video + ocultar volumen
    video.classList.add("is-hidden");
    if (volumeBtn) volumeBtn.classList.add("is-hidden");

    // loop
    startLoop();

    // pausar video
    setTimeout(() => {
      try { video.pause(); } catch (e) {}
    }, 120);

    // dock (grande->chico) DESPUÉS de X ms
    setTimeout(dockLogo, HOLD_CENTER_MS);

    transitioning = false;
  }

  if (video) video.addEventListener("ended", transitionToSlideshow);

  if (video) {
    video.addEventListener("timeupdate", () => {
      if (!video.duration) return;
      if (video.currentTime >= video.duration - 0.25) transitionToSlideshow();
    });
  }

  if (DEBUG_FORCE_END_MS > 0) {
    setTimeout(() => transitionToSlideshow(), DEBUG_FORCE_END_MS);
  }

  // =========================
  // Scroll suave SABER MÁS
  // =========================
  const SCROLL_DURATION_MS = 1000;

  function smoothScrollTo(targetY, duration = 1600) {
    const startY = window.pageYOffset;
    const diff = targetY - startY;
    const start = performance.now();

    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    function step(now) {
      const t = Math.min(1, (now - start) / duration);
      window.scrollTo(0, startY + diff * ease(t));
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  const heroMoreBtn = document.getElementById("heroMore");
  const nextSectionEl = document.getElementById("next-section");

  if (heroMoreBtn && nextSectionEl) {
    heroMoreBtn.addEventListener("click", (e) => {
      e.preventDefault();
      // Scroll exacto al top de la sección para que llene 100vh
      const y = Math.round(nextSectionEl.getBoundingClientRect().top + window.pageYOffset);
      smoothScrollTo(y, SCROLL_DURATION_MS);
    });
  }
});


/// ================================= FIN HERO =====================================================

// =========================
// Cards: rotación de imágenes por box (motos/autos/hogar)
// =========================
document.addEventListener("DOMContentLoaded", () => {
  const EXT = ["jpg","jpeg","png","webp"];
  const INTERVAL_MS = 3200;
  const FADE_MS = 450;

  function imgExists(url){
    return new Promise((resolve) => {
      const im = new Image();
      im.onload = () => resolve(true);
      im.onerror = () => resolve(false);
      im.src = url;
    });
  }

  async function resolveAnyExt(folder, name){
    for (const ext of EXT){
      const url = `${folder}/${name}.${ext}`;
      // eslint-disable-next-line no-await-in-loop
      if (await imgExists(url)) return url;
    }
    return null;
  }

  async function initCard(card){
    const folder = card.dataset.folder || "assets/img";
    const names = (card.dataset.images || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    if (!names.length) return;

    // resolver urls existentes (con extensión real)
    const urls = [];
    for (const n of names){
      // eslint-disable-next-line no-await-in-loop
      const u = await resolveAnyExt(folder, n);
      if (u) urls.push(u);
    }

    if (urls.length <= 1) return;

    const img = card.querySelector(".gs-card__img");
    if (!img) return;

    // si el src actual no está en urls, forzamos primero
    if (!urls.includes(img.getAttribute("src"))) {
      img.src = urls[0];
    }

    let i = urls.indexOf(img.getAttribute("src"));
    if (i < 0) i = 0;

    setInterval(() => {
      i = (i + 1) % urls.length;

      // fade out
      img.style.transition = `opacity ${FADE_MS}ms ease, transform .35s ease`;
      img.style.opacity = "0";

      setTimeout(() => {
        img.src = urls[i];

        // cuando carga, vuelve
        const onLoad = () => {
          img.style.opacity = "1";
          img.removeEventListener("load", onLoad);
        };
        img.addEventListener("load", onLoad);

        // fallback por cache
        setTimeout(() => (img.style.opacity = "1"), 80);
      }, FADE_MS);
    }, INTERVAL_MS);
  }

  document.querySelectorAll(".gs-card[data-images]").forEach((card) => {
    initCard(card);
  });
});

// =========================
// FIN Cards
// =========================



// =========================
// GS Split: rotación de imágenes (Quiénes somos)
// =========================
document.addEventListener("DOMContentLoaded", () => {
  const EXT = ["jpg", "jpeg", "png", "webp"];
  const INTERVAL_MS = 3200;
  const FADE_MS = 450;

  function imgExists(url) {
    return new Promise((resolve) => {
      const im = new Image();
      im.onload = () => resolve(true);
      im.onerror = () => resolve(false);
      im.src = url;
    });
  }

  async function resolveAnyExt(folder, name) {
    for (const ext of EXT) {
      const url = `${folder}/${name}.${ext}`;
      // eslint-disable-next-line no-await-in-loop
      if (await imgExists(url)) return url;
    }
    return null;
  }

  async function initSplitRotator(container) {
    const folder = container.dataset.folder || "assets/img";
    const names = (container.dataset.images || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!names.length) return;

    const urls = [];
    for (const n of names) {
      // eslint-disable-next-line no-await-in-loop
      const u = await resolveAnyExt(folder, n);
      if (u) urls.push(u);
    }
    if (urls.length <= 1) return;

    const img = container.querySelector("img");
    if (!img) return;

    // setea la primera encontrada (por si el src inicial no coincide)
    img.src = urls[0];

    let i = 0;
    setInterval(() => {
      i = (i + 1) % urls.length;

      img.classList.add("is-fading");

      setTimeout(() => {
        img.src = urls[i];
        img.onload = () => {
          img.classList.remove("is-fading");
        };
        // fallback por si cache
        setTimeout(() => img.classList.remove("is-fading"), 80);
      }, FADE_MS);
    }, INTERVAL_MS);
  }

  const splitMedia = document.querySelector(".gs-split__media[data-images]");
  if (splitMedia) initSplitRotator(splitMedia);
});