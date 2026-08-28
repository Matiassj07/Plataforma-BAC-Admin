"use server";

import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

const COSTO_POR_ANALISIS = "x";

async function callIA(prompt: string, datos: unknown): Promise<string> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "AI_API_KEY no está configurada. Añade AI_API_KEY al archivo .env.local."
    );
  }

  const provider = process.env.AI_PROVIDER ?? "openai";
  const model = process.env.AI_MODEL ?? "gpt-4o";

  let url: string;
  let headers: Record<string, string>;
  let body: unknown;

  if (provider === "anthropic") {
    url = "https://api.anthropic.com/v1/messages";
    headers = {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    };
    body = {
      model,
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `${prompt}\n\nDatos:\n${JSON.stringify(datos, null, 2)}`,
        },
      ],
    };
  } else {
    url = process.env.AI_BASE_URL ?? "https://api.openai.com/v1/chat/completions";
    headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };
    body = {
      model,
      messages: [
        {
          role: "system",
          content: "Eres un experto en protección de datos personales y cumplimiento de la LOPDP de Ecuador. Responde siempre en español y en formato JSON válido.",
        },
        {
          role: "user",
          content: `${prompt}\n\nDatos:\n${JSON.stringify(datos, null, 2)}`,
        },
      ],
      temperature: 0.3,
    };
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Error del proveedor de IA (${res.status}): ${err}`);
  }

  const json = await res.json();

  if (provider === "anthropic") {
    return json.content?.[0]?.text ?? "";
  }
  return json.choices?.[0]?.message?.content ?? "";
}

export async function analizarRatConIA(clienteId: string, ratVersionId: string) {
  const admin = await requireAdmin();
  const supabase = createAdminClient();

  const { data: actividades } = await supabase
    .from("actividades_rat")
    .select("*")
    .eq("rat_version_id", ratVersionId);

  if (!actividades || actividades.length === 0) {
    throw new Error("No hay actividades en esta versión del RAT para analizar.");
  }

  const prompt = `Analiza el siguiente Registro de Actividades de Tratamiento (RAT) según la LOPDP de Ecuador.

Para cada actividad de tratamiento, identifica:
1. Brechas de cumplimiento (campos faltantes, bases de licitud incorrectas, medidas de seguridad insuficientes, etc.)
2. Severidad de cada brecha: "critica", "media" o "baja"
3. Artículo de la LOPDP que aplica
4. Recomendación específica para corregir la brecha

Responde ÚNICAMENTE con un JSON válido con esta estructura:
{
  "brechas": [
    {
      "campo": "nombre del campo o actividad afectada",
      "descripcion": "descripción de la brecha encontrada",
      "severidad": "critica|media|baja",
      "articulo_lopdp": "artículo aplicable",
      "recomendacion": "acción correctiva recomendada"
    }
  ],
  "resumen": "resumen general del análisis",
  "score_cumplimiento": 0-100
}`;

  const respuesta = await callIA(prompt, actividades);

  let resultado;
  try {
    const jsonMatch = respuesta.match(/\{[\s\S]*\}/);
    resultado = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(respuesta);
  } catch {
    throw new Error("La IA no devolvió un formato válido. Intenta de nuevo.");
  }

  if (resultado.brechas && resultado.brechas.length > 0) {
    const { data: docGeneral } = await supabase
      .from("documentos_generales")
      .select("id")
      .eq("profile_id", clienteId)
      .limit(1)
      .single();

    if (docGeneral) {
      const { data: analisis } = await supabase
        .from("analisis_ia")
        .insert({
          documento_id: docGeneral.id,
          tipo_analisis: "rat",
          resultado: resultado,
          estado: "analizado",
        })
        .select("id")
        .single();

      if (analisis && resultado.brechas.length > 0) {
        const brechasRows = resultado.brechas.map((brecha: any) => ({
          analisis_id: analisis.id,
          campo: brecha.campo,
          valor_detectado: brecha.descripcion,
          severidad: brecha.severidad,
          articulo_lopdp: brecha.articulo_lopdp,
          recomendacion: brecha.recomendacion,
        }));
        await supabase.from("brechas_cumplimiento").insert(brechasRows);
      }
    }
  }

  await supabase.from("historial_acciones").insert({
    profile_id: clienteId,
    accion: "analisis_ia_rat",
    descripcion: `Análisis IA del RAT: ${resultado.brechas?.length ?? 0} brechas detectadas. Score: ${resultado.score_cumplimiento ?? "N/A"}%`,
    autor_id: admin.id,
  });

  revalidatePath(`/admin/clientes/${clienteId}`);

  return {
    brechas: resultado.brechas ?? [],
    resumen: resultado.resumen ?? "",
    score: resultado.score_cumplimiento ?? null,
    costo: COSTO_POR_ANALISIS,
  };
}

export async function analizarMatrizConIA(clienteId: string, matrizId: string) {
  const admin = await requireAdmin();
  const supabase = createAdminClient();

  const { data: actividades } = await supabase
    .from("actividades_riesgo")
    .select("*")
    .eq("matriz_id", matrizId);

  if (!actividades || actividades.length === 0) {
    throw new Error("No hay actividades en esta matriz de riesgos para analizar.");
  }

  const prompt = `Analiza la siguiente Matriz de Riesgos según la LOPDP de Ecuador.

