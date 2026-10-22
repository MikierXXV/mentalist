import { conceptos, FAMILIAS, obtenerConcepto, reels } from '../content';
import { esc } from './dom';
import { renderReel } from './reel';

/**
 * Una sola rejilla en el orden de los conceptos, con la familia como rótulo de
 * cada reel. Agrupados por familia, mientras haya uno o dos por familia cada
 * grupo ocupaba una fila casi vacía.
 */
export function renderPaginaReels(): string {
  const items = reels
    .map((reel) => {
      const concepto = obtenerConcepto(reel.concepto);
      return /* html */ `
        <li class="mx-auto w-full max-w-[20rem] sm:mx-0">
          <p class="mb-3 text-xs uppercase tracking-wider text-acento">
            ${concepto ? esc(FAMILIAS[concepto.familia]) : ''}
          </p>
          ${renderReel(reel, { disposicion: 'columna', enlaceFicha: true })}
        </li>`;
    })
    .join('');

  return /* html */ `
    <main id="contenido" class="contenedor py-14">
      <a class="enlace-fuente" href="#conceptos">← Volver al índice</a>
      <header class="mt-6" data-anim="ficha">
        <h1 class="font-display text-4xl leading-tight tracking-tight sm:text-5xl">Reels</h1>
        <p class="mt-5 max-w-lectura text-lg leading-relaxed text-tenue">
          Un concepto en menos de un minuto.
          ${
            reels.length < conceptos.length
              ? `Hay ${reels.length} de ${conceptos.length}; los demás irán llegando.`
              : ''
          }
        </p>
        <p class="mt-3 max-w-lectura text-sm leading-relaxed text-tenue">
          Vídeos verticales hechos para este proyecto, con animación propia, voz
          sintética y subtítulos incrustados. No contienen imagen ni voz de Javier
          Botía. Cada uno enlaza a su ficha, donde está la explicación completa, y
          trae su descripción, la transcripción y las fuentes.
        </p>
      </header>
      <ul class="mt-12 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        ${items}
      </ul>
    </main>
  `;
}
