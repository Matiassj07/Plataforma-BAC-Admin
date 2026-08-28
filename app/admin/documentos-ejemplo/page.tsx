import { getDocumentosEjemplo } from "@/lib/admin/documentos-ejemplo";
import { DocumentosEjemploList } from "@/components/admin/documentos-ejemplo/DocumentosEjemploList";

export default async function DocumentosEjemploPage() {
  const { documentos, carpetas } = await getDocumentosEjemplo();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Documentos ejemplo</h1>
        <p className="text-sm text-bac-gray-text">
          Estos son los archivos que los clientes descargan como plantilla de cada documento
          requerido. Sube el archivo de ejemplo aquí para que esté disponible en su repositorio.
          Las carpetas creadas aquí son visibles para todos los clientes.
        </p>
      </div>

      <DocumentosEjemploList documentos={documentos} carpetas={carpetas} />
    </div>
  );
}
