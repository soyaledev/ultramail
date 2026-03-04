"use client";

import dynamic from "next/dynamic";
import styles from "./template-editor.module.css";

const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), {
  ssr: false,
});

interface HtmlEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function HtmlEditor({ value, onChange }: HtmlEditorProps) {
  return (
    <div className={styles.editorContainer}>
      <div className={styles.editorHeader}>HTML</div>
      <CodeMirror
        value={value}
        height="100%"
        theme="dark"
        onChange={onChange}
        className={styles.codeMirror}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: true,
          bracketMatching: true,
          autocompletion: true,
        }}
      />
    </div>
  );
}
