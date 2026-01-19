# Sistema de Créditos - Documentación Completa

## Tabla de Contenidos
1. [Visión General](#visión-general)
2. [Modelos de Datos](#modelos-de-datos)
3. [Dashboard del Distribuidor](#dashboard-del-distribuidor)
4. [Panel de Administración](#panel-de-administración)
5. [Flujo de Trabajo](#flujo-de-trabajo)
6. [Cron Jobs Automatizados](#cron-jobs-automatizados)
7. [Ejemplos de Uso](#ejemplos-de-uso)

---

## Visión General

El sistema de créditos permite a los distribuidores emitir firmas (contratos) sin tener que pagar por adelantado. El sistema funciona con:

- **Créditos a días**: Los distribuidores reciben un crédito con N días para pagar
- **Cortes diarios**: Cada día se genera un corte con las firmas emitidas
- **Cobros automáticos**: El sistema intenta cobrar automáticamente del saldo del distribuidor
- **Bloqueos por mora**: Si un corte vence sin pagar, el crédito se bloquea

### Características Principales

✅ **Para Distribuidores:**
- Emitir firmas sin pago inmediato
- Ver resumen de su crédito y deudas
- Pagos automáticos desde su saldo
- Historial de cortes

✅ **Para Administradores:**
- Activar/desactivar créditos
- Configurar días de crédito
- Monitorear deudas y pagos
- Reactivar créditos pagados

---

## Modelos de Datos

### DistributorCredit

Representa el crédito activo de un distribuidor.

```prisma
model DistributorCredit {
  id             String      @id @default(cuid())
  distributor    Distributor @relation(fields: [distributorId], references: [id])
  distributorId  String
  creditDays     Int         @default(2)      // Días de crédito (ej: 2 días)
  isActive       Boolean     @default(true)   // Si el crédito está activo
  isBlocked      Boolean     @default(false)  // Si está bloqueado por falta de pago
  assignedBy     String?                      // Nombre del admin que asignó el crédito
  
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
  
  creditCutoffs  CreditCutoff[]
}
```

**Campos importantes:**
- `creditDays`: Determina cuántos días tiene el distribuidor para pagar
- `isActive`: Si es `false`, el crédito está desactivado
- `isBlocked`: Si es `true`, el distribuidor no puede emitir más firmas hasta pagar

### CreditCutoff

Representa un corte diario del crédito, agrupando las firmas emitidas en un día específico.

```prisma
model CreditCutoff {
  id                String            @id @default(cuid())
  distributor       Distributor       @relation(fields: [distributorId], references: [id])
  distributorId     String
  credit            DistributorCredit @relation(fields: [creditId], references: [id])
  creditId          String
  
  cutoffDate        DateTime    // Fecha del corte (00:00:00 del día)
  paymentDueDate    DateTime    // Fecha límite de pago (cutoffDate + creditDays a las 23:59:59)
  amountUsed        Int         @default(0)    // Monto total usado ese día (en centavos)
  amountPaid        Int         @default(0)    // Monto pagado de este corte (en centavos)
  isPaid            Boolean     @default(false) // Si está completamente pagado
  isOverdue         Boolean     @default(false) // Si venció y no se pagó
  signaturesCount   Int         @default(0)    // Cantidad de firmas emitidas ese día
  signaturesDetails String?                    // JSON con IDs de las firmas
  
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  
  @@unique([creditId, cutoffDate])
}
```

**Ejemplo de un corte:**
- Corte del 14 de enero de 2026
- Crédito de 2 días
- Fecha límite: 16 de enero de 2026 a las 23:59:59
- Si emitió 5 firmas por $5 c/u = $25 total en `amountUsed`
- Si pagó $10 = $10 en `amountPaid`
- Debe: $15

---

## Dashboard del Distribuidor

### 1. Verificar Estado de Crédito

**Endpoint:** `GET /credits/:distributorId/can-emit`

**Descripción:** Verifica si el distribuidor puede emitir firmas.

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta exitosa (200):**
```json
{
  "canEmit": true,
  "hasCredit": true,
  "isBlocked": false
}
```

**Respuesta - Crédito bloqueado:**
```json
{
  "canEmit": false,
  "hasCredit": true,
  "isBlocked": true
}
```

**Respuesta - Sin crédito:**
```json
{
  "canEmit": true,
  "hasCredit": false,
  "isBlocked": false
}
```

**Casos de uso:**
- Mostrar/ocultar botón de "Emitir firma a crédito"
- Mostrar advertencia si está bloqueado
- Validar antes de permitir emitir una firma

---

### 2. Ver Resumen Completo del Crédito

**Endpoint:** `GET /credits/:distributorId/summary`

**Descripción:** Obtiene un resumen detallado del crédito activo, incluyendo todos los cortes, montos usados, pagados y pendientes.

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta exitosa - Con crédito activo (200):**
```json
{
  "hasCredit": true,
  "creditDays": 2,
  "isBlocked": false,
  "totalUsed": 50000,        // $500.00 (en centavos)
  "totalPaid": 30000,        // $300.00 (en centavos)
  "totalOwed": 20000,        // $200.00 (en centavos) - Deuda total
  "cutoffs": [
    {
      "id": "clx111",
      "cutoffDate": "2026-01-14T00:00:00.000Z",
      "paymentDueDate": "2026-01-16T23:59:59.999Z",
      "amountUsed": 25000,   // $250.00
      "amountPaid": 25000,   // $250.00
      "isPaid": true,
      "isOverdue": false,
      "signaturesCount": 5,
      "createdAt": "2026-01-14T10:30:00.000Z",
      "updatedAt": "2026-01-16T20:00:00.000Z"
    },
    {
      "id": "clx222",
      "cutoffDate": "2026-01-15T00:00:00.000Z",
      "paymentDueDate": "2026-01-17T23:59:59.999Z",
      "amountUsed": 25000,   // $250.00
      "amountPaid": 5000,    // $50.00
      "isPaid": false,
      "isOverdue": false,
      "signaturesCount": 5,
      "createdAt": "2026-01-15T11:00:00.000Z",
      "updatedAt": "2026-01-15T22:00:00.000Z"
    }
  ],
  "unpaidCutoffs": [
    {
      "id": "clx222",
      "cutoffDate": "2026-01-15T00:00:00.000Z",
      "paymentDueDate": "2026-01-17T23:59:59.999Z",
      "amountUsed": 25000,
      "amountPaid": 5000,
      "isPaid": false,
      "isOverdue": false
    }
  ]
}
```

**Respuesta - Sin crédito activo (200):**
```json
{
  "hasCredit": false,
  "message": "El distribuidor no tiene crédito activo"
}
```

**Estructura de la UI sugerida para el Dashboard del Distribuidor:**

```
┌─────────────────────────────────────────────┐
│  📊 MI CRÉDITO                              │
├─────────────────────────────────────────────┤
│                                             │
│  Estado: ✅ Activo / 🔒 Bloqueado          │
│  Días de crédito: 2 días                    │
│                                             │
│  💰 Resumen Financiero:                     │
│  ─────────────────────────────              │
│  Total usado:     $500.00                   │
│  Total pagado:    $300.00                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━                  │
│  Saldo pendiente: $200.00                   │
│                                             │
├─────────────────────────────────────────────┤
│  📅 HISTORIAL DE CORTES                     │
├─────────────────────────────────────────────┤
│                                             │
│  ✅ 14 Ene 2026                             │
│     Usado: $250.00 | Pagado: $250.00       │
│     Vence: 16 Ene 2026                      │
│     Firmas: 5                               │
│                                             │
│  ⏳ 15 Ene 2026                             │
│     Usado: $250.00 | Pagado: $50.00        │
│     Debe: $200.00                           │
│     Vence: 17 Ene 2026 (23:59:59)          │
│     Firmas: 5                               │
│     [Botón: Pagar ahora]                    │
│                                             │
└─────────────────────────────────────────────┘
```

**Indicadores visuales sugeridos:**
- 🟢 Verde: Corte pagado completamente
- 🟡 Amarillo: Corte pendiente pero no vencido
- 🔴 Rojo: Corte vencido (`isOverdue: true`)
- 🔒 Ícono de candado: Cuando `isBlocked: true`

---

## Panel de Administración

### 1. Activar Crédito

**Endpoint:** `POST /credits`

**Descripción:** Permite a un administrador activar un crédito para un distribuidor.

**Headers:**
```
Authorization: Bearer {admin_token}
```

**Body:**
```json
{
  "distributorId": "clx9876543210",
  "creditDays": 2
}
```

**Validaciones:**
- El distribuidor no debe tener un crédito activo
- Si tuvo un crédito anterior, no debe tener deudas pendientes
- Solo accesible para rol `ADMIN`

**Respuesta exitosa (201):**
```json
{
  "message": "Crédito activado exitosamente",
  "data": {
    "credit": {
      "id": "clx1234567890",
      "distributorId": "clx9876543210",
      "creditDays": 2,
      "isActive": true,
      "isBlocked": false,
      "assignedBy": "Admin Name",
      "createdAt": "2026-01-16T12:00:00.000Z",
      "updatedAt": "2026-01-16T12:00:00.000Z"
    }
  }
}
```

**Errores comunes:**
```json
// 400 - Ya tiene crédito activo
{
  "statusCode": 400,
  "message": "El distribuidor ya tiene un crédito activo"
}

// 400 - Tiene deudas pendientes
{
  "statusCode": 400,
  "message": "El distribuidor tiene deudas pendientes de un crédito anterior. Debe pagar antes de activar uno nuevo."
}
```

---

### 2. Desactivar Crédito

**Endpoint:** `PATCH /credits/:distributorId/deactivate`

**Descripción:** Desactiva el crédito de un distribuidor. Solo se puede desactivar si no tiene deudas pendientes.

**Headers:**
```
Authorization: Bearer {admin_token}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Crédito desactivado exitosamente",
  "data": {
    "credit": {
      "id": "clx1234567890",
      "distributorId": "clx9876543210",
      "creditDays": 2,
      "isActive": false,
      "isBlocked": false
    }
  }
}
```

**Respuesta - Con deudas pendientes (400):**
```json
{
  "success": false,
  "message": "No se puede desactivar el crédito. El distribuidor tiene una deuda pendiente de $150.00",
  "data": {
    "totalOwed": 15000,      // en centavos
    "unpaidCutoffs": 2
  }
}
```

**Errores:**
```json
// 400 - No tiene crédito activo
{
  "statusCode": 400,
  "message": "El distribuidor no tiene un crédito activo"
}
```

---

### 3. Reactivar Crédito

**Endpoint:** `PATCH /credits/:distributorId/reactivate`

**Descripción:** Reactiva un crédito que fue desactivado previamente.

**Headers:**
```
Authorization: Bearer {admin_token}
```

**Validaciones:**
- El distribuidor debe tener un crédito desactivado
- No debe tener un crédito activo actualmente
- No debe tener deudas pendientes

**Respuesta exitosa (200):**
```json
{
  "message": "Crédito reactivado exitosamente",
  "data": {
    "credit": {
      "id": "clx1234567890",
      "distributorId": "clx9876543210",
      "creditDays": 2,
      "isActive": true,
      "isBlocked": false
    }
  }
}
```

**Errores comunes:**
```json
// 400 - Ya tiene crédito activo
{
  "statusCode": 400,
  "message": "El distribuidor ya tiene un crédito activo"
}

// 400 - No hay crédito para reactivar
{
  "statusCode": 400,
  "message": "El distribuidor no tiene un crédito anterior para reactivar"
}

// 400 - Tiene deudas pendientes
{
  "statusCode": 400,
  "message": "No se puede reactivar el crédito. El distribuidor tiene una deuda pendiente de $150.00"
}
```

---

### 4. Ver Resumen de Crédito (Admin)

**Endpoint:** `GET /credits/:distributorId/summary`

**Descripción:** El mismo endpoint que usan los distribuidores, pero los admins pueden consultar el crédito de cualquier distribuidor.

**Headers:**
```
Authorization: Bearer {admin_token}
```

**Uso en panel de administración:**
- Ver lista de distribuidores con crédito
- Monitorear deudas pendientes
- Identificar distribuidores bloqueados
- Dashboard de cobros

---

## Flujo de Trabajo

### Flujo Completo: Desde Activación hasta Pago

```
1. ACTIVACIÓN (Admin)
   ↓
   [POST /credits]
   {distributorId, creditDays: 2}
   ↓
   ✅ Crédito activado
   isActive: true, isBlocked: false

2. EMISIÓN DE FIRMAS (Distribuidor)
   ↓
   Día 1 (15 Ene): Emite 5 firmas x $5 = $25
   ↓
   Sistema crea/actualiza CreditCutoff:
   - cutoffDate: 15 Ene 00:00:00
   - paymentDueDate: 17 Ene 23:59:59
   - amountUsed: $25
   - signaturesCount: 5

3. INTENTO DE COBRO AUTOMÁTICO
   ↓
   Cron a las 23:59 del 17 Ene
   ↓
   ¿Distribuidor tiene saldo?
   
   SÍ → Cobro automático
         - balance -= $25
         - amountPaid = $25
         - isPaid = true
         ✅ Corte pagado
   
   NO → Sin cobro
        - isPaid = false
        ⚠️ Pendiente

4. VERIFICACIÓN DE MORA
   ↓
   Cron a las 00:01 del 18 Ene
   ↓
   ¿Corte pagado?
   
   NO → BLOQUEO
        - isOverdue = true
        - isBlocked = true (en credit)
        🔒 Distribuidor bloqueado

5. PAGO Y DESBLOQUEO
   ↓
   Distribuidor recarga saldo
   ↓
   Próximo cron (23:59) detecta saldo
   ↓
   Cobra automáticamente
   ↓
   Si no hay más cortes pendientes:
   ✅ isBlocked = false
```

### Estados del Crédito

| Estado | isActive | isBlocked | Descripción |
|--------|----------|-----------|-------------|
| 🟢 Activo y disponible | true | false | Puede emitir firmas |
| 🔒 Activo pero bloqueado | true | true | No puede emitir hasta pagar |
| ⚫ Desactivado | false | false | Crédito desactivado |

### Estados de un Corte

| Estado | isPaid | isOverdue | amountPaid < amountUsed | Descripción |
|--------|--------|-----------|-------------------------|-------------|
| ✅ Pagado | true | false | false | Corte totalmente pagado |
| 🟡 Pendiente | false | false | true | Aún no vence |
| 🟠 Pago parcial | false | false | true | Pagó algo pero no todo |
| 🔴 Vencido | false | true | true | Venció sin pagar |

---

## Cron Jobs Automatizados

### 1. Verificación de Cortes Vencidos

**Horario:** Diariamente a las 00:01 (hora de Ecuador)

**Función:** `checkOverdueCutoffs()`

**Qué hace:**
1. Busca todos los cortes no pagados cuya `paymentDueDate` ya pasó
2. Marca cada corte como vencido: `isOverdue = true`
3. Bloquea el crédito del distribuidor: `isBlocked = true`
4. Registra en logs los distribuidores bloqueados

**Ejemplo de log:**
```
[00:01:23] Verificando cortes de crédito vencidos...
[00:01:25] Se encontraron 3 cortes vencidos
[00:01:26] Distribuidor user@example.com bloqueado por corte vencido. Debe: $150.00
[00:01:27] Verificación de cortes vencidos completada
```

---

### 2. Intentos de Cobro Automático

**Horario:** Diariamente a las 23:59 (hora de Ecuador)

**Función:** `processPaymentAttempts()`

**Qué hace:**
1. Obtiene todos los cortes no pagados que ya vencieron
2. Por cada corte:
   - Si tiene saldo suficiente: cobra todo
   - Si tiene saldo parcial: cobra lo que pueda
   - Si no tiene saldo: no cobra nada
3. Si un distribuidor paga todos sus cortes pendientes: desbloquea su crédito
4. Registra estadísticas de cobros

**Lógica de cobro:**

```typescript
if (saldo >= deuda) {
  // Cobro completo
  saldo -= deuda
  amountPaid = amountUsed
  isPaid = true
  
  // Si era el último pendiente
  if (no_hay_mas_pendientes) {
    isBlocked = false  // Desbloquea
  }
}
else if (saldo > 0) {
  // Cobro parcial
  amountPaid += saldo
  saldo = 0
  // Sigue pendiente
}
else {
  // Sin cobro
  // Queda pendiente
}
```

**Ejemplo de log:**
```
[23:59:01] Iniciando intentos de cobro de cortes vencidos...
[23:59:03] Se encontraron 10 cortes pendientes de pago
[23:59:05] Corte clx111 cobrado completamente. Monto: $250.00
[23:59:06] Corte clx222 cobrado parcialmente. Pagado: $50.00, Falta: $200.00
[23:59:10] Cobros completados. Cobrados: 5, Parciales: 3, Sin pago: 2
```

---

## Ejemplos de Uso

### Ejemplo 1: Flujo Completo desde el Frontend

#### Admin activa crédito

```javascript
// Admin panel - Activar crédito
const activateCredit = async (distributorId) => {
  const response = await fetch('https://api.example.com/credits', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      distributorId: distributorId,
      creditDays: 2
    })
  });
  
  const data = await response.json();
  
  if (response.ok) {
    alert('Crédito activado exitosamente');
    console.log(data.data.credit);
  } else {
    alert(`Error: ${data.message}`);
  }
};
```

#### Distribuidor verifica si puede emitir

```javascript
// Dashboard distribuidor - Verificar si puede emitir
const checkCanEmit = async () => {
  const response = await fetch(
    `https://api.example.com/credits/${distributorId}/can-emit`,
    {
      headers: {
        'Authorization': `Bearer ${distributorToken}`
      }
    }
  );
  
  const data = await response.json();
  
  if (data.canEmit) {
    // Mostrar botón de "Emitir a crédito"
    document.getElementById('emit-button').disabled = false;
  } else {
    // Mostrar mensaje de bloqueo
    document.getElementById('emit-button').disabled = true;
    document.getElementById('warning').textContent = 
      'Tu crédito está bloqueado. Por favor paga tus deudas pendientes.';
  }
};
```

#### Distribuidor consulta su resumen

```javascript
// Dashboard distribuidor - Ver resumen de crédito
const loadCreditSummary = async () => {
  const response = await fetch(
    `https://api.example.com/credits/${distributorId}/summary`,
    {
      headers: {
        'Authorization': `Bearer ${distributorToken}`
      }
    }
  );
  
  const data = await response.json();
  
  if (data.hasCredit) {
    // Renderizar dashboard
    document.getElementById('credit-days').textContent = data.creditDays;
    document.getElementById('total-used').textContent = 
      `$${(data.totalUsed / 100).toFixed(2)}`;
    document.getElementById('total-paid').textContent = 
      `$${(data.totalPaid / 100).toFixed(2)}`;
    document.getElementById('total-owed').textContent = 
      `$${(data.totalOwed / 100).toFixed(2)}`;
    
    // Renderizar cortes
    const cutoffsList = document.getElementById('cutoffs-list');
    data.cutoffs.forEach(cutoff => {
      const cutoffElement = createCutoffElement(cutoff);
      cutoffsList.appendChild(cutoffElement);
    });
    
    // Mostrar advertencia si está bloqueado
    if (data.isBlocked) {
      document.getElementById('blocked-warning').style.display = 'block';
    }
  } else {
    document.getElementById('no-credit-message').style.display = 'block';
  }
};

const createCutoffElement = (cutoff) => {
  const div = document.createElement('div');
  div.className = `cutoff ${cutoff.isPaid ? 'paid' : 'pending'} ${cutoff.isOverdue ? 'overdue' : ''}`;
  
  const date = new Date(cutoff.cutoffDate).toLocaleDateString('es-EC');
  const dueDate = new Date(cutoff.paymentDueDate).toLocaleDateString('es-EC');
  const used = (cutoff.amountUsed / 100).toFixed(2);
  const paid = (cutoff.amountPaid / 100).toFixed(2);
  const owed = ((cutoff.amountUsed - cutoff.amountPaid) / 100).toFixed(2);
  
  div.innerHTML = `
    <div class="cutoff-header">
      <span class="status-icon">${cutoff.isPaid ? '✅' : cutoff.isOverdue ? '🔴' : '🟡'}</span>
      <span class="date">${date}</span>
      <span class="due-date">Vence: ${dueDate}</span>
    </div>
    <div class="cutoff-details">
      <div>Usado: $${used}</div>
      <div>Pagado: $${paid}</div>
      ${!cutoff.isPaid ? `<div class="owed">Debe: $${owed}</div>` : ''}
      <div>Firmas: ${cutoff.signaturesCount}</div>
    </div>
  `;
  
  return div;
};
```

---

### Ejemplo 2: Panel de Administración - Lista de Distribuidores con Crédito

```javascript
// Admin panel - Lista de distribuidores con crédito
const loadDistributorsWithCredit = async () => {
  // Primero obtener lista de distribuidores
  const distributorsResponse = await fetch(
    'https://api.example.com/distributors',
    {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    }
  );
  
  const distributors = await distributorsResponse.json();
  
  // Por cada distribuidor, consultar su crédito
  const distributorsWithCredit = [];
  
  for (const dist of distributors) {
    const creditResponse = await fetch(
      `https://api.example.com/credits/${dist.id}/summary`,
      {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      }
    );
    
    const creditData = await creditResponse.json();
    
    if (creditData.hasCredit) {
      distributorsWithCredit.push({
        distributor: dist,
        credit: creditData
      });
    }
  }
  
  // Renderizar tabla
  renderDistributorsCreditTable(distributorsWithCredit);
};

const renderDistributorsCreditTable = (distributors) => {
  const tbody = document.getElementById('credit-table-body');
  tbody.innerHTML = '';
  
  distributors.forEach(item => {
    const row = document.createElement('tr');
    row.className = item.credit.isBlocked ? 'blocked' : '';
    
    const totalOwed = (item.credit.totalOwed / 100).toFixed(2);
    const status = item.credit.isBlocked ? '🔒 Bloqueado' : '✅ Activo';
    
    row.innerHTML = `
      <td>${item.distributor.email}</td>
      <td>${item.distributor.firstName} ${item.distributor.lastName}</td>
      <td>${item.credit.creditDays} días</td>
      <td class="status">${status}</td>
      <td>$${totalOwed}</td>
      <td>${item.credit.unpaidCutoffs.length}</td>
      <td>
        <button onclick="viewDetails('${item.distributor.id}')">Ver detalles</button>
        ${!item.credit.isBlocked ? 
          `<button onclick="deactivateCredit('${item.distributor.id}')">Desactivar</button>` :
          `<button onclick="reactivateCredit('${item.distributor.id}')">Reactivar</button>`
        }
      </td>
    `;
    
    tbody.appendChild(row);
  });
};
```

---

### Ejemplo 3: Cómo se Registra una Firma en Crédito

Cuando un distribuidor emite una firma, el sistema automáticamente:

```typescript
// Dentro del servicio de firmas (signatures.service.ts)
async createSignature(data, distributorId) {
  // 1. Crear la firma
  const signature = await this.prisma.signature.create({
    data: {
      ...data,
      distributorId,
      status: 'PENDING',
      paymentMethod: 'CREDIT' // Indicador de que es a crédito
    }
  });
  
  // 2. Registrar en el corte del día
  await this.creditsService.registerSignatureInCredit(
    distributorId,
    data.amount, // Monto en centavos
    signature.id
  );
  
  return signature;
}
```

El método `registerSignatureInCredit` hace:

```typescript
async registerSignatureInCredit(distributorId, signatureAmount, signatureId) {
  // 1. Verificar que tenga crédito activo
  const credit = await this.prisma.distributorCredit.findFirst({
    where: { distributorId, isActive: true }
  });
  
  if (!credit) {
    throw new BadRequestException('No tiene crédito activo');
  }
  
  if (credit.isBlocked) {
    throw new BadRequestException('Crédito bloqueado por falta de pago');
  }
  
  // 2. Calcular fechas
  const now = new Date();
  const cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const paymentDueDate = new Date(cutoffDate);
  paymentDueDate.setDate(paymentDueDate.getDate() + credit.creditDays);
  paymentDueDate.setHours(23, 59, 59, 999);
  
  // 3. Crear o actualizar corte del día
  const cutoff = await this.prisma.creditCutoff.upsert({
    where: {
      creditId_cutoffDate: {
        creditId: credit.id,
        cutoffDate
      }
    },
    create: {
      distributorId,
      creditId: credit.id,
      cutoffDate,
      paymentDueDate,
      amountUsed: signatureAmount,
      signaturesCount: 1,
      signaturesDetails: JSON.stringify([signatureId])
    },
    update: {
      amountUsed: { increment: signatureAmount },
      signaturesCount: { increment: 1 }
    }
  });
  
  return cutoff;
}
```

---

## Resumen de Endpoints

### Para Distribuidores

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| GET | `/credits/:distributorId/can-emit` | Verificar si puede emitir | JWT |
| GET | `/credits/:distributorId/summary` | Ver resumen de crédito | JWT |

### Para Administradores

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| POST | `/credits` | Activar crédito | JWT + ADMIN |
| PATCH | `/credits/:distributorId/deactivate` | Desactivar crédito | JWT + ADMIN |
| PATCH | `/credits/:distributorId/reactivate` | Reactivar crédito | JWT + ADMIN |
| GET | `/credits/:distributorId/summary` | Ver resumen (cualquier dist.) | JWT + ADMIN |
| GET | `/credits/admin/:distributorId/cutoffs` | Ver cortes de crédito con filtros | JWT + ADMIN |

### Detalles del Endpoint de Cortes

**GET `/credits/admin/:distributorId/cutoffs`**

Obtiene todos los cortes de crédito de un distribuidor con paginación y filtros de fecha.

**Parámetros URL:**
- `distributorId` (string): ID del distribuidor

**Query Params:**
- `page` (number, opcional): Número de página (default: 1)
- `limit` (number, opcional): Elementos por página (default: 10)
- `startDate` (string, opcional): Fecha inicio en formato ISO 8601 (ej: `2026-01-01T00:00:00.000Z`)
- `endDate` (string, opcional): Fecha fin en formato ISO 8601 (ej: `2026-01-31T23:59:59.999Z`)

**Ejemplo Request:**
```http
GET /credits/admin/cmk91gc3p006k1ppvlcnwvc97/cutoffs?page=1&limit=10&startDate=2026-01-01T00:00:00.000Z&endDate=2026-01-31T23:59:59.999Z
Authorization: Bearer <token>
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "clx222",
      "distributorId": "cmk91gc3p006k1ppvlcnwvc97",
      "creditId": "clx1234567890",
      "cutoffDate": "2026-01-15T00:00:00.000Z",
      "paymentDueDate": "2026-01-17T23:59:59.999Z",
      "amountUsed": 25000,
      "amountPaid": 5000,
      "isPaid": false,
      "isOverdue": false,
      "signaturesCount": 5,
      "signaturesDetails": "[\"sig1\",\"sig2\",\"sig3\",\"sig4\",\"sig5\"]",
      "createdAt": "2026-01-15T10:30:00.000Z",
      "updatedAt": "2026-01-16T08:15:00.000Z",
      "credit": {
        "id": "clx1234567890",
        "creditDays": 2,
        "isActive": true,
        "isBlocked": false,
        "assignedBy": "Admin Name"
      }
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  },
  "totals": {
    "totalUsed": 125000,
    "totalPaid": 85000,
    "totalOwed": 40000,
    "totalSignatures": 25
  }
}
```

**Campos de Respuesta:**
- `data`: Array de cortes de crédito
  - `amountUsed`: Monto total usado en ese corte (en centavos)
  - `amountPaid`: Monto pagado de ese corte (en centavos)
  - `isPaid`: Si el corte está completamente pagado
  - `isOverdue`: Si el corte venció sin pagar
  - `signaturesCount`: Cantidad de firmas en ese corte
  - `credit`: Información del crédito asociado
- `pagination`: Información de paginación
- `totals`: Totales agregados del rango consultado
  - `totalUsed`: Suma de todos los montos usados
  - `totalPaid`: Suma de todos los montos pagados
  - `totalOwed`: Diferencia entre usado y pagado
  - `totalSignatures`: Total de firmas en el rango

---

## Notas Importantes

### Conversión de Montos

Todos los montos se almacenan en **centavos** (integers) para evitar problemas de precisión:

```javascript
// Convertir de dólares a centavos
const dollars = 150.00;
const cents = Math.round(dollars * 100); // 15000

// Convertir de centavos a dólares
const cents = 15000;
const dollars = (cents / 100).toFixed(2); // "150.00"
```

### Zona Horaria

Los cron jobs usan la zona horaria de Ecuador (`America/Guayaquil`).

### Logs

El sistema registra eventos importantes:
- Activación/desactivación de créditos
- Distribuidores bloqueados
- Cobros exitosos/parciales
- Errores en cron jobs

### Seguridad

- Solo administradores pueden activar/desactivar créditos
- Los distribuidores solo pueden ver su propio crédito
- Los administradores pueden ver el crédito de cualquier distribuidor

---

## Preguntas Frecuentes

**P: ¿Qué pasa si un distribuidor recarga su saldo después de estar bloqueado?**

R: El próximo cron job (23:59) detectará el saldo y cobrará automáticamente. Si paga todas sus deudas, se desbloqueará automáticamente.

**P: ¿Puede un distribuidor tener múltiples créditos activos?**

R: No, solo puede tener un crédito activo a la vez.

**P: ¿Se pueden cambiar los días de crédito de un crédito existente?**

R: No, los días de crédito se establecen al activar el crédito y no se pueden modificar. Para cambiarlos, hay que desactivar el crédito actual y crear uno nuevo.

**P: ¿Qué pasa con las firmas que ya se emitieron si se desactiva el crédito?**

R: Las firmas ya emitidas permanecen, y los cortes pendientes deben ser pagados antes de poder desactivar el crédito.

**P: ¿Los cobros automáticos pueden fallar?**

R: Sí, si hay un error de base de datos o de sistema. Los logs registrarán estos errores y se pueden procesar manualmente.

---

## Contacto y Soporte

Para preguntas o problemas con el sistema de créditos, contactar al equipo de desarrollo.

**Última actualización:** 16 de enero de 2026