Para cada actividad de riesgo, evalúa:
1. Si la probabilidad e impacto asignados son realistas
2. Si las medidas de mitigación existentes son suficientes
3. Si las nuevas medidas propuestas son adecuadas
4. Si se requiere EIPD y no está marcada
5. Riesgos subestimados o sobreestimados

Responde ÚNICAMENTE con un JSON válido con esta estructura:
{
  "hallazgos": [
    {
      "actividad": "nombre de la actividad analizada",
      "problema": "descripción del hallazgo",
      "severidad": "critica|media|baja",
      "tipo": "riesgo_subestimado|mitigacion_insuficiente|eipd_requerida|medida_inadecuada",
      "recomendacion": "acción correctiva recomendada"
    }
  ],
  "resumen": "resumen general del análisis de la matriz",
  "riesgos_criticos": 0,
  "score_madurez": 0
}`;

  const respuesta = await callIA(prompt, actividades);

  let resultado;
  try {
    const jsonMatch = respuesta.match(/\{[\s\S]*\}/);
    resultado = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(respuesta);
  } catch {
    throw new Error("La IA no devolvió un formato válido. Intenta de nuevo.");
  }

  await supabase.from("historial_acciones").insert({
    profile_id: clienteId,
    accion: "analisis_ia_matriz",
    descripcion: `Análisis IA de Matriz de Riesgos: ${resultado.hallazgos?.length ?? 0} hallazgos. Score madurez: ${resultado.score_madurez ?? "N/A"}%`,
    autor_id: admin.id,
  });

  revalidatePath(`/admin/clientes/${clienteId}`);

  return {
    hallazgos: resultado.hallazgos ?? [],
    resumen: resultado.resumen ?? "",
    riesgosCriticos: resultado.riesgos_criticos ?? 0,
    score: resultado.score_madurez ?? null,
    costo: COSTO_POR_ANALISIS,
  };
}

export async function analizarBrechasConIA(clienteId: string) {
  const admin = await requireAdmin();
  const supabase = createAdminClient();

  const { data: docs } = await supabase
    .from("documentos_generales")
    .select("id")
    .eq("profile_id", clienteId);

  const docIds = (docs ?? []).map((d) => d.id);

  const { data: analisisIds } = docIds.length > 0
    ? await supabase
        .from("analisis_ia")
        .select("id")
        .in("documento_id", docIds)
    : { data: [] as { id: string }[] };

  const ids = (analisisIds ?? []).map((a) => a.id);

  const { data: brechasData } = ids.length > 0
    ? await supabase
        .from("brechas_cumplimiento")
        .select("*")
        .in("analisis_id", ids)
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [] as never[] };

  const brechasCliente = brechasData ?? [];

  if (brechasCliente.length === 0) {
    throw new Error("No hay brechas registradas para generar un plan de acción.");
  }

  const prompt = `Analiza las siguientes brechas de cumplimiento de la LOPDP de Ecuador y genera un plan de acción priorizado.

Para cada brecha, genera acciones correctivas con:
1. Acción concreta a realizar
2. Prioridad: "urgente", "alta", "media", "baja"
3. Plazo estimado en días
4. Responsable sugerido (cargo, no nombre)
5. Recursos necesarios
6. Indicador de cumplimiento (cómo verificar que se completó)

Responde ÚNICAMENTE con un JSON válido con esta estructura:
{
  "plan_accion": [
    {
      "brecha_origen": "descripción breve de la brecha",
      "accion": "acción correctiva detallada",
      "prioridad": "urgente|alta|media|baja",
      "plazo_dias": 30,
      "responsable": "cargo sugerido",
      "recursos": "recursos necesarios",
      "indicador": "cómo verificar cumplimiento"
    }
  ],
  "resumen_ejecutivo": "resumen del plan",
  "total_acciones": 0,
  "plazo_total_estimado_dias": 0
}`;

  const respuesta = await callIA(prompt, brechasCliente);

  let resultado;
  try {
    const jsonMatch = respuesta.match(/\{[\s\S]*\}/);
    resultado = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(respuesta);
  } catch {
    throw new Error("La IA no devolvió un formato válido. Intenta de nuevo.");
  }

  await supabase.from("historial_acciones").insert({
    profile_id: clienteId,
    accion: "analisis_ia_brechas",
    descripcion: `Plan de acción IA generado: ${resultado.total_acciones ?? resultado.plan_accion?.length ?? 0} acciones. Plazo estimado: ${resultado.plazo_total_estimado_dias ?? "N/A"} días`,
    autor_id: admin.id,
  });

  revalidatePath(`/admin/clientes/${clienteId}`);

  return {
    plan: resultado.plan_accion ?? [],
    resumen: resultado.resumen_ejecutivo ?? "",
    totalAcciones: resultado.total_acciones ?? resultado.plan_accion?.length ?? 0,
    plazoTotal: resultado.plazo_total_estimado_dias ?? null,
    costo: COSTO_POR_ANALISIS,
  };
}
