import { conceptos } from '../content';

export function renderHero(): string {
  return /* html */ `
    <header class="relative overflow-hidden">
      <!--
        Cerebro ambiental: misma geometría que la sección interactiva, muy
        atenuada y sin raycasting. Decorativo, así que no se anuncia.

        En móvil se confina a la franja superior y se desvanece hacia abajo: a
        pantalla completa caía justo detrás de los botones y del aviso legal, y
        les restaba legibilidad.
      -->
      <div
        class="fondo-hero pointer-events-none absolute inset-x-0 top-0 h-[58%] opacity-70
          sm:inset-0 sm:h-auto"
        data-viz-fondo
        aria-hidden="true"
      ></div>

      <div class="contenedor relative flex min-h-[82vh] flex-col justify-center py-20">
        <p data-anim="hero" class="mb-6 text-xs uppercase tracking-[0.25em] text-acento">
          Proyecto divulgativo independiente
        </p>
        <h1
          data-anim="hero"
          class="max-w-4xl font-display text-4xl leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl 3xl:max-w-5xl 3xl:text-8xl"
        >
          Cómo te lee<br />una mente entrenada
        </h1>
        <p data-anim="hero" class="mt-8 max-w-lectura text-lg leading-relaxed text-tenue">
          ${conceptos.length} conceptos de percepción, atención, sugestión y persuasión
          que el mentalista <strong class="font-normal text-texto">Javier Botía</strong>
          expone públicamente en su libro, en prensa y en podcasts. Cada uno se explica
          aquí paso a paso, con una visualización que puedes manipular, y se acompaña
          de un enlace a la fuente donde él lo trata.
        </p>
        <div data-anim="hero" class="mt-10 flex flex-wrap items-center gap-4">
          <a class="boton" href="#conceptos">Empezar por el índice</a>
          <a
            class="boton border-borde/20 text-tenue hover:bg-[rgb(var(--velo)/0.08)] hover:text-texto"
            href="#cerebro"
          >Explorar el mapa</a>
        </div>
        <p
          data-anim="hero"
          class="mt-14 max-w-lectura border-l-2 pl-5 text-sm leading-relaxed text-tenue/85 linea"
        >
          Este sitio no está afiliado a Javier Botía ni a sus editoriales. No reproduce
          material audiovisual suyo, no transcribe su libro y no revela el método técnico
          de ningún efecto de mentalismo: solo divulga conceptos que ya son públicos,
          siempre con su fuente enlazada.
        </p>
      </div>
    </header>
  `;
}
