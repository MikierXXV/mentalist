import fuentesRaw from '../content/fuentes.json';
import enlacesRaw from '../content/enlaces-oficiales.json';

/** Tipo de fuente pública de la que procede la capa oficial. */
export type TipoFuente = 'libro' | 'entrevista' | 'video' | 'web' | 'podcast';

/**
 * Cómo se puede atribuir el contenido de la capa oficial.
 *
 * - `formulacion_propia`: la fuente recoge palabras suyas (libro, prensa, web
 *   oficial). Admite una cita textual breve.
 * - `tema_de_episodio`: la fuente es un podcast cuya descripción escribe el
 *   anfitrión, no él. Solo permite describir de qué se habla en el episodio:
 *   nunca se le atribuye una formulación concreta, y por eso no admite cita.
 */
export type TipoAtribucion = 'formulacion_propia' | 'tema_de_episodio';

export type Familia = 'percepcion' | 'influencia' | 'lectura' | 'memoria';

/** Una por concepto; los ids los resuelve `src/viz/runtime.ts`. */
export type Visualizacion =
  | 'punto-ciego'
  | 'linterna'
  | 'expectativa'
  | 'correccion'
  | 'rellenar-huecos'
  | 'copia-de-copia'
  | 'eco'
  | 'dos-canales'
  | 'enano-y-gigante'
  | 'captura'
  | 'distribucion'
  | 'estrechamiento'
  | 'siembra'
  | 'microexpresion'
  | 'precision'
  | 'donde-vive-el-efecto';

export interface Fuente {
  id: string;
  tipo: TipoFuente;
  titulo: string;
  publicacion: string;
  fecha?: string;
  url: string;
}

export interface ExplicacionOficial {
  tipo_atribucion: TipoAtribucion;
  resumen: string;
  cita_breve?: string;
  fuente_id: string;
  fuentes_extra?: string[];
}

export interface Concepto {
  id: string;
  orden: number;
  titulo: string;
  gancho: string;
  familia: Familia;
  visualizacion: Visualizacion;
  /** Descripción textual de la escena; el lienzo es decorativo. */
  visualizacion_alt: string;
  explicacion_didactica: string[];
  experimento?: string;
  nota_matiz?: string;
  explicacion_oficial: ExplicacionOficial;
}

export interface EnlaceOficial {
  etiqueta: string;
  descripcion: string;
  url: string;
}

export const FAMILIAS: Record<Familia, string> = {
  percepcion: 'Percepción y atención',
  influencia: 'Sugestión e influencia',
  lectura: 'Lectura de personas',
  memoria: 'Memoria y decisión',
};

export const ETIQUETA_TIPO_FUENTE: Record<TipoFuente, string> = {
  libro: 'Libro',
  entrevista: 'Entrevista',
  video: 'Vídeo',
  web: 'Web',
  podcast: 'Podcast',
};

/** Máximo de palabras permitido en una cita textual, por las reglas del proyecto. */
const MAX_PALABRAS_CITA = 15;

const fuentesPorId: Record<string, Fuente> = Object.fromEntries(
  Object.entries(fuentesRaw as Record<string, Omit<Fuente, 'id'>>).map(
    ([id, fuente]) => [id, { id, ...fuente }],
  ),
);

const modulos = import.meta.glob<{ default: Concepto }>(
  '../content/conceptos/*.json',
  { eager: true },
);

export const conceptos: Concepto[] = Object.values(modulos)
  .map((modulo) => modulo.default)
  .sort((a, b) => a.orden - b.orden);

export const enlacesOficiales: EnlaceOficial[] = (
  enlacesRaw as { enlaces: EnlaceOficial[] }
).enlaces;

export const notaEnlaces: string = (enlacesRaw as { nota: string }).nota;

export function obtenerConcepto(id: string): Concepto | undefined {
  return conceptos.find((concepto) => concepto.id === id);
}

export function obtenerFuente(id: string): Fuente | undefined {
  return fuentesPorId[id];
}

