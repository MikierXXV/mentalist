import { enlacesOficiales, notaEnlaces } from '../content';
import { esc } from './dom';

export function renderEnlaces(): string {
  const items = enlacesOficiales
    .map(
      (enlace) => /* html */ `
        <li>
          <a
            class="tarjeta"
            href="${esc(enlace.url)}"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span class="tarjeta__titulo">${esc(enlace.etiqueta)} ↗</span>
            <span class="tarjeta__gancho">${esc(enlace.descripcion)}</span>
          </a>
        </li>
      `,
    )
    .join('');

  return /* html */ `
    <section id="oficial" class="contenedor scroll-mt-16 py-20" aria-labelledby="titulo-oficial">
      <h2 id="titulo-oficial" class="titulo-seccion">Ir a la fuente</h2>
      <p class="mt-4 max-w-lectura leading-relaxed text-bruma">${esc(notaEnlaces)}</p>
      <ul class="mt-10 grid gap-4 sm:grid-cols-2">${items}</ul>
    </section>
  `;
}

export function renderFooter(): string {
  return /* html */ `
    <footer class="mt-10 border-t border-white/10 py-12">
      <div class="contenedor max-w-lectura text-sm leading-relaxed text-bruma/80">
        <p>
          Proyecto divulgativo independiente, sin vinculación oficial con Javier Botía,
          con Arcopress ni con ninguno de los medios citados. Todas las explicaciones
          didácticas son originales; los resúmenes de la capa oficial son paráfrasis
          con enlace a la fuente, y las citas textuales son breves y aparecen siempre
          atribuidas.
        </p>
        <p class="mt-4">
          <em>Inteligencia Natural. Descubre tu poder mental</em> está publicado por
          Arcopress (Almuzara Libros), ISBN 978-84-10354-73-9.
        </p>
      </div>
    </footer>
  `;
}
