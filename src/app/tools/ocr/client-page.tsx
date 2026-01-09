"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import {
  Sparkles,
  CheckCircle2,
  Zap,
  FileText,
  Shield,
  Copy,
  Loader2,
  XCircle,
  Download,
  Trash2,
  Upload,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// 类型定义
// ============================================================================

const modeOptions = [
  { value: "Free OCR", label: "普通识别", description: "快速提取图片文字" },
  { value: "Markdown Conversion", label: "文档结构输出", description: "保留标题 / 列表结构" },
] as const;

const modelOptions = [
  { value: "Tiny", label: "迷你", description: "极速返回" },
  { value: "Small", label: "小型", description: "速度与准确平衡" },
  { value: "Base", label: "基础", description: "通用场景" },
  { value: "Large", label: "大型", description: "高精度复杂文本" },
  { value: "Gundam (Recommended)", label: "高达（推荐）", description: "最佳平衡" },
] as const;

type OCRMode = (typeof modeOptions)[number]["value"];
type ModelSize = (typeof modelOptions)[number]["value"];

type TaskStatus = 'uploading' | 'pending' | 'processing' | 'completed' | 'failed' | 'expired';

interface OCRTask {
  taskId: string;
  fileName: string;
  fileSize: number;
  thumbnailUrl?: string;
  status: TaskStatus;
  result?: string;
  error?: string;
  inferenceTime?: number;
  workerId?: number;
  expiresIn?: number;
  createdAt: number;
  expanded: boolean;
}

const features = [
  { icon: Zap, text: "极速识别响应，适合批量文件" },
  { icon: FileText, text: "保留段落、列表等文档结构" },
  { icon: Shield, text: "全程加密处理，保障隐私" },
  { icon: CheckCircle2, text: "针对票据/表格做专项优化" },
];

const usageTips = [
  "基础模型覆盖大多数场景，系统会自动裁剪噪声边缘",
  "文档结构输出更适合长文档或带层级的资料",
  "普通识别可快速提取短文本或截图内容",
  "上传清晰、对比度高的图片有助于提升准确率",
];

// ============================================================================
// 常量配置
// ============================================================================

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_DIMENSION = 4096; // 4096x4096
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const OCR_SERVICE_URL = process.env.NEXT_PUBLIC_OCR_SERVICE_URL || 'http://localhost:8000';
const POLL_INTERVAL = 5000; // 5秒轮询一次
const CACHE_DURATION = 120 * 1000; // 120秒缓存（2分钟）
const MAX_RECONNECT_ATTEMPTS = 3; // 最大重连次数
const RECONNECT_DELAY = 2000; // 重连延迟（毫秒）

// ============================================================================
// 主组件
// ============================================================================

