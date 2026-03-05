/*
 * ExportButton.tsx — Observatory Design
 * Reusable export button with download icon and consistent styling.
 */

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

interface ExportButtonProps {
  label?: string;
  onClick: () => void;
  variant?: "default" | "header";
}

export default function ExportButton({ label = "Export CSV", onClick, variant = "default" }: ExportButtonProps) {
  const handleClick = () => {
    try {
      onClick();
      toast.success("CSV downloaded", {
        description: "Your data has been exported and is ready for Power BI or Tableau.",
      });
    } catch {
      toast.error("Export failed", {
        description: "Something went wrong while generating the CSV file.",
      });
    }
  };

  if (variant === "header") {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
        onClick={handleClick}
      >
        <Download className="w-3.5 h-3.5" />
        {label}
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1.5 text-xs text-muted-foreground hover:text-primary"
      onClick={handleClick}
    >
      <Download className="w-3.5 h-3.5" />
      {label}
    </Button>
  );
}
