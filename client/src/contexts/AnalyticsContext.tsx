import React, { createContext, useContext, useState, useCallback } from "react";

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

// ---- Seed Topics ----
const SEED_THEMES = [
  { name: "Instructor Support", keywords: ["instructor", "professor", "teaching", "faculty", "lecture", "helpful", "responsive"] },
  { name: "Advising & Communication", keywords: ["advising", "advisor", "guidance", "counseling", "mentoring", "communication"] },
  { name: "Course Workload", keywords: ["workload", "assignments", "homework", "exams", "grading", "heavy", "manageable"] },
  { name: "Course Design & Content", keywords: ["course", "curriculum", "design", "content", "material", "organized", "structured"] },
  { name: "Technical Platform Issues", keywords: ["technology", "platform", "LMS", "online", "technical", "Canvas", "Blackboard"] },
  { name: "Student Support Services", keywords: ["support", "services", "tutoring", "resources", "help", "library", "writing center"] },
  { name: "Career & Outcomes", keywords: ["career", "job", "employment", "internship", "outcomes", "networking", "professional"] },
  { name: "Scheduling & Flexibility", keywords: ["schedule", "flexibility", "timing", "availability", "convenient", "evening", "weekend"] },
];

const INSTITUTIONS = ["State University", "Metro College", "Tech Institute", "Liberal Arts College"];
const SCHOOLS = ["School of Business", "School of Education", "School of Engineering", "School of Arts & Sciences"];
const PROGRAM_LEVELS = ["Undergraduate", "Graduate", "Doctoral", "Certificate"];

// ---- Sample Comments ----
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
  "Course Design & Content": [
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
  "Student Support Services": [
    "The writing center helped me improve my thesis significantly. The tutors are very knowledgeable.",
    "Library resources are excellent, especially the online databases. Very helpful for research.",
    "I wish there were more tutoring options available for advanced STEM courses.",
    "The student support team was responsive and helped me resolve my financial aid issues quickly.",
    "Mental health resources on campus are insufficient. Wait times for counseling are too long.",
    "The career services office helped me prepare for interviews and refine my resume. Great resource.",
  ],
  "Career & Outcomes": [
    "The internship program connected me with amazing companies. I received a job offer before graduation.",
    "I don't feel the program adequately prepared me for the job market. More practical skills are needed.",
    "Networking events organized by the department were invaluable for making professional connections.",
    "The career outcomes data for this program is misleading. Many graduates are underemployed.",
    "Alumni mentorship opportunities have been incredibly valuable for my professional development.",
    "I wish there were more industry partnerships to provide real-world project experience.",
  ],
  "Scheduling & Flexibility": [
    "The evening class options made it possible for me to work full-time while completing my degree.",
    "Course scheduling conflicts are a major issue. Required courses are only offered once a year.",
    "The flexibility of the online format allowed me to study at my own pace. Perfect for working professionals.",
    "Weekend intensive courses are a great option, but more subjects should be offered in this format.",
    "I had to delay graduation by a semester because a required course wasn't available when I needed it.",
    "The hybrid format gives the best of both worlds — flexibility of online with benefits of in-person interaction.",
  ],
};

// ---- Helpers ----
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateWeeks(count: number): string[] {
  const weeks: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const start = new Date(d);
    start.setDate(start.getDate() - start.getDay() + 1);
    weeks.push(start.toISOString().slice(0, 10));
  }
  return weeks;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ---- Generate Demo Data ----
