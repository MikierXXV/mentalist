import { ETIQUETA_TIPO_FUENTE, fuentesUsadas, type TipoFuente } from '../content';
import { esc, formatearFecha } from './dom';

const ORDEN_TIPOS: TipoFuente[] = ['libro', 'entrevista', 'web', 'podcast', 'video'];

export function renderFuentes(): string {
  const agrupadas = fuentesUsadas();

  const bloques = ORDEN_TIPOS.filter((tipo) => agrupadas.has(tipo))
    .map((tipo) => {
      const fuentes = agrupadas.get(tipo) ?? [];
      const filas = fuentes
        .map((fuente) => {
          const fecha = formatearFecha(fuente.fecha);
          return /* html */ `
            <li class="border-t border-white/10 py-4">
              <a
                class="enlace-fuente font-display text-base"
                href="${esc(fuente.url)}"
                target="_blank"
                rel="noopener noreferrer"
              >${esc(fuente.titulo)}</a>
              <p class="mt-1 text-sm text-bruma">
                ${esc(fuente.publicacion)}${fecha ? ` · ${esc(fecha)}` : ''}
              </p>
            </li>
          `;
        })
        .join('');

      return /* html */ `
        <div class="mt-10 first:mt-0">
          <h3 class="font-display text-sm uppercase tracking-[0.2em] text-senal">
            ${esc(ETIQUETA_TIPO_FUENTE[tipo])}
          </h3>
          <ul class="mt-3">${filas}</ul>
        </div>
      `;
    })
    .join('');

  return /* html */ `
    <section id="fuentes" class="contenedor scroll-mt-16 py-20" aria-labelledby="titulo-fuentes">
      <h2 id="titulo-fuentes" class="titulo-seccion">Fuentes</h2>
      <p class="mt-4 max-w-lectura leading-relaxed text-bruma">
        Todas las fuentes públicas en las que se apoya la capa oficial de las fichas.
        Las descripciones de los episodios de podcast las redactan sus anfitriones,
        no Javier Botía: por eso esas fichas describen de qué se habla en el episodio
        y nunca le atribuyen una frase concreta.
      </p>
      <div class="mt-10 max-w-3xl">${bloques}</div>
    </section>
  `;
}
