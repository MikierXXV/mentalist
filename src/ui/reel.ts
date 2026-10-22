import { obtenerConcepto, type Reel } from '../content';
import { esc, rutaConcepto } from './dom';

/** Las rutas del manifiesto son relativas a `public/`; Vite sirve en `base`. */
function publica(ruta: string): string {
  return `${import.meta.env.BASE_URL}${ruta}`;
}

function duracionLegible(segundos: number): string {
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;
}

const ICONO_PLAY = /* html */ `
  <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
    <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />
  </svg>`;

/**
 * Póster con botón de reproducir. El `<video>` no existe hasta que se pulsa: así
 * una página con varios reels solo descarga imágenes ligeras, y como el arranque
 * lo provoca el propio usuario, el vídeo puede sonar sin chocar con las
 * políticas de autoplay.
 */
function fachada(reel: Reel, modo: 'linea' | 'dialogo', tamanos: string): string {
  const accion = modo === 'linea' ? 'Reproducir' : 'Abrir y reproducir';
  return /* html */ `
    <button
      type="button"
      class="reel__fachada"
      data-reel-play="${modo}"
      data-reel-id="${esc(reel.concepto)}"
      aria-label="${accion} el reel «${esc(reel.titulo)}» (${duracionLegible(reel.duracion)}, con sonido y subtítulos)"
    >
      <img
        src="${esc(publica(reel.poster))}"
        srcset="${esc(publica(reel.miniatura))} 360w, ${esc(publica(reel.poster))} 720w"
        sizes="${tamanos}"
        width="720"
        height="1280"
        alt=""
        loading="lazy"
        decoding="async"
      />
      <span class="reel__play">${ICONO_PLAY}</span>
      <span class="reel__duracion">${duracionLegible(reel.duracion)}</span>
    </button>`;
}

/** Descripción, transcripción y fuentes: el reel se entiende sin verlo. */
function accesible(reel: Reel): string {
  const frases = reel.transcripcion.map((f) => `<li>${esc(f)}</li>`).join('');
  return /* html */ `
    <details class="reel__detalles">
      <summary>Qué se ve y qué se dice</summary>
      <p class="mt-3" id="reel-desc-${esc(reel.concepto)}">${esc(reel.descripcion)}</p>
      <p class="mt-4 text-xs uppercase tracking-wider text-tenue">Transcripción</p>
      <ol class="reel__transcripcion">${frases}</ol>
      ${reel.fuentes ? `<p class="mt-4 text-xs leading-relaxed text-tenue">Fuentes: ${esc(reel.fuentes)}</p>` : ''}
    </details>`;
}

/**
 * Reel que se reproduce en su sitio. `lado` pone el texto junto al vídeo a
 * partir de `sm` (ficha); `columna` lo deja debajo (página de reels).
 */
export function renderReel(
  reel: Reel,
  { disposicion, enlaceFicha = false }: { disposicion: 'lado' | 'columna'; enlaceFicha?: boolean },
): string {
  const concepto = obtenerConcepto(reel.concepto);
  const enlace =
    enlaceFicha && concepto
      ? `<a class="enlace-fuente mt-3" href="${rutaConcepto(concepto.id)}">Leer la ficha: ${esc(concepto.titulo)} →</a>`
      : '';

  return /* html */ `
    <figure class="reel reel--${disposicion}" data-reel="${esc(reel.concepto)}">
      <div class="reel__pantalla">
        ${fachada(reel, 'linea', disposicion === 'lado' ? '(min-width: 640px) 16rem, 80vw' : '(min-width: 640px) 20rem, 90vw')}
      </div>
      <figcaption class="reel__pie">
        <p class="reel__titulo">${esc(reel.titulo)}</p>
        ${enlace}
        ${accesible(reel)}
      </figcaption>
    </figure>`;
}

