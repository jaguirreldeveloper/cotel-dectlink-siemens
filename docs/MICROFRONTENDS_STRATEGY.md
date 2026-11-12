# Estrategia de Microfrontends y Code Splitting

**Fecha:** 2026-11-12  
**Versión:** 1.0  
**Estado:** Propuesta / Diseño

---

## 🎯 Objetivo

Reducir el tamaño del bundle inicial del frontend y mejorar el tiempo de carga implementando:
1. **Code Splitting** - Dividir el bundle en chunks más pequeños
2. **Lazy Loading** - Cargar módulos bajo demanda
3. **Microfrontends** - Separar módulos por dominio funcional

---

## 📊 Análisis Actual

### Tamaño del Bundle (Vite Build)
```
dist/assets/main-B0xhgRcy.css             137.20 kB
/dist/assets/leaflet-DV1VrHZB.js         149.37 kB
dist/assets/vendor-B3IQnQ6K.js          348.31 kB
dist/main-DFpjqz3l.js                   522.64 kB
```

**Total:** ~1.1 MB (sin gzip)  
**Problema:** Todos los módulos se cargan al inicio, incluso si el usuario no los usa.

### Módulos del Frontend (23 módulos en `src/features/`)
| Módulo | Tamaño Estimado | Frecuencia de Uso | Prioridad de Lazy Load |
|--------|----------------|-------------------|------------------------|
| DataTable | Alto | Siempre | ❌ (crítico) |
| GpsCalibrationView | Medio | Frecuente | ⚠️ |
| WorkOrdersKanbanView | Medio | Ocasional | ✅ |
| GisCoverageMapView | Alto | Ocasional | ✅ |
| RfLineOfSightView | Alto | Poco frecuente | ✅ |
| TechMigrationPlannerView | Medio | Poco frecuente | ✅ |
| DatabaseExplorerView | Alto | Solo admin | ✅ |
| UserManagementView | Medio | Solo admin | ✅ |
| SupabaseMigrationModal | Bajo | Raro | ✅ |
| GitMigrationModal | Bajo | Raro | ✅ |
| DataAuditView | Medio | Ocasional | ✅ |
| InstitutionalView | Medio | Ocasional | ✅ |
| OfficialTechnicalSheetsView | Medio | Ocasional | ✅ |
| PadronCargasView | Medio | Solo admin | ✅ |
| CellUsersView | Medio | Ocasional | ✅ |
| CellDetailView | Medio | Ocasional | ✅ |
| CeldasCrudView | Medio | Solo admin | ✅ |

---

## 📋 Implementación Propuesta

### Paso 1: Configurar Vite para Code Splitting

En `vite.config.ts`, asegurarse de que el code splitting esté habilitado:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Habilitar code splitting automático
    rollupOptions: {
      output: {
        manualChunks: {
          // Agrupar dependencias grandes
          'leaflet': ['leaflet'],
          'lucide': ['lucide-react'],
          'react-table': ['@tanstack/react-table'],
          // Agrupar módulos por dominio
          'gis': ['@/features/gis-coverage', '@/features/rf-line-of-sight'],
          'admin': ['@/features/database-explorer', '@/features/users'],
          'operations': ['@/features/work-orders', '@/features/dect-operations'],
        },
      },
    },
  },
});
```

### Paso 2: Implementar Lazy Loading en React

Usar `React.lazy` y `Suspense` para cargar módulos bajo demanda:

```typescript
// Antes
import { GisCoverageMapView } from '@/features/gis-coverage/GisCoverageMapView';

// Después
const GisCoverageMapView = lazy(() => import('@/features/gis-coverage/GisCoverageMapView'));

// En el render
<Suspense fallback={<LoadingFallback />}>
  <GisCoverageMapView records={data.records} />
</Suspense>
```

### Paso 3: Añadir export default a todos los módulos

Actualmente, algunos módulos usan `export function` directamente. Para que funcionen con `React.lazy`, necesitan `export default`:

```typescript
// Antes
export function GisCoverageMapView(props: GisCoverageMapViewProps) { ... }

