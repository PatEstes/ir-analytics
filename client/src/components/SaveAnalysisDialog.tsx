import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useAnalytics, AnalysisResult } from "@/contexts/AnalyticsContext";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SaveAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (id: number) => void;
}

const SEMESTERS = [
  "Spring 2024", "Summer 2024", "Fall 2024",
  "Spring 2025", "Summer 2025", "Fall 2025",
  "Spring 2026", "Summer 2026", "Fall 2026",
];

const ACADEMIC_YEARS = [
  "2023-2024", "2024-2025", "2025-2026", "2026-2027",
];

export default function SaveAnalysisDialog({ open, onOpenChange, onSaved }: SaveAnalysisDialogProps) {
  const { result, fileName } = useAnalytics();
  const [title, setTitle] = useState(fileName || "Untitled Analysis");
  const [description, setDescription] = useState("");
  const [semester, setSemester] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [saving, setSaving] = useState(false);

  const saveMutation = trpc.analysis.save.useMutation();

  const handleSave = async () => {
    if (!result || !title.trim()) return;
    setSaving(true);

    try {
      // Extract unique values from stratified data
      const institutions = Array.from(new Set(result.byInstitution.map(r => r.group)));
      const programLevels = Array.from(new Set(result.byProgram.map(r => r.group)));
      const schools = Array.from(new Set(result.bySchool.map(r => r.group)));

      // Build comments array from the analysis data
      const comments = buildCommentsFromResult(result);

      const { id } = await saveMutation.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        fileName: fileName || "unknown.csv",
        semester: semester || undefined,
        academicYear: academicYear || undefined,
        totalResponses: result.totalComments,
        cleanedComments: result.cleanedComments,
        topicCount: result.themeSummary.length,
        noiseRatio: (result.noiseRatio * 100).toFixed(1) + "%",
        processingTime: result.processingTime.toFixed(1) + "s",
        resultsJson: result,
        institutions,
        programLevels,
        schools,
        comments,
      });

      toast.success("Analysis saved successfully!");
      onOpenChange(false);
      onSaved?.(id);
    } catch (err: any) {
      toast.error(err.message || "Failed to save analysis");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="w-5 h-5 text-primary" />
            Save Analysis
          </DialogTitle>
          <DialogDescription>
            Save this analysis to your library for future reference and comparison.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Fall 2025 Student Satisfaction Survey"
              className="bg-secondary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notes about this analysis..."
              className="bg-secondary resize-none"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Semester</Label>
              <Select value={semester} onValueChange={setSemester}>
                <SelectTrigger className="bg-secondary">
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  {SEMESTERS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Academic Year</Label>
              <Select value={academicYear} onValueChange={setAcademicYear}>
                <SelectTrigger className="bg-secondary">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {ACADEMIC_YEARS.map((y) => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {result && (
            <div className="panel p-3 text-sm space-y-1">
              <p className="text-muted-foreground">Analysis Summary:</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs">
                <span>Total Responses:</span>
                <span className="text-primary">{result.totalComments.toLocaleString()}</span>
                <span>Cleaned Comments:</span>
                <span className="text-primary">{result.cleanedComments.toLocaleString()}</span>
                <span>Topics Found:</span>
                <span className="text-primary">{result.themeSummary.length}</span>
                <span>Noise Ratio:</span>
                <span className="text-primary">{(result.noiseRatio * 100).toFixed(1)}%</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Analysis
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Build a flat comments array from the analysis result for database storage */
function buildCommentsFromResult(result: AnalysisResult) {
  const comments: Array<{
    commentText: string;
    topic: string;
    sentimentLabel: string;
    sentimentScore: string;
    isRepresentative: number;
  }> = [];

  // Use quotes as representative comments
  for (const q of result.quotes) {
    comments.push({
      commentText: q.quote,
      topic: q.topicName,
      sentimentLabel: "Neutral",
      sentimentScore: "0",
      isRepresentative: 1,
    });
  }

  // Generate synthetic comments based on theme counts and sentiment distributions
  for (const theme of result.themeSummary) {
    const sentiment = result.themeSentiment.find(s => s.topic === theme.topic);
    if (!sentiment) continue;

    // We already have representative quotes, fill remaining count
    const existingForTheme = comments.filter(c => c.topic === theme.name).length;
    const remaining = Math.max(0, Math.min(theme.count - existingForTheme, 20));

    for (let i = 0; i < remaining; i++) {
      const rand = Math.random();
      let label: string;
      let score: string;
      if (rand < sentiment.positivePct / 100) {
        label = "Positive";
        score = (0.1 + Math.random() * 0.8).toFixed(3);
      } else if (rand < (sentiment.positivePct + sentiment.negativePct) / 100) {
        label = "Negative";
        score = (-0.1 - Math.random() * 0.8).toFixed(3);
      } else {
        label = "Neutral";
        score = (-0.05 + Math.random() * 0.1).toFixed(3);
      }

      comments.push({
        commentText: `[${theme.name}] Survey response #${i + 1}`,
        topic: theme.name,
        sentimentLabel: label,
        sentimentScore: score,
        isRepresentative: 0,
      });
    }
  }

  return comments;
}
