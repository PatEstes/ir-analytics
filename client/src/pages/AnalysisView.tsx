import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import { useEffect, useMemo } from "react";
import { ArrowLeft, Loader2, Share2, Calendar, FileText, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAnalytics, AnalysisResult } from "@/contexts/AnalyticsContext";
import Dashboard from "./Dashboard";

export default function AnalysisView() {
  const { user } = useAuth();
  const params = useParams<{ id: string; tab?: string }>();
  const [, navigate] = useLocation();
  const { result, setResult, setFileName } = useAnalytics();

  const analysisId = parseInt(params.id || "0", 10);

  const { data, isLoading, error } = trpc.analysis.get.useQuery(
    { id: analysisId },
    { enabled: !!user && analysisId > 0 }
  );

  // Load the saved analysis into the AnalyticsContext so Dashboard can render it
  useEffect(() => {
    if (data?.resultsJson) {
      setResult(data.resultsJson as AnalysisResult);
      setFileName(data.fileName);
    }
  }, [data, setResult, setFileName]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Analysis Not Found</h2>
          <p className="text-muted-foreground mb-4">This analysis may have been deleted or you don't have access.</p>
          <Button onClick={() => navigate("/library")}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Library
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Analysis Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/library")}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Library
            </Button>
            <div className="h-5 w-px bg-border" />
            <h1 className="text-sm font-semibold truncate max-w-xs" style={{ fontFamily: "var(--font-heading)" }}>
              {data.title}
            </h1>
            {data.semester && (
              <Badge variant="secondary" className="text-xs">
                <Calendar className="w-3 h-3 mr-1" />
                {data.semester}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/analysis/${analysisId}/share`)}>
              <Share2 className="w-4 h-4 mr-1" />
              Share
            </Button>
          </div>
        </div>
      </div>

      {/* Render the Dashboard with the loaded data */}
      {result && <Dashboard />}
    </div>
  );
}
