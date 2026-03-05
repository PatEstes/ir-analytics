/**
 * csvParser.ts — Robust CSV parser using PapaParse
 * Handles quoted fields, embedded commas, multi-line values, and column mapping.
 * 100% client-side, no data leaves the browser.
 */

import Papa from "papaparse";

export interface RawComment {
  responseId: string;
  institution: string;
  school: string;
  programLevel: string;
  surveyDate: string;
  commentText: string;
}

export interface ColumnMapping {
  responseId: string;
  institution: string;
  school: string;
  programLevel: string;
  surveyDate: string;
  commentText: string;
}

/** Default expected column names (case-insensitive matching) */
const DEFAULT_COLUMN_ALIASES: Record<keyof ColumnMapping, string[]> = {
  responseId: ["responseid", "response_id", "id", "respondent_id", "respondentid"],
  institution: ["institution", "inst", "university", "college", "school_name", "institutionname"],
  school: ["school", "department", "dept", "college_unit", "academic_unit", "unit"],
  programLevel: ["programlevel", "program_level", "level", "degree_level", "degreelevel", "program"],
  surveyDate: ["surveydate", "survey_date", "date", "response_date", "responsedate", "timestamp"],
  commentText: ["comment_text", "commenttext", "comment", "comments", "response_text", "responsetext", "text", "feedback", "open_ended", "openended", "q_text", "answer"],
};

/**
 * Auto-detect column mapping by matching CSV headers to known aliases.
 */
export function autoDetectColumns(headers: string[]): Partial<ColumnMapping> {
  const mapping: Partial<ColumnMapping> = {};
  const lowerHeaders = headers.map((h) => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, ""));

  for (const [field, aliases] of Object.entries(DEFAULT_COLUMN_ALIASES)) {
    const idx = lowerHeaders.findIndex((h) => aliases.includes(h));
    if (idx !== -1) {
      (mapping as Record<string, string>)[field] = headers[idx];
    }
  }

  return mapping;
}

/**
 * Parse a CSV file into structured comment records.
 * Uses PapaParse for robust handling of quoted fields, embedded commas, etc.
 */
export function parseCSV(
  file: File,
  columnMapping?: Partial<ColumnMapping>,
  onProgress?: (pct: number) => void
): Promise<{ comments: RawComment[]; headers: string[]; totalRows: number; skippedRows: number }> {
  return new Promise((resolve, reject) => {
    const comments: RawComment[] = [];
    let headers: string[] = [];
    let totalRows = 0;
    let skippedRows = 0;
    let mapping: ColumnMapping | null = null;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      step: (results: Papa.ParseStepResult<Record<string, string>>, parser) => {
        // On first row, detect columns if no mapping provided
        if (!mapping) {
          headers = results.meta.fields || [];
          const detected = columnMapping || autoDetectColumns(headers);
          mapping = {
            responseId: detected.responseId || "",
            institution: detected.institution || "",
            school: detected.school || "",
            programLevel: detected.programLevel || "",
            surveyDate: detected.surveyDate || "",
            commentText: detected.commentText || "",
          };

          if (!mapping.commentText) {
            parser.abort();
            reject(new Error("Could not detect a comment/text column. Please check your CSV headers."));
            return;
          }
        }

        totalRows++;
        const row = results.data;
        const text = (row[mapping.commentText] || "").trim();

        // Skip blank or very short comments (< 10 chars)
        if (!text || text.length < 10) {
          skippedRows++;
          return;
        }

        comments.push({
          responseId: row[mapping.responseId] || `R${totalRows}`,
          institution: row[mapping.institution] || "Unknown",
          school: row[mapping.school] || "Unknown",
          programLevel: row[mapping.programLevel] || "Unknown",
          surveyDate: row[mapping.surveyDate] || "",
          commentText: text,
        });

        // Report progress every 100 rows
        if (totalRows % 100 === 0 && onProgress) {
          onProgress(Math.min(95, totalRows)); // approximate
        }
      },
      complete: () => {
        onProgress?.(100);
        resolve({ comments, headers, totalRows, skippedRows });
      },
      error: (err: Error) => {
        reject(new Error(`CSV parsing failed: ${err.message}`));
      },
    });
  });
}
