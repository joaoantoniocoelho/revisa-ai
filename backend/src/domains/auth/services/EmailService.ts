import { Resend } from 'resend';

export interface SendVerificationEmailParams {
  to: string;
  name: string;
  /** Backend URL: GET /api/auth/verify-email?token=... (backend verifies and redirects to front /email-verified?status=...) */
  verifyUrl: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export class EmailService {
  private readonly resendApiKey = process.env.RESEND_API_KEY;
  private readonly fromEmail = process.env.FROM_EMAIL ?? '';
  private readonly supportEmail = 'revisaai.app@gmail.com';

  async sendVerificationEmail(params: SendVerificationEmailParams): Promise<void> {
    const { to, name, verifyUrl } = params;

    if (!this.resendApiKey || !this.fromEmail) {
      console.log('[EmailService] Verification email (stub) – RESEND_API_KEY or FROM_EMAIL not set');
      return;
    }

    const normalizedVerifyUrl = typeof verifyUrl === 'string' ? verifyUrl.trim() : '';
    if (!normalizedVerifyUrl) {
      console.warn('[EmailService] sendVerificationEmail: invalid verifyUrl');
      return;
    }
    let parsedVerifyUrl: URL;
    try {
      parsedVerifyUrl = new URL(normalizedVerifyUrl);
      if (
        parsedVerifyUrl.protocol !== 'http:' &&
        parsedVerifyUrl.protocol !== 'https:'
      ) {
        throw new Error('Invalid protocol');
      }
    } catch {
      console.warn('[EmailService] sendVerificationEmail: invalid verifyUrl');
      return;
    }
    const finalVerifyUrl = parsedVerifyUrl.toString();

    const safeName = escapeHtml(name);
    const safeVerifyUrl = escapeHtml(finalVerifyUrl);
    const resend = new Resend(this.resendApiKey);

    const { data, error } = await resend.emails.send({
      from: this.fromEmail,
      to,
      subject: 'Confirme seu email – Revisa Aí',
      text: [
        `Olá, ${name}!`,
        '',
        'Confirme seu email para liberar a geração de flashcards.',
        '',
        `Link: ${finalVerifyUrl}`,
        '',
        `Dúvidas? Fale com a gente: ${this.supportEmail}`,
        '',
        'Se você não criou uma conta, pode ignorar este email.',
      ].join('\n'),
      html: `
        <!doctype html>
        <html lang="pt-BR">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Confirme seu email</title>
          </head>
          <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;padding:32px 16px;">
              <tr>
                <td align="center">
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
                    <tr>
                      <td style="background:#3b82f6;padding:24px 28px;">
                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td style="font-size:20px;font-weight:700;line-height:1.2;color:#ffffff;">
                              Revisa Aí
                            </td>
                          </tr>
                          <tr>
                            <td style="padding-top:8px;font-size:14px;line-height:1.5;color:#dbeafe;">
                              PDF para flashcards em segundos
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:28px;">
                        <p style="margin:0 0 12px;font-size:16px;line-height:1.6;color:#0f172a;">
                          Olá, <strong>${safeName}</strong>!
                        </p>
                        <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#334155;">
                          Para ativar sua conta e liberar a geração de flashcards, confirme seu email clicando no botão abaixo.
                        </p>

                        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 22px;">
                          <tr>
                            <td align="center" style="border-radius:12px;background:#2563eb;">
                              <a href="${safeVerifyUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 20px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                                Confirmar email
                              </a>
                            </td>
                          </tr>
                        </table>

                        <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#64748b;">
                          Se o botão não funcionar, copie e cole este link no navegador:
                        </p>
                        <p style="margin:0 0 20px;word-break:break-all;font-size:12px;line-height:1.6;color:#2563eb;">
                          <a href="${safeVerifyUrl}" target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:underline;">${safeVerifyUrl}</a>
                        </p>

                        <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
                          Se você não criou uma conta, pode ignorar este email.
                        </p>
                        <p style="margin:12px 0 0;font-size:13px;line-height:1.6;color:#64748b;">
                          Dúvidas? <a href="mailto:${this.supportEmail}" style="color:#2563eb;text-decoration:underline;">${this.supportEmail}</a>
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.6;color:#64748b;">
                        Enviado por Revisa Aí.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `.trim(),
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error('No data returned from Resend');
    }

    console.log('[EmailService] Verification email sent:', data.id ?? 'ok');
  }
}
