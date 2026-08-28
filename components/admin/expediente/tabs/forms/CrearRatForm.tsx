"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { FormCampo, campoClass } from "./FormCampo";
import { DateInput } from "@/components/DateInput";
import {
  ACTIVIDAD_RAT_VACIA,
  ActividadRatFieldset,
  type ActividadRatFormState,
  type FolderDoc,
  validarActividadRat,
} from "./ActividadRatFieldset";
import {
  crearRatCompleto,
  subirDocRatEnCarpeta,
  obtenerBasesLicitudCustom,
  crearBaseLicitudCustom,
  editarBaseLicitudCustom,
  eliminarBaseLicitudCustom,
  obtenerUrlDescarga,
  type ActividadRatInput,
} from "@/lib/admin/expediente-actions";
import type { BaseLicitudCustom } from "./ActividadRatFieldset";
import type { CarpetaItem } from "@/lib/admin/expediente";
import { crearPlan } from "@/lib/admin/plan-implementacion-actions";
import type { RatExtraido } from "@/lib/admin/rat-parser";

interface PlanDraft {
  enabled: boolean;
  titulo: string;
  responsable: string;
  departamento: string;
  actividad_nombre: string;
  actividad_realizar: string;
  fecha_inicio: string;
  fecha_fin: string;
}

interface DatosResponsableForm {
  responsable: string;
  ruc: string;
  direccion: string;
  telefono: string;
  web: string;
  encargado: string;
}

interface DatosDpdForm {
  nombre: string;
  direccion: string;
  correo: string;
}

