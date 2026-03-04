"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import styles from "./logs.module.css";

interface LogEntry {
  id: string;
  templateId: string;
  to: string;
  subject: string;
  variables: Record<string, string>;
  status: string;
  error: string | null;
  sentAt: string;
  template: { name: string };
}

interface LogsResponse {
  logs: LogEntry[];
  total: number;
  page: number;
  totalPages: number;
}

export default function LogsPage() {
  const [data, setData] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "25" });
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/logs?${params}`);
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Error al cargar historial");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Historial de envíos</h1>
        <div className={styles.filters}>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className={styles.filterSelect}>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="sent">Enviados</SelectItem>
              <SelectItem value="failed">Fallidos</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchLogs}>
            Actualizar
          </Button>
        </div>
      </div>

      {loading ? (
        <div>Cargando...</div>
      ) : !data || data.logs.length === 0 ? (
        <div className={styles.empty}>No hay registros de envío.</div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Destinatario</TableHead>
                <TableHead>Plantilla</TableHead>
                <TableHead>Asunto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{log.to}</TableCell>
                  <TableCell>{log.template.name}</TableCell>
                  <TableCell>{log.subject}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        log.status === "sent" ? "default" : "destructive"
                      }
                    >
                      {log.status === "sent" ? "Enviado" : "Fallido"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(log.sentAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedLog(log)}
                    >
                      Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className={styles.pagination}>
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <span className={styles.pageInfo}>
              Página {data.page} de {data.totalPages} ({data.total} registros)
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        </>
      )}

      <Dialog
        open={!!selectedLog}
        onOpenChange={(open) => !open && setSelectedLog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle del envío</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className={styles.detail}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Destinatario</span>
                <span>{selectedLog.to}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Plantilla</span>
                <span>{selectedLog.template.name}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Asunto</span>
                <span>{selectedLog.subject}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Estado</span>
                <Badge
                  variant={
                    selectedLog.status === "sent" ? "default" : "destructive"
                  }
                >
                  {selectedLog.status === "sent" ? "Enviado" : "Fallido"}
                </Badge>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Fecha</span>
                <span>{new Date(selectedLog.sentAt).toLocaleString()}</span>
              </div>
              {selectedLog.error && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Error</span>
                  <span className={styles.errorText}>{selectedLog.error}</span>
                </div>
              )}
              {Object.keys(selectedLog.variables).length > 0 && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Variables</span>
                  <pre className={styles.variablesJson}>
                    {JSON.stringify(selectedLog.variables, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
