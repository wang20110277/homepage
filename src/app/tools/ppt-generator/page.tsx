"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { mockPPTTemplates } from "@/lib/mock-data";
import type { PPTSettings } from "@/types";
import { FileUpload } from "@/components/tools/file-upload";
import { PPTSettingsDialog, PPTAdvancedSettings } from "@/components/tools/ppt-settings-dialog";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Clock,
  Layers,
  Loader2,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";

const slideOptions = [5, 10, 15, 20, 30] as const;
const languageOptions = [
  { label: "中文", value: "zh" },
  { label: "English", value: "en" },
  { label: "日本語", value: "ja" },
  { label: "한국어", value: "ko" },
];
const industries = [
  { label: "AI / 科技", value: "ai" },
  { label: "企业服务", value: "saas" },
  { label: "消费零售", value: "retail" },
  { label: "制造 / 工业", value: "industry" },
  { label: "教育 / 培训", value: "education" },
];
const scenarios = [
  { label: "季度经营复盘", value: "quarterly" },
  { label: "品牌发布", value: "launch" },
  { label: "融资路演", value: "pitch" },
  { label: "内部培训", value: "training" },
  { label: "战略规划", value: "strategy" },
];
const tones = [
  { label: "专业理性", value: "pro" },
  { label: "鼓舞人心", value: "inspire" },
  { label: "简洁直白", value: "concise" },
  { label: "数据导向", value: "data" },
];
const themes = [
  { label: "商务蓝", value: "blue" },
  { label: "暮紫", value: "purple" },
  { label: "极简黑白", value: "mono" },
  { label: "暖色渐变", value: "warm" },
];

const initialSettings: PPTSettings = {
  slideCount: 10,
  language: "zh",
  theme: "business",
  colorScheme: "blue",
  fontSize: "medium",
};

const initialAdvanced: PPTAdvancedSettings = {
  aiMode: "balanced",
  creativity: 40,
  includeAgenda: true,
  includeSummary: true,
  includeDataHighlights: true,
  includeCTA: false,
  referenceLinks: "",
  enableBrandGuard: true,
};

interface BasicFormState {
  topic: string;
  audience: string;
  promise: string;
  notes: string;
}

type GenerationPhase = "idle" | "collecting" | "drafting" | "formatting" | "ready";

const phaseMeta: Record<GenerationPhase, { label: string; description: string; value: number }> = {
  idle: { label: "等待开始", description: "填写基础信息后即可生成", value: 0 },
  collecting: { label: "整理素材", description: "AI 正在读取提示和上传文件", value: 30 },
  drafting: { label: "生成内容", description: "正在输出章节结构与要点", value: 65 },
  formatting: { label: "润色美化", description: "优化话术和视觉建议", value: 85 },
  ready: { label: "已生成", description: "已输出最新大纲", value: 100 },
};

