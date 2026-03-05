"use client";

import { useState, useEffect, useMemo, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { HtmlEditor } from "@/components/template-editor/html-editor";
import { HtmlPreview } from "@/components/template-editor/html-preview";
import styles from "@/components/template-editor/template-editor.module.css";
import { toast } from "sonner";
import { TestSendDialog } from "@/components/template-editor/test-send-dialog";
import { Loader } from "@/components/loader/loader";

const VARIABLE_REGEX = /\{\{(\w+)\}\}/g;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditTemplatePage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testOpen, setTestOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/templates/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => {
        setName(data.name);
        setSubject(data.subject);
        setHtml(data.html);
      })
      .catch(() => {
        toast.error("Plantilla no encontrada");
        router.push("/templates");
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  const variables = useMemo(() => {
    const matches = new Set<string>();
    let match: RegExpExecArray | null;
    const combined = html + " " + subject;
    const regex = new RegExp(VARIABLE_REGEX);
    while ((match = regex.exec(combined)) !== null) {
      matches.add(match[1]);
    }
    return Array.from(matches);
  }, [html, subject]);

  async function handleSave() {
    if (!name || !subject || !html) {
      toast.error("Todos los campos son obligatorios");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, subject, html }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Error al guardar");
        return;
      }

      toast.success("Plantilla actualizada");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.wrapper} style={{ placeContent: "center" }}>
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <div className={styles.field}>
          <Label htmlFor="name">Nombre</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <Label htmlFor="subject">Asunto</Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
        <div className={styles.actions}>
          <Button variant="outline" onClick={() => setTestOpen(true)}>
            Enviar prueba
          </Button>
          <Button variant="outline" onClick={() => router.push("/templates")}>
            Volver
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>

      {variables.length > 0 && (
        <div className={styles.variables}>
          <span className={styles.variablesLabel}>Variables detectadas:</span>
          {variables.map((v) => (
            <Badge key={v} variant="secondary">
              {`{{${v}}}`}
            </Badge>
          ))}
        </div>
      )}

      <div className={styles.splitPane}>
        <HtmlEditor value={html} onChange={setHtml} />
        <HtmlPreview html={html} />
      </div>

      <TestSendDialog
        open={testOpen}
        onOpenChange={setTestOpen}
        templateId={id}
        variables={variables}
      />
    </div>
  );
}
