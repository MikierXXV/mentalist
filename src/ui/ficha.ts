import {
  conceptos,
  FAMILIAS,
  obtenerFuente,
  type Concepto,
} from '../content';
import { esc, formatearFecha, rutaConcepto } from './dom';

function capaOficial(concepto: Concepto): string {
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

  return /* html */ `
    <details class="mt-12 max-w-lectura" data-oficial>
      <summary
        class="cursor-pointer list-none rounded-lg border px-5 py-4 font-display text-lg
          ${esEpisodio ? 'border-dashed border-tenue/40 text-tenue hover:text-texto' : 'border-acento/40 text-acento hover:bg-acento/10'}"
      >
        <span class="inline-flex items-center gap-2">
          <span aria-hidden="true">${esEpisodio ? '🎙' : '＋'}</span>
          ${esc(rotulo)}
        </span>
      </summary>
      <div
        class="oficial ${esEpisodio ? 'oficial--episodio' : 'oficial--propia'} mt-3"
        data-oficial-cuerpo
      >
        ${aviso}
        <p class="leading-relaxed text-texto/90">${esc(oficial.resumen)}</p>
        ${cita}
        ${atribucionCita}
        <ul class="mt-5 space-y-3 border-t pt-4 linea">${enlaces}</ul>
      </div>
    </details>
  `;
}

/** Columna lateral pegajosa: en escritorio la mitad derecha quedaba vacía. */
function lateral(concepto: Concepto): string {
  const fuente = obtenerFuente(concepto.explicacion_oficial.fuente_id);
  const esEpisodio = concepto.explicacion_oficial.tipo_atribucion === 'tema_de_episodio';

  return /* html */ `
    <aside class="hidden lg:block">
      <div class="sticky top-24 flex flex-col gap-4 border-l pl-6 linea">
        <p class="font-display text-4xl text-acento/40">
          ${String(concepto.orden).padStart(2, '0')}
        </p>
        <div>
          <p class="text-xs uppercase tracking-wider text-tenue">Familia</p>
          <p class="mt-1 text-sm text-texto">${esc(FAMILIAS[concepto.familia])}</p>
        </div>
        ${
          fuente
            ? `<div>
                 <p class="text-xs uppercase tracking-wider text-tenue">Fuente</p>
                 <p class="mt-1 text-sm text-texto">${esc(fuente.publicacion)}</p>
                 <span class="mt-2 inline-block ${esEpisodio ? 'distintivo distintivo--podcast' : 'distintivo distintivo--texto'}">
                   ${esEpisodio ? 'Podcast' : 'Fuente textual'}
                 </span>
               </div>`
            : ''
        }
        <a class="enlace-fuente" href="#conceptos">← Todos los conceptos</a>
      </div>
    </aside>
  `;
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
    <nav class="mt-16 flex items-start justify-between gap-6 border-t pt-8 linea">
      ${enlace(anterior, '← Anterior', 'items-start text-left')}
      ${enlace(siguiente, 'Siguiente →', 'items-end text-right')}
    </nav>
  `;
}

export function renderFicha(concepto: Concepto): string {
  const parrafos = concepto.explicacion_didactica
    .map((p) => `<p>${esc(p)}</p>`)
    .join('');

  const experimento = concepto.experimento
    ? /* html */ `
        <aside class="mt-8 max-w-lectura rounded-lg border border-acento/25 bg-acento/[0.06] px-5 py-4">
          <p class="mb-1 text-xs uppercase tracking-wider text-acento">Pruébalo</p>
          <p class="text-[0.95rem] leading-relaxed text-texto/85">${esc(concepto.experimento)}</p>
        </aside>`
    : '';

  const matiz = concepto.nota_matiz
    ? /* html */ `
        <aside class="nota-matiz mt-6 max-w-lectura">
          <p class="mb-1 text-xs uppercase tracking-wider text-tenue">Matiz</p>
          <p>${esc(concepto.nota_matiz)}</p>
        </aside>`
    : '';

  return /* html */ `
    <article class="contenedor py-14" data-ficha="${esc(concepto.id)}">
      <a class="enlace-fuente lg:hidden" href="#conceptos">← Volver al índice</a>

      <div class="mt-6 grid gap-10 lg:mt-0 lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-14">
        <!--
          min-w-0: por defecto un hijo de rejilla no baja de su ancho de contenido
          mínimo, y basta un control con etiqueta larga para estirar la columna
          entera por encima del ancho de la pantalla.
        -->
        <div class="min-w-0">
          <header data-anim="ficha">
            <p class="font-display text-sm text-acento/70 lg:hidden">
              ${String(concepto.orden).padStart(2, '0')}
            </p>
            <h1 class="mt-2 max-w-3xl font-display text-4xl leading-tight tracking-tight sm:text-5xl">
              ${esc(concepto.titulo)}
            </h1>
            <p class="mt-5 max-w-lectura text-lg leading-relaxed text-tenue">
              ${esc(concepto.gancho)}
            </p>
          </header>

          <!--
            El texto va primero a propósito: la visualización remata la lectura en
            vez de competir con ella. Se precarga en segundo plano mientras se lee.
          -->
          <div class="prosa mt-10" data-anim="ficha">${parrafos}</div>
          ${experimento}
          ${matiz}

          <figure class="bloque-viz mt-14" data-bloque-viz>
            <figcaption class="mb-3 text-xs uppercase tracking-wider text-acento">
              Compruébalo tú
            </figcaption>
            <div
              class="lienzo-viz"
              data-viz="${esc(concepto.visualizacion)}"
              role="img"
              aria-label="${esc(concepto.visualizacion_alt)}"
            >
              <div class="esqueleto" data-esqueleto>${esc(concepto.visualizacion_alt)}</div>
            </div>
            <div data-controles-viz></div>
            <p class="mt-3 max-w-lectura text-sm text-tenue">
              ${esc(concepto.visualizacion_alt)}
            </p>
          </figure>

          ${capaOficial(concepto)}
          ${navegacion(concepto)}
        </div>

        ${lateral(concepto)}
      </div>
    </article>
  `;
}
