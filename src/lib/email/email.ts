import nodemailer from 'nodemailer';
import type { SendMailOptions } from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
  },
});

interface SendInvoiceEmailParams {
  to: string;
  clientName: string;
  invoiceNumber: string;
  totalEur: string;
  companyName: string;
  issuerUserEmail?: string;
  pdfBase64?: string;
}

export async function sendInvoiceEmail({
  to,
  clientName,
  invoiceNumber,
  totalEur,
  companyName,
  issuerUserEmail,
  pdfBase64,
}: SendInvoiceEmailParams) {
  try {
    const isRectification = invoiceNumber.startsWith('R-');
    const subject = isRectification 
      ? `Factura Rectificativa ${invoiceNumber} - ${companyName}` 
      : `Factura ${invoiceNumber} emitida por ${companyName}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
            .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 10px; padding: 30px; border: 1px solid #e2e8f0; }
            .header { text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 20px; }
            .title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
            .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
            .content { font-size: 14px; line-height: 1.6; color: #334155; }
            .card { background-color: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center; }
            .total { font-size: 24px; font-weight: 900; color: #0f172a; margin-top: 6px; }
            .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 class="title">${companyName}</h1>
              <p class="subtitle">Documento Fiscal Electrónico (Veri*factu)</p>
            </div>
            <div class="content">
              <p>Hola <strong>${clientName}</strong>,</p>
              <p>Le remitimos la factura <strong>${invoiceNumber}</strong> expedida por <strong>${companyName}</strong>.</p>
              
              <div class="card">
                <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">Total a Pagar</div>
                <div class="total">${totalEur} €</div>
              </div>

              <p style="font-size: 13px; color: #64748b;">
                Adjunto encontrará el documento reglamentario en PDF con su código de verificación QR. Si tiene alguna duda o notificación sobre el pago, puede responder directamente a este mensaje.
              </p>
            </div>
            <div class="footer">
              Factura emitida electrónicamente mediante FacturON.
            </div>
          </div>
        </body>
      </html>
    `;

    const mailOptions: SendMailOptions = {
      from: `"${companyName}" <${process.env.EMAIL_USER}>`,
      to: to.trim(),
      replyTo: issuerUserEmail || process.env.EMAIL_USER,
      subject,
      html: htmlContent,
    };

    if (pdfBase64) {
      const cleanBase64 = pdfBase64.includes('base64,') 
        ? pdfBase64.split('base64,')[1] 
        : pdfBase64;

      mailOptions.attachments = [
        {
          filename: `Factura_${invoiceNumber}.pdf`,
          content: Buffer.from(cleanBase64.replace(/\s/g, ''), 'base64'),
          contentType: 'application/pdf',
        },
      ];
    }

    const info = await transporter.sendMail(mailOptions);
    return { success: true, data: info };

  } catch (error: any) {
    console.error('❌ Error enviando email con Nodemailer:', error);
    return { success: false, error: error.message || 'Error al enviar el correo' };
  }
}

interface SendWelcomeEmailParams {
  to: string;
  setupLink: string; // Enlace para acceder/crear la cuenta
}

