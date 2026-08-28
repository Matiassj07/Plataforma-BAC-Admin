-- Add RAT activity metadata to documentos_carpeta
-- When a doc is uploaded from RAT to a folder, these track the origin
ALTER TABLE documentos_carpeta
  ADD COLUMN IF NOT EXISTS actividad_rat_id UUID REFERENCES actividades_rat(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS nombre_actividad_rat TEXT;

-- RPC: select all RAT-linked docs for a given profile
-- Access control: called only via createAdminClient() from server actions that enforce auth
CREATE OR REPLACE FUNCTION select_docs_actividad_rat(p_profile_id UUID)
RETURNS TABLE(
  id UUID,
  actividad_rat_id UUID,
  nombre_archivo TEXT,
  url_storage TEXT,
  fecha_subida TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT dc.id, dc.actividad_rat_id, dc.nombre_archivo, dc.url_storage, dc.fecha_subida
  FROM documentos_carpeta dc
  JOIN carpetas_documentos cd ON cd.id = dc.carpeta_id
  WHERE cd.profile_id = p_profile_id
    AND dc.actividad_rat_id IS NOT NULL;
$$;

-- RPC: get a single RAT doc with its profile_id (for ownership check in app layer)
CREATE OR REPLACE FUNCTION get_doc_actividad_rat(p_doc_id UUID)
RETURNS TABLE(
  id UUID,
  nombre_archivo TEXT,
  url_storage TEXT,
  actividad_rat_id UUID,
  profile_id UUID
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT dc.id, dc.nombre_archivo, dc.url_storage, dc.actividad_rat_id, cd.profile_id
  FROM documentos_carpeta dc
  JOIN carpetas_documentos cd ON cd.id = dc.carpeta_id
  WHERE dc.id = p_doc_id
  LIMIT 1;
$$;

-- RPC: delete a RAT doc by id
-- Access control: server actions validate ownership before calling this
CREATE OR REPLACE FUNCTION delete_doc_actividad_rat(p_doc_id UUID)
RETURNS VOID
LANGUAGE sql SECURITY DEFINER AS $$
  DELETE FROM documentos_carpeta WHERE id = p_doc_id;
$$;
