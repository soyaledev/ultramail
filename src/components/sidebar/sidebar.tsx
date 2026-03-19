"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutTemplate,
  History,
  Activity,
  Settings,
  Bot,
  LogOut,
  BarChart3,
  PanelLeftClose,
  PanelLeft,
  Mail,
} from "lucide-react";
import styles from "./sidebar.module.css";

const NAV_ITEMS = [
  { href: "/templates", label: "Plantillas", icon: LayoutTemplate },
  { href: "/logs", label: "Historial", icon: History },
  { href: "/actividad", label: "Actividad API", icon: Activity },
  { href: "/metricas", label: "Métricas", icon: BarChart3 },
  { href: "/newsletter", label: "Newsletter", icon: Mail },
  { href: "/settings", label: "Configuración", icon: Settings },
  { href: "/aia", label: "AIA", icon: Bot },
];

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/login", { method: "DELETE" });
    router.push("/login");
  }

  return (
    <>
      <div className={`${styles.logo} ${collapsed ? styles.collapsed : ""}`}>
        {collapsed ? (
          <Link href="/" className={styles.logoIcon}>
            <Image
              src="/Ultramail - favicon.svg"
              alt="Ultramail"
              width={28}
              height={28}
            />
          </Link>
        ) : (
          <Link href="/" className={styles.logoLink}>
            <Image
              src="/Ultramail - logo.svg"
              alt="Ultramail"
              width={140}
              height={46}
              className={styles.logoImg}
            />
          </Link>
        )}
        {onToggle && (
          <button
            type="button"
            className={styles.toggleBtn}
            onClick={onToggle}
            aria-label={collapsed ? "Expandir menú" : "Ocultar menú"}
          >
            {collapsed ? (
              <PanelLeft size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
          </button>
        )}
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
