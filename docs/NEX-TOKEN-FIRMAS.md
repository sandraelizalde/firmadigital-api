# Firmas Digitales con Token Físico (Uanataca)

Documentación de los endpoints para solicitar una firma digital con entrega de token físico. Aplica para **persona natural** y **persona jurídica**.

---

## Endpoints

| Tipo          | Método | Ruta                    |
|---------------|--------|-------------------------|
| Natural       | POST   | `/signatures/natural`   |
| Jurídica      | POST   | `/signatures/juridica`  |

- **Content-Type:** `multipart/form-data`
- **Autenticación:** Bearer token (distribuidor)
- El campo `usa_token` debe ser `"true"` para que se enrute al flujo Uanataca token.

---

## Campo `token_info`

El campo `token_info` se envía como **string JSON** dentro del formulario multipart. Contiene la información de envío del token físico.

### UUIDs de tipo de envío (`shippingTypeUuid`)

| Modalidad                        | UUID                                   |
|----------------------------------|----------------------------------------|
| Retiro en oficina (PICKUP)       | `591b23e8-db22-485e-884f-0ec8ca1e5b52` |
| Envío Ecuador continental        | `1ca5c108-cb25-4c52-85b5-0d4e8202b1be` |
| Envío Galápagos                  | `afb41ea2-c6d1-4130-916a-fa9a3417eab7` |

### Oficinas disponibles para PICKUP

| Ciudad     | Valor a enviar |
|------------|----------------|
| Quito      | `QUITO`        |
| Guayaquil  | `GUAYAQUIL`    |
| Manta      | `MANTA`        |

### Reglas de validación según `deliveryMethod`

| Campo                    | PICKUP     | DELIVERY           |
|--------------------------|------------|--------------------|
| `office`                 | Requerido  | Ignorado           |
| `province`               | Ignorado   | Requerido          |
| `city`                   | Ignorado   | Requerido          |
| `mainStreet`             | Ignorado   | Requerido          |
| `houseNumber`            | Ignorado   | Requerido          |
| `recipientIdentification`| Ignorado   | Requerido          |
| `recipientName`          | Ignorado   | Requerido          |
| `secondaryStreet`        | —          | Opcional           |
---

## Persona Natural con Token

**Campos adicionales requeridos** (además de los campos base de firma natural):

| Campo          | Descripción                          |
|----------------|--------------------------------------|
| `usa_token`    | `"true"` (string)                    |
| `sexo`         | `HOMBRE` o `MUJER`                   |
| `selfie`       | Base64 de la selfie                  |
| `nacionalidad` | Ej: `ECUATORIANA`                    |
| `token_info`   | JSON string con datos de envío       |

---

### Caso 1 — Natural · PICKUP (retiro en oficina)

```
POST /signatures/natural
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

**Campos del formulario:**

```
nombres              = MARIO ANDRÉS
apellidos            = LOZANO SALAZAR
numero_identificacion= 1104689321
codigo_dactilar      = A1B2C3D4
correo               = mario.lozano@gmail.com
provincia            = PICHINCHA
ciudad               = QUITO
parroquia            = IÑAQUITO
direccion            = AV. AMAZONAS N34-56 Y COLÓN, EDIFICIO AZUL
celular              = 0984123456
clave_firma          = LOZANO1104
foto_frontal         = <base64>
foto_posterior       = <base64>
selfie               = <base64>
plan_id              = clx123abc456
fecha_nacimiento     = 1990-05-15
documento            = CEDULA
usa_token            = true
sexo                 = HOMBRE
nacionalidad         = ECUATORIANA
token_info           = {"shippingTypeUuid":"591b23e8-db22-485e-884f-0ec8ca1e5b52","deliveryMethod":"PICKUP","contactName":"MARIO ANDRÉS LOZANO SALAZAR","contactPhone":"0984123456","office":"QUITO"}
```

> **Nota:** El solicitante retira el token en la oficina de Quito. Solo se requieren `contactName`, `contactPhone` y `office`.

---

### Caso 2 — Natural · DELIVERY Ecuador continental

```
POST /signatures/natural
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

