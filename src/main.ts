import './styles.css';

import { conceptos, obtenerConcepto, validarContenido } from './content';
import { seguirPreferenciaDelSistema } from './tema';
import { montarCabecera } from './ui/cabecera';
import { retirarCargador } from './ui/cargador';
import { renderHero } from './ui/hero';
import { activarCerebro, renderCerebro } from './ui/cerebro-seccion';
import { renderIndice } from './ui/indice';
import { renderFicha } from './ui/ficha';
import { activarFuentes, renderFuentes } from './ui/fuentes';
import { renderEnlaces, renderFooter } from './ui/enlaces';
import {
  animarDetalles,
  animarVista,
  iniciarProgreso,
  limpiarAnimaciones,
  revelarBloqueViz,
} from './anim';
import { montarViz, type VizMontada } from './viz/runtime';

const app = document.getElementById('app');
if (!app) throw new Error('Falta el contenedor #app');

// El router recrea el DOM en cada vista, así que la restauración automática de
// scroll del navegador aterriza en un documento que ya no es el mismo.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

/** Escenas 3D vivas en la vista actual; se destruyen al cambiar de ruta. */
let escenas: VizMontada[] = [];

function renderInicio(): string {
  return `<main id="contenido">
    ${renderHero()}
    ${renderCerebro()}
    ${renderIndice()}
    ${renderFuentes()}
    ${renderEnlaces()}
  </main>`;
}

function renderNoEncontrado(): string {
  return /* html */ `
    <main id="contenido" class="contenedor py-32">
      <h1 class="titulo-seccion">Ese concepto no existe</h1>
      <p class="mt-4 text-tenue">
        Puede que el enlace esté mal o que la ficha se haya renombrado.
      </p>
      <p class="mt-8"><a class="boton" href="#conceptos">Volver al índice</a></p>
    </main>
  `;
}

/** Lee el hash actual y devuelve el id de concepto, si la ruta es una ficha. */
function idDesdeHash(): string | undefined {
  const coincidencia = /^#\/concepto\/(.+)$/.exec(window.location.hash);
  return coincidencia?.[1];
}

/**
 * Monta la escena de una ficha. Arranca de inmediato, mientras el lector está en
 * los primeros párrafos, de modo que al llegar abajo la visualización ya tiene
 * forma: entonces se revela con un fundido en vez de aparecer arrancando.
 */
async function montarVizFicha(): Promise<void> {
  const lienzo = app!.querySelector<HTMLElement>('[data-viz]');
  const bloque = app!.querySelector<HTMLElement>('[data-bloque-viz]');
  const controles = app!.querySelector<HTMLElement>('[data-controles-viz]');
  const id = lienzo?.dataset.viz;
  if (!lienzo || !id) return;

  const montada = await montarViz(lienzo, id, {
    controles,
    alEstarLista() {
      lienzo.querySelector('[data-esqueleto]')?.remove();
      if (bloque) revelarBloqueViz(bloque);
    },
  });
  if (montada) escenas.push(montada);
}

function montarEscenasInicio(): void {
  const cerebro = activarCerebro(app!);
  if (cerebro) escenas.push(cerebro);

  const fondo = app!.querySelector<HTMLElement>('[data-viz-fondo]');
  if (fondo) {
    void montarViz(fondo, 'cerebro-fondo').then((montada) => {
      if (montada) escenas.push(montada);
    });
  }
}

async function enrutar(): Promise<void> {
  for (const escena of escenas) escena.destruir();
  escenas = [];
  limpiarAnimaciones();

  const id = idDesdeHash();

  if (id) {
    const concepto = obtenerConcepto(id);
    app!.innerHTML = concepto ? renderFicha(concepto) : renderNoEncontrado();
    document.title = concepto
      ? `${concepto.titulo} · Inteligencia Natural`
      : 'Concepto no encontrado · Inteligencia Natural';
    if (concepto) void montarVizFicha();
  } else {
    app!.innerHTML = renderInicio();
    document.title =
      'Inteligencia Natural — conceptos de percepción, sugestión y persuasión';
    activarFuentes(app!);
    montarEscenasInicio();
  }

  animarVista(app!);
  animarDetalles(app!);

  // El posicionamiento va después de animarVista: ScrollTrigger.refresh()
  // restaura el scroll previo, así que hacerlo antes no serviría de nada.
  requestAnimationFrame(() => {
    if (id) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    const hash = window.location.hash;
    const destino = hash.length > 1 ? document.querySelector(hash) : null;
    if (destino) destino.scrollIntoView({ block: 'start' });
    else window.scrollTo({ top: 0, behavior: 'auto' });
  });
}

window.addEventListener('hashchange', () => void enrutar());

if (import.meta.env.DEV) {
  const errores = validarContenido();
  if (errores.length) {
    console.error(
      `[contenido] ${errores.length} problema(s) de atribución o formato:\n` +
        errores.map((e) => ` · ${e}`).join('\n'),
    );
  } else {
    console.info(`[contenido] ${conceptos.length} conceptos validados correctamente.`);
  }
}

seguirPreferenciaDelSistema();
montarCabecera();

// Se monta una sola vez, fuera del router: el aviso legal debe estar en todas
// las vistas, y en las fichas es donde más falta hace.
const pie = document.getElementById('pie');
if (pie) pie.innerHTML = renderFooter();

iniciarProgreso();
void enrutar().then(retirarCargador);
