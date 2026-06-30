import { ClickMail } from "@clickmail/sdk";

const client = new ClickMail(process.env.CLICKMAIL_API_KEY!);

async function main() {
  const email = await client.emails.send({
    from: "Agencia Norte <ventas@agencianorte.com>",
    to: ["cliente@gmail.com"],
    templateId: "tpl_bienvenida",
    variables: {
      name: "Juan Pérez",
      company: "Agencia Norte",
      activationLink: "https://app.example.com/activate?token=abc123",
    },
    idempotencyKey: `welcome-${Date.now()}`,
  });

  console.log("Email con template enviado:", email.id);
}

main();
