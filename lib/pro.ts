/**
 * Lógica PRO transversal: combina el interruptor global (Configuración >
 * Control PRO) con la aprobación individual de cada cliente para determinar
 * si el PRO está realmente visible. Los clientes internos de BAC siempre
 * están aprobados, pero igual quedan sujetos al interruptor global.
 */
export interface ProEstadoInput {
  tipo_usuario: string;
  pro_aprobado_por_admin: boolean;
}

export function esProEfectivo(cliente: ProEstadoInput, proGlobalActivo: boolean): boolean {
  if (!proGlobalActivo) return false;
  if (cliente.tipo_usuario === "interno_bac") return true;
  return cliente.pro_aprobado_por_admin;
}
