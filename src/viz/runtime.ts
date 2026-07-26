import { alCambiarTema, paletaViz } from '../tema';
import type { Control, Puntero, VizModulo } from './tipos';

/**
 * Runtime compartido por las visualizaciones y el cerebro.
 *
 * - Three.js entra por import dinámico: no lastra la carga inicial.
 * - El bucle se detiene fuera de pantalla, pero con `rootMargin` amplio, de modo
 *   que la escena ya lleva fotogramas hechos cuando el lector llega a ella.
 * - Los controles declarados por cada módulo se pintan como elementos nativos.
 * - Al cambiar de tema se repintan los materiales sin desmontar la escena.
 */

const CONSULTA_MOVIMIENTO = '(prefers-reduced-motion: reduce)';

const cargadores: Record<string, () => Promise<VizModulo>> = {
  'punto-ciego': () => import('./punto-ciego'),
  linterna: () => import('./linterna'),
  expectativa: () => import('./expectativa'),
  correccion: () => import('./correccion'),
  'rellenar-huecos': () => import('./rellenar-huecos'),
  'copia-de-copia': () => import('./copia-de-copia'),
  eco: () => import('./eco'),
  'dos-canales': () => import('./dos-canales'),
  'enano-y-gigante': () => import('./enano-y-gigante'),
  captura: () => import('./captura'),
  distribucion: () => import('./distribucion'),
  estrechamiento: () => import('./estrechamiento'),
  siembra: () => import('./siembra'),
  microexpresion: () => import('./microexpresion'),
  precision: () => import('./precision'),
  'donde-vive-el-efecto': () => import('./donde-vive-el-efecto'),
  cerebro: () => import('./cerebro'),
  'cerebro-fondo': () => import('./cerebro-fondo'),
};

/** Solo las que puede referenciar una ficha; el cerebro no es de ningún concepto. */
export const IDS_VISUALIZACION = Object.keys(cargadores).filter(
  (id) => !id.startsWith('cerebro'),
);

export interface VizMontada {
  destruir(): void;
  /** Se cumple cuando la escena ya ha pintado su primer fotograma. */
  lista: Promise<void>;
  /** Mismo canal que los controles, para mandos externos a la escena. */
  setParametro(id: string, valor: number | boolean): void;
}

export interface OpcionesMontaje {
  /** Contenedor donde pintar los controles declarados por el módulo. */
  controles?: HTMLElement | null;
  /** Se llama tras el primer fotograma renderizado. */
  alEstarLista?: () => void;
  /** Recibe los eventos que emite la escena (ver `VizContexto.emitir`). */
  alEmitir?: (nombre: string, dato: unknown) => void;
}

