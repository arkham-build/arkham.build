import type { Mailer } from "./mailer.ts";
import type { EmailTemplate } from "./templates/base.ts";

export class EmailService<M extends Mailer = Mailer> {
  mailer: M;

  constructor(mailer: M) {
    this.mailer = mailer;
  }

  async sendTemplate(template: EmailTemplate, to: string): Promise<void> {
    await this.mailer.send(to, template.subject, template.text);
  }
}

export function createEmailService<M extends Mailer>(mailer: M) {
  return new EmailService(mailer);
}
