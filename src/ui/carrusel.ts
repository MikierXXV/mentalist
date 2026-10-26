import '../carrusel.css';
import { FAMILIAS_CORTAS, obtenerConcepto, reels, type Reel } from '../content';
import { esc, rutaConcepto } from './dom';

/** Las rutas del manifiesto son relativas a `public/`; Vite sirve en `base`. */
function publica(ruta: string): string {
  return `${import.meta.env.BASE_URL}${ruta}`;
}

const ICONO = {
  sonido: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  mudo: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="m17 9 5 6M22 9l-5 6"/>',
  anterior: '<path d="m15 5-7 7 7 7"/>',
  siguiente: '<path d="m9 5 7 7-7 7"/>',
};

const svg = (trazo: string): string => `<svg viewBox="0 0 24 24" aria-hidden="true">${trazo}</svg>`;

function diapositiva(reel: Reel, indice: number): string {
  const concepto = obtenerConcepto(reel.concepto);
  if (!concepto) return '';
  const primero = indice === 0;
  return /* html */ `
    <article
      class="slide"
      data-fam="${concepto.familia}"
      data-video="${esc(publica(reel.video))}"
      role="group"
      aria-roledescription="diapositiva"
      aria-label="${indice + 1} de ${reels.length}"
    >
      <div class="marco" data-marco>
        <img
          src="${esc(publica(reel.poster))}"
          srcset="${esc(publica(reel.miniatura))} 360w, ${esc(publica(reel.poster))} 720w"
          sizes="280px"
          width="720"
          height="1280"
          alt=""
          ${primero ? 'fetchpriority="high"' : 'loading="lazy"'}
          decoding="async"
        />
        <video muted playsinline preload="none" width="720" height="1280"
          aria-label="Reel: ${esc(reel.titulo)}"></video>
        <button type="button" class="slide__play" data-play aria-label="Reproducir el reel">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>
        </button>
        <span class="slide__num">${reel.duracion} s</span>
        <button type="button" class="slide__snd" data-snd aria-pressed="false">
          <span data-snd-ic>${svg(ICONO.mudo)}</span><span data-snd-tx>Activar sonido</span>
        </button>
        <div class="slide__prog" aria-hidden="true"><i></i></div>
      </div>
      <div class="info">
        <span class="fam-t">${esc(FAMILIAS_CORTAS[concepto.familia])}</span>
        <h3><a href="${rutaConcepto(concepto.id)}">${esc(reel.titulo)}</a></h3>
        <p>${esc(concepto.titulo)} · <a class="info__ficha" href="${rutaConcepto(concepto.id)}">Ver la ficha →</a></p>
      </div>
    </article>`;
}

/** Carrusel de reels de la portada: un solo vídeo con `src` a la vez. */
export function renderCarrusel(): string {
  if (!reels.length) return '';
  return /* html */ `
    <section id="reels" class="carrusel scroll-mt-20" aria-roledescription="carrusel" aria-labelledby="titulo-carrusel" data-carrusel>
      <div class="contenedor carrusel__cab">
        <div>
          <h2 id="titulo-carrusel" class="titulo-seccion">Reels</h2>
          <p class="carrusel__sub">Menos de un minuto cada uno. Empiezan en silencio.</p>
        </div>
        <a class="enlace-fuente" href="#/reels">Ver todos los reels →</a>
      </div>
      <div class="car">
        <button type="button" class="flecha flecha--p" data-ant aria-label="Reel anterior">${svg(ICONO.anterior)}</button>
        <button type="button" class="flecha flecha--n" data-sig aria-label="Reel siguiente">${svg(ICONO.siguiente)}</button>
        <div class="pista" data-pista tabindex="0" aria-label="Reels. Desliza o usa las flechas del teclado">
          ${reels.map(diapositiva).join('')}
        </div>
      </div>
      <p class="carrusel__cuenta" aria-live="polite" data-cuenta></p>
    </section>`;
}

let limpiar: (() => void) | undefined;

/** Libera vídeos y escuchas; el router recrea el DOM y un vídeo suelto seguiría sonando. */
export function desmontarCarrusel(): void {
  limpiar?.();
  limpiar = undefined;
}

