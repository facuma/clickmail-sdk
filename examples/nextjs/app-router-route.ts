// app/api/send/route.ts
// Next.js App Router — Route Handler

import { ClickMail, AuthenticationError, ValidationError } from "@clickmail/sdk";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const client = new ClickMail(process.env.CLICKMAIL_API_KEY!);

  let body: { to: string; name: string };
  try {
    body = (await request.json()) as { to: string; name: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.to) {
    return NextResponse.json({ error: "Missing 'to'" }, { status: 400 });
  }

  try {
    const result = await client.emails.send({
      from: "Mi App <noreply@example.com>",
      to: [body.to],
      subject: `Bienvenido, ${body.name}!`,
      html: `<p>Hola <strong>${body.name}</strong>, gracias por registrarte.</p>`,
    });

    return NextResponse.json({ id: result.id, status: result.status });
  } catch (err) {
    if (err instanceof AuthenticationError) {
      return NextResponse.json({ error: "API key inválida" }, { status: 500 });
    }
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    return NextResponse.json({ error: "Error al enviar email" }, { status: 500 });
  }
}
