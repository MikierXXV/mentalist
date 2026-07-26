import { obtenerConcepto } from '../content';
import { ETIQUETAS, type Region } from '../viz/regiones';
import { montarViz, type VizMontada } from '../viz/runtime';
import { esc, rutaConcepto } from './dom';

/**
 * Sección del cerebro: entrada visual a los conceptos.
 *
 * El lienzo es decorativo (`aria-hidden`); toda la información que ofrece el
 * cerebro está también en los botones de región y en el panel, de modo que se
 * puede recorrer entera con el teclado y con lector de pantalla.
 */

export function renderCerebro(): string {
  const botones = ETIQUETAS.map(
    (etiqueta, indice) => /* html */ `
      <button
        type="button"
        class="pildora justify-start"
        data-region="${indice}"
        aria-pressed="false"
      >${esc(etiqueta.nombre)}</button>
    `,
  ).join('');

  return /* html */ `
    <section id="cerebro" class="contenedor scroll-mt-20 py-20" aria-labelledby="titulo-cerebro">
      <h2 id="titulo-cerebro" class="titulo-seccion">Un mapa para empezar</h2>
      <p class="mt-4 max-w-lectura leading-relaxed text-tenue">
        Señala una zona para ver por qué conceptos entrar. Es una guía de
        navegación, no un mapa funcional: la localización es orientativa y estos
        procesos están distribuidos, no encerrados en una región.
      </p>

      <div class="mt-10 grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:items-start">
        <div
          class="lienzo-viz aspect-[4/3] sm:aspect-[16/10]"
          data-viz-cerebro
          aria-hidden="true"
        >
          <div class="esqueleto" data-esqueleto>Cargando el modelo…</div>
        </div>

        <div class="flex flex-col gap-5">
          <div class="grid grid-cols-2 gap-2" role="group" aria-label="Zonas del cerebro">
            ${botones}
          </div>
          <div
            class="superficie min-h-[190px] p-5"
            data-panel-region
            role="status"
            aria-live="polite"
          ></div>
        </div>
      </div>
    </section>
  `;
}

function contenidoPanel(indice: number | null): string {
  if (indice === null) {
    return /* html */ `
      <p class="text-sm leading-relaxed text-tenue">
        Pasa el cursor por el modelo o elige una zona en la lista.
      </p>`;
  }

  const etiqueta = ETIQUETAS[indice];
  if (!etiqueta) return '';

  const conceptos = etiqueta.conceptos
    .map((id) => obtenerConcepto(id))
    .filter((concepto): concepto is NonNullable<typeof concepto> => Boolean(concepto))
    .map(
      (concepto) => /* html */ `
        <li>
          <a class="enlace-fuente" href="${rutaConcepto(concepto.id)}">
            ${esc(concepto.titulo)} →
          </a>
        </li>`,
    )
    .join('');

  return /* html */ `
    <h3 class="font-display text-xl text-texto">${esc(etiqueta.nombre)}</h3>
    <p class="mt-2 text-sm leading-relaxed text-tenue">${esc(etiqueta.descripcion)}</p>
    <ul class="mt-4 space-y-2 border-t pt-4 linea">${conceptos}</ul>
  `;
}

export function activarCerebro(raiz: HTMLElement): VizMontada | undefined {
  const lienzo = raiz.querySelector<HTMLElement>('[data-viz-cerebro]');
  const panel = raiz.querySelector<HTMLElement>('[data-panel-region]');
  if (!lienzo || !panel) return undefined;

  const botones = Array.from(
    raiz.querySelectorAll<HTMLButtonElement>('button[data-region]'),
  );

  panel.innerHTML = contenidoPanel(null);

  const marcarBotones = (indice: number | null) => {
    botones.forEach((boton) => {
      boton.setAttribute(
        'aria-pressed',
        String(indice !== null && Number(boton.dataset.region) === indice),
      );
    });
  };

  let montada: VizMontada | undefined;
  // Fijada desde los botones: mantiene la selección aunque el cursor se vaya.
  let fijada: number | null = null;

  void montarViz(lienzo, 'cerebro', {
    alEstarLista() {
      lienzo.querySelector('[data-esqueleto]')?.remove();
    },
    alEmitir(nombre, dato) {
      if (nombre !== 'region') return;
      if (fijada !== null) return;
      const indice =
        dato === null ? null : ETIQUETAS.findIndex((e) => e.id === (dato as Region));
      const valido = indice !== null && indice >= 0 ? indice : null;
      panel.innerHTML = contenidoPanel(valido);
      marcarBotones(valido);
    },
  }).then((resultado) => {
    montada = resultado;

    botones.forEach((boton) => {
      boton.addEventListener('click', () => {
        const indice = Number(boton.dataset.region);
        // Segundo clic sobre la misma zona: se libera y vuelve a mandar el cursor.
        fijada = fijada === indice ? null : indice;
        panel.innerHTML = contenidoPanel(fijada);
        marcarBotones(fijada);
        montada?.setParametro('region', fijada === null ? -1 : fijada);
      });
    });
  });

  return {
    get lista() {
      return montada?.lista ?? Promise.resolve();
    },
    setParametro(id, valor) {
      montada?.setParametro(id, valor);
    },
    destruir() {
      montada?.destruir();
    },
  };
}