export function activarCarrusel(raiz: HTMLElement): void {
  desmontarCarrusel();
  const seccion = raiz.querySelector<HTMLElement>('[data-carrusel]');
  const pista = seccion?.querySelector<HTMLElement>('[data-pista]');
  if (!seccion || !pista) return;

  const abort = new AbortController();
  const { signal } = abort;
  const slides = Array.from(pista.children) as HTMLElement[];
  const cuenta = seccion.querySelector<HTMLElement>('[data-cuenta]')!;
  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)');
  let activa = -1;
  let sonido = false;
  let pausadoPorUsuario = false;
  let visible = true;
  // En pantalla táctil nada se descarga ni arranca hasta el primer toque del usuario.
  const tactil = window.matchMedia('(pointer: coarse)').matches;
  let esperaToque = tactil;

  const videoDe = (i: number) => slides[i]?.querySelector<HTMLVideoElement>('video');

  function pintarSonido(i: number): void {
    const s = slides[i];
    const v = videoDe(i);
    if (!s || !v) return;
    const suena = !v.muted;
    const b = s.querySelector<HTMLElement>('[data-snd]')!;
    b.setAttribute('aria-pressed', String(suena));
    b.setAttribute('aria-label', suena ? 'Silenciar el reel' : 'Activar el sonido del reel');
    b.querySelector('[data-snd-tx]')!.textContent = suena ? 'Silenciar' : 'Activar sonido';
    b.querySelector('[data-snd-ic]')!.innerHTML = svg(suena ? ICONO.sonido : ICONO.mudo);
  }

  /** Sin autoplay (política del navegador o movimiento reducido) se ve el póster con ▶. */
  function marcarParado(i: number, parado: boolean): void {
    slides[i]?.classList.toggle('parado', parado);
  }

  function reproducir(i: number): void {
    const v = videoDe(i);
    if (!v) return;
    if (!v.getAttribute('src')) v.src = slides[i]!.dataset.video!;
    v.muted = !sonido;
    const p = v.play();
    marcarParado(i, false);
    if (p) {
      p.then(() => pintarSonido(i)).catch(() => {
        if (!v.muted) {
          // Sin gesto previo el navegador no deja sonar: se reintenta en silencio.
          v.muted = true;
          v.play().then(() => pintarSonido(i)).catch(() => marcarParado(i, true));
        } else {
          marcarParado(i, true);
        }
        pintarSonido(i);
      });
    }
  }

  function activar(i: number): void {
    if (i === activa) return;
    activa = i;
    pausadoPorUsuario = false;
    slides.forEach((s, k) => {
      const v = videoDe(k);
      const on = k === i;
      s.classList.toggle('on', on);
      if (!v) return;
      if (on) {
        if (v.getAttribute('src')) v.currentTime = 0;
        if (esperaToque || reducido.matches || document.hidden || !visible) {
          marcarParado(k, true);
          v.muted = !sonido;
        } else {
          reproducir(k);
        }
        pintarSonido(k);
      } else if (v.getAttribute('src')) {
        v.pause();
        v.removeAttribute('src');
        v.load();
        s.classList.remove('parado');
        s.querySelector<HTMLElement>('.slide__prog i')!.style.width = '0';
      }
    });
    cuenta.textContent = `${i + 1} / ${slides.length}`;
  }

  function irA(i: number): void {
    const n = slides.length;
    const idx = (i + n) % n;
    const s = slides[idx]!;
    pista!.scrollTo({
      left: s.offsetLeft + s.offsetWidth / 2 - pista!.clientWidth / 2,
      behavior: reducido.matches ? 'auto' : 'smooth',
    });
  }

  function masCentrada(): number {
    const medio = pista!.scrollLeft + pista!.clientWidth / 2;
    let mejor = 0;
    let dist = Infinity;
    slides.forEach((s, i) => {
      const d = Math.abs(s.offsetLeft + s.offsetWidth / 2 - medio);
      if (d < dist) {
        dist = d;
        mejor = i;
      }
    });
    return mejor;
  }

  // Solo se escucha el scroll (pasivo): ningún preventDefault, el gesto táctil es el nativo.
  let temporizador: number | undefined;
  pista.addEventListener(
    'scroll',
    () => {
      window.clearTimeout(temporizador);
      temporizador = window.setTimeout(() => activar(masCentrada()), 90);
    },
    { passive: true, signal },
  );

  slides.forEach((s, i) => {
    const v = videoDe(i)!;
    const barra = s.querySelector<HTMLElement>('.slide__prog i')!;
    v.addEventListener('timeupdate', () => {
      if (v.duration) barra.style.width = `${(v.currentTime / v.duration) * 100}%`;
    }, { signal });
    v.addEventListener('ended', () => {
      if (i === activa && !reducido.matches) irA(i + 1);
    }, { signal });

    s.querySelector('[data-snd]')!.addEventListener('click', (e) => {
      e.stopPropagation();
      sonido = v.muted;
      v.muted = !sonido;
      pintarSonido(i);
    }, { signal });

    s.querySelector('[data-marco]')!.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('[data-snd]')) return;
      if (i !== activa) return irA(i);
      if (v.paused) {
        pausadoPorUsuario = false;
        esperaToque = false;
        reproducir(i);
      } else {
        pausadoPorUsuario = true;
        v.pause();
        marcarParado(i, true);
      }
    }, { signal });
  });

  seccion.querySelector('[data-ant]')!.addEventListener('click', () => irA(activa - 1), { signal });
  seccion.querySelector('[data-sig]')!.addEventListener('click', () => irA(activa + 1), { signal });

  seccion.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      irA(activa - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      irA(activa + 1);
    }
  }, { signal });

  function reanudar(): void {
    const v = videoDe(activa);
    if (v && v.paused && !esperaToque && !pausadoPorUsuario && !reducido.matches && visible && !document.hidden) {
      reproducir(activa);
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) videoDe(activa)?.pause();
    else reanudar();
  }, { signal });

  // Fuera de pantalla el reel se calla y se para: no sigue sonando bajo el índice.
  const observador = new IntersectionObserver(([e]) => {
    if (!e) return;
    visible = e.isIntersecting;
    if (!visible) videoDe(activa)?.pause();
    else reanudar();
  }, { threshold: 0.25 });
  observador.observe(seccion);

  limpiar = () => {
    abort.abort();
    observador.disconnect();
    window.clearTimeout(temporizador);
    slides.forEach((_, k) => {
      const v = videoDe(k);
      if (v) {
        v.pause();
        v.removeAttribute('src');
        v.load();
      }
    });
  };

  requestAnimationFrame(() => activar(0));
}
