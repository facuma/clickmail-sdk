#!/bin/bash
# Enviar un email transaccional con ClickMail API

curl -X POST https://resendapi.cubells.com.ar/v1/emails \
  -H "Authorization: Bearer $CLICKMAIL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "Agencia Norte <ventas@agencianorte.com>",
    "to": ["cliente@gmail.com"],
    "subject": "Hola desde ClickMail",
    "html": "<h1>Bienvenido</h1><p>Gracias por registrarte.</p>"
  }'
