export interface StandardUserClaims {
  id: string;
  name: string;
  email: string;
  username: string;
  provider: "entra" | "adfs";
  providerId: string;
  roles: string[];
}

export function mapClaimsToUser(
  claims: Record<string, unknown>,
  provider: "entra" | "adfs"
): StandardUserClaims {
  return provider === "entra"
    ? mapEntraClaims(claims)
    : mapAdfsClaims(claims);
}

export function normalizeRole(role: string): string {
  if (!role) return "";
  const cleaned = role.replace(/^(CN|OU|DC)=/i, "");
  const first = cleaned.split(",")[0] ?? "";
  return first.toLowerCase().trim();
}

export function mergeClaimRoles(claimRoles: string[]): string[] {
  if (!claimRoles?.length) {
    return [];
  }
  const unique = new Set(
    claimRoles
      .map(normalizeRole)
      .filter((role) => role.length > 0)
  );
  return Array.from(unique);
}

function mapEntraClaims(
  claims: Record<string, unknown>
): StandardUserClaims {
  return {
    id: (claims.oid as string) || (claims.sub as string),
    name: (claims.name as string) || "",
    email:
      (claims.email as string) ||
      (claims.preferred_username as string) ||
      "",
    username:
      (claims.preferred_username as string) ||
      (claims.email as string) ||
      "",
    provider: "entra",
    providerId: (claims.oid as string) || (claims.sub as string),
    roles: extractEntraRoles(claims),
  };
}

function mapAdfsClaims(
  claims: Record<string, unknown>
): StandardUserClaims {
  // Extract email from various possible ADFS claim fields
  // Priority: upn (most reliable in ADFS) > email > emailaddress > XML claims
  const extractEmail = (claims: Record<string, unknown>): string => {
    return (
      (claims.upn as string) ||
      (claims["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn"] as string) ||
      (claims.email as string) ||
      (claims.emailaddress as string) ||
      (claims["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] as string) ||
      ""
    );
  };

  const email = extractEmail(claims);

  return {
    id: (claims.sub as string) || (claims.unique_name as string) || (claims.upn as string),
    name: (claims.name as string) || (claims.displayname as string) || (claims.unique_name as string) || "",
    email,
    username:
      (claims.unique_name as string) || (claims.upn as string) || email || "",
    provider: "adfs",
    providerId: (claims.sub as string) || (claims.unique_name as string) || (claims.upn as string),
    roles: extractAdfsRoles(claims),
  };
}

function extractEntraRoles(
  claims: Record<string, unknown>
): string[] {
  const roles = Array.isArray(claims.roles)
    ? (claims.roles as string[])
    : [];
  const groups = Array.isArray(claims.groups)
    ? (claims.groups as string[])
    : [];
  const mappings = getMapping(process.env.ENTRA_ROLE_MAPPINGS);

  return [...roles, ...groups]
    .map((role) => mappings[role] || role)
    .map(normalizeRole)
    .filter(Boolean);
}

function extractAdfsRoles(
  claims: Record<string, unknown>
): string[] {
  const roleClaim = claims.role;
  const groupClaim = claims.group;

  const roles = Array.isArray(roleClaim)
    ? (roleClaim as string[])
    : roleClaim
      ? [roleClaim as string]
      : [];
  const groups = Array.isArray(groupClaim)
    ? (groupClaim as string[])
    : groupClaim
      ? [groupClaim as string]
      : [];

  const mappings = getMapping(process.env.ADFS_ROLE_MAPPINGS);

  return [...roles, ...groups]
    .map((role) => mappings[role] || role)
    .map(normalizeRole)
    .filter(Boolean);
}

function getMapping(value?: string): Record<string, string> {
  if (!value) {
    return {};
  }

  try {
    return JSON.parse(value);
  } catch {
    console.warn("Failed to parse role mapping JSON:", value);
    return {};
  }
}
