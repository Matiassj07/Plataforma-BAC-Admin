-- 1. Tabla planes de implementación
CREATE TABLE IF NOT EXISTS planes_implementacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('rat', 'riesgos', 'documentos')),
  actividad_origen_id UUID,
  titulo TEXT NOT NULL,
  responsable TEXT,
  departamento TEXT,
  actividad_nombre TEXT,
  actividad_realizar TEXT,
  fecha_inicio DATE,
  fecha_fin DATE,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_progreso', 'completado')),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_planes_impl_profile ON planes_implementacion(profile_id);
CREATE INDEX IF NOT EXISTS idx_planes_impl_actividad ON planes_implementacion(actividad_origen_id);

-- 2. Informes de brechas DPD (mensuales)
CREATE TABLE IF NOT EXISTS dpd_informes_brechas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES dpd_planes(id) ON DELETE CASCADE NOT NULL,
  mes TEXT NOT NULL,
  anio INT NOT NULL,
  hubo_brecha BOOLEAN NOT NULL DEFAULT FALSE,
  contenido TEXT NOT NULL,
  url_informe TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(plan_id, mes, anio)
);

-- 3. Vincular docs generales a actividades RAT
ALTER TABLE documentos_generales
  ADD COLUMN IF NOT EXISTS actividad_rat_id UUID,
  ADD COLUMN IF NOT EXISTS nombre_actividad_rat TEXT;

-- 4. Fix FK dpd_actas → dpd_actividades (SET NULL en vez de error)
ALTER TABLE dpd_actas DROP CONSTRAINT IF EXISTS dpd_actas_actividad_id_fkey;
ALTER TABLE dpd_actas ADD CONSTRAINT dpd_actas_actividad_id_fkey
  FOREIGN KEY (actividad_id) REFERENCES dpd_actividades(id) ON DELETE SET NULL;
