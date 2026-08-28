import { requireAdmin } from "@/lib/auth";
import { getClientesParaMensajeria } from "@/lib/admin/mensajeria-actions";
import { TableroKanban } from "@/components/admin/mensajeria/TableroKanban";

export default async function MensajeriaPage() {
  await requireAdmin();
  const clientes = await getClientesParaMensajeria();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Mensajería</h1>
        <p className="text-sm text-bac-gray-text">
          Tablero de tareas tipo Kanban por cliente. Arrastra las tarjetas entre columnas para cambiar su estado.
        </p>
      </div>

      <TableroKanban clientesInicial={clientes} />
    </div>
  );
}
