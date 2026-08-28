"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Cloud,
  FolderOpen,
  GitBranch,
  Home,
  Mail,
  MessageSquare,
  Settings,
  UserPlus,
  Users,
  BarChart3,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RolEnum } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
  roles: RolEnum[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: Home, exact: true, roles: ["admin", "contador", "asistente"] },
  { href: "/admin/clientes", label: "Clientes", icon: Users, roles: ["admin", "contador", "asistente"] },
  { href: "/admin/crear-usuario", label: "Crear usuario", icon: UserPlus, roles: ["admin"] },
  { href: "/admin/estadisticas", label: "Estadísticas", icon: BarChart3, roles: ["admin", "contador"] },
  { href: "/admin/flujo", label: "Flujo", icon: GitBranch, roles: ["admin", "contador"] },
  { href: "/admin/documentos-ejemplo", label: "Docs ejemplo", icon: FolderOpen, roles: ["admin", "contador", "asistente"] },
  { href: "/admin/correos", label: "Correos", icon: Mail, roles: ["admin"] },
  { href: "/admin/almacenamiento", label: "Almacenamiento", icon: Cloud, roles: ["admin"] },
  { href: "/admin/herramientas", label: "Herramientas", icon: Wrench, roles: ["admin", "contador", "asistente"] },
  { href: "/admin/notificaciones", label: "Notificaciones", icon: Bell, roles: ["admin"] },
  { href: "/admin/mensajeria", label: "Mensajería", icon: MessageSquare, roles: ["admin"] },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings, roles: ["admin"] },
];

export function AdminSidebar({
  collapsed,
  onToggle,
  rol,
}: {
  collapsed: boolean;
  onToggle: () => void;
  rol: RolEnum;
}) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(rol));

  return (
    <aside
      className={cn(
        "fixed bottom-0 left-0 top-16 z-30 flex flex-col border-r border-bac-gray-border bg-white transition-all",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-bac-red text-white"
                  : "text-bac-gray-text hover:bg-bac-gray-alt hover:text-gray-900"
              )}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={onToggle}
        className="flex items-center justify-center gap-2 border-t border-bac-gray-border py-3 text-xs text-bac-gray-text hover:bg-bac-gray-alt"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        {!collapsed && "Colapsar"}
      </button>
    </aside>
  );
}
