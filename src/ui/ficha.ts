import {
  conceptos,
  FAMILIAS,
  obtenerFuente,
  reelDeConcepto,
  type Concepto,
} from '../content';
import { esc, formatearFecha, rutaConcepto } from './dom';
import { renderReel } from './reel';

/*
 * Ficha en bloques. Los títulos de bloque son texto de interfaz; el contenido de
 * la ficha (gancho, párrafos, experimento, escena, capa oficial) sale tal cual
 * del JSON, solo repartido. `scripts/comprobar-texto-fichas.mjs` lo verifica.
 */

const ICONOS = {
  lista: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
  bombilla:
    '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  matraz: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/>',
  escena: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9.5 5 2.5-5 2.5z"/>',
  libro:
    '<path d="M12 6.5C10.5 5 8 4.2 4 4.2V18c4 0 6.5.8 8 2.3 1.5-1.5 4-2.3 8-2.3V4.2c-4 0-6.5.8-8 2.3z"/><path d="M12 6.5v13.8"/>',
  vis: '<path d="M3 20h18M6 20V11M12 20V5M18 20v-7"/>',
  reel: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="m10.5 9.5 4 2.5-4 2.5z"/>',
  mapa: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
} as const;

function icono(nombre: keyof typeof ICONOS, clase = 'ficha-ico'): string {
  return `<svg class="${clase}" viewBox="0 0 24 24" aria-hidden="true">${ICONOS[nombre]}</svg>`;
}

/** Cabecera de bloque: icono tintado con el acento de la familia + título. */
function cabecera(id: string, titulo: string, ico: keyof typeof ICONOS): string {
  return `<h2 id="titulo-${id}" class="ficha-bloque__titulo"><span class="ficha-bloque__ico">${icono(ico)}</span>${esc(titulo)}</h2>`;
}

interface Seccion {
  id: string;
  titulo: string;
}

/** El reel resume la ficha: va tras la visualización, en un bloque propio. */
function bloqueReel(concepto: Concepto): string {
  const reel = reelDeConcepto(concepto.id);
  if (!reel) return '';
  return /* html */ `
    <section id="reel" class="ficha-bloque ficha-bloque--reel" aria-labelledby="titulo-reel">
      ${cabecera('reel', 'En menos de un minuto', 'reel')}
      <div class="ficha-reel">
        ${renderReel(reel, { disposicion: 'lado' })}
      </div>
      <a class="enlace-fuente mt-4" href="#/reels">Ver todos los reels →</a>
    </section>`;
}

function bloqueOficial(concepto: Concepto): string {
  const oficial = concepto.explicacion_oficial;
  const esEpisodio = oficial.tipo_atribucion === 'tema_de_episodio';
  const fuente = obtenerFuente(oficial.fuente_id);

  const rotulo = esEpisodio
    ? 'Tema tratado en este episodio'
    : 'Cómo lo explica Javier Botía';

  const aviso = esEpisodio
    ? /* html */ `
        <p class="mb-4 text-xs uppercase tracking-wider text-tenue/80">
          Resumen de la descripción del episodio, redactada por sus anfitriones ·
          no se le atribuye ninguna formulación textual
        </p>`
    : '';

  const cita = oficial.cita_breve
    ? /* html */ `<blockquote class="cita">«${esc(oficial.cita_breve)}»</blockquote>`
    : '';

  const atribucionCita =
    oficial.cita_breve && fuente
      ? `<p class="-mt-2 mb-4 text-xs text-tenue">Javier Botía, en ${esc(fuente.publicacion)}.</p>`
      : '';

  const enlaces = [oficial.fuente_id, ...(oficial.fuentes_extra ?? [])]
    .map((id) => obtenerFuente(id))
    .filter((f): f is NonNullable<typeof f> => Boolean(f))
    .map((f) => {
      const fecha = formatearFecha(f.fecha);
      return /* html */ `
        <li>
          <a class="enlace-fuente" href="${esc(f.url)}" target="_blank" rel="noopener noreferrer">
            ${esc(f.titulo)} ↗
          </a>
          <span class="block text-xs text-tenue">
            ${esc(f.publicacion)}${fecha ? ` · ${esc(fecha)}` : ''}
          </span>
        </li>`;
    })
    .join('');

  const distintivo = fuente
    ? `<span class="${esEpisodio ? 'distintivo distintivo--podcast' : 'distintivo distintivo--texto'}">
         ${esEpisodio ? 'Podcast' : 'Fuente textual'}
       </span>`
    : '';

  return /* html */ `
    <section id="fuente" class="ficha-bloque" aria-labelledby="titulo-fuente">
      ${cabecera('fuente', 'Qué dice la fuente', 'libro')}
      <div class="oficial ${esEpisodio ? 'oficial--episodio' : 'oficial--propia'}" data-oficial-cuerpo>
        <p class="mb-3 flex flex-wrap items-center gap-3 font-display text-lg text-acento">
          ${esc(rotulo)} ${distintivo}
        </p>
        ${fuente ? `<p class="mb-3 text-sm text-tenue">Fuente: ${esc(fuente.publicacion)}</p>` : ''}
        ${aviso}
        <p class="leading-relaxed text-texto/90">${esc(oficial.resumen)}</p>
        ${cita}
        ${atribucionCita}
        <ul class="mt-5 space-y-3 border-t pt-4 linea">${enlaces}</ul>
      </div>
    </section>`;
}

