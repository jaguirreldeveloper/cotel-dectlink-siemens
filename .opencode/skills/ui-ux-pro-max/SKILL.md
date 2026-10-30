---
name: COTEL UI/UX Pro Max
description: Sistema de diseño del frontend COTEL DECTlink (React 19 + Tailwind 4). Usar SIEMPRE al crear, retocar o revisar pantallas, modales, widgets y estilos de frontend/ — paleta de marca y semántica de estados, tokens @theme, componentes compartidos (Button/Modal/StatusBadge/Card), dark mode, accesibilidad y reglas UX del dominio (RBAC, fuente de datos).
---

# Sistema de diseño COTEL DECTlink

Estas reglas describen el estilo **ya establecido** en `frontend/`. El objetivo es que
toda pantalla nueva o modificación se vea como parte de las 21 vistas existentes, no
como un añadido genérico. Antes de escribir UI, leer el componente compartido más
cercano al patrón que necesites (ver «Componentes a reutilizar»).

## 1. Tokens (Tailwind v4, `frontend/src/index.css` → `@theme`)

No inventar valores ad-hoc: usar los tokens existentes.

| Token | Valor | Uso |
|---|---|---|
| `rounded-control` | 8px | botones, inputs, chips, selects |
| `rounded-card` | 12px | tarjetas |
| `rounded-panel` | 16px | paneles elevados, modales |
| `shadow-card` / `shadow-card-hover` | sutiles | tarjetas estáticas / al hover |
| `shadow-panel` | media | modales, dropdowns |
| `shadow-float` | alta | solo overlays realmente flotantes (menús, tooltips) |
| `bg-brand-*` `text-brand-*` | escala emerald completa (50–950) | identidad COTEL en cualquier matiz |

La elevación es **sutil y de tres niveles** (card → panel → float). Nunca sombras
dramáticas ni `shadow-2xl` fuera de contexto flotante real.

## 2. Paleta semántica de estados (obligatoria)

El color comunica el estado de la línea DECT. Cualquier vista nueva debe mapearlo
igual que `shared/ui/StatusBadge.tsx`:

| Estado | Color | Clases base (claro) |
|---|---|---|
| `C/SERV.` | emerald (verde=OK) | `bg-emerald-100 text-emerald-800` |
| `EN DEPOSITO` | blue | `bg-blue-100 text-blue-800` |
| `CORTE X MORA` | amber | `bg-amber-100 text-amber-800` |
| `FALLA TECNICA` | rose | `bg-rose-100 text-rose-800` |
| `S/SERV.` / dato provisional | slate | `bg-slate-100 text-slate-700` |

Reglas de paleta:
- **Marca = `brand-*`** (verde emerald). Acciones primarias: `primary` del `Button`.
- **rojo (`rose`) solo para destructivo o falla real**; nunca para acento decorativo.
- La cooperativa es una **institución pública**: nada de gradientes multicolor,
  glassmorphism ni efectos chillones. Superficies planas, jerarquía por contraste y
  elevación sutil.

## 3. Componentes a reutilizar (`shared/ui/`)

Prohibido recrear estos patrones ad-hoc (ya se consolidaron 5+ duplicados):

- **`Button`** — variantes `primary | secondary | ghost | outline | danger | soft`,
  tamaños `sm | md | lg`, `icon` (Lucide). Siempre un `<button>` real, no divs.
- **`Modal`** — `role="dialog"`, `aria-modal`, Escape, gestión de foco (entrada en el
  panel, devolución al cerrar), overlay fade + panel zoom. Para modales oscuros usar
  `dark`, no CSS custom.
- **`StatusBadge`** — todo badge de estado operacional sale de aquí.
- **`Card`, `SectionHeader`, `ErrorBoundary`** — estructura de página estándar.

## 4. Dark mode

- Toda clase de color lleva su contraparte `dark:` en el mismo className.
- Superficies oscuras `dark:bg-slate-950/80` (u `800/900` según profundidad), nunca negro puro.
- Los acentos de texto en oscuro bajan un paso (`dark:text-emerald-300`).

## 5. Iconografía

Iconos **exclusivamente Lucide** (`lucide-react`), `size` coherente con el texto que
acompaña (por defecto 16–20px). Si el botón lleva icono, usar el prop `icon` de `Button`.

## 6. Accesibilidad (checklist obligatoria)

1. Texto con contraste suficiente (mínimo WCAG AA 4.5:1 en cuerpo; comprobar en ambos temas).
2. Foco visible con `focus-visible:ring-brand-500` (o `ring-slate-400` para neutros).
3. Área de toque ≥ 40px en acciones de tablas (expandir filas con padding y `w-full`).
4. `aria-label` en todo botón de solo icono.
5. Navegación por teclado ordenada; nada debe quedar enfocable detrás de un modal.
6. Los estados no se comunican solo por color: el texto del badge siempre acompaña.
7. `min-w-0` / truncate en textos largos (nombres, direcciones) para no romper la tabla.

## 7. Reglas UX del dominio COTEL

- **Idioma**: toda la UI en español; textos del dominio con los términos del padrón
  (`nro`, celda, RFP, cuadrilla, bitácora).
- **RBAC visible**: las entradas del sidebar y las acciones se muestran según rol
  (ver `shared/utils/roles`). Nunca mostrar una acción que el backend rechazará.
- **Fuente de datos siempre visible**: al tocar datos, respetar el contrato de
  `DataSourceBar`/`UnifiedHeader` (cargando → conectado/CSV/demo). Los datos demo
  **jamás** se mezclan en silencio: siempre banner ámbar etiquetado.
- **Cargando**: placeholders skeleton («Cargando padrón real…»), nunca pantalla en blanco.
- **Números**: `nro` (identificador de negocio) siempre visible junto al teléfono;
  edición destructiva (anular lote, aplicar carga, borrar físico) requiere confirmación explícita.
- **Mapas Leaflet**: overlays de cobertura con el mismo lenguaje de color semántico de §2.

## 8. Anti-slop (lo que este proyecto NO es)

- ❌ Gradientes de fondo en tarjetas o landing, emoji como iconos de UI,
- ❌ Botones falsos (`div onClick`), alertas nativas (`window.alert/confirm`),
- ❌ Animaciones > 200ms o con rebote, badges duplicados con clases propias por vista,
- ❌ Colores fuera de la paleta (violet/cyan/fuchsia decorativos),
- ✅ Superficies planas, spacing consistente (4/8/16), tokens, Lucide, español, semántica.

## 9. Al revisar código de UI existente

1. ¿Usa los tokens o clases hardcodeadas equivalentes? (propones migrar solo si toca ese archivo)
2. ¿Tiene dark: en cada color? ¿focus-visible? ¿aria-labels?
3. ¿Duplica Modal/StatusBadge/Button? → refactor hacia shared/ui en el mismo cambio si es pequeño.
4. ¿El estado sigue la paleta semántica §2?
5. ¿Respeta RBAC y la fuente de datos?
