import { createAdminClient } from "@/lib/supabase/admin";

export interface DocumentoEjemploItem {
  slug: string;
  nombre_archivo: string;
  url_storage: string;
  updated_at: string;
  carpeta_ejemplo_id: string | null;
}

export interface CarpetaEjemploItem {
  id: string;
  nombre: string;
  created_at: string;
  carpeta_padre_id: string | null;
  documentos: DocumentoEjemploItem[];
  subcarpetas: CarpetaEjemploItem[];
}

export async function getDocumentosEjemplo(): Promise<{
  documentos: DocumentoEjemploItem[];
  carpetas: CarpetaEjemploItem[];
}> {
  const supabase = createAdminClient();
  const [{ data: docs }, { data: carpetas }] = await Promise.all([
    supabase
      .from("documentos_ejemplo")
      .select("slug, nombre_archivo, url_storage, updated_at, carpeta_ejemplo_id"),
    supabase.rpc("select_carpetas_ejemplo"),
  ]);

  const allDocs = (docs ?? []) as DocumentoEjemploItem[];
  const flat: CarpetaEjemploItem[] = (carpetas ?? []).map((c: any) => ({
    id: c.id,
    nombre: c.nombre,
    created_at: c.created_at,
    carpeta_padre_id: c.carpeta_padre_id ?? null,
    documentos: allDocs.filter((d) => d.carpeta_ejemplo_id === c.id),
    subcarpetas: [],
  }));
  const map = new Map(flat.map((c) => [c.id, c]));
  const roots: CarpetaEjemploItem[] = [];
  for (const c of flat) {
    if (c.carpeta_padre_id && map.has(c.carpeta_padre_id)) {
      map.get(c.carpeta_padre_id)!.subcarpetas.push(c);
    } else {
      roots.push(c);
    }
  }

  const docsSueltos = allDocs.filter((d) => !d.carpeta_ejemplo_id);

  return { documentos: docsSueltos, carpetas: roots };
}
