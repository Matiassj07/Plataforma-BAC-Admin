export interface BacConfig {
  id: number;
  nombre: string;
  logo_url: string | null;
  correo_contacto: string | null;
  idioma: string;
  sitio_web: string | null;
  pro_global_activo: boolean;
}

export interface AdminItem {
  id: string;
  email: string;
  nombre_empresa: string;
  created_at: string;
}
