/** Escapa texto procedente del contenido antes de interpolarlo en HTML. */
export function esc(valor: string): string {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Ruta de la ficha de un concepto. */
export function rutaConcepto(id: string): string {
  return `#/concepto/${id}`;
}

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** Convierte "2026-02-19" en "19 de febrero de 2026". */
export function formatearFecha(iso: string | undefined): string {
  if (!iso) return '';
  const [anio, mes, dia] = iso.split('-');
  if (!anio || !mes || !dia) return iso;
  const nombreMes = MESES[Number(mes) - 1];
  if (!nombreMes) return iso;
  return `${Number(dia)} de ${nombreMes} de ${anio}`;
}
