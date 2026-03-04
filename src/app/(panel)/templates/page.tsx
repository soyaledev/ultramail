"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import styles from "./templates.module.css";

interface Template {
  id: string;
  name: string;
  subject: string;
  variables: string[];
  createdAt: string;
  updatedAt: string;
  _count: { logs: number };
}

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    try {
      const res = await fetch("/api/templates");
      const data = await res.json();
      setTemplates(data);
    } catch {
      toast.error("Error al cargar plantillas");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta plantilla y todos sus logs?")) return;

    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Error al eliminar");
        return;
      }
      toast.success("Plantilla eliminada");
      fetchTemplates();
    } catch {
      toast.error("Error de conexión");
    }
  }

  async function handleDuplicate(template: Template) {
    try {
      const original = await fetch(`/api/templates/${template.id}`).then((r) =>
        r.json()
      );

      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${original.name} (copia)`,
          subject: original.subject,
          html: original.html,
        }),
      });

      if (!res.ok) {
        toast.error("Error al duplicar");
        return;
      }

      toast.success("Plantilla duplicada");
      fetchTemplates();
    } catch {
      toast.error("Error de conexión");
    }
  }

  if (loading) {
    return <div className={styles.page}>Cargando...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Plantillas</h1>
        <Button onClick={() => router.push("/templates/new")}>
          Nueva plantilla
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className={styles.empty}>
          <p>No hay plantillas todavía.</p>
          <Button onClick={() => router.push("/templates/new")}>
            Crear primera plantilla
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Asunto</TableHead>
              <TableHead>Variables</TableHead>
              <TableHead>Envíos</TableHead>
              <TableHead>Actualizada</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((t) => (
              <TableRow key={t.id}>
                <TableCell className={styles.nameCell}>{t.name}</TableCell>
                <TableCell>{t.subject}</TableCell>
                <TableCell>
                  <div className={styles.badges}>
                    {t.variables.map((v) => (
                      <Badge key={v} variant="secondary">
                        {v}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>{t._count.logs}</TableCell>
                <TableCell>
                  {new Date(t.updatedAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        ...
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => router.push(`/templates/${t.id}`)}
                      >
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(t)}>
                        Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(t.id)}
                        className={styles.deleteItem}
                      >
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
