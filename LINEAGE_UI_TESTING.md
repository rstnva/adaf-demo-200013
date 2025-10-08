# Módulo H — Lineage UI Testing Guide

Este documento describe cómo probar manualmente la funcionalidad de lineage en la interfaz de usuario.

## Prerrequisitos

1. **Servidor ejecutándose**: Asegúrate de que el servidor Next.js esté corriendo:
   ```bash
   pnpm dev
   ```

2. **Feature flag habilitado**: Verifica que la variable de entorno esté configurada:
   ```bash
   export NEXT_PUBLIC_FEATURE_LINEAGE=true
   ```

3. **Datos de ejemplo**: Los endpoints de lineage devuelven datos mockeados para testing.

## 🧪 Tests de UI

### 1. ReportsHistory - Lineage Integration

**Ubicación**: `/reports` → pestaña "History & Delivery"

**Pasos**:
1. Navega a la página de reportes
2. Ve a la pestaña "History & Delivery"
3. Busca el botón "📊 Lineage" en cada fila de reporte
4. Haz clic en "Lineage" para cualquier reporte

**Resultados esperados**:
- ✅ Se abre el LineageDrawer desde el lado derecho
- ✅ Header muestra "Lineage • report • [ID]"
- ✅ Timeline vertical con eventos ordenados por fecha
- ✅ Chips de stage coloreados (azul=ingest, violeta=transform, teal=aggregate, gris=export)
- ✅ Botones de copiar hash funcionan
- ✅ Acordeones de "Ver inputs/outputs" expandibles
- ✅ JSON formateado legible
- ✅ ESC cierra el drawer
- ✅ Click fuera cierra el drawer

### 2. AlertsTable - Lineage Integration

**Ubicación**: `/alerts`

**Pasos**:
1. Navega a la página de alertas
2. Busca alertas que tengan el botón "📊 Lineage"
3. Haz clic en "Lineage" para una alerta con signal ID

**Resultados esperados**:
- ✅ Se abre LineageDrawer con entity='signal'
- ✅ Muestra el lineage de la señal asociada a la alerta
- ✅ Timeline con eventos de ingesta y transformación
- ✅ Funcionalidad completa del drawer

### 3. HashBadge Component

**Ubicación**: Integrado en otros componentes

**Funcionalidad**:
- ✅ Muestra hash truncado (ej: "hash: abcd...1234")
- ✅ Tooltip con hash completo al hacer hover
- ✅ Botón de copiar funcional
- ✅ Click en badge abre lineage drawer (si está configurado)

### 4. Drawer Functionality

**Features del LineageDrawer**:

#### 4.1 Navigation & Accessibility
- ✅ **Focus trap**: Tab navega solo dentro del drawer
- ✅ **ESC key**: Cierra el drawer
- ✅ **ARIA labels**: Screen readers pueden navegar
- ✅ **Responsive**: Se adapta a móvil/desktop

#### 4.2 Timeline Display
- ✅ **Orden cronológico**: Eventos ordenados por timestamp ASC
- ✅ **Stage chips**: Colores e iconos consistentes
- ✅ **Línea de tiempo**: Línea vertical conecta eventos
- ✅ **Timestamps**: Formato local legible

#### 4.3 Data Interaction
- ✅ **Hash copying**: Click para copiar hash completo
- ✅ **Toast feedback**: Confirmación visual de copia
- ✅ **JSON expansion**: Acordeones para inputs/outputs
- ✅ **Pretty JSON**: Formato indentado y legible

#### 4.4 States & Error Handling
- ✅ **Loading skeleton**: 3-4 elementos placeholder
- ✅ **Empty state**: Mensaje cuando no hay eventos
- ✅ **Error state**: Banner con botón retry
- ✅ **Network errors**: Manejo graceful de 5xx

### 5. Performance Tests

**Métricas de rendimiento**:

#### 5.1 Load Times
- ✅ **Drawer open**: < 300ms
- ✅ **Data fetch**: < 1000ms para traces
- ✅ **Search**: < 1500ms para búsquedas complejas

#### 5.2 Memory Usage
- ✅ **Memory leaks**: No aumenta memoria al abrir/cerrar drawer
- ✅ **Event listeners**: Se limpian correctamente
- ✅ **React warnings**: No warnings en console

