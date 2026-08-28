import { getHerramientas } from "@/lib/admin/herramientas";
import { HerramientasShell } from "@/components/admin/herramientas/HerramientasShell";

export default async function HerramientasPage() {
  const herramientas = await getHerramientas();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Herramientas</h1>
        <p className="text-sm text-bac-gray-text">
          Gestiona videos tutoriales, enlaces y recursos visibles para los clientes.
        </p>
      </div>

      <HerramientasShell herramientas={herramientas} />
    </div>
  );
}
