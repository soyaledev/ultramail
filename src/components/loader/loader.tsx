"use client";

import styles from "./loader.module.css";

interface LoaderProps {
  size?: "sm" | "md" | "lg";
  label?: string;
}

export function Loader({ size = "md", label }: LoaderProps) {
  return (
    <div
      className={`${styles.loader} ${styles[size]}`}
      role="status"
      aria-label={label ?? "Cargando"}
    >
      <div className={styles.envelope}>
        <svg
          viewBox="0 0 64 48"
          fill="none"
          className={styles.envelopeSvg}
          aria-hidden
        >
          <rect
            x="2"
            y="6"
            width="60"
            height="40"
            rx="0"
            className={styles.envelopeBg}
          />
          <path
            d="M2 8 L32 28 L62 8"
            className={styles.envelopeFold}
            pathLength="100"
          />
          <circle cx="32" cy="24" r="4" className={styles.envelopeDot} />
        </svg>
      </div>
      <div className={styles.bars}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={styles.barItem}
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>
      <span className={styles.text}>Ultramail</span>
      <div className={styles.dots}>
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
