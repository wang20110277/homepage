"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud, FileText, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * FileUpload 组件属性
 */
interface FileUploadProps {
  /** 当前已上传的文件列表 */
  files: File[];
  /** 文件列表变更回调函数 */
  onFilesChange: (files: File[]) => void;
  /** 允许的文件扩展名，如 [".pdf", ".txt"] */
  accept?: string[];
  /** 单个文件最大大小（MB） */
  maxSizeMB?: number;
  /** 辅助提示文本 */
  helperText?: string;
}

const DEFAULT_ACCEPT = [".pdf", ".txt", ".pptx", ".docx"];
const DEFAULT_MAX_MB = 10;

/**
 * 文件上传组件
 *
 * 支持拖拽上传和点击选择文件，自动进行文件类型和大小验证。
 * 显示已上传文件列表，支持删除单个文件。
 *
 * @example
 * ```tsx
 * const [files, setFiles] = useState<File[]>([]);
 *
 * <FileUpload
 *   files={files}
 *   onFilesChange={setFiles}
 *   accept={[".pdf", ".docx"]}
 *   maxSizeMB={10}
 *   helperText="支持 PDF 和 DOCX 文件"
 * />
 * ```
 */
export function FileUpload({
  files,
  onFilesChange,
  accept = DEFAULT_ACCEPT,
  maxSizeMB = DEFAULT_MAX_MB,
  helperText = "支持 PDF / TXT / PPTX / DOCX, 单个文件不超过 10MB",
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(
    (fileList: FileList | File[]) => {
      const incoming = Array.from(fileList);
      const filtered: File[] = [];
      const limitBytes = maxSizeMB * 1024 * 1024;

      incoming.forEach((file) => {
        const ext = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
        if (!accept.includes(ext)) {
          setError(`暂不支持 ${ext} 文件`);
          return;
        }
        if (file.size > limitBytes) {
          setError(`${file.name} 超过 ${maxSizeMB}MB 限制`);
          return;
        }
        filtered.push(file);
      });

      if (!filtered.length) {
        return;
      }

      setError(null);
      const nextFiles = [...files, ...filtered].reduce<File[]>((acc, file) => {
        if (acc.some((item) => item.name === file.name && item.size === file.size)) {
          return acc;
        }
        acc.push(file);
        return acc;
      }, []);
      onFilesChange(nextFiles);
    },
    [accept, files, maxSizeMB, onFilesChange]
  );

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer?.files) {
      handleFiles(event.dataTransfer.files);
    }
  };

  const handleRemove = (target: File) => {
    onFilesChange(files.filter((file) => file !== target));
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
          "border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center gap-3 transition",
          isDragging ? "border-primary bg-primary/5" : "border-muted"
        )}
      >
        <UploadCloud className="w-10 h-10 text-primary" />
        <div>
          <p className="font-semibold">拖拽文件到这里，或</p>
          <Button variant="link" className="p-0" onClick={() => inputRef.current?.click()}>
            点击选择文件
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">{helperText}</p>
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>允许格式：</span>
          {accept.map((ext) => (
            <Badge key={ext} variant="secondary">
              {ext.toUpperCase()}
            </Badge>
          ))}
        </div>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          multiple
          accept={accept.join(",")}
          onChange={(event) => event.target.files && handleFiles(event.target.files)}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {!!files.length && (
        <div className="space-y-2">
          <p className="text-sm font-medium">已上传 {files.length} 个文件</p>
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={`${file.name}-${file.size}`}
                className="flex items-center justify-between rounded-lg border px-4 py-2"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleRemove(file)}>
                  <Trash2 className="w-4 h-4" />
                  <span className="sr-only">移除文件</span>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
