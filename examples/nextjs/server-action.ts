// app/actions/send-email.ts
// Next.js Server Action

"use server";

import { ClickMail, ValidationError } from "@clickmail/sdk";

const client = new ClickMail(process.env.CLICKMAIL_API_KEY!);

export async function sendWelcomeEmail(formData: FormData) {
  const email = formData.get("email") as string;
  const name = formData.get("name") as string;

  if (!email || !name) {
    return { error: "Email y nombre son requeridos" };
  }

  try {
    const result = await client.emails.send({
      from: "Mi App <noreply@example.com>",
      to: [email],
      subject: `Bienvenido, ${name}!`,
      html: `
        <h1>Hola ${name}</h1>
        <p>Gracias por unirte. Tu cuenta está lista.</p>
        <a href="https://app.example.com/dashboard">Ir al dashboard</a>
      `,
      metadata: { userId: "usr_abc", source: "registration" },
    });

    return { success: true, emailId: result.id };
  } catch (err) {
    if (err instanceof ValidationError) {
      return { error: err.message };
    }
    return { error: "No se pudo enviar el email" };
  }
}
