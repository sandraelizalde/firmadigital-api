# NEX-10: Promociones por Fecha y Hora

## Resumen

Implementación completa del sistema de **promociones con vigencia por fecha y hora** para los planes de distribuidores. Permite al admin configurar precios promocionales que se activan y expiran automáticamente según un rango de fechas con hora específica.

---

## Archivos Modificados

### Backend (`distribuidores-nexus-api`)

| Archivo | Tipo de cambio | Descripción |
|---|---|---|
| `prisma/schema.prisma` | **Modificado** | Agregados campos `promoStartDate` y `promoEndDate` a `DistributorPlanPrice` |
| `src/plans/dto/create-promotions.dto.ts` | **Modificado** | Agregados `promoStartDate?` y `promoEndDate?` con validador `@IsDateString()` |
| `src/plans/plans.service.ts` | **Modificado** | Almacena fechas al crear promo + cron `cleanExpiredPromotions` + `isPromoCurrentlyActive()` filtra promos pendientes/expiradas en los endpoints de consulta |
| `src/signatures/signatures.service.ts` | **Modificado** | Nuevo método `getActivePromoPrice()` que valida fechas antes de usar precio promo |
| `src/distributors/distributors.service.ts` | **Modificado** | `getDistributorsByPlan()` retorna `promoStartDate` y `promoEndDate` |

### Frontend (`nexus-soluciones-frontend`)

| Archivo | Tipo de cambio | Descripción |
|---|---|---|
| `.../promociones/page.tsx` | **Reescrito** | Página completa rediseñada con filtros, estados, tiempo relativo |
| `.../promociones/components/DateTimeRangePicker.tsx` | **Nuevo** | Componente calendario + selector de hora para promociones |
| `.../promociones/service/promotions.service.ts` | **Modificado** | Agregados `promoStartDate` y `promoEndDate` a DTOs e interfaces |

---

## Cambios en Base de Datos

### Modelo `DistributorPlanPrice`

```prisma
model DistributorPlanPrice {
  // ... campos existentes ...
  
  customPricePromo Int?       // Ya existía
  promoStartDate   DateTime?  // ✅ NUEVO — Fecha/hora de inicio de la promoción
  promoEndDate     DateTime?  // ✅ NUEVO — Fecha/hora de fin de la promoción
}
```

**Migración aplicada:** `npx prisma db push --accept-data-loss`

Ambos campos son `DateTime?` (nullable) en PostgreSQL, que almacenan timestamps completos con zona horaria (ISO 8601). Si no se definen fechas, la promo se considera **permanente**.

---

## Backend — Detalle de Cambios

### 1. DTO: `create-promotions.dto.ts`

```typescript
@IsOptional()
@IsDateString()
promoStartDate?: string;  // ISO 8601: "2026-02-17T08:00:00.000Z"

@IsOptional()
@IsDateString()
promoEndDate?: string;     // ISO 8601: "2026-03-17T23:59:59.999Z"
```

### 2. Servicio de Planes: `plans.service.ts`

#### `createPromotionsForDistributors()`
- Recibe `promoStartDate` y `promoEndDate` del DTO
- Los convierte a `Date` y los almacena junto con `customPricePromo`
- Si no vienen fechas, se guardan como `null` (promo permanente)

#### `cleanExpiredPromotions()` — **NUEVO** Cron Job
```
Horario: 00:05 diario (America/Guayaquil)
```
- Busca registros donde `promoEndDate < now` y `customPricePromo != null`
- Limpia los 3 campos: `customPricePromo`, `promoStartDate`, `promoEndDate` → `null`
- Loguea la cantidad de registros limpiados

#### `getDistributorPlans()` y `getDistributorPlansFiltered()`
- Retornan `promoStartDate` y `promoEndDate` en cada plan
- **Usan `isPromoCurrentlyActive()`** para devolver `customPricePromo: null` si la promo está pendiente o expirada
- Esto impide que el frontend del distribuidor muestre precios promo que aún no arrancan o ya vencieron

