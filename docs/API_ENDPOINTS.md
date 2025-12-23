# Documentación de Endpoints - API Distribuidores Nexus

## Índice
- [Autenticación](#autenticación)
- [Distribuidores](#distribuidores)
- [Planes](#planes)
- [Recargas](#recargas)
- [Publicidad](#publicidad)

---

## Autenticación

### 🔐 Login de Distribuidor
**POST** `/auth/login`

Permite a los distribuidores autenticarse usando su cédula/RUC y contraseña.

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "identification": "0123456789",
  "password": "password123"
}
```

**Respuesta Exitosa (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "¡Hola, nos alegra verte otra vez!",
  "success": true
}
```

**Errores:**
- `404`: Credenciales inválidas o distribuidor no encontrado
- `429`: Demasiados intentos de login (máximo 5 en 60 segundos)

---

### 👤 Registrar Distribuidor (ADMIN)
**POST** `/auth/register/distributor`

Registra un nuevo distribuidor en el sistema. Solo para administradores.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "firstName": "Luis Fernando",
  "lastName": "González",
  "identification": "0123456789",
  "email": "distribuidor@example.com",
  "password": "password123",
  "phone": "0987654321",
  "address": "Av. Principal 123",
  "socialReason": "Distribuidora González S.A.",
  "identificationType": "RUC"
}
```

**Campos:**
- `firstName` (string, requerido): Nombre del distribuidor
- `lastName` (string, requerido): Apellido del distribuidor
- `identification` (string, requerido): Cédula o RUC (único)
- `email` (string, requerido): Email (único)
- `password` (string, requerido): Contraseña (se encripta con AES-256-CBC)
- `phone` (string, opcional): Teléfono de contacto
- `address` (string, opcional): Dirección física
- `socialReason` (string, opcional): Razón social para RUC
- `identificationType` (string, opcional): "CEDULA" o "RUC" (default: CEDULA)

**Respuesta Exitosa (201):**
```json
{
  "success": true,
  "message": "Distribuidor registrado exitosamente.",
  "distributor": {
    "id": "clxxx123abc",
    "firstName": "Luis Fernando",
    "lastName": "González",
    "email": "distribuidor@example.com",
    "identification": "0123456789",
    "active": true,
    "balance": 0
  }
}
```

**Errores:**
- `401`: Token JWT inválido o faltante
- `403`: Solo usuarios con rol ADMIN pueden acceder
- `409`: El distribuidor ya existe (identificación o email duplicado)
- `429`: Demasiadas solicitudes (máximo 10 en 60 segundos)

---

## Distribuidores

### 📋 Listar Todos los Distribuidores (ADMIN)
**GET** `/distributors`

Obtiene la lista completa de distribuidores activos.

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
[
  {
    "id": "clxxx123abc",
    "firstName": "Luis",
    "lastName": "González",
    "identification": "0123456789",
    "email": "distribuidor@example.com",
    "phone": "0987654321",
    "address": "Av. Principal 123",
    "balance": 50000,
    "active": true,
    "createdAt": "2025-12-01T10:00:00.000Z",
    "billingInfo": {
      "useDistributorData": true,
      "businessName": "Distribuidora González S.A."
    },
    "distributorPlans": [
      {
        "customPrice": 1500,
        "plan": {
          "id": "plan123",
          "name": "Plan Básico",
          "description": "1GB de datos"
        }
      }
    ]
  }
]
```

**Errores:**
- `401`: No autorizado
- `403`: Requiere rol ADMIN

---

### 🔍 Obtener Distribuidor por ID
**GET** `/distributors/:distributorId`

Obtiene información detallada de un distribuidor específico.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros URL:**
- `distributorId` (string): ID del distribuidor

**Respuesta Exitosa (200):**
```json
{
  "id": "clxxx123abc",
  "firstName": "Luis",
  "lastName": "González",
  "identification": "0123456789",
  "email": "distribuidor@example.com",
  "phone": "0987654321",
  "address": "Av. Principal 123",
  "socialReason": "Distribuidora González S.A.",
  "identificationType": "RUC",
  "balance": 50000,
  "active": true,
  "createdAt": "2025-12-01T10:00:00.000Z",
  "updatedAt": "2025-12-15T14:30:00.000Z",
  "billingInfo": {
    "id": "billing123",
    "useDistributorData": false,
    "businessName": "Mi Empresa",
    "ruc": "1234567890001",
    "address": "Calle Comercial 456",
    "phone": "0999888777",
    "email": "facturacion@empresa.com"
  },
  "distributorPlans": [
    {
      "id": "dp123",
      "customPrice": 1500,
      "active": true,
      "plan": {
        "id": "plan123",
        "name": "Plan Básico",
        "basePrice": 2000,
        "operator": "CLARO"
      }
    }
  ]
}
```

**Errores:**
- `401`: No autorizado
- `404`: Distribuidor no encontrado

---

### 🧾 Crear Información de Facturación (ADMIN)
**POST** `/distributors/:distributorId/billing`

Configura datos de facturación para un distribuidor.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Parámetros URL:**
- `distributorId` (string): ID del distribuidor

**Body (Usar datos del distribuidor):**
```json
{
  "useDistributorData": true
}
```

**Body (Usar datos personalizados):**
```json
{
  "useDistributorData": false,
  "businessName": "Mi Empresa S.A.",
  "ruc": "1234567890001",
  "address": "Calle Comercial 456",
  "phone": "0999888777",
  "email": "facturacion@empresa.com"
}
```

**Respuesta Exitosa (201):**
```json
{
  "id": "billing123",
  "distributorId": "clxxx123abc",
  "useDistributorData": false,
  "businessName": "Mi Empresa S.A.",
  "ruc": "1234567890001",
  "address": "Calle Comercial 456",
  "phone": "0999888777",
  "email": "facturacion@empresa.com",
  "createdAt": "2025-12-15T10:00:00.000Z"
}
```

**Errores:**
- `401`: No autorizado
- `403`: Requiere rol ADMIN
- `404`: Distribuidor no encontrado
- `409`: El distribuidor ya tiene información de facturación

---

### ✏️ Actualizar Información de Facturación (ADMIN)
**PATCH** `/distributors/:distributorId/billing`

Modifica los datos de facturación de un distribuidor.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Parámetros URL:**
- `distributorId` (string): ID del distribuidor

**Body:**
```json
{
  "businessName": "Nueva Razón Social",
  "phone": "0987654321"
}
```

**Respuesta Exitosa (200):**
```json
{
  "id": "billing123",
  "distributorId": "clxxx123abc",
  "useDistributorData": false,
  "businessName": "Nueva Razón Social",
  "ruc": "1234567890001",
  "address": "Calle Comercial 456",
  "phone": "0987654321",
  "email": "facturacion@empresa.com",
  "updatedAt": "2025-12-16T08:30:00.000Z"
}
```

**Errores:**
- `401`: No autorizado
- `403`: Requiere rol ADMIN
- `404`: Distribuidor no encontrado o no tiene información de facturación

---

### 📄 Obtener Información de Facturación
**GET** `/distributors/:distributorId/billing`

Obtiene los datos de facturación de un distribuidor.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros URL:**
- `distributorId` (string): ID del distribuidor

**Respuesta Exitosa (200):**
```json
{
  "id": "billing123",
  "distributorId": "clxxx123abc",
  "useDistributorData": true,
  "businessName": "Distribuidora González S.A.",
  "ruc": "0123456789001",
  "address": "Av. Principal 123",
  "phone": "0987654321",
  "email": "distribuidor@example.com"
}
```

**Errores:**
- `401`: No autorizado
- `404`: Información de facturación no encontrada

---

### 📊 Obtener Dashboard del Distribuidor
**GET** `/distributors/profile/dashboard`

Obtiene información completa del distribuidor para mostrar en la página principal/dashboard incluyendo saldo disponible, total de firmas vendidas, dinero gastado en el mes y actividad reciente.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "dashboard": {
    "distributor": {
      "id": "clxxx123abc",
      "firstName": "Luis Fernando",
      "lastName": "González",
      "email": "distribuidor@example.com",
      "identification": "0123456789",
      "phone": "0987654321",
      "address": "Av. Principal 123"
    },
    "balance": 500000,
    "totalSignatures": 15,
    "monthlySpent": 300000,
    "advertisements": [
      {
        "id": "clxxx123abc",
        "imageUrl": "/uploads/ads/ad_1702894567890_abc123.jpeg",
      },
      {
        "id": "clxxx789ghi",
        "imageUrl": "/uploads/ads/ad_1702894567892_ghi789.jpeg",
      }
    ],
    "recentMovements": [
      {
        "id": "mov1",
        "type": "INCOME",
        "detail": "Recarga aprobada",
        "amount": 100000,
        "date": "2025-12-17T14:30:00.000Z"
      },
      {
        "id": "mov2",
        "type": "EXPENSE",
        "detail": "Venta realizada",
        "amount": -15000,
        "date": "2025-12-17T09:15:00.000Z"
      },
    ]
  }
}
```

**Campos devueltos:**
- `distributor`: Información básica del distribuidor autenticado
  - `id`: ID único del distribuidor
  - `firstName`: Nombre del distribuidor
  - `lastName`: Apellido del distribuidor
  - `email`: Email del distribuidor
  - `identification`: Cédula o RUC del distribuidor
  - `phone`: Teléfono del distribuidor
  - `address`: Dirección del distribuidor
- `balance`: Saldo disponible en centavos
- `totalSignatures`: Total de firmas vendidas (acumulado histórico)
- `monthlySpent`: Total de dinero gastado en recargas aprobadas del mes actual (en centavos)
- `advertisements`: Array de publicidades activas ordenadas por prioridad
  - `id`: ID de la publicidad
  - `imageUrl`: URL de la imagen (se puede acceder directamente desde el navegador)
- `recentMovements`: Últimos 2 movimientos de la cuenta
  - `id`: ID del movimiento
  - `type`: Tipo de movimiento (INCOME, EXPENSE, ADJUSTMENT)
  - `detail`: Descripción del movimiento
  - `amount`: Monto en centavos (positivo para ingresos, negativo para gastos)
  - `date`: Fecha y hora del movimiento

**Errores:**
- `401`: No autorizado
- `404`: Distribuidor no encontrado

---

## Planes

### 📱 Listar Todos los Planes
**GET** `/plans`

Obtiene la lista completa de planes activos. **Endpoint público.**

**Respuesta Exitosa (200):**
```json
[
  {
    "id": "plan123",
    "name": "Plan Básico 1GB",
    "description": "1GB de datos + 100 minutos",
    "basePrice": 2000,
    "operator": "CLARO",
    "dataAmount": "1GB",
    "validity": "30 días",
    "active": true,
    "createdAt": "2025-12-01T10:00:00.000Z"
  },
  {
    "id": "plan456",
    "name": "Plan Plus 3GB",
    "description": "3GB de datos + 200 minutos",
    "basePrice": 3500,
    "operator": "MOVISTAR",
    "dataAmount": "3GB",
    "validity": "30 días",
    "active": true
  }
]
```

---

### 🔍 Obtener Plan por ID
**GET** `/plans/:planId`

Obtiene información detallada de un plan específico. **Endpoint público.**

**Parámetros URL:**
- `planId` (string): ID del plan

**Respuesta Exitosa (200):**
```json
{
  "id": "plan123",
  "name": "Plan Básico 1GB",
  "description": "1GB de datos + 100 minutos",
  "basePrice": 2000,
  "operator": "CLARO",
  "dataAmount": "1GB",
  "validity": "30 días",
  "active": true,
  "createdAt": "2025-12-01T10:00:00.000Z",
  "updatedAt": "2025-12-15T14:30:00.000Z"
}
```

**Errores:**
- `404`: Plan no encontrado

---

### ➕ Asignar Planes a Distribuidor (ADMIN)
**POST** `/plans/assign`

Asigna múltiples planes a un distribuidor con precios personalizados.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "distributorId": "clxxx123abc",
  "plans": [
    {
      "planId": "plan123",
      "customPrice": 1500
    },
    {
      "planId": "plan456",
      "customPrice": 3000
    },
    {
      "planId": "plan789",
      "customPrice": 5000
    }
  ]
}
```

**Campos:**
- `distributorId` (string, requerido): ID del distribuidor
- `plans` (array, requerido): Lista de planes a asignar
  - `planId` (string, requerido): ID del plan
  - `customPrice` (number, requerido): Precio personalizado en centavos

**Respuesta Exitosa (201):**
```json
{
  "success": true,
  "message": "3 planes asignados exitosamente al distribuidor",
  "distributor": {
    "id": "clxxx123abc",
    "firstName": "Luis",
    "lastName": "González",
    "email": "distribuidor@example.com"
  },
  "assignments": [
    {
      "id": "dp123",
      "distributorId": "clxxx123abc",
      "planId": "plan123",
      "customPrice": 1500,
      "active": true,
      "plan": {
        "name": "Plan Básico 1GB",
        "basePrice": 2000,
        "operator": "CLARO"
      },
      "assignedBy": "admin456",
      "createdAt": "2025-12-16T10:00:00.000Z"
    }
  ]
}
```

**Errores:**
- `400`: Uno o más planes no fueron encontrados o están inactivos
- `401`: No autorizado
- `403`: Solo administradores pueden asignar planes
- `404`: Distribuidor no encontrado
- `409`: Algunos planes ya están asignados al distribuidor

---

### ✏️ Actualizar Precio de Plan Asignado (ADMIN)
**PATCH** `/plans/:distributorId/:planId`

Modifica el precio personalizado de un plan ya asignado.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Parámetros URL:**
- `distributorId` (string): ID del distribuidor
- `planId` (string): ID del plan

**Body:**
```json
{
  "customPrice": 1800
}
```

**Respuesta Exitosa (200):**
```json
{
  "id": "dp123",
  "distributorId": "clxxx123abc",
  "planId": "plan123",
  "customPrice": 1800,
  "active": true,
  "plan": {
    "id": "plan123",
    "name": "Plan Básico 1GB",
    "basePrice": 2000,
    "operator": "CLARO"
  },
  "updatedBy": "admin456",
  "updatedAt": "2025-12-16T11:00:00.000Z"
}
```

**Errores:**
- `401`: No autorizado
- `403`: Solo administradores
- `404`: Plan no asignado a este distribuidor

---

### 📋 Listar Planes de un Distribuidor
**GET** `/plans/distributor/:distributorId`

Obtiene todos los planes activos asignados a un distribuidor.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros URL:**
- `distributorId` (string): ID del distribuidor

**Respuesta Exitosa (200):**
```json
[
  {
    "id": "dp123",
    "distributorId": "clxxx123abc",
    "planId": "plan123",
    "customPrice": 1500,
    "active": true,
    "plan": {
      "id": "plan123",
      "name": "Plan Básico 1GB",
      "description": "1GB de datos + 100 minutos",
      "basePrice": 2000,
      "operator": "CLARO",
      "dataAmount": "1GB",
      "validity": "30 días",
      "active": true
    },
    "assignedBy": "admin456",
    "createdAt": "2025-12-01T10:00:00.000Z"
  }
]
```

**Errores:**
- `401`: No autorizado
- `404`: Distribuidor no encontrado

---

### ❌ Desactivar Plan de Distribuidor (ADMIN)
**DELETE** `/plans/:distributorId/:planId`

Desactiva un plan asignado a un distribuidor (soft delete).

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros URL:**
- `distributorId` (string): ID del distribuidor
- `planId` (string): ID del plan

**Respuesta Exitosa (200):**
```json
{
  "id": "dp123",
  "distributorId": "clxxx123abc",
  "planId": "plan123",
  "customPrice": 1500,
  "active": false,
  "plan": {
    "name": "Plan Básico 1GB"
  },
  "updatedAt": "2025-12-16T12:00:00.000Z"
}
```

**Errores:**
- `401`: No autorizado
- `403`: Solo administradores
- `404`: Plan no asignado a este distribuidor

---

### ✅ Activar Plan de Distribuidor (ADMIN)
**PATCH** `/plans/:distributorId/:planId/activate`

Re-activa un plan previamente desactivado.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros URL:**
- `distributorId` (string): ID del distribuidor
- `planId` (string): ID del plan

**Respuesta Exitosa (200):**
```json
{
  "id": "dp123",
  "distributorId": "clxxx123abc",
  "planId": "plan123",
  "customPrice": 1500,
  "active": true,
  "plan": {
    "name": "Plan Básico 1GB"
  },
  "updatedAt": "2025-12-16T12:30:00.000Z"
}
```

**Errores:**
- `401`: No autorizado
- `403`: Solo administradores
- `404`: Plan no asignado a este distribuidor

---

### 📊 Listar Distribuidores con Planes (ADMIN)
**GET** `/plans/distributors/all`

Obtiene lista completa de distribuidores activos con sus planes asignados.

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
[
  {
    "id": "clxxx123abc",
    "firstName": "Luis",
    "lastName": "González",
    "email": "distribuidor@example.com",
    "identification": "0123456789",
    "balance": 50000,
    "active": true,
    "distributorPlans": [
      {
        "id": "dp123",
        "customPrice": 1500,
        "active": true,
        "plan": {
          "id": "plan123",
          "name": "Plan Básico 1GB",
          "basePrice": 2000,
          "operator": "CLARO"
        }
      }
    ]
  }
]
```

**Errores:**
- `401`: No autorizado
- `403`: Solo administradores

---

## Recargas

### 💳 Solicitar Nueva Recarga (Transferencia)
**POST** `/recharges`

Permite a un distribuidor solicitar una recarga por transferencia bancaria.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "method": "TRANSFER",
  "requestedAmount": 10000,
  "paymentReference": "TRANS-12345",
  "transferDate": "2025-12-16T10:00:00Z",
  "receiptFile": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

**Campos:**
- `method` (string, requerido): "TRANSFER" o "CARD"
- `requestedAmount` (number, requerido): Monto en centavos (ej: 10000 = $100.00)
- `paymentReference` (string, opcional): Referencia de la transferencia
- `transferDate` (datetime, opcional): Fecha de la transferencia
- `receiptFile` (string, opcional): Voucher en base64 (con o sin prefijo data:)

**Respuesta Exitosa (201):**
```json
{
  "id": "recharge123",
  "distributorId": "clxxx123abc",
  "method": "TRANSFER",
  "requestedAmount": 10000,
  "status": "PENDING",
  "paymentReference": "TRANS-12345",
  "transferDate": "2025-12-16T10:00:00.000Z",
  "receiptFile": "https://s3.us-east-1.wasabisys.com/vouchers-nexuss/vouchers/recharge123-1734345600000.jpg",
  "createdAt": "2025-12-16T10:00:00.000Z",
  "distributor": {
    "id": "clxxx123abc",
    "firstName": "Luis",
    "lastName": "González",
    "email": "distribuidor@example.com",
    "identification": "0123456789"
  }
}
```

**Errores:**
- `400`: Datos inválidos o distribuidor inactivo
- `401`: No autorizado

---

### 💳 Iniciar Recarga con Tarjeta (Payphone)
**POST** `/recharges/init-card-recharge`

Crea una recarga PENDING con cálculos de comisión y retorna datos para configurar la cajita de Payphone.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "requestedAmount": 10000,
  "reference": "Recarga de saldo"
}
```

**Campos:**
- `requestedAmount` (number, requerido): Monto total a pagar en centavos (mínimo 100)
- `reference` (string, opcional): Motivo del pago

**Respuesta Exitosa (201):**
```json
{
  "rechargeId": "recharge456",
  "amount": 10000,
  "commission": 600,
  "clientTransactionId": "recharge456",
  "payphone": {
    "currency": "USD",
    "reference": "Recarga de saldo"
  },
  "distributor": {
    "email": "distribuidor@example.com",
    "documentId": "0123456789",
    "name": "Luis González"
  }
}
```

**Campos devueltos:**
- `rechargeId`: ID único de la recarga creada
- `amount`: Monto total a pagar (igual a `requestedAmount`)
- `commission`: Comisión del 6% calculada automáticamente
- `clientTransactionId`: ID de transacción para Payphone (igual a `rechargeId`)
- `payphone`: Datos necesarios para configurar la cajita de pagos
- `distributor`: Información del distribuidor para Payphone

**⚠️ IMPORTANTE - Comisiones:**
- Comisión: **6%** del monto total
- Monto a acreditar: `requestedAmount - (requestedAmount * 0.06)`
- Ejemplo: Si se paga $100.00, se cobra comisión de $6.00 y se acreditan $94.00 al saldo
- Los valores de comisión y monto a acreditar se calculan y guardan en la base de datos al crear la recarga

**Errores:**
- `400`: Datos inválidos o distribuidor inactivo
- `401`: No autorizado

**Nota:** Los datos de `payphone` se usan en el frontend para configurar la cajita de pagos. Ver [PAYPHONE_FRONTEND.md](PAYPHONE_FRONTEND.md)

---

### ✅ Confirmar Recarga con Tarjeta
**POST** `/recharges/confirm-card-recharge`

Confirma el estado de una recarga con tarjeta consultando Payphone API y acredita el saldo si fue aprobada.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "id": 23178284,
  "clientTxId": "recharge456"
}
```

**Campos:**
- `id` (number, requerido): ID de transacción de Payphone
- `clientTxId` (string, requerido): ID de la recarga (clientTransactionId)

**Respuesta Exitosa (200):**
```json
{
  "recharge": {
    "id": "recharge456",
    "distributorId": "clxxx123abc",
    "method": "CARD",
    "requestedAmount": 10000,
    "creditedAmount": 9400,
    "commission": 600,
    "status": "APPROVED",
    "paymentReference": "Payphone: 23178284",
    "createdAt": "2025-12-16T10:00:00.000Z",
    "distributor": {
      "id": "clxxx123abc",
      "firstName": "Luis",
      "lastName": "González",
      "email": "distribuidor@example.com",
      "balance": 59400
    },
    "accountMovements": [
      {
        "id": "mov123",
        "type": "INCOME",
        "detail": "Recarga con tarjeta aprobada - Payphone",
        "amount": 9400,
        "balanceAfter": 59400,
        "note": "Transacción Payphone: 23178284 - Mastercard Produbanco/Promerica XX17",
        "createdAt": "2025-12-16T10:01:00.000Z"
      }
    ]
  },
  "payphone": {
    "transactionId": 23178284,
    "authorizationCode": "W23178284",
    "cardBrand": "Mastercard Produbanco/Promerica",
    "lastDigits": "XX17",
    "transactionStatus": "Approved"
  }
}
```

**Comportamiento:**
1. Consulta el estado de la transacción en Payphone
2. Si es aprobada (statusCode=3), acredita el saldo usando los valores calculados en `initCardRecharge`
3. Si es rechazada (statusCode=2), actualiza el estado a REJECTED sin acreditar
4. Crea un movimiento de cuenta con el monto acreditado y detalles de Payphone

**⚠️ IMPORTANTE:** 
- Este endpoint debe llamarse dentro de los **5 minutos** posteriores al pago
- Si no se confirma en ese tiempo, Payphone reversará automáticamente la transacción
- Los valores de `creditedAmount` y `commission` ya fueron calculados en `initCardRecharge` (6% de comisión)
- NO se recalcula la comisión, se usan los valores guardados en la base de datos

**Errores:**
- `400`: Recarga ya procesada o error en la confirmación
- `401`: No autorizado
- `404`: Recarga no encontrada

---

### � Obtener Resumen de Recargas
**GET** `/recharges/summary`

Retorna balance total, recargas pendientes y ventas del distribuidor autenticado.

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "summary": {
    "distributor": {
      "name": "Luis Fernando González"
    },
    "balance": 500000,
    "pendingRecharges": {
      "count": 2,
      "amount": 200000
    },
    "sales": {
      "count": 15,
      "amount": 350000
    }
  }
}
```

**Campos devueltos:**
- `balance`: Saldo disponible en centavos
- `pendingRecharges`: Recargas en estado PENDING
  - `count`: Cantidad de recargas pendientes
  - `amount`: Monto total de recargas pendientes en centavos
- `sales`: Ventas totales del distribuidor
  - `count`: Cantidad total de ventas realizadas
  - `amount`: Monto total de ventas en centavos (valor absoluto)

**Errores:**
- `401`: No autorizado
- `404`: Distribuidor no encontrado

---

### 📜 Obtener Mis Recargas
**GET** `/recharges/my-recharges`

Retorna el historial de recargas del distribuidor autenticado con paginación.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros Query:**
- `page` (number, opcional): Número de página (default: 1)
- `limit` (number, opcional): Cantidad de elementos por página (default: 10)

**Ejemplo Request:**
```
GET /recharges/my-recharges?page=1&limit=10
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "recharge123",
      "distributorId": "clxxx123abc",
      "method": "TRANSFER",
      "requestedAmount": 10000,
      "creditedAmount": 10000,
      "commission": 0,
      "status": "APPROVED",
      "paymentReference": "TRANS-12345",
      "receiptFile": "iVBORw0KGgoAAAANSUhEUgAA...",
      "createdAt": "2025-12-15T10:00:00.000Z",
      "accountMovements": [
        {
          "id": "mov123",
          "type": "INCOME",
          "amount": 10000,
          "detail": "Recarga aprobada - TRANSFER",
          "balanceAfter": 10000
        }
      ]
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  }
}
]
```

**Nota:** El campo `receiptFile` se retorna en base64 (sin prefijo).

**Errores:**
- `401`: No autorizado

---

### 🔍 Obtener Detalle de Mi Recarga
**GET** `/recharges/my-recharges/:id`

Retorna el detalle completo de una recarga específica del distribuidor.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros URL:**
- `id` (string): ID de la recarga

**Respuesta Exitosa (200):**
```json
{
  "id": "recharge123",
  "distributorId": "clxxx123abc",
  "method": "TRANSFER",
  "requestedAmount": 10000,
  "creditedAmount": 10000,
  "commission": 0,
  "status": "APPROVED",
  "paymentReference": "TRANS-12345",
  "transferDate": "2025-12-15T10:00:00.000Z",
  "receiptFile": "iVBORw0KGgoAAAANSUhEUgAA...",
  "adminNote": "Aprobado - Pago verificado",
  "createdAt": "2025-12-15T10:00:00.000Z",
  "updatedAt": "2025-12-15T11:00:00.000Z",
  "accountMovements": [
    {
      "id": "mov123",
      "type": "INCOME",
      "amount": 10000,
      "detail": "Recarga aprobada - TRANSFER",
      "balanceAfter": 10000,
      "createdAt": "2025-12-15T11:00:00.000Z"
    }
  ],
  "distributor": {
    "id": "clxxx123abc",
    "firstName": "Luis",
    "lastName": "González",
    "email": "distribuidor@example.com",
    "balance": 50000
  }
}
```

**Errores:**
- `401`: No autorizado
- `404`: Recarga no encontrada

---

### 💰 Obtener Mis Movimientos de Cuenta
**GET** `/recharges/my-account-movements`

Retorna todos los movimientos de cuenta del distribuidor (ingresos, egresos, ajustes) con paginación.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros Query:**
- `page` (number, opcional): Número de página (default: 1)
- `limit` (number, opcional): Cantidad de elementos por página (default: 10)

**Ejemplo Request:**
```
GET /recharges/my-account-movements?page=1&limit=10
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "mov123",
      "distributorId": "clxxx123abc",
      "type": "INCOME",
      "detail": "Recarga aprobada - TRANSFER",
      "amount": 10000,
      "balanceAfter": 10000,
      "note": "Aprobado por admin",
      "createdAt": "2025-12-15T11:00:00.000Z",
      "recharge": {
        "id": "recharge123",
        "method": "TRANSFER",
        "requestedAmount": 10000,
        "creditedAmount": 10000,
        "status": "APPROVED"
      }
    },
    {
      "id": "mov124",
      "distributorId": "clxxx123abc",
      "type": "EXPENSE",
      "detail": "Venta de recarga",
      "amount": -1500,
      "balanceAfter": 8500,
      "createdAt": "2025-12-16T09:00:00.000Z",
      "recharge": null
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

**Tipos de movimiento:**
- `INCOME`: Ingreso (recargas aprobadas)
- `EXPENSE`: Egreso (ventas, deducciones)
- `ADJUSTMENT`: Ajuste manual

**Errores:**
- `401`: No autorizado

---

### 📋 [ADMIN] Obtener Todas las Recargas
**GET** `/recharges/admin/all`

Retorna todas las recargas del sistema con paginación y filtro opcional por estado.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Params:**
- `status` (opcional): PENDING | APPROVED | REJECTED | FAILED
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Cantidad de elementos por página (default: 10)

**Ejemplo:** `/recharges/admin/all?status=PENDING&page=1&limit=10`

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "recharge123",
      "distributorId": "clxxx123abc",
      "method": "TRANSFER",
      "requestedAmount": 10000,
      "creditedAmount": 10000,
      "commission": 0,
      "status": "APPROVED",
      "paymentReference": "TRANS-12345",
      "receiptFile": "iVBORw0KGgoAAAANSUhEUgAA...",
      "adminNote": "Aprobado",
      "createdAt": "2025-12-15T10:00:00.000Z",
      "distributor": {
        "id": "clxxx123abc",
        "firstName": "Luis",
        "lastName": "González",
        "socialReason": "Distribuidora González S.A.",
        "email": "distribuidor@example.com",
        "identification": "0123456789",
        "balance": 50000
      },
      "accountMovements": []
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 10,
    "totalPages": 15
  }
}
```

**Errores:**
- `401`: No autorizado
- `403`: Requiere rol de administrador

---

### ⏳ [ADMIN] Obtener Recargas Pendientes
**GET** `/recharges/admin/pending`

Retorna solo las recargas en estado PENDING con paginación.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Params:**
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Cantidad de elementos por página (default: 10)

**Ejemplo:** `/recharges/admin/pending?page=1&limit=10`

**Respuesta:** Igual estructura que el endpoint anterior con paginación, pero filtrado por `status=PENDING`

**Errores:**
- `401`: No autorizado
- `403`: Requiere rol de administrador

---

### 🔍 [ADMIN] Obtener Detalle de Recarga
**GET** `/recharges/admin/:id`

Retorna el detalle completo de cualquier recarga del sistema.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros URL:**
- `id` (string): ID de la recarga

**Respuesta Exitosa (200):**
```json
{
  "id": "recharge123",
  "distributorId": "clxxx123abc",
  "method": "TRANSFER",
  "requestedAmount": 10000,
  "creditedAmount": 10000,
  "commission": 0,
  "status": "APPROVED",
  "paymentReference": "TRANS-12345",
  "transferDate": "2025-12-15T10:00:00.000Z",
  "receiptFile": "iVBORw0KGgoAAAANSUhEUgAA...",
  "adminId": "admin456",
  "adminNote": "Pago verificado correctamente",
  "createdAt": "2025-12-15T10:00:00.000Z",
  "updatedAt": "2025-12-15T11:00:00.000Z",
  "distributor": {
    "id": "clxxx123abc",
    "firstName": "Luis",
    "lastName": "González",
    "socialReason": "Distribuidora González S.A.",
    "email": "distribuidor@example.com",
    "identification": "0123456789",
    "balance": 50000
  },
  "accountMovements": [
    {
      "id": "mov123",
      "type": "INCOME",
      "amount": 10000,
      "detail": "Recarga aprobada - TRANSFER",
      "balanceAfter": 10000,
      "adminId": "admin456"
    }
  ]
}
```

**Errores:**
- `401`: No autorizado
- `403`: Requiere rol de administrador
- `404`: Recarga no encontrada

---

### ✅ [ADMIN] Aprobar o Rechazar Recarga
**PATCH** `/recharges/admin/:id/review`

Permite al admin aprobar o rechazar una recarga pendiente.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Parámetros URL:**
- `id` (string): ID de la recarga

**Body:**
```json
{
  "status": "APPROVED",
  "adminNote": "Pago verificado correctamente"
}
```

**Campos:**
- `status` (string, requerido): "APPROVED" o "REJECTED"
- `adminNote` (string, opcional): Nota del administrador

**Respuesta Exitosa (200):**
```json
{
  "id": "recharge123",
  "distributorId": "clxxx123abc",
  "method": "TRANSFER",
  "requestedAmount": 10000,
  "creditedAmount": 10000,
  "commission": 0,
  "status": "APPROVED",
  "adminId": "admin456",
  "adminNote": "Pago verificado correctamente",
  "updatedAt": "2025-12-16T10:00:00.000Z",
  "distributor": {
    "id": "clxxx123abc",
    "firstName": "Luis",
    "lastName": "González",
    "email": "distribuidor@example.com",
    "balance": 60000
  },
  "accountMovements": [
    {
      "id": "mov123",
      "type": "INCOME",
      "detail": "Recarga aprobada - TRANSFER",
      "amount": 10000,
      "balanceAfter": 60000,
      "adminId": "admin456",
      "note": "Pago verificado correctamente"
    }
  ]
}
```

**Errores:**
- `400`: Recarga ya fue procesada o datos inválidos
- `401`: No autorizado
- `403`: Requiere rol de administrador
- `404`: Recarga no encontrada

---

### ➕ [ADMIN] Asignar Recarga Manual
**POST** `/recharges/admin/manual`

Permite al admin asignar una recarga manual a un distribuidor. Se acredita inmediatamente.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "distributorId": "clxxx123abc",
  "amount": 5000,
  "note": "Recarga de cortesía por promoción"
}
```

**Campos:**
- `distributorId` (string, requerido): ID del distribuidor
- `amount` (number, requerido): Monto en centavos (mínimo 1)
- `note` (string, opcional): Nota explicativa

**Respuesta Exitosa (201):**
```json
{
  "id": "recharge789",
  "distributorId": "clxxx123abc",
  "method": "TRANSFER",
  "requestedAmount": 5000,
  "creditedAmount": 5000,
  "commission": 0,
  "status": "APPROVED",
  "adminId": "admin456",
  "adminNote": "Recarga de cortesía por promoción",
  "createdAt": "2025-12-16T10:00:00.000Z",
  "distributor": {
    "id": "clxxx123abc",
    "firstName": "Luis",
    "lastName": "González",
    "email": "distribuidor@example.com",
    "balance": 55000
  },
  "accountMovements": [
    {
      "id": "mov125",
      "type": "INCOME",
      "detail": "Recarga manual por administrador",
      "amount": 5000,
      "balanceAfter": 55000,
      "adminId": "admin456",
      "note": "Recarga de cortesía por promoción"
    }
  ]
}
```

**Errores:**
- `401`: No autorizado
- `403`: Requiere rol de administrador
- `404`: Distribuidor no encontrado

---

### 💰 [ADMIN] Ver Movimientos de Cuenta de Distribuidor
**GET** `/recharges/admin/distributor/:distributorId/movements`

Retorna todos los movimientos de cuenta de un distribuidor específico con paginación.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros URL:**
- `distributorId` (string): ID del distribuidor

**Parámetros Query:**
- `page` (number, opcional): Número de página (default: 1)
- `limit` (number, opcional): Cantidad de elementos por página (default: 10)

**Ejemplo Request:**
```
GET /recharges/admin/distributor/clxxx123abc/movements?page=1&limit=10
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "mov123",
      "distributorId": "clxxx123abc",
      "type": "INCOME",
      "detail": "Recarga aprobada - TRANSFER",
      "amount": 10000,
      "balanceAfter": 10000,
      "adminId": "admin456",
      "note": "Aprobado",
      "createdAt": "2025-12-15T11:00:00.000Z",
      "recharge": {
        "id": "recharge123",
        "method": "TRANSFER",
        "requestedAmount": 10000,
        "creditedAmount": 10000,
        "status": "APPROVED"
      }
    }
  ],
  "pagination": {
    "total": 87,
    "page": 1,
    "limit": 10,
    "totalPages": 9
  }
}
```

**Errores:**
- `401`: No autorizado
- `403`: Requiere rol de administrador
- `404`: Distribuidor no encontrado

---

## Notas Generales

### Autenticación
Todos los endpoints (excepto los marcados como públicos) requieren autenticación mediante JWT Bearer Token:

```
Authorization: Bearer {token}
```

El token se obtiene del endpoint `/auth/login` y tiene una validez definida en `JWT_EXPIRES_IN`.

### Formato de Montos
- Todos los montos se manejan en **centavos** para evitar problemas con decimales
- Ejemplos:
  - $1.00 = 100 centavos
  - $10.50 = 1050 centavos
  - $100.00 = 10000 centavos

### Archivos en Base64
- Al **enviar** archivos (vouchers): se acepta base64 con o sin prefijo `data:image/jpeg;base64,`
- Al **recibir** archivos: se retorna base64 puro (sin prefijo)
- Los archivos se almacenan en Wasabi S3 (bucket: `vouchers-nexuss`)

### Estados de Recarga
- `PENDING`: Recarga creada, esperando aprobación/confirmación
- `APPROVED`: Recarga aprobada y saldo acreditado
- `REJECTED`: Recarga rechazada por el admin
- `FAILED`: Error en el procesamiento

### Roles
- `ADMIN`: Administrador con acceso completo
- `DISTRIBUTOR`: Distribuidor con acceso limitado a sus propios datos

### Rate Limiting
- Login: 5 intentos por minuto
- Registro: 10 intentos por minuto
- Otros endpoints: 10 requests por minuto (configuración global)

### Documentación Adicional
- [Integración Payphone Frontend](PAYPHONE_FRONTEND.md)
- [Flujo de Recargas](RECARGAS.md)

---

## Publicidad

### 📢 Crear Publicidad (ADMIN)
**POST** `/advertisements`

Permite al administrador subir una nueva publicidad con imagen.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEA...",
  "isActive": true,
}
```

