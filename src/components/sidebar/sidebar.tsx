"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutTemplate,
  History,
  Activity,
  Settings,
  Bot,
  LogOut,
  BarChart3,
} from "lucide-react";
import styles from "./sidebar.module.css";

const NAV_ITEMS = [
  { href: "/templates", label: "Plantillas", icon: LayoutTemplate },
  { href: "/logs", label: "Historial", icon: History },
  { href: "/actividad", label: "Actividad API", icon: Activity },
  { href: "/metricas", label: "Métricas", icon: BarChart3 },
  { href: "/settings", label: "Configuración", icon: Settings },
  { href: "/aia", label: "AIA", icon: Bot },
];

export function Sidebar({ collapsed }: { collapsed?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/login", { method: "DELETE" });
    router.push("/login");
  }

  return (
    <>
      <div className={`${styles.logo} ${collapsed ? styles.collapsed : ""}`}>
        <h1 className={styles.logoText}>Ultramail</h1>
      </div>

      <nav className={`${styles.nav} ${collapsed ? styles.collapsed : ""}`}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${
                pathname.startsWith(item.href) ? styles.active : ""
              } ${collapsed ? styles.collapsed : ""}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={18} className={styles.navIcon} />
              <span className={styles.navLabel}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={`${styles.footer} ${collapsed ? styles.collapsed : ""}`}>
        <button
          onClick={handleLogout}
          className={styles.logout}
          title={collapsed ? "Cerrar sesión" : undefined}
        >
          <LogOut size={18} className={styles.navIcon} />
          <span className={styles.navLabel}>Cerrar sesión</span>
        </button>
      </div>
    </>
  );
}
