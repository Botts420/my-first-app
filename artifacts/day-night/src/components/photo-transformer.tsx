import { useState, useRef, useEffect, useCallback } from "react";
import { UploadCloud, Sun, Moon, Download, RotateCcw, Loader2, Wand2 } from "lucide-react";
import { useTransformPhoto } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Direction = "dayToNight" | "nightToDay";

export function PhotoTransformer() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [direction, setDirection] = useState<Direction>("dayToNight");
  const [isDragging, setIsDragging] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");

  const promptSuggestions = [
    "add light fog",
    "golden hour",
    "gentle rain",
    "snowy winter",
    "neon city vibe",
    "warmer tones",
  ];

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const transformMutation = useTransformPhoto();

  // Normalize EXIF orientation by re-encoding the image via canvas.
  // Phones tag photos with rotation metadata; the AI ignores it and returns
  // raw pixels, which then look "rotated" compared to the original preview.
  const fileToBase64 = async (f: File): Promise<{ base64: string; mimeType: string }> => {
    try {
      const bitmap = await createImageBitmap(f, { imageOrientation: "from-image" });
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no-canvas-ctx");
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close?.();
      const outType = f.type === "image/png" ? "image/png" : "image/jpeg";
      const dataUrl = canvas.toDataURL(outType, 0.92);
      return { base64: dataUrl.split(",")[1], mimeType: outType };
    } catch {
      // Fallback: send the original bytes
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(f);
        reader.onload = () =>
          resolve({ base64: (reader.result as string).split(",")[1], mimeType: f.type });
        reader.onerror = reject;
      });
    }
  };

  const runTransform = useCallback(
    async (f: File, dir: Direction, prompt: string) => {
      try {
        const { base64, mimeType } = await fileToBase64(f);
        transformMutation.mutate(
          {
            data: {
              imageBase64: base64,
              mimeType,
              direction: dir,
              customPrompt: prompt.trim() || undefined,
            },
          },
          {
            onSuccess: (data) => {
              setResultUrl(`data:${data.mimeType};base64,${data.imageBase64}`);
            },
            onError: () => {
              toast({
                title: "Transformation failed",
                description: "Something went wrong. Please try again.",
                variant: "destructive",
              });
            },
          }
        );
      } catch {
        toast({ title: "Could not read image", variant: "destructive" });
      }
    },
    [transformMutation, toast]
  );

  const processFile = (selectedFile: File) => {
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(selectedFile.type)) {
      toast({ title: "Please use a JPEG, PNG, or WebP image.", variant: "destructive" });
      return;
    }
    if (selectedFile.size > 15 * 1024 * 1024) {
      toast({ title: "Image must be under 15MB.", variant: "destructive" });
      return;
    }
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setResultUrl(null);
    runTransform(selectedFile, direction, customPrompt);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processFile(e.target.files[0]);
  };

  const handleFlip = () => {
    if (!file) return;
    const next: Direction = direction === "dayToNight" ? "nightToDay" : "dayToNight";
    setDirection(next);
    runTransform(file, next, customPrompt);
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `botts-${direction}-${Date.now()}.${file?.type.split("/")[1] || "jpg"}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleReset = () => {
    setFile(null);
    setPreviewUrl(null);
    setResultUrl(null);
    setCustomPrompt("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Re-run when direction changes via flip handler (already triggers). No effect needed.
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const isPending = transformMutation.isPending;

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6 items-center min-h-[100dvh] justify-center">
      {!file && (
        <>
          <div className="text-center space-y-3 max-w-xl">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Day or Night</h1>
            <p className="text-base md:text-lg text-muted-foreground">
              Upload a photo. We'll flip it from day to night (or back) automatically.
            </p>
          </div>

          <Card
            className={cn(
              "w-full max-w-xl border-2 border-dashed transition-all duration-300 bg-card/50 backdrop-blur-sm cursor-pointer",
              isDragging
                ? "border-primary bg-primary/5 scale-[1.01]"
                : "border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/40"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <CardContent className="flex flex-col items-center justify-center py-20 gap-5">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/jpeg, image/png, image/webp"
                onChange={handleFileChange}
              />
              <div className="p-4 rounded-full bg-primary/10 text-primary">
                <UploadCloud className="w-10 h-10" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-lg font-semibold">Drop a photo or tap to choose</h3>
                <p className="text-xs text-muted-foreground">JPEG, PNG, WebP · up to 15MB</p>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {file && previewUrl && (
        <div className="w-full flex flex-col items-center gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Image Display */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">Before</div>
              <div className="relative rounded-2xl overflow-hidden bg-muted aspect-[4/3] shadow-md border border-border/50">
                <img src={previewUrl} alt="Original" className="w-full h-full object-cover" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center px-1">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">After</div>
                {resultUrl && (
                  <Button variant="ghost" size="sm" onClick={handleDownload} className="h-7 gap-1.5 -mr-2 text-xs">
                    <Download className="w-3.5 h-3.5" /> Save
                  </Button>
                )}
              </div>
              <div className="relative rounded-2xl overflow-hidden bg-muted aspect-[4/3] shadow-md border border-border/50">
                {resultUrl && !isPending ? (
                  <img src={resultUrl} alt="Transformed" className="w-full h-full object-cover animate-in fade-in duration-700" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/60 backdrop-blur-sm gap-3">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground animate-pulse">Working magic…</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Single primary action: flip + reset */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleFlip}
              disabled={isPending}
              size="lg"
              className="gap-2 px-6 rounded-xl shadow-md"
            >
              {direction === "dayToNight" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              {direction === "dayToNight" ? "Try Night → Day" : "Try Day → Night"}
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              size="lg"
              className="gap-2 rounded-xl"
              disabled={isPending}
            >
              <RotateCcw className="w-4 h-4" /> New photo
            </Button>
          </div>
        </div>
      )}

      {/* Make changes panel - always visible */}
      <Card className="w-full max-w-2xl bg-card/70 backdrop-blur-sm border-border/50 shadow-sm">
        <CardContent className="p-4 sm:p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Wand2 className="w-4 h-4 text-primary" />
            Make changes
          </div>
          <p className="text-xs text-muted-foreground -mt-1">
            {file
              ? "Describe a tweak, or tap a quick pick. Then hit Apply."
              : "Set up your tweak now — it'll apply to your photo as soon as you upload."}
          </p>
          <Textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder='e.g. "add light fog", "make it golden hour", "more dramatic shadows"'
            disabled={isPending}
            rows={2}
            className="resize-none rounded-xl bg-background/60 text-sm"
          />
          <div className="flex flex-wrap gap-1.5">
            {promptSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                disabled={isPending}
                onClick={() =>
                  setCustomPrompt((prev) => (prev.trim() ? `${prev.trim()}, ${s}` : s))
                }
                className="text-xs px-2.5 py-1 rounded-full bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                + {s}
              </button>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              disabled={isPending || !file}
              onClick={() => file && runTransform(file, direction, customPrompt)}
              className="rounded-xl gap-1.5"
              title={!file ? "Upload a photo first" : undefined}
            >
              <Wand2 className="w-3.5 h-3.5" /> Apply
            </Button>
            {customPrompt && (
              <Button
                size="sm"
                variant="ghost"
                disabled={isPending}
                onClick={() => setCustomPrompt("")}
                className="rounded-xl"
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
