"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Shuffle, Trash2, X } from "lucide-react";
import { crearUsuario, type CrearUsuarioResultado } from "@/lib/admin/crear-usuario-actions";
import { ACTIVIDADES_POR_SECTOR } from "@/lib/actividad-empresa";
import { SECTOR_LABELS, DPD_TIPO_LABELS, type NichoEnum, type TipoUsuarioEnum, type DpdTipoEnum } from "@/lib/types";
import { generarPassword } from "@/lib/utils";
import { crearSectorCustom, eliminarSectorCustom, type SectorCustom } from "@/lib/admin/sectores-actions";

const INPUT_CLASS =
  "w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm outline-none focus:border-bac-red focus:ring-1 focus:ring-bac-red";

export function CrearUsuarioForm({
  onCreado,
  sectoresCustom,
}: {
  onCreado: (resultado: CrearUsuarioResultado & { password: string }) => void;
  sectoresCustom: SectorCustom[];
}) {
  const [nombreEmpresa, setNombreEmpresa] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tipoUsuario, setTipoUsuario] = useState<TipoUsuarioEnum>("cliente_externo");
  const [nicho, setNicho] = useState<NichoEnum>("clinicas");
  const [sectorCustomId, setSectorCustomId] = useState<string | null>(null);
  const [actividad, setActividad] = useState("");
  const [actividadOtra, setActividadOtra] = useState("");
  const [sectorOtra, setSectorOtra] = useState("");
  const [dpdTipo, setDpdTipo] = useState<DpdTipoEnum | "">("");
  const [aprobarPro, setAprobarPro] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [mostrarCrearSector, setMostrarCrearSector] = useState(false);
  const [nuevoSectorNombre, setNuevoSectorNombre] = useState("");
  const [nuevoSectorActividades, setNuevoSectorActividades] = useState<string[]>([""]);
  const [creandoSector, startCreandoSector] = useTransition();

  const esCustom = sectorCustomId !== null;
  const sectorCustomActual = sectoresCustom.find((s) => s.id === sectorCustomId);

  const actividades = useMemo(() => {
    if (esCustom && sectorCustomActual) return sectorCustomActual.actividades;
    return ACTIVIDADES_POR_SECTOR[nicho];
  }, [nicho, esCustom, sectorCustomActual]);

  function handleSectorChange(value: string) {
    setActividad("");
    setActividadOtra("");
    setSectorOtra("");
    if (value.startsWith("custom_")) {
      setSectorCustomId(value.replace("custom_", ""));
      setNicho("otros");
    } else {
      setSectorCustomId(null);
      setNicho(value as NichoEnum);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!dpdTipo) {
      setError("Selecciona el tipo de DPD.");
      return;
    }

    startTransition(async () => {
      try {
        const resultado = await crearUsuario({
          nombreEmpresa,
          email,
          password,
          rol: "cliente",
          tipoUsuario,
          nicho: esCustom ? "otros" : nicho,
          actividad: actividad === "Otra - especificar" ? actividadOtra : actividad,
          proSinCosto: false,
          aprobarPro,
          sectorCustomNombre: sectorCustomActual?.nombre,
          dpdTipo,
        });

        onCreado({ ...resultado, password });
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo crear el usuario.");
      }
    });
  }

  function handleCrearSector() {
    const acts = nuevoSectorActividades.map((a) => a.trim()).filter(Boolean);
    startCreandoSector(async () => {
      try {
        await crearSectorCustom(nuevoSectorNombre.trim(), acts);
        setMostrarCrearSector(false);
        setNuevoSectorNombre("");
        setNuevoSectorActividades([""]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo crear el sector.");
      }
    });
  }

  function handleEliminarSector(id: string) {
    startCreandoSector(async () => {
      try {
        await eliminarSectorCustom(id);
        if (sectorCustomId === id) {
          setSectorCustomId(null);
          setNicho("clinicas");
          setActividad("");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo eliminar el sector.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-xl border border-bac-gray-border bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900">Datos de la cuenta</h2>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Nombre de empresa *
          </label>
          <input
            required
            className={INPUT_CLASS}
            value={nombreEmpresa}
            onChange={(e) => setNombreEmpresa(e.target.value)}
            placeholder="Clínica Santa María"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Correo electrónico *
          </label>
          <input
            required
            type="email"
            className={INPUT_CLASS}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="clinica@ejemplo.com"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Contraseña temporal *
          </label>
          <div className="flex gap-2">
            <input
              required
              className={INPUT_CLASS}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setPassword(generarPassword())}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-bac-gray-border px-3 py-2 text-xs font-medium text-gray-700 hover:bg-bac-gray-alt"
            >
              <Shuffle className="h-3.5 w-3.5" /> Generar
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-bac-gray-border bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900">Tipo y configuración</h2>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Tipo de usuario *
          </label>
          <select
            className={INPUT_CLASS}
            value={tipoUsuario}
            onChange={(e) => setTipoUsuario(e.target.value as TipoUsuarioEnum)}
          >
            <option value="interno_bac">Interno BAC</option>
            <option value="cliente_externo">Cliente externo</option>
            <option value="revendedor">Revendedor</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Sector</label>
          <div className="flex gap-2">
            <select
              className={INPUT_CLASS}
              value={esCustom ? `custom_${sectorCustomId}` : nicho}
              onChange={(e) => handleSectorChange(e.target.value)}
            >
              {Object.entries(SECTOR_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
              {sectoresCustom.length > 0 && (
                <optgroup label="Sectores personalizados">
                  {sectoresCustom.map((s) => (
                    <option key={s.id} value={`custom_${s.id}`}>
                      {s.nombre}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <button
              type="button"
              onClick={() => setMostrarCrearSector(true)}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-bac-gray-border px-2.5 py-2 text-xs font-medium text-gray-700 hover:bg-bac-gray-alt"
              title="Crear sector personalizado"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {nicho === "otros" && !esCustom && (
            <input
              required
              className={`${INPUT_CLASS} mt-2`}
              value={sectorOtra}
              onChange={(e) => setSectorOtra(e.target.value)}
              placeholder="Especifica el sector"
            />
          )}

          {esCustom && sectorCustomActual && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-bac-gray-text">
                Sector personalizado: {sectorCustomActual.nombre}
              </span>
              <button
                type="button"
                onClick={() => handleEliminarSector(sectorCustomActual.id)}
                disabled={creandoSector}
                className="text-xs text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Actividad de la empresa
          </label>
          <select
            className={INPUT_CLASS}
            value={actividad}
            onChange={(e) => {
              setActividad(e.target.value);
              setActividadOtra("");
            }}
          >
            <option value="">Selecciona una actividad</option>
            {actividades.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          {actividad === "Otra - especificar" && (
            <input
              required
              className={`${INPUT_CLASS} mt-2`}
              value={actividadOtra}
              onChange={(e) => setActividadOtra(e.target.value)}
              placeholder="Especifica la actividad"
            />
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Tipo de DPD *
          </label>
          <select
            required
            className={INPUT_CLASS}
            value={dpdTipo}
            onChange={(e) => setDpdTipo(e.target.value as DpdTipoEnum)}
          >
            <option value="">Selecciona tipo de DPD</option>
            {Object.entries(DPD_TIPO_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-start gap-2 rounded-lg bg-bac-gray-alt p-3 text-sm text-gray-700">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={aprobarPro}
            onChange={(e) => setAprobarPro(e.target.checked)}
          />
          <span>
            <span className="font-medium">Aprobar visibilidad PRO</span>
            {tipoUsuario === "interno_bac" && " — sin costo"}
          </span>
        </label>
      </div>

      <div className="lg:col-span-2">
        {error && <p className="mb-3 text-sm text-bac-score-rojo">{error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-bac-red px-5 py-2.5 text-sm font-medium text-white hover:bg-bac-red-dark disabled:opacity-60"
        >
          {isPending ? "Creando usuario..." : "Crear usuario"}
        </button>
      </div>

      {mostrarCrearSector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Crear sector personalizado</h3>
              <button type="button" onClick={() => setMostrarCrearSector(false)}>
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Nombre del sector *
                </label>
                <input
                  className={INPUT_CLASS}
                  value={nuevoSectorNombre}
                  onChange={(e) => setNuevoSectorNombre(e.target.value)}
                  placeholder="Ej: Fintech"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Actividades *
                </label>
                <div className="space-y-2">
                  {nuevoSectorActividades.map((act, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        className={INPUT_CLASS}
                        value={act}
                        onChange={(e) => {
                          const copy = [...nuevoSectorActividades];
                          copy[i] = e.target.value;
                          setNuevoSectorActividades(copy);
                        }}
                        placeholder={`Actividad ${i + 1}`}
                      />
                      {nuevoSectorActividades.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setNuevoSectorActividades(nuevoSectorActividades.filter((_, j) => j !== i))
                          }
                          className="shrink-0 text-red-400 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setNuevoSectorActividades([...nuevoSectorActividades, ""])}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-bac-red hover:text-bac-red-dark"
                >
                  <Plus className="h-3 w-3" /> Agregar actividad
                </button>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMostrarCrearSector(false)}
                className="rounded-lg border border-bac-gray-border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-bac-gray-alt"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCrearSector}
                disabled={creandoSector || !nuevoSectorNombre.trim() || nuevoSectorActividades.filter((a) => a.trim()).length === 0}
                className="rounded-lg bg-bac-red px-4 py-2 text-sm font-medium text-white hover:bg-bac-red-dark disabled:opacity-60"
              >
                {creandoSector ? "Creando..." : "Crear sector"}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
