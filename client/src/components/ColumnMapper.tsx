/**
 * ColumnMapper.tsx — Interactive column mapping UI
 * Shows a CSV preview and lets users map their columns to the expected fields.
 * Auto-detects standard Qualtrics columns, allows manual override.
 */

import { useState, useMemo, useCallback } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Columns3,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  FileText,
  Eye,
} from "lucide-react";
import { autoDetectColumns, type ColumnMapping } from "@/lib/nlp/csvParser";
import { motion } from "framer-motion";

/** The fields the pipeline expects */
const FIELDS: {
  key: keyof ColumnMapping;
  label: string;
  description: string;
  required: boolean;
}[] = [
  {
    key: "commentText",
    label: "Comment Text",
    description: "The open-ended survey response text (required)",
    required: true,
  },
  {
    key: "responseId",
    label: "Response ID",
    description: "Unique identifier for each response",
    required: false,
  },
  {
    key: "institution",
    label: "Institution",
    description: "University or college name",
    required: false,
  },
  {
    key: "school",
    label: "School / Department",
    description: "Academic unit or department",
    required: false,
  },
  {
    key: "programLevel",
    label: "Program Level",
    description: "Degree level (Undergraduate, Graduate, etc.)",
    required: false,
  },
  {
    key: "surveyDate",
    label: "Survey Date",
    description: "Date the response was submitted",
    required: false,
  },
];

const SKIP_VALUE = "__skip__";

interface ColumnMapperProps {
  file: File;
  onConfirm: (file: File, mapping: Partial<ColumnMapping>) => void;
  onCancel: () => void;
}

