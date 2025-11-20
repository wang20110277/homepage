"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchModels, openWebuiKeys } from "@/lib/api/open-webui";
import type { OpenWebuiModel } from "@/types/open-webui";
import { toast } from "sonner";

type ModelsQueryResult = UseQueryResult<OpenWebuiModel[], Error>;

const ModelsContext = createContext<ModelsQueryResult | null>(null);

export function OpenWebuiModelsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const query = useQuery<OpenWebuiModel[], Error>({
    queryKey: openWebuiKeys.models,
    queryFn: fetchModels,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (query.isError) {
      const message =
        query.error instanceof Error
          ? query.error.message
          : "Failed to load models";
      toast.error(`${message}. Please refresh and try again.`);
    }
  }, [query.error, query.isError]);

  const value = useMemo(() => query, [query]);

  return (
    <ModelsContext.Provider value={value}>{children}</ModelsContext.Provider>
  );
}

export function useOpenWebuiModels(): ModelsQueryResult {
  const context = useContext(ModelsContext);
  if (!context) {
    throw new Error(
      "useOpenWebuiModels must be used within OpenWebuiModelsProvider"
    );
  }
  return context;
}
