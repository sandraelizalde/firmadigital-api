# Sistema de Recargas - API Distribuidores Elizalde y Asociados

## 🔢 Importante: Manejo de Montos

**Todos los montos se manejan en CENTAVOS (enteros)**

- El frontend debe enviar y recibir todos los montos en centavos
- Ejemplo: $100.00 = 10000 centavos
- Ejemplo: $1.50 = 150 centavos
- No se usan decimales en la API

## Descripción General

El sistema de recargas permite a los distribuidores solicitar recargas mediante dos métodos:
- **TRANSFER (Transferencia bancaria)**: Queda en estado `PENDING` hasta que un admin apruebe o rechace
- **CARD (Tarjeta)**: Se procesa automáticamente mediante integración con Payphone

## Modelos Modificados

### Distributor
Se agregó el campo `balance` (Int, default: 0) para mantener el saldo actual del distribuidor **en centavos**.

### Campos Monetarios (todos en centavos)
- `Distributor.balance`: Int
- `Plan.basePrice`: Int
- `Plan.basePricePromo`: Int
- `DistributorPlanPrice.customPrice`: Int
- `DistributorPlanPrice.customPricePromo`: Int
- `Recharge.requestedAmount`: Int
- `Recharge.creditedAmount`: Int
- `Recharge.commission`: Int
- `AccountMovement.amount`: Int
- `AccountMovement.balanceAfter`: Int

## Endpoints

### 📱 Endpoints para Distribuidores

#### 1. Solicitar una Recarga
```http
POST /recharges
Authorization: Bearer {token}
Content-Type: application/json

{
  "method": "TRANSFER" | "CARD",
  "requestedAmount": 10000,  // $100.00 en centavos
  "paymentReference": "TRANS-12345", // Opcional, para transferencias
  "transferDate": "2025-12-12T10:00:00Z", // Opcional
  "receiptFile": "https://..." // Opcional, URL del comprobante
}
```

**Respuesta:**
```json
{
  "id": "clxxx",
  "distributorId": "clxxx",
  "method": "TRANSFER",
  "requestedAmount": 10000,  // $100.00 en centavos
  "creditedAmount": null,
  "commission": null,
  "status": "PENDING",
  "paymentReference": "TRANS-12345",
  "transferDate": "2025-12-12T10:00:00Z",
  "receiptFile": "https://...",
  "createdAt": "2025-12-12T10:00:00Z",
  "distributor": {
    "id": "clxxx",
    "firstName": "Juan",
    "lastName": "Pérez",
    "email": "juan@example.com"
  }
}
```

#### 2. Ver Mis Recargas
```http
GET /recharges/my-recharges
Authorization: Bearer {token}
```

**Respuesta:**
```json
[
  {
    "id": "clxxx",
    "method": "TRANSFER",
    "requestedAmount": 10000,  // $100.00 en centavos
    "creditedAmount": 10000,
    "commission": 0,
    "status": "APPROVED",
    "createdAt": "2025-12-12T10:00:00Z",
    "accountMovements": [...]
  }
]
```

#### 3. Ver Detalle de una Recarga
```http
GET /recharges/my-recharges/{id}
Authorization: Bearer {token}
```

#### 4. Ver Mis Movimientos de Cuenta
```http
GET /recharges/my-account-movements
Authorization: Bearer {token}
```

**Respuesta:**
```json
[
  {
    "id": "clxxx",
    "type": "INCOME",
    "detail": "Recarga aprobada - TRANSFER",
    "amount": 10000,  // $100.00 en centavos
    "balanceAfter": 10000,
    "createdAt": "2025-12-12T10:00:00Z",
    "recharge": {
      "id": "clxxx",
      "method": "TRANSFER",
      "requestedAmount": 10000,
      "status": "APPROVED"
    }
  }
]
```

---

### 👨‍💼 Endpoints para Admin

#### 1. Ver Todas las Recargas
```http
GET /recharges/admin/all?status=PENDING
Authorization: Bearer {token}
```

Query params opcionales:
- `status`: PENDING | APPROVED | REJECTED | FAILED

#### 2. Ver Solo Recargas Pendientes
```http
GET /recharges/admin/pending
Authorization: Bearer {token}
```

#### 3. Ver Detalle de una Recarga
```http
GET /recharges/admin/{id}
Authorization: Bearer {token}
```

#### 4. Aprobar o Rechazar Recarga
```http
PATCH /recharges/admin/{id}/review
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "APPROVED" | "REJECTED",
  "adminNote": "Transferencia verificada" // Opcional
}
```

