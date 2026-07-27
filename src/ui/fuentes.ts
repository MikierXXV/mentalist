import {
  conceptosPorFuente,
  ETIQUETA_TIPO_FUENTE,
  fuentesUsadas,
  type Fuente,
  type TipoFuente,
} from '../content';
import { esc, formatearFecha, rutaConcepto } from './dom';

/**
 * Catálogo de fuentes: filtrable por tipo, buscable y desplegable.
 *
 * Cada fuente muestra qué conceptos la citan, de modo que la sección se puede
 * recorrer en los dos sentidos: de un concepto a su fuente y de una fuente a
 * todo lo que se apoya en ella.
 */

const ORDEN_TIPOS: TipoFuente[] = ['libro', 'entrevista', 'web', 'podcast', 'video'];

const ICONOS: Record<TipoFuente, string> = {
  libro: '📕',
  entrevista: '🗞',
  web: '🌐',
  podcast: '🎙',
  video: '▶',
};

function filaFuente(fuente: Fuente): string {
  const fecha = formatearFecha(fuente.fecha);
  const citantes = conceptosPorFuente(fuente.id);

  const conceptos = citantes
    .map(
      (concepto) => /* html */ `
        <li>
          <a class="enlace-fuente" href="${rutaConcepto(concepto.id)}">
            ${esc(concepto.titulo)} →
          </a>
        </li>`,
    )
    .join('');

  return /* html */ `
    <li
      data-fuente="${esc(fuente.id)}"
      data-tipo="${esc(fuente.tipo)}"
      data-busqueda="${esc(`${fuente.titulo} ${fuente.publicacion}`.toLowerCase())}"
    >
      <details class="superficie group px-5 py-4 transition-colors hover:border-acento/40">
        <summary class="flex cursor-pointer list-none items-start gap-4">
          <span class="mt-0.5 text-lg" aria-hidden="true">${ICONOS[fuente.tipo]}</span>
          <span class="min-w-0 flex-1">
            <span class="block font-display text-base leading-snug text-texto">
              ${esc(fuente.titulo)}
            </span>
            <span class="mt-1 block text-sm text-tenue">
              ${esc(fuente.publicacion)}${fecha ? ` · ${esc(fecha)}` : ''}
            </span>
          </span>
          <span class="shrink-0 text-xs text-tenue">
            ${citantes.length} ${citantes.length === 1 ? 'concepto' : 'conceptos'}
          </span>
          <span
            class="shrink-0 text-tenue transition-transform group-open:rotate-45"
            aria-hidden="true"
          >＋</span>
        </summary>

        <div class="mt-4 border-t pt-4 linea">
          <p class="text-xs uppercase tracking-wider text-tenue">Se cita en</p>
          <ul class="mt-2 space-y-2">${conceptos}</ul>
          <a
            class="enlace-fuente mt-4 inline-flex"
            href="${esc(fuente.url)}"
            target="_blank"
            rel="noopener noreferrer"
          >Ir a la fuente original ↗</a>
        </div>
      </details>
    </li>
  `;
}

export function renderFuentes(): string {
  const agrupadas = fuentesUsadas();
  const todas = ORDEN_TIPOS.flatMap((tipo) => agrupadas.get(tipo) ?? []);

  const filtros = [
    { id: 'todas', etiqueta: 'Todas', cuenta: todas.length },
    ...ORDEN_TIPOS.filter((tipo) => agrupadas.has(tipo)).map((tipo) => ({
      id: tipo as string,
      etiqueta: ETIQUETA_TIPO_FUENTE[tipo],
      cuenta: (agrupadas.get(tipo) ?? []).length,
    })),
  ]
    .map(
      (filtro, indice) => /* html */ `
        <button
          type="button"
          class="pildora"
          data-filtro="${filtro.id}"
          aria-pressed="${indice === 0}"
        >
          ${esc(filtro.etiqueta)}
          <span class="pildora__cuenta">${filtro.cuenta}</span>
        </button>`,
    )
    .join('');

  return /* html */ `
    <section id="fuentes" class="contenedor scroll-mt-20 py-20" aria-labelledby="titulo-fuentes">
      <h2 id="titulo-fuentes" class="titulo-seccion">Fuentes</h2>
      <p class="mt-4 max-w-lectura leading-relaxed text-tenue">
        Todo lo que sostiene la capa oficial de las fichas. Despliega cualquiera
        para ver qué conceptos se apoyan en ella. Las descripciones de los
        episodios de podcast las redactan sus anfitriones, no Javier Botía: por eso
        esas fichas describen de qué se habla y nunca le atribuyen una frase.
      </p>

      <div class="mt-8 flex flex-col gap-4" data-controles-fuentes>
        <div class="flex flex-wrap gap-2" role="group" aria-label="Filtrar por tipo de fuente">
          ${filtros}
        </div>
        <div class="flex flex-wrap items-center gap-4">
          <label class="min-w-0 flex-1 sm:max-w-sm">
            <span class="sr-only">Buscar por título o publicación</span>
            <input
              type="search"
              class="campo"
              placeholder="Buscar por título o publicación…"
              data-buscar-fuentes
            />
          </label>
          <p class="text-sm text-tenue" data-cuenta-fuentes aria-live="polite"></p>
        </div>
      </div>

      <ul class="mt-8 grid gap-3 2xl:grid-cols-2" data-lista-fuentes>
        ${todas.map(filaFuente).join('')}
      </ul>

      <p class="mt-6 hidden text-sm text-tenue" data-sin-fuentes>
        Ninguna fuente coincide con esa búsqueda.
      </p>
    </section>
  `;
}

/** Conecta filtros y búsqueda. Todo ocurre en cliente sobre el DOM ya pintado. */
export function activarFuentes(raiz: HTMLElement): void {
  const lista = raiz.querySelector<HTMLElement>('[data-lista-fuentes]');
  const cuenta = raiz.querySelector<HTMLElement>('[data-cuenta-fuentes]');
  const vacio = raiz.querySelector<HTMLElement>('[data-sin-fuentes]');
  const buscador = raiz.querySelector<HTMLInputElement>('[data-buscar-fuentes]');
  if (!lista) return;

  const filas = Array.from(lista.querySelectorAll<HTMLElement>('[data-fuente]'));
  const botones = Array.from(raiz.querySelectorAll<HTMLButtonElement>('[data-filtro]'));

  let tipo = 'todas';
  let termino = '';

  const aplicar = () => {
    let visibles = 0;
    for (const fila of filas) {
      const coincideTipo = tipo === 'todas' || fila.dataset.tipo === tipo;
      const coincideTexto =
        termino === '' || (fila.dataset.busqueda ?? '').includes(termino);
      const visible = coincideTipo && coincideTexto;
      fila.hidden = !visible;
      if (visible) visibles++;
    }
    if (cuenta) {
      cuenta.textContent =
        visibles === filas.length
          ? `${filas.length} fuentes`
          : `${visibles} de ${filas.length} fuentes`;
    }
    if (vacio) vacio.classList.toggle('hidden', visibles > 0);
  };

  botones.forEach((boton) => {
    boton.addEventListener('click', () => {
      tipo = boton.dataset.filtro ?? 'todas';
      botones.forEach((otro) =>
        otro.setAttribute('aria-pressed', String(otro === boton)),
      );
      aplicar();
    });
  });

  buscador?.addEventListener('input', () => {
    termino = buscador.value.trim().toLowerCase();
    aplicar();
  });

  aplicar();
}