/** Todas las fuentes efectivamente usadas por algún concepto, agrupadas por tipo. */
export function fuentesUsadas(): Map<TipoFuente, Fuente[]> {
  const ids = new Set<string>();
  for (const concepto of conceptos) {
    ids.add(concepto.explicacion_oficial.fuente_id);
    for (const extra of concepto.explicacion_oficial.fuentes_extra ?? []) {
      ids.add(extra);
    }
  }

  const agrupadas = new Map<TipoFuente, Fuente[]>();
  for (const id of ids) {
    const fuente = fuentesPorId[id];
    if (!fuente) continue;
    const grupo = agrupadas.get(fuente.tipo) ?? [];
    grupo.push(fuente);
    agrupadas.set(fuente.tipo, grupo);
  }

  for (const grupo of agrupadas.values()) {
    grupo.sort((a, b) => a.publicacion.localeCompare(b.publicacion, 'es'));
  }
  return agrupadas;
}

/** Índice inverso: qué conceptos citan una fuente dada. */
export function conceptosPorFuente(fuenteId: string): Concepto[] {
  return conceptos.filter((concepto) => {
    const oficial = concepto.explicacion_oficial;
    return (
      oficial.fuente_id === fuenteId ||
      (oficial.fuentes_extra ?? []).includes(fuenteId)
    );
  });
}

export function conceptosPorFamilia(): Array<{
  familia: Familia;
  titulo: string;
  conceptos: Concepto[];
}> {
  return (Object.keys(FAMILIAS) as Familia[]).map((familia) => ({
    familia,
    titulo: FAMILIAS[familia],
    conceptos: conceptos.filter((concepto) => concepto.familia === familia),
  }));
}

/**
 * Comprobaciones editoriales que solo corren en desarrollo. Cada una traduce una
 * de las reglas de derechos de autor y de atribución del proyecto, de modo que
 * una infracción se vea al instante en la consola en lugar de llegar a producción.
 */
export function validarContenido(): string[] {
  const errores: string[] = [];
  const vistos = new Set<string>();
  const visualizaciones = new Map<string, string>();

  for (const concepto of conceptos) {
    const prefijo = `[${concepto.id}]`;

    if (vistos.has(concepto.id)) errores.push(`${prefijo} id duplicado`);
    vistos.add(concepto.id);

    if (!concepto.explicacion_didactica.length) {
      errores.push(`${prefijo} sin explicación didáctica`);
    }

    if (!concepto.visualizacion_alt?.trim()) {
      errores.push(`${prefijo} la visualización no tiene texto alternativo`);
    }

    // La regresión que motivó rehacerlas: varias fichas compartiendo escena.
    const duenoPrevio = visualizaciones.get(concepto.visualizacion);
    if (duenoPrevio) {
      errores.push(
        `${prefijo} repite la visualización "${concepto.visualizacion}", ya usada por ${duenoPrevio}`,
      );
    }
    visualizaciones.set(concepto.visualizacion, concepto.id);

    const oficial = concepto.explicacion_oficial;

    if (!oficial.resumen?.trim()) {
      errores.push(`${prefijo} la capa oficial no tiene resumen`);
    }

    const fuente = fuentesPorId[oficial.fuente_id];
    if (!fuente) {
      errores.push(`${prefijo} fuente desconocida: "${oficial.fuente_id}"`);
    } else if (!fuente.url) {
      errores.push(`${prefijo} la fuente "${fuente.id}" no tiene URL pública`);
    }

    for (const extra of oficial.fuentes_extra ?? []) {
      if (!fuentesPorId[extra]) {
        errores.push(`${prefijo} fuente extra desconocida: "${extra}"`);
      }
    }

    if (oficial.cita_breve) {
      const palabras = oficial.cita_breve.trim().split(/\s+/).length;
      if (palabras > MAX_PALABRAS_CITA) {
        errores.push(
          `${prefijo} cita de ${palabras} palabras, el máximo es ${MAX_PALABRAS_CITA}`,
        );
      }
      // Salvaguarda central: una descripción de episodio la escribe el
      // anfitrión, así que no puede sostener una cita atribuida a él.
      if (oficial.tipo_atribucion === 'tema_de_episodio') {
        errores.push(
          `${prefijo} un "tema_de_episodio" no puede llevar cita atribuida`,
        );
      }
    }
  }

  return errores;
}