**Campos:**
- `image` (string, requerido): Imagen en formato base64 (jpg, png, gif, etc.)
- `isActive` (boolean, opcional): Si la publicidad está activa (default: true)

**Respuesta Exitosa (201):**
```json
{
  "success": true,
  "message": "Publicidad creada exitosamente",
  "advertisement": {
    "id": "clxxx123abc",
    "imageUrl": "/uploads/ads/ad_1702894567890_abc123.jpeg",
    "isActive": true,
    "createdBy": "admin123",
    "createdAt": "2025-12-18T12:00:00.000Z",
    "updatedAt": "2025-12-18T12:00:00.000Z"
  }
}
```

**Errores:**
- `400`: Imagen requerida o formato inválido
- `401`: Token no válido o expirado
- `403`: No tiene permisos de ADMIN

---

### 📋 Listar Todas las Publicidades (ADMIN)
**GET** `/advertisements`

Obtiene todas las publicidades del sistema (activas e inactivas).

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "count": 3,
  "advertisements": [
    {
      "id": "clxxx123abc",
      "imageUrl": "/uploads/ads/ad_1702894567890_abc123.jpeg",
      "isActive": true,
      "createdBy": "admin123",
      "createdAt": "2025-12-18T12:00:00.000Z",
      "updatedAt": "2025-12-18T12:00:00.000Z"
    },
    {
      "id": "clxxx456def",
      "imageUrl": "/uploads/ads/ad_1702894567891_def456.png",
      "isActive": false,
      "createdBy": "admin123",
      "createdAt": "2025-12-17T10:00:00.000Z",
      "updatedAt": "2025-12-17T10:00:00.000Z"
    }
  ]
}
```

---

### ✅ Listar Publicidades Activas
**GET** `/advertisements/active`

Obtiene solo las publicidades activas ordenadas por orden y fecha de creación.

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "count": 2,
  "advertisements": [
    {
      "id": "clxxx123abc",
      "imageUrl": "/uploads/ads/ad_1702894567890_abc123.jpeg",
    },
    {
      "id": "clxxx789ghi",
      "imageUrl": "/uploads/ads/ad_1702894567892_ghi789.jpeg",
    }
  ]
}
```

