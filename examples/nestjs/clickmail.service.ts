// src/mail/clickmail.service.ts
// NestJS Injectable Service

import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ClickMail, ClickMailError } from "@clickmail/sdk";

@Injectable()
export class ClickMailService {
  private readonly client: ClickMail;

  constructor(private readonly configService: ConfigService) {
    this.client = new ClickMail(
      this.configService.getOrThrow<string>("CLICKMAIL_API_KEY")
    );
  }

  async sendWelcomeEmail(to: string, name: string): Promise<{ id: string }> {
    const result = await this.client.emails.send({
      from: "Mi App <noreply@example.com>",
      to: [to],
      subject: `Bienvenido a la plataforma, ${name}!`,
      html: `
        <h1>Hola ${name}</h1>
        <p>Tu cuenta ha sido creada exitosamente.</p>
      `,
      text: `Hola ${name}. Tu cuenta ha sido creada exitosamente.`,
    });

    return { id: result.id };
  }

  async sendPasswordReset(to: string, resetLink: string): Promise<{ id: string }> {
    const result = await this.client.emails.send({
      from: "Seguridad <security@example.com>",
      to: [to],
      subject: "Restablecer contraseña",
      html: `
        <p>Recibimos una solicitud para restablecer tu contraseña.</p>
        <a href="${resetLink}">Restablecer contraseña</a>
        <p>Este link expira en 1 hora.</p>
      `,
      idempotencyKey: `password-reset-${to}-${Date.now()}`,
    });

    return { id: result.id };
  }

  async sendWithTemplate(
    to: string,
    templateId: string,
    variables: Record<string, unknown>
  ): Promise<{ id: string }> {
    try {
      const result = await this.client.emails.send({
        from: "Mi App <noreply@example.com>",
        to: [to],
        templateId,
        variables,
      });
      return { id: result.id };
    } catch (err) {
      if (err instanceof ClickMailError) {
        throw new Error(`ClickMail error [${err.code}]: ${err.message}`);
      }
      throw err;
    }
  }
}