function pintarControles(
  host: HTMLElement,
  controles: Control[],
  pista: string | undefined,
  aplicar: (id: string, valor: number | boolean) => void,
): void {
  const partes = controles.map((control) => {
    if (control.tipo === 'conmutador') {
      const activo = control.inicial === 1;
      return /* html */ `
        <div class="flex max-w-full flex-wrap items-center gap-2">
          <span class="text-xs uppercase tracking-wider text-tenue">${control.etiqueta}</span>
          <div class="flex max-w-full flex-wrap rounded-full border p-0.5 linea" role="group">
            ${control.opciones
              .map(
                (opcion, indice) => `
                  <button type="button" data-control="${control.id}" data-valor="${indice}"
                    class="rounded-full px-3.5 py-1.5 text-sm transition-colors
                      ${(indice === 1) === activo ? 'bg-acento text-fondo' : 'text-tenue hover:text-texto'}"
                    aria-pressed="${(indice === 1) === activo}">${opcion}</button>`,
              )
              .join('')}
          </div>
        </div>`;
    }
    if (control.tipo === 'rango') {
      return /* html */ `
        <label class="flex max-w-full flex-wrap items-center gap-3 text-xs uppercase tracking-wider text-tenue">
          <span>${control.etiqueta}</span>
          <input type="range" data-control="${control.id}"
            min="${control.min}" max="${control.max}" step="${control.paso}"
            value="${control.inicial}"
            class="h-1 w-40 max-w-full cursor-pointer appearance-none rounded-full
              bg-[rgb(var(--velo)/0.15)] accent-[rgb(var(--color-acento))]" />
          <output data-salida="${control.id}" class="tabular-nums text-acento"></output>
        </label>`;
    }
    return /* html */ `
      <button type="button" data-control="${control.id}" class="pildora">${control.etiqueta}</button>`;
  });

  host.innerHTML = /* html */ `
    <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
      ${partes.join('')}
    </div>
    ${pista ? `<p class="mt-3 max-w-lectura text-sm text-tenue">${pista}</p>` : ''}
  `;

  const formatos = new Map(
    controles
      .filter((c): c is Extract<Control, { tipo: 'rango' }> => c.tipo === 'rango')
      .map((c) => [c.id, c.formato]),
  );

  const refrescarSalida = (id: string, valor: number) => {
    const salida = host.querySelector<HTMLOutputElement>(`[data-salida="${id}"]`);
    if (!salida) return;
    const formato = formatos.get(id);
    salida.textContent = formato ? formato(valor) : String(valor);
  };

  host.querySelectorAll<HTMLInputElement>('input[type="range"]').forEach((rango) => {
    refrescarSalida(rango.dataset.control!, Number(rango.value));
    rango.addEventListener('input', () => {
      const valor = Number(rango.value);
      refrescarSalida(rango.dataset.control!, valor);
      aplicar(rango.dataset.control!, valor);
    });
  });

  host.querySelectorAll<HTMLButtonElement>('button[data-control]').forEach((boton) => {
    boton.addEventListener('click', () => {
      const id = boton.dataset.control!;
      if (boton.dataset.valor === undefined) {
        aplicar(id, true);
        return;
      }
      const valor = Number(boton.dataset.valor);
      host
        .querySelectorAll<HTMLButtonElement>(`button[data-control="${id}"]`)
        .forEach((hermano) => {
          const activo = hermano === boton;
          hermano.setAttribute('aria-pressed', String(activo));
          hermano.className = `rounded-full px-3.5 py-1.5 text-sm transition-colors ${
            activo ? 'bg-acento text-fondo' : 'text-tenue hover:text-texto'
          }`;
        });
      aplicar(id, valor === 1);
    });
  });
}