**Campos del formulario:**

```
nombres              = MARIO ANDRÉS
apellidos            = LOZANO SALAZAR
numero_identificacion= 1104689321
codigo_dactilar      = A1B2C3D4
correo               = mario.lozano@gmail.com
provincia            = PICHINCHA
ciudad               = QUITO
parroquia            = IÑAQUITO
direccion            = AV. AMAZONAS N34-56 Y COLÓN, EDIFICIO AZUL
celular              = 0984123456
clave_firma          = LOZANO1104
foto_frontal         = <base64>
foto_posterior       = <base64>
selfie               = <base64>
plan_id              = clx123abc456
fecha_nacimiento     = 1990-05-15
documento            = CEDULA
usa_token            = true
sexo                 = HOMBRE
nacionalidad         = ECUATORIANA
token_info           = {"shippingTypeUuid":"1ca5c108-cb25-4c52-85b5-0d4e8202b1be","deliveryMethod":"DELIVERY","contactName":"MARIO ANDRÉS LOZANO SALAZAR","contactPhone":"0984123456","province":"PICHINCHA","city":"QUITO","mainStreet":"AV. AMAZONAS","houseNumber":"N34-56","secondaryStreet":"Y COLÓN","reference":"EDIFICIO AZUL, PISO 3","recipientIdentification":"1104689321","recipientName":"MARIO ANDRÉS LOZANO SALAZAR"}
```

> **Nota:** Envío a domicilio dentro del Ecuador continental. Requiere dirección completa y datos del receptor.

**`token_info` expandido para lectura:**

```json
{
  "shippingTypeUuid": "1ca5c108-cb25-4c52-85b5-0d4e8202b1be",
  "deliveryMethod": "DELIVERY",
  "contactName": "MARIO ANDRÉS LOZANO SALAZAR",
  "contactPhone": "0984123456",
  "province": "PICHINCHA",
  "city": "QUITO",
  "mainStreet": "AV. AMAZONAS",
  "houseNumber": "N34-56",
  "secondaryStreet": "Y COLÓN",
  "reference": "EDIFICIO AZUL, PISO 3",
  "recipientIdentification": "1104689321",
  "recipientName": "MARIO ANDRÉS LOZANO SALAZAR"
}
```

---

### Caso 3 — Natural · DELIVERY Galápagos

```
POST /signatures/natural
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

**Campos del formulario:**

```
nombres              = MARIO ANDRÉS
apellidos            = LOZANO SALAZAR
numero_identificacion= 1104689321
codigo_dactilar      = A1B2C3D4
correo               = mario.lozano@gmail.com
provincia            = GALÁPAGOS
ciudad               = PUERTO AYORA
parroquia            = SANTA CRUZ
direccion            = CALLE CHARLES DARWIN Y AV. BALTRA S/N
celular              = 0984123456
clave_firma          = LOZANO1104
foto_frontal         = <base64>
foto_posterior       = <base64>
selfie               = <base64>
plan_id              = clx123abc456
fecha_nacimiento     = 1990-05-15
documento            = CEDULA
usa_token            = true
sexo                 = HOMBRE
nacionalidad         = ECUATORIANA
token_info           = {"shippingTypeUuid":"afb41ea2-c6d1-4130-916a-fa9a3417eab7","deliveryMethod":"DELIVERY","contactName":"MARIO ANDRÉS LOZANO SALAZAR","contactPhone":"0984123456","province":"GALÁPAGOS","city":"PUERTO AYORA","mainStreet":"CALLE CHARLES DARWIN","houseNumber":"S/N","reference":"FRENTE AL PARQUE CENTRAL","recipientIdentification":"1104689321","recipientName":"MARIO ANDRÉS LOZANO SALAZAR"}
```

**`token_info` expandido para lectura:**

```json
{
  "shippingTypeUuid": "afb41ea2-c6d1-4130-916a-fa9a3417eab7",
  "deliveryMethod": "DELIVERY",
  "contactName": "MARIO ANDRÉS LOZANO SALAZAR",
  "contactPhone": "0984123456",
  "province": "GALÁPAGOS",
  "city": "PUERTO AYORA",
  "mainStreet": "CALLE CHARLES DARWIN",
  "houseNumber": "S/N",
  "reference": "FRENTE AL PARQUE CENTRAL",
  "recipientIdentification": "1104689321",
  "recipientName": "MARIO ANDRÉS LOZANO SALAZAR"
}
```

---

## Persona Jurídica con Token

**Campos adicionales requeridos** (además de los campos base de firma jurídica):

| Campo                          | Descripción                                              |
|--------------------------------|----------------------------------------------------------|
| `usa_token`                    | `"true"` (string)                                        |
| `sexo`                         | `HOMBRE` o `MUJER` (del representante legal)             |
| `selfie`                       | Base64 de la selfie del representante legal              |
| `nacionalidad`                 | Ej: `ECUATORIANA`                                        |
| `constitucion_base64`          | Base64 del documento de constitución de la empresa       |
| `aceptacion_nombramiento_base64` | Base64 del documento de aceptación del nombramiento    |
| `token_info`                   | JSON string con datos de envío                           |

---

### Caso 1 — Jurídica · PICKUP (retiro en oficina)

```
POST /signatures/juridica
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

