# Inteligencia Natural

Sitio estático, divulgativo e interactivo sobre los conceptos de psicología, percepción y
persuasión que el mentalista **Javier Botía** expone públicamente en su libro, en prensa y en
podcasts.

Proyecto independiente, sin vinculación oficial con Javier Botía, con Arcopress ni con los
medios citados.

## Qué contiene y qué no

**Sí:** 16 conceptos —percepción, atención, sugestión, elicitación, lectura fría, memoria,
lenguaje no verbal, sesgos, hipnosis, siembra de ideas—, cada uno con una explicación didáctica
original, **su propia** visualización interactiva y un enlace a la fuente pública donde él trata
el tema. Más un cerebro 3D generado por código que sirve de entrada visual a los conceptos.

**No:** biografía ni trayectoria. Transcripciones o párrafos del libro. Material audiovisual
suyo. Ninguna reconstrucción del método técnico de sus efectos de mentalismo: si algo no tiene
explicación pública documentada, no aparece.

## Reglas de contenido

Están codificadas en `validarContenido()`, en [`src/content.ts`](src/content.ts), y se ejecutan
en cada arranque de `npm run dev`. Los incumplimientos salen por consola.

- Toda explicación didáctica es original.
- Toda afirmación atribuida tiene una fuente pública enlazada.
- Las citas textuales son de un máximo de 15 palabras y siempre llevan atribución.
- La capa oficial tiene dos modos, y la distinción es visible en la interfaz:
  - `formulacion_propia` — la fuente recoge palabras suyas (libro, prensa, web). Admite cita.
  - `tema_de_episodio` — la fuente es un podcast cuya descripción **la escribe el anfitrión**.
    Solo se describe de qué se habla en el episodio. La validación rechaza cualquier cita en
    una ficha de este tipo.
- Cada concepto tiene una visualización distinta: la validación rechaza que dos fichas
  compartan la misma.
- El cerebro 3D es navegación temática, no un mapa funcional. Sus etiquetas se formulan como
  «se asocia a…» y la sección lo advierte: el sitio dedica varias notas a desmontar mitos neuro
  y no puede caer en uno.

## Estructura

```
content/
  conceptos/*.json        una ficha por concepto
  fuentes.json            catálogo de fuentes, referenciado por fuente_id
  enlaces-oficiales.json  canales oficiales
src/
  content.ts              tipos, carga y validaciones editoriales
  tema.ts                 estado del tema claro/oscuro y paleta para Three.js
  ui/                     cabecera, cargador, hero, cerebro, índice, ficha, fuentes
  anim/                   GSAP: entrada de vistas, scroll, progreso y revelados
  viz/
    runtime.ts            renderer compartido, controles y carga diferida
    base.ts               ruido, nubes de puntos y utilidades de escena
    cerebro*.ts           geometría procedural del cerebro y sus regiones
    <16 módulos>          una visualización por concepto
```

### Cómo funciona una visualización

Cada módulo de `src/viz/` exporta `init(ctx)` y, si lo necesita, un array `controles` que el
runtime pinta como `<button>` e `<input type="range">` nativos bajo el lienzo —así funcionan con
teclado y en táctil, donde no hay `hover`—. `ctx.estado(texto)` escribe en una región `aria-live`
para que el resultado de la escena también esté disponible sin verla.

El lienzo es decorativo; la descripción real vive en `visualizacion_alt`, dentro del JSON del
concepto.

### Añadir un concepto

1. Crear `content/conceptos/<id>.json` siguiendo el esquema de un archivo existente.
2. Si la fuente es nueva, añadirla a `content/fuentes.json` y referenciarla con `fuente_id`.
3. `npm run dev` y revisar la consola: la validación avisa de fuentes desconocidas, citas
   demasiado largas y citas en fichas de podcast.

No hay que tocar la interfaz: las fichas se cargan por `import.meta.glob` y se ordenan por el
campo `orden`.

## Desarrollo

```bash
npm install
npm run dev        # servidor de desarrollo
npm run build      # comprobación de tipos + build de producción en dist/
npm run preview    # sirve dist/ localmente
```

Requiere Node 20 o superior.

## Despliegue

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) construye y publica en GitHub
Pages en cada push a `main`.

Para activarlo:

1. Crear el repositorio en GitHub y hacer push de `main`.
2. En **Settings → Pages**, poner **Source: GitHub Actions**.

El workflow pasa `BASE_PATH=/<nombre-del-repo>/` al build, así que la ruta base se ajusta sola
al nombre del repositorio. En local, `vite.config.ts` usa `/mentalist/` por defecto; para
construir con otra ruta, `BASE_PATH=/otra/ npm run build`.

Publicado en <https://mikierxxv.github.io/mentalist/>.

## Accesibilidad

Navegación completa por teclado, `<details>` nativos para la capa oficial, controles de las
visualizaciones como elementos nativos, canvas con descripción textual y regiones `aria-live`
para lo que cada escena «dice». Las zonas del cerebro son alcanzables con `Tab` desde la lista
de botones, sin depender del ratón.

Con `prefers-reduced-motion` activo, las visualizaciones y el cerebro se pintan en un único
fotograma estático, el bloque interactivo aparece sin transición y las animaciones de scroll y
el cargador se desactivan.

El tema sigue la preferencia del sistema y se puede forzar desde la cabecera; la elección se
recuerda. Un script en línea del `<head>` lo aplica antes del primer pintado para que nadie
reciba un fogonazo blanco.

## Créditos de las fuentes

Todas las fuentes usadas aparecen enlazadas en la sección **Fuentes** del sitio y en
`content/fuentes.json`. El libro citado es *Inteligencia Natural. Descubre tu poder mental*
(Arcopress, sello de Almuzara Libros, 2026, ISBN 978-84-10354-73-9).