export async function sendWelcomeEmail({
  to,
  setupLink,
}: SendWelcomeEmailParams) {
  try {
    const subject = '¡Bienvenido/a a FacturON! Crea tu cuenta';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
            .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 10px; padding: 30px; border: 1px solid #e2e8f0; }
            .header { text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 20px; }
            .title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0; }
            .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
            .content { font-size: 14px; line-height: 1.6; color: #334155; }
            .cta { display: block; text-align: center; margin: 24px 0; }
            .btn { display: inline-block; background-color: #0ea5e9; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 15px; }
            .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 class="title">¡Bienvenido/a a FacturON!</h1>
              <p class="subtitle">Tu plataforma de facturación electrónica (Veri*factu)</p>
            </div>
            <div class="content">
              <p>Hola,</p>
              <p>Gracias por registrarte en <strong>FacturON</strong>. Estamos encantados de darte la bienvenida.</p>
              <p>Para completar la creación de tu cuenta, pulsa el siguiente botón:</p>

              <div class="cta">
                <a class="btn" href="${setupLink}" target="_blank">Acceder a mi cuenta</a>
              </div>

              <p style="font-size: 13px; color: #64748b;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>
                <span style="color: #0ea5e9; word-break: break-all;">${setupLink}</span>
              </p>
            </div>
            <div class="footer">
              Enviado automáticamente por FacturON. Si no has solicitado esta cuenta, ignora este mensaje.
            </div>
          </div>
        </body>
      </html>
    `;

    const mailOptions: SendMailOptions = {
      from: `"FacturON" <${process.env.EMAIL_USER}>`,
      to: to.trim(),
      subject,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, data: info };

  } catch (error: any) {
    console.error('❌ Error enviando email de bienvenida:', error);
    return { success: false, error: error.message || 'Error al enviar el correo de bienvenida' };
  }
}

interface SendRegistrationInvitationEmailParams {
  to: string;
  registerLink: string; // Enlace a la página pública /registro?invite=...
  // Contexto opcional cuando la invitación es de EQUIPO (OWNER/ADMIN que invita):
  companyName?: string;
  roleLabel?: string; // 'Miembro' | 'Administrador'
}

export async function sendRegistrationInvitationEmail({
  to,
  registerLink,
  companyName,
  roleLabel,
}: SendRegistrationInvitationEmailParams) {
  try {
    const subject = companyName
      ? `Te han invitado a ${companyName} en FacturON — Crea tu cuenta`
      : 'Tu acceso a FacturON está listo — Crea tu perfil';

    const companyIntro = companyName
      ? `<p style="margin:0 0 14px 0;">Te han invitado a unirte a la empresa <strong>${companyName}</strong>${roleLabel ? ` como <strong>${roleLabel}</strong>` : ''}. Solo te queda crear tu perfil y entrar.</p>`
      : '';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
            .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 10px; padding: 30px; border: 1px solid #e2e8f0; }
            .header { text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 20px; }
            .title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0; }
            .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
            .content { font-size: 14px; line-height: 1.6; color: #334155; }
            .cta { display: block; text-align: center; margin: 24px 0; }
            .btn { display: inline-block; background-color: #0ea5e9; color: #ffffff !important; text-decoration: none; padding: 13px 28px; border-radius: 8px; font-weight: 700; font-size: 15px; }
            .note { font-size: 12px; color: #94a3b8; background-color: #f8fafc; border-left: 3px solid #e2e8f0; padding: 10px 14px; border-radius: 6px; margin-top: 18px; }
            .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 class="title">¡Tu acceso a FacturON está listo!</h1>
              <p class="subtitle">Facturación electrónica conforme al Reglamento Veri*factu</p>
            </div>
            <div class="content">
              <p>Hola,</p>
              ${companyIntro}
              <p>Hemos preparado tu acceso a <strong>FacturON</strong>. Solo tienes que entrar en la página de registro y crear tu perfil (nombre y contraseña).${companyName ? ' Te unirás a la empresa automáticamente.' : ''}</p>

              <div class="cta">
                <a class="btn" href="${registerLink}" target="_blank">Crear mi perfil</a>
              </div>

              <p style="font-size: 13px; color: #64748b;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>
                <span style="color: #0ea5e9; word-break: break-all;">${registerLink}</span>
              </p>

              <div class="note">
                ⏳ El enlace caduca en <strong>7 días</strong>. Si caduca, solo tienes que escribirnos y te enviaremos uno nuevo.
              </div>
            </div>
            <div class="footer">
              Enviado automáticamente por FacturON. Si no solicitaste acceso a este programa, ignora este mensaje.
            </div>
          </div>
        </body>
      </html>
    `;

    const mailOptions: SendMailOptions = {
      from: `"FacturON" <${process.env.EMAIL_USER}>`,
      to: to.trim(),
      subject,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, data: info };

  } catch (error: any) {
    console.error('❌ Error enviando email de invitación de registro:', error);
    return { success: false, error: error.message || 'Error al enviar el correo de registro' };
  }
}

interface SendCompanyMemberInvitationEmailParams {
  to: string;
  acceptLink: string; // Enlace a /aceptar-invitacion?invite=...
  companyName: string;
  roleLabel?: string; // 'Miembro' | 'Administrador'
}

/** Para usuarios que YA tienen cuenta en FacturON: solo tienen que aceptar. */
export async function sendCompanyMemberInvitationEmail({
  to,
  acceptLink,
  companyName,
  roleLabel,
}: SendCompanyMemberInvitationEmailParams) {
  try {
    const subject = `Te han invitado a ${companyName} — Acepta la invitación`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
            .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 10px; padding: 30px; border: 1px solid #e2e8f0; }
            .header { text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 20px; }
            .title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0; }
            .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
            .content { font-size: 14px; line-height: 1.6; color: #334155; }
            .cta { display: block; text-align: center; margin: 24px 0; }
            .btn { display: inline-block; background-color: #0ea5e9; color: #ffffff !important; text-decoration: none; padding: 13px 28px; border-radius: 8px; font-weight: 700; font-size: 15px; }
            .note { font-size: 12px; color: #94a3b8; background-color: #f8fafc; border-left: 3px solid #e2e8f0; padding: 10px 14px; border-radius: 6px; margin-top: 18px; }
            .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 class="title">¡Te han invitado a ${companyName}!</h1>
              <p class="subtitle">FacturON — Facturación electrónica conforme a Veri*factu</p>
            </div>
            <div class="content">
              <p>Hola,</p>
              <p>Un responsable de <strong>${companyName}</strong> te ha invitado a entrar en su equipo de FacturON${roleLabel ? ` con el rol de <strong>${roleLabel}</strong>` : ''}.</p>
              <p>Como ya tienes cuenta en FacturON, solo tienes que aceptar la invitación:</p>

              <div class="cta">
                <a class="btn" href="${acceptLink}" target="_blank">Aceptar invitación</a>
              </div>

              <p style="font-size: 13px; color: #64748b;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>
                <span style="color: #0ea5e9; word-break: break-all;">${acceptLink}</span>
              </p>

              <div class="note">
                ⏳ El enlace caduca en <strong>7 días</strong>. Si pierdes el acceso, pide a la empresa que te envíe una invitación nueva. Si no esperabas esta invitación, ignora este mensaje.
              </div>
            </div>
            <div class="footer">
              Enviado automáticamente por FacturON.
            </div>
          </div>
        </body>
      </html>
    `;

    const mailOptions: SendMailOptions = {
      from: `"FacturON" <${process.env.EMAIL_USER}>`,
      to: to.trim(),
      subject,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, data: info };

  } catch (error: any) {
    console.error('❌ Error enviando email de invitación de equipo:', error);
    return { success: false, error: error.message || 'Error al enviar el correo de invitación' };
  }
}

interface SendPaymentReminderParams {
  to: string;
  clientName: string;
  invoiceNumber: string;
  totalEur: string;
  dueDateFormatted: string;
  companyName: string;
  issuerUserEmail?: string;
}

export async function sendPaymentReminderEmail({
  to,
  clientName,
  invoiceNumber,
  totalEur,
  dueDateFormatted,
  companyName,
  issuerUserEmail,
}: SendPaymentReminderParams) {
  try {
    const subject = `Recordatorio de Vencimiento: Factura ${invoiceNumber} (${companyName})`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
            .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 10px; padding: 30px; border: 1px solid #e2e8f0; }
            .header { text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 20px; }
            .title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
            .badge { display: inline-block; background-color: #fef3c7; color: #92400e; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; margin-top: 8px; }
            .content { font-size: 14px; line-height: 1.6; color: #334155; }
            .card { background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #e2e8f0; }
            .total { font-size: 22px; font-weight: 900; color: #0f172a; margin-top: 4px; }
            .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 class="title">${companyName}</h1>
              <div class="badge">Aviso de Vencimiento Próximo</div>
            </div>
            <div class="content">
              <p>Estimado/a <strong>${clientName}</strong>,</p>
              <p>Le recordamos que la factura <strong>${invoiceNumber}</strong> vencerá en <strong>7 días (${dueDateFormatted})</strong>.</p>
              
              <div class="card">
                <div style="font-size: 12px; font-weight: 700; color: #64748b;">IMPORTE PENDIENTE</div>
                <div class="total">${totalEur} €</div>
                <div style="font-size: 12px; color: #dc2626; margin-top: 6px; font-weight: 600;">
                  Fecha límite de pago: ${dueDateFormatted}
                </div>
              </div>

              <p style="font-size: 13px; color: #64748b;">
                Si ya ha tramitado la transferencia o el pago, por favor ignore este mensaje. Si necesita concertar otro método o tiene alguna duda, puede responder directamente a este correo.
              </p>
            </div>
            <div class="footer">
              Notificación automática enviada a través de FacturON.
            </div>
          </div>
        </body>
      </html>
    `;

    const mailOptions: SendMailOptions = {
      from: `"${companyName}" <${process.env.EMAIL_USER}>`,
      to: to.trim(),
      replyTo: issuerUserEmail || process.env.EMAIL_USER,
      subject,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, data: info };

  } catch (error: any) {
    console.error('❌ Error enviando email de recordatorio:', error);
    return { success: false, error: error.message || 'Error al enviar el recordatorio' };
  }
}

interface SendResetPasswordEmailParams {
  to: string;
  code: string; // Código OTP de 6 dígitos
}

export async function sendResetPasswordEmail({
  to,
  code,
}: SendResetPasswordEmailParams) {
  try {
    const subject = 'Código de verificación — FacturON';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
            .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 10px; padding: 30px; border: 1px solid #e2e8f0; }
            .header { text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 20px; }
            .title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0; }
            .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
            .content { font-size: 14px; line-height: 1.6; color: #334155; }
            .code-box { background-color: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 10px; padding: 20px; margin: 24px 0; text-align: center; }
            .code { font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #0f172a; font-family: 'Courier New', monospace; }
            .note { font-size: 12px; color: #94a3b8; background-color: #f8fafc; border-left: 3px solid #e2e8f0; padding: 10px 14px; border-radius: 6px; margin-top: 18px; }
            .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 class="title">Código de Verificación</h1>
              <p class="subtitle">Facturación electrónica conforme al Reglamento Veri*factu</p>
            </div>
            <div class="content">
              <p>Hola,</p>
              <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta de <strong>FacturON</strong>.</p>
              <p>Utiliza el siguiente código de verificación:</p>

              <div class="code-box">
                <div class="code">${code}</div>
              </div>

              <p style="font-size: 13px; color: #64748b;">
                Introduce este código en la página de recuperación de contraseña junto con tu nueva contraseña.
              </p>

              <div class="note">
                🔒 El código caduca en <strong>5 minutos</strong>. Si no has solicitado este cambio, ignora este correo; tu contraseña no cambiará.
              </div>
            </div>
            <div class="footer">
              Enviado automáticamente por FacturON. Si no has solicitado restablecer tu contraseña, ignora este mensaje.
            </div>
          </div>
        </body>
      </html>
    `;

    const mailOptions: SendMailOptions = {
      from: `"FacturON" <${process.env.EMAIL_USER}>`,
      to: to.trim(),
      subject,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, data: info };

  } catch (error: any) {
    console.error('❌ Error enviando email de recuperación de contraseña:', error);
    return { success: false, error: error.message || 'Error al enviar el correo de recuperación' };
  }
}

interface SendEstimateEmailParams {
  to: string;
  clientName: string;
  estimateNumber: string; // p. ej. "P-2026-0001"
  totalEur: string;
  companyName: string;
  issuerUserEmail?: string;
  acceptLink: string; // Enlace público /presupuesto/<token>
  expiryDate?: string; // '10/09/2026' o undefined si no hay validez
}

/** Presupuesto con enlace de respuesta pública (Aceptar / Rechazar / Pedir modificación). */
export async function sendEstimateEmail({
  to,
  clientName,
  estimateNumber,
  totalEur,
  companyName,
  issuerUserEmail,
  acceptLink,
  expiryDate,
}: SendEstimateEmailParams) {
  try {
    const subject = `Presupuesto ${estimateNumber} — ${companyName}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
            .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 10px; padding: 30px; border: 1px solid #e2e8f0; }
            .header { text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 20px; }
            .title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
            .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
            .content { font-size: 14px; line-height: 1.6; color: #334155; }
            .card { background-color: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center; }
            .total { font-size: 24px; font-weight: 900; color: #0f172a; margin-top: 6px; }
            .cta { display: block; text-align: center; margin: 24px 0; }
            .btn { display: inline-block; background-color: #0ea5e9; color: #ffffff !important; text-decoration: none; padding: 13px 28px; border-radius: 8px; font-weight: 700; font-size: 15px; }
            .note { font-size: 12px; color: #94a3b8; background-color: #f8fafc; border-left: 3px solid #e2e8f0; padding: 10px 14px; border-radius: 6px; margin-top: 18px; }
            .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 class="title">${companyName}</h1>
              <p class="subtitle">Presupuesto sin compromiso</p>
            </div>
            <div class="content">
              <p>Hola <strong>${clientName}</strong>,</p>
              <p>${companyName} le remite el presupuesto <strong>${estimateNumber}</strong>.</p>

              <div class="card">
                <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">Importe del Presupuesto</div>
                <div class="total">${totalEur} €</div>
                ${expiryDate ? `<div style="font-size: 12px; color: #64748b; margin-top: 4px;">Validez hasta el ${expiryDate}</div>` : ''}
              </div>

              <p style="font-size: 14px; color: #334155;">
                Para revisar el detalle, aceptarlo o proponer cambios, pulse el siguiente botón:
              </p>

              <div class="cta">
                <a class="btn" href="${acceptLink}" target="_blank">Ver y responder al presupuesto</a>
              </div>

              <p style="font-size: 13px; color: #64748b;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>
                <span style="color: #0ea5e9; word-break: break-all;">${acceptLink}</span>
              </p>

              <div class="note">
                ⏳ El enlace caduca en <strong>7 días</strong>. Si vence, pide a ${companyName} que lo vuelva a enviar. Al aceptar, ${companyName} podrá emitir la factura correspondiente.
              </div>
            </div>
            <div class="footer">
              Enviado electrónicamente mediante FacturON.
            </div>
          </div>
        </body>
      </html>
    `;

    const mailOptions: SendMailOptions = {
      from: `"${companyName}" <${process.env.EMAIL_USER}>`,
      to: to.trim(),
      replyTo: issuerUserEmail || process.env.EMAIL_USER,
      subject,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, data: info };

  } catch (error: any) {
    console.error('❌ Error enviando email de presupuesto:', error);
    return { success: false, error: error.message || 'Error al enviar el correo de presupuesto' };
  }
}