export async function montarViz(
  contenedor: HTMLElement,
  id: string,
  opciones: OpcionesMontaje = {},
): Promise<VizMontada | undefined> {
  const cargador = cargadores[id];
  if (!cargador) {
    console.warn(`[viz] visualización desconocida: "${id}"`);
    return undefined;
  }

  const [THREE, modulo] = await Promise.all([import('three'), cargador()]);

  // El router puede haber cambiado de vista mientras se descargaba el chunk.
  if (!contenedor.isConnected) return undefined;

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  contenedor.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 100);
  camera.position.set(0, 0, 8);

  // Marcador de texto: lo que la escena "dice" también queda escrito, para
  // quien no puede ver el lienzo y para poder comprobarlo desde las pruebas.
  let marcador: HTMLElement | null = null;
  if (opciones.controles) {
    marcador = document.createElement('p');
    marcador.className = 'mt-3 text-sm tabular-nums text-acento empty:hidden';
    marcador.setAttribute('role', 'status');
    marcador.setAttribute('aria-live', 'polite');
    marcador.dataset.marcadorViz = id;
  }
  const estado = (texto: string) => {
    if (marcador) marcador.textContent = texto;
  };

  const emitir = (nombre: string, dato: unknown) => opciones.alEmitir?.(nombre, dato);

  const esMovil = window.matchMedia('(max-width: 640px)').matches;
  const instancia = modulo.init({
    scene,
    camera,
    paleta: paletaViz(),
    esMovil,
    estado,
    emitir,
  });

  if (opciones.controles) {
    if (modulo.controles?.length) {
      pintarControles(opciones.controles, modulo.controles, modulo.pista, (clave, valor) =>
        instancia.setParametro?.(clave, valor),
      );
    } else if (modulo.pista) {
      opciones.controles.innerHTML = `<p class="mt-3 max-w-lectura text-sm text-tenue">${modulo.pista}</p>`;
    }
    if (marcador) opciones.controles.appendChild(marcador);
  }

  const desuscribirTema = alCambiarTema((_, paleta) => {
    instancia.setPaleta?.(paleta);
    if (!animacion) renderer.render(scene, camera);
  });

  const puntero: Puntero = { x: 0, y: 0, activo: false, pulsado: false };

  const situar = (evento: PointerEvent) => {
    const caja = contenedor.getBoundingClientRect();
    puntero.x = ((evento.clientX - caja.left) / caja.width) * 2 - 1;
    puntero.y = -(((evento.clientY - caja.top) / caja.height) * 2 - 1);
  };
  const alMover = (evento: PointerEvent) => {
    situar(evento);
    puntero.activo = true;
  };
  const alSalir = () => {
    puntero.activo = false;
  };
  const alPulsar = (evento: PointerEvent) => {
    situar(evento);
    puntero.activo = true;
    puntero.pulsado = true;
  };
  contenedor.addEventListener('pointermove', alMover);
  contenedor.addEventListener('pointerleave', alSalir);
  contenedor.addEventListener('pointerdown', alPulsar);

  const redimensionar = () => {
    const { clientWidth, clientHeight } = contenedor;
    if (!clientWidth || !clientHeight) return;
    renderer.setSize(clientWidth, clientHeight, false);
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
  };
  redimensionar();

  const observadorTamano = new ResizeObserver(redimensionar);
  observadorTamano.observe(contenedor);

  const movimientoReducido = window.matchMedia(CONSULTA_MOVIMIENTO).matches;

  let animacion = 0;
  let visible = false;
  let avisadaLista = false;
  const inicio = performance.now();

  let resolverLista: () => void;
  const lista = new Promise<void>((resolver) => {
    resolverLista = resolver;
  });

  const marcarLista = () => {
    if (avisadaLista) return;
    avisadaLista = true;
    opciones.alEstarLista?.();
    resolverLista();
  };

  const fotograma = () => {
    animacion = requestAnimationFrame(fotograma);
    instancia.update((performance.now() - inicio) / 1000, puntero);
    renderer.render(scene, camera);
    puntero.pulsado = false;
    marcarLista();
  };

  const arrancar = () => {
    if (animacion || movimientoReducido) return;
    animacion = requestAnimationFrame(fotograma);
  };
  const parar = () => {
    if (!animacion) return;
    cancelAnimationFrame(animacion);
    animacion = 0;
  };

  const observadorVisibilidad = new IntersectionObserver(
    (entradas) => {
      visible = entradas.some((entrada) => entrada.isIntersecting);
      if (visible) arrancar();
      else parar();
    },
    // Margen amplio: la escena arranca bastante antes de entrar en pantalla,
    // así que cuando se revela ya tiene forma en vez de estar empezando.
    { threshold: 0, rootMargin: '600px 0px 600px 0px' },
  );
  observadorVisibilidad.observe(contenedor);

  if (movimientoReducido) {
    // Un único fotograma, en un instante en el que la escena ya tiene forma.
    instancia.update(2.4, puntero);
    renderer.render(scene, camera);
    marcarLista();
  }

  const alCambiarVisibilidadPagina = () => {
    if (document.hidden) parar();
    else if (visible) arrancar();
  };
  document.addEventListener('visibilitychange', alCambiarVisibilidadPagina);

  return {
    lista,
    setParametro(clave, valor) {
      instancia.setParametro?.(clave, valor);
    },
    destruir() {
      parar();
      desuscribirTema();
      observadorVisibilidad.disconnect();
      observadorTamano.disconnect();
      document.removeEventListener('visibilitychange', alCambiarVisibilidadPagina);
      contenedor.removeEventListener('pointermove', alMover);
      contenedor.removeEventListener('pointerleave', alSalir);
      contenedor.removeEventListener('pointerdown', alPulsar);
      instancia.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
