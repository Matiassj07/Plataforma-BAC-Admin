"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import type { ConfigCorreo } from "./correos";
import { enviarEmail } from "@/lib/admin/smtp";
import sanitizeHtml from "sanitize-html";

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "b", "strong", "i", "em", "u", "ul", "ol", "li", "a", "span", "div", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "font", "img", "blockquote", "table", "thead", "tbody", "tr", "td", "th"],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "width", "height"],
    font: ["size", "color"],
    span: ["style"],
    div: ["style"],
    td: ["style", "colspan", "rowspan"],
    th: ["style", "colspan", "rowspan"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedStyles: {
    "*": {
      color: [/.*/],
      "background-color": [/.*/],
      "text-align": [/.*/],
      "font-size": [/.*/],
      "font-weight": [/.*/],
      "font-style": [/.*/],
      "text-decoration": [/.*/],
      padding: [/.*/],
      margin: [/.*/],
      border: [/.*/],
    },
  },
};

export async function guardarConfigCorreo(config: ConfigCorreo) {
  const admin = await requireAdmin();
  const supabase = createAdminClient();

  const { data: existente } = await supabase
    .from("config_correo")
    .select("id")
    .maybeSingle();

  const nombreRemitente = config.nombre_remitente
    ? config.nombre_remitente.replace(/["\r\n]/g, "").trim()
    : null;

  const payload = {
    admin_id: admin.id,
    proveedor: config.proveedor,
    smtp_host: config.smtp_host || null,
    smtp_port: config.smtp_port || null,
    smtp_user: config.smtp_user || null,
    smtp_password: config.smtp_password || null,
    tls: config.tls ?? true,
    nombre_remitente: nombreRemitente,
    email_respuesta: config.email_respuesta || null,
    activo: config.activo,
  };

  const { error } = existente
    ? await supabase.from("config_correo").update(payload).eq("id", existente.id)
    : await supabase.from("config_correo").insert(payload);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/correos");
}

export async function guardarPlantillaCorreo(
  id: string | undefined,
  data: {
    tipo: string;
    asunto: string;
    cuerpo: string;
  }
) {
  await requireAdmin();
  const supabase = createAdminClient();

  const sanitizedData = {
    ...data,
    cuerpo: sanitizeHtml(data.cuerpo, SANITIZE_OPTIONS),
  };

  if (id) {
    const { error } = await supabase
      .from("plantillas_correo")
      .update({ ...sanitizedData, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("plantillas_correo").insert(sanitizedData);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/admin/correos");
}

export async function eliminarPlantillaCorreo(id: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase.from("plantillas_correo").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/correos");
}

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const ALLOWED_ATTACH_EXTS = ["pdf", "doc", "docx", "xls", "xlsx", "csv", "txt", "png", "jpg", "jpeg", "zip"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function enviarCorreoCompleto(formData: FormData) {
  const admin = await requireAdmin();
  const supabase = createAdminClient();

  const asunto = (formData.get("asunto") as string)?.trim();
  const cuerpoHtml = formData.get("cuerpo") as string;
  const destinatariosRaw = formData.get("destinatarios") as string;

  if (!asunto) throw new Error("El asunto es obligatorio.");
  if (!cuerpoHtml?.trim()) throw new Error("El cuerpo del correo es obligatorio.");
  if (!destinatariosRaw?.trim()) throw new Error("Selecciona al menos un destinatario.");

  const sanitizedHtml = sanitizeHtml(cuerpoHtml, SANITIZE_OPTIONS);

  let destinatarios: { email: string; id: string | null }[];
  try {
    destinatarios = JSON.parse(destinatariosRaw);
  } catch {
    throw new Error("Formato de destinatarios inválido.");
  }

  if (!Array.isArray(destinatarios) || destinatarios.length === 0) {
    throw new Error("Selecciona al menos un destinatario.");
  }

  for (const dest of destinatarios) {
    if (!dest.email || !EMAIL_RE.test(dest.email)) {
      throw new Error(`Email inválido: ${dest.email || "(vacío)"}`);
    }
  }

  const attachments: { filename: string; content: Buffer | Uint8Array }[] = [];
  const archivos = formData.getAll("adjuntos") as File[];
  for (const file of archivos) {
    if (!file || file.size === 0) continue;
    if (file.size > MAX_ATTACHMENT_SIZE) throw new Error(`El archivo ${file.name} supera los 10 MB.`);
    const ext = (file.name.split(".").pop() ?? "").toLowerCase();
    if (!ALLOWED_ATTACH_EXTS.includes(ext)) throw new Error(`Tipo de archivo no permitido: ${file.name}`);
    const buffer = new Uint8Array(await file.arrayBuffer());
    attachments.push({ filename: file.name, content: buffer });
  }

  const resultados = await Promise.allSettled(
    destinatarios.map(async (dest) => {
      const result = await enviarEmail({
        to: dest.email,
        subject: asunto,
        html: sanitizedHtml,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      return { ...dest, ...result };
    })
  );

  const filas = resultados.map((r, i) => {
    const dest = destinatarios[i];
    const ok = r.status === "fulfilled" && r.value.ok;
    const errorMsg = r.status === "fulfilled"
      ? r.value.error
      : String((r as PromiseRejectedResult).reason?.message ?? (r as PromiseRejectedResult).reason ?? "Error desconocido");
    return {
      destinatario_id: dest.id,
      asunto: dest.id ? asunto : `${asunto} (${dest.email})`,
      tipo: "manual",
      estado: ok ? ("enviado" as const) : ("error" as const),
      error_detalle: ok ? null : (errorMsg || null),
    };
  });

  await supabase.from("historial_correos").insert(filas);

  // Restore side effects for client-specific sends (notas + notificaciones)
  const clienteIds = destinatarios.filter((d) => d.id).map((d) => d.id!);
  for (const clienteId of clienteIds) {
    const envio = filas.find((f) => f.destinatario_id === clienteId);
    if (!envio) continue;

    await supabase.from("notas_internas").insert({
      profile_id: clienteId,
      autor_id: admin.id,
      contenido: `Correo enviado: ${asunto}`,
      visible_cliente: true,
    }).then(() => {});

    if (envio.estado === "enviado") {
      await supabase.from("notificaciones_cliente").insert({
        profile_id: clienteId,
        tipo: "correo",
        titulo: "Correo recibido",
        descripcion: `Se envió un correo: "${asunto}"`,
        modulo: "Correos",
      }).then(() => {});
    }

    revalidatePath(`/admin/clientes/${clienteId}`);
  }

  const enviados = resultados.filter((r) => r.status === "fulfilled" && r.value.ok).length;
  const errores = resultados.length - enviados;

  revalidatePath("/admin/correos");
  return { enviados, errores, total: resultados.length };
}
