# Documentación de Endpoints - API Distribuidores Nexus

## Índice
- [Autenticación](#autenticación)
- [Distribuidores](#distribuidores)
- [Planes](#planes)
- [Recargas](#recargas)
- [Publicidad](#publicidad)
- [Firmas Digitales](#firmas-digitales)
- [Consultas (Cédulas y RUC)](#consultas-cédulas-y-ruc)

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

Obtiene la lista paginada de distribuidores activos con su información de facturación y planes asignados.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `page` (number, opcional): Número de página (default: 1, mínimo: 1)
- `limit` (number, opcional): Cantidad de resultados por página (default: 10, mínimo: 1, máximo: 100)

**Ejemplo de Request:**
```
GET /distributors?page=1&limit=10
```

**Respuesta Exitosa (200):**
```json
{
  "data": [
    {
      "id": "cm5abcd1234567890",
      "firstName": "Luis",
      "lastName": "González",
      "socialReason": "Distribuidora González S.A.",
      "identification": "0123456789",
      "email": "distribuidor@example.com",
      "phone": "0987654321",
      "address": "Av. Principal 123",
      "balance": 5000000,
      "active": true,
      "role": "DISTRIBUTOR",
      "createdAt": "2025-12-01T10:00:00.000Z",
      "updatedAt": "2025-12-29T15:30:00.000Z",
      "billingInfo": {
        "id": "billing123",
        "useDistributorData": true,
        "socialReason": null,
        "identificationType": null,
        "identification": null,
        "email": null,
        "phone": null,
        "address": null
      },
      "planPrices": [
        {
          "id": "pp123",
          "customPrice": 4500,
          "customPricePromo": 3500,
          "isActive": true,
          "plan": {
            "id": "plan1",
            "perfil": "PN-TOKEN-2A",
            "name": "Firma Persona Natural Token 2 años",
            "description": "Token de firma electrónica por 2 años",
            "basePrice": 5000,
            "basePricePromo": 4000,
            "isPromo": true,
            "duration": "2",
            "durationType": "YS",
            "isActive": true
          }
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

**Campos de respuesta:**
- `data`: Array de distribuidores
  - `id`: ID único del distribuidor
  - `firstName`: Nombre del distribuidor
  - `lastName`: Apellido del distribuidor
  - `socialReason`: Razón social (null si es persona natural)
  - `identification`: Cédula o RUC
  - `email`: Correo electrónico
  - `phone`: Teléfono de contacto
  - `address`: Dirección física
  - `balance`: Saldo disponible en centavos (5000000 = $50,000.00)
  - `active`: Estado del distribuidor
  - `role`: Rol del usuario (ADMIN, DISTRIBUTOR)
  - `createdAt`: Fecha de creación
  - `updatedAt`: Fecha de última actualización
  - `billingInfo`: Información de facturación configurada
  - `planPrices`: Planes asignados con precios personalizados
- `pagination`: Información de paginación
  - `page`: Página actual
  - `limit`: Resultados por página
  - `total`: Total de distribuidores
  - `totalPages`: Total de páginas
  - `hasNextPage`: Si hay página siguiente
  - `hasPrevPage`: Si hay página anterior

**Errores:**
- `401`: No autorizado
- `403`: Requiere rol ADMIN

---

### 🔍 Obtener Distribuidor por ID
**GET** `/distributors/:distributorId`

Obtiene información detallada de un distribuidor específico, incluyendo su contrato en Base64 si ha sido subido.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros URL:**
- `distributorId` (string): ID del distribuidor

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "distributor": {
    "id": "cm5abcd1234567890",
    "firstName": "Luis",
    "lastName": "González",
    "socialReason": "Distribuidora González S.A.",
    "identificationType": "RUC",
    "identification": "0123456789001",
    "password": "encrypted_password_hash",
    "email": "distribuidor@example.com",
    "address": "Av. Principal 123",
    "phone": "0987654321",
    "createdBy": "admin123",
    "createdByName": "Admin User",
    "active": true,
    "balance": 5000000,
    "contractSignedUrl": "contratos-distribuidores/1735567890123.pdf",
    "createdAt": "2025-12-01T10:00:00.000Z",
    "updatedAt": "2025-12-29T15:30:00.000Z",
    "contractBase64": "JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwo...",
    "billingInfo": {
      "id": "billing123",
      "useDistributorData": false,
      "socialReason": "Mi Empresa S.A.",
      "identificationType": "RUC",
      "identification": "1234567890001",
      "email": "facturacion@empresa.com",
      "phone": "0999888777",
      "address": "Calle Comercial 456"
    },
    "planPrices": [
      {
        "id": "pp123",
        "customPrice": 4500,
        "customPricePromo": 3500,
        "isActive": true,
        "plan": {
          "id": "plan1",
          "perfil": "PN-TOKEN-2A",
          "name": "Firma Persona Natural Token 2 años",
          "basePrice": 5000,
          "isActive": true
        }
      }
    ]
  }
}
```

**Campos de respuesta:**
- `success`: Indica si la operación fue exitosa
- `distributor`: Objeto con toda la información del distribuidor
  - `contractBase64`: Contrato en formato Base64 (null si no ha sido subido)
  - `contractSignedUrl`: Key del archivo en S3 (null si no ha sido subido)
  - `balance`: Saldo en centavos (5000000 = $50,000.00)
  - `billingInfo`: Información de facturación (null si no ha sido configurada)
  - `planPrices`: Planes asignados con precios personalizados

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
  "success": true,
  "message": "Información de facturación creada exitosamente",
  "billingInfo": {
    "id": "billing123",
    "distributorId": "dist123",
    "useDistributorData": false,
    "socialReason": "Mi Empresa S.A.",
    "identificationType": "RUC",
    "identification": "1234567890001",
    "email": "facturacion@empresa.com",
    "phone": "0999888777",
    "address": "Calle Comercial 456"
  }
}
```

**Errores:**
- `404`: Distribuidor no encontrado
- `409`: El distribuidor ya tiene información de facturación

---

### 📄 Subir Contrato de Distribuidor (ADMIN)
**POST** `/distributors/:distributorId/contract`

Permite al administrador subir el contrato firmado de un distribuidor en formato PDF (Base64). El archivo se guarda en Wasabi S3 en el bucket "contratos-distribuidores" y solo la key del archivo se almacena en la base de datos.

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
  "contractBase64": "JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwo..."
}
```

**Campos del Body:**
- `contractBase64` (string, requerido): Contrato en formato Base64. Puede incluir o no el prefijo `data:application/pdf;base64,`

**Respuesta Exitosa (201):**
```json
{
  "success": true,
  "message": "Contrato subido exitosamente",
  "contractKey": "contratos-distribuidores/1735567890123.pdf"
}
```

**Campos de respuesta:**
- `success`: Indica si la operación fue exitosa
- `message`: Mensaje descriptivo
- `contractKey`: Key del archivo guardado en S3 (se almacena en el campo `contractSignedUrl` del distribuidor)

**Almacenamiento:**
- **Bucket S3**: `contratos-distribuidores`
- **Formato de key**: `contratos-distribuidores/{timestamp}.pdf`
- **Base de datos**: Solo se guarda la key en el campo `contractSignedUrl` de la tabla Distributor

**Recuperación:**
Cuando se consulta un distribuidor por ID (GET `/distributors/:distributorId`), el sistema:
1. Lee la key desde `contractSignedUrl`
2. Descarga el archivo desde S3 usando la key
3. Convierte el contenido a Base64
4. Lo devuelve en el campo `contractBase64` de la respuesta

**Errores:**
- `401`: No autorizado
- `403`: Requiere rol ADMIN
- `404`: Distribuidor no encontrado

---
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

Asigna múltiples planes a un distribuidor con precios personalizados. **El administrador solo debe enviar los planes de Persona Jurídica (PJ-)**, el sistema automáticamente buscará y asignará los planes equivalentes de Persona Natural (PN-) con el mismo duration y durationType.

**Lógica de Asignación Automática:**
- Por cada plan PJ- enviado, el sistema busca su `duration` y `durationType`
- Busca el plan PN- que tenga exactamente el mismo `duration` y `durationType`
- Crea ambas asignaciones (PJ + PN) con el mismo precio personalizado

**Ejemplo de Emparejamiento:**
- PJ-019 (15 días) → PN-018 (15 días)
- PJ-017 (1 mes) → PN-001 (1 mes)
- PJ-003 (1 año) → PN-002 (1 año)
- PJ-006 (2 años) → PN-005 (2 años)
- PJ-009 (3 años) → PN-010 (3 años)
- PJ-008 (4 años) → PN-007 (4 años)
- PJ-013 (5 años) → PN-013 (5 años)

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "distributorId": "cm5abcd1234567890",
  "plans": [
    {
      "planId": "pj-plan-id-2years",
      "customPrice": 219900,
      "customPricePromo": 199900
    },
    {
      "planId": "pj-plan-id-3years",
      "customPrice": 299900
    }
  ]
}
```

**Campos:**
- `distributorId` (string, requerido): ID del distribuidor
- `plans` (array, requerido): Lista de planes **de Persona Jurídica (PJ-)** a asignar
  - `planId` (string, requerido): ID del plan PJ-
  - `customPrice` (number, requerido): Precio personalizado en centavos para ambos planes (PJ y PN equivalente)
  - `customPricePromo` (number, opcional): Precio promocional personalizado en centavos

**Nota Importante:** Solo envíe planes de tipo Persona Jurídica (PJ-). El sistema rechazará la solicitud si incluye planes que no sean PJ-.

**Respuesta Exitosa (201):**
```json
{
  "success": true,
  "message": "4 planes asignados exitosamente al distribuidor (2 jurídicos + 2 naturales equivalentes)",
  "distributor": {
    "id": "cm5abcd1234567890",
    "firstName": "Luis",
    "lastName": "González",
    "socialReason": "Distribuidora González S.A.",
    "email": "distribuidor@example.com"
  },
  "assignments": [
    {
      "id": "dpp123",
      "distributorId": "cm5abcd1234567890",
      "planId": "pj-plan-id-2years",
      "customPrice": 219900,
      "customPricePromo": 199900,
      "isActive": true,
      "createdBy": "admin123",
      "createdByName": "Admin User",
      "createdAt": "2025-12-31T10:00:00.000Z",
      "plan": {
        "id": "pj-plan-id-2years",
        "perfil": "PJ-006",
        "duration": "2",
        "durationType": "YS",
        "basePrice": 219900,
        "eligibleClientsType": ["PERSONA_JURIDICA"],
        "isActive": true
      }
    },
    {
      "id": "dpp124",
      "distributorId": "cm5abcd1234567890",
      "planId": "pn-plan-id-2years",
      "customPrice": 219900,
      "customPricePromo": 199900,
      "isActive": true,
      "createdBy": "admin123",
      "createdByName": "Admin User",
      "createdAt": "2025-12-31T10:00:00.000Z",
      "plan": {
        "id": "pn-plan-id-2years",
        "perfil": "PN-005",
        "duration": "2",
        "durationType": "YS",
        "basePrice": 219900,
        "eligibleClientsType": ["PERSONA_NATURAL_SIN_RUC", "PERSONA_NATURAL_CON_RUC"],
        "isActive": true
      }
    },
    {
      "id": "dpp125",
      "distributorId": "cm5abcd1234567890",
      "planId": "pj-plan-id-3years",
      "customPrice": 299900,
      "isActive": true,
      "plan": {
        "perfil": "PJ-009",
        "duration": "3",
        "durationType": "YS"
      }
    },
    {
      "id": "dpp126",
      "distributorId": "cm5abcd1234567890",
      "planId": "pn-plan-id-3years",
      "customPrice": 299900,
      "isActive": true,
      "plan": {
        "perfil": "PN-010",
        "duration": "3",
        "durationType": "YS"
      }
    }
  ]
}
```

**Errores:**
- `400`: Algunos planes no existen o no son de tipo Persona Jurídica
- `401`: No autorizado
- `403`: Solo administradores pueden asignar planes
- `404`: Distribuidor no encontrado

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

---

## Firmas Digitales

### ✍️ Crear Solicitud de Firma Digital - Persona Natural (DISTRIBUTOR)
**POST** `/signatures/natural`

Permite a un distribuidor crear una solicitud de firma digital para persona natural. Los datos son enviados al proveedor ENEXT. El sistema valida el balance del distribuidor y cobra automáticamente solo si la solicitud es exitosa (código 1 del proveedor).

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "nombres": "LUIS XAVIER",
  "apellidos": "GONZALEZ JIMENEZ",
  "cedula": "1752549467",
  "codigo_dactilar": "V43I4444",
  "correo": "luisg@solucionesnexus.com",
  "provincia": "PICHINCHA",
  "ciudad": "QUITO",
  "parroquia": "IÑAQUITO",
  "direccion": "QUITUS COLONIAL",
  "celular": "0990602199",
  "clavefirma": "GONZALEZ1752",
  "foto_frontal": "iVBORw0KGgoAAAANSUhEUgAA...",
  "foto_posterior": "iVBORw0KGgoAAAANSUhEUgAA...",
  "perfil_firma": "018",
  "dateOfBirth": "1990-05-15",
  "ruc": "1752549467001"
}
```

**Campos:**
- `nombres` (string, requerido): Nombres del solicitante
- `apellidos` (string, requerido): Apellidos del solicitante
- `cedula` (string, requerido): Número de cédula (10 dígitos)
- `codigo_dactilar` (string, requerido): Código dactilar de la cédula
- `correo` (string, requerido): Correo electrónico del solicitante
- `provincia` (string, requerido): Provincia de residencia
- `ciudad` (string, requerido): Ciudad de residencia
- `parroquia` (string, requerido): Parroquia de residencia
- `direccion` (string, requerido): Dirección completa
- `celular` (string, requerido): Número de celular (10 dígitos)
- `clavefirma` (string, requerido): Clave para la firma digital
- `foto_frontal` (string, requerido): Imagen de cédula frontal en formato Base64
- `foto_posterior` (string, requerido): Imagen de cédula posterior en formato Base64
- `perfil_firma` (string, requerido): Código del plan de firma (3 dígitos, ejemplo: "018")
- `dateOfBirth` (string, requerido): Fecha de nacimiento en formato ISO (YYYY-MM-DD)
- `ruc` (string, opcional): RUC si la persona natural lo tiene (13 dígitos)

**Respuesta Exitosa - Aprobada por el Proveedor (201):**
```json
{
  "success": true,
  "message": "Solicitud enviada correctamente",
  "data": {
    "id": "clx1234567890",
    "numero_tramite": "17034425678900001",
    "perfil_firma": "PN-001",
    "nombres": "LUIS XAVIER",
    "apellidos": "GONZALEZ JIMENEZ",
    "cedula": "1752549467",
    "status": "COMPLETED",
    "providerCode": "1",
    "providerMessage": "Solicitud enviada correctamente"
  },
  "balance": 450000,
  "priceCharged": 79900
}
```

**Respuesta - Rechazada por el Proveedor (201):**
```json
{
  "success": false,
  "message": "El código dactilar no corresponde a la cédula ingresada",
  "data": {
    "id": "clx1234567890",
    "numero_tramite": "17034425678900002",
    "status": "REJECTED",
    "providerCode": "0"
  },
  "balance": 450000,
  "priceCharged": 0
}
```

**Notas importantes:**
- Si el proveedor retorna código `1`: se marca como `COMPLETED` y se cobra el monto del plan
- Si el proveedor retorna código `0`: se marca como `REJECTED` y NO se cobra
- Si hay cualquier otro código: se marca como `FAILED` y NO se cobra
- El balance se muestra en centavos (450000 = $4500.00)
- El registro siempre se guarda en la BD independiente del resultado

**Errores:**
- `400`: Balance insuficiente, plan no asignado, distribuidor inactivo o datos inválidos
- `401`: No autorizado (token inválido o expirado)
- `403`: Acceso denegado (solo para distribuidores)

---

### ✍️ Crear Solicitud de Firma Digital - Persona Jurídica (DISTRIBUTOR)
**POST** `/signatures/juridica`

Permite a un distribuidor crear una solicitud de firma digital para empresa/persona jurídica. Requiere datos adicionales como RUC, razón social, representante legal y nombramiento. El sistema valida el balance y cobra automáticamente solo si la solicitud es exitosa.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "nombres": "LUIS XAVIER",
  "apellidos": "GONZALEZ JIMENEZ",
  "cedula": "1752549467",
  "codigo_dactilar": "V43I4444",
  "correo": "luisg@solucionesnexus.com",
  "provincia": "PICHINCHA",
  "ciudad": "QUITO",
  "parroquia": "IÑAQUITO",
  "direccion": "QUITUS COLONIAL",
  "celular": "0990602199",
  "clavefirma": "GONZALEZ1752",
  "foto_frontal": "iVBORw0KGgoAAAANSUhEUgAA...",
  "foto_posterior": "iVBORw0KGgoAAAANSUhEUgAA...",
  "perfil_firma": "017",
  "dateOfBirth": "1990-05-15",
  "ruc": "1752549467001",
  "razon_social": "DISTRIBUIDORA GONZALEZ S.A.",
  "rep_legal": "LUIS XAVIER GONZALEZ JIMENEZ",
  "cargo": "GERENTE GENERAL",
  "pdfSriBase64": "JVBERi0xLjQKJeLjz9MKMSAw...",
  "nombramientoBase64": "JVBERi0xLjQKJeLjz9MKMSAw..."
}
```

**Campos adicionales (además de los de persona natural):**
- `ruc` (string, requerido): RUC de la empresa (13 dígitos)
- `razon_social` (string, requerido): Razón social de la empresa
- `rep_legal` (string, requerido): Nombre completo del representante legal
- `cargo` (string, requerido): Cargo del representante legal
- `pdfSriBase64` (string, requerido): PDF del SRI en formato Base64
- `nombramientoBase64` (string, requerido): Documento de nombramiento en formato Base64
- `perfil_firma` (string, requerido): Código del plan de firma (3 dígitos, ejemplo: "017")
- `foto_frontal` (string, requerido): Imagen de cédula frontal en formato Base64
- `foto_posterior` (string, requerido): Imagen de cédula posterior en formato Base64

**Respuesta Exitosa - Aprobada por el Proveedor (201):**
```json
{
  "success": true,
  "message": "Solicitud enviada correctamente",
  "data": {
    "id": "clx1234567890",
    "numero_tramite": "17034425678900001",
    "perfil_firma": "PJ-003",
    "nombres": "LUIS XAVIER",
    "apellidos": "GONZALEZ JIMENEZ",
    "cedula": "1752549467",
    "ruc": "1752549467001",
    "razon_social": "DISTRIBUIDORA GONZALEZ S.A.",
    "rep_legal": "LUIS XAVIER GONZALEZ JIMENEZ",
    "cargo": "GERENTE GENERAL",
    "status": "COMPLETED",
    "providerCode": "1",
    "providerMessage": "Solicitud enviada correctamente"
  },
  "balance": 300000,
  "priceCharged": 149900
}
```

**Respuesta - Rechazada por el Proveedor (201):**
```json
{
  "success": false,
  "message": "El RUC no es válido",
  "data": {
    "id": "clx1234567890",
    "numero_tramite": "17034425678900002",
    "status": "REJECTED",
    "providerCode": "0"
  },
  "balance": 450000,
  "priceCharged": 0
}
```

**Notas importantes:**
- Misma lógica de cobro que persona natural (solo se cobra si código = 1)
- El RUC debe tener exactamente 13 dígitos
- Los campos del representante legal deben corresponder a quien firma el documento
- El nombramiento debe ser un documento válido y accesible

**Errores:**
- `400`: Balance insuficiente, plan no asignado, distribuidor inactivo o datos inválidos (RUC debe tener 13 dígitos)
- `401`: No autorizado (token inválido o expirado)
- `403`: Acceso denegado (solo para distribuidores)

---

### 📋 Obtener Mis Solicitudes de Firma con Paginación (DISTRIBUTOR)
**GET** `/signatures`

Retorna todas las solicitudes de firma digital creadas por el distribuidor autenticado con paginación. Las fotos y documentos se convierten automáticamente a Base64 desde Wasabi S3.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `page` (number, opcional): Número de página (default: 1, mínimo: 1)
- `limit` (number, opcional): Cantidad de resultados por página (default: 10, máximo: 100)

**Ejemplo de URL:**
```
GET /signatures/all/?page=1&limit=10
```

**Respuesta Exitosa (200):**
```json
{
  "data": [
    {
      "id": "clx1234567890",
      "numero_tramite": "DIST1703342567890001",
      "perfil_firma": "018",
      "nombres": "FERNANDO MATIAS",
      "apellidos": "TURIZO FERNANDEZ",
      "cedula": "1752549468",
      "correo": "fernando@example.com",
      "codigo_dactilar": "V43I4444",
      "celular": "0990602199",
      "provincia": "PICHINCHA",
      "ciudad": "QUITO",
      "parroquia": "IÑAQUITO",
      "direccion": "QUITUS COLONIAL",
      "dateOfBirth": "1990-05-15T00:00:00.000Z",
      "razon_social": null,
      "rep_legal": null,
      "cargo": null,
      "pais": "ECUADOR",
      "clavefirma": "TURIZO1752",
      "ruc": null,
      "tipo_envio": "1",
      "status": "PENDING",
      "providerCode": "200",
      "providerMessage": "Solicitud recibida",
      "activeNotification": true,
      "createdAt": "2024-12-23T10:30:00.000Z",
      "updatedAt": "2024-12-23T10:30:00.000Z"
    },
    {
      "id": "clx9876543210",
      "numero_tramite": "DIST1703342567890002",
      "perfil_firma": "017",
      "nombres": "MARIA JOSE",
      "apellidos": "PEREZ LOPEZ",
      "cedula": "0987654321",
      "correo": "maria@example.com",
      "codigo_dactilar": "V45J5555",
      "celular": "0987654321",
      "provincia": "GUAYAS",
      "ciudad": "GUAYAQUIL",
      "parroquia": "URDESA",
      "direccion": "AV. PRINCIPAL 123",
      "dateOfBirth": "1985-08-20T00:00:00.000Z",
      "razon_social": "EMPRESA XYZ S.A.",
      "rep_legal": "MARIA JOSE PEREZ LOPEZ",
      "cargo": "GERENTE GENERAL",
      "pais": "ECUADOR",
      "clavefirma": "PEREZ0987",
      "ruc": "0987654321001",
      "tipo_envio": "1",
      "status": "COMPLETED",
      "providerCode": "1",
      "providerMessage": "Firma procesada exitosamente",
      "activeNotification": true,
      "createdAt": "2024-12-22T15:20:00.000Z",
      "updatedAt": "2024-12-22T16:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

**Campos devueltos:**
- `id`: ID único de la solicitud
- `numero_tramite`: Número de trámite generado automáticamente
- `perfil_firma`: Plan de firma utilizado (3 dígitos)
- `nombres`, `apellidos`, `cedula`: Datos del solicitante
- `correo`, `celular`: Datos de contacto
- `codigo_dactilar`: Código dactilar de la cédula
- `provincia`, `ciudad`, `parroquia`, `direccion`: Datos de ubicación
- `dateOfBirth`: Fecha de nacimiento
- `foto_frontal_base64`: Imagen frontal de la cédula en Base64
- `foto_posterior_base64`: Imagen posterior de la cédula en Base64
- `pdf_sri_base64`: PDF del SRI en Base64 (solo jurídicas)
- `nombramiento_base64`: Nombramiento en Base64 (solo jurídicas)
- `razon_social`, `rep_legal`, `cargo`: Datos de persona jurídica (null si es natural)
- `ruc`: RUC si aplica
- `pais`: País (siempre ECUADOR)
- `clavefirma`: Clave de la firma digital
- `tipo_envio`: Tipo de envío (siempre "1")
- `status`: Estado (PENDING, COMPLETED, REJECTED, FAILED)
- `providerCode`, `providerMessage`: Código y mensaje del proveedor
- `activeNotification`: Notificación activa
- `createdAt`, `updatedAt`: Fechas de creación y actualización

**Paginación:**
- `page`: Página actual
- `limit`: Cantidad de resultados por página
- `total`: Total de registros
- `totalPages`: Total de páginas
- `hasNextPage`: Si hay página siguiente
- `hasPrevPage`: Si hay página anterior

**Notas importantes:**
- Las imágenes y PDFs se obtienen automáticamente desde Wasabi S3
- Si hay error al obtener alguna imagen, se devuelve `null` en lugar del Base64
- Los campos `pdf_sri_base64` y `nombramiento_base64` solo tendrán valor para personas jurídicas
- La respuesta incluye TODOS los detalles, no solo un resumen

**Errores:**
- `401`: No autorizado (token inválido o expirado)
- `403`: Acceso denegado (solo para distribuidores)

---

### 🔍 Obtener Detalle Completo de Solicitud de Firma (DISTRIBUTOR)
**GET** `/signatures/:id`

Retorna los detalles completos de una solicitud de firma específica del distribuidor autenticado, incluyendo todas las fotos y documentos convertidos a Base64 desde Wasabi S3.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**
- `id` (string): ID de la solicitud de firma

**Ejemplo:**
```
GET /signatures/clx1234567890
```

**Respuesta Exitosa (200):**
```json
{
  "id": "clx1234567890",
  "numero_tramite": "DIST1703342567890001",
  "perfil_firma": "018",
  "nombres": "FERNANDO MATIAS",
  "apellidos": "TURIZO FERNANDEZ",
  "cedula": "1752549468",
  "correo": "luisg@solucionesnexus.com",
  "codigo_dactilar": "V43I4444",
  "celular": "0990602199",
  "provincia": "PICHINCHA",
  "ciudad": "QUITO",
  "parroquia": "IÑAQUITO",
  "direccion": "QUITUS COLONIAL",
  "dateOfBirth": "1990-05-15T00:00:00.000Z",
  "foto_frontal_base64": "/9j/4AAQSkZJRgABAQAAAQABAAD...",
  "foto_posterior_base64": "/9j/4AAQSkZJRgABAQAAAQABAAD...",
  "video_face": null,
  "pdf_sri_base64": null,
  "nombramiento_base64": null,
  "razon_social": null,
  "rep_legal": null,
  "cargo": null,
  "pais": "ECUADOR",
  "clavefirma": "GONZALEZ1752",
  "ruc": null,
  "tipo_envio": "1",
  "status": "PENDING",
  "providerCode": "200",
  "providerMessage": "Solicitud recibida",
  "activeNotification": true,
  "createdAt": "2024-12-23T10:30:00.000Z",
  "updatedAt": "2024-12-23T10:30:00.000Z"
}
```

**Ejemplo - Persona Jurídica:**
```json
{
  "id": "clx9876543210",
  "numero_tramite": "DIST1703342567890005",
  "perfil_firma": "017",
  "nombres": "MARIA JOSE",
  "apellidos": "PEREZ LOPEZ",
  "cedula": "0987654321",
  "correo": "maria@example.com",
  "codigo_dactilar": "V45J5555",
  "celular": "0987654321",
  "provincia": "GUAYAS",
  "ciudad": "GUAYAQUIL",
  "parroquia": "URDESA",
  "direccion": "AV. PRINCIPAL 123",
  "dateOfBirth": "1985-08-20T00:00:00.000Z",
  "foto_frontal_base64": "/9j/4AAQSkZJRgABAQAAAQABAAD...",
  "foto_posterior_base64": "/9j/4AAQSkZJRgABAQAAAQABAAD...",
  "video_face": null,
  "pdf_sri_base64": "JVBERi0xLjQKJeLjz9MKMSAw...",
  "nombramiento_base64": "JVBERi0xLjQKJeLjz9MKMSAw...",
  "razon_social": "DISTRIBUIDORA PEREZ S.A.",
  "rep_legal": "MARIA JOSE PEREZ LOPEZ",
  "cargo": "GERENTE GENERAL",
  "pais": "ECUADOR",
  "clavefirma": "PEREZ0987",
  "ruc": "0987654321001",
  "tipo_envio": "1",
  "status": "COMPLETED",
  "providerCode": "1",
  "providerMessage": "Solicitud enviada correctamente",
  "activeNotification": true,
  "createdAt": "2024-12-22T15:20:00.000Z",
  "updatedAt": "2024-12-22T16:00:00.000Z"
}
```

**Campos devueltos:** (Mismos que en el endpoint de listado con paginación)

**Notas importantes:**
- Este endpoint devuelve el detalle completo de UNA solicitud específica
- Las imágenes y PDFs se obtienen desde Wasabi S3 y se convierten a Base64
- Solo se puede acceder a solicitudes del distribuidor autenticado
- Si hay error al obtener las imágenes de S3, se retorna un error 400

**Errores:**
- `400`: Solicitud no encontrada, no pertenece al distribuidor o error al obtener imágenes de S3
- `401`: No autorizado (token inválido o expirado)
- `403`: Acceso denegado (solo para distribuidores)

---

### 📌 Notas sobre Firmas Digitales

**Tipos de firma:**
- **Persona Natural** (`/signatures/natural`): Para individuos que requieren firma digital personal
  - Planes identificados con prefijo `PN-` (ejemplo: PN-001, PN-002)
- **Persona Jurídica** (`/signatures/juridica`): Para empresas y organizaciones
  - Planes identificados con prefijo `PJ-` (ejemplo: PJ-001, PJ-003)
  - Requiere RUC (13 dígitos), razón social, representante legal y nombramiento

**Almacenamiento de archivos:**
- Las fotos frontales y posteriores de cédula se suben a Wasabi S3 bucket `vouchers-nexus`
- Los PDFs (SRI y nombramiento) también se suben al mismo bucket
- En la base de datos solo se guarda la **key** (ruta) del archivo, no el contenido
- Cuando se consulta una solicitud, los archivos se obtienen desde S3 y se convierten a Base64
- Estructura de keys en S3:
  - Fotos frontales: `signatures-frontal/{timestamp}.jpg`
  - Fotos posteriores: `signatures-posterior/{timestamp}.jpg`
  - PDF SRI: `signatures-pdf-sri/{timestamp}.pdf`
  - Nombramientos: `signatures-nombramiento/{timestamp}.pdf`

**Sistema de cobro:**
- El balance se valida ANTES de enviar la solicitud al proveedor
- Solo se cobra si el proveedor retorna código `1` (solicitud exitosa)
- Si el proveedor rechaza (código `0`) o falla, NO se cobra
- El registro siempre se guarda en la base de datos para auditoría
- Se crea un AccountMovement de tipo EXPENSE cuando se cobra

**Estados de solicitud:**
- `COMPLETED`: Proveedor aceptó y procesó la solicitud (código = 1)
- `REJECTED`: Proveedor rechazó la solicitud (código = 0)
- `FAILED`: Error en la comunicación o código desconocido del proveedor

**Proveedor ENEXT:**
- Autenticación: Basic Auth (credenciales diferentes para payload vs headers)
- Número de trámite: Generado automáticamente con timestamp
- Respuestas del proveedor:
  - `codigo: 1` = Solicitud exitosa y aceptada
  - `codigo: 0` = Solicitud rechazada (problemas con datos del cliente)
  - Otros códigos = Error de procesamiento

**Variables de entorno necesarias:**
```env
# URL del proveedor para personas naturales
SIGN_PROVIDER_BASE_URL_NATURAL=https://enext.online/factureroV2/apiFactu/PN3.php

# URL del proveedor para personas jurídicas
SIGN_PROVIDER_BASE_URL_JURIDICA=https://enext.online/factureroV2/apiFactu/PJ3.php

# Credenciales para el payload de la solicitud
SIGN_PROVIDER_USER=usuario_payload
SIGN_PROVIDER_PASSWORD=password_payload

# Credenciales para Basic Auth (headers)
SIGN_PROVIDER_AUTH_USERNAME=factu465
SIGN_PROVIDER_AUTH_PASSWORD=apifac

# URL de callback para el proveedor (usado en firmas jurídicas)
SIGN_PROVIDER_CALLBACK=https://yourdomain.com/callback
```

**Seguridad:**
- Solo distribuidores activos con rol DISTRIBUTOR pueden crear solicitudes
- El distribuidor debe tener el plan asignado antes de poder usarlo
- Se valida que el distribuidor tenga balance suficiente
- Cada distribuidor solo puede ver sus propias solicitudes

**Logs y auditoría:**
- Todas las solicitudes y respuestas del proveedor se registran
- Los movimientos de cuenta se registran con referencia al ID de la solicitud
- Se mantiene historial completo de todas las operaciones

**Formato de datos:**
- Balance y precios en centavos (100 centavos = $1.00)
- Fechas en formato ISO 8601
- Cédula: 10 dígitos
- RUC: 13 dígitos
- Celular: 10 dígitos
- País: "ECUADOR" por defecto
- Tipo de envío: "1" (configurado automáticamente por el sistema)
- **Imágenes y documentos**: Ahora se envían en formato Base64 en lugar de URLs
  - `foto_frontal`: Base64 de la imagen de cédula frontal
  - `foto_posterior`: Base64 de la imagen de cédula posterior
  - `pdfSriBase64`: Base64 del PDF del SRI (solo jurídica)
  - `nombramientoBase64`: Base64 del documento de nombramiento (solo jurídica)
- **Perfiles de firma**: Ahora usan formato de 3 dígitos (ejemplo: "017", "018") en lugar del formato anterior (PN-001, PJ-003)
- País: "ECUADOR" por defecto
- Tipo de envío: "1" = normal, "2" = express

**Recursos externos:**
- Las URLs de fotos, videos y documentos deben ser accesibles públicamente
- El proveedor necesita acceso directo a estos recursos para procesarlos

---

## Consultas (Cédulas y RUC)

Los endpoints de consultas permiten a administradores y distribuidores obtener información actualizada de cédulas y RUC desde servicios externos. Estos servicios son útiles para validar y completar datos de clientes antes de procesar solicitudes.

### 🔎 Consultar Datos de Cédula (ADMIN/DISTRIBUTOR)
**POST** `/consultations/cedula`

Obtiene información detallada de una persona mediante su número de cédula desde servicios del Registro Civil.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "cedula": "1804677951"
}
```

**Validaciones:**
- La cédula debe tener exactamente 10 dígitos
- Solo debe contener números

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Consulta exitosa",
  "data": {
    "nui": "1804677951",
    "nombre": "FERNANDO MATIAS TURIZO FERNANDEZ",
    "firstNames": "FERNANDO MATIAS",
    "lastNames": "TURIZO FERNANDEZ",
    "fechaNacimiento": "16/04/1990",
    "sexo": "HOMBRE",
    "genero": null,
    "nacionalidad": "ECUATORIANA",
    "lugarNacimiento": "TUNGURAHUA/AMBATO/LA MATRIZ",
    "domicilio": "TUNGURAHUA/AMBATO/LA MATRIZ",
    "calle": "12 DE NOV Y MALDONADO SN",
    "numeroCasa": "SN",
    "estadoCivil": "CASADO",
    "conyuge": "MARIA FERNANDA LOPEZ GARCIA",
    "nombreMadre": "ANA LUCIA FERNANDEZ MERA",
    "nombrePadre": "CARLOS TURIZO MORALES",
    "instruccion": "SUPERIOR",
    "profesion": "INGENIERO",
    "condicionCedulado": "CIUDADANO",
    "fechaCedulacion": "25/01/2017",
    "fechaInscripcionDefuncion": null,
    "fechaInscripcionGenero": null,
    "lugarInscripcionGenero": null
  }
}
```

**Respuesta Sin Resultados (200):**
```json
{
  "success": false,
  "message": "Cédula no encontrada",
  "data": null
}
```

**Campos del response:**
Todos los campos devuelven `null` si la información no está disponible:

- **Datos básicos:**
  - `nui`: Número Único de Identificación
  - `nombre`: Nombre completo
  - `firstNames`: Nombres separados automáticamente (puede incluir nombres compuestos)
  - `lastNames`: Apellidos separados automáticamente
  - `fechaNacimiento`: Fecha de nacimiento (formato: DD/MM/YYYY)
  - `sexo`: Sexo biológico (HOMBRE, MUJER)
  - `genero`: Género (si está registrado)
  - `nacionalidad`: Nacionalidad

- **Datos de ubicación:**
  - `lugarNacimiento`: Lugar de nacimiento (Provincia/Ciudad/Parroquia)
  - `domicilio`: Domicilio actual (Provincia/Ciudad/Parroquia)
  - `calle`: Dirección de calle
  - `numeroCasa`: Número de casa

- **Datos civiles:**
  - `estadoCivil`: Estado civil (SOLTERO, CASADO, DIVORCIADO, VIUDO, UNION LIBRE)
  - `conyuge`: Nombre del cónyuge (si aplica)

- **Datos familiares:**
  - `nombreMadre`: Nombre completo de la madre
  - `nombrePadre`: Nombre completo del padre

- **Datos educación/profesión:**
  - `instruccion`: Nivel de instrucción (PRIMARIA, SECUNDARIA, SUPERIOR, etc.)
  - `profesion`: Profesión declarada

- **Datos de cedulación:**
  - `condicionCedulado`: Condición (CIUDADANO, EXTRANJERO, etc.)
  - `fechaCedulacion`: Fecha de emisión de la cédula (formato: DD/MM/YYYY)

- **Otros datos:**
  - `fechaInscripcionDefuncion`: Fecha de defunción (si aplica)
  - `fechaInscripcionGenero`: Fecha de inscripción de género
  - `lugarInscripcionGenero`: Lugar de inscripción de género

**Errores:**
- `400`: Cédula inválida (formato incorrecto)
- `401`: No autorizado (token inválido o expirado)
- `403`: Acceso denegado (rol no permitido)
- `500`: Error de configuración del servicio

**Errores de Servicio (200 con success: false):**
- "Cédula no encontrada": La cédula no existe en la base del Registro Civil
- "No se pudo conectar con el servicio de consulta": Error de conexión
- "Tiempo de espera agotado al consultar": Timeout en la consulta
- "Error de autenticación con el servicio": Credenciales incorrectas
- "El servicio de consulta no está disponible": Servicio externo caído

---

### 🏢 Consultar Datos de RUC (ADMIN/DISTRIBUTOR)
**POST** `/consultations/ruc`

Obtiene información detallada de un contribuyente mediante su RUC desde el Servicio de Rentas Internas (SRI).

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "ruc": "1804677951001"
}
```

**Validaciones:**
- El RUC debe tener exactamente 13 dígitos
- Solo debe contener números

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Consulta exitosa",
  "data": {
    "numRuc": "1804677951001",
    "razonSocial": "TURIZO FERNANDEZ FERNANDO MATIAS",
    "nombreComercial": "LR-SOFT SOLUTION",
    "estadoContribuyente": "ACTIVO",
    "actividadEconomicaPrincipal": "PRESTACION DE SERVICIOS PROFESIONALES.",
    "tipoContribuyente": "PERSONA NATURAL",
    "regimen": "GENERAL",
    "categoria": "",
    "obligadoLlevarContabilidad": "NO",
    "agenteRetencion": "NO",
    "contribuyenteEspecial": "NO",
    "identificacionRepresentanteLegal": null,
    "nombreRepresentanteLegal": null,
    "representanteLegalFirstNames": null,
    "representanteLegalLastNames": null,
    "fechaInicioActividades": "2023-05-22 00:00:00.0",
    "fechaCese": null,
    "fechaReinicioActividades": null,
    "fechaActualizacion": "2023-06-30 16:30:56.0",
    "motivoCancelacionSuspension": null,
    "contribuyenteFantasma": "NO",
    "transaccionesInexistente": "NO",
    "direccionCompleta": "TUNGURAHUA / AMBATO",
    "establecimientos": [
      {
        "numeroEstablecimiento": "001",
        "nombreFantasiaComercial": "LR-SOFT SOLUTION",
        "direccionCompleta": "TUNGURAHUA / AMBATO",
        "estado": "ABIERTO",
        "tipoEstablecimiento": "MAT"
      },
      {
        "numeroEstablecimiento": "002",
        "nombreFantasiaComercial": "",
        "direccionCompleta": "TUNGURAHUA / AMBATO",
        "estado": "ABIERTO",
        "tipoEstablecimiento": "OFI"
      }
    ]
  }
}
```

**Respuesta Sin Resultados (200):**
```json
{
  "success": false,
  "message": "RUC no encontrado",
  "data": null
}
```

**Campos del response:**
Todos los campos devuelven `null` si la información no está disponible:

- **Datos básicos:**
  - `numRuc`: Número de RUC (13 dígitos)
  - `razonSocial`: Razón social o nombre completo del contribuyente
  - `nombreComercial`: Nombre comercial o fantasía
  - `estadoContribuyente`: Estado del RUC (ACTIVO, SUSPENDIDO, CANCELADO)

- **Actividad económica:**
  - `actividadEconomicaPrincipal`: Descripción de la actividad económica principal
  - `tipoContribuyente`: Tipo (PERSONA NATURAL, SOCIEDAD, etc.)
  - `regimen`: Régimen tributario (GENERAL, RIMPE, etc.)
  - `categoria`: Categoría del contribuyente

- **Obligaciones tributarias:**
  - `obligadoLlevarContabilidad`: SI/NO
  - `agenteRetencion`: SI/NO
  - `contribuyenteEspecial`: SI/NO o número de resolución

- **Representante legal:**
  - `identificacionRepresentanteLegal`: Cédula del representante legal
  - `nombreRepresentanteLegal`: Nombre completo del representante legal
  - `representanteLegalFirstNames`: Nombres del representante legal separados automáticamente
  - `representanteLegalLastNames`: Apellidos del representante legal separados automáticamente

- **Estados y fechas:**
  - `fechaInicioActividades`: Fecha de inicio de actividades (formato: YYYY-MM-DD HH:MM:SS.S)
  - `fechaCese`: Fecha de cese de actividades
  - `fechaReinicioActividades`: Fecha de reinicio de actividades
  - `fechaActualizacion`: Fecha de última actualización en el SRI
  - `motivoCancelacionSuspension`: Motivo si está cancelado o suspendido

- **Clasificaciones:**
  - `contribuyenteFantasma`: SI/NO (marcación del SRI por operaciones sospechosas)
  - `transaccionesInexistente`: SI/NO (transacciones declaradas sin sustento)

- **Dirección:**
  - `direccionCompleta`: Dirección completa del domicilio fiscal

- **Establecimientos:**
  - `establecimientos`: Array de establecimientos registrados
    - `numeroEstablecimiento`: Número secuencial (001, 002, etc.)
    - `nombreFantasiaComercial`: Nombre comercial del establecimiento
    - `direccionCompleta`: Dirección del establecimiento
    - `estado`: Estado (ABIERTO, CERRADO)
    - `tipoEstablecimiento`: Tipo (MAT=Matriz, SUC=Sucursal, OFI=Oficina, etc.)

**Errores:**
- `400`: RUC inválido (formato incorrecto)
- `401`: No autorizado (token inválido o expirado)
- `403`: Acceso denegado (rol no permitido)
- `500`: Error de configuración del servicio

**Errores de Servicio (200 con success: false):**
- "RUC no encontrado": El RUC no existe en la base del SRI
- "No se pudo conectar con el servicio de consulta": Error de conexión
- "Tiempo de espera agotado al consultar": Timeout en la consulta
- "Error de autenticación con el servicio": Credenciales incorrectas
- "El servicio de consulta no está disponible": Servicio externo caído

---

### 📌 Notas sobre Consultas

**Servicios externos:**
- Las consultas se realizan a servicios de terceros (LR-Soft Solution)
- La disponibilidad depende del proveedor externo
- Los tiempos de respuesta pueden variar (timeout configurado a 15 segundos)

**Seguridad y acceso:**
- Disponible para roles ADMIN y DISTRIBUTOR
- Requiere autenticación mediante JWT
- No se cobra por las consultas
- No afecta el balance del distribuidor

**Manejo de datos:**
- Todos los campos pueden ser `null` si la información no está disponible
- Los servicios devuelven `success: false` cuando no encuentran datos
- Los errores de conexión o servicio se reportan con `success: false`
- La estructura de respuesta es consistente independientemente del resultado

**Separación automática de nombres y apellidos:**
El sistema separa automáticamente los nombres completos en `firstNames` y `lastNames` utilizando la siguiente lógica inteligente:

- **1 palabra**: Se considera solo nombre
  - Ejemplo: "FERNANDO" → Nombres: "FERNANDO", Apellidos: null

- **2 palabras**: Primera es nombre, segunda es apellido
  - Ejemplo: "LUIS GONZALEZ" → Nombres: "LUIS", Apellidos: "GONZALEZ"

- **3 palabras**: Primera es nombre, últimas dos son apellidos
  - Ejemplo: "LUIS GONZALEZ JIMENEZ" → Nombres: "LUIS", Apellidos: "GONZALEZ JIMENEZ"

- **4+ palabras**: Primeras dos son nombres, últimas dos son apellidos
  - Ejemplo: "LUIS XAVIER GONZALEZ JIMENEZ" → Nombres: "LUIS XAVIER", Apellidos: "GONZALEZ JIMENEZ"
  - Ejemplo: "NORMITA DEL CARMEN JIMENEZ ROBLES" → Nombres: "NORMITA DEL CARMEN", Apellidos: "JIMENEZ ROBLES"

- **Casos especiales**: El algoritmo reconoce palabras conectoras como "de", "del", "de la", "y", que pueden formar parte de nombres compuestos
  - Ejemplo: "MARIA DE LOS ANGELES RODRIGUEZ LOPEZ" → Nombres: "MARIA DE LOS ANGELES", Apellidos: "RODRIGUEZ LOPEZ"

Esta separación se aplica a:
- `nombre` → `firstNames` y `lastNames` (consulta de cédula)
- `nombreRepresentanteLegal` → `representanteLegalFirstNames` y `representanteLegalLastNames` (consulta de RUC)

**Uso recomendado:**
- Validar datos de clientes antes de crear solicitudes de firma
- Autocompletar formularios con información actualizada
- Verificar estados de contribuyentes antes de transacciones
- Validar que cédulas y RUC estén activos

**Variables de entorno necesarias:**
```env
# URL de servicio de consulta de cédulas
API_CEDULAS_URL=https://api.lr-softsolution.com/api/ConsultasCedula

# URL de servicio de consulta de RUC
API_SRI_URL=https://api.lr-softsolution.com/api/ConsultasSRI

# Credenciales de autenticación
API_CEDULAS_USER=
API_CEDULAS_TOKEN=
```

**Logs y monitoreo:**
- Todas las consultas se registran en los logs
- Se registran tanto consultas exitosas como fallidas
- Se incluye información de errores de red y timeouts
- Permite auditoría de uso del servicio

**Formato de datos retornados:**
- Fechas en formato DD/MM/YYYY (cédulas) o YYYY-MM-DD HH:MM:SS.S (RUC)
- Textos en mayúsculas generalmente
- Valores booleanos como "SI"/"NO"
- Arrays vacíos como `null` si no hay datos

**Personalización de respuestas:**
Los DTOs están diseñados para facilitar agregar o quitar campos según necesidades:
1. Editar interfaces en `cedula-response.dto.ts` y `ruc-response.dto.ts`
2. Ajustar transformación en métodos `transformCedulaData()` y `transformRucData()`
3. Los campos no mapeados automáticamente devuelven `null`
