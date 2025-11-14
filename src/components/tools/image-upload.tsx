"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { UploadCloud, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
const MAX_FILE_SIZE_MB = 5;

/**
 * ImageUpload 组件属性
 */
interface ImageUploadProps {
  /** 当前上传的图片文件 */
  file: File | null;
  /** 图片预览 URL */
  previewUrl: string | null;
  /** 图片变更回调函数 */
  onChange: (file: File | null, previewUrl: string | null) => void;
  /** 辅助提示文本 */
  helperText?: string;
}

/**
 * 图片上传组件
 *
 * 专门用于图片上传的组件，支持拖拽和点击上传。
 * 自动生成图片预览，支持文件类型和大小验证。
 *
 * @example
 * ```tsx
 * const [file, setFile] = useState<File | null>(null);
 * const [preview, setPreview] = useState<string | null>(null);
 *
 * <ImageUpload
 *   file={file}
 *   previewUrl={preview}
 *   onChange={(newFile, newPreview) => {
 *     setFile(newFile);
 *     setPreview(newPreview);
 *   }}
 * />
 * ```
 */
export function ImageUpload({
  file,
  previewUrl,
  onChange,
  helperText = "支持 JPG / PNG / WEBP，单张不超过 5MB",
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (candidate: File) => {
    if (!ACCEPTED_TYPES.includes(candidate.type)) {
      setError("当前文件类型不受支持");
      return false;
    }
    if (candidate.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`文件大小不可超过 ${MAX_FILE_SIZE_MB}MB`);
      return false;
    }
    return true;
  };

  const handleFileChange = (files: FileList | null) => {
    if (!files?.length) return;
    const picked = files[0];
    if (!validateFile(picked)) {
      return;
    }
    const preview = URL.createObjectURL(picked);
    onChange(picked, preview);
    setError(null);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleFileChange(event.dataTransfer?.files ?? null);
  };

  const handleRemove = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    onChange(null, null);
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-2xl p-6 transition flex flex-col gap-4 text-center",
          isDragging ? "border-primary bg-primary/5" : "border-muted"
        )}
      >
        {previewUrl ? (
          <div className="relative mx-auto h-56 w-full max-w-md overflow-hidden rounded-xl">
            <Image src={previewUrl} alt="上传预览" fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <UploadCloud className="h-10 w-10 text-primary" />
            <p className="font-medium text-foreground">拖拽图片到这里，或点击上传</p>
            <p className="text-sm">支持截图、证件、扫描件等素材</p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>允许格式：</span>
          {ACCEPTED_TYPES.map((type) => (
            <Badge key={type} variant="secondary">
              {type.split("/")[1]?.toUpperCase()}
            </Badge>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button variant="outline" onClick={() => inputRef.current?.click()}>
            选择文件
          </Button>
          {file && (
            <Button variant="ghost" onClick={handleRemove} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> 清除图片
            </Button>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          className="sr-only"
          onChange={(event) => handleFileChange(event.target.files)}
        />

        <p className="text-sm text-muted-foreground">{helperText}</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
