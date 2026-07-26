import {
  conceptos,
  obtenerFuente,
  type Concepto,
  type Visualizacion,
} from '../content';
import { esc, formatearFecha, rutaConcepto } from './dom';

/**
 * Descripción textual de cada visualización. El canvas es decorativo y queda
 * oculto a los lectores de pantalla; esto es lo que se anuncia en su lugar.
 */
const ALT_VISUALIZACION: Record<Visualizacion, string> = {
  'focus-field':
    'Un campo de puntos difusos en el que solo la zona señalada por el cursor se vuelve nítida, mientras el resto permanece borroso.',
  resonance:
    'Una malla en reposo que recibe un pulso una y otra vez desde el mismo punto hasta quedar deformada con la forma de ese pulso.',
  'mirror-signal':
    'Dos nodos que intercambian destellos: uno emite una señal tenue y el otro devuelve un haz mucho más denso del que ha recibido.',
  reconstruction:
    'Una figura que se disgrega en fragmentos y se vuelve a ensamblar en cada ciclo, ligeramente distinta de la anterior.',
};

function capaOficial(concepto: Concepto): string {
  const oficial = concepto.explicacion_oficial;
  const esEpisodio = oficial.tipo_atribucion === 'tema_de_episodio';
  const fuente = obtenerFuente(oficial.fuente_id);

  const rotulo = esEpisodio
    ? 'Tema tratado en este episodio'
    : 'Cómo lo explica Javier Botía';

  const aviso = esEpisodio
    ? /* html */ `
        <p class="mb-4 text-xs uppercase tracking-wider text-bruma/70">
          Resumen de la descripción del episodio, redactada por sus anfitriones ·
          no se le atribuye ninguna formulación textual
        </p>
      `
    : '';

  const cita = oficial.cita_breve
    ? /* html */ `<blockquote class="cita">«${esc(oficial.cita_breve)}»</blockquote>`
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
          <span class="block text-xs text-bruma">
            ${esc(f.publicacion)}${fecha ? ` · ${esc(fecha)}` : ''}
          </span>
        </li>
      `;
    })
    .join('');

  const atribucionCita =
    oficial.cita_breve && fuente
      ? `<p class="-mt-2 mb-4 text-xs text-bruma">Javier Botía, en ${esc(fuente.publicacion)}.</p>`
      : '';

  return /* html */ `
    <details class="mt-12 max-w-lectura" data-oficial>
      <summary
        class="cursor-pointer list-none rounded-lg border px-5 py-4 font-display text-lg
          ${esEpisodio ? 'border-dashed border-bruma/40 text-bruma hover:text-papel' : 'border-senal/40 text-senal hover:bg-senal/10'}"
      >
        <span class="inline-flex items-center gap-2">
          <span aria-hidden="true">${esEpisodio ? '🎙' : '＋'}</span>
          ${esc(rotulo)}
        </span>
      </summary>
      <div class="oficial ${esEpisodio ? 'oficial--episodio' : 'oficial--propia'} mt-3" data-oficial-cuerpo>
        ${aviso}
        <p class="leading-relaxed text-papel/90">${esc(oficial.resumen)}</p>
        ${cita}
        ${atribucionCita}
        <ul class="mt-5 space-y-3 border-t border-white/10 pt-4">${enlaces}</ul>
      </div>
    </details>
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
          <a class="group flex flex-col gap-1 ${alinear}" href="${rutaConcepto(c.id)}">
            <span class="text-xs uppercase tracking-wider text-bruma">${etiqueta}</span>
            <span class="font-display text-lg text-papel group-hover:text-senalClara">
              ${esc(c.titulo)}
            </span>
          </a>
        `
      : '<span></span>';

  return /* html */ `
    <nav class="mt-16 flex items-start justify-between gap-6 border-t border-white/10 pt-8">
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
        <aside class="mt-8 max-w-lectura rounded-lg border border-senal/25 bg-senal/[0.05] px-5 py-4">
          <p class="mb-1 text-xs uppercase tracking-wider text-senal">Pruébalo</p>
          <p class="text-[0.95rem] leading-relaxed text-papel/85">${esc(concepto.experimento)}</p>
        </aside>
      `
    : '';

  const matiz = concepto.nota_matiz
    ? /* html */ `
        <aside class="mt-6 max-w-lectura nota-matiz">
          <p class="mb-1 text-xs uppercase tracking-wider text-bruma">Matiz</p>
          <p>${esc(concepto.nota_matiz)}</p>
        </aside>
      `
    : '';

  return /* html */ `
    <article class="contenedor py-16" data-ficha="${esc(concepto.id)}">
      <a class="enlace-fuente" href="#conceptos">← Volver al índice</a>

      <header class="mt-8" data-anim="ficha">
        <p class="font-display text-sm text-senal/70">
          ${String(concepto.orden).padStart(2, '0')}
        </p>
        <h1 class="mt-2 max-w-3xl font-display text-4xl leading-tight tracking-tight sm:text-5xl">
          ${esc(concepto.titulo)}
        </h1>
        <p class="mt-5 max-w-lectura text-lg leading-relaxed text-bruma">
          ${esc(concepto.gancho)}
        </p>
      </header>

      <figure class="mt-10" data-anim="ficha">
        <div
          class="lienzo-viz"
          data-viz="${esc(concepto.visualizacion)}"
          role="img"
          aria-label="${esc(ALT_VISUALIZACION[concepto.visualizacion])}"
        ></div>
        <figcaption class="mt-3 max-w-lectura text-sm text-bruma/80">
          ${esc(ALT_VISUALIZACION[concepto.visualizacion])}
        </figcaption>
      </figure>

      <div class="prosa mt-12" data-anim="ficha">${parrafos}</div>
      ${experimento}
      ${matiz}
      ${capaOficial(concepto)}
      ${navegacion(concepto)}
    </article>
  `;
}
