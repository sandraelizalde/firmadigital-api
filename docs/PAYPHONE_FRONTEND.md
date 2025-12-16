# Integración de Cajita de Pagos Payphone - Frontend

## Descripción General

Este documento describe cómo integrar la **Cajita de Pagos de Payphone** en el frontend para procesar recargas con tarjeta de crédito/débito.

## Flujo de Integración

### 1. Iniciar Recarga (Backend)

El frontend debe llamar al endpoint del backend para iniciar la recarga:

**Endpoint:** `POST /recharges/init-card-recharge`

**Headers:**
```
Authorization: Bearer {token_jwt}
Content-Type: application/json
```

**Body:**fds
```json
{
  "requestedAmount": 10000,
  "reference": "Recarga de saldo"
}
```

**Respuesta:**
```json
{
  "rechargeId": "clxyz123abc",
  "amount": 10000,
  "clientTransactionId": "clxyz123abc",
  "payphone": {
    "token": "uk73jInqfLLWEoypWu2MXAnTxWrQ2yphHS9C0oAV...",
    "storeId": "828efefe-57c8-4f75-8852-fdcca3dd9ca5",
    "currency": "USD",
    "reference": "Recarga de saldo"
  },
  "distributor": {
    "email": "distribuidor@example.com",
    "documentId": "0123456789",
    "name": "Juan Pérez"
  }
}
```

### 2. Integrar la Cajita de Pagos en el HTML

Agregar las dependencias necesarias en el `<head>`:

```html
<head>
  <link rel="stylesheet" href="https://cdn.payphonetodoesposible.com/box/v1.1/payphone-payment-box.css">
  <script type="module" src="https://cdn.payphonetodoesposible.com/box/v1.1/payphone-payment-box.js"></script>
</head>
```

### 3. Crear el Contenedor del Botón

Agregar un contenedor donde aparecerá el botón de pago:

```html
<div id="pp-button"></div>
```

### 4. Configurar la Cajita de Pagos

Usar los datos recibidos del backend para configurar la cajita:

```javascript
// Después de recibir la respuesta del backend
const payphoneData = response.data; // Respuesta de init-card-recharge

window.addEventListener('DOMContentLoaded', () => {
  const ppb = new PPaymentButtonBox({
    // Credenciales (vienen del backend)
    token: payphoneData.payphone.token,
    storeId: payphoneData.payphone.storeId,
    
    // ID único de transacción
    clientTransactionId: payphoneData.clientTransactionId,
    
    // Montos en centavos
    amount: payphoneData.amount,
    amountWithoutTax: payphoneData.amount,
    amountWithTax: 0,
    tax: 0,
    service: 0,
    tip: 0,
    
    // Configuración general
    currency: payphoneData.payphone.currency,
    reference: payphoneData.payphone.reference,
    
    // Datos del cliente (opcional, si no se envía Payphone los solicita)
    email: payphoneData.distributor.email,
    documentId: payphoneData.distributor.documentId,
    phoneNumber: "+593999999999", // Opcional
    identificationType: 1, // 1=Cédula, 2=RUC, 3=Pasaporte
    
    // Configuración UI
    lang: "es",
    defaultMethod: "card", // card o payphone
    timeZone: -5
  }).render('pp-button');
});
```

### 5. Configurar la URL de Respuesta

