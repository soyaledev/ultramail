"use client";

import { useRef, useEffect } from "react";
import styles from "./template-editor.module.css";

interface HtmlPreviewProps {
  html: string;
}

export function HtmlPreview({ html }: HtmlPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(html);
    doc.close();
  }, [html]);

  return (
    <div className={styles.previewContainer}>
      <div className={styles.previewHeader}>Vista previa</div>
      <iframe
        ref={iframeRef}
        className={styles.iframe}
        title="Email Preview"
        sandbox="allow-same-origin"
      />
    </div>
  );
}
