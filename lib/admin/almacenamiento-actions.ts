"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import type { ProveedorAlmacenamiento } from "./almacenamiento";
import {
  refreshAccessToken,
  uploadFile,
  listFolderChildren,
  downloadDriveItem,
  type OAuthProvider,
  type DriveItem,
} from "./almacenamiento-oauth";

export async function guardarIntegracionAlmacenamiento(data: {
  id?: string;
  proveedor: ProveedorAlmacenamiento;
  carpeta_destino: string;
  sync_automatica: boolean;
  activo: boolean;
}) {
  const admin = await requireAdmin();
  const supabase = createAdminClient();

  const payload = {
    admin_id: admin.id,
    proveedor: data.proveedor,
    carpeta_destino: data.carpeta_destino || null,
    sync_automatica: data.sync_automatica,
    activo: data.activo,
  };

  const { error } = data.id
    ? await supabase.from("integraciones_almacenamiento").update(payload).eq("id", data.id)
    : await supabase.from("integraciones_almacenamiento").insert(payload);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/almacenamiento");
}

export async function desconectarAlmacenamiento(id: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase.from("integraciones_almacenamiento").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/almacenamiento");
}

async function getValidToken(integrationId: string): Promise<{ token: string; proveedor: OAuthProvider; carpeta: string }> {
  const supabase = createAdminClient();
  const { data: integ } = await supabase
    .from("integraciones_almacenamiento")
    .select("*")
    .eq("id", integrationId)
    .single();

  if (!integ || !integ.access_token) throw new Error("Integración no conectada.");
  if (!integ.activo) throw new Error("Integración desactivada.");

  const ahora = Math.floor(Date.now() / 1000);
  const expira = integ.token_expira ? Math.floor(new Date(integ.token_expira).getTime() / 1000) : 0;

  if (expira > 0 && ahora >= expira - 60 && integ.refresh_token) {
    const tokens = await refreshAccessToken(integ.proveedor as OAuthProvider, integ.refresh_token);
    await supabase.from("integraciones_almacenamiento").update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expira: new Date(tokens.expires_at * 1000).toISOString(),
    }).eq("id", integrationId);
    return { token: tokens.access_token, proveedor: integ.proveedor as OAuthProvider, carpeta: integ.carpeta_destino ?? "" };
  }

  return { token: integ.access_token, proveedor: integ.proveedor as OAuthProvider, carpeta: integ.carpeta_destino ?? "" };
}

export async function subirArchivoExterno(
  integrationId: string,
  fileName: string,
  fileContent: Uint8Array,
) {
  await requireAdmin();
  const { token, proveedor, carpeta } = await getValidToken(integrationId);
  const result = await uploadFile(proveedor, token, carpeta, fileName, fileContent);

  const supabase = createAdminClient();
  await supabase.from("integraciones_almacenamiento").update({
    ultima_sync: new Date().toISOString(),
  }).eq("id", integrationId);

  revalidatePath("/admin/almacenamiento");
  return result;
}

/**
 * Called after a document is uploaded to Supabase storage.
 * If there's an active Microsoft integration with auto-sync, pushes the file to OneDrive/SharePoint.
 */
