// Verificación del token de Google reCAPTCHA v2 (Server Action / API routes).
// Extraído a un helper compartido para usarlo en login, registro y otros
// formularios públicos.
export async function verifyRecaptcha(token: string): Promise<boolean> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  if (!secretKey) return false;

  try {
    const response = await fetch(
      `https://www.google.com/recaptcha/api/siteverify`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `secret=${secretKey}&response=${token}`,
      }
    );

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('Error al verificar reCAPTCHA:', error);
    return false;
  }
}