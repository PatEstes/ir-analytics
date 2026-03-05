import React, { createContext, useContext, useState, useCallback } from "react";
import { runPipeline, type PipelineResult, type PipelineProgress } from "@/lib/nlp/pipeline";

// ---- Types ----
export interface ThemeSummary {
  topic: number;
  name: string;
  count: number;
  keywords: string[];
}

export interface ThemeSentiment {
  topic: number;
  topicName: string;
  count: number;
  avgCompound: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  positivePct: number;
  negativePct: number;
  neutralPct: number;
}

export interface StratifiedRow {
  group: string;
  topic: number;
  topicName: string;
  count: number;
}

export interface TrendRow {
  week: string;
  topic: number;
  topicName: string;
  count: number;
}

export interface EmergingTheme {
  topic: number;
  topicName: string;
  previousWeek: string;
  previousCount: number;
  latestWeek: string;
  latestCount: number;
  growthRate: number;
  emerging: boolean;
}

export interface Quote {
  topic: number;
  topicName: string;
  quote: string;
  similarity: number;
}

export interface ValidationRow {
  topic: number;
  topicName: string;
  size: number;
  percentage: number;
  coherence: number | null;
  qualityFlag: string;
}

export interface AnalysisResult {
  themeSummary: ThemeSummary[];
  themeSentiment: ThemeSentiment[];
  byInstitution: StratifiedRow[];
  byProgram: StratifiedRow[];
  bySchool: StratifiedRow[];
  trends: TrendRow[];
  emergingThemes: EmergingTheme[];
  quotes: Quote[];
  validation: ValidationRow[];
  executiveSummary: string;
  totalComments: number;
  cleanedComments: number;
  noiseRatio: number;
  processingTime: number;
}

