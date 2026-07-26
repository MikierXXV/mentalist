import { conceptosPorFamilia, obtenerFuente, type Concepto } from '../content';
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
        <span class="tarjeta__numero">${numero}</span>
        <h3 class="tarjeta__titulo group-hover:text-senalClara">${esc(concepto.titulo)}</h3>
        <p class="tarjeta__gancho">${esc(concepto.gancho)}</p>
        <span class="mt-auto pt-3">${distintivoFuente(concepto)}</span>
      </a>
    </li>
  `;
}

export function renderIndice(): string {
  const grupos = conceptosPorFamilia()
    .filter((grupo) => grupo.conceptos.length > 0)
    .map(
      (grupo) => /* html */ `
        <section class="mt-16 first:mt-0" aria-labelledby="familia-${grupo.familia}">
          <h3
            id="familia-${grupo.familia}"
            class="mb-6 border-b border-white/10 pb-3 font-display text-sm uppercase tracking-[0.2em] text-senal"
          >
            ${esc(grupo.titulo)}
          </h3>
          <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            ${grupo.conceptos.map(tarjeta).join('')}
          </ul>
        </section>
      `,
    )
    .join('');

  return /* html */ `
    <section id="conceptos" class="contenedor scroll-mt-16 py-20" aria-labelledby="titulo-conceptos">
      <h2 id="titulo-conceptos" class="titulo-seccion">Los conceptos</h2>
      <p class="mt-4 max-w-lectura leading-relaxed text-bruma">
        Cada ficha tiene dos capas. Primero, una explicación propia del fenómeno,
        escrita desde cero. Después, plegado, cómo aparece el tema en la fuente
        original. Las tarjetas marcadas como
        <span class="distintivo distintivo--texto align-middle">Fuente textual</span>
        recogen palabras suyas; las marcadas como
        <span class="distintivo distintivo--podcast align-middle">Podcast</span>
        solo indican que el tema se trata en ese episodio.
      </p>
      <div class="mt-12">${grupos}</div>
    </section>
  `;
}