// Después
function GisCoverageMapView(props: GisCoverageMapViewProps) { ... }
export default GisCoverageMapView;
```

### Paso 4: Agrupar módulos por dominio

Crear una estructura de carpetas que refleje los dominios:

```
frontend/src/
├── features/
│   ├── padron/                     # Dominio: Padrón
│   │   ├── DataTable.tsx
│   │   ├── subscribers/
│   │   └── index.ts
│   ├── operaciones/               # Dominio: Operaciones
│   │   ├── WorkOrdersKanbanView.tsx
│   │   ├── DectLinkOperationsView.tsx
│   │   └── index.ts
│   ├── gis/                       # Dominio: GIS
│   │   ├── GisCoverageMapView.tsx
│   │   ├── RfLineOfSightView.tsx
│   │   └── index.ts
│   ├── administracion/            # Dominio: Administración
│   │   ├── DatabaseExplorerView.tsx
│   │   ├── UserManagementView.tsx
│   │   └── index.ts
│   └── infraestructura/          # Dominio: Infraestructura
│       ├── InfraestructuraView.tsx
│       ├── CeldasCrudView.tsx
│       └── index.ts
└── routes/
    └── index.tsx                  # Rutas con lazy loading
```

### Paso 5: Preload de módulos

Precargar módulos cuando el usuario está inactivo o cuando el mouse pasa sobre elementos de navegación:

```typescript
// Preload en idle
useEffect(() => {
  const idleTimer = setTimeout(() => {
    // Precargar módulos pesados
    import('@/features/gis-coverage/GisCoverageMapView');
    import('@/features/database-explorer/DatabaseExplorerView');
  }, 5000);
  
  return () => clearTimeout(idleTimer);
}, []);

// Preload en hover
<button 
  onMouseEnter={() => {
    import('@/features/gis-coverage/GisCoverageMapView');
  }}
  onClick={() => navigate('/map')}
>
  Mapa GIS
</button>
```

---

## 📊 Beneficios Esperados

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Tamaño del bundle inicial | ~1.1 MB | ~300-400 KB | ~60-70% |
| Tiempo de carga inicial | ~2-3s | ~1-1.5s | ~50% |
| Tiempo de carga de módulo | Instantáneo | ~100-300ms | - |

---

## ⚠️ Consideraciones

### 1. Experiencia de Usuario
- **Ventaja:** La página carga más rápido inicialmente
- **Desventaja:** Puede haber un pequeño delay al navegar a un módulo no cargado
- **Solución:** Usar Suspense con good fallback UI y preload

### 2. SEO
- **Problema:** Los motores de búsqueda pueden no esperar a que se carguen los módulos lazy
- **Solución:** Renderizar el contenido crítico en el servidor (SSR) o usar Server-Side Rendering

### 3. Debugging
- **Problema:** Más complejo de debuggear con code splitting
- **Solución:** Usar nombres descriptivos para los chunks y mapear en source maps

---

## 🚀 Implementación Incremental

### Fase 1: Configuración Inicial (1 día)
- [ ] Configurar Vite para code splitting
- [ ] Añadir `export default` a 3-5 módulos menos críticos
- [ ] Implementar lazy loading para esos módulos en App.tsx
- [ ] Añadir Suspense boundaries con fallback

### Fase 2: migración de Módulos (2-3 días)
- [ ] Migrar todos los módulos a `export default`
- [ ] Implementar lazy loading para todos los módulos no críticos
- [ ] Agrupar módulos por dominio
- [ ] Añadir preloading inteligente

### Fase 3: Optimización (1 día)
- [ ] Fine-tuning de chunks manuales
- [ ] Pruebas de rendimiento
- [ ] Ajustar estrategias de caching

---

## 📚 Referencias

- [Vite Documentation - Code Splitting](https://vitejs.dev/guide/build.html#code-splitting)
- [React Documentation - Lazy](https://react.dev/reference/react/lazy)
- [React Documentation - Suspense](https://react.dev/reference/react/Suspense)
- [Webpack Code Splitting Guide](https://webpack.js.org/guides/code-splitting/)

---

**© 2026 COTEL R.L. · Todos los derechos reservados.**
