import { useState, useRef, useEffect } from "react";
import { UploadCloud, Sun, Moon, ArrowRightLeft, Download, RotateCcw, Image as ImageIcon, Loader2 } from "lucide-react";
import { useTransformPhoto } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Direction = "dayToNight" | "nightToDay";

export function PhotoTransformer() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [direction, setDirection] = useState<Direction>("dayToNight");
  const [isDragging, setIsDragging] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const transformMutation = useTransformPhoto();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (selectedFile: File) => {
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(selectedFile.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPEG, PNG, or WebP image.",
        variant: "destructive",
      });
      return;
    }

    if (selectedFile.size > 15 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 15MB.",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    setResultUrl(null);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Strip the data:...;base64, prefix
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleTransform = async () => {
    if (!file) return;

    try {
      const base64 = await fileToBase64(file);
      
      transformMutation.mutate(
        {
          data: {
            imageBase64: base64,
            mimeType: file.type,
            direction,
          },
        },
        {
          onSuccess: (data) => {
            const newUrl = `data:${data.mimeType};base64,${data.imageBase64}`;
            setResultUrl(newUrl);
            toast({
              title: "Transformation complete!",
              description: `Successfully converted to ${direction === "dayToNight" ? "night" : "day"}.`,
            });
          },
          onError: () => {
            toast({
              title: "Transformation failed",
              description: "There was an error processing your image. Please try again.",
              variant: "destructive",
            });
          },
        }
      );
    } catch (error) {
      toast({
        title: "Error reading file",
        description: "Could not process the uploaded image.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `transformed-${direction}-${Date.now()}.${file?.type.split("/")[1] || "jpg"}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleReset = () => {
    setFile(null);
    setPreviewUrl(null);
    setResultUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-8 items-center min-h-[100dvh] justify-center">
      <div className="text-center space-y-4 max-w-2xl">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
          Day <span className="text-muted-foreground font-light mx-2">or</span> Night
        </h1>
        <p className="text-lg text-muted-foreground">
          Flip a magical switch on reality. Upload a photo and instantly see how it looks under different lighting.
        </p>
      </div>

      {!file && (
        <Card 
          className={cn(
            "w-full max-w-2xl border-2 border-dashed transition-all duration-300 bg-card/50 backdrop-blur-sm",
            isDragging ? "border-primary bg-primary/5 scale-[1.02]" : "border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/50"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <CardContent className="flex flex-col items-center justify-center py-24 cursor-pointer gap-6">
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
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold">Drop your photo here</h3>
              <p className="text-sm text-muted-foreground">or click to browse (JPEG, PNG, WebP up to 15MB)</p>
            </div>
            <div className="flex gap-4 opacity-50 pointer-events-none mt-4">
              <ImageIcon className="w-8 h-8" />
              <ArrowRightLeft className="w-8 h-8" />
              <Moon className="w-8 h-8" />
            </div>
          </CardContent>
        </Card>
      )}

      {file && previewUrl && (
        <div className="w-full flex flex-col items-center gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-card rounded-2xl shadow-sm border border-border/50">
            <div className="flex bg-muted p-1 rounded-xl">
              <button
                onClick={() => setDirection("dayToNight")}
                disabled={transformMutation.isPending}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-lg transition-all font-medium text-sm disabled:opacity-50",
                  direction === "dayToNight" 
                    ? "bg-background shadow-sm text-foreground" 
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                )}
              >
                <Sun className="w-4 h-4" />
                Day to Night
              </button>
              <button
                onClick={() => setDirection("nightToDay")}
                disabled={transformMutation.isPending}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-lg transition-all font-medium text-sm disabled:opacity-50",
                  direction === "nightToDay" 
                    ? "bg-background shadow-sm text-foreground" 
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                )}
              >
                <Moon className="w-4 h-4" />
                Night to Day
              </button>
            </div>

            <div className="w-px h-8 bg-border hidden sm:block" />

            <div className="flex gap-2">
              <Button 
                onClick={handleTransform} 
                disabled={transformMutation.isPending || !!resultUrl}
                className="gap-2 px-8 rounded-xl shadow-md transition-all hover:scale-105"
                size="lg"
              >
                {transformMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Transforming...
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="w-5 h-5" />
                    Transform
                  </>
                )}
              </Button>
              
              <Button
                onClick={handleReset}
                variant="ghost"
                size="icon"
                className="rounded-xl h-11 w-11"
                disabled={transformMutation.isPending}
                title="Start over"
              >
                <RotateCcw className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Image Display */}
          <div className="w-full flex flex-col lg:flex-row gap-6 items-stretch justify-center">
            
            {/* Original Image */}
            <div className="flex-1 flex flex-col gap-3">
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider pl-1">Original</div>
              <div className="relative rounded-2xl overflow-hidden bg-muted aspect-[4/3] shadow-md border border-border/50">
                <img 
                  src={previewUrl} 
                  alt="Original" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Result Image */}
            <div className="flex-1 flex flex-col gap-3">
              <div className="flex justify-between items-center pr-1">
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider pl-1">Result</div>
                {resultUrl && (
                  <Button variant="ghost" size="sm" onClick={handleDownload} className="h-8 gap-2 -mr-2">
                    <Download className="w-4 h-4" /> Download
                  </Button>
                )}
              </div>
              
              <div className="relative rounded-2xl overflow-hidden bg-muted aspect-[4/3] shadow-md border border-border/50">
                {resultUrl ? (
                  <img 
                    src={resultUrl} 
                    alt="Transformed result" 
                    className="w-full h-full object-cover animate-in fade-in duration-1000"
                  />
                ) : transformMutation.isPending ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/80 backdrop-blur-sm">
                    <div className="relative w-16 h-16 mb-4">
                      <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        {direction === "dayToNight" ? <Moon className="w-6 h-6 text-primary" /> : <Sun className="w-6 h-6 text-primary" />}
                      </div>
                    </div>
                    <p className="text-sm font-medium animate-pulse text-muted-foreground">Working magic...</p>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
                    <p className="text-sm text-muted-foreground/60 font-medium">Ready to transform</p>
                  </div>
                )}
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