### 6. Cross-browser Testing

**Browsers soportados**:
- ✅ **Chrome**: 90+ (clipboard API nativo)
- ✅ **Firefox**: 88+ (clipboard API)
- ✅ **Safari**: 14+ (clipboard API)
- ✅ **Edge**: 90+ (clipboard API)

**Fallbacks**:
- ✅ **Clipboard fallback**: execCommand para browsers antiguos
- ✅ **Toast fallback**: div simple si no hay toast library

## 🔧 Debugging Tips

### Console Logs
Revisa estos mensajes en DevTools:

```javascript
// Lineage drawer opened
✓ Lineage search "bitcoin" found 5 results (showing 5)

// Hash copied
Hash copiado al portapapeles

// Lineage view tracked (metrics)
✓ Lineage view tracked: signal:btc-spot-price-1m
```

### Network Tab
Verifica estas llamadas:

```
GET /api/read/lineage/trace?entity=signal&refId=btc-spot-price-1m
GET /api/read/lineage/by-signal?id=signal-001
POST /api/metrics/lineage/view (fire-and-forget)
```

### React DevTools
- **Component tree**: LineageDrawer renderiza correctamente
- **Props**: entity, refId, open se pasan correctamente
- **State**: drawer state se maneja bien
- **Hooks**: useLineageTrace hook funciona

## 🐛 Common Issues

### 1. Drawer no abre
- ✅ **Feature flag**: Verifica `NEXT_PUBLIC_FEATURE_LINEAGE=true`
- ✅ **Button click**: Verifica que el handler se ejecuta
- ✅ **State update**: Revisa que `setLineageDrawer` se llama

### 2. No data displayed
- ✅ **API response**: Verifica que APIs devuelven datos mock
- ✅ **Entity/refId**: Confirma que parámetros son válidos
- ✅ **Network errors**: Revisa Network tab para errores

### 3. Copy not working
- ✅ **HTTPS required**: Clipboard API requiere HTTPS o localhost
- ✅ **Permissions**: Browser puede bloquear clipboard access
- ✅ **Fallback**: Debería usar execCommand si clipboard no disponible

### 4. Performance issues
- ✅ **Large datasets**: APIs tienen límites de paginación
- ✅ **Memory leaks**: useEffect cleanup functions
- ✅ **Rerender loops**: Dependencies en useEffect

## ✅ Acceptance Criteria

Para considerar el testing completo:

### UI Integration
- [ ] ReportsHistory tiene botón Lineage funcional
- [ ] AlertsTable tiene botón Lineage para signals
- [ ] HashBadge muestra y copia hashes correctamente
- [ ] Drawer se abre desde múltiples puntos de entrada

### User Experience  
- [ ] Navigation fluida (tab, ESC, click outside)
- [ ] Loading states informativos
- [ ] Error handling graceful
- [ ] Mobile responsive

### Data Display
- [ ] Timeline ordenado cronológicamente  
- [ ] JSON formateado legible
- [ ] Hash copying funcional con feedback
- [ ] Stage chips coloreados correctamente

### Performance
- [ ] Load times < 1000ms
- [ ] No memory leaks
- [ ] No console errors
- [ ] Cross-browser compatible

---

## 📊 Manual Testing Checklist

Marca cada item durante el testing:

**Basic Functionality**
- [ ] Drawer opens from Reports page
- [ ] Drawer opens from Alerts page
- [ ] Hash badges display correctly
- [ ] Copy buttons work with toast feedback

**Data Display**
- [ ] Timeline shows events in chronological order
- [ ] Stage chips have correct colors and icons
- [ ] JSON expansion shows formatted data
- [ ] Empty state shows when no events

**Interaction**  
- [ ] ESC key closes drawer
- [ ] Click outside closes drawer
- [ ] Tab navigation stays within drawer
- [ ] Hash copying works in all browsers tested

**Error Handling**
- [ ] Network errors show retry button
- [ ] Invalid data shows error message
- [ ] Loading states show skeleton UI
- [ ] Graceful degradation for old browsers

**Performance**
- [ ] Drawer opens in < 300ms
- [ ] Data loads in < 1000ms
- [ ] No memory usage increase after use
- [ ] No React warnings in console

¡Testing completado! 🎉