#### `isPromoCurrentlyActive()` — **NUEVO** método privado
```typescript
private isPromoCurrentlyActive(
  customPricePromo: number | null,
  promoStartDate: Date | null,
  promoEndDate: Date | null,
): boolean
```
- Sin precio promo → `false`
- `now < promoStartDate` → `false` (pendiente)
- `now > promoEndDate` → `false` (expirada)
- Sin fechas → `true` (permanente)
- Usado en `getDistributorPlans()` y `getDistributorPlansFiltered()` para que el distribuidor nunca vea precios de promos que no están activas

### 3. Servicio de Firmas: `signatures.service.ts`

#### `getActivePromoPrice()` — **NUEVO** método privado
```typescript
private getActivePromoPrice(planPrice): number | null
```
- Si `customPricePromo` es null → retorna `null`
- Si `promoStartDate` existe y `now < promoStartDate` → retorna `null` (promo pendiente)
- Si `promoEndDate` existe y `now > promoEndDate` → retorna `null` (promo expirada)
- Caso contrario → retorna el precio promo (incluyendo horas)

#### `getSignaturePlanPrice()`
- Antes: `planPrice.customPricePromo ?? planPrice.customPrice`
- Ahora: `this.getActivePromoPrice(planPrice) ?? planPrice.customPrice`

### 4. Servicio de Distribuidores: `distributors.service.ts`

#### `getDistributorsByPlan()`
- El Map tipado ahora incluye `promoStartDate: Date | null` y `promoEndDate: Date | null`
- Los valores se extraen de cada `assignment` y se envían al frontend

---

## Frontend — Detalle de Cambios

### 1. Componente `DateTimeRangePicker` — **NUEVO**

Ubicación: `promociones/components/DateTimeRangePicker.tsx`

Un componente específico para promociones que extiende el `DateRangePicker` base con selección de hora. **No modifica** los DateRangePicker existentes de otros módulos.

Características:
- Calendario de 2 meses para seleccionar rango de fechas
- Inputs `type="time"` para hora de inicio y hora de fin
- Presets rápidos de hora: `00:00`, `08:00`, `12:00` (inicio) / `18:00`, `21:00`, `23:59` (fin)
- Muestra fecha + hora en el botón trigger: `17 feb 2026 08:00 — 27 feb 2026 23:59`
- Hora por defecto: inicio `00:00`, fin `23:59`

### 2. Página de Promociones: `page.tsx` — **REESCRITURA COMPLETA**

#### Estructura de la página
1. **Seleccionar Plan** — Dropdown con los 8 planes + badges de conteo
2. **Configurar Promoción** — Card siempre visible con:
   - Precio promo ($)
   - `DateTimeRangePicker` con fecha + hora
   - Presets rápidos de vigencia: 1 semana, 15 días, 1 mes, 3 meses, 6 meses, Sin límite
   - Checkbox notificación WhatsApp
   - Botones "Quitar Promo" / "Aplicar Promo"
3. **Distribuidores** — Tabla filtrable con:
   - Filtros: Todos / Con promo / Sin promo (con conteos)
   - Búsqueda por nombre/identificación/email
   - Checkbox de selección múltiple
   - Columna "Estado Promo" con estados visuales

#### Estados de Promoción

| Estado | Color Badge | Etiqueta | Cuándo |
|---|---|---|---|
| `active` | Verde | "Activa" | `promoStartDate <= now <= promoEndDate` |
| `active-no-dates` | Verde | "Permanente" | Tiene precio promo sin fechas definidas |
| `pending` | Azul | "Pendiente" | `now < promoStartDate` |
| `expired` | Gris | "Expirada" | `now > promoEndDate` |
| `none` | — | "Sin promo" | No tiene `customPricePromo` |

Cada distribuidor con promo muestra:
- Badge con precio promo
- Etiqueta de estado
- Texto relativo preciso: `Inicia en 2h 30min`, `Finaliza en 3 días y 5h`, `Venció hace 45min`
- Rango de fechas con hora: `17 feb 2026 08:00 → 27 feb 2026 23:59`

#### Precisión del tiempo relativo

La función `formatTimeDiff()` escala automáticamente:

