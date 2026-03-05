import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Library from "./pages/Library";
import AnalysisView from "./pages/AnalysisView";
import Compare from "./pages/Compare";
import ShareAnalysis from "./pages/ShareAnalysis";
import SharedView from "./pages/SharedView";
import { AnalyticsProvider } from "./contexts/AnalyticsContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/dashboard/:tab" component={Dashboard} />
      <Route path="/library" component={Library} />
      <Route path="/analysis/:id" component={AnalysisView} />
      <Route path="/analysis/:id/share" component={ShareAnalysis} />
      <Route path="/compare" component={Compare} />
      <Route path="/shared/:token" component={SharedView} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <AnalyticsProvider>
            <Toaster />
            <Router />
          </AnalyticsProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