function navegacion(concepto: Concepto): string {
  const indice = conceptos.findIndex((c) => c.id === concepto.id);
  const anterior = indice > 0 ? conceptos[indice - 1] : undefined;
  const siguiente =
    indice >= 0 && indice < conceptos.length - 1 ? conceptos[indice + 1] : undefined;

  const enlace = (c: Concepto | undefined, etiqueta: string, alinear: string) =>
    c
      ? /* html */ `
          <a class="group flex max-w-[46%] flex-col gap-1 ${alinear}" href="${rutaConcepto(c.id)}">
            <span class="text-xs uppercase tracking-wider text-tenue">${etiqueta}</span>
            <span class="font-display text-lg text-texto group-hover:text-acentoClaro">
              ${esc(c.titulo)}
            </span>
          </a>`
      : '<span></span>';

  return /* html */ `
    <nav class="linea mt-14 flex items-start justify-between gap-6 border-t pt-8" aria-label="Otras fichas">
      ${enlace(anterior, '← Anterior', 'items-start text-left')}
      ${enlace(siguiente, 'Siguiente →', 'items-end text-right')}
    </nav>
  `;
}

function indice(secciones: Seccion[]): { escritorio: string; movil: string } {
  const enlaces = secciones
    .map((s) => `<li><a href="#${s.id}" data-ir="${s.id}">${esc(s.titulo)}</a></li>`)
    .join('');
  return {
    escritorio: /* html */ `
      <aside class="ficha-toc" aria-label="En esta página">
        <p class="ficha-toc__titulo">En esta página</p>
        <ol>${enlaces}</ol>
      </aside>`,
    movil: /* html */ `
      <details class="ficha-toc-movil">
        <summary>En esta página</summary>
        <nav aria-label="En esta página"><ol>${enlaces}</ol></nav>
      </details>`,
  };
}

