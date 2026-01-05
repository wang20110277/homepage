/**
 * Application route configuration
 * Centralizes all route paths to avoid hard-coding throughout the codebase
 */

export const ROUTES = {
  HOME: "/home",
  LANDING: "/",
  PPT_GENERATOR: "/tools/ppt-generator",
  MY_PRESENTATIONS: "/tools/my-presentations",
} as const;

/**
 * Check if the current pathname is a PPT-related page
 */
export const isPPTRoute = (pathname: string | null): boolean => {
  if (!pathname) return false;
  return (
    pathname.startsWith(ROUTES.PPT_GENERATOR) ||
    pathname.startsWith(ROUTES.MY_PRESENTATIONS)
  );
};
