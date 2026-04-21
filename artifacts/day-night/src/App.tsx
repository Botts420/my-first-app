import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { PhotoTransformer } from "@/components/photo-transformer";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

const queryClient = new QueryClient();

// Minimal theme provider since we are not using standard shadcn theme provider here
function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme]);

  return (
    <div className="min-h-screen relative">
      <header className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-4 sm:px-6 py-3 bg-background/60 backdrop-blur-md border-b border-border/40">
        <div className="flex items-center gap-3.5">
          <div className="relative w-[3.375rem] h-[3.375rem] rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-md">
            <Camera className="w-[1.875rem] h-[1.875rem] text-primary-foreground" strokeWidth={2.25} />
            <div className="absolute -top-1 -right-1 w-[0.9375rem] h-[0.9375rem] rounded-full bg-amber-300 ring-2 ring-background" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-2xl tracking-tight text-foreground">Botts</span>
            <span className="text-[15px] uppercase tracking-[0.18em] text-muted-foreground -mt-0.5">photos</span>
          </div>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full bg-background/50 backdrop-blur-sm border-border"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        >
          {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </Button>
      </header>
      <div className="pt-24">{children}</div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={PhotoTransformer} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