export default function ColumnMapper({
  file,
  onConfirm,
  onCancel,
}: ColumnMapperProps) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<keyof ColumnMapping, string>>(
    {} as Record<keyof ColumnMapping, string>
  );
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightedColumn, setHighlightedColumn] = useState<string | null>(
    null
  );

  // Parse the first few rows on mount
  useMemo(() => {
    if (loaded) return;

    Papa.parse(file, {
      header: true,
      preview: 6, // first 6 rows for preview (1 header + 5 data)
      skipEmptyLines: true,
      complete: (results) => {
        const hdrs = results.meta.fields || [];
        setHeaders(hdrs);
        setPreviewRows(
          (results.data as Record<string, string>[]).slice(0, 5)
        );

        // Auto-detect column mapping
        const detected = autoDetectColumns(hdrs);
        const initialMapping = {} as Record<keyof ColumnMapping, string>;
        for (const field of FIELDS) {
          initialMapping[field.key] =
            (detected as Record<string, string>)[field.key] || SKIP_VALUE;
        }
        setMapping(initialMapping);
        setLoaded(true);
        setError(null);
      },
      error: (err: Error) => {
        setError(`Failed to read CSV: ${err.message}`);
        setLoaded(true);
      },
    });
  }, [file, loaded]);

  // Validation
  const isValid = useMemo(() => {
    return mapping.commentText && mapping.commentText !== SKIP_VALUE;
  }, [mapping]);

  const autoDetectedCount = useMemo(() => {
    return Object.values(mapping).filter((v) => v && v !== SKIP_VALUE).length;
  }, [mapping]);

  // Check for duplicate mappings (same CSV column mapped to multiple fields)
  const duplicates = useMemo(() => {
    const used = new Map<string, string[]>();
    for (const [field, col] of Object.entries(mapping)) {
      if (col && col !== SKIP_VALUE) {
        if (!used.has(col)) used.set(col, []);
        used.get(col)!.push(field);
      }
    }
    const dupes: string[] = [];
    Array.from(used.entries()).forEach(([col, fields]) => {
      if (fields.length > 1) dupes.push(col);
    });
    return dupes;
  }, [mapping]);

  const handleFieldChange = useCallback(
    (field: keyof ColumnMapping, value: string) => {
      setMapping((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleReset = useCallback(() => {
    const detected = autoDetectColumns(headers);
    const resetMapping = {} as Record<keyof ColumnMapping, string>;
    for (const field of FIELDS) {
      resetMapping[field.key] =
        (detected as Record<string, string>)[field.key] || SKIP_VALUE;
    }
    setMapping(resetMapping);
  }, [headers]);

  const handleConfirm = useCallback(() => {
    // Build the partial mapping (skip fields set to SKIP_VALUE)
    const finalMapping: Partial<ColumnMapping> = {};
    for (const [field, col] of Object.entries(mapping)) {
      if (col && col !== SKIP_VALUE) {
        (finalMapping as Record<string, string>)[field] = col;
      }
    }
    onConfirm(file, finalMapping);
  }, [mapping, file, onConfirm]);

  if (!loaded) {
    return (
      <div className="panel p-8 glow-border">
        <div className="flex items-center gap-3 text-muted-foreground">
          <FileText className="w-5 h-5 animate-pulse text-primary" />
          <span>Reading CSV headers...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel p-8 glow-border">
        <div className="flex items-center gap-3 text-destructive">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
        <Button variant="outline" className="mt-4" onClick={onCancel}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="panel p-6 sm:p-8 glow-border"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Columns3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2
              className="text-xl font-semibold"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Map Your Columns
            </h2>
            <p className="text-sm text-muted-foreground">
              {file.name} &middot; {headers.length} columns detected &middot;{" "}
              {autoDetectedCount} auto-matched
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
          onClick={handleReset}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset to Auto-Detect
        </Button>
      </div>

      {/* Column Mapping Grid */}
      <div className="space-y-3 mb-6">
        {FIELDS.map((field) => {
          const currentValue = mapping[field.key];
          const isMapped = currentValue && currentValue !== SKIP_VALUE;
          const isDuplicate =
            isMapped && duplicates.includes(currentValue);

          return (
            <div
              key={field.key}
              className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-lg border transition-colors ${
                isDuplicate
                  ? "border-amber-500/40 bg-amber-500/5"
                  : isMapped
                    ? "border-primary/20 bg-primary/5"
                    : "border-border bg-secondary/30"
              }`}
            >
              {/* Field info */}
              <div className="sm:w-56 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{field.label}</span>
                  {field.required && (
                    <Badge
                      variant="default"
                      className="text-[10px] px-1.5 py-0"
                    >
                      Required
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {field.description}
                </p>
              </div>

              {/* Arrow */}
              <ArrowRight className="hidden sm:block w-4 h-4 text-muted-foreground shrink-0" />

              {/* Column selector */}
              <div className="flex-1">
                <Select
                  value={currentValue || SKIP_VALUE}
                  onValueChange={(val) => handleFieldChange(field.key, val)}
                >
                  <SelectTrigger
                    className={`w-full ${
                      isMapped
                        ? "border-primary/30"
                        : "border-border"
                    }`}
                    onMouseEnter={() =>
                      isMapped ? setHighlightedColumn(currentValue) : null
                    }
                    onMouseLeave={() => setHighlightedColumn(null)}
                  >
                    <SelectValue placeholder="Select a column..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SKIP_VALUE}>
                      <span className="text-muted-foreground italic">
                        — Skip (not mapped) —
                      </span>
                    </SelectItem>
                    {headers.map((header) => (
                      <SelectItem key={header} value={header}>
                        <span className="font-mono text-xs">{header}</span>
                        {/* Show a preview of the first value */}
                        {previewRows[0]?.[header] && (
                          <span className="ml-2 text-muted-foreground text-xs truncate max-w-[200px]">
                            e.g. "{previewRows[0][header].slice(0, 40)}
                            {previewRows[0][header].length > 40 ? "..." : ""}"
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status indicator */}
              <div className="sm:w-8 shrink-0 flex items-center justify-center">
                {isDuplicate ? (
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                ) : isMapped ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <span className="w-4 h-4 rounded-full border border-muted-foreground/30" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Warnings */}
      {duplicates.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 mb-4">
          <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-300">
            Warning: Column{duplicates.length > 1 ? "s" : ""}{" "}
            <span className="font-mono">
              {duplicates.map((d) => `"${d}"`).join(", ")}
            </span>{" "}
            {duplicates.length > 1 ? "are" : "is"} mapped to multiple fields.
            Each column should map to only one field.
          </p>
        </div>
      )}

      {!isValid && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 mb-4">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-sm text-destructive">
            The <strong>Comment Text</strong> field is required. Please map it to
            the column containing your survey responses.
          </p>
        </div>
      )}

      {/* Data Preview */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Eye className="w-4 h-4 text-muted-foreground" />
          <h3
            className="text-sm font-medium text-muted-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Data Preview (first {previewRows.length} rows)
          </h3>
        </div>
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto max-h-[280px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50">
                  {headers.map((header) => {
                    // Find which field this column is mapped to
                    const mappedField = Object.entries(mapping).find(
                      ([, col]) => col === header
                    );
                    const isHighlighted = highlightedColumn === header;
                    const isMapped =
                      mappedField && mappedField[1] !== SKIP_VALUE;

                    return (
                      <TableHead
                        key={header}
                        className={`text-xs transition-colors ${
                          isHighlighted
                            ? "bg-primary/20 text-primary"
                            : isMapped
                              ? "text-primary/80"
                              : "text-muted-foreground"
                        }`}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono font-medium">
                            {header}
                          </span>
                          {isMapped && (
                            <span className="text-[10px] text-primary/60 font-sans">
                              →{" "}
                              {
                                FIELDS.find(
                                  (f) => f.key === mappedField[0]
                                )?.label
                              }
                            </span>
                          )}
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((row, rowIdx) => (
                  <TableRow key={rowIdx}>
                    {headers.map((header) => {
                      const isHighlighted = highlightedColumn === header;
                      const value = row[header] || "";
                      return (
                        <TableCell
                          key={header}
                          className={`text-xs font-mono max-w-[200px] truncate transition-colors ${
                            isHighlighted ? "bg-primary/10" : ""
                          }`}
                          title={value}
                        >
                          {value.length > 60
                            ? value.slice(0, 60) + "..."
                            : value || (
                                <span className="text-muted-foreground/50 italic">
                                  empty
                                </span>
                              )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
        <p className="text-xs text-muted-foreground">
          Unmapped optional fields will use default values ("Unknown" or
          auto-generated IDs).
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="border-border"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            className="gap-2"
            disabled={!isValid || duplicates.length > 0}
            onClick={handleConfirm}
          >
            <CheckCircle2 className="w-4 h-4" />
            Confirm & Analyze
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