**Nota:** Este endpoint es accesible tanto para administradores como para distribuidores. Las publicidades activas también se incluyen automáticamente en el endpoint `/distributors/profile/dashboard`.

---

### 🔍 Obtener una Publicidad (ADMIN)
**GET** `/advertisements/:id`

Obtiene los detalles de una publicidad específica.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**
- `id` (string): ID de la publicidad

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "advertisement": {
    "id": "clxxx123abc",
    "imageUrl": "/uploads/ads/ad_1702894567890_abc123.jpeg",
    "isActive": true,
    "createdBy": "admin123",
    "createdAt": "2025-12-18T12:00:00.000Z",
    "updatedAt": "2025-12-18T12:00:00.000Z"
  }
}
```

**Errores:**
- `404`: Publicidad no encontrada

---

### ✏️ Actualizar Publicidad (ADMIN)
**PATCH** `/advertisements/:id`

Actualiza una publicidad existente.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Parámetros de URL:**
- `id` (string): ID de la publicidad

**Body:**
```json
{
  "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...",
  "isActive": false,
}
```

**Campos (todos opcionales):**
- `image` (string): Nueva imagen en base64 (si se proporciona, reemplaza la anterior)
- `isActive` (boolean): Cambiar estado activo/inactivo

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Publicidad actualizada exitosamente",
  "advertisement": {
    "id": "clxxx123abc",
    "imageUrl": "/uploads/ads/ad_1702894667890_xyz789.png",
    "isActive": false,
    "createdBy": "admin123",
    "createdAt": "2025-12-18T12:00:00.000Z",
    "updatedAt": "2025-12-18T12:30:00.000Z"
  }
}
```

**Errores:**
- `404`: Publicidad no encontrada

---

### 🗑️ Eliminar Publicidad (ADMIN)
**DELETE** `/advertisements/:id`

Elimina una publicidad y su imagen del sistema.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**
- `id` (string): ID de la publicidad

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Publicidad eliminada exitosamente"
}
```

**Errores:**
- `404`: Publicidad no encontrada

---

### 📌 Notas sobre Publicidad
- Las imágenes se guardan en el servidor en la carpeta `/uploads/ads/`
- Las imágenes se sirven como archivos estáticos en la ruta `/uploads/ads/{filename}`
- Al actualizar una publicidad con nueva imagen, la imagen anterior se elimina automáticamente
- Al eliminar una publicidad, también se elimina su imagen del servidor
- Las publicidades activas aparecen automáticamente en el dashboard del distribuidor
- Formatos de imagen soportados: JPG, PNG, GIF, WEBP

