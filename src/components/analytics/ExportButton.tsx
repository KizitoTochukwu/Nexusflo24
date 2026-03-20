import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface ExportButtonProps {
  data: Record<string, any>[];
  filename: string;
  label?: string;
}

export function exportCSV(rows: Record<string, any>[], filename: string) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => `"${r[k] ?? ""}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${filename}.csv`;
  a.click();
}

export default function ExportButton({ data, filename, label = "Export CSV" }: ExportButtonProps) {
  return (
    <Button variant="outline" size="sm" onClick={() => exportCSV(data, filename)}>
      <Download className="h-4 w-4 mr-1" />{label}
    </Button>
  );
}