export default function PPTGeneratorPage() {
  const [basicForm, setBasicForm] = useState<BasicFormState>({
    topic: "AI 驱动的季度经营复盘",
    audience: "公司管理层",
    promise: "突出业务指标 + 下一步行动",
    notes: "",
  });
  const [industry, setIndustry] = useState(industries[0].value);
  const [scenario, setScenario] = useState(scenarios[0].value);
  const [tone, setTone] = useState(tones[0].value);
  const [settings, setSettings] = useState(initialSettings);
  const [advancedSettings, setAdvancedSettings] = useState(initialAdvanced);
  const [language, setLanguage] = useState<PPTSettings["language"]>(initialSettings.language);
  const [theme, setTheme] = useState(themes[0].value);
  const [files, setFiles] = useState<File[]>([]);
  const [phase, setPhase] = useState<GenerationPhase>("idle");
  const [outline, setOutline] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState("尚未开始");
  const [isGenerating, setIsGenerating] = useState(false);
  const timers = useRef<NodeJS.Timeout[]>([]);

  const recommendedTemplates = useMemo(() => mockPPTTemplates.slice(0, 3), []);
  const phaseOrder: GenerationPhase[] = ["collecting", "drafting", "formatting", "ready"];

  useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout);
    };
  }, []);

  const schedule = (cb: () => void, delay: number) => {
    const timer = setTimeout(cb, delay);
    timers.current.push(timer);
  };

  const handleGenerate = () => {
    if (!basicForm.topic.trim()) {
      setStatusMessage("请先填写演示主题");
      return;
    }

    timers.current.forEach(clearTimeout);
    timers.current = [];

    setIsGenerating(true);
    setPhase("collecting");
    setStatusMessage("正在整理素材与上下文...");
    setOutline([]);

    const blueprint = [
      `封面：${basicForm.topic}`,
      "目录：背景 / 指标 / 亮点 / 风险 / 计划",
      "第一部分：行业与市场行情",
      "第二部分：业务指标与增长趋势",
      "第三部分：产品与方案亮点",
      "第四部分：风险与应对策略",
      "结尾：重点行动与资源诉求",
    ];

    schedule(() => {
      setPhase("drafting");
      setStatusMessage("正在生成章节结构");
      setOutline(blueprint.slice(0, 3));
    }, 1200);

    schedule(() => {
      setPhase("formatting");
      setStatusMessage("正在优化语气与视觉建议");
      setOutline(blueprint.slice(0, 5));
    }, 2400);

    schedule(() => {
      setPhase("ready");
      setStatusMessage("生成完成，可继续微调或导出");
      setOutline(blueprint);
      setIsGenerating(false);
    }, 3600);
  };

  const currentPhaseIndex = phase === "idle" ? -1 : phaseOrder.indexOf(phase);

  return (
    <div className="container py-10 space-y-8">
      <header className="space-y-4">
        <Badge variant="secondary" className="w-fit">PPT 智能助手</Badge>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">一键生成高质量汇报 PPT</h1>
          <p className="text-muted-foreground max-w-3xl">
            根据业务场景、行业与语气偏好，自动生成结构化 PPT 大纲与素材建议。支持拖拽上传文档、配置页数、语言以及高级 AI 生成策略。
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>多模态素材融合</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>品牌规范守护</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1">
            <Clock className="w-4 h-4 text-primary" />
            <span>平均生成 45 秒</span>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>基础信息</CardTitle>
              <CardDescription>填写核心意图，AI 将自动生成章节结构</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs defaultValue="base" className="space-y-4">
                <TabsList className="w-full">
                  <TabsTrigger value="base" className="flex-1">
                    主题配置
                  </TabsTrigger>
                  <TabsTrigger value="audience" className="flex-1">
                    受众 / 场景
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="base" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label>
                        演示主题 <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={basicForm.topic}
                        onChange={(event) =>
                          setBasicForm((prev) => ({ ...prev, topic: event.target.value }))
                        }
                        placeholder="例如：AI 驱动的季度经营复盘"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>行业 / 赛道</Label>
                      <Select value={industry} onValueChange={setIndustry}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择行业" />
                        </SelectTrigger>
                        <SelectContent>
                          {industries.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>输出语气</Label>
                      <Select value={tone} onValueChange={setTone}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择语气" />
                        </SelectTrigger>
                        <SelectContent>
                          {tones.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="audience" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>汇报场景</Label>
                      <Select value={scenario} onValueChange={setScenario}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择场景" />
                        </SelectTrigger>
                        <SelectContent>
                          {scenarios.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>主要受众</Label>
                      <Input
                        value={basicForm.audience}
                        onChange={(event) =>
                          setBasicForm((prev) => ({ ...prev, audience: event.target.value }))
                        }
                        placeholder="如：公司管理层 / 投资人"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>核心诉求</Label>
                      <Input
                        value={basicForm.promise}
                        onChange={(event) =>
                          setBasicForm((prev) => ({ ...prev, promise: event.target.value }))
                        }
                        placeholder="如：突出指标、给出行动和资源需求"
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>生成参数</CardTitle>
                <CardDescription>控制页数、语言与模板风格</CardDescription>
              </div>
              <PPTSettingsDialog settings={advancedSettings} onChange={setAdvancedSettings} />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>预计页数</Label>
                  <Select
                    value={String(settings.slideCount)}
                    onValueChange={(value) =>
                      setSettings((prev) => ({
                        ...prev,
                        slideCount: Number(value) as (typeof slideOptions)[number],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {slideOptions.map((count) => (
                        <SelectItem key={count} value={String(count)}>
                          {count} 页
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>输出语言</Label>
                  <Select
                    value={language}
                    onValueChange={(value) => {
                      setLanguage(value as PPTSettings["language"]);
                      setSettings((prev) => ({ ...prev, language: value as PPTSettings["language"] }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languageOptions.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>模板风格</Label>
                  <Select
                    value={theme}
                    onValueChange={(value) => {
                      setTheme(value);
                      setSettings((prev) => ({ ...prev, theme: value }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {themes.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>字号偏好</Label>
                  <Select
                    value={settings.fontSize ?? "medium"}
                    onValueChange={(value) =>
                      setSettings((prev) => ({ ...prev, fontSize: value as PPTSettings["fontSize"] }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">紧凑</SelectItem>
                      <SelectItem value="medium">常规</SelectItem>
                      <SelectItem value="large">醒目</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{settings.slideCount} 页结构</Badge>
                <Badge variant="outline">语言：{languageOptions.find((item) => item.value === language)?.label}</Badge>
                <Badge variant="outline">语气：{tones.find((item) => item.value === tone)?.label}</Badge>
                {advancedSettings.enableBrandGuard && <Badge variant="secondary">品牌守护开启</Badge>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>素材与约束</CardTitle>
              <CardDescription>提供背景资料、上传文档并触发生成</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>必须覆盖的要点</Label>
                <Textarea
                  value={basicForm.notes}
                  onChange={(event) =>
                    setBasicForm((prev) => ({ ...prev, notes: event.target.value }))
                  }
                  placeholder="列出希望重点展开的章节、数据或故事线"
                  className="min-h-[150px]"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {basicForm.notes.length}/600 字
                </p>
              </div>

              <FileUpload files={files} onFilesChange={setFiles} />

              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={handleGenerate} disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      正在生成
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      开始生成
                    </>
                  )}
                </Button>
                <Button variant="outline" disabled={isGenerating}>
                  导出提示词
                </Button>
                <p className="text-sm text-muted-foreground">
                  已上传 {files.length} 份参考资料
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="space-y-2">
              <CardTitle>生成进度</CardTitle>
              <CardDescription>{phaseMeta[phase].description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{phaseMeta[phase].label}</span>
                <span className="text-muted-foreground">{phaseMeta[phase].value}%</span>
              </div>
              <Progress value={phaseMeta[phase].value} />
              <ul className="space-y-3">
                {phaseOrder.map((item, index) => {
                  const reached = currentPhaseIndex >= index;
                  return (
                    <li
                      key={item}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border px-3 py-2",
                        reached ? "border-primary/40 bg-primary/5" : "border-dashed text-muted-foreground"
                      )}
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          reached ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}
                      >
                        {reached ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                      </div>
                      <div className="text-sm">
                        <p className="font-medium">
                          {item === "collecting" && "素材整理"}
                          {item === "drafting" && "结构生成"}
                          {item === "formatting" && "润色排版"}
                          {item === "ready" && "完成导出"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item === "collecting" && "读取提示、上传文档"}
                          {item === "drafting" && "产出生动的章节要点"}
                          {item === "formatting" && "语言 + 视觉建议"}
                          {item === "ready" && "下载或继续迭代"}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="text-sm text-muted-foreground">{statusMessage}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-2">
              <CardTitle>最新大纲</CardTitle>
              <CardDescription>实时刷新章节要点，可复制到 PPT</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64 pr-4">
                {outline.length ? (
                  <ol className="space-y-3 text-sm">
                    {outline.map((item, index) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="text-primary font-semibold">{index + 1}.</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p>点击「开始生成」后，这里将展示 AI 生成的大纲。</p>
                    <p>可实时复制，或继续上传更多素材以优化结果。</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-2">
              <CardTitle>推荐模板</CardTitle>
              <CardDescription>根据行业 / 场景自动匹配</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recommendedTemplates.map((template) => (
                <div key={template.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-16 w-24 rounded-md bg-muted bg-cover bg-center"
                      style={{ backgroundImage: `url(${template.thumbnail})` }}
                    />
                    <div>
                      <p className="font-semibold">{template.name}</p>
                      <p className="text-xs text-muted-foreground">{template.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{template.slideCount} 页</span>
                    <span>·</span>
                    <span>{template.theme}</span>
                    <span>·</span>
                    <span>{template.colorScheme}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {template.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    应用模板
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>生成建议</CardTitle>
              <CardDescription>根据当前配置给出的优化提示</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <Layers className="w-4 h-4 mt-0.5 text-primary" />
                  <div>
                    <p className="font-medium">建议保留 2~3 个关键增长故事线</p>
                    <p className="text-muted-foreground">
                      结合上传的 {files.length || "0"} 份资料，自动挑选最有说服力的数据片段。
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <ShieldCheck className="w-4 h-4 mt-0.5 text-primary" />
                  <div>
                    <p className="font-medium">品牌守护已开启</p>
                    <p className="text-muted-foreground">
                      语气将与 {tones.find((item) => item.value === tone)?.label} 风格保持一致，可在高级设置中修改。
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Sparkles className="w-4 h-4 mt-0.5 text-primary" />
                  <div>
                    <p className="font-medium">想进一步微调？</p>
                    <p className="text-muted-foreground">
                      通过高级设置调整创意度（当前 {advancedSettings.creativity}%）或附加品牌手册链接。
                    </p>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
