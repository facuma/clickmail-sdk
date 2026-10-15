import { ClickMail } from "@clickmail/sdk";

// La API key necesita los scopes inbound:read (leer) e inbound:write (responder).
const client = new ClickMail(process.env.CLICKMAIL_API_KEY!);

async function main() {
  // Alta de una dirección de recepción (por ejemplo, al empezar un mandato)
  const address = await client.inbound.addresses.create({
    localPart: "mandato-42",
    host: "inbound.tudominio.com",
  });
  console.log("Recibiendo en:", address.address);

  const { data } = await client.inbound.list({ status: "PROCESSED", limit: 10 });
  const first = data[0];
  if (!first) {
    console.log("No hay mails recibidos.");
    return;
  }

  const email = await client.inbound.get(first.id);
  console.log(`De: ${email.fromEmail} — Asunto: ${email.subject}`);

  for (const att of email.attachments.filter((a) => a.stored)) {
    const { url } = await client.inbound.getAttachment(email.id, att.id);
    console.log(`Adjunto ${att.filename}: ${url}`); // URL prefirmada de corta duración
  }

  // La respuesta va al Reply-To (o From) original y queda en el mismo hilo.
  const reply = await client.inbound.reply(email.id, {
    from: "Soporte <soporte@tudominio.com>",
    text: "¡Gracias! Ya lo estamos revisando.",
    replyAll: true,
    attachments: [{ filename: "recibo.txt", content: Buffer.from("Recibo #42") }],
  });
  console.log("Respuesta encolada:", reply.id);

  // Entregas de webhooks fallidas: ver la respuesta y reenviar.
  const failed = await client.webhooks.deliveries.list({ status: "FAILED", limit: 5 });
  for (const d of failed.data) {
    console.log(`${d.eventType} → ${d.url}: ${d.lastError}`);
    await client.webhooks.deliveries.redeliver(d.id);
  }
}

// Baja al terminar el mandato: deja de recibir pero conserva el historial
export async function closeMandate(addressId: string, senderId: string) {
  await client.inbound.addresses.disable(addressId);
  await client.senders.disable(senderId);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
