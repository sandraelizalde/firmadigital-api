# Ejemplo de Uso - API de Firmas Digitales

## Crear Solicitud de Firma Digital

### Request
```bash
POST /signatures
Authorization: Bearer <token_del_distribuidor>
Content-Type: application/json
```

### Body
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
  "ruc": "",
  "clavefirma": "GONZALEZ1752",
  "foto_frontal": "https://example.com/frontal.jpg",
  "foto_posterior": "https://example.com/posterior.jpg",
  "perfil_firma": "018",
  "dateOfBirth": "1990-05-15",
}
```

### Response Exitosa (codigo: 1)
```json
{
  "success": true,
  "message": "Solicitud enviada correctamente",
  "data": {
    "id": "clx1234567890",
    "numero_tramite": "DIST1703342567890001",
    "perfil_firma": "018",
    "nombres": "LUIS XAVIER",
    "apellidos": "GONZALEZ JIMENEZ",
    "cedula": "1752549467",
    "correo": "luisg@solucionesnexus.com",
    "codigo_dactilar": "V43I4444",
    "celular": "0990602199",
    "provincia": "PICHINCHA",
    "ciudad": "QUITO",
    "parroquia": "IÑAQUITO",
    "direccion": "QUITUS COLONIAL",
    "dateOfBirth": "1990-05-15T00:00:00.000Z",
    "foto_frontal": "https://example.com/frontal.jpg",
    "foto_posterior": "https://example.com/posterior.jpg",
    "clavefirma": "GONZALEZ1752",
    "ruc": null,
    "pais": "ECUADOR",
    "status": "PENDING",
    "providerCode": "1",
    "providerMessage": "Solicitud enviada correctamente",
    "activeNotification": true,
    "distributorId": "clxdist123",
    "createdAt": "2025-12-23T10:30:00.000Z",
    "updatedAt": "2025-12-23T10:30:00.000Z"
  }
}
```

### Response con Error (codigo: 0)
```json
{
  "success": false,
  "message": "El código dactilar no corresponde a la cédula ingresada",
  "data": {
    "id": "clx1234567890",
    "numero_tramite": "DIST1703342567890001",
    "perfil_firma": "018",
    "nombres": "LUIS XAVIER",
    "apellidos": "GONZALEZ JIMENEZ",
    "cedula": "1752549467",
    "status": "FAILED",
    "providerCode": "0",
    "providerMessage": "El código dactilar no corresponde a la cédula ingresada",
    "createdAt": "2025-12-23T10:30:00.000Z"
  }
}
```

## Formato de Respuesta del Proveedor ENEXT

El proveedor responde con el siguiente formato:

```json
{
  "codigo": 0,
  "mensaje": "El código dactilar no corresponde a la cédula ingresada"
}
```

### Códigos de Respuesta
- `codigo: 1` - Solicitud exitosa, se procesa la firma
- `codigo: 0` - Error en la solicitud, revisar el mensaje

## Configuración Requerida en .env

```env
# URL del API para personas naturales
SIGN_PROVIDER_BASE_URL_NATURAL="https://enext.online/factureroV2/apiFactu/PN3.php"

# Credenciales del proveedor (van en el payload)
SIGN_PROVIDER_USER="erikasuarez99colla@gmail.com"
SIGN_PROVIDER_PASSWORD="SuarezCL.2025*"

# Credenciales para Basic Auth
SIGN_PROVIDER_AUTH_USERNAME="apifac"
SIGN_PROVIDER_AUTH_PASSWORD="factu465"
```

## Estados de las Solicitudes

| Estado | Descripción |
|--------|-------------|
| `PENDING` | Solicitud enviada exitosamente y en proceso |
| `FAILED` | Error al procesar la solicitud |
| `COMPLETED` | Firma procesada exitosamente |
| `REJECTED` | Solicitud rechazada |

## Notas Importantes

1. **Autenticación**: Se usa Basic Auth con las credenciales `SIGN_PROVIDER_AUTH_USERNAME` y `SIGN_PROVIDER_AUTH_PASSWORD`
2. **Payload**: El usuario y password del proveedor se incluyen en el cuerpo de la solicitud
3. **Número de trámite**: Se genera automáticamente con formato `DIST{timestamp}{random}`
4. **Timeout**: Las solicitudes al proveedor tienen un timeout de 30 segundos
5. **Validación**: Solo distribuidores activos pueden crear solicitudes
6. **Logs**: Todas las solicitudes y respuestas se registran en los logs del servidor
7. **Campos en mayúsculas**: nombres, apellidos, provincia, ciudad, parroquia y dirección se convierten automáticamente a mayúsculas
