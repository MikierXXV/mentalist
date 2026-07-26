import type { Puntero, VizModulo } from './tipos';

/**
 * Runtime compartido para las visualizaciones. Objetivos:
 *
 * - Three.js entra por import dinámico, así que no lastra la carga inicial.
 * - Un renderer por lienzo, destruido al desmontar (el router recrea el DOM).
 * - El bucle se detiene cuando el lienzo sale de pantalla.
 * - Con `prefers-reduced-motion` se pinta un único fotograma estático.
 */

const CONSULTA_MOVIMIENTO = '(prefers-reduced-motion: reduce)';

const cargadores: Record<string, () => Promise<VizModulo>> = {
  'focus-field': () => import('./focus-field'),
  resonance: () => import('./resonance'),
  'mirror-signal': () => import('./mirror-signal'),
  reconstruction: () => import('./reconstruction'),
};

export interface VizMontada {
  destruir(): void;
}

export async function montarViz(
  contenedor: HTMLElement,
  id: string,
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

  const instancia = modulo.init(scene, camera);

  const puntero: Puntero = { x: 0, y: 0, activo: false };

  const alMover = (evento: PointerEvent) => {
    const caja = contenedor.getBoundingClientRect();
    puntero.x = ((evento.clientX - caja.left) / caja.width) * 2 - 1;
    puntero.y = -(((evento.clientY - caja.top) / caja.height) * 2 - 1);
    puntero.activo = true;
  };
  const alSalir = () => {
    puntero.activo = false;
  };
  contenedor.addEventListener('pointermove', alMover);
  contenedor.addEventListener('pointerleave', alSalir);

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
  const inicio = performance.now();

  const fotograma = () => {
    animacion = requestAnimationFrame(fotograma);
    instancia.update((performance.now() - inicio) / 1000, puntero);
    renderer.render(scene, camera);
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
    { threshold: 0.05 },
  );
  observadorVisibilidad.observe(contenedor);

  if (movimientoReducido) {
    // Un solo fotograma, en un instante en el que la escena ya tiene forma.
    instancia.update(2.4, puntero);
    renderer.render(scene, camera);
  }

  const alCambiarVisibilidadPagina = () => {
    if (document.hidden) parar();
    else if (visible) arrancar();
  };
  document.addEventListener('visibilitychange', alCambiarVisibilidadPagina);

  return {
    destruir() {
      parar();
      observadorVisibilidad.disconnect();
      observadorTamano.disconnect();
      document.removeEventListener('visibilitychange', alCambiarVisibilidadPagina);
      contenedor.removeEventListener('pointermove', alMover);
      contenedor.removeEventListener('pointerleave', alSalir);
      instancia.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
