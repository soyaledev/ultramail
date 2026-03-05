"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styles from "./sidebar.module.css";

const NAV_ITEMS = [
  { href: "/templates", label: "Plantillas" },
  { href: "/logs", label: "Historial" },
  { href: "/actividad", label: "Actividad API" },
  { href: "/settings", label: "Configuración" },
  { href: "/aia", label: "AIA" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/login", { method: "DELETE" });
    router.push("/login");
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <h1 className={styles.logoText}>Ultramail</h1>
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${
              pathname.startsWith(item.href) ? styles.active : ""
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className={styles.footer}>
        <button onClick={handleLogout} className={styles.logout}>
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
