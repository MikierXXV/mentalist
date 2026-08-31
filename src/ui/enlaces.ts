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
      <p class="mt-4 max-w-lectura leading-relaxed text-tenue">${esc(notaEnlaces)}</p>
      <ul class="mt-10 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">${items}</ul>
    </section>
  `;
}

/**
 * Pie compacto.
 *
 * El aviso legal se conserva íntegro y legible sin interacción: es la
 * salvaguarda de derechos del proyecto. Lo que baja es su peso visual —letra
 * pequeña, dos columnas y menos aire— para que no compita con el contenido.
 */
export function renderFooter(): string {
  return /* html */ `
    <footer class="linea mt-6 border-t">
      <div class="contenedor py-8">
        <div class="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <p class="text-sm text-texto">
            © ${new Date().getFullYear()} M. Gutiérrez
            <span class="text-tenue"> · Todos los derechos reservados</span>
          </p>
          <p class="text-sm text-tenue">
            Proyecto divulgativo independiente
          </p>
        </div>

        <div
          class="linea mt-5 grid gap-x-10 gap-y-3 border-t pt-5 text-xs leading-relaxed text-tenue/90 sm:grid-cols-2"
        >
          <p>
            Sin vinculación oficial con Javier Botía, con Arcopress ni con ninguno de los
            medios citados. Todas las explicaciones didácticas y los ejemplos son
            originales; los resúmenes de la capa oficial son paráfrasis con enlace a la
            fuente, y las citas textuales son breves y aparecen siempre atribuidas.
          </p>
          <p>
            <em>Inteligencia Natural. Descubre tu poder mental</em> está publicado por
            Arcopress (Almuzara Libros), ISBN 978-84-10354-73-9. El copyright de esta web
            cubre su código y sus textos propios, no el material de las fuentes enlazadas.
          </p>
          <p class="sm:col-span-2">
            Modelo 3D del cerebro:
            <a
              class="underline decoration-tenue/40 underline-offset-2 hover:decoration-tenue"
              href="https://sketchfab.com/3d-models/human-brain-c9c9d4d671b94345952d012cc2ea7a24"
              target="_blank"
              rel="noopener noreferrer"
            >Human Brain</a>, de AH (@agher), bajo
            <a
              class="underline decoration-tenue/40 underline-offset-2 hover:decoration-tenue"
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noopener noreferrer"
            >CC BY 4.0</a>. Modificado: se le han retirado las texturas y los materiales, se
            han reducido los índices y se pinta con el material de este sitio.
          </p>
        </div>
      </div>
    </footer>
  `;
}
