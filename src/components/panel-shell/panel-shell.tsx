"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar/sidebar";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import styles from "./panel-shell.module.css";

export function PanelShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={styles.desktopApp}>
        <aside
          className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}
        >
          <Sidebar collapsed={collapsed} />
          <button
            type="button"
            className={styles.toggleBtn}
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expandir menú" : "Ocultar menú"}
          >
            {collapsed ? (
              <PanelLeft size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
          </button>
        </aside>
        <main className={styles.main}>{children}</main>
      </div>
  );
}
