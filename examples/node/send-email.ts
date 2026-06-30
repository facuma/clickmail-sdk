import { ClickMail, AuthenticationError, ValidationError } from "@clickmail/sdk";

const client = new ClickMail(process.env.CLICKMAIL_API_KEY!);

async function main() {
  try {
    const email = await client.emails.send({
      from: "Agencia Norte <ventas@agencianorte.com>",
      to: ["cliente@gmail.com"],
      subject: "Hola desde ClickMail",
      html: "<h1>Bienvenido</h1><p>Gracias por registrarte.</p>",
      text: "Bienvenido. Gracias por registrarte.",
    });

    console.log("Email enviado:", email.id, "→ status:", email.status);
  } catch (err) {
    if (err instanceof AuthenticationError) {
      console.error("API Key inválida. Verificá CLICKMAIL_API_KEY.");
    } else if (err instanceof ValidationError) {
      console.error("Error de validación:", err.message);
    } else {
      throw err;
    }
  }
}

main();
