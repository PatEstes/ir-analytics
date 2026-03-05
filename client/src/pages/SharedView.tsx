import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useParams } from "wouter";
import { useEffect } from "react";
import { Loader2, Share2, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAnalytics, AnalysisResult } from "@/contexts/AnalyticsContext";
import Dashboard from "./Dashboard";

export default function SharedView() {
  const params = useParams<{ token: string }>();
  const token = params.token || "";
  const { result, setResult, setFileName } = useAnalytics();

  const { data, isLoading, error } = trpc.share.access.useQuery(
    { token },
    { enabled: !!token }
  );

  useEffect(() => {
    if (data?.analysis?.resultsJson) {
      setResult(data.analysis.resultsJson as AnalysisResult);
      setFileName(data.analysis.fileName || "shared_analysis.csv");
    }
  }, [data, setResult, setFileName]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data || !data.analysis) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <Share2 className="w-16 h-16 text-primary/40 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2" style={{ fontFamily: "var(--font-heading)" }}>
            Link Expired or Invalid
          </h2>
          <p className="text-muted-foreground">
            This shared analysis link is no longer available. It may have expired or been deactivated by the owner.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Shared Header Banner */}
      <div className="bg-primary/10 border-b border-primary/20">
        <div className="container flex items-center justify-between h-12">
          <div className="flex items-center gap-3 text-sm">
            <Share2 className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">Shared Analysis:</span>
            <span className="font-semibold">{data.analysis.title}</span>
            {data.analysis.semester && (
              <Badge variant="secondary" className="text-xs">
                {data.analysis.semester}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3 h-3" />
            Read-only view
          </div>
        </div>
      </div>

      {/* Render Dashboard with shared data */}
      {result && <Dashboard />}
    </div>
  );
}
