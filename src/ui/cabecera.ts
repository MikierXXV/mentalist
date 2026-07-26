import { alternarTema, temaActual } from '../tema';

const ENLACES = [
  { href: '#cerebro', texto: 'Mapa' },
  { href: '#conceptos', texto: 'Conceptos' },
  { href: '#fuentes', texto: 'Fuentes' },
  { href: '#oficial', texto: 'Enlaces' },
];

const ICONO_LUNA = /* html */ `
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
    stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.7 6.7 0 0 0 10.5 10.5Z" />
  </svg>`;

const ICONO_SOL = /* html */ `
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
    stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" />
  </svg>`;

function etiquetaTema(): string {
  return temaActual() === 'claro' ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro';
}

function iconoTema(): string {
  return temaActual() === 'claro' ? ICONO_LUNA : ICONO_SOL;
}

export function montarCabecera(): void {
  const host = document.getElementById('cabecera');
  if (!host) return;

  host.innerHTML = /* html */ `
    <header
      class="fixed inset-x-0 top-0 z-30 border-b bg-fondo/80 backdrop-blur linea"
    >
      <div class="contenedor flex h-14 items-center justify-between gap-4">
        <a
          href="#/"
          class="flex shrink-0 items-center gap-2.5 text-sm text-texto"
          aria-label="Inicio"
        >
          <svg viewBox="0 0 32 32" width="20" height="20" aria-hidden="true">
            <circle cx="16" cy="16" r="10" fill="none" stroke="currentColor"
              stroke-width="1.4" opacity="0.45" />
            <circle cx="16" cy="16" r="4.5" fill="rgb(var(--color-acento))" />
          </svg>
          <span class="font-display">Inteligencia Natural</span>
        </a>

        <nav class="flex items-center gap-1" aria-label="Secciones">
          <ul class="hidden items-center gap-1 sm:flex">
            ${ENLACES.map(
              (enlace) => /* html */ `
                <li>
                  <a
                    class="rounded-full px-3 py-2 text-sm text-tenue transition-colors hover:text-texto"
                    href="${enlace.href}"
                  >${enlace.texto}</a>
                </li>
              `,
            ).join('')}
          </ul>
          <button
            id="conmutador-tema"
            type="button"
            class="ml-1 grid h-9 w-9 place-items-center rounded-full border text-tenue
              transition-colors hover:text-acento linea"
            aria-label="${etiquetaTema()}"
            title="${etiquetaTema()}"
          >${iconoTema()}</button>
        </nav>
      </div>
    </header>
    <div class="h-14" aria-hidden="true"></div>
  `;

  const boton = host.querySelector<HTMLButtonElement>('#conmutador-tema');
  boton?.addEventListener('click', () => {
    alternarTema();
    boton.innerHTML = iconoTema();
    boton.setAttribute('aria-label', etiquetaTema());
    boton.setAttribute('title', etiquetaTema());
  });
}