**Campos del formulario:**

```
nombres                         = LUIS XAVIER
apellidos                       = GONZALEZ JIMENEZ
numero_identificacion           = 1752549467
codigo_dactilar                 = V43I4444
correo                          = luisg@distribucionesnexus.com
provincia                       = GUAYAS
ciudad                          = GUAYAQUIL
parroquia                       = TARQUI
direccion                       = AV. 9 DE OCTUBRE 1234 Y MALECÓN
celular                         = 0990602199
clave_firma                     = GONZALEZ1752
ruc                             = 1752549467001
razon_social                    = DISTRIBUIDORA GONZALEZ S.A.
rep_legal                       = LUIS XAVIER GONZALEZ JIMENEZ
cargo                           = GERENTE GENERAL
foto_frontal                    = <base64>
foto_posterior                  = <base64>
selfie                          = <base64>
pdf_sri_base64                  = <base64 RUC/SRI>
nombramiento_base64             = <base64 nombramiento>
constitucion_base64             = <base64 acta de constitución>
aceptacion_nombramiento_base64  = <base64 aceptación nombramiento>
plan_id                         = clx789def012
fecha_nacimiento                = 1985-03-22
documento                       = CEDULA
usa_token                       = true
sexo                            = HOMBRE
nacionalidad                    = ECUATORIANA
token_info                      = {"shippingTypeUuid":"591b23e8-db22-485e-884f-0ec8ca1e5b52","deliveryMethod":"PICKUP","contactName":"LUIS XAVIER GONZALEZ JIMENEZ","contactPhone":"0990602199","office":"GUAYAQUIL"}
```

**`token_info` expandido:**

```json
{
  "shippingTypeUuid": "591b23e8-db22-485e-884f-0ec8ca1e5b52",
  "deliveryMethod": "PICKUP",
  "contactName": "LUIS XAVIER GONZALEZ JIMENEZ",
  "contactPhone": "0990602199",
  "office": "GUAYAQUIL"
}
```

---

### Caso 2 — Jurídica · DELIVERY Ecuador continental

**Campos del formulario** (solo se muestran los distintos a Caso 1):

```
... (mismos campos base) ...
token_info = {"shippingTypeUuid":"1ca5c108-cb25-4c52-85b5-0d4e8202b1be","deliveryMethod":"DELIVERY","contactName":"LUIS XAVIER GONZALEZ JIMENEZ","contactPhone":"0990602199","province":"GUAYAS","city":"GUAYAQUIL","mainStreet":"AV. 9 DE OCTUBRE","houseNumber":"1234","secondaryStreet":"Y MALECÓN","reference":"EDIFICIO TORRES DEL MAR, PISO 5, OF. 501","recipientIdentification":"1752549467","recipientName":"LUIS XAVIER GONZALEZ JIMENEZ"}
```

