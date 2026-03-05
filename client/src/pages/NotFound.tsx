import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

const EMPTY_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/91938469/6FYu2YaQLcgd9kxSPsmadU/empty-state-j3HM2QcKL7Gqd6pX2qDRfo.webp";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background grid-dots">
      <div className="w-full max-w-md mx-4 text-center">
        <img src={EMPTY_IMG} alt="Not found" className="w-48 h-48 mx-auto mb-8 opacity-60" />
        <h1 className="text-5xl font-bold text-primary mb-2 stat-number">404</h1>
        <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: "var(--font-heading)" }}>
          Page Not Found
        </h2>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button onClick={() => setLocation("/")} className="gap-2">
          <Home className="w-4 h-4" />
          Back to Home
        </Button>
      </div>
    </div>
  );
}
