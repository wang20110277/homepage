"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession, signOutFromOIDC } from "@/lib/auth-client";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, ShieldCheck } from "lucide-react";

interface ProfileDetails {
  roles: string[];
  tools: Array<{ id: string; enabled: boolean; reason?: string }>;
}

interface ProfileApiResponse {
  user?: {
    roles?: string[];
  };
  toolAccess?: Array<{
    tool: string;
    access?: {
      allowed: boolean;
      reason?: string;
    };
  }>;
}

export function UserProfile() {
  const { data: session, isPending } = useSession();
  const [details, setDetails] = useState<ProfileDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!session?.user) {
      return;
    }

    const fetchDetails = async () => {
      setIsLoadingDetails(true);
      try {
        const res = await fetch("/api/users/me");
        if (!res.ok) {
          throw new Error("Failed to load profile");
        }
        const data = (await res.json()) as ProfileApiResponse;
        const normalizedTools = Array.isArray(data.toolAccess)
          ? data.toolAccess.map((item) => ({
              id: item.tool,
              enabled: Boolean(item.access?.allowed),
              reason: item.access?.reason,
            }))
          : [];

        setDetails({
          roles: data.user?.roles || [],
          tools: normalizedTools,
        });
      } finally {
        setIsLoadingDetails(false);
      }
    };

    fetchDetails();
  }, [session?.user]);

  const availableTools = useMemo(
    () => details?.tools.filter((tool) => tool.enabled) || [],
    [details]
  );

  if (isPending) {
    return <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />;
  }

  if (!session?.user) {
    return null;
  }

  const user = session.user;
  const initials =
    user.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOutFromOIDC();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={user.image || undefined}
              alt={user.name || ""}
            />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal space-y-2">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
          {details?.roles?.length ? (
            <div className="flex flex-wrap gap-1">
              {details.roles.map((role) => (
                <Badge key={role} variant="secondary" className="text-xs">
                  <ShieldCheck className="mr-1 h-3 w-3" />
                  {role}
                </Badge>
              ))}
            </div>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={isLoadingDetails}
          className="flex-col items-start"
        >
          <p className="text-sm font-medium">Tool Access</p>
          <div className="mt-1 space-y-1">
            {isLoadingDetails && (
              <p className="text-xs text-muted-foreground">Loading…</p>
            )}
            {!isLoadingDetails && availableTools.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No tools assigned
              </p>
            )}
            {!isLoadingDetails &&
              availableTools.map((tool) => (
                <Badge key={tool.id} variant="outline" className="text-xs">
                  {tool.id}
                </Badge>
              ))}
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="cursor-pointer text-sm font-semibold text-primary focus:bg-primary/10 focus:text-primary"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {isLoggingOut ? "Signing out..." : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
