import { PanelShell } from "@/components/panel-shell/panel-shell";

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ height: "100vh", overflow: "hidden" }}>
      <PanelShell>{children}</PanelShell>
    </div>
  );
}
