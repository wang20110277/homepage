"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

type ToolFeature = "ppt" | "ocr" | "tianyancha" | "qualityCheck" | "fileCompare" | "zimage";

const TOOL_DEFINITIONS: Array<{
  id: ToolFeature;
  name: string;
  description: string;
}> = [
  {
    id: "ppt",
    name: "PPT Generator",
    description: "Enable AI-assisted slide generation workflows.",
  },
  {
    id: "ocr",
    name: "OCR Recognition",
    description: "Allow document digitization and text extraction.",
  },
  {
    id: "tianyancha",
    name: "Tianyancha Lookup",
    description: "Provide access to company background research tools.",
  },
  {
    id: "qualityCheck",
    name: "Quality Check Query",
    description: "Enable quality audit result query and retrieval.",
  },
  {
    id: "fileCompare",
    name: "Document Comparison",
    description: "Allow Word and PDF document comparison with diff reports.",
  },
  {
    id: "zimage",
    name: "AI Image Generator",
    description: "Enable AI-powered image generation from text prompts.",
  },
];

function normalizeFeatures(
  input: Record<string, boolean>
): Record<ToolFeature, boolean> {
  return {
    ppt: Boolean(input?.ppt ?? true),
    ocr: Boolean(input?.ocr ?? true),
    tianyancha: Boolean(input?.tianyancha ?? true),
    qualityCheck: Boolean(input?.qualityCheck ?? true),
    fileCompare: Boolean(input?.fileCompare ?? true),
    zimage: Boolean(input?.zimage ?? true),
  };
}

interface TenantSettingsFormProps {
  tenantName: string;
  initialFeatures: Record<string, boolean>;
}

export function TenantSettingsForm({
  tenantName,
  initialFeatures,
}: TenantSettingsFormProps) {
  const [features, setFeatures] = useState<Record<ToolFeature, boolean>>(
    normalizeFeatures(initialFeatures)
  );
  const [savedFeatures, setSavedFeatures] = useState<
    Record<ToolFeature, boolean>
  >(normalizeFeatures(initialFeatures));
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const hasChanges = useMemo(() => {
    return TOOL_DEFINITIONS.some(
      (tool) => features[tool.id] !== savedFeatures[tool.id]
    );
  }, [features, savedFeatures]);

  const handleToggle = (toolId: ToolFeature) => {
    setFeatures((prev) => ({
      ...prev,
      [toolId]: !prev[toolId],
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatus("idle");
    setMessage(null);
    try {
      const response = await fetch("/api/tenants/current/features", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ features }),
      });

      if (!response.ok) {
        throw new Error("Failed to update tenant features");
      }

      const payload = await response.json();
      const updated =
        (payload?.data?.features as Record<string, boolean> | undefined) ??
        (payload?.features as Record<string, boolean> | undefined) ??
        {};
      const normalized = normalizeFeatures(updated);

      setSavedFeatures(normalized);
      setFeatures(normalized);
      setStatus("success");
      setMessage("Tenant features updated");
    } catch (error) {
      console.error("Failed to update tenant features", error);
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Unable to save changes"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setFeatures(savedFeatures);
    setStatus("idle");
    setMessage(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage access for {tenantName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {TOOL_DEFINITIONS.map((tool) => (
            <div
              key={tool.id}
              className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{tool.name}</span>
                  <Badge variant={features[tool.id] ? "outline" : "secondary"}>
                    {features[tool.id] ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {tool.description}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`feature-${tool.id}`}
                  checked={features[tool.id]}
                  onCheckedChange={() => handleToggle(tool.id)}
                />
                <label
                  htmlFor={`feature-${tool.id}`}
                  className="text-sm text-muted-foreground"
                >
                  Allow access
                </label>
              </div>
            </div>
          ))}
        </div>

        {status !== "idle" && message ? (
          <Alert variant={status === "error" ? "destructive" : "default"}>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isSaving || !hasChanges}
            onClick={handleReset}
          >
            Reset
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
