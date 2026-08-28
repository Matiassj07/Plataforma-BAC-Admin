"use client";

import { useRef, useState, useTransition } from "react";
import { FileText, FilePlus2, FileCheck2, Upload } from "lucide-react";
import { Modal } from "@/components/admin/Modal";
import { subirArchivoFuente } from "@/lib/admin/expediente-actions";
import { parsearTextoRat, generarPlantillaRatTxt, type RatExtraido } from "@/lib/admin/rat-parser";
import { validarActividadRat } from "./ActividadRatFieldset";
import { CrearRatForm } from "./CrearRatForm";
import type { CarpetaItem } from "@/lib/admin/expediente";

type Paso = "elegir" | "subiendo" | "extraccion" | "formulario";

const ETIQUETAS_GLOBALES: Record<string, string> = {
  responsable: "Nombre de la empresa",
  ruc: "RUC",
  direccion: "Dirección",
  encargado: "Encargado de Tratamiento",
  dpdNombre: "Nombre del DPD",
  dpdDireccion: "Dirección del DPD",
  dpdCorreo: "Correo del DPD",
};

function contarFaltantes(extraido: RatExtraido): number {
  let faltantes = 0;
  if (!extraido.responsable.responsable.trim()) faltantes++;
  if (!extraido.responsable.ruc.trim()) faltantes++;
  if (!extraido.responsable.direccion.trim()) faltantes++;
  if (!extraido.responsable.encargado.trim()) faltantes++;
  if (!extraido.dpd.nombre.trim()) faltantes++;
  if (!extraido.dpd.direccion.trim()) faltantes++;
  if (!extraido.dpd.correo.trim()) faltantes++;
  for (const act of extraido.actividades) {
    faltantes += Object.keys(validarActividadRat(act)).length;
  }
  return faltantes;
}

function descargarPlantilla() {
  const blob = new Blob([generarPlantillaRatTxt()], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "plantilla-rat.txt";
  a.click();
  URL.revokeObjectURL(url);
}

export function SubirOCrearRatModal({
  clienteId,
  nombreEmpresa,
  carpetas = [],
  onClose,
  onCreado,
}: {
  clienteId: string;
  nombreEmpresa: string;
  carpetas?: CarpetaItem[];
  onClose: () => void;
  onCreado: () => void;
}) {
  const [paso, setPaso] = useState<Paso>("elegir");
  const fileRef = useRef<HTMLInputElement>(null);
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
  const [extraido, setExtraido] = useState<RatExtraido | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubirArchivo(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Selecciona un archivo.");
      return;
    }
    const ext = file.name.toLowerCase();
    if (!ext.endsWith(".txt") && !ext.endsWith(".csv")) {
      setError("Solo se aceptan archivos .txt o .csv.");
      return;
    }
    setError(null);
    setPaso("subiendo");
    startTransition(async () => {
      try {
        const texto = await file.text();
        const datos = parsearTextoRat(texto);

        const formData = new FormData();
        formData.set("file", file);
        await subirArchivoFuente(clienteId, "rat", formData);

        setNombreArchivo(file.name);
        setExtraido(datos);
        setPaso("extraccion");
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo procesar el archivo.");
        setPaso("elegir");
      }
    });
  }

  const faltantes = extraido ? contarFaltantes(extraido) : 0;

  return (
    <Modal
      title="Subir RAT en nombre del cliente"
      onClose={onClose}
      widthClassName={paso === "formulario" ? "max-w-4xl" : "max-w-md"}
    >
      {paso === "elegir" && (
        <div className="space-y-3">
          <p className="text-sm text-bac-gray-text">
            ¿Quieres crear el RAT llenando el formulario, o extraer los datos automáticamente desde
            un archivo de texto plano que ya tenga el cliente?
          </p>
          <button
            onClick={() => setPaso("formulario")}
            className="flex w-full items-center gap-3 rounded-lg border border-bac-gray-border p-3 text-left hover:bg-bac-gray-alt"
          >
            <FilePlus2 className="h-5 w-5 text-bac-red" />
            <span>
              <span className="block text-sm font-medium text-gray-900">Crear nuevo</span>
              <span className="block text-xs text-bac-gray-text">
                Llena el formulario con todos los campos del RAT.
              </span>
            </span>
          </button>
          <form onSubmit={handleSubirArchivo} className="space-y-2 rounded-lg border border-bac-gray-border p-3">
            <div className="flex items-center gap-3">
              <Upload className="h-5 w-5 text-bac-red" />
              <span className="text-sm font-medium text-gray-900">Subir archivo (.txt o .csv)</span>
            </div>
            <p className="text-xs text-bac-gray-text">
              El sistema extrae los datos automáticamente. Acepta archivos{" "}
              <span className="font-medium">.txt</span> (formato etiqueta:valor) o{" "}
              <span className="font-medium">.csv</span> (formato tabular/Excel).
            </p>
            <button
              type="button"
              onClick={descargarPlantilla}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-bac-red hover:underline"
            >
              <FileText className="h-3.5 w-3.5" /> Descargar plantilla de ejemplo (.txt)
            </button>
            <input ref={fileRef} type="file" accept=".txt,.csv" className="w-full text-sm" />
            {error && <p className="text-xs text-bac-score-rojo">{error}</p>}
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-bac-red px-3 py-1.5 text-xs font-medium text-white hover:bg-bac-red-dark disabled:opacity-60"
            >
              Subir y extraer datos
            </button>
          </form>
        </div>
      )}

      {paso === "subiendo" && (
        <p className="py-6 text-center text-sm text-bac-gray-text">Leyendo y extrayendo datos del archivo...</p>
      )}

      {paso === "extraccion" && extraido && (
        <div className="space-y-4 text-sm">
          <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-blue-800">
            <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p>
                <span className="font-medium">{nombreArchivo}</span> se procesó con los flujos
                internos de lectura de texto plano.
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
                <li>{extraido.actividades.length} actividad(es) de tratamiento detectada(s).</li>
                {faltantes > 0 ? (
                  <li className="text-bac-score-rojo">
                    {faltantes} campo(s) obligatorio(s) no se pudieron extraer del archivo y deberás
                    completarlos manualmente. No podrás guardar hasta llenarlos.
                  </li>
                ) : (
                  <li>Todos los campos obligatorios se completaron automáticamente.</li>
                )}
                {extraido.lineasNoReconocidas.length > 0 && (
                  <li>
                    Se ignoraron {extraido.lineasNoReconocidas.length} línea(s) del archivo que no
                    coincidieron con ningún campo del RAT.
                  </li>
                )}
              </ul>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setPaso("formulario")}
              className="rounded-lg bg-bac-red px-4 py-2 text-sm font-medium text-white hover:bg-bac-red-dark"
            >
              Revisar y completar el formulario
            </button>
          </div>
        </div>
      )}

      {paso === "formulario" && (
        <CrearRatForm
          clienteId={clienteId}
          nombreEmpresaSugerida={nombreEmpresa}
          datosExtraidos={extraido ?? undefined}
          carpetas={carpetas}
          onCreado={onCreado}
          onCancelar={onClose}
        />
      )}
    </Modal>
  );
}
