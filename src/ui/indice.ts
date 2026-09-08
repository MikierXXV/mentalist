import {
  conceptosPorFamilia,
  FAMILIAS_CORTAS,
  obtenerFuente,
  type Concepto,
} from '../content';
import { esc, rutaConcepto } from './dom';

function distintivoFuente(concepto: Concepto): string {
  const esEpisodio =
    concepto.explicacion_oficial.tipo_atribucion === 'tema_de_episodio';
  const fuente = obtenerFuente(concepto.explicacion_oficial.fuente_id);
  const publicacion = fuente ? esc(fuente.publicacion) : '';

  return esEpisodio
    ? `<span class="distintivo distintivo--podcast" title="Fuente: ${publicacion}">Podcast</span>`
    : `<span class="distintivo distintivo--texto" title="Fuente: ${publicacion}">Fuente textual</span>`;
}

function tarjeta(concepto: Concepto): string {
  const numero = String(concepto.orden).padStart(2, '0');
  return /* html */ `
    <li data-anim="tarjeta">
      <a class="tarjeta group" href="${rutaConcepto(concepto.id)}" data-tarjeta="${esc(concepto.id)}">
        <!--
          Número y distintivo comparten línea. Con el distintivo en fila propia,
          cada una de las 16 tarjetas gastaba una tercera fila en móvil para una
          distinción secundaria.
        -->
        <span class="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span class="tarjeta__numero">${numero}</span>
          ${distintivoFuente(concepto)}
        </span>
        <h3 class="tarjeta__titulo group-hover:text-acentoClaro">${esc(concepto.titulo)}</h3>
        <p class="tarjeta__gancho">${esc(concepto.gancho)}</p>
      </a>
    </li>
  `;
}

export function renderIndice(): string {
  const grupos = conceptosPorFamilia().filter((grupo) => grupo.conceptos.length > 0);

  const filtros = [
    { id: 'todas', titulo: 'Todas', cuenta: grupos.reduce((n, g) => n + g.conceptos.length, 0) },
    ...grupos.map((g) => ({
      id: g.familia,
      titulo: FAMILIAS_CORTAS[g.familia],
      cuenta: g.conceptos.length,
    })),
  ]
    .map(
      (f, indice) => /* html */ `
        <button
          type="button"
          class="pildora"
          data-familia="${esc(f.id)}"
          aria-pressed="${indice === 0}"
        >
          ${esc(f.titulo)}
          <span class="pildora__cuenta">${f.cuenta}</span>
        </button>`,
    )
    .join('');

  const secciones = grupos
    .map(
      (grupo) => /* html */ `
        <section
          class="mt-12 first:mt-0"
          data-grupo="${grupo.familia}"
          aria-labelledby="familia-${grupo.familia}"
        >
          <h3
            id="familia-${grupo.familia}"
            class="linea mb-6 border-b pb-3 font-display text-sm uppercase tracking-[0.2em] text-acento"
          >
            ${esc(grupo.titulo)}
          </h3>
          <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 4xl:grid-cols-5">
            ${grupo.conceptos.map(tarjeta).join('')}
          </ul>
        </section>
      `,
    )
    .join('');

  return /* html */ `
    <section id="conceptos" class="contenedor scroll-mt-20 py-20" aria-labelledby="titulo-conceptos">
      <h2 id="titulo-conceptos" class="titulo-seccion">Los conceptos</h2>
      <p class="mt-4 max-w-lectura leading-relaxed text-tenue">
        Cada ficha tiene dos capas: una explicación propia del fenómeno, escrita
        desde cero, y debajo, plegado, cómo aparece el tema en la fuente original.
      </p>
      <p class="mt-3 max-w-lectura text-sm leading-relaxed text-tenue">
        «Fuente textual» significa que la fuente recoge palabras suyas. «Podcast»,
        que solo consta que el tema se trata en ese episodio.
      </p>

      <div
        class="mt-8 flex flex-wrap gap-2"
        role="group"
        aria-label="Filtrar conceptos por familia"
        data-filtros-indice
      >${filtros}</div>

      <div class="mt-10">${secciones}</div>
    </section>
  `;
}

/**
 * Filtro por familia. Con 16 conceptos en una sola columna, el índice ocupaba
 * más de cinco pantallas de móvil; con un toque se reduce a una familia.
 */
export function activarIndice(raiz: HTMLElement): void {
  const botones = Array.from(raiz.querySelectorAll<HTMLButtonElement>('[data-familia]'));
  const secciones = Array.from(raiz.querySelectorAll<HTMLElement>('[data-grupo]'));
  if (!botones.length || !secciones.length) return;

  botones.forEach((boton) => {
    boton.addEventListener('click', () => {
      const familia = boton.dataset.familia ?? 'todas';
      botones.forEach((otro) =>
        otro.setAttribute('aria-pressed', String(otro === boton)),
      );
      for (const seccion of secciones) {
        seccion.hidden = familia !== 'todas' && seccion.dataset.grupo !== familia;
      }
      // Al filtrar, el encabezado de la sección queda a la vista sin saltos.
      raiz.querySelector('#conceptos')?.scrollIntoView({ block: 'start' });
    });
  });
}
