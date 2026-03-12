/// ================================= HERO =====================================================
document.addEventListener("DOMContentLoaded", () => {
  const video = document.getElementById("heroVideo");
  const overlay = document.getElementById("videoEndOverlay");
  const slideshowEl = document.getElementById("heroSlideshow");
  const volumeBtn = document.getElementById("volumeToggle");
  const heroContent = document.querySelector(".hero-content");
  const heroMore = document.querySelector(".hero-more");
  const nextSection = document.getElementById("next-section");
  const prevBtn = document.getElementById("heroPrev");
  const nextBtn = document.getElementById("heroNext");

  // =========================
  // CONFIG
  // =========================
  const EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
  const TOTAL_IMAGES = 8;

  const SLIDE_MS = 3200;

  // Playlist de videos
  const VIDEO_PLAYLIST = [
    "assets/videos/video_global.mp4",
    "assets/videos/video_auto.mp4",
    "assets/videos/video_moto.mp4"
  ];
  let videoIndex = 0;


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
  let userPaused = false;       // el usuario navegó manualmente
  let resumeTimer = null;       // timer para reanudar autoplay

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

  // Navegar a un slide específico
  function goToSlide(idx) {
    if (!slides.length) return;
    slides[current].classList.remove("is-active");
    current = (idx + slides.length) % slides.length;
    slides[current].classList.add("is-active");
    try {
      document.documentElement.style.setProperty("--blur-bg", `url("${images[current]}")`);
    } catch (e) {}
  }

  // Pausa temporal del autoplay cuando el usuario navega manualmente
  const RESUME_DELAY_MS = 6000;
  function pauseAutoplay() {
    userPaused = true;
    if (resumeTimer) clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => { userPaused = false; }, RESUME_DELAY_MS);
  }

  function startLoop() {
    if (timer) clearInterval(timer);
    if (!slides.length) return;

    timer = setInterval(() => {
      if (!userPaused) goToSlide(current + 1);
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
    // Ya se mostró el overlay → ya transicionó, no repetir
    if (overlay && overlay.classList.contains("visible")) return;
    // Ya está en proceso → no repetir
    if (transitioning) return;

    transitioning = true;

    // Al pasar a imágenes: salimos del modo "solo CTA"
    if (heroContent) heroContent.classList.remove("is-cta");

    // Construir lista de imágenes si todavía no se hizo
    // (puede tardar en producción — por eso lo hacemos ANTES de la UI)
    if (!images.length) await buildImagesList();
    if (!slides.length) buildSlides();

    // Mostrar slideshow
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

    // mostrar frase/botón
    setTimeout(showHeroContent, HERO_CONTENT_DELAY_MS);

    // fade out video + ocultar volumen
    video.classList.add("is-hidden");
    if (volumeBtn) volumeBtn.classList.add("is-hidden");

    // iniciar loop de slideshow
    startLoop();

    // pausar video
    setTimeout(() => {
      try { video.pause(); } catch (e) {}
    }, 120);

    // dock logo (grande -> chico) después de X ms
    setTimeout(dockLogo, HOLD_CENTER_MS);

    // Liberar flag DESPUÉS de todo lo sincrónico
    transitioning = false;
  }

  // =========================
  // FLECHAS: mostrar desde el inicio y conectar lógica
  // =========================
  function showArrows() {
    if (prevBtn) prevBtn.classList.add("is-ready");
    if (nextBtn) nextBtn.classList.add("is-ready");
  }
  // Aparecen apenas carga la página
  showArrows();

  // Precargar lista de imágenes en background para que al hacer click ya esté lista
  buildImagesList().catch(() => {});

  // Helper para cambiar de video
  function goToVideo(idx) {
    if (idx >= VIDEO_PLAYLIST.length) { transitionToSlideshow(); return; }
    if (idx < 0) idx = 0;
    videoIndex = idx;
    video.src = VIDEO_PLAYLIST[videoIndex];
    video.load();
    video.play().catch(() => {});
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", async () => {
      const slideshowActive = slideshowEl && slideshowEl.classList.contains("is-visible");
      if (!slideshowActive) {
        // Video activo → siguiente video (o slideshow si era el último)
        goToVideo(videoIndex + 1);
        return;
      }
      // Slideshow → slide siguiente, o volver al primer video si era el último
      if (slides.length) {
        pauseAutoplay();
        if (current === slides.length - 1) {
          backToVideo(0);  // volver al primer video
        } else {
          goToSlide(current + 1);
        }
      }
    });
  }

  // Volver al video desde el slideshow (idx = índice del video destino, default 0)
  function backToVideo(idx = 0) {
    if (!video) return;

    // Detener autoplay de slides
    if (timer) { clearInterval(timer); timer = null; }
    userPaused = false;

    // Ocultar slideshow
    if (slideshowEl) {
      slideshowEl.classList.remove("is-visible");
      slideshowEl.setAttribute("aria-hidden", "true");
    }

    // Ocultar overlay del logo y hero content
    if (overlay) {
      overlay.classList.remove("visible", "is-docked");
      overlay.setAttribute("aria-hidden", "true");
    }
    if (heroContent) {
      heroContent.classList.remove("is-visible", "is-cta");
    }

    // Volver a mostrar el video y el botón de volumen
    video.classList.remove("is-hidden");
    if (volumeBtn) volumeBtn.classList.remove("is-hidden");

    // Cargar el video destino
    videoIndex = idx;
    video.src = VIDEO_PLAYLIST[videoIndex];
    video.load();
    video.currentTime = 0;
    video.play().catch(() => {});

    // Resetear flag para que transitionToSlideshow pueda correr de nuevo
    transitioning = false;

    // Limpiar slides para que se reconstruyan en la próxima transición
    slides = [];
    if (slideshowEl) slideshowEl.innerHTML = "";
    current = 0;
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", async () => {
      const slideshowActive = slideshowEl && slideshowEl.classList.contains("is-visible");
      if (!slideshowActive) {
        // Video activo → video anterior o reiniciar actual
        if (videoIndex > 0) {
          goToVideo(videoIndex - 1);
        } else {
          video.currentTime = 0;
          video.play().catch(() => {});
        }
        return;
      }
      // Slideshow activo: primer slide → ir al último video
      if (current === 0) {
        backToVideo(VIDEO_PLAYLIST.length - 1);
        return;
      }
      // Slideshow activo: otro slide → slide anterior
      pauseAutoplay();
      goToSlide(current - 1);
    });
  }

  // Playlist: al terminar cada video pasa al siguiente, luego al slideshow
  if (video) {
    video.addEventListener("ended", async () => {
      videoIndex++;
      if (videoIndex < VIDEO_PLAYLIST.length) {
        video.src = VIDEO_PLAYLIST[videoIndex];
        video.load();
        video.play().catch(() => {});
      } else {
        await transitionToSlideshow();
      }
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

    const ease = (t) => t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;

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

/// ================================= SCROLL REVEAL =====================================================
document.addEventListener("DOMContentLoaded", () => {

  // Todos los elementos con data-reveal
  const targets = document.querySelectorAll("[data-reveal]");
  if (!targets.length) return;

  // Si el navegador no soporta IntersectionObserver, los mostramos todos directamente
  if (!("IntersectionObserver" in window)) {
    targets.forEach(el => el.classList.add("is-revealed"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-revealed");
        // Una vez animado, dejamos de observarlo
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15,       // se activa cuando el 15% del elemento es visible
    rootMargin: "0px 0px -40px 0px"  // margen inferior: no dispara antes de que entre bien
  });

  targets.forEach(el => observer.observe(el));
});
/// ================================= FIN SCROLL REVEAL =====================================================
/// ================================= FAQ ACORDEÓN =====================================================
document.addEventListener("DOMContentLoaded", () => {
  const items = document.querySelectorAll(".faq-item");
  if (!items.length) return;

  items.forEach(item => {
    item.addEventListener("toggle", () => {
      // Al abrir uno, cerrar todos los demás
      if (item.open) {
        items.forEach(other => {
          if (other !== item && other.open) other.open = false;
        });
      }
    });
  });
});
/// ================================= FIN FAQ =====================================================

/// ================================= BURGER MENU =====================================================
(function(){
  const burger  = document.querySelector(".nav-burger");
  const menu    = document.getElementById("mobile-menu");
  if (!burger || !menu) return;

  function openMenu(){
    burger.classList.add("is-open");
    menu.classList.add("is-open");
    burger.setAttribute("aria-expanded", "true");
    menu.setAttribute("aria-hidden", "false");
  }

  function closeMenu(){
    burger.classList.remove("is-open");
    menu.classList.remove("is-open");
    burger.setAttribute("aria-expanded", "false");
    menu.setAttribute("aria-hidden", "true");
  }

  burger.addEventListener("click", (e) => {
    e.stopPropagation();
    burger.classList.contains("is-open") ? closeMenu() : openMenu();
  });

  // Cerrar al hacer click fuera
  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && !burger.contains(e.target)){
      closeMenu();
    }
  });

  // Cerrar al hacer click en un link
  menu.querySelectorAll("a").forEach(a => a.addEventListener("click", closeMenu));

  // Cerrar al hacer scroll
  window.addEventListener("scroll", closeMenu, { passive: true });
})();
/// ================================= FIN BURGER =====================================================


/// ================================= MARCAS CARRUSEL =====================================================
document.addEventListener("DOMContentLoaded", () => {
  const track = document.getElementById("brandsTrack");
  if (!track) return;

  // Duplicar los items para scroll infinito continuo
  const items = Array.from(track.children);
  items.forEach(item => {
    const clone = item.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    track.appendChild(clone);
  });
});
/// ================================= FIN MARCAS =====================================================

/// ================================= TESTIMONIOS CAROUSEL (STACK) =====================================================
document.addEventListener("DOMContentLoaded", function () {
  const stack   = document.getElementById("testi-stack");
  const prevBtn = document.getElementById("testi-prev");
  const nextBtn = document.getElementById("testi-next");
  if (!stack) return;

  const cards = Array.from(stack.querySelectorAll(".gs-testimonial-card"));
  const total = cards.length;
  if (!total) return;

  let current   = 0;
  let animating = false;
  let timer     = null;

  const AUTOPLAY_MS = 5500;
  const RISE_MS     = 780;  // duración de gs-card-rise
  const LAND_MS     = 900;  // duración de gs-card-land

  const ALL = ["is-front","is-back-1","is-back-2","anim-rise","anim-land","anim-out"];

  function clear(card) {
    card.classList.remove(...ALL);
    card.style.cssText = "";
  }

  function applyStatic() {
    cards.forEach((card, i) => {
      clear(card);
      const offset = ((i - current) % total + total) % total;
      if      (offset === 0) card.classList.add("is-front");
      else if (offset === 1) card.classList.add("is-back-1");
      else if (offset === 2) card.classList.add("is-back-2");
    });
  }

  function goTo(next) {
    if (animating) return;
    animating = true;

    const prevIdx  = current;
    const nextIdx  = ((next % total) + total) % total;
    const incoming = cards[nextIdx]; // va a aparecer adelante
    const outgoing = cards[prevIdx]; // estaba adelante
    current = nextIdx;

    // Las demás van a sus posiciones sin animación
    cards.forEach((card, i) => {
      if (i === prevIdx || i === nextIdx) return;
      clear(card);
      const offset = ((i - nextIdx) % total + total) % total;
      if      (offset === 1) card.classList.add("is-back-1");
      else if (offset === 2) card.classList.add("is-back-2");
    });

    // Limpiar ambas tarjetas
    incoming.classList.remove(...ALL);
    incoming.style.cssText = "";
    outgoing.classList.remove(...ALL);
    outgoing.style.cssText = "";
    void incoming.offsetWidth;

    // ── FASE 1: incoming sube con z-index BAJO (detrás del frente) ──
    // outgoing se queda al frente visible mientras incoming sube por detrás
    outgoing.classList.add("is-front"); // se queda al frente
    incoming.classList.add("anim-rise"); // sube por detrás, z-index:2

    // ── FASE 2: cuando termina de subir → incoming baja con z-index ALTO ──
    // y outgoing empieza a desvanecerse
    setTimeout(() => {
      incoming.classList.remove("anim-rise");
      void incoming.offsetWidth; // reflow para reiniciar animación
      incoming.classList.add("anim-land"); // baja al frente, z-index:10

      outgoing.classList.remove("is-front");
      outgoing.classList.add("anim-out"); // se desvanece hacia atrás, z-index:1

      // ── Limpieza final ──
      setTimeout(() => {
        applyStatic();
        animating = false;
      }, LAND_MS + 80);

    }, RISE_MS);

    resetTimer();
  }

  function resetTimer() {
    clearInterval(timer);
    timer = setInterval(() => goTo(current + 1), AUTOPLAY_MS);
  }

  if (nextBtn) nextBtn.addEventListener("click", () => goTo(current + 1));
  if (prevBtn) prevBtn.addEventListener("click", () => goTo(current - 1));

  let startX = 0;
  stack.addEventListener("touchstart", e => { startX = e.touches[0].clientX; }, { passive: true });
  stack.addEventListener("touchend", e => {
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) dx < 0 ? goTo(current + 1) : goTo(current - 1);
  });

  applyStatic();
  resetTimer();
});
/// ================================= FIN TESTIMONIOS =====================================================