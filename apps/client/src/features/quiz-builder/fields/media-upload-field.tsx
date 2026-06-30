import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { mediaApi } from "@/api/media.api";
import { getApiErrorMessage } from "@/lib/api-client";

interface Props {
  url: string;
  onChange: (url: string) => void;
  accept?: string;
}

export function MediaUploadField({ url, onChange, accept = "image/*,audio/*,video/*" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const result = await mediaApi.upload(file);
      onChange(result.url);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Upload failed"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
        <Upload className="h-4 w-4" /> {uploading ? "Uploading…" : url ? "Replace media" : "Upload media"}
      </Button>
      {url && (
        <>
          <span className="max-w-[12rem] truncate text-xs text-muted-foreground">{url.split("/").pop()}</span>
          <Button type="button" variant="ghost" size="icon" onClick={() => onChange("")}>
            <X className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}
