export function trackEvent(
  name: string,
  properties?: Record<string, unknown>
) {
  if (typeof window !== "undefined" && window.analytics) {
    try {
      window.analytics.track?.(name, properties);
      return;
    } catch (error) {
      console.warn("Analytics track failed", error);
    }
  }

  if (process.env.NODE_ENV !== "production") {
    console.info(`[analytics] ${name}`, properties);
  }
}

declare global {
  interface Window {
    analytics?: {
      track?: (event: string, properties?: Record<string, unknown>) => void;
    };
  }
}