| Rango | Formato | Ejemplo |
|---|---|---|
| < 1 min | `menos de 1 min` | |
| < 1 hora | `N min` | `45 min` |
| < 1 día | `Nh Mmin` | `2h 30min` |
| < 30 días | `N días y Mh` | `3 días y 5h` |
| ≥ 30 días | `N meses y Md` | `1 mes y 12d` |

#### Manejo de fechas en `handleSavePromotions()`
- Las fechas se toman directamente del `DateTimeRangePicker` que ya incluye la hora seleccionada
- Se envían como ISO 8601 al backend: `promoDateRange.from.toISOString()`
- Sin fechas = promo permanente (no envía los campos)

### 3. Servicio Frontend: `promotions.service.ts`

```typescript
// Nuevos campos en CreatePromotionsDto
promoStartDate?: string;
promoEndDate?: string;

// Nuevos campos en PlanPrice
promoStartDate: string | null;
promoEndDate: string | null;
```

---

## Flujo Completo

```
Admin selecciona plan "1 Mes"
    → GET /distributors/by-plan?duration=1&durationType=M
    → Muestra 164 distribuidores con sus estados de promo

Admin configura: $10.00, 17 feb 08:00 → 27 feb 23:59
    → Selecciona distribuidores
    → Click "Aplicar Promo"
    → POST /plans/promotions
      Body: {
        duration: "1",
        durationType: "M",
        promoStartDate: "2026-02-17T13:00:00.000Z",  // UTC
        promoEndDate: "2026-02-28T04:59:59.999Z",     // UTC
        sendNotification: true,
        distributors: [{ distributorId: "xxx", customPricePromo: 1000 }]
      }
    → Backend: updateMany en DistributorPlanPrice
    → WhatsApp: template "promotion_distributor" (async)

Distribuidor intenta crear firma con promo pendiente (17 feb 10:00, promo inicia 17 feb 11:00)
    → getDistributorPlansFiltered() → isPromoCurrentlyActive() = false
    → customPricePromo devuelto como null → no muestra badge PROMO
    → Si intenta por otro medio, getActivePromoPrice() también retorna null
    → Cobra precio normal ($7.99)

Distribuidor crea firma durante la promo (18 feb 10:00)
    → getActivePromoPrice() verifica: 
      startDate (17 feb 08:00) <= now (18 feb 10:00) ✓
      now (18 feb 10:00) <= endDate (27 feb 23:59) ✓
    → Cobra $10.00 en lugar del precio normal

Después de vencer (28 feb 01:00)
    → getActivePromoPrice() retorna null
    → Cobra precio normal ($7.99)

Cron 00:05 del 28 feb
    → cleanExpiredPromotions() limpia los campos
    → La promo desaparece completamente del registro
```

---

## Constraint de Unicidad

```prisma
@@unique([distributorId, planId])
```

Cada distribuidor tiene **exactamente un registro** por plan. No es posible tener "dos promos" en el mismo plan. Aplicar una nueva promo **sobreescribe** la anterior.

---

## Notas Importantes

1. **Zona horaria**: El frontend envía fechas en UTC (`.toISOString()`). El cron usa `America/Guayaquil` (UTC-5). Las comparaciones en el backend son en UTC.
2. **Retrocompatibilidad**: Promos existentes sin fechas siguen funcionando como "permanentes".
3. **El componente `DateTimeRangePicker` es exclusivo** de la página de promociones. Los `DateRangePicker` de solicitudes-firmas y listado NO fueron modificados.
4. **Presets de vigencia** calculan desde "hoy a las 00:00" hasta "hoy + N días a las 23:59". El admin puede ajustar las horas manualmente después.
5. **Promos pendientes no visibles al distribuidor**: Los endpoints `getDistributorPlans()` y `getDistributorPlansFiltered()` filtran promos que aún no empiezan o ya vencieron. El distribuidor solo ve el precio promo cuando la promo está activa.
6. **Triple capa de validación**:
   - **Capa 1 (UI)**: `isPromoCurrentlyActive()` en endpoints de consulta — el distribuidor no ve la promo
   - **Capa 2 (Cobro)**: `getActivePromoPrice()` en signatures — no cobra precio promo si no está activa
   - **Capa 3 (Limpieza)**: Cron `cleanExpiredPromotions()` — elimina datos de promos vencidas diariamente
