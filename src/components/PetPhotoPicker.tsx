import { useRef } from "react";
import { Camera, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { compressImageFileToJpegDataUrl } from "@/lib/images/compressImageToDataUrl";

type PetPhotoPickerProps = {
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
  inputId?: string;
};

export function PetPhotoPicker({ value, onChange, inputId = "pet-photo-input" }: PetPhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFileToJpegDataUrl(file);
      onChange(dataUrl);
    } catch {
      // Invalid or unreadable file — keep previous selection
    }
    e.target.value = "";
  };

  const handleRemove = () => {
    onChange(undefined);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      <Label htmlFor={inputId}>Profile photo</Label>
      <p className="text-xs text-muted-foreground mt-1 mb-2">
        Optional. Compressed and stored with your local data on this device.
      </p>
      <div className="mt-1.5">
        {value ? (
          <div className="relative rounded-[var(--radius-xl)] overflow-hidden border border-border/70 bg-secondary/30">
            <img src={value} alt="" className="w-full max-h-48 object-cover" />
            <div className="flex gap-2 p-3 border-t border-border/60 bg-background/80 backdrop-blur-sm">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 touch-button"
                onClick={() => inputRef.current?.click()}
              >
                Change photo
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 text-destructive hover:text-destructive"
                onClick={handleRemove}
                aria-label="Remove photo"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full min-h-[120px] border-2 border-dashed border-border rounded-[var(--radius-xl)] flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors active:scale-[0.99]"
          >
            <Camera className="w-7 h-7" />
            <span className="text-sm font-medium">Add photo</span>
          </button>
        )}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      </div>
    </div>
  );
}
