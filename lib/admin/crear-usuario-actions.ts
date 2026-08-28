"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { SECTOR_LABELS, type NichoEnum, type TipoUsuarioEnum, type RolEnum, type DpdTipoEnum } from "@/lib/types";
import { enviarEmail } from "@/lib/admin/smtp";
import { escaparHtml } from "@/lib/utils";

export interface CrearUsuarioInput {
  nombreEmpresa: string;
  email: string;
  password: string;
  rol: RolEnum;
  tipoUsuario: TipoUsuarioEnum;
  nicho: NichoEnum;
  actividad: string;
  proSinCosto: boolean;
  aprobarPro: boolean;
  sectorCustomNombre?: string;
  dpdTipo?: DpdTipoEnum;
}

export interface CrearUsuarioResultado {
  id: string;
  nombreEmpresa: string;
  email: string;
  tipoUsuario: TipoUsuarioEnum;
  proAprobado: boolean;
}

export async function crearUsuario(input: CrearUsuarioInput): Promise<CrearUsuarioResultado> {
  await requireAdmin();

  if (!input.nombreEmpresa.trim() || !input.email.trim() || !input.password) {
    throw new Error("Completa nombre de empresa, correo y contraseña.");
  }

  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { nombre_empresa: input.nombreEmpresa, nicho: input.nicho },
  });

  if (error) throw new Error(error.message);

  const userId = data.user.id;
  const proAprobado = input.aprobarPro;
  const esPro = proAprobado;

  const { error: updateError } = await admin
    .from("profiles")
    .update({
      nombre_empresa: input.nombreEmpresa,
      nicho: input.nicho,
      sector: input.sectorCustomNombre || SECTOR_LABELS[input.nicho],
      rol: input.rol,
      nivel_acceso: "lectura_carga",
      tipo_usuario: input.tipoUsuario,
      es_pro: esPro,
      pro_aprobado_por_admin: proAprobado,
      pro_activado_en: proAprobado ? new Date().toISOString() : null,
      onboarding_completado: false,
      dpd_tipo: input.dpdTipo ?? null,
      dpd_activo: input.dpdTipo === "interno",
    })
    .eq("id", userId);

  if (updateError) {
    await admin.auth.admin.deleteUser(userId);
    throw new Error(updateError.message);
  }

  await admin.from("historial_acciones").insert({
    profile_id: userId,
    accion: `Cuenta creada por administrador (${input.actividad || "sin actividad especificada"})`,
    modulo: "Cuenta",
  });

  revalidatePath("/admin/clientes");

  return {
    id: userId,
    nombreEmpresa: input.nombreEmpresa,
    email: input.email,
    tipoUsuario: input.tipoUsuario,
    proAprobado,
  };
}

export async function enviarCredencialesPorCorreo(resultado: CrearUsuarioResultado) {
  await requireAdmin();

  const supabase = createAdminClient();

  const { data: plantilla } = await supabase
    .from("plantillas_correo")
    .select("asunto, cuerpo")
    .eq("tipo", "credenciales")
    .maybeSingle();

  const asunto = (plantilla?.asunto ?? "Tus credenciales de acceso a la plataforma BAC").replace(
    "{{nombre_empresa}}",
    resultado.nombreEmpresa
  );

  const emailEscaped = escaparHtml(resultado.email);
  const empresaEscaped = escaparHtml(resultado.nombreEmpresa);

  const cuerpoDefault = `
    <h2>Bienvenido a la plataforma BAC</h2>
    <p>Se ha creado tu cuenta. Puedes acceder con las siguientes credenciales:</p>
    <p><strong>Correo:</strong> ${emailEscaped}</p>
    <p>Para ingresar, visita la plataforma e inicia sesión con tu correo y la contraseña proporcionada por tu consultor.</p>
    <p>— Equipo BAC Legal Advisor</p>
  `;

  const cuerpo = (plantilla?.cuerpo ?? cuerpoDefault)
    .replace(/\{\{nombre_empresa\}\}/g, empresaEscaped)
    .replace(/\{\{email\}\}/g, emailEscaped);

  const emailResult = await enviarEmail({
    to: resultado.email,
    subject: asunto,
    html: cuerpo,
  });

  const { error } = await supabase.from("historial_correos").insert({
    destinatario_id: resultado.id,
    asunto,
    tipo: "credenciales",
    estado: emailResult.ok ? "enviado" : "error",
    error_detalle: emailResult.error ?? null,
  });

  if (error) throw new Error(error.message);

  return { estado: emailResult.ok ? "enviado" : "error" };
}