export default function OCRToolPage() {
  const { data: session } = useSession();
  const [mode, setMode] = useState<OCRMode>("Free OCR");
  const [modelSize, setModelSize] = useState<ModelSize>("Gundam (Recommended)");
  const [tasks, setTasks] = useState<OCRTask[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // ========== 生命周期 ==========

  useEffect(() => {
    // 从 localStorage 恢复任务
    const restoreTasks = () => {
      try {
        const saved = localStorage.getItem('ocr_tasks');
        if (saved) {
          const parsedTasks = JSON.parse(saved) as OCRTask[];
          const validTasks = parsedTasks
            .filter(task => {
              const age = Date.now() - task.createdAt;
              return age < CACHE_DURATION; // 30秒内
            })
            .map(task => {
              // ✨ 刷新页面导致 WebSocket 连接断开，将进行中的任务标记为失败
              if (task.status === 'uploading' || task.status === 'pending' || task.status === 'processing') {
                return {
                  ...task,
                  status: 'failed' as TaskStatus,
                  error: '页面刷新导致连接中断，请重新上传'
                };
              }
              return task;
            });

          setTasks(validTasks);

          // ✨ 恢复已完成和失败任务的轮询（30秒后自动清理）
          validTasks.forEach(task => {
            if (task.status === 'completed' || task.status === 'failed') {
              startExpiryPolling(task.taskId);
            }
          });
        }
      } catch (error) {
        console.error('Failed to restore tasks:', error);
      }
    };

    restoreTasks();

    // 监听其他标签页的 localStorage 变化（跨标签页同步）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ocr_tasks' && e.newValue) {
        try {
          const parsedTasks = JSON.parse(e.newValue) as OCRTask[];
          const validTasks = parsedTasks
            .filter(task => {
              const age = Date.now() - task.createdAt;
              return age < CACHE_DURATION;
            })
            .map(task => {
              // ✨ 刷新页面导致 WebSocket 连接断开，将进行中的任务标记为失败
              if (task.status === 'uploading' || task.status === 'pending' || task.status === 'processing') {
                return {
                  ...task,
                  status: 'failed' as TaskStatus,
                  error: '页面刷新导致连接中断，请重新上传'
                };
              }
              return task;
            });

          setTasks(validTasks);

          // ✨ 恢复已完成和失败任务的轮询
          validTasks.forEach(task => {
            if ((task.status === 'completed' || task.status === 'failed') && !pollIntervalsRef.current.has(task.taskId)) {
              startExpiryPolling(task.taskId);
            }
          });
        } catch (error) {
          console.error('Failed to sync tasks from other tabs:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // 保存 ref 值用于清理
    const intervals = pollIntervalsRef.current;

    return () => {
      // 清理所有轮询定时器
      intervals.forEach((interval) => clearInterval(interval));
      intervals.clear();

      // 移除事件监听
      window.removeEventListener('storage', handleStorageChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // 保存任务到 localStorage（合并模式）
    const saveTasks = () => {
      try {
        // 1. 读取现有的所有任务（包括其他标签页的）
        const saved = localStorage.getItem('ocr_tasks');
        const existingTasks = saved ? JSON.parse(saved) as OCRTask[] : [];

        // 2. 创建 taskId 映射（用于去重和更新）
        const taskMap = new Map<string, OCRTask>();

        // 3. 先添加现有任务
        existingTasks.forEach(task => {
          taskMap.set(task.taskId, task);
        });

        // 4. 用当前任务覆盖/新增（当前标签页的任务优先）
        tasks.forEach(task => {
          taskMap.set(task.taskId, {
            ...task,
            thumbnailUrl: undefined, // 不保存缩略图（太大）
          });
        });

        // 5. 过滤掉过期任务（30秒）
        const allTasks = Array.from(taskMap.values()).filter(task => {
          const age = Date.now() - task.createdAt;
          return age < CACHE_DURATION;
        });

        // 6. 按创建时间降序排序（最新的在前面）
        allTasks.sort((a, b) => b.createdAt - a.createdAt);

        // 7. 保存到 localStorage
        localStorage.setItem('ocr_tasks', JSON.stringify(allTasks));
      } catch (error) {
        console.error('Failed to save tasks:', error);
      }
    };

    saveTasks();
  }, [tasks]);

  // ========== 辅助函数 ==========

  const updateTask = (taskId: string, updates: Partial<OCRTask>) => {
    setTasks(prev => prev.map(task =>
      task.taskId === taskId ? { ...task, ...updates } : task
    ));
  };

  const removeTask = (taskId: string) => {
    // 1. 从 state 中移除
    setTasks(prev => prev.filter(task => task.taskId !== taskId));
    stopExpiryPolling(taskId);

    // 2. 从 localStorage 中移除
    try {
      const saved = localStorage.getItem('ocr_tasks');
      if (saved) {
        const existingTasks = JSON.parse(saved) as OCRTask[];
        const updatedTasks = existingTasks.filter(task => task.taskId !== taskId);
        localStorage.setItem('ocr_tasks', JSON.stringify(updatedTasks));
      }
    } catch (error) {
      console.error('Failed to remove task from localStorage:', error);
    }
  };

  // ========== 图片验证 ==========

  const validateImage = async (file: File): Promise<{ valid: boolean; error?: string }> => {
    // 检查文件大小
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `文件过大：${(file.size / 1024 / 1024).toFixed(2)}MB，最大限制 10MB`
      };
    }

    // 检查文件格式
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: `不支持的格式：${file.type}，仅支持 JPG/PNG/WebP`
      };
    }

    // 检查分辨率
    try {
      const img = await loadImageFromFile(file);
      if (img.width > MAX_DIMENSION || img.height > MAX_DIMENSION) {
        return {
          valid: false,
          error: `分辨率过大：${img.width}x${img.height}，最大限制 ${MAX_DIMENSION}x${MAX_DIMENSION}`
        };
      }
      return { valid: true };
    } catch {
      return {
        valid: false,
        error: '无法读取图片信息'
      };
    }
  };

  const loadImageFromFile = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // ========== 文件上传处理 ==========

  const handleFileUpload = async (file: File) => {
    // 验证图片
    const validation = await validateImage(file);
    if (!validation.valid) {
      toast.error(`${file.name}: ${validation.error}`);
      return;
    }

    // 生成安全的用户名（用于 taskId）
    const userEmail = session?.user?.email || 'anonymous';
    const safeUsername = userEmail.replace(/[^a-zA-Z0-9]/g, '_');

    // 生成任务ID：用户名 + 时间戳
    const taskId = `task_${safeUsername}_${Date.now()}`;

    // 创建任务
    const newTask: OCRTask = {
      taskId,
      fileName: file.name,
      fileSize: file.size,
      status: 'uploading',
      createdAt: Date.now(),
      expanded: false,
    };

    setTasks(prev => [newTask, ...prev]);

    // 开始处理
    processOCRTask(taskId, file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
      e.target.value = ''; // 清空input，允许重复选择同一文件
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // ========== OCR 处理 ==========

  const processOCRTask = async (taskId: string, file: File, retryCount = 0) => {
    try {
      // 读取文件为 base64
      const base64 = await fileToBase64(file);

      // 建立 WebSocket 连接
      const wsUrl = OCR_SERVICE_URL.replace(/^http/, 'ws').replace(/^https/, 'wss') + '/ws/ocr';
      const ws = new WebSocket(wsUrl);

      // 连接超时检测
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
          handleConnectionError('连接超时');
        }
      }, 10000); // 10秒连接超时

      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        updateTask(taskId, { status: 'pending' });

        // 发送任务参数（包含 taskId）
        ws.send(JSON.stringify({
          task_id: taskId, // 发送前端生成的 taskId
          image: base64.split(',')[1], // 去掉 data:image/... 前缀
          prompt_type: mode,
          model_size: modelSize,
        }));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'status') {
          // 状态更新消息
          console.log(`[${taskId}]`, data.message);
        }

        if (data.type === 'chunk') {
          // 流式输出
          updateTask(taskId, {
            status: 'processing',
            result: data.content
          });
        }

        if (data.type === 'complete') {
          // 处理完成
          updateTask(taskId, {
            status: 'completed',
            result: data.result,
            inferenceTime: data.inference_time,
            workerId: data.worker_id
          });

          ws.close();
          toast.success(`${file.name} 识别完成`);

          // 开始轮询过期时间
          startExpiryPolling(taskId);
        }

        if (data.type === 'error') {
          // 处理失败
          updateTask(taskId, {
            status: 'failed',
            error: data.error
          });

          ws.close();
          toast.error(`${file.name} 识别失败`);

          // ✨ 失败任务也启动轮询，30秒后自动清理
          startExpiryPolling(taskId);
        }
      };

      const handleConnectionError = (errorMsg: string) => {
        clearTimeout(connectionTimeout);

        // 检查是否需要重连
        if (retryCount < MAX_RECONNECT_ATTEMPTS) {
          const nextRetry = retryCount + 1;
          console.log(`[${taskId}] 连接失败，${RECONNECT_DELAY / 1000}秒后重试 (${nextRetry}/${MAX_RECONNECT_ATTEMPTS})...`);

          updateTask(taskId, {
            status: 'pending',
            error: `${errorMsg}，正在重试 (${nextRetry}/${MAX_RECONNECT_ATTEMPTS})...`
          });

          toast.warning(`${file.name} ${errorMsg}，正在重试...`);

          // 延迟后重连
          setTimeout(() => {
            processOCRTask(taskId, file, nextRetry);
          }, RECONNECT_DELAY);
        } else {
          // 超过最大重试次数
          updateTask(taskId, {
            status: 'failed',
            error: `${errorMsg}，已重试 ${MAX_RECONNECT_ATTEMPTS} 次`
          });
          toast.error(`${file.name} 连接失败，请检查服务是否启动`);
          startExpiryPolling(taskId);
        }
      };

      ws.onerror = () => {
        handleConnectionError('WebSocket 连接错误');
      };

      ws.onclose = (event) => {
        clearTimeout(connectionTimeout);

        // 非正常关闭（非1000状态码）且未完成处理时，尝试重连
        if (event.code !== 1000) {
          const task = tasks.find(t => t.taskId === taskId);
          if (task && task.status !== 'completed' && task.status !== 'failed') {
            handleConnectionError('连接意外断开');
          }
        }
      };

    } catch (error) {
      updateTask(taskId, {
        status: 'failed',
        error: String(error)
      });
      toast.error(`${file.name} 处理异常`);
      startExpiryPolling(taskId);
    }
  };

  // ========== 轮询过期时间 ==========

  const startExpiryPolling = (taskId: string) => {
    // 如果已存在轮询，先清除
    if (pollIntervalsRef.current.has(taskId)) {
      clearInterval(pollIntervalsRef.current.get(taskId)!);
    }

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${OCR_SERVICE_URL}/api/ocr/task/${taskId}`);
        const data = await response.json();

        if (data.status === 'not_found') {
          // 任务已过期
          removeTask(taskId);
          toast.info(`任务 ${taskId.slice(0, 15)}... 结果已过期`);
          return;
        }

        // 更新剩余时间
        updateTask(taskId, {
          expiresIn: data.expires_in
        });

        // 剩余时间少于 30 秒，显示警告
        if (data.expires_in < 30 && data.expires_in > 0) {
          const task = tasks.find(t => t.taskId === taskId);
          if (task) {
            toast.warning(`${task.fileName} 即将过期，请及时保存结果`, {
              duration: 10000
            });
          }
        }

      } catch (error) {
        console.error('Failed to poll expiry:', error);
      }
    }, POLL_INTERVAL);

    pollIntervalsRef.current.set(taskId, interval);
  };

  const stopExpiryPolling = (taskId: string) => {
    if (pollIntervalsRef.current.has(taskId)) {
      clearInterval(pollIntervalsRef.current.get(taskId)!);
      pollIntervalsRef.current.delete(taskId);
    }
  };

  // ========== 任务操作 ==========

  const handleCopyResult = async (task: OCRTask) => {
    if (!task.result) return;
    try {
      await navigator.clipboard.writeText(task.result);
      toast.success('已复制到剪贴板');
    } catch {
      toast.error('复制失败');
    }
  };

  const handleDownloadResult = (task: OCRTask) => {
    if (!task.result) return;
    const blob = new Blob([task.result], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${task.fileName}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('已下载');
  };

  const handleDeleteTask = (taskId: string) => {
    removeTask(taskId);
    toast.info('已删除任务');
  };

  const toggleTaskExpanded = (taskId: string) => {
    updateTask(taskId, {
      expanded: !tasks.find(t => t.taskId === taskId)?.expanded
    });
  };

  // ========== 渲染 ==========

  return (
    <main className="flex min-h-screen flex-col pt-14">
      <section className="flex-1 overflow-hidden px-6 py-6 -mt-[3vh]">
        <div className="mx-auto flex h-full max-w-6xl flex-col gap-5 overflow-hidden rounded-3xl bg-neutral-950/70 p-6 backdrop-blur">
          {/* 标题 */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 via-neutral-900/60 to-transparent px-8 py-10 text-center shadow-2xl">
            <div className="mb-3 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-[0.35em] text-primary">
              <Sparkles className="h-4 w-4" />
              <span>DeepSeek OCR</span>
            </div>
            <h1 className="text-balance text-4xl font-bold tracking-tight text-white">DeepSeek OCR 文本识别工具</h1>
            <p className="mt-3 text-balance text-base text-muted-foreground">
              基于深度学习的智能图像文字识别，支持多任务并发处理，结果缓存 2 分钟
            </p>
          </div>

          <div className="flex flex-1 flex-col gap-4 overflow-hidden">
            <div className="grid grid-cols-[1fr,1fr] gap-4">
              {/* 上传区域 */}
              <Card>
                <CardContent className="p-5">
                  <Label className="mb-3 text-sm font-semibold">上传图片</Label>
                  <div
                    className={cn(
                      "relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer",
                      isDragging ? "border-primary bg-primary/10" : "border-muted hover:border-primary/50 hover:bg-muted/50"
                    )}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                    <p className="text-sm font-medium">点击选择或拖拽图片</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      支持 JPG/PNG/WebP，最大 10MB，4096x4096
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">
                      每次仅支持上传一张图片
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* 识别类型 */}
              <Card>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">识别类型</Label>
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <RadioGroup
                    value={mode}
                    onValueChange={(value) => setMode(value as OCRMode)}
                    className="grid grid-cols-2 gap-3"
                  >
                    {modeOptions.map((option) => (
                      <label
                        key={option.value}
                        htmlFor={option.value}
                        className={cn(
                          "flex cursor-pointer flex-col gap-1 rounded-xl border px-3 py-2 text-left transition-colors",
                          mode === option.value ? "border-primary bg-primary/5 shadow-sm" : "border-muted hover:bg-muted/70"
                        )}
                      >
                        <RadioGroupItem className="sr-only" id={option.value} value={option.value} />
                        <span className="text-sm font-medium">{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>
            </div>

            {/* 模型大小 */}
            <Card>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">模型大小</Label>
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <RadioGroup
                  value={modelSize}
                  onValueChange={(value) => setModelSize(value as ModelSize)}
                  className="grid grid-cols-5 gap-3"
                >
                  {modelOptions.map((option) => (
                    <label
                      key={option.value}
                      htmlFor={option.value}
                      className={cn(
                        "flex cursor-pointer flex-col gap-1 rounded-xl border px-3 py-2 text-left transition-colors",
                        modelSize === option.value ? "border-primary bg-primary/5 shadow-sm" : "border-muted hover:bg-muted/70"
                      )}
                    >
                      <RadioGroupItem className="sr-only" id={option.value} value={option.value} />
                      <span className="text-sm font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </label>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>

            {/* 任务列表 */}
            <Card className="flex-1 min-h-0 flex flex-col">
              <CardContent className="p-5 flex-1 min-h-0 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-semibold">任务列表（{tasks.length}）</Label>
                  {tasks.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setTasks([]);
                        pollIntervalsRef.current.forEach(interval => clearInterval(interval));
                        pollIntervalsRef.current.clear();
                        // 清空 localStorage
                        localStorage.removeItem('ocr_tasks');
                        toast.info('已清空所有任务');
                      }}
                    >
                      清空全部
                    </Button>
                  )}
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-2">
                  {tasks.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                      暂无任务，请上传图片开始识别
                    </div>
                  ) : (
                    tasks.map(task => (
                      <TaskCard
                        key={task.taskId}
                        task={task}
                        onCopy={() => handleCopyResult(task)}
                        onDownload={() => handleDownloadResult(task)}
                        onDelete={() => handleDeleteTask(task.taskId)}
                        onToggleExpand={() => toggleTaskExpanded(task.taskId)}
                      />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 功能亮点和使用提示 */}
            <div className="grid shrink-0 grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">功能亮点</h2>
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    {features.map((feature, index) => (
                      <li key={feature.text} className="flex items-start gap-2">
                        <feature.icon className="h-4 w-4 flex-shrink-0 text-primary" />
                        <span>
                          {index + 1}. {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">使用提示</h2>
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  </div>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    {usageTips.map((tip, index) => (
                      <li key={tip} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-primary" />
                        <span>
                          {index + 1}. {tip}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

// ============================================================================
// 任务卡片组件
// ============================================================================

interface TaskCardProps {
  task: OCRTask;
  onCopy: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onToggleExpand: () => void;
}

function TaskCard({ task, onCopy, onDownload, onDelete, onToggleExpand }: TaskCardProps) {
  const getStatusIcon = () => {
    switch (task.status) {
      case 'uploading':
      case 'pending':
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (task.status) {
      case 'uploading':
        return '上传中...';
      case 'pending':
        return '排队中...';
      case 'processing':
        return '处理中...';
      case 'completed':
        return `已完成 · ${task.inferenceTime?.toFixed(1)}s`;
      case 'failed':
        return '失败';
      default:
        return '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  const formatExpiryTime = (seconds: number) => {
    if (seconds < 60) return `${seconds} 秒`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes} 分钟`;
  };

  return (
    <div className="border rounded-lg p-4 bg-card">
      {/* 卡片头部 */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <FileText className="h-5 w-5 flex-shrink-0 mt-0.5 text-primary" />
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{task.fileName}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {formatFileSize(task.fileSize)}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleExpand}
          className="flex-shrink-0"
        >
          {task.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {/* 状态指示器 */}
      <div className="flex items-center gap-2 mt-3 text-sm">
        {getStatusIcon()}
        <span>{getStatusText()}</span>
        {task.workerId !== undefined && (
          <span className="text-muted-foreground">· Worker {task.workerId}</span>
        )}
      </div>

      {/* 过期倒计时 */}
      {task.status === 'completed' && task.expiresIn !== undefined && (
        <div className={cn(
          "mt-2 text-xs",
          task.expiresIn < 60 ? "text-red-500 font-medium" : "text-muted-foreground"
        )}>
          ⏰ 剩余 {formatExpiryTime(task.expiresIn)}
        </div>
      )}

      {/* 展开的内容 */}
      {task.expanded && (
        <div className="mt-4 space-y-3">
          {/* 识别结果 */}
          {task.result && (
            <Textarea
              readOnly
              value={task.result}
              className="min-h-[200px] max-h-[400px] resize-none font-mono text-sm"
            />
          )}

          {/* 错误信息 */}
          {task.error && (
            <div className="rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 p-3 text-sm text-red-700 dark:text-red-400">
              ❌ {task.error}
            </div>
          )}

          {/* 操作按钮 */}
          {task.status === 'completed' && (
            <div className="flex gap-2">
              <Button size="sm" onClick={onCopy}>
                <Copy className="mr-1 h-4 w-4" /> 复制
              </Button>
              <Button size="sm" variant="outline" onClick={onDownload}>
                <Download className="mr-1 h-4 w-4" /> 下载
              </Button>
              <Button size="sm" variant="outline" onClick={onDelete}>
                <Trash2 className="mr-1 h-4 w-4" /> 删除
              </Button>
            </div>
          )}

          {/* 失败任务也可以删除 */}
          {task.status === 'failed' && (
            <Button size="sm" variant="outline" onClick={onDelete}>
              <Trash2 className="mr-1 h-4 w-4" /> 删除
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
