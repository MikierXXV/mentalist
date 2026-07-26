/**
 * Retirada del cargador que index.html pinta en el primer fotograma.
 *
 * Se va cuando la primera vista está montada y las tipografías resueltas, pero
 * nunca antes de un mínimo en pantalla: si la carga es instantánea, aparecer y
 * desaparecer en 80 ms se percibe como un parpadeo, no como una transición.
 */

const MINIMO_VISIBLE = 420;
const inicio = performance.now();

export async function retirarCargador(): Promise<void> {
  const cargador = document.getElementById('cargador');
  if (!cargador) return;

  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // `document.fonts` no existe en navegadores muy antiguos; no es motivo para
  // dejar el cargador puesto para siempre.
  await Promise.race([
    document.fonts?.ready ?? Promise.resolve(),
    new Promise((listo) => setTimeout(listo, 1500)),
  ]);

  if (!reducido) {
    const restante = MINIMO_VISIBLE - (performance.now() - inicio);
    if (restante > 0) await new Promise((listo) => setTimeout(listo, restante));
  }

  cargador.dataset.saliendo = 'true';
  const quitar = () => cargador.remove();
  if (reducido) quitar();
  else {
    cargador.addEventListener('transitionend', quitar, { once: true });
    // Red de seguridad por si la transición no llega a dispararse.
    setTimeout(quitar, 900);
  }
}
