import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import { useState } from "react";
import {
  ArrowLeft, Loader2, Share2, Link2, Copy, Check,
  Trash2, Clock, Eye, ExternalLink
} from "lucide-react";
import { toast } from "sonner";

export default function ShareAnalysis() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const analysisId = parseInt(params.id || "0", 10);

  const [label, setLabel] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("30");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const { data: analysis } = trpc.analysis.get.useQuery(
    { id: analysisId },
    { enabled: !!user && analysisId > 0 }
  );

  const { data: links, isLoading, refetch } = trpc.share.listByAnalysis.useQuery(
    { analysisId },
    { enabled: !!user && analysisId > 0 }
  );

  const createMutation = trpc.share.create.useMutation({
    onSuccess: (data) => {
      toast.success("Share link created!");
      refetch();
      copyToClipboard(data.shareToken);
      setLabel("");
    },
    onError: (err) => toast.error(err.message),
  });

  const deactivateMutation = trpc.share.deactivate.useMutation({
    onSuccess: () => {
      toast.success("Link deactivated");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const getShareUrl = (token: string) => `${window.location.origin}/shared/${token}`;

  const copyToClipboard = (token: string) => {
    navigator.clipboard.writeText(getShareUrl(token));
    setCopiedToken(token);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopiedToken(null), 3000);
  };

  const handleCreate = () => {
    createMutation.mutate({
      analysisId,
      label: label.trim() || undefined,
      expiresInDays: expiresInDays === "never" ? undefined : parseInt(expiresInDays),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/library")}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Library
            </Button>
            <div className="h-5 w-px bg-border" />
            <h1 className="text-sm font-semibold flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
              <Share2 className="w-4 h-4 text-primary" />
              Share: {analysis?.title || "Analysis"}
            </h1>
          </div>
        </div>
      </header>

      <div className="container py-8 max-w-2xl">
        {/* Create New Link */}
        <section className="panel p-6 mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
            <Link2 className="w-5 h-5 text-primary" />
            Create Share Link
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Generate a read-only link that anyone can use to view this analysis without signing in.
          </p>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Link Label (optional)</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g., For Dean's Office, For Accreditation Team"
                className="bg-secondary"
              />
            </div>

            <div className="space-y-2">
              <Label>Expiration</Label>
              <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                <SelectTrigger className="bg-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                  <SelectItem value="never">Never expires</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Link2 className="w-4 h-4 mr-2" />
              )}
              Generate Link
            </Button>
          </div>
        </section>

        {/* Existing Links */}
        <section>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
            <Share2 className="w-5 h-5 text-primary" />
            Active Links
          </h2>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : !links || links.length === 0 ? (
            <div className="panel p-6 text-center text-muted-foreground">
              No share links yet. Create one above.
            </div>
          ) : (
            <div className="space-y-3">
              {links.map((link) => {
                const isExpired = link.expiresAt ? link.expiresAt < Date.now() : false;
                const isActive = link.isActive === 1 && !isExpired;

                return (
                  <div
                    key={link.id}
                    className={`panel p-4 ${!isActive ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium">
                          {link.label || "Shared Link"}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
                            {isActive ? "Active" : isExpired ? "Expired" : "Deactivated"}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {link.accessCount} views
                          </span>
                          {link.expiresAt && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Expires {new Date(link.expiresAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {isActive && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(link.shareToken)}
                            >
                              {copiedToken === link.shareToken ? (
                                <Check className="w-4 h-4 text-green-400" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(getShareUrl(link.shareToken), "_blank")}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => deactivateMutation.mutate({ id: link.id })}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {isActive && (
                      <div className="mt-2 flex items-center gap-2 p-2 bg-secondary rounded text-xs font-mono text-muted-foreground">
                        <span className="truncate flex-1">{getShareUrl(link.shareToken)}</span>
                      </div>
                    )}

                    <p className="text-[10px] text-muted-foreground mt-2">
                      Created {new Date(link.createdAt).toLocaleString()}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
