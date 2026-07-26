# Inteligencia Natural

Sitio estático, divulgativo e interactivo sobre los conceptos de psicología, percepción y
persuasión que el mentalista **Javier Botía** expone públicamente en su libro, en prensa y en
podcasts.

Proyecto independiente, sin vinculación oficial con Javier Botía, con Arcopress ni con los
medios citados.

## Qué contiene y qué no

**Sí:** 16 conceptos —percepción, atención, sugestión, elicitación, lectura fría, memoria,
lenguaje no verbal, sesgos, hipnosis, siembra de ideas—, cada uno con una explicación didáctica
original, una visualización interactiva y un enlace a la fuente pública donde él trata el tema.

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

## Estructura

```
content/
  conceptos/*.json        una ficha por concepto
  fuentes.json            catálogo de fuentes, referenciado por fuente_id
  enlaces-oficiales.json  canales oficiales
src/
  content.ts              tipos, carga y validaciones editoriales
  ui/                     hero, índice, ficha, fuentes, enlaces
  anim/                   GSAP: entrada de vistas, scroll y progreso
  viz/                    runtime Three.js + las 4 visualizaciones
```

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
al nombre del repositorio. En local, `vite.config.ts` usa `/mentalista/` por defecto; para
construir con otra ruta, `BASE_PATH=/otra/ npm run build`.

## Accesibilidad

Navegación completa por teclado, `<details>` nativos para la capa oficial, canvas marcados como
imagen con descripción textual, y respeto de `prefers-reduced-motion`: con esa preferencia
activa las visualizaciones se pintan en un único fotograma estático y las animaciones de scroll
se desactivan.

## Créditos de las fuentes

Todas las fuentes usadas aparecen enlazadas en la sección **Fuentes** del sitio y en
`content/fuentes.json`. El libro citado es *Inteligencia Natural. Descubre tu poder mental*
(Arcopress, sello de Almuzara Libros, 2026, ISBN 978-84-10354-73-9).
