# Sistema de Diseño · COTEL DECTlink

<!-- impeccable:design-schema 1 -->

## Visión y North Star

**"Panel de instrumentación de telecomunicaciones":** Máxima precisión, densidad escaneable y estricta jerarquía de información para planta externa. El color nunca decora, solo informa estados operativos o identidad de rol.

Evolucionado desde la paleta estridente industrial hacia un **corporativo neutro técnico**: base de azul acero corporativo (`slate`/`brand`), acentos contenidos y máxima legibilidad en terreno bajo luz solar directa o en sala de control.

---

## 1. Tokens de Color

Definidos como fuente única de verdad en `@theme static` dentro de `src/index.css`, con capa de compatibilidad en `src/cotel-design-tokens.css`:

### 1.1 Marca Corporativa (Azul Acero)
- `--color-brand-50`: `#F1F5F9`
- `--color-brand-100`: `#E2E8F0`
- `--color-brand-200`: `#CBD5E1`
- `--color-brand-300`: `#94A3B8`
- `--color-brand-400`: `#64748B`
- `--color-brand-500`: `#355573` (Acción principal · Contraste WCAG AA ≥ 5.6:1 sobre blanco)
- `--color-brand-600`: `#28435D` (Hover y énfasis activo · Contraste WCAG AAA ≥ 7.9:1)
- `--color-brand-700`: `#1E3347`
- `--color-brand-800`: `#172737`
- `--color-brand-900`: `#0F1A26`
- `--color-brand-950`: `#0A111A`

### 1.2 Estados Operativos
- **Operativo / Con Servicio (`C/SERV.`):** Verde Esmeralda (`--color-success-500`: `#059669`, `--color-success-600`: `#047857`)
- **Advertencia / Deuda (`DEUDA`):** Ámbar técnico (`--color-warning-500`: `#D97706`, `--color-warning-600`: `#B45309`)
- **Falla / Sin Servicio (`S/SERV.` / `RETIRO`):** Rojo operativo (`--color-error-500`: `#DC2626`, `--color-error-600`: `#B91C1C`)
- **Información / Tránsito:** Azul información (`#0EA5E9`)

### 1.3 Roles Jerárquicos RBAC (Contraste Dual-Mode WCAG AA)
- **SUPERADMIN (Jefatura):** Fondo ámbar suave con texto ámbar oscuro (`amber-900`/`amber-200`)
- **ADMIN (Administración):** Fondo rosa técnico suave (`rose-900`/`rose-200`)
- **SUPERVISOR (Ingeniería):** Fondo violeta suave (`violet-900`/`violet-200`)
- **DESPACHADOR (Operaciones):** Fondo índigo suave (`indigo-900`/`indigo-200`)
- **TECNICO (Campo):** Fondo celeste cielo (`sky-900`/`sky-200`)
- **AUDITOR (Consulta ATT):** Fondo pizarra neutro (`slate-900`/`slate-200`)

---

## 2. Tipografía y Cifras

- **Fuente Sans:** `"Inter", ui-sans-serif, system-ui, sans-serif`
- **Fuente Mono:** `"JetBrains Mono", ui-monospace, SFMono-Regular, monospace` (reservada para teléfonos, coordenadas geodésicas, frecuencias MHz, direcciones MAC y códigos de celda RFP).
- **Cifras Tabulares:** Todas las métricas, contadores y balances emplean `tabular-nums` para alineación visual vertical en tablas y dashboards.

---

## 3. Radios y Elevaciones

- **Controles interactivos (inputs, botones, chips):** `0.375rem` (6px) — precisión y contención.
- **Tarjetas y paneles de datos:** `0.5rem` (8px).
- **Modales y drawers:** `0.75rem` (12px).
- **Sombras:** Planas y sutiles (`0 1px 2px rgb(15 23 42 / 0.06)`). Se eliminan sombras difusas exageradas y halos de neón.

---

## 4. Arquitectura de Shell y Navegación

- **UnifiedHeader:** Encabezado con estado en vivo del padrón (`Conectado a BD`, `CSV`, `Modo Demo`), accesos rápidos y disparador del menú móvil (`lg:hidden`).
- **AppSidebar:**
  - **Escritorio:** Barra lateral colapsable (64px / 256px) con persistencia en `localStorage`.
  - **Móvil / Tablet (<1024px):** Drawer modal accesible con backdrop semitransparente, cierre con tecla `Escape` o selección de módulo, garantizando accesibilidad total en dispositivos portátiles en campo.
- **AppFooter:** Barra de instrumentación con fuente del padrón, estado de conectividad y rango de espectro DECT (1880–1900 MHz).

---

## 5. Reglas de Calidad y Anti-Patrones Prohibidos

1. **Sin degradados en texto (`gradient-text`):** El énfasis se logra exclusivamente con peso tipográfico y tono contrastado.
2. **Sin bordes laterales gruesos decorativos (`border-l-4`):** Se emplean marcos limpios completos o acentos semánticos de 1–2px.
3. **Áreas táctiles mínimas:** Todos los botones y disparadores tienen una altura mínima de 38px a 44px para permitir uso con guantes y en pantallas táctiles de campo.
4. **Respeto a `prefers-reduced-motion`:** Transiciones atenuadas sin cortes bruscos globales de 0.01ms.
5. **Dato real prioritario:** La interfaz siempre declara de dónde vienen los datos y nunca mezcla datos demo con producción en silencio.

---

## 6. Tablas de abonados (registro único de columnas)

Fuente única en `src/entities/subscriber/columns.tsx`, con contrato de subconjunto validado por tests (`tests/subscriberColumns.test.ts`):

- **`RESUMEN_COLUMNS`** (6 columnas): Nro, Teléfono, Nombre, Zona, Estado, Señal — usado por **Abonados por Celda**.
- **`DETALLE_COLUMNS`** (15 columnas): el resumen + Dirección, Contrato, F. Servicio, FAU, Deuda, Tiempo Dep., Falla, GPS y Mapa — usado por **Detalle por Celda**.
- **Regla:** `RESUMEN ⊂ DETALLE` (mismo `key`, mismo label); agregar una columna nueva empieza en `DETALLE_COLUMNS`.
- **Padrón:** conserva su propia tabla de 13 columnas en línea (`DataTable.tsx`: Nro, Número, Contrato, Titular, Dirección, Fecha alta, Celda, Zona, Distancia, GEO, MAPA, Estado DECT, Acción), con la misma semántica GEO/MAPA que el registro compartido.
- **Presentación:** cabecera y primera columna *sticky*, números con `tabular-nums` y mono donde corresponde (teléfonos, coordenadas), alineación centrada opcional en `Th`/`SortableTh`, y `EmptyState` con sus textos fijos ("No se encontraron abonados…").
- **Padrón:** franja de resumen + chips de estado cuyo conteo es sobre `baseFiltered` (todos los filtros salvo estado); drill-down de fila a Abonados por Celda con `stopPropagation` en el enlace Mapa.
- **Paginación compartida:** 5/10/15/20/25 filas, defecto 10 (`src/shared/utils/pagination.ts`).