function dividir(csv: string): string[] {
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function calcularErroresGlobales(
  responsable: DatosResponsableForm,
  dpd: DatosDpdForm
): Record<string, string> {
  const errG: Record<string, string> = {};
  if (!responsable.responsable.trim()) errG.responsable = "Obligatorio";
  if (!responsable.ruc.trim()) errG.ruc = "Obligatorio";
  if (!responsable.direccion.trim()) errG.direccion = "Obligatorio";
  if (!responsable.encargado.trim()) errG.encargado = "Obligatorio";
  if (!dpd.nombre.trim()) errG.dpdNombre = "Obligatorio";
  if (!dpd.direccion.trim()) errG.dpdDireccion = "Obligatorio";
  if (!dpd.correo.trim()) errG.dpdCorreo = "Obligatorio";
  return errG;
}

export function CrearRatForm({
  clienteId,
  nombreEmpresaSugerida,
  datosExtraidos,
  carpetas = [],
  onCreado,
  onCancelar,
}: {
  clienteId: string;
  nombreEmpresaSugerida: string;
  datosExtraidos?: RatExtraido;
  carpetas?: CarpetaItem[];
  onCreado: () => void;
  onCancelar: () => void;
}) {
  const [responsable, setResponsable] = useState<DatosResponsableForm>(() => ({
    responsable: datosExtraidos?.responsable.responsable || nombreEmpresaSugerida,
    ruc: datosExtraidos?.responsable.ruc || "",
    direccion: datosExtraidos?.responsable.direccion || "",
    telefono: datosExtraidos?.responsable.telefono || "",
    web: datosExtraidos?.responsable.web || "",
    encargado: datosExtraidos?.responsable.encargado || "",
  }));
  const [dpd, setDpd] = useState<DatosDpdForm>(() => ({
    nombre: datosExtraidos?.dpd.nombre || "",
    direccion: datosExtraidos?.dpd.direccion || "",
    correo: datosExtraidos?.dpd.correo || "",
  }));
  const [actividades, setActividades] = useState<ActividadRatFormState[]>(() =>
    datosExtraidos && datosExtraidos.actividades.length > 0
      ? datosExtraidos.actividades
      : [{ ...ACTIVIDAD_RAT_VACIA }]
  );
  const [erroresGlobales, setErroresGlobales] = useState<Record<string, string>>({});
  const [erroresActividades, setErroresActividades] = useState<Record<string, string>[]>(() =>
    (datosExtraidos && datosExtraidos.actividades.length > 0 ? datosExtraidos.actividades : [{}]).map(() => ({}))
  );
  const [archivosAdjuntos, setArchivosAdjuntos] = useState<File[][]>(() =>
    (datosExtraidos && datosExtraidos.actividades.length > 0 ? datosExtraidos.actividades : [{}]).map(() => [])
  );
  const [folderDocs, setFolderDocs] = useState<FolderDoc[][]>(() =>
    (datosExtraidos && datosExtraidos.actividades.length > 0 ? datosExtraidos.actividades : [{}]).map(() => [])
  );
  const [planes, setPlanes] = useState<PlanDraft[]>(() =>
    (datosExtraidos && datosExtraidos.actividades.length > 0 ? datosExtraidos.actividades : [{}]).map(() => ({
      enabled: false, titulo: "", responsable: "", departamento: "", actividad_nombre: "", actividad_realizar: "", fecha_inicio: "", fecha_fin: "",
    }))
  );
  const [errorGeneral, setErrorGeneral] = useState<string | null>(
    datosExtraidos
      ? "Revisa los campos extraídos del archivo y completa los que quedaron marcados como obligatorios antes de guardar."
      : null
  );
  const [isPending, startTransition] = useTransition();
  const [basesCustom, setBasesCustom] = useState<BaseLicitudCustom[]>([]);

  useEffect(() => {
    obtenerBasesLicitudCustom().then(setBasesCustom).catch(() => {});
  }, []);

  async function handleCrearBase(nombre: string) {
    await crearBaseLicitudCustom(nombre);
    setBasesCustom(await obtenerBasesLicitudCustom());
  }
  async function handleEditarBase(id: string, nombre: string) {
    await editarBaseLicitudCustom(id, nombre);
    setBasesCustom(await obtenerBasesLicitudCustom());
  }
  async function handleEliminarBase(id: string) {
    await eliminarBaseLicitudCustom(id);
    setBasesCustom(await obtenerBasesLicitudCustom());
  }

  useEffect(() => {
    if (!datosExtraidos) return;
    setErroresGlobales(calcularErroresGlobales(responsable, dpd));
    setErroresActividades(actividades.map(validarActividadRat));
    // Solo al montar: refleja de inmediato qué campos no se pudieron extraer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function actualizarActividad(idx: number, v: ActividadRatFormState) {
    setActividades((arr) => arr.map((a, i) => (i === idx ? v : a)));
  }

  function añadirActividad() {
    setActividades((arr) => [...arr, { ...ACTIVIDAD_RAT_VACIA }]);
    setErroresActividades((arr) => [...arr, {}]);
    setArchivosAdjuntos((arr) => [...arr, []]);
    setFolderDocs((arr) => [...arr, []]);
    setPlanes((arr) => [...arr, { enabled: false, titulo: "", responsable: "", departamento: "", actividad_nombre: "", actividad_realizar: "", fecha_inicio: "", fecha_fin: "" }]);
  }

  function quitarActividad(idx: number) {
    setActividades((arr) => arr.filter((_, i) => i !== idx));
    setErroresActividades((arr) => arr.filter((_, i) => i !== idx));
    setArchivosAdjuntos((arr) => arr.filter((_, i) => i !== idx));
    setFolderDocs((arr) => arr.filter((_, i) => i !== idx));
    setPlanes((arr) => arr.filter((_, i) => i !== idx));
  }

  function validarTodo(): boolean {
    const errG = calcularErroresGlobales(responsable, dpd);

    const errAct = actividades.map(validarActividadRat);
    setErroresGlobales(errG);
    setErroresActividades(errAct);

    const hayErroresGlobales = Object.keys(errG).length > 0;
    const hayErroresActividades = errAct.some((e) => Object.keys(e).length > 0);
    if (actividades.length === 0) {
      setErrorGeneral("Añade al menos una actividad de tratamiento.");
      return false;
    }
    if (hayErroresGlobales || hayErroresActividades) {
      setErrorGeneral("Completa todos los campos obligatorios (marcados con *) antes de guardar.");
      return false;
    }
    setErrorGeneral(null);
    return true;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validarTodo()) return;

    const actividadesInput: ActividadRatInput[] = actividades.map((a) => ({
      nombre_actividad: a.nombre_actividad,
      finalidad: a.finalidad,
      categoria_datos: dividir(a.categoria_datos),
      categorias_especiales: a.categorias_especiales,
      categorias_titulares: dividir(a.categorias_titulares),
      perfiles_automatizados: a.perfiles_automatizados === "si",
      base_licitud: a.base_licitud,
      plazo_conservacion: a.plazo_conservacion,
      destinatarios: a.destinatarios,
      transferencias_internacionales: a.transferencias_internacionales === "si",
      medidas_seguridad: a.medidas_seguridad,
      departamento: a.departamento || null,
      origen_datos: a.origen_datos || null,
      articulo_lopdp: a.articulo_lopdp || null,
      almacenamiento: a.almacenamiento || null,
      activo_informacion: a.activo_informacion || null,
    }));

    startTransition(async () => {
      try {
        const result = await crearRatCompleto(
          clienteId,
          {
            responsable: responsable.responsable,
            ruc: responsable.ruc,
            direccion: responsable.direccion,
            encargado: responsable.encargado,
            telefono: responsable.telefono || undefined,
            web: responsable.web || undefined,
          },
          dpd,
          actividadesInput
        );

        if (result) {
          for (let i = 0; i < result.actividadIds.length; i++) {
            const files = archivosAdjuntos[i] ?? [];
            for (const file of files) {
              const fd = new FormData();
              fd.append("file", file);
              fd.append("nombreArchivo", file.name);
              await subirDocRatEnCarpeta(
                clienteId,
                result.actividadIds[i],
                actividades[i].nombre_actividad || `Actividad ${i + 1}`,
                "RAT - Documentos",
                fd
              );
            }
            const fDocs = folderDocs[i] ?? [];
            for (const fDoc of fDocs) {
              try {
                const url = await obtenerUrlDescarga(clienteId, fDoc.url_storage);
                const resp = await fetch(url);
                const blob = await resp.blob();
                const file = new File([blob], fDoc.nombre_archivo, { type: blob.type });
                const fd = new FormData();
                fd.append("file", file);
                fd.append("nombreArchivo", fDoc.nombre_archivo);
                await subirDocRatEnCarpeta(
                  clienteId,
                  result.actividadIds[i],
                  actividades[i].nombre_actividad || `Actividad ${i + 1}`,
                  "RAT - Documentos",
                  fd
                );
              } catch {}
            }
          }
          const planPromises: Promise<void>[] = [];
          for (let i = 0; i < result.actividadIds.length; i++) {
            const plan = planes[i];
            if (plan?.enabled && plan.titulo.trim()) {
              planPromises.push(
                crearPlan(clienteId, {
                  tipo: "rat",
                  actividad_origen_id: result.actividadIds[i],
                  titulo: plan.titulo.trim(),
                  responsable: plan.responsable.trim() || undefined,
                  departamento: plan.departamento.trim() || undefined,
                  actividad_nombre: plan.actividad_nombre.trim() || actividades[i].nombre_actividad || undefined,
                  actividad_realizar: plan.actividad_realizar.trim() || undefined,
                  fecha_inicio: plan.fecha_inicio || undefined,
                  fecha_fin: plan.fecha_fin || undefined,
                }).then(() => {})
              );
            }
          }
          try {
            await Promise.all(planPromises);
          } catch {
            // Plans failed but RAT was saved — don't block
          }
        }

        onCreado();
      } catch (err) {
        setErrorGeneral(err instanceof Error ? err.message : "No se pudo guardar el RAT.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <section className="space-y-3 rounded-xl border border-bac-gray-border bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-900">Responsable de Tratamiento</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormCampo label="Nombre de la empresa" required error={erroresGlobales.responsable}>
            <input
              className={campoClass(!!erroresGlobales.responsable)}
              value={responsable.responsable}
              onChange={(e) => setResponsable({ ...responsable, responsable: e.target.value })}
            />
          </FormCampo>
          <FormCampo label="RUC" required error={erroresGlobales.ruc}>
            <input
              className={campoClass(!!erroresGlobales.ruc)}
              value={responsable.ruc}
              onChange={(e) => setResponsable({ ...responsable, ruc: e.target.value })}
            />
          </FormCampo>
        </div>
        <FormCampo label="Dirección" required error={erroresGlobales.direccion}>
          <input
            className={campoClass(!!erroresGlobales.direccion)}
            value={responsable.direccion}
            onChange={(e) => setResponsable({ ...responsable, direccion: e.target.value })}
          />
        </FormCampo>
        <FormCampo
          label="Encargado de Tratamiento"
          required
          error={erroresGlobales.encargado}
          hint="Tercero que trata los datos por cuenta del responsable (ej. proveedor de nómina, hosting, etc.)"
        >
          <input
            className={campoClass(!!erroresGlobales.encargado)}
            value={responsable.encargado}
            onChange={(e) => setResponsable({ ...responsable, encargado: e.target.value })}
          />
        </FormCampo>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormCampo label="Teléfono de contacto" hint="Opcional">
            <input
              className={campoClass()}
              value={responsable.telefono}
              onChange={(e) => setResponsable({ ...responsable, telefono: e.target.value })}
            />
          </FormCampo>
          <FormCampo label="Sitio web" hint="Opcional">
            <input
              className={campoClass()}
              value={responsable.web}
              onChange={(e) => setResponsable({ ...responsable, web: e.target.value })}
            />
          </FormCampo>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-bac-gray-border bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-900">Delegado de Protección de Datos (DPD)</h3>
        <FormCampo label="Nombre del DPD" required error={erroresGlobales.dpdNombre}>
          <input
            className={campoClass(!!erroresGlobales.dpdNombre)}
            value={dpd.nombre}
            onChange={(e) => setDpd({ ...dpd, nombre: e.target.value })}
          />
        </FormCampo>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormCampo label="Dirección del DPD" required error={erroresGlobales.dpdDireccion}>
            <input
              className={campoClass(!!erroresGlobales.dpdDireccion)}
              value={dpd.direccion}
              onChange={(e) => setDpd({ ...dpd, direccion: e.target.value })}
            />
          </FormCampo>
          <FormCampo label="Correo electrónico del DPD" required error={erroresGlobales.dpdCorreo}>
            <input
              type="email"
              className={campoClass(!!erroresGlobales.dpdCorreo)}
              value={dpd.correo}
              onChange={(e) => setDpd({ ...dpd, correo: e.target.value })}
            />
          </FormCampo>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Actividades de Tratamiento</h3>
          <button
            type="button"
            onClick={añadirActividad}
            className="inline-flex items-center gap-1.5 rounded-lg border border-bac-gray-border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-bac-gray-alt"
          >
            <Plus className="h-3.5 w-3.5" /> Añadir actividad
          </button>
        </div>
        {actividades.map((a, i) => (
          <div key={i} className="space-y-2">
            <ActividadRatFieldset
              index={i}
              value={a}
              onChange={(v) => actualizarActividad(i, v)}
              onRemove={() => quitarActividad(i)}
              errors={erroresActividades[i] ?? {}}
              archivosAdjuntos={archivosAdjuntos[i] ?? []}
              onAdjuntarArchivo={(file) =>
                setArchivosAdjuntos((arr) => arr.map((files, fi) => fi === i ? [...files, file] : files))
              }
              onQuitarArchivo={(fileIdx) =>
                setArchivosAdjuntos((arr) => arr.map((files, fi) => fi === i ? files.filter((_, j) => j !== fileIdx) : files))
              }
              carpetas={carpetas}
              docsFromFolder={folderDocs[i] ?? []}
              onAdjuntarDesdeCarpeta={(doc) =>
                setFolderDocs((arr) => arr.map((docs, di) => di === i ? [...docs, doc] : docs))
              }
              onQuitarDocCarpeta={(docIdx) =>
                setFolderDocs((arr) => arr.map((docs, di) => di === i ? docs.filter((_, j) => j !== docIdx) : docs))
              }
              basesCustom={basesCustom}
              onCrearBase={handleCrearBase}
              onEditarBase={handleEditarBase}
              onEliminarBase={handleEliminarBase}
            />
            <div className="ml-4 rounded-lg border border-dashed border-bac-gray-border p-3">
              <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={planes[i]?.enabled ?? false}
                  onChange={(e) => setPlanes((arr) => arr.map((p, pi) => pi === i ? { ...p, enabled: e.target.checked } : p))}
                  className="rounded border-bac-gray-border text-bac-red focus:ring-bac-red"
                />
                Crear plan de implementación para esta actividad
              </label>
              {planes[i]?.enabled && (
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-bac-gray-text">Título del plan *</label>
                    <input
                      value={planes[i].titulo}
                      onChange={(e) => setPlanes((arr) => arr.map((p, pi) => pi === i ? { ...p, titulo: e.target.value } : p))}
                      className="w-full mt-0.5 px-2 py-1.5 text-xs border border-bac-gray-border rounded-lg focus:outline-none focus:ring-1 focus:ring-bac-red"
                      placeholder="Título del plan"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-bac-gray-text">Responsable</label>
                    <input
                      value={planes[i].responsable}
                      onChange={(e) => setPlanes((arr) => arr.map((p, pi) => pi === i ? { ...p, responsable: e.target.value } : p))}
                      className="w-full mt-0.5 px-2 py-1.5 text-xs border border-bac-gray-border rounded-lg focus:outline-none focus:ring-1 focus:ring-bac-red"
                      placeholder="Nombre del responsable"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-bac-gray-text">Departamento</label>
                    <input
                      value={planes[i].departamento}
                      onChange={(e) => setPlanes((arr) => arr.map((p, pi) => pi === i ? { ...p, departamento: e.target.value } : p))}
                      className="w-full mt-0.5 px-2 py-1.5 text-xs border border-bac-gray-border rounded-lg focus:outline-none focus:ring-1 focus:ring-bac-red"
                      placeholder="Ej: Talento humano"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-bac-gray-text">Nombre de la actividad</label>
                    <input
                      value={planes[i].actividad_nombre}
                      onChange={(e) => setPlanes((arr) => arr.map((p, pi) => pi === i ? { ...p, actividad_nombre: e.target.value } : p))}
                      className="w-full mt-0.5 px-2 py-1.5 text-xs border border-bac-gray-border rounded-lg focus:outline-none focus:ring-1 focus:ring-bac-red"
                      placeholder="Nombre de la actividad"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] text-bac-gray-text">Actividad a realizar</label>
                    <input
                      value={planes[i].actividad_realizar}
                      onChange={(e) => setPlanes((arr) => arr.map((p, pi) => pi === i ? { ...p, actividad_realizar: e.target.value } : p))}
                      className="w-full mt-0.5 px-2 py-1.5 text-xs border border-bac-gray-border rounded-lg focus:outline-none focus:ring-1 focus:ring-bac-red"
                      placeholder="Describa el plan o implementación"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-bac-gray-text">Fecha inicio</label>
                    <DateInput
                      value={planes[i].fecha_inicio}
                      onChange={(v) => setPlanes((arr) => arr.map((p, pi) => pi === i ? { ...p, fecha_inicio: v } : p))}
                      className="w-full mt-0.5 px-2 py-1.5 text-xs border border-bac-gray-border rounded-lg focus:outline-none focus:ring-1 focus:ring-bac-red"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-bac-gray-text">Fecha fin</label>
                    <DateInput
                      value={planes[i].fecha_fin}
                      onChange={(v) => setPlanes((arr) => arr.map((p, pi) => pi === i ? { ...p, fecha_fin: v } : p))}
                      className="w-full mt-0.5 px-2 py-1.5 text-xs border border-bac-gray-border rounded-lg focus:outline-none focus:ring-1 focus:ring-bac-red"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </section>

      {errorGeneral && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-bac-score-rojo">{errorGeneral}</p>
      )}

      <div className="flex justify-end gap-2 border-t border-bac-gray-border pt-4">
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-lg border border-bac-gray-border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-bac-gray-alt"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-bac-red px-4 py-2 text-sm font-medium text-white hover:bg-bac-red-dark disabled:opacity-60"
        >
          {isPending ? "Guardando..." : "Guardar RAT"}
        </button>
      </div>
    </form>
  );
}
