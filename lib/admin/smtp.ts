import nodemailer from "nodemailer";
import { createAdminClient } from "@/lib/supabase/admin";

interface ConfigCorreoRow {
  proveedor: string;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_user: string | null;
  smtp_password: string | null;
  tls: boolean;
  nombre_remitente: string | null;
  email_respuesta: string | null;
  activo: boolean;
}

async function getActiveConfig(): Promise<ConfigCorreoRow | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("config_correo")
    .select("*")
    .eq("activo", true)
    .limit(1)
    .maybeSingle();
  return data as ConfigCorreoRow | null;
}

function buildTransporter(config: ConfigCorreoRow) {
  const defaults: Record<string, { host: string; port: number }> = {
    outlook: { host: "smtp.office365.com", port: 587 },
  };
  const fallback = defaults[config.proveedor] ?? { host: "", port: 587 };
  const host = config.smtp_host || fallback.host;
  const port = config.smtp_port || fallback.port;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user: config.smtp_user ?? "",
      pass: config.smtp_password ?? "",
    },
    tls: { rejectUnauthorized: config.tls ?? true },
  });
}

export async function enviarEmail(params: {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer | Uint8Array }[];
}): Promise<{ ok: boolean; error?: string }> {
  const config = await getActiveConfig();
  if (!config) {
    return { ok: false, error: "No hay proveedor de correo activo configurado (ver /admin/correos)" };
  }

  if (!config.smtp_host && config.proveedor !== "outlook") {
    return { ok: false, error: "Falta el host SMTP en la configuración de correo" };
  }

  if (!config.smtp_user || !config.smtp_password) {
    return { ok: false, error: "Faltan credenciales SMTP (usuario o contraseña)" };
  }

  const transporter = buildTransporter(config);
  const safeName = config.nombre_remitente
    ? config.nombre_remitente.replace(/["\r\n\\]/g, "").trim()
    : null;
  const from = safeName
    ? `"${safeName}" <${config.smtp_user}>`
    : config.smtp_user;

  try {
    await transporter.sendMail({
      from,
      replyTo: config.email_respuesta || undefined,
      to: params.to,
      subject: params.subject,
      html: params.html,
      attachments: params.attachments?.map((a) => ({
        filename: a.filename,
        content: Buffer.from(a.content),
      })),
    });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Error desconocido al enviar correo" };
  }
}
