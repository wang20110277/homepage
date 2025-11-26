"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

export type PPTAdvancedSettings = {
  aiMode: "fast" | "balanced" | "quality";
  creativity: number;
  includeAgenda: boolean;
  includeSummary: boolean;
  includeDataHighlights: boolean;
  includeCTA: boolean;
  referenceLinks: string;
  enableBrandGuard: boolean;
};

interface PPTSettingsDialogProps {
  settings: PPTAdvancedSettings;
  onChange: (settings: PPTAdvancedSettings) => void;
}

export function PPTSettingsDialog({ settings, onChange }: PPTSettingsDialogProps) {
  const [open, setOpen] = useState(false);

  const update = (patch: Partial<PPTAdvancedSettings>) => {
    onChange({ ...settings, ...patch });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          AI ?????
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>AI ?????</DialogTitle>
          <DialogDescription>
            ????????????,??????????? PPT ???
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <section className="space-y-3">
            <Label className="text-xs uppercase text-muted-foreground">?? AI ??</Label>
            <RadioGroup
              value={settings.aiMode}
              onValueChange={(value) => update({ aiMode: value as PPTAdvancedSettings["aiMode"] })}
              className="grid gap-3 md:grid-cols-3"
            >
              <label className="border rounded-lg p-3 cursor-pointer flex flex-col gap-1" htmlFor="ai-fast">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="fast" id="ai-fast" />
                  <span className="font-medium">????</span>
                </div>
                <p className="text-xs text-muted-foreground">??2?3?,???,?????</p>
              </label>
              <label className="border rounded-lg p-3 cursor-pointer flex flex-col gap-1" htmlFor="ai-balanced">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="balanced" id="ai-balanced" />
                  <span className="font-medium">????</span>
                </div>
                <p className="text-xs text-muted-foreground">??5?,????????</p>
              </label>
              <label className="border rounded-lg p-3 cursor-pointer flex flex-col gap-1" htmlFor="ai-quality">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="quality" id="ai-quality" />
                  <span className="font-medium">????</span>
                </div>
                <p className="text-xs text-muted-foreground">??10?,???????????</p>
              </label>
            </RadioGroup>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase text-muted-foreground">????</Label>
              <span className="text-sm text-muted-foreground">{settings.creativity}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={90}
              step={10}
              value={settings.creativity}
              onChange={(event) => update({ creativity: Number(event.target.value) })}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              ???????,??????,???????????
            </p>
          </section>

          <section className="space-y-3">
            <Label className="text-xs uppercase text-muted-foreground">????</Label>
            <div className="grid gap-3 md:grid-cols-2">
              {(
                [
                  "includeAgenda",
                  "includeSummary",
                  "includeDataHighlights",
                  "includeCTA",
                ] as Array<
                  keyof Pick<
                    PPTAdvancedSettings,
                    "includeAgenda" | "includeSummary" | "includeDataHighlights" | "includeCTA"
                  >
                >
              ).map((key) => (
                <label key={key} className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer">
                  <Checkbox
                    id={key}
                    checked={settings[key]}
                    onCheckedChange={(checked) => update({ [key]: Boolean(checked) })}
                  />
                  <div>
                    <span className="font-medium text-sm">
                      {key === "includeAgenda" && "????"}
                      {key === "includeSummary" && "????"}
                      {key === "includeDataHighlights" && "????"}
                      {key === "includeCTA" && "CTA ?????"}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {key === "includeAgenda" && "????????????????"}
                      {key === "includeSummary" && "??????????????"}
                      {key === "includeDataHighlights" && "??????????????"}
                      {key === "includeCTA" && "????????????????"}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <Label className="text-xs uppercase text-muted-foreground">?????</Label>
            <Input
              value={settings.referenceLinks}
              placeholder="https://docs.company.com/ppt-brand-guide"
              onChange={(event) => update({ referenceLinks: event.target.value })}
            />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                id="brand-guard"
                checked={settings.enableBrandGuard}
                onCheckedChange={(checked) => update({ enableBrandGuard: Boolean(checked) })}
              />
              <label htmlFor="brand-guard">??????,?????????????????</label>
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            ?????
          </Button>
          <Button type="button" onClick={() => setOpen(false)}>
            ?????
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
