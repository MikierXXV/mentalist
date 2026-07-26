import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const movimientoReducido = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Barra de progreso de lectura, anclada al alto del documento. */
export function iniciarProgreso(): void {
  const barra = document.getElementById('progreso');
  if (!barra) return;

  if (movimientoReducido()) {
    barra.style.display = 'none';
    return;
  }

  gsap.to(barra, {
    scaleX: 1,
    ease: 'none',
    scrollTrigger: { start: 0, end: 'max', scrub: 0.3 },
  });
}

/**
 * Anima la entrada de una vista. Los elementos marcados con `data-anim="hero"`
 * o `data-anim="ficha"` entran en cascada; las tarjetas del índice lo hacen
 * conforme el scroll las alcanza.
 */
export function animarVista(raiz: HTMLElement): void {
  if (movimientoReducido()) {
    gsap.set(raiz.querySelectorAll('[data-anim]'), { clearProps: 'all', opacity: 1 });
    return;
  }

  const entradas = raiz.querySelectorAll('[data-anim="hero"], [data-anim="ficha"]');
  if (entradas.length) {
    gsap.from(entradas, {
      y: 24,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out',
      stagger: 0.09,
    });
  }

  const tarjetas = raiz.querySelectorAll('[data-anim="tarjeta"]');
  tarjetas.forEach((tarjeta) => {
    gsap.from(tarjeta, {
      y: 28,
      opacity: 0,
      duration: 0.6,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: tarjeta,
        start: 'top 92%',
        once: true,
      },
    });
  });

  ScrollTrigger.refresh();
}

/**
 * Revela el bloque de la visualización. Si ya está en pantalla se muestra al
 * momento; si no, espera a que el lector llegue tras terminar el texto.
 */
export function revelarBloqueViz(bloque: HTMLElement): void {
  const mostrar = () => {
    bloque.dataset.revelado = 'true';
  };

  if (movimientoReducido()) {
    mostrar();
    return;
  }

  const observador = new IntersectionObserver(
    (entradas) => {
      if (!entradas.some((entrada) => entrada.isIntersecting)) return;
      mostrar();
      observador.disconnect();
    },
    { threshold: 0.12 },
  );
  observador.observe(bloque);

  // Red de seguridad: si el bloque nunca entra en vista —ventanas muy altas,
  // usuario que no baja— no debe quedarse invisible para siempre.
  setTimeout(mostrar, 6000);
}

/** Despliegue suave del bloque de la capa oficial al abrir su `<details>`. */
export function animarDetalles(raiz: HTMLElement): void {
  raiz.querySelectorAll<HTMLDetailsElement>('details[data-oficial]').forEach((detalle) => {
    detalle.addEventListener('toggle', () => {
      if (!detalle.open || movimientoReducido()) return;
      const cuerpo = detalle.querySelector('[data-oficial-cuerpo]');
      if (!cuerpo) return;
      gsap.from(cuerpo, { y: -10, opacity: 0, duration: 0.45, ease: 'power2.out' });
    });
  });
}

/** Limpia los ScrollTriggers de la vista anterior antes de montar otra. */
export function limpiarAnimaciones(): void {
  ScrollTrigger.getAll().forEach((trigger) => {
    // La barra de progreso sobrevive a los cambios de vista.
    if (trigger.vars.scrub) return;
    trigger.kill();
  });
}
