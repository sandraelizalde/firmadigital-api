# Documentación de Endpoints - API Distribuidores Nexus

## Índice
- [Autenticación](#autenticación)
- [Distribuidores](#distribuidores)
- [Planes](#planes)
- [Recargas](#recargas)

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

Crea una recarga PENDING y retorna datos para configurar la cajita de Payphone.

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
- `requestedAmount` (number, requerido): Monto en centavos (mínimo 100)
- `reference` (string, opcional): Motivo del pago

**Respuesta Exitosa (201):**
```json
{
  "rechargeId": "recharge456",
  "amount": 10000,
  "clientTransactionId": "recharge456",
  "payphone": {
    "token": "uk73jInqfLLWEoypWu2MXAnTxWrQ2yphHS9C0oAV...",
    "storeId": "828efefe-57c8-4f75-8852-fdcca3dd9ca5",
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

**Errores:**
- `400`: Datos inválidos o distribuidor inactivo
- `401`: No autorizado

**Nota:** Los datos de `payphone` se usan en el frontend para configurar la cajita de pagos. Ver [PAYPHONE_FRONTEND.md](PAYPHONE_FRONTEND.md)

---

### ✅ Confirmar Recarga con Tarjeta
**POST** `/recharges/confirm-card-recharge`

Confirma el estado de una recarga con tarjeta consultando Payphone API.

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
    "creditedAmount": 9700,
    "commission": 300,
    "status": "APPROVED",
    "paymentReference": "Payphone: 23178284",
    "createdAt": "2025-12-16T10:00:00.000Z",
    "distributor": {
      "id": "clxxx123abc",
      "firstName": "Luis",
      "lastName": "González",
      "email": "distribuidor@example.com",
      "balance": 59700
    },
    "accountMovements": [
      {
        "id": "mov123",
        "type": "INCOME",
        "detail": "Recarga con tarjeta aprobada - Payphone",
        "amount": 9700,
        "balanceAfter": 59700,
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

**Errores:**
- `400`: Recarga ya procesada o error en la confirmación
- `401`: No autorizado
- `404`: Recarga no encontrada

**⚠️ IMPORTANTE:** Este endpoint debe llamarse dentro de los **5 minutos** posteriores al pago. Si no se confirma en ese tiempo, Payphone reversará automáticamente la transacción.

---

### 📜 Obtener Mis Recargas
**GET** `/recharges/my-recharges`

Retorna el historial de recargas del distribuidor autenticado.

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
[
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

Retorna todos los movimientos de cuenta del distribuidor (ingresos, egresos, ajustes).

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
[
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
    "type": "OUTCOME",
    "detail": "Venta de recarga",
    "amount": 1500,
    "balanceAfter": 8500,
    "createdAt": "2025-12-16T09:00:00.000Z",
    "recharge": null
  }
]
```

**Tipos de movimiento:**
- `INCOME`: Ingreso (recargas aprobadas)
- `OUTCOME`: Egreso (ventas, deducciones)
- `ADJUSTMENT`: Ajuste manual

**Errores:**
- `401`: No autorizado

---

### 📋 [ADMIN] Obtener Todas las Recargas
**GET** `/recharges/admin/all`

Retorna todas las recargas del sistema con filtro opcional por estado.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Params:**
- `status` (opcional): PENDING | APPROVED | REJECTED | FAILED

**Ejemplo:** `/recharges/admin/all?status=PENDING`

**Respuesta Exitosa (200):**
```json
[
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
]
```

**Errores:**
- `401`: No autorizado
- `403`: Requiere rol de administrador

---

### ⏳ [ADMIN] Obtener Recargas Pendientes
**GET** `/recharges/admin/pending`

Retorna solo las recargas en estado PENDING.

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta:** Igual que el endpoint anterior, pero filtrado por `status=PENDING`

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

Retorna todos los movimientos de cuenta de un distribuidor específico.

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
]
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
