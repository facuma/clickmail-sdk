// src/mail/mail.controller.ts
// NestJS Controller

import { Controller, Post, Body, HttpException, HttpStatus } from "@nestjs/common";
import { ClickMailService } from "./clickmail.service.js";
import { ClickMailError } from "@clickmail/sdk";

interface SendEmailDto {
  to: string;
  name: string;
}

@Controller("mail")
export class MailController {
  constructor(private readonly mailService: ClickMailService) {}

  @Post("welcome")
  async sendWelcome(@Body() dto: SendEmailDto) {
    try {
      const result = await this.mailService.sendWelcomeEmail(dto.to, dto.name);
      return { success: true, emailId: result.id };
    } catch (err) {
      if (err instanceof ClickMailError) {
        throw new HttpException(
          { error: err.message, code: err.code },
          err.statusCode >= 500 ? HttpStatus.INTERNAL_SERVER_ERROR : err.statusCode
        );
      }
      throw new HttpException("Error al enviar email", HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
