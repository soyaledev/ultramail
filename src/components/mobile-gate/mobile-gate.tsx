"use client";

import { useEffect, useState } from "react";
import styles from "./mobile-gate.module.css";

export function MobileGate({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (isMobile) {
    return (
      <div className={styles.mobileMessage}>
        <div className={styles.content}>
          <h1>Ultramail</h1>
          <p>Este sistema únicamente funciona en PC por el momento.</p>
          <p className={styles.hint}>
            Por favor, accede desde un computador o tableta con pantalla más
            grande.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
