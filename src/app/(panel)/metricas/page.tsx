"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader } from "@/components/loader/loader";
import styles from "./metricas.module.css";

interface DayMetric {
  date: string;
  sent: number;
  failed: number;
  total: number;
}

interface SenderAlert {
  id: string;
  name: string;
  fromEmail: string;
  lastFailureAt: string | null;
  failureCount: number;
}

interface MetricsResponse {
  emailsPerDay: DayMetric[];
  successRate: number;
  totalLast14Days: { sent: number; failed: number };
  senderAlerts: SenderAlert[];
}

export default function MetricasPage() {
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/metrics");
      if (!res.ok) throw new Error("Error al cargar métricas");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Error al cargar métricas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  if (loading) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Métricas</h1>
        <Loader size="md" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Métricas</h1>
        <div className={styles.empty}>No se pudieron cargar las métricas.</div>
      </div>
    );
  }

  const { emailsPerDay, successRate, totalLast14Days, senderAlerts } = data;
  const totalEmails = totalLast14Days.sent + totalLast14Days.failed;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Métricas</h1>
        <p className={styles.subtitle}>
          Emails enviados por día y estado de remitentes (últimos 14 días)
        </p>
        <Button variant="outline" onClick={fetchMetrics}>
          Actualizar
        </Button>
      </div>

      <div className={styles.stats}>
        <Card>
          <CardHeader>
            <CardTitle>Total enviados</CardTitle>
          </CardHeader>
          <CardContent>
            <span className={styles.statValue}>{totalLast14Days.sent}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Fallidos</CardTitle>
          </CardHeader>
          <CardContent>
            <span className={styles.statValue}>{totalLast14Days.failed}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tasa de éxito</CardTitle>
          </CardHeader>
          <CardContent>
            <span className={styles.statValue}>
              {totalEmails > 0 ? `${Math.round(successRate * 100)}%` : "—"}
            </span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enviados por día</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles.chart}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={emailsPerDay}>
                <CartesianGrid strokeDasharray="3 3" className={styles.grid} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11 }}
                  domain={[0, "auto"]}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                  }}
                  labelFormatter={(v) => `Fecha: ${v}`}
                />
                <Legend />
                <Bar
                  dataKey="sent"
                  name="Enviados"
                  fill="var(--chart-2)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="failed"
                  name="Fallidos"
                  fill="var(--chart-5)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {senderAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Alertas de remitentes</CardTitle>
            <p className={styles.subtitle}>
              Remitentes con 3 o más fallos de verificación recientes
            </p>
          </CardHeader>
          <CardContent>
            <div className={styles.alertList}>
              {senderAlerts.map((s) => (
                <div key={s.id} className={styles.alertItem}>
                  <div>
                    <strong>{s.name}</strong> ({s.fromEmail})
                  </div>
                  <div className={styles.alertMeta}>
                    <Badge variant="destructive">
                      {s.failureCount} fallos de verificación
                    </Badge>
                    {s.lastFailureAt && (
                      <span className={styles.mono}>
                        Último:{" "}
                        {new Date(s.lastFailureAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
