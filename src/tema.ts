/**
 * Estado del tema claro / oscuro.
 *
 * El tema inicial ya lo estampa un script en línea del `<head>` (ver index.html)
 * para que no haya fogonazo antes del primer pintado. Este módulo se limita a
 * leerlo, alternarlo, recordarlo y avisar a quien dependa de la paleta —en
 * particular las escenas de Three.js, que no pueden heredar colores del CSS.
 */

export type Tema = 'claro' | 'oscuro';

export const CLAVE_ALMACEN = 'inteligencia-natural:tema';

/** Los mismos valores que src/styles.css declara para cada tema. */
const PALETAS = {
  oscuro: {
    fondo: 0x0b0d12,
    superficie: 0x141821,
    texto: 0xf4f1ea,
    tenue: 0x8a8f9c,
    acento: 0xc9a227,
    acentoClaro: 0xe8c85a,
    // El cerebro necesita su propio tono: es un volumen sombreado, y con el gris
    // de los textos se hunde contra el fondo en ambos temas.
    cerebro: 0x9aa3b8,
  },
  claro: {
    fondo: 0xf7f4ed,
    superficie: 0xffffff,
    texto: 0x1b1d24,
    tenue: 0x5f6470,
    acento: 0x9a7b12,
    acentoClaro: 0xc9a227,
    cerebro: 0xc4b6a4,
  },
} as const;

export type Paleta = (typeof PALETAS)[Tema];

type Escucha = (tema: Tema, paleta: Paleta) => void;

const escuchas = new Set<Escucha>();

export function temaActual(): Tema {
  return document.documentElement.dataset.theme === 'light' ? 'claro' : 'oscuro';
}

export function paletaViz(): Paleta {
  return PALETAS[temaActual()];
}

function aplicar(tema: Tema): void {
  document.documentElement.dataset.theme = tema === 'claro' ? 'light' : 'dark';
  document.documentElement.style.colorScheme = tema === 'claro' ? 'light' : 'dark';
  const paleta = PALETAS[tema];
  for (const escucha of escuchas) escucha(tema, paleta);
}

export function alternarTema(): Tema {
  const siguiente: Tema = temaActual() === 'claro' ? 'oscuro' : 'claro';
  try {
    localStorage.setItem(CLAVE_ALMACEN, siguiente);
  } catch {
    // Modo privado o almacenamiento bloqueado: el tema vale para esta sesión.
  }
  aplicar(siguiente);
  return siguiente;
}

/** Se suscribe a los cambios de tema. Devuelve la función para darse de baja. */
export function alCambiarTema(escucha: Escucha): () => void {
  escuchas.add(escucha);
  return () => escuchas.delete(escucha);
}

/**
 * Mientras el usuario no haya elegido explícitamente, el sitio sigue al sistema
 * operativo también en caliente: si cambia a oscuro al anochecer, la página va detrás.
 */
export function seguirPreferenciaDelSistema(): void {
  const consulta = window.matchMedia('(prefers-color-scheme: dark)');
  consulta.addEventListener('change', (evento) => {
    let elegido: string | null = null;
    try {
      elegido = localStorage.getItem(CLAVE_ALMACEN);
    } catch {
      elegido = null;
    }
    if (elegido) return;
    aplicar(evento.matches ? 'oscuro' : 'claro');
  });
}
