import { conceptos } from '../content';

export function renderHero(): string {
  return /* html */ `
    <header class="contenedor flex min-h-[88vh] flex-col justify-center py-20">
      <p
        data-anim="hero"
        class="mb-6 text-xs uppercase tracking-[0.25em] text-senal"
      >
        Proyecto divulgativo independiente
      </p>
      <h1
        data-anim="hero"
        class="max-w-4xl font-display text-4xl leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl"
      >
        Cómo te lee<br />una mente entrenada
      </h1>
      <p
        data-anim="hero"
        class="mt-8 max-w-lectura text-lg leading-relaxed text-bruma"
      >
        ${conceptos.length} conceptos de percepción, atención, sugestión y persuasión
        que el mentalista <strong class="font-normal text-papel">Javier Botía</strong>
        expone públicamente en su libro, en prensa y en podcasts. Cada uno se explica
        aquí paso a paso y con una visualización interactiva, y se acompaña de un
        enlace a la fuente donde él lo trata.
      </p>
      <div data-anim="hero" class="mt-10 flex flex-wrap items-center gap-4">
        <a class="boton" href="#conceptos">Empezar por el índice</a>
        <a class="boton border-white/15 text-bruma hover:bg-white/10 hover:text-papel" href="#fuentes">
          Ver las fuentes
        </a>
      </div>
      <p
        data-anim="hero"
        class="mt-14 max-w-lectura border-l-2 border-white/10 pl-5 text-sm leading-relaxed text-bruma/80"
      >
        Este sitio no está afiliado a Javier Botía ni a sus editoriales. No reproduce
        material audiovisual suyo, no transcribe su libro y no revela el método técnico
        de ningún efecto de mentalismo: solo divulga conceptos que ya son públicos,
        siempre con su fuente enlazada.
      </p>
    </header>
  `;
}