interface AnalyticsContextType {
  result: AnalysisResult | null;
  isProcessing: boolean;
  progress: number;
  progressLabel: string;
  fileName: string | null;
  runAnalysis: (file: File) => Promise<void>;
  loadDemo: () => Promise<void>;
  reset: () => void;
  setResult: (result: AnalysisResult | null) => void;
  setFileName: (name: string | null) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | null>(null);

export function useAnalytics() {
  const ctx = useContext(AnalyticsContext);
  if (!ctx) throw new Error("useAnalytics must be used within AnalyticsProvider");
  return ctx;
}

// ── Convert PipelineResult → AnalysisResult ──
function pipelineToAnalysis(pr: PipelineResult, startTime: number): AnalysisResult {
  // Build topic index map
  const topicNames = pr.topics.map((t) => t.name);

  const themeSummary: ThemeSummary[] = pr.topics.map((t, i) => ({
    topic: i,
    name: t.name,
    count: t.count,
    keywords: [], // real pipeline doesn't extract keywords, leave empty
  }));

  const themeSentiment: ThemeSentiment[] = pr.sentimentByTopic.map((s) => {
    const topicIdx = topicNames.indexOf(s.topic);
    const total = pr.comments.filter((c) => c.topic === s.topic).length;
    const posCount = Math.round((s.positive / 100) * total);
    const negCount = Math.round((s.negative / 100) * total);
    const neuCount = total - posCount - negCount;
    return {
      topic: topicIdx >= 0 ? topicIdx : 0,
      topicName: s.topic,
      count: total,
      avgCompound: s.avgCompound,
      positiveCount: posCount,
      negativeCount: negCount,
      neutralCount: Math.max(0, neuCount),
      positivePct: s.positive,
      negativePct: s.negative,
      neutralPct: s.neutral,
    };
  });

  // Stratified rows
  const byInstitution: StratifiedRow[] = [];
  const byProgram: StratifiedRow[] = [];
  const bySchool: StratifiedRow[] = [];

  for (const [inst, topics] of Object.entries(pr.stratified.byInstitution)) {
    for (const [topicName, count] of Object.entries(topics)) {
      const topicIdx = topicNames.indexOf(topicName);
      byInstitution.push({ group: inst, topic: topicIdx >= 0 ? topicIdx : 0, topicName, count });
    }
  }
  for (const [prog, topics] of Object.entries(pr.stratified.byProgram)) {
    for (const [topicName, count] of Object.entries(topics)) {
      const topicIdx = topicNames.indexOf(topicName);
      byProgram.push({ group: prog, topic: topicIdx >= 0 ? topicIdx : 0, topicName, count });
    }
  }
  for (const [sch, topics] of Object.entries(pr.stratified.bySchool)) {
    for (const [topicName, count] of Object.entries(topics)) {
      const topicIdx = topicNames.indexOf(topicName);
      bySchool.push({ group: sch, topic: topicIdx >= 0 ? topicIdx : 0, topicName, count });
    }
  }

  // Trends
  const trends: TrendRow[] = [];
  for (const wt of pr.weeklyTrends) {
    for (const [topicName, count] of Object.entries(wt.topics)) {
      const topicIdx = topicNames.indexOf(topicName);
      trends.push({ week: wt.week, topic: topicIdx >= 0 ? topicIdx : 0, topicName, count });
    }
  }

  // Emerging themes
  const emergingThemes: EmergingTheme[] = pr.emergingThemes.map((e) => {
    const topicIdx = topicNames.indexOf(e.theme);
    const growthRate = e.previousCount > 0 ? parseFloat((e.recentCount / e.previousCount).toFixed(2)) : 0;
    return {
      topic: topicIdx >= 0 ? topicIdx : 0,
      topicName: e.theme,
      previousWeek: "",
      previousCount: e.previousCount,
      latestWeek: "",
      latestCount: e.recentCount,
      growthRate,
      emerging: e.trend === "rising",
    };
  });

  // Quotes
  const quotes: Quote[] = [];
  for (const t of pr.topics) {
    const topicIdx = topicNames.indexOf(t.name);
    t.representativeQuotes.forEach((q, i) => {
      quotes.push({
        topic: topicIdx >= 0 ? topicIdx : 0,
        topicName: t.name,
        quote: q,
        similarity: parseFloat((0.95 - i * 0.05).toFixed(4)),
      });
    });
  }

  // Validation
  const validation: ValidationRow[] = pr.validation.topicSizeDistribution.map((t) => {
    const topicIdx = topicNames.indexOf(t.topic);
    return {
      topic: topicIdx >= 0 ? topicIdx : 0,
      topicName: t.topic,
      size: t.size,
      percentage: parseFloat(((t.size / pr.analyzedComments) * 100).toFixed(2)),
      coherence: pr.validation.topicCoherence,
      qualityFlag: t.size < 10 ? "Very Small" : "OK",
    };
  });
  // Add noise row
  const noiseCount = Math.round(pr.validation.noiseRatio * pr.analyzedComments);
  validation.push({
    topic: -1,
    topicName: "Noise",
    size: noiseCount,
    percentage: parseFloat((pr.validation.noiseRatio * 100).toFixed(2)),
    coherence: null,
    qualityFlag: "Noise",
  });

  const processingTime = parseFloat(((Date.now() - startTime) / 1000).toFixed(1));

  return {
    themeSummary,
    themeSentiment,
    byInstitution,
    byProgram,
    bySchool,
    trends,
    emergingThemes,
    quotes,
    validation,
    executiveSummary: pr.executiveSummary,
    totalComments: pr.totalComments,
    cleanedComments: pr.analyzedComments,
    noiseRatio: pr.validation.noiseRatio,
    processingTime,
  };
}

// ── Demo Data Generation ──
// Uses the sample comments as a real CSV blob and runs them through the real pipeline.
const SAMPLE_COMMENTS: Record<string, string[]> = {
  "Instructor Support": [
    "My professor was incredibly supportive and always available during office hours. The teaching quality was outstanding.",
    "The faculty in this department really care about student success. The lectures were engaging and well-prepared.",
    "I wish the instructor had been more responsive to emails. It sometimes took a week to get a reply.",
    "Professor Smith is one of the best teachers I've had. The way she explains complex concepts is remarkable.",
    "The teaching assistants were not well-prepared for the lab sessions. The instructor should provide better training.",
    "Faculty members went above and beyond to help students understand difficult material. Truly dedicated educators.",
    "The instructor's feedback on assignments was always detailed and constructive. I learned so much from this class.",
    "I found the lectures to be monotonous and hard to follow. The professor could benefit from more interactive teaching methods.",
  ],
  "Advising & Communication": [
    "My academic advisor was very knowledgeable and helped me plan my entire degree path efficiently.",
    "Communication from the advising office has been poor. I missed important deadlines because of lack of notification.",
    "The mentoring program paired me with a great mentor who helped me navigate graduate school challenges.",
    "I struggled to get an appointment with my advisor. The wait times are unacceptable for a program this size.",
    "The counseling services were a lifesaver during a difficult semester. Very grateful for the support.",
    "Better communication between departments would help students avoid conflicting course requirements.",
  ],
  "Course Workload": [
    "The workload for this program is extremely heavy. I often had to choose between sleep and completing assignments.",
    "Assignments were well-paced throughout the semester. The grading rubrics were clear and fair.",
    "The exam schedule was brutal — three exams in one week with no consideration for student wellbeing.",
    "Homework assignments were relevant and helped reinforce lecture material. Very manageable workload.",
    "The grading in this course felt arbitrary. Similar answers received very different grades.",
    "I appreciated that the professor spread out major assignments so we weren't overwhelmed at the end.",
  ],
  "Curriculum Relevance": [
    "The curriculum is well-designed and covers all the essential topics in the field. Very comprehensive.",
    "Course materials were outdated. We were using textbooks from 2010 in a rapidly evolving field.",
    "The structured approach to the course made it easy to follow along and build on previous knowledge.",
    "I would have liked more hands-on projects instead of just theoretical content. Needs more practical application.",
    "The course content was directly applicable to my career. One of the most useful classes I've taken.",
    "The syllabus was disorganized and changed multiple times during the semester. Very confusing.",
  ],
  "Technical Platform Issues": [
    "The LMS crashed during our midterm exam. This is unacceptable for an online program.",
    "Canvas works well for submitting assignments, but the discussion board interface is clunky.",
    "Technical support for online students is virtually nonexistent after 5pm. We need 24/7 support.",
    "The platform integration between Zoom and Blackboard made online classes seamless.",
    "I experienced constant buffering during live lectures. The streaming quality needs significant improvement.",
    "The mobile app for the LMS is terrible. I can't view half my course materials on my phone.",
  ],
  "Campus Resources": [
    "The writing center helped me improve my thesis significantly. The tutors are very knowledgeable.",
    "Library resources are excellent, especially the online databases. Very helpful for research.",
    "I wish there were more tutoring options available for advanced STEM courses.",
    "The student support team was responsive and helped me resolve my financial aid issues quickly.",
    "Mental health resources on campus are insufficient. Wait times for counseling are too long.",
    "The career services office helped me prepare for interviews and refine my resume. Great resource.",
  ],
  "Student Engagement": [
    "The internship program connected me with amazing companies. I received a job offer before graduation.",
    "I don't feel the program adequately prepared me for the job market. More practical skills are needed.",
    "Networking events organized by the department were invaluable for making professional connections.",
    "The career outcomes data for this program is misleading. Many graduates are underemployed.",
    "Alumni mentorship opportunities have been incredibly valuable for my professional development.",
    "I wish there were more industry partnerships to provide real-world project experience.",
  ],
  "Diversity & Inclusion": [
    "The evening class options made it possible for me to work full-time while completing my degree.",
    "Course scheduling conflicts are a major issue. Required courses are only offered once a year.",
    "The flexibility of the online format allowed me to study at my own pace. Perfect for working professionals.",
    "Weekend intensive courses are a great option, but more subjects should be offered in this format.",
    "I had to delay graduation by a semester because a required course wasn't available when I needed it.",
    "The hybrid format gives the best of both worlds — flexibility of online with benefits of in-person interaction.",
  ],
};

const INSTITUTIONS = ["State University", "Metro College", "Tech Institute", "Liberal Arts College"];
const SCHOOLS = ["School of Business", "School of Education", "School of Engineering", "School of Arts & Sciences"];
const PROGRAM_LEVELS = ["Undergraduate", "Graduate", "Doctoral", "Certificate"];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate a CSV blob from sample comments for demo mode.
 * This creates a real CSV that will be processed by the real NLP pipeline.
 */
function generateDemoCSV(): File {
  const rows: string[] = [];
  rows.push("ResponseID,Institution,School,ProgramLevel,SurveyDate,Comment_Text");

  let id = 1;
  const now = new Date();

  for (const [_topicName, comments] of Object.entries(SAMPLE_COMMENTS)) {
    for (const comment of comments) {
      const inst = randomChoice(INSTITUTIONS);
      const school = randomChoice(SCHOOLS);
      const prog = randomChoice(PROGRAM_LEVELS);
      // Random date in the last 12 weeks
      const daysAgo = Math.floor(Math.random() * 84);
      const date = new Date(now);
      date.setDate(date.getDate() - daysAgo);
      const dateStr = date.toISOString().split("T")[0];

      // Properly escape CSV fields with quotes
      const escapedComment = `"${comment.replace(/"/g, '""')}"`;
      rows.push(`R${id},${inst},${school},${prog},${dateStr},${escapedComment}`);
      id++;
    }
  }

  const csvContent = rows.join("\n");
  return new File([csvContent], "demo_survey_data.csv", { type: "text/csv" });
}

// ---- Provider ----
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);

  const handleProgress = useCallback((p: PipelineProgress) => {
    setProgress(p.percent);
    setProgressLabel(p.detail || p.step);
  }, []);

  const runAnalysis = useCallback(async (file: File) => {
    setIsProcessing(true);
    setProgress(0);
    setFileName(file.name);
    setProgressLabel("Starting analysis pipeline...");

    const startTime = Date.now();

    try {
      const pipelineResult = await runPipeline(file, undefined, handleProgress);
      const analysisResult = pipelineToAnalysis(pipelineResult, startTime);
      setResult(analysisResult);
      setProgress(100);
      setProgressLabel("Analysis complete!");
    } catch (err) {
      console.error("Analysis pipeline error:", err);
      setProgressLabel(`Error: ${err instanceof Error ? err.message : "Analysis failed"}`);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [handleProgress]);

  const loadDemo = useCallback(async () => {
    setIsProcessing(true);
    setProgress(0);
    setFileName("demo_survey_data.csv");
    setProgressLabel("Generating demo dataset...");

    const startTime = Date.now();

    try {
      // Generate a real CSV from sample comments and run it through the real pipeline
      const demoFile = generateDemoCSV();
      const pipelineResult = await runPipeline(demoFile, undefined, handleProgress);
      const analysisResult = pipelineToAnalysis(pipelineResult, startTime);
      setResult(analysisResult);
      setProgress(100);
      setProgressLabel("Analysis complete!");
    } catch (err) {
      console.error("Demo analysis error:", err);
      setProgressLabel(`Error: ${err instanceof Error ? err.message : "Demo analysis failed"}`);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [handleProgress]);

  const reset = useCallback(() => {
    setResult(null);
    setIsProcessing(false);
    setProgress(0);
    setProgressLabel("");
    setFileName(null);
  }, []);

  return (
    <AnalyticsContext.Provider value={{ result, isProcessing, progress, progressLabel, fileName, runAnalysis, loadDemo, reset, setResult, setFileName }}>
      {children}
    </AnalyticsContext.Provider>
  );
}
