import { notFound } from "next/navigation";
import { getExpedienteData } from "@/lib/admin/expediente";
import { getBacConfig } from "@/lib/admin/configuracion";
import { ExpedienteHeader } from "@/components/admin/expediente/ExpedienteHeader";
import { ProPanel } from "@/components/admin/expediente/ProPanel";
import { ClienteScoreChart } from "@/components/admin/expediente/ClienteScoreChart";
import { ExpedienteTabs } from "@/components/admin/expediente/ExpedienteTabs";

export const dynamic = "force-dynamic";

export default async function ExpedienteClientePage({ params }: { params: { id: string } }) {
  const [data, bacConfig] = await Promise.all([getExpedienteData(params.id), getBacConfig()]);
  if (!data) notFound();

  const score =
    data.scoreHistorial.length > 0 ? data.scoreHistorial[data.scoreHistorial.length - 1].score : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <ExpedienteHeader cliente={data.cliente} score={score} notificaciones={data.notificacionesCliente} />
        </div>
        <ProPanel
          clienteId={data.cliente.id}
          aprobado={data.cliente.pro_aprobado_por_admin}
          esInterno={data.cliente.tipo_usuario === "interno_bac"}
          proGlobalActivo={bacConfig?.pro_global_activo ?? true}
        />
      </div>

      <ExpedienteTabs data={data} />

      <div className="rounded-xl border border-bac-gray-border bg-white p-4">
        <h2 className="mb-1 text-sm font-semibold text-gray-900">Evolución del score</h2>
        <p className="mb-2 text-xs text-bac-gray-text">Desde el registro del cliente hasta hoy</p>
        <ClienteScoreChart data={data.scoreHistorial} />
      </div>
    </div>
  );
}
