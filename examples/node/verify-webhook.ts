import { createServer } from "node:http";
import { constructWebhookEvent, ClickMailError } from "@clickmail/sdk/webhook";

const server = createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/webhook") {
    res.writeHead(404).end();
    return;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const rawBody = Buffer.concat(chunks);

  try {
    const event = constructWebhookEvent({
      payload: rawBody,
      headers: req.headers, // lee X-Webhook-Signature
      secret: process.env.CLICKMAIL_WEBHOOK_SECRET!,
    });

    // La entrega es at-least-once: deduplicá por event.id (no cambia entre reintentos).
    switch (event.type) {
      case "email.delivered":
        console.log("Email entregado:", event.data.email_id);
        break;
      case "email.bounced":
        console.log("Email rebotó:", event.data.email_id);
        break;
      case "email.complained":
        console.log("Queja recibida para:", event.data.recipients);
        break;
      case "email.received":
        console.log(`Mail recibido de ${event.data.from.email}: ${event.data.subject}`);
        for (const att of event.data.attachments) {
          // download_url requiere una API key con inbound:read
          console.log("Adjunto:", att.filename, att.stored ? att.download_url : "(no guardado)");
        }
        break;
      default:
        console.log("Evento:", event.type);
    }

    res.writeHead(200, { "Content-Type": "application/json" }).end(
      JSON.stringify({ received: true })
    );
  } catch (err) {
    if (err instanceof ClickMailError) {
      res.writeHead(400).end(err.message);
    } else {
      res.writeHead(500).end("Internal error");
    }
  }
});

server.listen(3000, () => {
  console.log("Webhook server listening on http://localhost:3000/webhook");
});
