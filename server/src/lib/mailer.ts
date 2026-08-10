import nodemailer from 'nodemailer';

// Configuración por variables de entorno. Si no hay SMTP_HOST, el envío por
// email queda deshabilitado y el mensaje solo se guarda en la BD (visible en admin).
const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, CONTACT_TO, CONTACT_FROM } = process.env;
const port = Number(SMTP_PORT ?? 587);

const transporter = SMTP_HOST
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: port === 465,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    })
  : null;

export const mailerEnabled = Boolean(transporter);

export type ContactPayload = { name: string; email: string; subject: string; message: string };

/** Envía el mensaje de contacto por email. Devuelve false si SMTP no está configurado. */
export async function sendContactEmail(msg: ContactPayload): Promise<boolean> {
  if (!transporter) return false;
  const to = CONTACT_TO ?? SMTP_USER;
  await transporter.sendMail({
    from: CONTACT_FROM ?? SMTP_USER ?? 'no-reply@chachopetshop.com',
    to,
    replyTo: msg.email,
    subject: `[Contacto web] ${msg.subject}`,
    text: `Nuevo mensaje desde la web de Chacho Pet Shop\n\nNombre: ${msg.name}\nEmail: ${msg.email}\nAsunto: ${msg.subject}\n\n${msg.message}`,
  });
  return true;
}
