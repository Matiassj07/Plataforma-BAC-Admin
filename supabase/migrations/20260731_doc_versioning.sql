-- Document versioning: max 3 versions per document (FIFO rotation)
ALTER TABLE documentos_carpeta
  ADD COLUMN IF NOT EXISTS version INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS doc_original_id UUID REFERENCES documentos_carpeta(id) ON DELETE SET NULL;

-- RAT field change tracking (original + 2 updates per field per activity)
CREATE TABLE IF NOT EXISTS rat_cambios_campo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actividad_rat_id UUID REFERENCES actividades_rat(id) ON DELETE CASCADE NOT NULL,
  campo TEXT NOT NULL,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  version_cambio INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(actividad_rat_id, campo, version_cambio)
);

-- Riesgo field change tracking (original + 2 updates per field per activity)
CREATE TABLE IF NOT EXISTS riesgo_cambios_campo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actividad_riesgo_id UUID REFERENCES actividades_riesgo(id) ON DELETE CASCADE NOT NULL,
  campo TEXT NOT NULL,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  version_cambio INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(actividad_riesgo_id, campo, version_cambio)
);

-- Client notifications (bell/dropdown)
CREATE TABLE IF NOT EXISTS notificaciones_cliente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  modulo TEXT,
  leida BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notif_cliente_profile ON notificaciones_cliente(profile_id, created_at DESC);

-- Kanban messaging: tasks per client
CREATE TABLE IF NOT EXISTS mensajeria_tareas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  admin_id UUID REFERENCES profiles(id) NOT NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  estado TEXT DEFAULT 'pendiente',
  prioridad TEXT DEFAULT 'media',
  fecha_limite DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Kanban checklist items
CREATE TABLE IF NOT EXISTS mensajeria_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id UUID REFERENCES mensajeria_tareas(id) ON DELETE CASCADE NOT NULL,
  texto TEXT NOT NULL,
  completado BOOLEAN DEFAULT FALSE,
  orden INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
