"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar/sidebar";
import styles from "./panel-shell.module.css";

export function PanelShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={styles.desktopApp}>
      <aside
        className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}
      >
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
        />
      </aside>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