**`token_info` expandido:**

```json
{
  "shippingTypeUuid": "1ca5c108-cb25-4c52-85b5-0d4e8202b1be",
  "deliveryMethod": "DELIVERY",
  "contactName": "LUIS XAVIER GONZALEZ JIMENEZ",
  "contactPhone": "0990602199",
  "province": "GUAYAS",
  "city": "GUAYAQUIL",
  "mainStreet": "AV. 9 DE OCTUBRE",
  "houseNumber": "1234",
  "secondaryStreet": "Y MALECÓN",
  "reference": "EDIFICIO TORRES DEL MAR, PISO 5, OF. 501",
  "recipientIdentification": "1752549467",
  "recipientName": "LUIS XAVIER GONZALEZ JIMENEZ"
}
```

---

### Caso 3 — Jurídica · DELIVERY Galápagos

```
... (mismos campos base) ...
token_info = {"shippingTypeUuid":"afb41ea2-c6d1-4130-916a-fa9a3417eab7","deliveryMethod":"DELIVERY","contactName":"LUIS XAVIER GONZALEZ JIMENEZ","contactPhone":"0990602199","province":"GALÁPAGOS","city":"PUERTO BAQUERIZO MORENO","mainStreet":"AV. NORTHIA","houseNumber":"S/N","reference":"FRENTE A LA CAPITANÍA DE PUERTO","recipientIdentification":"1752549467","recipientName":"LUIS XAVIER GONZALEZ JIMENEZ"}
```

**`token_info` expandido:**

```json
{
  "shippingTypeUuid": "afb41ea2-c6d1-4130-916a-fa9a3417eab7",
  "deliveryMethod": "DELIVERY",
  "contactName": "LUIS XAVIER GONZALEZ JIMENEZ",
  "contactPhone": "0990602199",
  "province": "GALÁPAGOS",
  "city": "PUERTO BAQUERIZO MORENO",
  "mainStreet": "AV. NORTHIA",
  "houseNumber": "S/N",
  "reference": "FRENTE A LA CAPITANÍA DE PUERTO",
  "recipientIdentification": "1752549467",
  "recipientName": "LUIS XAVIER GONZALEZ JIMENEZ"
}
```

---

## Respuesta exitosa (ambos endpoints)

```json
{
  "success": true,
  "message": "Solicitud enviada correctamente",
  "data": {
    "id": "clx1234567890",
    "numero_tramite": "17034425678900001",
    "perfil_firma": "PN-TOKEN-001",
    "nombres": "MARIO ANDRÉS",
    "apellidos": "LOZANO SALAZAR",
    "cedula": "1104689321",
    "status": "PENDING",
    "providerCode": "1",
    "providerMessage": "Solicitud enviada correctamente"
  },
  "balance": 450000,
  "priceCharged": 99900
}
```

## Respuesta rechazada por el proveedor

```json
{
  "success": false,
  "message": "El código dactilar no corresponde a la cédula ingresada",
  "data": {
    "id": "clx1234567890",
    "numero_tramite": "17034425678900002",
    "status": "FAILED",
    "providerCode": "0"
  },
  "balance": 450000,
  "priceCharged": 0
}
```

> En caso de rechazo, **no se cobra** al distribuidor y el `TokenInfo` se guarda igual para trazabilidad.

---

## Campo `serialToken` (opcional)

Si el distribuidor ya conoce el número de serie del token físico al momento de la solicitud, puede incluirlo en `token_info`:

```json
{
  "shippingTypeUuid": "591b23e8-db22-485e-884f-0ec8ca1e5b52",
  "deliveryMethod": "PICKUP",
  "contactName": "MARIO ANDRÉS LOZANO SALAZAR",
  "contactPhone": "0984123456",
  "office": "QUITO",
  "serialToken": "SN-ABC123456"
}
```