**Comportamiento:**
- Si `status: APPROVED`: 
  - Se acredita el monto al balance del distribuidor
  - Se crea un movimiento de cuenta tipo INCOME
  - Se actualiza el `creditedAmount` y `commission`
- Si `status: REJECTED`:
  - No se afecta el balance
  - Solo se actualiza el estado de la recarga

#### 5. Asignar Recarga Manual
```http
POST /recharges/admin/manual
Authorization: Bearer {token}
Content-Type: application/json

{
  "distributorId": "clxxx",
  "amount": 10000,  // $100.00 en centavos
  "note": "Ajuste por error en sistema anterior" // Opcional
}
```

Este endpoint crea una recarga automáticamente aprobada y acredita el monto inmediatamente.

#### 6. Ver Movimientos de Cuenta de un Distribuidor
```http
GET /recharges/admin/distributor/{distributorId}/movements
Authorization: Bearer {token}
```

---

### 🌐 Webhook de Payphone (Público)

#### Recibir Notificación de Payphone
```http
POST /recharges/webhook/payphone
Content-Type: application/json

{
  "transactionId": "PAY-12345",
  "clientTransactionId": "clxxx", // ID de nuestra recarga
  "status": "Approved" | "Rejected",
  "amount": 10000,  // $100.00 en centavos
  "authorizationCode": "AUTH-123", // Opcional
  "message": "Transacción aprobada" // Opcional
}
```

Este endpoint es público (no requiere autenticación) y es llamado por Payphone cuando se completa una transacción.

**Comportamiento:**
- Valida que la recarga exista y sea de método CARD
- Actualiza el estado según la respuesta de Payphone
- Si es aprobada, acredita el monto (menos comisión del 6%) al balance
- Crea el movimiento de cuenta correspondiente

---

## Estados de Recarga

- `PENDING`: Recarga solicitada, esperando aprobación/procesamiento
- `APPROVED`: Recarga aprobada y acreditada
- `REJECTED`: Recarga rechazada por el admin
- `FAILED`: Error en el procesamiento (generalmente con tarjeta)

## Tipos de Movimiento de Cuenta

- `INCOME`: Ingreso (recargas aprobadas)
- `EXPENSE`: Egreso (compra de firmas, etc.)
- `ADJUSTMENT`: Ajustes manuales

## Comisiones

- **Transferencias**: 0% (sin comisión)
- **Tarjetas (Payphone)**: 6% sobre el monto solicitado (redondeado al centavo más cercano)

El campo `creditedAmount` muestra el monto real acreditado después de descontar la comisión.

**Ejemplos de cálculo:**
- Recarga de $100.00 (10000 centavos) por transferencia:
  - Comisión: 0 centavos
  - Acreditado: 10000 centavos
- Recarga de $100.00 (10000 centavos) por tarjeta:
  - Comisión: 300 centavos ($3.00)
  - Acreditado: 9700 centavos ($97.00)

## Flujo de Trabajo

### Recarga por Transferencia:
1. Distribuidor solicita recarga con método TRANSFER
2. Opcionalmente sube comprobante y referencia
3. Recarga queda en estado PENDING
4. Admin revisa y aprueba/rechaza
5. Si aprueba: se acredita el monto al balance
6. Si rechaza: no se acredita nada

### Recarga por Tarjeta (Payphone):
1. Distribuidor solicita recarga con método CARD
2. Se crea recarga en estado PENDING
3. Frontend redirige a Payphone para procesar pago
4. Payphone notifica resultado vía webhook
5. Sistema actualiza estado y acredita si fue aprobado

### Recarga Manual por Admin:
1. Admin asigna recarga directamente a un distribuidor
2. Se crea con estado APPROVED automáticamente
3. El monto se acredita de inmediato

## Integración con Payphone

Para completar la integración con Payphone, necesitarás:

1. **Credenciales de Payphone**: API Key, Store ID
2. **Implementar generación de link de pago** en el método `createRecharge` cuando `method === CARD`
3. **Configurar URL del webhook** en el panel de Payphone apuntando a `/recharges/webhook/payphone`
4. **Validar firma/token** en el webhook para seguridad

## Próximos Pasos

- [ ] Implementar integración completa con Payphone SDK
- [ ] Agregar notificaciones por email cuando se aprueba/rechaza una recarga
- [ ] Implementar límites de recarga mínima/máxima
- [ ] Agregar reportes de recargas por periodo
- [ ] Implementar descuento automático del balance al crear firma
