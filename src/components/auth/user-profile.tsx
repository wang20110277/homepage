"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
import { LogOut, Settings2, ShieldCheck } from "lucide-react";

interface ProfileDetails {
  roles: string[];
  tools: Array<{ id: string; enabled: boolean; reason?: string }>;
  tenantName?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message?: string;
  };
}

interface ProfilePayload {
  user?: {
    roles?: string[];
  };
  tenant?: {
    name?: string;
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

        const payload = (await res.json()) as ApiResponse<ProfilePayload>;
        if (!payload.success || !payload.data) {
          throw new Error(payload.error?.message || "Failed to load profile");
        }

        const normalizedTools = Array.isArray(payload.data.toolAccess)
          ? payload.data.toolAccess.map((item) => ({
              id: item.tool,
              enabled: Boolean(item.access?.allowed),
              reason: item.access?.reason,
            }))
          : [];

        setDetails({
          roles: payload.data.user?.roles || [],
          tenantName: payload.data.tenant?.name || undefined,
          tools: normalizedTools,
        });
      } catch (error) {
        console.error("Failed to load profile details", error);
        setDetails(null);
      } finally {
        setIsLoadingDetails(false);
      }
    };

    fetchDetails();
  }, [session?.user]);

  const assignedTools = details?.tools ?? [];
  const hasAdminRole = details?.roles?.includes("admin") ?? false;

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
            {details?.tenantName ? (
              <p className="text-[11px] text-muted-foreground">
                租户: {details.tenantName}
              </p>
            ) : null}
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
          <p className="text-sm font-medium">工具访问权限</p>
          <div className="mt-1 space-y-1 w-full">
            {isLoadingDetails && (
              <p className="text-xs text-muted-foreground">加载中...</p>
            )}
            {!isLoadingDetails && assignedTools.length === 0 && (
              <p className="text-xs text-muted-foreground">
                工具访问数据暂不可用
              </p>
            )}
            {!isLoadingDetails && assignedTools.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {assignedTools.map((tool) => (
                  <Badge
                    key={tool.id}
                    variant={tool.enabled ? "outline" : "destructive"}
                    className="text-[11px]"
                  >
                    {tool.id}
                    {!tool.enabled && tool.reason
                      ? ` (${tool.reason})`
                      : ""}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </DropdownMenuItem>
        {hasAdminRole && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link
                href="/dashboard/tenant-settings"
                className="flex w-full items-center text-sm font-semibold text-primary focus:outline-none"
              >
                <Settings2 className="mr-2 h-4 w-4" />
                管理租户功能
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link
                href="/dashboard/user-access"
                className="flex w-full items-center text-sm font-semibold text-primary focus:outline-none"
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                管理用户角色
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="cursor-pointer text-sm font-semibold text-primary focus:bg-primary/10 focus:text-primary"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {isLoggingOut ? "登出中..." : "登出"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
