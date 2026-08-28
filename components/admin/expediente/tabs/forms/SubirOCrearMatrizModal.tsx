"use client";

import { useRef, useState, useTransition } from "react";
import { FileText, FilePlus2, FileCheck2, Upload } from "lucide-react";
import { Modal } from "@/components/admin/Modal";
import { subirArchivoFuente } from "@/lib/admin/expediente-actions";
import {
  parsearTextoRiesgos,
  vincularActividadesRiesgo,
  generarPlantillaRiesgosTxt,
  type RiesgoExtraido,
} from "@/lib/admin/riesgo-parser";
import { validarRiesgo } from "./RiesgoFieldset";
import { CrearMatrizForm } from "./CrearMatrizForm";
import type { ActividadRat } from "@/lib/admin/expediente";

type Paso = "elegir" | "subiendo" | "extraccion" | "formulario";

function contarFaltantes(riesgos: RiesgoExtraido[]): number {
  return riesgos.reduce((total, r) => {
    const errores = validarRiesgo({
      actividad_rat_id: r.actividad_rat_id,
      cat_especiales_gran_escala: r.cat_especiales_gran_escala,
      obs_sistematica_publica: r.obs_sistematica_publica,
      codigo: r.codigo,
      amenazas: r.amenazas,
      vulnerabilidades: r.vulnerabilidades,
      probabilidad: r.probabilidad,
      impacto: r.impacto,
      medidas_implementar: r.medidas_implementar,
      prob_residual: r.prob_residual,
      imp_residual: r.imp_residual,
      semaforo: r.semaforo,
      area_departamento: r.area_departamento,
      responsable_implementacion: r.responsable_implementacion,
    });
    return total + Object.keys(errores).length;
  }, 0);
}

function descargarPlantilla(ratActividades: ActividadRat[]) {
  const blob = new Blob([generarPlantillaRiesgosTxt(ratActividades)], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "plantilla-matriz-riesgos.txt";
  a.click();
  URL.revokeObjectURL(url);
}

export function SubirOCrearMatrizModal({
  clienteId,
  ratActividades,
  onClose,
  onCreado,
}: {
  clienteId: string;
  ratActividades: ActividadRat[];
  onClose: () => void;
  onCreado: () => void;
}) {
  const [paso, setPaso] = useState<Paso>("elegir");
  const fileRef = useRef<HTMLInputElement>(null);
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
  const [extraido, setExtraido] = useState<RiesgoExtraido[] | null>(null);
  const [sinCoincidencia, setSinCoincidencia] = useState(0);
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
        const parseados = parsearTextoRiesgos(texto);
        const vinculados = vincularActividadesRiesgo(parseados, ratActividades);

        const formData = new FormData();
        formData.set("file", file);
        await subirArchivoFuente(clienteId, "matriz", formData);

        setNombreArchivo(file.name);
        setExtraido(vinculados);
        setSinCoincidencia(vinculados.filter((r) => r.actividad_nombre && !r.actividad_rat_id).length);
        setPaso("extraccion");
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo procesar el archivo.");
        setPaso("elegir");
      }
    });
  }

  const faltantes = extraido ? contarFaltantes(extraido) : 0;

  const modalTitulo = "Subir matriz de riesgos en nombre del cliente";

  if (ratActividades.length === 0 && paso === "elegir") {
    return (
      <Modal title={modalTitulo} onClose={onClose}>
        <p className="text-sm text-bac-gray-text">
          Este cliente todavía no tiene actividades de tratamiento registradas en el RAT. La matriz
          de riesgos se construye a partir de esas actividades — crea o sube primero el RAT en la
          pestaña correspondiente.
        </p>
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-bac-gray-border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-bac-gray-alt"
          >
            Cerrar
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={modalTitulo} onClose={onClose} widthClassName={paso === "formulario" ? "max-w-4xl" : "max-w-md"}>
      {paso === "elegir" && (
        <div className="space-y-3">
          <p className="text-sm text-bac-gray-text">
            ¿Quieres crear la matriz llenando el formulario, o extraer los datos automáticamente
            desde un archivo de texto plano que ya tenga el cliente?
          </p>
          <button
            onClick={() => setPaso("formulario")}
            className="flex w-full items-center gap-3 rounded-lg border border-bac-gray-border p-3 text-left hover:bg-bac-gray-alt"
          >
            <FilePlus2 className="h-5 w-5 text-bac-red" />
            <span>
              <span className="block text-sm font-medium text-gray-900">Crear nuevo</span>
              <span className="block text-xs text-bac-gray-text">
                Llena el formulario a partir de las actividades del RAT.
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
              onClick={() => descargarPlantilla(ratActividades)}
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
                <li>{extraido.length} riesgo(s) detectado(s).</li>
                {sinCoincidencia > 0 && (
                  <li className="text-bac-score-rojo">
                    {sinCoincidencia} riesgo(s) mencionan una actividad que no coincide con ninguna
                    del RAT — deberás seleccionarla manualmente.
                  </li>
                )}
                {faltantes > 0 ? (
                  <li className="text-bac-score-rojo">
                    {faltantes} campo(s) obligatorio(s) no se pudieron extraer del archivo y deberás
                    completarlos manualmente. No podrás guardar hasta llenarlos.
                  </li>
                ) : (
                  <li>Todos los campos obligatorios se completaron automáticamente.</li>
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
        <CrearMatrizForm
          clienteId={clienteId}
          ratActividades={ratActividades}
          riesgosExtraidos={extraido ?? undefined}
          onCreado={onCreado}
          onCancelar={onClose}
        />
      )}
    </Modal>
  );
}
