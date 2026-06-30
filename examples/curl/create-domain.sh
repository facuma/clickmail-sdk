#!/bin/bash
# Registrar un dominio para envíos con ClickMail API

curl -X POST https://resendapi.cubells.com.ar/v1/domains \
  -H "Authorization: Bearer $CLICKMAIL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "tudominio.com"
  }'

# Una vez creado el dominio, verificar el estado:
# curl -X POST https://resendapi.cubells.com.ar/v1/domains/<id>/check \
#   -H "Authorization: Bearer $CLICKMAIL_API_KEY"