export async function sincronizarArchivoSiActivo(
  clienteId: string,
  fileName: string,
  storagePath: string,
) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: integraciones } = await supabase
    .from("integraciones_almacenamiento")
    .select("*")
    .eq("activo", true)
    .eq("sync_automatica", true);

  if (!integraciones || integraciones.length === 0) return;

  const { data: perfil } = await supabase
    .from("profiles")
    .select("nombre_empresa")
    .eq("id", clienteId)
    .single();

  const carpetaCliente = perfil?.nombre_empresa
    ? perfil.nombre_empresa.replace(/[<>:"/\\|?*]/g, "_").trim()
    : clienteId;

  const { data: fileData } = await supabase.storage
    .from("documentos")
    .download(storagePath);

  if (!fileData) return;

  const buffer = new Uint8Array(await fileData.arrayBuffer());

  for (const integ of integraciones) {
    if (!integ.access_token) continue;
    try {
      const { token, proveedor, carpeta } = await getValidToken(integ.id);
      const destino = carpeta ? `${carpeta}/${carpetaCliente}` : carpetaCliente;
      await uploadFile(proveedor, token, destino, fileName, buffer);

      await supabase.from("integraciones_almacenamiento").update({
        ultima_sync: new Date().toISOString(),
      }).eq("id", integ.id);
    } catch {
      // Don't fail the main upload if Microsoft sync fails
    }
  }
}

async function uploadDocFromStorage(
  supabase: ReturnType<typeof createAdminClient>,
  integrationId: string,
  proveedor: OAuthProvider,
  destino: string,
  storagePath: string,
  fileName: string,
  docId?: string,
): Promise<{ cloudId: string; eTag: string } | null> {
  const { token } = await getValidToken(integrationId);
  const { data: fileData } = await supabase.storage
    .from("documentos")
    .download(storagePath);
  if (!fileData) return null;
  const buffer = new Uint8Array(await fileData.arrayBuffer());
  const result = await uploadFile(proveedor, token, destino, fileName, buffer);

  if (docId && result.id) {
    await supabase
      .from("documentos_carpeta")
      .update({
        cloud_item_id: result.id,
        cloud_etag: result.eTag || null,
        cloud_modified_at: new Date().toISOString(),
      })
      .eq("id", docId);
  }

  return { cloudId: result.id, eTag: result.eTag };
}

/**
 * Sync all documents of all clients to the connected Microsoft storage.
 * Mirrors the same folder structure as the ZIP download:
 * - Example folders first, with client docs matched by slug + extra docs + subfolders
 * - Then custom client folders (not matching any example folder)
 * - No loose root-level files
 */
export async function sincronizarAlmacenamiento(id: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { proveedor, carpeta } = await getValidToken(id);

  const { data: clientes } = await supabase
    .from("profiles")
    .select("id, nombre_empresa")
    .eq("rol", "cliente");

  if (!clientes || clientes.length === 0) {
    await supabase.from("integraciones_almacenamiento").update({
      ultima_sync: new Date().toISOString(),
    }).eq("id", id);
    revalidatePath("/admin/almacenamiento");
    return { sincronizados: 0, errores: 0 };
  }

  const { data: carpetasEjemplo } = await supabase.rpc("select_carpetas_ejemplo");
  const { data: docsEjemplo } = await supabase
    .from("documentos_ejemplo")
    .select("slug, nombre_archivo, url_storage, carpeta_ejemplo_id");

  const ejemploRoots: { id: string; nombre: string; carpeta_padre_id: string | null }[] = [];
  const ejemploMap = new Map<string, { id: string; nombre: string; carpeta_padre_id: string | null }>();
  if (carpetasEjemplo) {
    for (const c of carpetasEjemplo as any[]) {
      ejemploMap.set(c.id, { id: c.id, nombre: c.nombre, carpeta_padre_id: c.carpeta_padre_id ?? null });
    }
    for (const c of ejemploMap.values()) {
      if (!c.carpeta_padre_id || !ejemploMap.has(c.carpeta_padre_id)) {
        ejemploRoots.push(c);
      }
    }
  }

  const docsPorCarpetaEjemplo = new Map<string, { slug: string; nombre_archivo: string }[]>();
  if (docsEjemplo) {
    for (const d of docsEjemplo as any[]) {
      if (!d.carpeta_ejemplo_id) continue;
      const arr = docsPorCarpetaEjemplo.get(d.carpeta_ejemplo_id) ?? [];
      arr.push({ slug: d.slug, nombre_archivo: d.nombre_archivo });
      docsPorCarpetaEjemplo.set(d.carpeta_ejemplo_id, arr);
    }
  }

  const ejemploNombresSet = new Set(ejemploRoots.map((c) => c.nombre));

  let sincronizados = 0;
  let errores = 0;

  for (const cliente of clientes) {
    const carpetaCliente = cliente.nombre_empresa
      ? cliente.nombre_empresa.replace(/[<>:"/\\|?*]/g, "_").trim()
      : cliente.id;

    const destino = carpeta ? `${carpeta}/${carpetaCliente}` : carpetaCliente;

    const { data: docsGenerales } = await supabase
      .from("documentos_generales")
      .select("nombre_archivo, url_storage, tipo_documento, slug_requerido")
      .eq("profile_id", cliente.id)
      .not("url_storage", "is", null);

    const porSlug = new Map<string, { nombre_archivo: string; url_storage: string }>();
    if (docsGenerales) {
      for (const d of docsGenerales) {
        if (d.tipo_documento === "rat_actividad") continue;
        const slug = d.slug_requerido || d.tipo_documento;
        if (!slug || !d.url_storage) continue;
        porSlug.set(slug, { nombre_archivo: d.nombre_archivo, url_storage: d.url_storage });
      }
    }

    const { data: carpetasCliente } = await supabase
      .from("carpetas_documentos")
      .select("id, nombre, carpeta_padre_id")
      .eq("profile_id", cliente.id);

    const clientCarpetasByName = new Map<string, string>();
    const clientCarpetaMap = new Map<string, { id: string; nombre: string; carpeta_padre_id: string | null }>();
    if (carpetasCliente) {
      for (const c of carpetasCliente) {
        clientCarpetaMap.set(c.id, { id: c.id, nombre: c.nombre, carpeta_padre_id: c.carpeta_padre_id ?? null });
        if (!c.carpeta_padre_id) {
          clientCarpetasByName.set(c.nombre, c.id);
        }
      }
    }

    let allCarpetaDocs: { id: string; nombre_archivo: string; url_storage: string; carpeta_id: string }[] = [];
    if (carpetasCliente && carpetasCliente.length > 0) {
      const ids = carpetasCliente.map((c) => c.id);
      const { data } = await supabase
        .from("documentos_carpeta")
        .select("id, nombre_archivo, url_storage, carpeta_id")
        .in("carpeta_id", ids)
        .not("url_storage", "is", null);
      if (data) allCarpetaDocs = data;
    }

    const docsByCarpetaId = new Map<string, typeof allCarpetaDocs>();
    for (const d of allCarpetaDocs) {
      const arr = docsByCarpetaId.get(d.carpeta_id) ?? [];
      arr.push(d);
      docsByCarpetaId.set(d.carpeta_id, arr);
    }

    async function syncCarpetaRecursiva(carpetaId: string, destinoBase: string) {
      const docs = docsByCarpetaId.get(carpetaId) ?? [];
      for (const doc of docs) {
        if (!doc.url_storage || !doc.nombre_archivo) continue;
        try {
          await uploadDocFromStorage(supabase, id, proveedor, destinoBase, doc.url_storage, doc.nombre_archivo, doc.id);
          sincronizados++;
        } catch { errores++; }
      }
      if (carpetasCliente) {
        const subs = carpetasCliente.filter((c) => c.carpeta_padre_id === carpetaId);
        for (const sub of subs) {
          const subDestino = `${destinoBase}/${sub.nombre.replace(/[<>:"/\\|?*]/g, "_")}`;
          await syncCarpetaRecursiva(sub.id, subDestino);
        }
      }
    }

    for (const ce of ejemploRoots) {
      const ejDocs = docsPorCarpetaEjemplo.get(ce.id) ?? [];
      const carpetaDestino = `${destino}/${ce.nombre.replace(/[<>:"/\\|?*]/g, "_")}`;

      for (const ejDoc of ejDocs) {
        const clientDoc = porSlug.get(ejDoc.slug);
        if (!clientDoc || !clientDoc.url_storage) continue;
        try {
          await uploadDocFromStorage(supabase, id, proveedor, carpetaDestino, clientDoc.url_storage, clientDoc.nombre_archivo);
          sincronizados++;
        } catch { errores++; }
      }

      const matchingClientCarpetaId = clientCarpetasByName.get(ce.nombre);
      if (matchingClientCarpetaId) {
        const extraDocs = docsByCarpetaId.get(matchingClientCarpetaId) ?? [];
        for (const doc of extraDocs) {
          if (!doc.url_storage || !doc.nombre_archivo) continue;
          try {
            await uploadDocFromStorage(supabase, id, proveedor, carpetaDestino, doc.url_storage, doc.nombre_archivo, doc.id);
            sincronizados++;
          } catch { errores++; }
        }
        if (carpetasCliente) {
          const subs = carpetasCliente.filter((c) => c.carpeta_padre_id === matchingClientCarpetaId);
          for (const sub of subs) {
            const subDestino = `${carpetaDestino}/${sub.nombre.replace(/[<>:"/\\|?*]/g, "_")}`;
            await syncCarpetaRecursiva(sub.id, subDestino);
          }
        }
      }
    }

    if (carpetasCliente) {
      const customRoots = carpetasCliente.filter((c) => !c.carpeta_padre_id && !ejemploNombresSet.has(c.nombre));
      for (const carpeta of customRoots) {
        const carpetaDestino = `${destino}/${carpeta.nombre.replace(/[<>:"/\\|?*]/g, "_")}`;
        await syncCarpetaRecursiva(carpeta.id, carpetaDestino);
      }
    }
  }

  // --- PULL PHASE: download new/updated files from OneDrive ---
  let descargados = 0;
  let erroresPull = 0;

  try {
    const { token } = await getValidToken(id);

    for (const cliente of clientes) {
      const carpetaCliente = cliente.nombre_empresa
        ? cliente.nombre_empresa.replace(/[<>:"/\\|?*]/g, "_").trim()
        : cliente.id;
      const cloudBase = carpeta ? `${carpeta}/${carpetaCliente}` : carpetaCliente;

      const { data: clienteFolders } = await supabase
        .from("carpetas_documentos")
        .select("id, nombre, carpeta_padre_id")
        .eq("profile_id", cliente.id);

      const folderIds = (clienteFolders ?? []).map((c) => c.id);
      const { data: existingDocs } = folderIds.length > 0
        ? await supabase
            .from("documentos_carpeta")
            .select("cloud_item_id")
            .in("carpeta_id", folderIds)
            .not("cloud_item_id", "is", null)
        : { data: [] };

      const knownCloudIds = new Set(
        (existingDocs ?? []).map((d: any) => d.cloud_item_id),
      );

      async function pullRecursivo(
        cloudPath: string,
        localCarpetaId: string | null,
      ) {
        let items: DriveItem[];
        try {
          items = await listFolderChildren(token, cloudPath);
        } catch {
          return;
        }

        for (const item of items) {
          if (item.folder) {
            let subCarpetaId: string | null = null;
            if (clienteFolders) {
              const match = clienteFolders.find(
                (c) =>
                  c.nombre === item.name &&
                  c.carpeta_padre_id === localCarpetaId,
              );
              if (match) {
                subCarpetaId = match.id;
                if (!match.carpeta_padre_id || match.carpeta_padre_id === localCarpetaId) {
                  await supabase
                    .from("carpetas_documentos")
                    .update({ cloud_folder_id: item.id })
                    .eq("id", match.id);
                }
              } else {
                const { data: newFolder } = await supabase
                  .from("carpetas_documentos")
                  .insert({
                    profile_id: cliente.id,
                    nombre: item.name,
                    carpeta_padre_id: localCarpetaId,
                    cloud_folder_id: item.id,
                  })
                  .select("id")
                  .single();
                subCarpetaId = newFolder?.id ?? null;
              }
            }
            await pullRecursivo(`${cloudPath}/${item.name}`, subCarpetaId);
          } else if (item.file && !knownCloudIds.has(item.id)) {
            if (!localCarpetaId) continue;
            try {
              const downloaded = await downloadDriveItem(token, item.id);
              const storagePath = `${cliente.id}/${localCarpetaId}/${Date.now()}_${downloaded.name}`;
              const { error: uploadErr } = await supabase.storage
                .from("documentos")
                .upload(storagePath, downloaded.data, {
                  contentType: downloaded.mimeType,
                });
              if (uploadErr) { erroresPull++; continue; }

              await supabase.from("documentos_carpeta").insert({
                carpeta_id: localCarpetaId,
                nombre_archivo: downloaded.name,
                url_storage: storagePath,
                subido_por: cliente.id,
                cloud_item_id: item.id,
                cloud_etag: item.eTag ?? null,
                cloud_modified_at: item.lastModifiedDateTime ?? null,
              });

              knownCloudIds.add(item.id);
              descargados++;

              await supabase.from("sync_log").insert({
                integracion_id: id,
                profile_id: cliente.id,
                direccion: "pull",
                archivo: downloaded.name,
                estado: "ok",
              });
            } catch (err) {
              erroresPull++;
              await supabase.from("sync_log").insert({
                integracion_id: id,
                profile_id: cliente.id,
                direccion: "pull",
                archivo: item.name,
                estado: "error",
                detalle: err instanceof Error ? err.message : "Error desconocido",
              });
            }
          }
        }
      }

      await pullRecursivo(cloudBase, null);
    }
  } catch {
    // Pull phase failure shouldn't block push results
  }

  await supabase.from("integraciones_almacenamiento").update({
    ultima_sync: new Date().toISOString(),
  }).eq("id", id);

  revalidatePath("/admin/almacenamiento");
  return { sincronizados, errores, descargados, erroresPull };
}