/** Miniatura que abre el reel en un diálogo; para las tiras de cada familia. */
export function renderMiniaturaReel(reel: Reel): string {
  return /* html */ `
    <li class="reel-mini">
      ${fachada(reel, 'dialogo', '9rem')}
      <p class="reel-mini__titulo">${esc(reel.titulo)}</p>
    </li>`;
}

function crearVideo(reel: Reel): HTMLVideoElement {
  const video = document.createElement('video');
  video.className = 'reel__video';
  video.controls = true;
  video.playsInline = true;
  video.preload = 'metadata';
  video.poster = publica(reel.poster);
  video.src = publica(reel.video);
  video.width = 720;
  video.height = 1280;
  video.setAttribute('aria-label', `Reel: ${reel.titulo}`);
  video.setAttribute('aria-describedby', `reel-desc-${reel.concepto}`);
  return video;
}

let dialogo: HTMLDialogElement | undefined;

function obtenerDialogo(): HTMLDialogElement {
  if (dialogo) return dialogo;
  dialogo = document.createElement('dialog');
  dialogo.className = 'reel-dialogo';
  dialogo.setAttribute('aria-labelledby', 'reel-dialogo-titulo');
  dialogo.innerHTML = /* html */ `
    <div class="reel-dialogo__marco">
      <button type="button" class="reel-dialogo__cerrar" data-cerrar aria-label="Cerrar el reel">✕</button>
      <div class="reel__pantalla" data-pantalla></div>
      <div class="reel-dialogo__texto">
        <h2 id="reel-dialogo-titulo" class="reel__titulo" data-titulo></h2>
        <div data-pie></div>
      </div>
    </div>`;
  document.body.append(dialogo);

  const d = dialogo;
  d.querySelector('[data-cerrar]')!.addEventListener('click', () => d.close());
  // Un clic fuera del marco cae sobre el propio <dialog> (el fondo).
  d.addEventListener('click', (evento) => {
    if (evento.target === d) d.close();
  });
  // Al cerrar se retira el vídeo: deja de sonar y libera la descarga.
  d.addEventListener('close', () => {
    d.querySelector('[data-pantalla]')!.innerHTML = '';
  });
  return d;
}

function abrirEnDialogo(reel: Reel): void {
  const d = obtenerDialogo();
  const concepto = obtenerConcepto(reel.concepto);
  d.querySelector('[data-titulo]')!.textContent = reel.titulo;
  d.querySelector('[data-pie]')!.innerHTML = `
    ${concepto ? `<a class="enlace-fuente" href="${rutaConcepto(concepto.id)}">Leer la ficha: ${esc(concepto.titulo)} →</a>` : ''}
    ${accesible(reel)}`;
  const video = crearVideo(reel);
  d.querySelector('[data-pantalla]')!.append(video);
  d.showModal();
  void video.play().catch(() => undefined);
}

/** Cierra el diálogo si está abierto; el router lo llama al cambiar de vista. */
export function cerrarDialogoReel(): void {
  if (dialogo?.open) dialogo.close();
}

/**
 * Un único manejador delegado para todos los reels de cualquier vista, así que
 * se llama una sola vez al arrancar.
 */
export function activarReels(reels: Reel[]): void {
  document.addEventListener('click', (evento) => {
    const boton = (evento.target as Element | null)?.closest<HTMLButtonElement>('[data-reel-play]');
    if (!boton) return;
    const reel = reels.find((r) => r.concepto === boton.dataset.reelId);
    if (!reel) return;

    if (boton.dataset.reelPlay === 'dialogo') {
      abrirEnDialogo(reel);
      return;
    }
    const video = crearVideo(reel);
    boton.replaceWith(video);
    video.focus();
    void video.play().catch(() => undefined);
  });

  // Solo suena un reel a la vez. `play` no burbujea: se escucha en captura.
  document.addEventListener(
    'play',
    (evento) => {
      document.querySelectorAll<HTMLVideoElement>('video.reel__video').forEach((otro) => {
        if (otro !== evento.target) otro.pause();
      });
    },
    true,
  );
}
