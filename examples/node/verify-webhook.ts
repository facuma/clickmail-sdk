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

  const signature = req.headers["x-webhook-signature"] as string;

  try {
    const event = constructWebhookEvent({
      payload: rawBody,
      signature,
      secret: process.env.CLICKMAIL_WEBHOOK_SECRET!,
    });

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
