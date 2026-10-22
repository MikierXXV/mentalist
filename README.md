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

## El modelo 3D del cerebro

El repositorio versiona `public/modelos/cerebro-web.glb` (1,3 MB), que es lo que carga el sitio.
No hace falta hacer nada para desarrollar ni para desplegar.

Solo si hay que regenerarlo —por ejemplo para cambiar de modelo—:

1. Descargar de Sketchfab [Human Brain, de AH (@agher)](https://sketchfab.com/3d-models/human-brain-c9c9d4d671b94345952d012cc2ea7a24)
   en formato **GLB** (requiere cuenta) y dejarlo en `modelos-fuente/cerebro.glb`.
   Esa carpeta está en `.gitignore` y, sobre todo, está fuera de `public/`: Vite copia
   `public/` entera a `dist/`, así que dejar ahí el original lo publicaría también.
2. `npm run preparar-cerebro`

El script se queda solo con la geometría —tres mallas: cerebro, cerebelo y tronco—, descarta las
nueve texturas embebidas y baja los índices a 16 bits: de 8 MB a 1,3 MB. Las texturas no se usan
porque el cerebro se pinta con el shader del sitio, para heredar su paleta y el resalte por regiones.

Si el archivo faltara, [`src/viz/cerebro-modelo.ts`](src/viz/cerebro-modelo.ts) devuelve `null` y las
escenas recurren a la geometría procedural de
[`src/viz/cerebro-geometria.ts`](src/viz/cerebro-geometria.ts), de modo que la sección nunca se queda
vacía.

## Los reels

Cada concepto puede tener un reel: un vídeo vertical de menos de un minuto que se ve en su ficha,
en la tira de su familia en el índice y en la página `#/reels`. Se producen fuera de este
repositorio, en `videos-cortos/reel/reels/<id>/` (`salida/<id>.mp4`, `salida/<id>-portada.png` y
`post.md`), y se traen con:

```bash
npm run importar-reels               # importa lo nuevo o cambiado; ignora lo que aún no existe
npm run importar-reels -- --forzar   # vuelve a transcodificar todo
```

Necesita `ffmpeg` y `ffprobe` en el PATH. El script transcodifica cada vídeo a 720×1280 con un
bitrate calculado para no pasar de 6,5 MB, genera dos pósters WebP (720 y 360 px) en `public/reels/`
y escribe `content/reels.json` con el título, la descripción accesible y las fuentes de `post.md`, y
la transcripción de `guion.json`. Ese manifiesto no se edita a mano. La correspondencia entre
carpeta y concepto está al principio del script: los cuatro primeros reels se llaman como su familia.

`npm run validar` comprueba que cada reel cuelgue de un concepto que exista, que estén sus archivos,
que traiga descripción y transcripción y que no pase de 8 MB.

## Despliegue

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) construye y publica en GitHub
Pages en cada push a `main`.

El workflow intenta activar Pages por su cuenta la primera vez (`configure-pages` con
`enablement: true`). Eso solo funciona si el repositorio deja escribir al `GITHUB_TOKEN`. Si el
primer despliegue falla con `Resource not accessible by integration`, basta con una de estas dos
cosas, una sola vez:

- **Settings → Pages → Source: GitHub Actions**, o
- **Settings → Actions → General → Workflow permissions → Read and write permissions**.

Después, relanzar el workflow desde la pestaña **Actions**.

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

## Créditos

Todas las fuentes usadas aparecen enlazadas en la sección **Fuentes** del sitio y en
`content/fuentes.json`. El libro citado es *Inteligencia Natural. Descubre tu poder mental*
(Arcopress, sello de Almuzara Libros, 2026, ISBN 978-84-10354-73-9).

Modelo 3D: [«Human Brain»](https://sketchfab.com/3d-models/human-brain-c9c9d4d671b94345952d012cc2ea7a24)
de AH (@agher), bajo [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
**Modificado**: se le han retirado las texturas y los materiales, se han reducido los índices a 16
bits y se pinta con el material de este sitio.
