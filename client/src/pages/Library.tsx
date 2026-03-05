import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { useState, useMemo } from "react";
import {
  FolderOpen, Search, Calendar, FileText, BarChart3,
  Trash2, Eye, GitCompare, ArrowLeft, Loader2, Plus, Share2
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";

const EMPTY_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/91938469/6FYu2YaQLcgd9kxSPsmadU/empty-state-j3HM2QcKL7Gqd6pX2qDRfo.webp";

export default function Library() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [compareMode, setCompareMode] = useState(false);

  const { data: analyses, isLoading, refetch } = trpc.analysis.list.useQuery(undefined, {
    enabled: !!user,
  });

  const deleteMutation = trpc.analysis.delete.useMutation({
    onSuccess: () => {
      toast.success("Analysis deleted");
      refetch();
      setDeleteId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const filtered = useMemo(() => {
    if (!analyses) return [];
    if (!searchTerm.trim()) return analyses;
    const term = searchTerm.toLowerCase();
    return analyses.filter(
      (a) =>
        a.title.toLowerCase().includes(term) ||
        (a.semester?.toLowerCase().includes(term)) ||
        (a.academicYear?.toLowerCase().includes(term)) ||
        (a.fileName?.toLowerCase().includes(term))
    );
  }, [analyses, searchTerm]);

  const toggleCompare = (id: number) => {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <FolderOpen className="w-16 h-16 text-primary/40 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "var(--font-heading)" }}>
            Sign In Required
          </h2>
          <p className="text-muted-foreground mb-6">
            Sign in to access your saved analyses library.
          </p>
          <Button onClick={() => (window.location.href = getLoginUrl())}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Home
            </Button>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-lg font-semibold flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
              <FolderOpen className="w-5 h-5 text-primary" />
              Analysis Library
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {compareMode && compareIds.length >= 2 && (
              <Button
                size="sm"
                onClick={() => navigate(`/compare?ids=${compareIds.join(",")}`)}
              >
                <GitCompare className="w-4 h-4 mr-1" />
                Compare ({compareIds.length})
              </Button>
            )}
            <Button
              variant={compareMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setCompareMode(!compareMode);
                if (compareMode) setCompareIds([]);
              }}
            >
              <GitCompare className="w-4 h-4 mr-1" />
              {compareMode ? "Cancel" : "Compare"}
            </Button>
            <Button size="sm" onClick={() => navigate("/")}>
              <Plus className="w-4 h-4 mr-1" />
              New Analysis
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-8">
        {/* Search */}
        <div className="relative max-w-md mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, semester, or year..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-secondary"
          />
        </div>

        {compareMode && (
          <div className="panel p-3 mb-6 text-sm text-muted-foreground flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-primary" />
            Select 2-4 analyses to compare side-by-side. {compareIds.length} selected.
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <img src={EMPTY_IMG} alt="No analyses" className="w-40 h-40 mx-auto mb-6 opacity-50" />
            <h3 className="text-xl font-semibold mb-2" style={{ fontFamily: "var(--font-heading)" }}>
              {analyses?.length === 0 ? "No Saved Analyses" : "No Results Found"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {analyses?.length === 0
                ? "Upload a CSV and save your first analysis to see it here."
                : "Try a different search term."}
            </p>
            {analyses?.length === 0 && (
              <Button onClick={() => navigate("/")}>
                <Plus className="w-4 h-4 mr-1" />
                Start New Analysis
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((analysis, i) => (
              <motion.div
                key={analysis.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className={`panel p-5 group hover:glow-border transition-all duration-300 ${
                  compareIds.includes(analysis.id) ? "glow-border-active" : ""
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate" style={{ fontFamily: "var(--font-heading)" }}>
                      {analysis.title}
                    </h3>
                    {analysis.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {analysis.description}
                      </p>
                    )}
                  </div>
                  {compareMode && (
                    <Checkbox
                      checked={compareIds.includes(analysis.id)}
                      onCheckedChange={() => toggleCompare(analysis.id)}
                      className="ml-2 mt-1"
                    />
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {analysis.semester && (
                    <Badge variant="secondary" className="text-xs">
                      <Calendar className="w-3 h-3 mr-1" />
                      {analysis.semester}
                    </Badge>
                  )}
                  {analysis.academicYear && (
                    <Badge variant="outline" className="text-xs">
                      {analysis.academicYear}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono mb-4">
                  <span className="text-muted-foreground">Responses:</span>
                  <span className="text-primary">{analysis.totalResponses.toLocaleString()}</span>
                  <span className="text-muted-foreground">Topics:</span>
                  <span className="text-primary">{analysis.topicCount}</span>
                  <span className="text-muted-foreground">Noise:</span>
                  <span className="text-primary">{analysis.noiseRatio || "N/A"}</span>
                </div>

                <div className="text-xs text-muted-foreground mb-4 flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {analysis.fileName}
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => navigate(`/analysis/${analysis.id}`)}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => navigate(`/analysis/${analysis.id}/share`)}
                  >
                    <Share2 className="w-3.5 h-3.5 mr-1" />
                    Share
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(analysis.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <div className="text-[10px] text-muted-foreground mt-2 text-right">
                  {new Date(analysis.createdAt).toLocaleDateString()}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Analysis?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this analysis and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