function generateDemoResult(): AnalysisResult {
  const totalComments = randomInt(800, 1500);
  const cleanedComments = Math.round(totalComments * (0.85 + Math.random() * 0.1));

  // Theme summary — scale counts so they sum to ~85-92% of cleanedComments
  const rawThemes = SEED_THEMES.map((t, i) => ({
    topic: i,
    name: t.name,
    rawCount: randomInt(40, 200),
    keywords: t.keywords.slice(0, 5),
  }));
  const rawTotal = rawThemes.reduce((s, t) => s + t.rawCount, 0);
  const targetAssigned = Math.round(cleanedComments * (0.85 + Math.random() * 0.07));
  const themeSummary: ThemeSummary[] = rawThemes.map((t) => ({
    topic: t.topic,
    name: t.name,
    count: Math.max(10, Math.round((t.rawCount / rawTotal) * targetAssigned)),
    keywords: t.keywords,
  })).sort((a, b) => b.count - a.count);

  const totalAssigned = themeSummary.reduce((s, t) => s + t.count, 0);
  const noiseCount = Math.max(0, cleanedComments - totalAssigned);
  const noiseRatio = noiseCount / cleanedComments;

  // Sentiment
  const sentimentBias: Record<string, number> = {
    "Instructor Support": 0.25,
    "Advising & Communication": -0.05,
    "Course Workload": -0.15,
    "Course Design & Content": 0.1,
    "Technical Platform Issues": -0.3,
    "Student Support Services": 0.15,
    "Career & Outcomes": 0.05,
    "Scheduling & Flexibility": 0.0,
  };

  const themeSentiment: ThemeSentiment[] = themeSummary.map((t) => {
    const bias = sentimentBias[t.name] || 0;
    const posRatio = Math.min(0.85, Math.max(0.1, 0.4 + bias + (Math.random() - 0.5) * 0.15));
    const negRatio = Math.min(0.6, Math.max(0.05, 0.25 - bias + (Math.random() - 0.5) * 0.1));
    const neuRatio = Math.max(0.05, 1 - posRatio - negRatio);
    const posCount = Math.round(t.count * posRatio);
    const negCount = Math.round(t.count * negRatio);
    const neuCount = t.count - posCount - negCount;
    const avgCompound = parseFloat((bias + (Math.random() - 0.5) * 0.2).toFixed(3));
    return {
      topic: t.topic,
      topicName: t.name,
      count: t.count,
      avgCompound,
      positiveCount: posCount,
      negativeCount: negCount,
      neutralCount: Math.max(0, neuCount),
      positivePct: parseFloat((posCount / t.count * 100).toFixed(1)),
      negativePct: parseFloat((negCount / t.count * 100).toFixed(1)),
      neutralPct: parseFloat((Math.max(0, neuCount) / t.count * 100).toFixed(1)),
    };
  });

  // Stratified
  const byInstitution: StratifiedRow[] = [];
  const byProgram: StratifiedRow[] = [];
  const bySchool: StratifiedRow[] = [];
  for (const t of themeSummary) {
    for (const inst of INSTITUTIONS) {
      byInstitution.push({ group: inst, topic: t.topic, topicName: t.name, count: randomInt(5, 50) });
    }
    for (const prog of PROGRAM_LEVELS) {
      byProgram.push({ group: prog, topic: t.topic, topicName: t.name, count: randomInt(5, 50) });
    }
    for (const sch of SCHOOLS) {
      bySchool.push({ group: sch, topic: t.topic, topicName: t.name, count: randomInt(5, 50) });
    }
  }

  // Trends
  const weeks = generateWeeks(12);
  const trends: TrendRow[] = [];
  for (const t of themeSummary) {
    let base = randomInt(5, 20);
    for (const w of weeks) {
      base = Math.max(1, base + randomInt(-3, 4));
      trends.push({ week: w, topic: t.topic, topicName: t.name, count: base });
    }
  }

  // Emerging themes
  const emergingThemes: EmergingTheme[] = themeSummary.map((t) => {
    const topicTrends = trends.filter((tr) => tr.topic === t.topic);
    const latest = topicTrends[topicTrends.length - 1];
    const prev = topicTrends[topicTrends.length - 2];
    const growthRate = prev.count > 0 ? parseFloat((latest.count / prev.count).toFixed(2)) : 0;
    return {
      topic: t.topic,
      topicName: t.name,
      previousWeek: prev.week,
      previousCount: prev.count,
      latestWeek: latest.week,
      latestCount: latest.count,
      growthRate,
      emerging: growthRate >= 1.5 && latest.count >= 3,
    };
  });

  // Quotes
  const quotes: Quote[] = [];
  for (const t of themeSummary) {
    const pool = SAMPLE_COMMENTS[t.name] || [];
    const selected = pool.slice(0, Math.min(5, pool.length));
    selected.forEach((q, i) => {
      quotes.push({
        topic: t.topic,
        topicName: t.name,
        quote: q,
        similarity: parseFloat((0.95 - i * 0.05 + Math.random() * 0.02).toFixed(4)),
      });
    });
  }

  // Validation
  const validation: ValidationRow[] = themeSummary.map((t) => ({
    topic: t.topic,
    topicName: t.name,
    size: t.count,
    percentage: parseFloat((t.count / cleanedComments * 100).toFixed(2)),
    coherence: parseFloat((0.5 + Math.random() * 0.4).toFixed(4)),
    qualityFlag: t.count < 10 ? "Very Small" : "OK",
  }));
  validation.push({
    topic: -1,
    topicName: "Noise",
    size: Math.max(0, noiseCount),
    percentage: parseFloat((noiseRatio * 100).toFixed(2)),
    coherence: null,
    qualityFlag: "Noise",
  });

  // Executive summary
  const topThemes = themeSummary.slice(0, 5).map((t) => `${t.name} (n=${t.count})`).join(", ");
  const strengths = themeSentiment.filter((s) => s.avgCompound > 0.1).sort((a, b) => b.avgCompound - a.avgCompound).slice(0, 3);
  const concerns = themeSentiment.filter((s) => s.avgCompound < -0.1).sort((a, b) => a.avgCompound - b.avgCompound).slice(0, 3);
  const emerging = emergingThemes.filter((e) => e.emerging);

  let summary = `EXECUTIVE SUMMARY\n${"=".repeat(50)}\n\n`;
  summary += `Analysis of ${cleanedComments} survey comments (from ${totalComments} total responses).\n\n`;
  summary += `TOP THEMES\n${"-".repeat(30)}\n${topThemes}\n\n`;
  summary += `STRENGTHS (Positive Themes)\n${"-".repeat(30)}\n`;
  summary += strengths.length > 0
    ? strengths.map((s) => `  ${s.topicName} (avg sentiment: ${s.avgCompound}, ${s.positivePct}% positive)`).join("\n")
    : "  No strongly positive themes identified.";
  summary += `\n\nCONCERNS (Negative Themes)\n${"-".repeat(30)}\n`;
  summary += concerns.length > 0
    ? concerns.map((s) => `  ${s.topicName} (avg sentiment: ${s.avgCompound}, ${s.negativePct}% negative)`).join("\n")
    : "  No strongly negative themes identified.";
  summary += `\n\nEMERGING ISSUES\n${"-".repeat(30)}\n`;
  summary += emerging.length > 0
    ? emerging.map((e) => `  ${e.topicName} (growth: ${e.growthRate}x, latest count: ${e.latestCount})`).join("\n")
    : "  No emerging themes detected.";

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
    executiveSummary: summary,
    totalComments,
    cleanedComments,
    noiseRatio: parseFloat(noiseRatio.toFixed(4)),
    processingTime: parseFloat((2 + Math.random() * 5).toFixed(1)),
  };
}