export function renderFicha(concepto: Concepto): string {
  const reel = reelDeConcepto(concepto.id);
  const iAnalogia = concepto.analogia_indice;
  const analogia = iAnalogia === undefined ? undefined : concepto.explicacion_didactica[iAnalogia];
  const parrafos = concepto.explicacion_didactica
    .filter((_, i) => i !== iAnalogia)
    .map((p) => `<p>${esc(p)}</p>`)
    .join('');

  const secciones: Seccion[] = [{ id: 'viz', titulo: 'Compruébalo tú' }];
  if (reel) secciones.push({ id: 'reel', titulo: 'En menos de un minuto' });
  secciones.push({ id: 'como', titulo: 'Cómo funciona' });
  if (analogia !== undefined) secciones.push({ id: 'analogia', titulo: 'Piénsalo así' });
  secciones.push(
    { id: 'pruebalo', titulo: 'Pruébalo' },
    { id: 'escena', titulo: 'Una escena real' },
    { id: 'fuente', titulo: 'Qué dice la fuente' },
  );
  const toc = indice(secciones);

  const matiz = concepto.nota_matiz
    ? /* html */ `
        <aside class="nota-matiz mt-6 max-w-lectura">
          <p class="mb-1 text-xs uppercase tracking-wider text-tenue">Matiz</p>
          <p>${esc(concepto.nota_matiz)}</p>
        </aside>`
    : '';

  const bloqueAnalogia =
    analogia === undefined
      ? ''
      : /* html */ `
    <section id="analogia" class="ficha-bloque" aria-labelledby="titulo-analogia">
      ${cabecera('analogia', 'Piénsalo así', 'bombilla')}
      <div class="ficha-analogia">
        <span class="ficha-analogia__ico">${icono('mapa', 'ficha-ico ficha-ico--grande')}</span>
        <p>${esc(analogia)}</p>
      </div>
    </section>`;

  return /* html */ `
    <article class="contenedor ficha py-8 sm:py-12" data-ficha="${esc(concepto.id)}" data-fam="${esc(concepto.familia)}">
      <nav class="ficha-migas" aria-label="Migas">
        <a href="#conceptos">Todos los conceptos</a>
        <span aria-hidden="true">/</span>
        <span class="ficha-etiqueta"><i aria-hidden="true"></i>${esc(FAMILIAS[concepto.familia])}</span>
      </nav>

      <div class="ficha__rejilla">
        <!-- min-w-0: un hijo de rejilla no baja de su ancho de contenido mínimo. -->
        <div class="min-w-0">
          <header class="ficha-cab" data-anim="ficha">
            <p class="ficha-cab__num">${String(concepto.orden).padStart(2, '0')}</p>
            <h1 class="font-display text-4xl leading-tight tracking-tight sm:text-5xl">
              ${esc(concepto.titulo)}
            </h1>
            <div class="ficha-idea">
              <p class="ficha-idea__rotulo">En una frase</p>
              <p>${esc(concepto.gancho)}</p>
            </div>
          </header>

          ${toc.movil}

          <!--
            Cruza todo el ancho de la columna. El marco da cabecera y rejilla de
            puntos al lienzo; «Qué estás viendo» es la descripción textual.
          -->
          <section id="viz" class="ficha-bloque" aria-labelledby="titulo-viz">
            ${cabecera('viz', 'Compruébalo tú', 'vis')}
            <figure class="bloque-viz ficha-marco" data-bloque-viz>
              <div class="lienzo-viz" data-viz="${esc(concepto.visualizacion)}"
                role="img" aria-label="${esc(concepto.visualizacion_alt)}">
                <div class="esqueleto" data-esqueleto>${esc(concepto.visualizacion_alt)}</div>
              </div>
              <div data-controles-viz></div>
              <figcaption class="ficha-marco__pie">${esc(concepto.visualizacion_alt)}</figcaption>
            </figure>
          </section>

          ${bloqueReel(concepto)}

          <section id="como" class="ficha-bloque" aria-labelledby="titulo-como">
            ${cabecera('como', 'Cómo funciona', 'lista')}
            <div class="prosa">${parrafos}</div>
            ${matiz}
          </section>

          ${bloqueAnalogia}

          <section id="pruebalo" class="ficha-bloque" aria-labelledby="titulo-pruebalo">
            ${cabecera('pruebalo', 'Pruébalo', 'matraz')}
            <div class="ficha-prueba"><p>${esc(concepto.experimento)}</p></div>
          </section>

          <section id="escena" class="ficha-bloque" aria-labelledby="titulo-escena">
            ${cabecera('escena', 'Una escena real', 'escena')}
            <div class="ficha-escena">
              <p class="ficha-escena__titulo">${esc(concepto.ejemplo_real.escena)}</p>
              <p>${esc(concepto.ejemplo_real.texto)}</p>
              <p class="mt-4 text-xs text-tenue">
                Situación escrita para este sitio a modo de ilustración. No procede de
                Javier Botía ni de ninguna de las fuentes citadas.
              </p>
            </div>
          </section>

          ${bloqueOficial(concepto)}
          ${navegacion(concepto)}
        </div>

        ${toc.escritorio}
      </div>
    </article>
  `;
}

/** Índice «En esta página»: salto suave sin tocar el hash (que es la ruta) y sección actual. */
export function activarFicha(raiz: HTMLElement): void {
  const enlaces = Array.from(raiz.querySelectorAll<HTMLAnchorElement>('[data-ir]'));
  if (!enlaces.length) return;
  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const marcar = (id: string) => {
    for (const a of enlaces) {
      if (a.dataset.ir === id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    }
  };

  for (const a of enlaces) {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const destino = raiz.querySelector<HTMLElement>(`#${a.dataset.ir}`);
      if (!destino) return;
      destino.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'start' });
      marcar(destino.id);
      a.closest('details')?.removeAttribute('open');
    });
  }

  const secciones = enlaces
    .map((a) => raiz.querySelector<HTMLElement>(`#${a.dataset.ir}`))
    .filter((s): s is HTMLElement => Boolean(s));
  const visibles = new Set<string>();
  const observador = new IntersectionObserver(
    (entradas) => {
      for (const e of entradas) {
        if (e.isIntersecting) visibles.add(e.target.id);
        else visibles.delete(e.target.id);
      }
      const primero = secciones.find((s) => visibles.has(s.id));
      if (primero) marcar(primero.id);
    },
    { rootMargin: '-15% 0px -65% 0px' },
  );
  secciones.forEach((s) => observador.observe(s));
}
