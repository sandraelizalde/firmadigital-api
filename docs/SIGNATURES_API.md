# API de Firmas Digitales - Documentación Completa

## Tabla de Contenidos
1. [Proveedores de Firma](#proveedores-de-firma)
2. [Endpoints para Distribuidores](#endpoints-para-distribuidores)
3. [Endpoints para Administradores](#endpoints-para-administradores)
4. [Modelos de Datos](#modelos-de-datos)
5. [Códigos de Estado](#códigos-de-estado)

---

## Proveedores de Firma

El sistema soporta múltiples proveedores de firma digital y determina automáticamente cuál usar según los parámetros del request:

### Matriz de Enrutamiento

| Tipo Persona | Documento | Usa Token | Proveedor | Estado Final |
|--------------|-----------|-----------|-----------|--------------|
| NATURAL | CEDULA | `false` | ENEXT | COMPLETED |
| NATURAL | PASAPORTE | `false` | UANATACA | PENDING |
| NATURAL | CEDULA/PASAPORTE | `true` | UANATACA TOKEN | PENDING |
| JURIDICA | CEDULA | `false` | ENEXT | PENDING |
| JURIDICA | PASAPORTE | `false` | UANATACA | PENDING |
| JURIDICA | CEDULA/PASAPORTE | `true` | UANATACA TOKEN | PENDING |

### Diferencias por Proveedor

**ENEXT:**
- Usa campos básicos únicamente
- `providerCode`: "1" (éxito) o "0" (falla)
- Firmas naturales → estado `COMPLETED`
- Firmas jurídicas → estado `PENDING`

**UANATACA:**
- Requiere campos adicionales: `nacionalidad`, `sexo`, `selfie`
- `providerCode`: UUID de trazabilidad (ej: "0d963a7a-1b57-4d5e-9f68-a3d5fbd1a9f2")
- Todas las firmas → estado `PENDING`
- Autenticación JWT previa (token de 5 min)

---

## Endpoints para Distribuidores

### 1. Crear Firma Digital - Persona Natural

**Endpoint:** `POST /signatures/natural`

**Autenticación:** Bearer Token (JWT)

**Rol Requerido:** `DISTRIBUTOR`

**Content-Type:** `multipart/form-data`

**Descripción:** Crea una solicitud de firma digital para persona natural. El sistema valida el balance del distribuidor, extrae el perfil correcto del plan según el tipo de persona y proveedor, y cobra automáticamente si la solicitud es exitosa.

#### Request Body (Form Data)

| Campo | Tipo | Requerido | Descripción | Ejemplo |
|-------|------|-----------|-------------|---------|
| `planId` | string | Sí | ID del plan asignado al distribuidor | `clx1234567890` |
| `nombres` | string | Sí | Nombres del solicitante (mayúsculas) | `LUIS XAVIER` |
| `apellidos` | string | Sí | Apellidos del solicitante (mayúsculas) | `GONZALEZ JIMENEZ` |
| `cedula` | string | Sí | Número de cédula | `1752549467` |
| `codigo_dactilar` | string | Sí | Código dactilar | `V43I4444` |
| `correo` | string | Sí | Correo electrónico | `usuario@email.com` |
| `provincia` | string | Sí | Provincia (mayúsculas) | `PICHINCHA` |
| `ciudad` | string | Sí | Ciudad (mayúsculas) | `QUITO` |
| `parroquia` | string | Sí | Parroquia (mayúsculas) | `IÑAQUITO` |
| `direccion` | string | Sí | Dirección completa (mayúsculas) | `QUITUS COLONIAL MZ 5 CS 10` |
| `celular` | string | Sí | Número de celular (10 dígitos) | `0990602199` |
| `clavefirma` | string | Sí | Contraseña para la firma | `GONZALEZ1752` |
| `foto_frontal` | string | Sí | Foto frontal de la cédula en Base64 | `data:image/jpeg;base64,...` |
| `foto_posterior` | string | Sí | Foto posterior de la cédula en Base64 | `data:image/jpeg;base64,...` |
| `dateOfBirth` | string | Sí | Fecha de nacimiento (ISO 8601) | `1990-05-15` |
| `documento` | string | No | Tipo de documento: CEDULA o PASAPORTE | `CEDULA` |
| `usaToken` | boolean | No | Si usa token Uanataca | `false` |
| `ruc` | string | No | Número de RUC (opcional) | `1752549467001` |
| **Campos para Uanataca (pasaporte/token)** |
| `nacionalidad` | string | Condicional* | Nacionalidad (requerido para Uanataca) | `ECUATORIANA` |
| `sexo` | string | Condicional* | Sexo: HOMBRE o MUJER (requerido para Uanataca) | `HOMBRE` |
| `selfie` | string | Condicional* | Selfie en Base64 (requerido para Uanataca) | `data:image/jpeg;base64,...` |
| `pasaporte` | string | Condicional** | Número de pasaporte (requerido si documento=PASAPORTE) | `A12345678` |
| `video_face` | file | Condicional | Video facial (obligatorio si edad >= 80 años). Formatos: mp4, mov, avi, webm. Máximo 50MB | (archivo binario) |

**\*Requerido cuando `documento=PASAPORTE` o `usaToken=true`** 
**\*\*Requerido cuando `documento=PASAPORTE`**


#### Respuesta Exitosa (201)

```json
{
  "success": true,
  "message": "Solicitud enviada correctamente",
  "data": {
    "balance": 450000,
    "priceCharged": 79900,
    "usedCredit": false
  }
}
```

#### Respuesta Rechazada por Proveedor (201)

```json
{
  "success": false,
  "message": "El código dactilar no corresponde a la cédula ingresada",
  "data": {
    "balance": 450000,
    "priceCharged": 0,
    "usedCredit": false
  }
}
```

#### Errores Comunes (400)

```json
{
  "statusCode": 400,
  "message": "Balance insuficiente. Se requieren $7.99 y tiene $4.50",
  "error": "Bad Request"
}
```

```json
{
  "statusCode": 400,
  "message": "No se encontró el plan asignado al distribuidor",
  "error": "Bad Request"
}
```

```json
{
  "statusCode": 400,
  "message": "El video facial es obligatorio para personas de 80 años o más",
  "error": "Bad Request"
}
```

```json
{
  "statusCode": 400,
  "message": "La nacionalidad es requerida para firmas Uanataca",
  "error": "Bad Request"
}
```

```json
{
  "statusCode": 400,
  "message": "El sexo es requerido para firmas Uanataca", 
  "error": "Bad Request"
}
```

```json
{
  "statusCode": 400,
  "message": "La selfie es requerida para firmas Uanataca",
  "error": "Bad Request"
}
```

```json
{
  "statusCode": 400,
  "message": "Distribuidor inactivo",
  "error": "Bad Request"
}
```

#### Ejemplos de Request JSON

**Ejemplo 1: Firma Natural ENEXT (cédula)**
```json
{
  "planId": "clx1234567890",
  "nombres": "LUIS XAVIER",
  "apellidos": "GONZALEZ JIMENEZ", 
  "cedula": "1752549467",
  "codigo_dactilar": "V43I4444",
  "correo": "luis@email.com",
  "provincia": "PICHINCHA",
  "ciudad": "QUITO",
  "parroquia": "IÑAQUITO",
  "direccion": "QUITUS COLONIAL MZ 5 CS 10",
  "celular": "0990602199",
  "clavefirma": "GONZALEZ1752",
  "foto_frontal": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...",
  "foto_posterior": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...",
  "dateOfBirth": "1990-05-15",
  "documento": "CEDULA",
  "usaToken": false,
  "ruc": "1752549467001"
}
```

**Ejemplo 2: Firma Natural UANATACA (pasaporte)**
```json
{
  "planId": "clx1234567890",
  "nombres": "MARIA FERNANDA",
  "apellidos": "RODRIGUEZ SILVA",
  "cedula": "1750123456",
  "codigo_dactilar": "X12Y3456",
  "correo": "maria@email.com",
  "provincia": "GUAYAS", 
  "ciudad": "GUAYAQUIL",
  "parroquia": "CENTRO",
  "direccion": "AV. 9 DE OCTUBRE 1234",
  "celular": "0987654321",
  "clavefirma": "MARIA1750",
  "foto_frontal": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...",
  "foto_posterior": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...",
  "dateOfBirth": "1985-08-22",
  "documento": "PASAPORTE",
  "usaToken": false,
  "pasaporte": "A12345678",
  "nacionalidad": "ECUATORIANA",
  "sexo": "MUJER",
  "selfie": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD..."
}
```

**Ejemplo 3: Firma Natural UANATACA TOKEN**
```json
{
  "planId": "clx1234567890",
  "nombres": "CARLOS EDUARDO",
  "apellidos": "MENDEZ TORRES",
  "cedula": "1715987654",
  "codigo_dactilar": "Z98W7654",
  "correo": "carlos@email.com",
  "provincia": "AZUAY",
  "ciudad": "CUENCA", 
  "parroquia": "SAN PEDRO",
  "direccion": "CALLE LARGA 567",
  "celular": "0981234567",
  "clavefirma": "CARLOS1715",
  "foto_frontal": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...",
  "foto_posterior": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...",
  "dateOfBirth": "1978-12-03",
  "documento": "CEDULA",
  "usaToken": true,
  "nacionalidad": "ECUATORIANA",
  "sexo": "HOMBRE",
  "selfie": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD..."
}
```

**Ejemplo 4: Persona mayor de 80 años (con video obligatorio)**
```json
{
  "planId": "clx1234567890",
  "nombres": "JOSEFINA",
  "apellidos": "VARGAS MORENO",
  "cedula": "1701234567",
  "codigo_dactilar": "A12B3456",
  "correo": "josefina@email.com",
  "provincia": "PICHINCHA",
  "ciudad": "QUITO",
  "parroquia": "LA CAROLINA",
  "direccion": "AV. REPUBLICA 890",
  "celular": "0998765432",
  "clavefirma": "JOSEFINA1701",
  "foto_frontal": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...",
  "foto_posterior": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...",
  "dateOfBirth": "1935-04-10",
  "documento": "CEDULA", 
  "usaToken": false
}
```
*Nota: Para este ejemplo se debe incluir el campo `video_face` como archivo en el form-data.*

---

### 2. Crear Firma Digital - Persona Jurídica

**Endpoint:** `POST /signatures/juridica`

**Autenticación:** Bearer Token (JWT)

**Rol Requerido:** `DISTRIBUTOR`

**Content-Type:** `multipart/form-data`

**Descripción:** Crea una solicitud de firma digital para persona jurídica (empresa). Requiere datos adicionales como RUC, razón social, representante legal y documentos adicionales (PDF SRI y nombramiento).

#### Request Body (Form Data)

Incluye todos los campos de persona natural, más los campos específicos jurídicos:

| Campo | Tipo | Requerido | Descripción | Ejemplo |
|-------|------|-----------|-------------|---------|
| **Campos específicos jurídicos** |
| `ruc` | string | Sí | Número de RUC de la empresa | `1752549467001` |
| `razon_social` | string | Sí | Razón social de la empresa | `DISTRIBUIDORA GONZALEZ S.A.` |
| `rep_legal` | string | Sí | Nombre completo del representante legal | `LUIS XAVIER GONZALEZ JIMENEZ` |
| `cargo` | string | Sí | Cargo del representante legal | `GERENTE GENERAL` |
| `pdfSriBase64` | string | Sí | PDF del RUC del SRI en Base64 | `data:application/pdf;base64,...` |
| `nombramientoBase64` | string | Sí | PDF del nombramiento en Base64 | `data:application/pdf;base64,...` |

**Nota:** También incluye todos los campos de persona natural. Para firmas Uanataca jurídicas (pasaporte/token), se requieren adicionalmente: `nacionalidad`, `sexo`, `selfie`.

#### Respuesta Exitosa (201)

```json
{
  "success": true,
  "message": "Solicitud enviada correctamente",
  "data": {
    "balance": 300000,
    "priceCharged": 149900,
    "usedCredit": true
  }
}
```

**Nota:** Las firmas jurídicas quedan en estado `PENDING` y requieren aprobación manual del administrador.

#### Ejemplos de Request JSON Jurídica

**Ejemplo 1: Firma Jurídica ENEXT**
```json
{
  "planId": "clx1234567890",
  "nombres": "LUIS XAVIER",
  "apellidos": "GONZALEZ JIMENEZ",
  "cedula": "1752549467",
  "codigo_dactilar": "V43I4444",
  "correo": "luis@empresa.com",
  "provincia": "PICHINCHA",
  "ciudad": "QUITO",
  "parroquia": "IÑAQUITO", 
  "direccion": "AV. AMAZONAS 1234",
  "celular": "0990602199",
  "clavefirma": "EMPRESA1752",
  "foto_frontal": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...",
  "foto_posterior": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...",
  "dateOfBirth": "1980-03-15",
  "documento": "CEDULA",
  "usaToken": false,
  "ruc": "1752549467001",
  "razon_social": "DISTRIBUIDORA GONZALEZ S.A.",
  "rep_legal": "LUIS XAVIER GONZALEZ JIMENEZ",
  "cargo": "GERENTE GENERAL",
  "pdfSriBase64": "data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMSAw...",
  "nombramientoBase64": "data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMSAw..."
}
```

**Ejemplo 2: Firma Jurídica UANATACA (pasaporte)**
```json
{
  "planId": "clx1234567890",
  "nombres": "MARIA ELENA",
  "apellidos": "RODRIGUEZ VERA",
  "cedula": "1750987654",
  "codigo_dactilar": "X12Y9876",
  "correo": "maria@empresa.com", 
  "provincia": "GUAYAS",
  "ciudad": "GUAYAQUIL",
  "parroquia": "CENTRO",
  "direccion": "AV. 9 DE OCTUBRE 567",
  "celular": "0987654321",
  "clavefirma": "EMPRESA1750",
  "foto_frontal": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...",
  "foto_posterior": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...",
  "dateOfBirth": "1975-09-20",
  "documento": "PASAPORTE",
  "usaToken": false,
  "pasaporte": "B98765432",
  "nacionalidad": "ECUATORIANA",
  "sexo": "MUJER",
  "selfie": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...",
  "ruc": "1750987654001",
  "razon_social": "COMERCIAL RODRIGUEZ CIA. LTDA.",
  "rep_legal": "MARIA ELENA RODRIGUEZ VERA",
  "cargo": "GERENTE GENERAL",
  "pdfSriBase64": "data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMSAw...",
  "nombramientoBase64": "data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMSAw..."
}
```

**Ejemplo 3: Firma Jurídica UANATACA TOKEN**
```json
{
  "planId": "clx1234567890",
  "nombres": "CARLOS ANDRES",
  "apellidos": "MENDOZA TORRES",
  "cedula": "1715876543",
  "codigo_dactilar": "Z98W5432", 
  "correo": "carlos@empresa.com",
  "provincia": "AZUAY",
  "ciudad": "CUENCA",
  "parroquia": "SAN PEDRO",
  "direccion": "CALLE LARGA 890",
  "celular": "0981234567",
  "clavefirma": "EMPRESA1715",
  "foto_frontal": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...",
  "foto_posterior": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...",
  "dateOfBirth": "1985-11-10",
  "documento": "CEDULA",
  "usaToken": true,
  "nacionalidad": "ECUATORIANA",
  "sexo": "HOMBRE",
  "selfie": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...",
  "ruc": "1715876543001",
  "razon_social": "SERVICIOS MENDOZA S.A.",
  "rep_legal": "CARLOS ANDRES MENDOZA TORRES",
  "cargo": "PRESIDENTE",
  "pdfSriBase64": "data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMSAw...",
  "nombramientoBase64": "data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMSAw..."
}
```

---

### 3. Obtener Listado de Firmas (Paginado)

**Endpoint:** `GET /signatures/all`

**Autenticación:** Bearer Token (JWT)

**Rol Requerido:** `DISTRIBUTOR`

**Descripción:** Obtiene todas las solicitudes de firma del distribuidor autenticado, con paginación.

#### Query Parameters

| Parámetro | Tipo | Requerido | Por Defecto | Descripción |
|-----------|------|-----------|-------------|-------------|
| `page` | number | No | 1 | Número de página |
| `limit` | number | No | 10 | Cantidad de resultados por página |

#### Ejemplo de Request

```
GET /signatures/all?page=1&limit=10
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Respuesta Exitosa (200)

```json
{
  "data": [
    {
      "id": "clx1234567890",
      "numero_tramite": "17034425678900001",
      "perfil_firma": "PN-ENEXT-1ANIO-001",
      "nombres": "LUIS XAVIER",
      "apellidos": "GONZALEZ JIMENEZ",
      "rep_legal": null,
      "cedula": "1752549467",
      "correo": "usuario@email.com",
      "celular": "0990602199",
      "ruc": null,
      "razon_social": null,
      "status": "COMPLETED",
      "providerCode": "1",
      "providerMessage": "Solicitud enviada correctamente",
      "durationType": "Y",
      "duration": "1",
      "expiredDays": 360,
      "createdAt": "2026-02-04T10:30:00.000Z",
      "updatedAt": "2026-02-04T10:30:00.000Z"
    },
    {
      "id": "clx9876543210",
      "numero_tramite": "17034425678900002",
      "perfil_firma": "PJ-ENEXT-2ANIOS-003",
      "nombres": "MARIA",
      "apellidos": "PEREZ",
      "rep_legal": "MARIA PEREZ LOPEZ",
      "cedula": "1752549468",
      "correo": "maria@empresa.com",
      "celular": "0991234567",
      "ruc": "1752549468001",
      "razon_social": "EMPRESA ABC S.A.",
      "status": "PENDING",
      "providerCode": "1",
      "providerMessage": "Solicitud enviada correctamente",
      "durationType": "Y",
      "duration": "2",
      "expiredDays": null,
      "createdAt": "2026-02-03T15:20:00.000Z",
      "updatedAt": "2026-02-03T15:20:00.000Z"
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

---

### 4. Obtener Detalle de una Firma Específica

**Endpoint:** `GET /signatures/unique`

**Autenticación:** Bearer Token (JWT)

**Rol Requerido:** `DISTRIBUTOR`

**Descripción:** Obtiene el detalle completo de una solicitud de firma específica, incluyendo todas las fotos y documentos convertidos a Base64 desde Wasabi S3.

#### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | string | Sí | ID de la solicitud de firma |

#### Ejemplo de Request

```
GET /signatures/unique?id=clx1234567890
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Respuesta Exitosa (200)

```json
{
  "id": "clx1234567890",
  "numero_tramite": "DIST1703342567890001",
  "planId": "clx1234567890",
  "perfil_firma": "PN-ENEXT-1ANIO-001",
  "nombres": "FERNANDO MATIAS",
  "apellidos": "TURIZO FERNANDEZ",
  "cedula": "1752549468",
  "correo": "usuario@email.com",
  "codigo_dactilar": "V43I4444",
  "celular": "0990602199",
  "provincia": "PICHINCHA",
  "ciudad": "QUITO",
  "parroquia": "IÑAQUITO",
  "direccion": "QUITUS COLONIAL",
  "dateOfBirth": "1990-05-15T00:00:00.000Z",
  "foto_frontal_url": "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcU...",
  "foto_posterior_url": "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcU...",
  "video_face_url": null,
  "pdf_sri_url": null,
  "nombramiento_url": null,
  "razon_social": null,
  "rep_legal": null,
  "cargo": null,
  "pais": "ECUADOR",
  "clavefirma": "GONZALEZ1752",
  "ruc": null,
  "tipo_envio": "1",
  "status": "COMPLETED",
  "providerCode": "1",
  "providerMessage": "Solicitud enviada correctamente",
  "priceCharged": 79900,
  "paymentMethod": "BALANCE",
  "activeNotification": true,
  "expirationDate": "2027-02-04T10:30:00.000Z",
  "duration": "1",
  "durationType": "Y",
  "createdAt": "2026-02-04T10:30:00.000Z",
  "updatedAt": "2026-02-04T10:30:00.000Z"
}
```

#### Errores Comunes (400)

```json
{
  "statusCode": 400,
  "message": "Solicitud de firma no encontrada",
  "error": "Bad Request"
}
```

```json
{
  "statusCode": 400,
  "message": "El parámetro id es requerido",
  "error": "Bad Request"
}
```

---

### 5. Validar Correo Electrónico

**Endpoint:** `GET /signatures/validate-email`

**Autenticación:** Bearer Token (JWT)

**Rol Requerido:** `DISTRIBUTOR`

**Descripción:** Valida si un correo electrónico es válido y está activo utilizando un servicio externo de verificación.

#### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `email` | string | Sí | Correo electrónico a validar |

#### Ejemplo de Request

```
GET /signatures/validate-email?email=usuario@email.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Respuesta Exitosa (200)

```json
{
  "valid": true,
  "email": "usuario@email.com",
  "status": "valid"
}
```

```json
{
  "valid": false,
  "email": "invalido@email.com",
  "status": "invalid",
  "reason": "Mailbox does not exist"
}
```

---

## Endpoints para Administradores

### 6. Obtener Todas las Firmas con Filtros (Admin)

**Endpoint:** `GET /signatures/admin/all`

**Autenticación:** Bearer Token (JWT)

**Rol Requerido:** `ADMIN`

**Descripción:** Obtiene todas las solicitudes de firma con información del distribuidor, con filtros y paginación.

#### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `page` | number | No | Número de página (default: 1) |
| `limit` | number | No | Resultados por página (default: 10) |
| `status` | string | No | Filtrar por estado: `COMPLETED`, `PENDING`, `REJECTED`, `FAILED`, `ANNULLED` |
| `distributorId` | string | No | Filtrar por ID del distribuidor |
| `cedula` | string | No | Filtrar por cédula del solicitante |
| `searchTerm` | string | No | Buscar por nombres, apellidos, cédula o número de trámite |

#### Ejemplo de Request

```
GET /signatures/admin/all?page=1&limit=20&status=COMPLETED&searchTerm=GONZALEZ
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Respuesta Exitosa (200)

```json
{
  "data": [
    {
      "id": "clx1234567890",
      "numero_tramite": "17034425678900001",
      "perfil_firma": "PN-ENEXT-1ANIO-001",
      "nombres": "LUIS XAVIER",
      "apellidos": "GONZALEZ JIMENEZ",
      "cedula": "1752549467",
      "correo": "usuario@email.com",
      "celular": "0990602199",
      "ruc": null,
      "razon_social": null,
      "status": "COMPLETED",
      "providerCode": "1",
      "providerMessage": "Solicitud enviada correctamente",
      "priceCharged": 79900,
      "paymentMethod": "BALANCE",
      "duration": "1",
      "durationType": "Y",
      "expiredDays": 360,
      "createdAt": "2026-02-04T10:30:00.000Z",
      "updatedAt": "2026-02-04T10:30:00.000Z",
      "distributor": {
        "id": "clx9876543210",
        "firstName": "Luis",
        "lastName": "González",
        "socialReason": null,
        "identification": "1752549467",
        "email": "distribuidor@email.com",
        "phone": "0991234567"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

### 7. Obtener Detalle de una Firma (Admin)

**Endpoint:** `GET /signatures/admin/unique`

**Autenticación:** Bearer Token (JWT)

**Rol Requerido:** `ADMIN`

**Descripción:** Obtiene el detalle completo de cualquier solicitud de firma, incluyendo fotos, documentos e información completa del distribuidor.

#### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | string | Sí | ID de la solicitud de firma |

#### Ejemplo de Request

```
GET /signatures/admin/unique?id=clx1234567890
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Respuesta Exitosa (200)

```json
{
  "id": "clx1234567890",
  "numero_tramite": "DIST1703342567890001",
  "planId": "clx1234567890",
  "perfil_firma": "PN-ENEXT-1ANIO-001",
  "nombres": "FERNANDO MATIAS",
  "apellidos": "TURIZO FERNANDEZ",
  "cedula": "1752549468",
  "correo": "usuario@email.com",
  "codigo_dactilar": "V43I4444",
  "celular": "0990602199",
  "provincia": "PICHINCHA",
  "ciudad": "QUITO",
  "parroquia": "IÑAQUITO",
  "direccion": "QUITUS COLONIAL",
  "dateOfBirth": "1990-05-15T00:00:00.000Z",
  "foto_frontal_url": "https://s3.wasabisys.com/bucket/path/to/image.jpg",
  "foto_posterior_url": "https://s3.wasabisys.com/bucket/path/to/image.jpg",
  "video_face": null,
  "pdf_sri_url": null,
  "nombramiento_url": null,
  "razon_social": null,
  "rep_legal": null,
  "cargo": null,
  "pais": "ECUADOR",
  "clavefirma": "GONZALEZ1752",
  "ruc": null,
  "tipo_envio": "1",
  "status": "COMPLETED",
  "providerCode": "1",
  "providerMessage": "Solicitud enviada correctamente",
  "priceCharged": 79900,
  "paymentMethod": "BALANCE",
  "annulledBy": null,
  "annulledNote": null,
  "activeNotification": true,
  "expirationDate": "2027-02-04T10:30:00.000Z",
  "duration": "1",
  "durationType": "Y",
  "createdAt": "2026-02-04T10:30:00.000Z",
  "updatedAt": "2026-02-04T10:30:00.000Z",
  "distributor": {
    "id": "clx9876543210",
    "firstName": "Luis",
    "lastName": "González",
    "socialReason": null,
    "identification": "1752549467",
    "identificationType": "CEDULA",
    "email": "distribuidor@email.com",
    "phone": "0991234567",
    "address": "Quito, Ecuador",
    "balance": 450000
  }
}
```

---

### 8. Anular una Firma y Reembolsar (Admin)

**Endpoint:** `POST /signatures/admin/annul`

**Autenticación:** Bearer Token (JWT)

**Rol Requerido:** `ADMIN`

**Descripción:** Anula una solicitud de firma digital. Si la firma fue cobrada, puede reembolsar automáticamente el monto al balance del distribuidor. Si la firma fue pagada con crédito y está dentro del mismo corte, puede transferir el pago a otra firma válida.

#### Request Body

```json
{
  "signatureId": "clx1234567890",
  "generateRefund": true,
  "note": "Error en la solicitud del cliente"
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `signatureId` | string | Sí | ID de la firma a anular |
| `generateRefund` | boolean | Sí | Si debe generar reembolso (true) o no (false) |
| `note` | string | No | Nota explicativa de la anulación |

#### Respuesta Exitosa - Con Reembolso (200)

```json
{
  "success": true,
  "message": "Firma anulada exitosamente y se reembolsaron $7.99 al distribuidor",
  "data": {
    "signatureId": "clx1234567890",
    "distributorId": "clx9876543210",
    "refundedAmount": 79900,
    "newDistributorBalance": 529900,
    "movementId": "clx1122334455",
    "wasTransferredToAnotherSignature": false
  }
}
```

#### Respuesta Exitosa - Transferencia a Otra Firma (200)

```json
{
  "success": true,
  "message": "Firma anulada exitosamente. El pago fue transferido a otra firma válida en el mismo corte",
  "data": {
    "signatureId": "clx1234567890",
    "distributorId": "clx9876543210",
    "refundedAmount": 0,
    "newDistributorBalance": 450000,
    "wasTransferredToAnotherSignature": true,
    "transferredToSignatureId": "clx0987654321"
  }
}
```

#### Respuesta Exitosa - Sin Reembolso (200)

```json
{
  "success": true,
  "message": "Firma anulada exitosamente sin reembolso",
  "data": {
    "signatureId": "clx1234567890",
    "distributorId": "clx9876543210",
    "refundedAmount": 0,
    "newDistributorBalance": 450000
  }
}
```

#### Errores Comunes (400)

```json
{
  "statusCode": 400,
  "message": "Solicitud de firma no encontrada",
  "error": "Bad Request"
}
```

```json
{
  "statusCode": 400,
  "message": "La firma ya está anulada",
  "error": "Bad Request"
}
```

---

### 9. Aprobar Firma Jurídica (Admin)

**Endpoint:** `POST /signatures/admin/approve`

**Autenticación:** Bearer Token (JWT)

**Rol Requerido:** `ADMIN`

**Descripción:** Aprueba una solicitud de firma jurídica que está en estado PENDING, cambiándola a COMPLETED. No afecta el balance del distribuidor.

#### Request Body

```json
{
  "signatureId": "clx9876543210",
  "note": "Documentos verificados correctamente"
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `signatureId` | string | Sí | ID de la firma jurídica a aprobar |
| `note` | string | No | Nota explicativa de la aprobación |

#### Respuesta Exitosa (200)

```json
{
  "success": true,
  "message": "Firma jurídica aprobada exitosamente",
  "data": {
    "signatureId": "clx9876543210",
    "previousStatus": "PENDING",
    "newStatus": "COMPLETED",
    "approvedBy": "Juan Perez",
    "approvedAt": "2026-02-04T15:30:00.000Z"
  }
}
```

#### Errores Comunes (400)

```json
{
  "statusCode": 400,
  "message": "Solicitud de firma no encontrada",
  "error": "Bad Request"
}
```

```json
{
  "statusCode": 400,
  "message": "Solo se pueden aprobar firmas jurídicas en estado PENDING",
  "error": "Bad Request"
}
```

---

## Modelos de Datos

### SignatureRequest

```typescript
{
  id: string;                    // ID único de la firma
  numero_tramite: string;        // Número de trámite generado (único)
  planId: string;                // ID del plan asignado
  perfil_firma: string;          // Perfil extraído del plan (ej: PN-ENEXT-1ANIO-001)
  nombres: string;               // Nombres del solicitante
  apellidos: string;             // Apellidos del solicitante
  cedula: string;                // Número de cédula
  correo: string;                // Correo electrónico
  codigo_dactilar: string;       // Código dactilar
  celular: string;               // Número de celular
  provincia: string;             // Provincia
  ciudad: string;                // Ciudad
  parroquia: string;             // Parroquia
  direccion: string;             // Dirección completa
  dateOfBirth: Date;             // Fecha de nacimiento
  foto_frontal: string;          // Key S3 de foto frontal
  foto_posterior: string;        // Key S3 de foto posterior
  video_face?: string;           // Key S3 de video (opcional)
  clavefirma: string;            // Contraseña de la firma
  ruc?: string;                  // RUC (opcional para natural, obligatorio para jurídica)
  razon_social?: string;         // Razón social (solo jurídica)
  rep_legal?: string;            // Representante legal (solo jurídica)
  cargo?: string;                // Cargo del representante (solo jurídica)
  nombramiento?: string;         // Key S3 de nombramiento (solo jurídica)
  pdf_sri?: string;              // Key S3 de PDF SRI (solo jurídica)
  pais: string;                  // País (siempre "ECUADOR")
  tipo_envio: string;            // Tipo de envío ("1")
  status: SignatureStatus;       // Estado de la firma
  providerCode: string;          // Código de respuesta del proveedor
  providerMessage: string;       // Mensaje de respuesta del proveedor
  priceCharged: number;          // Precio cobrado en centavos
  paymentMethod: PaymentMethod;  // Método de pago (BALANCE o CREDIT)
  annulledBy?: string;           // Nombre del admin que anuló (si aplica)
  annulledNote?: string;         // Nota de anulación (si aplica)
  activeNotification: boolean;   // Si las notificaciones están activas
  distributorId: string;         // ID del distribuidor
  createdAt: Date;               // Fecha de creación
  updatedAt: Date;               // Fecha de última actualización
}
```

### Plan

```typescript
{
  id: string;                          // ID único del plan
  perfilNaturalEnext?: string;         // Perfil para personas naturales con Enext
  perfilJuridicoEnext?: string;        // Perfil para personas jurídicas con Enext
  perfilNaturalUanataca?: string;      // Perfil para personas naturales con Uanataca
  perfilJuridicoUanataca?: string;     // Perfil para personas jurídicas con Uanataca
  perfilNaturalTokenUanataca?: string; // Perfil para personas naturales con Token Uanataca
  perfilJuridicoTokenUanataca?: string;// Perfil para personas jurídicas con Token Uanataca
  basePrice: number;                   // Precio base en centavos
  duration: string;                    // Duración (número como string)
  durationType: string;                // Tipo: D (días), M/MS (meses), Y/YS (años)
  isActive: boolean;                   // Si el plan está activo
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Códigos de Estado

### SignatureStatus

| Estado | Descripción |
|--------|-------------|
| `COMPLETED` | Firma completada exitosamente |
| `PENDING` | Firma en espera de aprobación (solo jurídicas) |
| `REJECTED` | Firma rechazada por el proveedor |
| `FAILED` | Error al procesar la firma |
| `ANNULLED` | Firma anulada por el administrador |

### PaymentMethod

| Método | Descripción |
|--------|-------------|
| `BALANCE` | Pagado desde el balance del distribuidor |
| `CREDIT` | Pagado con crédito (registrado en corte) |

### Códigos de Proveedor (providerCode)

| Código | Descripción |
|--------|-------------|
| `1` | Solicitud exitosa |
| `0` | Solicitud rechazada |
| Otros | Códigos específicos del proveedor |

---

## Notas Importantes

### Lógica de Selección de Perfil

El sistema automáticamente selecciona el perfil correcto del plan basándose en:

1. **Tipo de Persona** (`tipoPersona`): NATURAL o JURIDICA
2. **Tipo de Documento** (`documento`): CEDULA o PASAPORTE
3. **Uso de Token** (`usaToken`): true o false

**Matriz de Selección:**

| Tipo Persona | Documento | Usa Token | Perfil Seleccionado |
|--------------|-----------|-----------|---------------------|
| NATURAL | PASAPORTE | - | `perfilNaturalUanataca` |
| NATURAL | CEDULA | true | `perfilNaturalTokenUanataca` |
| NATURAL | CEDULA | false | `perfilNaturalEnext` |
| JURIDICA | PASAPORTE | - | `perfilJuridicoUanataca` |
| JURIDICA | CEDULA | true | `perfilJuridicoTokenUanataca` |
| JURIDICA | CEDULA | false | `perfilJuridicoEnext` |

### Cobro y Crédito

- Si el distribuidor **no tiene crédito activo**: Se descuenta del balance inmediatamente
- Si el distribuidor **tiene crédito activo**: Se registra en el corte de crédito
- Solo se cobra si la firma es **exitosa** (código 1 del proveedor)
- Si la firma es **rechazada**, no se cobra nada

### Video Facial

- **Obligatorio** para personas de 80 años o más
- **Opcional** para personas menores de 80 años
- Formatos aceptados: mp4, mov, avi, webm
- Tamaño máximo: 50MB

### Fechas de Expiración

La fecha de expiración se calcula:
- Desde la fecha de `updatedAt` de la firma
- Sumando la duración según el tipo:
  - `D`: días
  - `M` o `MS`: meses (30 días cada uno)
  - `Y` o `YS`: años (365 días cada uno)

### Notificaciones

- El sistema envía notificaciones automáticas 5 días antes del vencimiento
- Solo para firmas con `activeNotification: true`
- Solo para firmas con duración de 1 a 5 años
- Las notificaciones se envían vía WhatsApp al teléfono del distribuidor