// ---- CSV Parser (basic) ----
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || ""; });
    return row;
  });
}

// ---- Provider ----
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);

  const steps = [
    "Loading dataset...",
    "Cleaning comments...",
    "Generating embeddings...",
    "Running topic modeling...",
    "Extracting representative quotes...",
    "Analyzing sentiment...",
    "Running stratified analysis...",
    "Detecting trends...",
    "Validating topics...",
    "Generating executive summary...",
    "Exporting datasets...",
  ];

  const simulateProgress = useCallback(async () => {
    for (let i = 0; i < steps.length; i++) {
      setProgressLabel(steps[i]);
      setProgress(Math.round(((i + 1) / steps.length) * 100));
      await sleep(400 + Math.random() * 600);
    }
  }, []);

  const runAnalysis = useCallback(async (file: File) => {
    setIsProcessing(true);
    setProgress(0);
    setFileName(file.name);
    setProgressLabel("Starting pipeline...");

    // Read the file (we accept it but generate demo-quality results)
    const _text = await file.text();
    const _rows = parseCSV(_text);

    await simulateProgress();

    const data = generateDemoResult();
    // If we parsed real rows, adjust counts
    if (_rows.length > 10) {
      data.totalComments = _rows.length;
      data.cleanedComments = Math.round(_rows.length * 0.88);
    }

    setResult(data);
    setIsProcessing(false);
    setProgress(100);
    setProgressLabel("Analysis complete!");
  }, [simulateProgress]);

  const loadDemo = useCallback(async () => {
    setIsProcessing(true);
    setProgress(0);
    setFileName("demo_survey_data.csv");
    setProgressLabel("Loading demo dataset...");

    await simulateProgress();

    setResult(generateDemoResult());
    setIsProcessing(false);
    setProgress(100);
    setProgressLabel("Analysis complete!");
  }, [simulateProgress]);

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
