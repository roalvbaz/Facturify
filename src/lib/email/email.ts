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
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ BREVO_API_KEY no está configurada en las variables de entorno.");
    return { success: false, error: 'Servicio de email no configurado' };
  }

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
              Adjunto encontrará el documento reglamentario en PDF con su código de verificación QR. Si tiene alguna duda sobre el documento o el pago, puede responder directamente a este mensaje.
            </p>
          </div>
          <div class="footer">
            Factura emitida electrónicamente mediante Facturify.
          </div>
        </div>
      </body>
    </html>
  `;

  const attachmentList: Array<{ name: string; content: string }> = [];
  if (pdfBase64) {
    const cleanBase64 = pdfBase64.includes('base64,') ? pdfBase64.split('base64,')[1] : pdfBase64;
    attachmentList.push({
      name: `Factura_${invoiceNumber}.pdf`,
      content: cleanBase64.replace(/\s/g, ''),
    });
  }

  const payload: any = {
    sender: {
      name: companyName || process.env.EMAIL_FROM_NAME || 'Facturify',
      email: process.env.EMAIL_FROM || 'soporte@facturify.es',
    },
    to: [{ email: to.trim(), name: clientName }],
    subject,
    htmlContent,
  };

  if (issuerUserEmail) {
    payload.replyTo = { email: issuerUserEmail };
  }

  if (attachmentList.length > 0) {
    payload.attachment = attachmentList;
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Error API Brevo:', errorData);
      return { success: false, error: 'Error enviando correo' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('❌ Error de conexión al enviar email:', error);
    return { success: false, error: error?.message || 'Error de red' };
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
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return { success: false, error: 'API Key no configurada' };

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
            <p>Le recordamos que la factura <strong>${invoiceNumber}</strong> vencerá próximamente (<strong>${dueDateFormatted}</strong>).</p>
            
            <div class="card">
              <div style="font-size: 12px; font-weight: 700; color: #64748b;">IMPORTE PENDIENTE</div>
              <div class="total">${totalEur} €</div>
              <div style="font-size: 12px; color: #dc2626; margin-top: 6px; font-weight: 600;">
                Fecha límite de pago: ${dueDateFormatted}
              </div>
            </div>

            <p style="font-size: 13px; color: #64748b;">
              Si ya ha tramitado la transferencia o el abono, ignore este mensaje. Si necesita concertar otro método o tiene alguna duda, puede responder directamente a este correo.
            </p>
          </div>
          <div class="footer">
            Notificación automática enviada a través de Facturify.
          </div>
        </div>
      </body>
    </html>
  `;

  const payload: any = {
    sender: {
      name: companyName || process.env.EMAIL_FROM_NAME || 'Facturify',
      email: process.env.EMAIL_FROM || 'soporte@facturify.es',
    },
    to: [{ email: to.trim(), name: clientName }],
    subject,
    htmlContent,
  };

  if (issuerUserEmail) {
    payload.replyTo = { email: issuerUserEmail };
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    return { success: response.ok };
  } catch (error: any) {
    return { success: false, error: error?.message };
  }
}