En **Payphone Developer** (https://payphone.app/business), debes configurar la URL de respuesta a donde Payphone redirigirá después del pago.

**Ejemplo:** `https://tu-dominio.com/recharge-confirmation`

Payphone agregará estos parámetros a la URL:
- `id`: ID de transacción de Payphone
- `clientTransactionId`: ID de la recarga (rechargeId)

**URL completa de ejemplo:**
```
https://tu-dominio.com/recharge-confirmation?id=23178284&clientTransactionId=clxyz123abc
```

### 6. Confirmar el Pago (Backend)

Desde la página de confirmación, extraer los parámetros y llamar al backend:

```javascript
// En la página de confirmación
const urlParams = new URLSearchParams(window.location.search);
const payphoneId = parseInt(urlParams.get('id'));
const clientTransactionId = urlParams.get('clientTransactionId');

// Llamar al backend para confirmar
fetch('/recharges/confirm-card-recharge', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    id: payphoneId,
    clientTxId: clientTransactionId
  })
})
.then(response => response.json())
.then(data => {
  if (data.recharge.status === 'APPROVED') {
    // Pago aprobado
    console.log('Recarga aprobada:', data);
    // Mostrar mensaje de éxito al usuario
  } else {
    // Pago rechazado o fallido
    console.log('Recarga no aprobada:', data);
    // Mostrar mensaje de error
  }
})
.catch(error => {
  console.error('Error al confirmar:', error);
});
```

## Ejemplo Completo con React

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const RechargeWithCard = () => {
  const [amount, setAmount] = useState(10000); // $100.00 en centavos
  const [loading, setLoading] = useState(false);

  const initRecharge = async () => {
    try {
      setLoading(true);
      
      // 1. Iniciar recarga
      const response = await axios.post(
        '/recharges/init-card-recharge',
        { requestedAmount: amount },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      const data = response.data;

      // 2. Cargar scripts de Payphone si no están cargados
      if (!window.PPaymentButtonBox) {
        await loadPayphoneScripts();
      }

      // 3. Renderizar cajita de Payphone
      const ppb = new window.PPaymentButtonBox({
        token: data.payphone.token,
        storeId: data.payphone.storeId,
        clientTransactionId: data.clientTransactionId,
        amount: data.amount,
        amountWithoutTax: data.amount,
        currency: data.payphone.currency,
        reference: data.payphone.reference,
        email: data.distributor.email,
        documentId: data.distributor.documentId,
        lang: "es",
        defaultMethod: "card"
      }).render('pp-button');

      setLoading(false);
    } catch (error) {
      console.error('Error al iniciar recarga:', error);
      setLoading(false);
    }
  };

  const loadPayphoneScripts = () => {
    return new Promise((resolve, reject) => {
      // Cargar CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.payphonetodoesposible.com/box/v1.1/payphone-payment-box.css';
      document.head.appendChild(link);

      // Cargar JS
      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://cdn.payphonetodoesposible.com/box/v1.1/payphone-payment-box.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  return (
    <div>
      <h2>Recargar Saldo</h2>
      <input
        type="number"
        value={amount / 100}
        onChange={(e) => setAmount(e.target.value * 100)}
        placeholder="Monto en USD"
      />
      <button onClick={initRecharge} disabled={loading}>
        {loading ? 'Cargando...' : 'Iniciar Recarga'}
      </button>
      <div id="pp-button"></div>
    </div>
  );
};

export default RechargeWithCard;
```

## Página de Confirmación (React)

```jsx
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

const RechargeConfirmation = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [rechargeData, setRechargeData] = useState(null);

  useEffect(() => {
    const confirmPayment = async () => {
      try {
        const payphoneId = parseInt(searchParams.get('id'));
        const clientTxId = searchParams.get('clientTransactionId');

        const response = await axios.post(
          '/recharges/confirm-card-recharge',
          {
            id: payphoneId,
            clientTxId: clientTxId
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          }
        );

        setRechargeData(response.data);
        setStatus(response.data.recharge.status);
      } catch (error) {
        console.error('Error al confirmar:', error);
        setStatus('error');
      }
    };

    confirmPayment();
  }, [searchParams]);

  return (
    <div>
      {status === 'loading' && <p>Confirmando pago...</p>}
      
      {status === 'APPROVED' && (
        <div>
          <h2>¡Pago Aprobado!</h2>
          <p>Tu recarga se ha procesado exitosamente.</p>
          <p>Monto: ${rechargeData.recharge.creditedAmount / 100}</p>
          <p>Nuevo Saldo: ${rechargeData.recharge.distributor.balance / 100}</p>
        </div>
      )}
      
      {(status === 'REJECTED' || status === 'FAILED') && (
        <div>
          <h2>Pago No Aprobado</h2>
          <p>Lo sentimos, tu pago no pudo ser procesado.</p>
        </div>
      )}
      
      {status === 'error' && (
        <div>
          <h2>Error</h2>
          <p>Hubo un error al confirmar tu pago. Por favor contacta soporte.</p>
        </div>
      )}
    </div>
  );
};

export default RechargeConfirmation;
```

## Consideraciones Importantes

### ⏱️ Tiempo de Confirmación
- **CRÍTICO:** Debes confirmar el pago dentro de los **5 minutos** posteriores a la transacción
- Si no confirmas en ese tiempo, Payphone reversará automáticamente el pago

### 🌐 Dominio Autorizado
- La cajita solo funciona en el dominio configurado en Payphone Developer
- Para desarrollo local puedes usar `http://localhost`
- Para producción necesitas un dominio con certificado SSL (`https://`)

### 💵 Montos en Centavos
- Todos los montos deben enviarse en centavos
- Ejemplo: $100.00 = 10000 centavos
- $1.50 = 150 centavos

### 🔐 Seguridad
- Nunca expongas el token de Payphone directamente en el frontend
- El backend debe proporcionar las credenciales solo después de autenticar al usuario
- Valida que el usuario tenga permiso para confirmar la recarga

### 📋 Estados de Recarga
- `PENDING`: Recarga iniciada, esperando confirmación
- `APPROVED`: Pago aprobado y saldo acreditado
- `REJECTED`: Pago rechazado por el banco
- `FAILED`: Error en el procesamiento

## Endpoints del Backend

### POST /recharges/init-card-recharge
Inicia una recarga con tarjeta y retorna los datos para configurar Payphone.

### POST /recharges/confirm-card-recharge
Confirma el estado de una recarga consultando la API de Payphone.

## Referencias

- [Documentación oficial de Payphone](https://www.docs.payphone.app/cajita-de-pagos-payphone)
- [Payphone Business](https://payphone.app/business)
- [Payphone Developer](https://payphone.app/business) (configurar aplicación)
