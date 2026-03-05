/**
 * csvParser.test.ts — Tests for CSV parser and column auto-detection
 */

import { describe, it, expect } from "vitest";
import { autoDetectColumns } from "./csvParser";

describe("autoDetectColumns", () => {
  it("detects standard Qualtrics column names", () => {
    const headers = ["ResponseID", "Institution", "School", "ProgramLevel", "SurveyDate", "Comment_Text"];
    const mapping = autoDetectColumns(headers);

    expect(mapping.responseId).toBe("ResponseID");
    expect(mapping.institution).toBe("Institution");
    expect(mapping.school).toBe("School");
    expect(mapping.programLevel).toBe("ProgramLevel");
    expect(mapping.surveyDate).toBe("SurveyDate");
    expect(mapping.commentText).toBe("Comment_Text");
  });

  it("detects case-insensitive variations", () => {
    const headers = ["response_id", "INSTITUTION", "department", "program_level", "survey_date", "feedback"];
    const mapping = autoDetectColumns(headers);

    expect(mapping.responseId).toBe("response_id");
    expect(mapping.institution).toBe("INSTITUTION");
    expect(mapping.school).toBe("department");
    expect(mapping.programLevel).toBe("program_level");
    expect(mapping.surveyDate).toBe("survey_date");
    expect(mapping.commentText).toBe("feedback");
  });

  it("detects non-standard column names (e.g., University, Degree, Open_Response)", () => {
    const headers = ["ID", "University", "Unit", "Degree", "Date_Submitted", "Open_Response"];
    const mapping = autoDetectColumns(headers);

    expect(mapping.responseId).toBe("ID");
    expect(mapping.institution).toBe("University");
    expect(mapping.school).toBe("Unit");
    expect(mapping.programLevel).toBe("Degree");
    expect(mapping.surveyDate).toBe("Date_Submitted");
    expect(mapping.commentText).toBe("Open_Response");
  });

  it("returns partial mapping when some columns are not found", () => {
    const headers = ["StudentID", "Comment_Text", "Timestamp"];
    const mapping = autoDetectColumns(headers);

    // commentText should be detected
    expect(mapping.commentText).toBe("Comment_Text");
    // surveyDate should match timestamp
    expect(mapping.surveyDate).toBe("Timestamp");
    // institution, school, programLevel should be undefined
    expect(mapping.institution).toBeUndefined();
    expect(mapping.school).toBeUndefined();
    expect(mapping.programLevel).toBeUndefined();
  });

  it("returns empty mapping when no columns match", () => {
    const headers = ["Col_A", "Col_B", "Col_C"];
    const mapping = autoDetectColumns(headers);

    expect(mapping.commentText).toBeUndefined();
    expect(mapping.responseId).toBeUndefined();
    expect(mapping.institution).toBeUndefined();
  });

  it("handles empty headers array", () => {
    const mapping = autoDetectColumns([]);
    expect(Object.keys(mapping).length).toBe(0);
  });

  it("handles headers with special characters", () => {
    const headers = ["Response-ID", "Comment Text", "Survey Date"];
    const mapping = autoDetectColumns(headers);

    // After stripping non-alphanumeric chars: "responseid", "commenttext", "surveydate"
    expect(mapping.responseId).toBe("Response-ID");
    expect(mapping.commentText).toBe("Comment Text");
    expect(mapping.surveyDate).toBe("Survey Date");
  });

  it("detects 'text' and 'answer' as comment text aliases", () => {
    const headers = ["id", "text"];
    const mapping = autoDetectColumns(headers);
    expect(mapping.commentText).toBe("text");

    const headers2 = ["id", "answer"];
    const mapping2 = autoDetectColumns(headers2);
    expect(mapping2.commentText).toBe("answer");
  });

  it("detects 'college' as institution alias", () => {
    const headers = ["college", "comments"];
    const mapping = autoDetectColumns(headers);
    expect(mapping.institution).toBe("college");
    expect(mapping.commentText).toBe("comments");
  });
});
