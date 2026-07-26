/**
 * Catálogo de regiones del cerebro.
 *
 * Vive aparte de la geometría a propósito: la interfaz necesita estas etiquetas
 * para pintar el panel y los botones, y si las importara del módulo que usa
 * Three.js arrastraría toda la biblioteca al paquete inicial.
 *
 * Salvaguarda editorial: el sitio dedica varias notas a desmontar mitos neuro,
 * así que esto NO es un mapa funcional. Son asociaciones orientativas para
 * navegar entre fichas, y así se formulan —«se asocia a…»— y así se advierte en
 * la propia sección.
 */

export const REGIONES = [
  'frontal',
  'parietal',
  'temporal',
  'occipital',
  'cerebelo',
  'tronco',
] as const;

export type Region = (typeof REGIONES)[number];

export interface EtiquetaRegion {
  id: Region;
  nombre: string;
  descripcion: string;
  /** Conceptos relacionados, por id de ficha. El validador comprueba que existen. */
  conceptos: string[];
}

export const ETIQUETAS: EtiquetaRegion[] = [
  {
    id: 'frontal',
    nombre: 'Zona frontal',
    descripcion:
      'Se asocia a la deliberación, al control voluntario y a sostener la atención frente a lo que compite por ella.',
    conceptos: [
      'sesgos-y-atencion-robada',
      'ilusion-de-eleccion-libre',
      'consciente-subconsciente',
    ],
  },
  {
    id: 'parietal',
    nombre: 'Zona parietal',
    descripcion:
      'Se asocia a integrar lo que llega por los sentidos y a orientar el foco hacia un punto concreto.',
    conceptos: ['atencion-selectiva', 'sugestion-hipnotica'],
  },
  {
    id: 'temporal',
    nombre: 'Zona temporal',
    descripcion:
      'Se asocia a la memoria y al reconocimiento: caras, voces y todo lo que se evoca reconstruyéndolo.',
    conceptos: ['memoria-reconstructiva', 'repeticion-y-creencia', 'siembra-de-ideas'],
  },
  {
    id: 'occipital',
    nombre: 'Zona occipital',
    descripcion:
      'Se asocia al procesamiento visual, donde lo que falta se completa antes de que uno lo perciba.',
    conceptos: ['percepcion-activa', 'lectura-fria', 'desmontar-videntes'],
  },
  {
    id: 'cerebelo',
    nombre: 'Cerebelo',
    descripcion:
      'Se asocia al ajuste fino del movimiento y del ritmo: buena parte de lo que se emite sin querer.',
    conceptos: ['no-verbal', 'microexpresiones-y-mentira', 'elicitacion'],
  },
  {
    id: 'tronco',
    nombre: 'Tronco encefálico',
    descripcion:
      'Se asocia a lo que sostiene el organismo sin intervención consciente: activación, alerta y respuesta automática.',
    conceptos: ['consciente-subconsciente', 'sugestion', 'tecnica-no-poder'],
  },
];
