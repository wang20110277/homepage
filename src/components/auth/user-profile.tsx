"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

// Mock user for demo purposes
const MOCK_USER = {
  name: "zhangbin",
  email: "zhangbin@example.com",
};

export function UserProfile() {
  const router = useRouter();

  const handleSignOut = () => {
    router.replace("/");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="size-8 cursor-pointer hover:opacity-80 transition-opacity">
          <AvatarFallback>
            {MOCK_USER.name[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {MOCK_USER.name}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {MOCK_USER.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-sm font-semibold text-primary focus:bg-primary/10 focus:text-primary hover:bg-primary/10"
        >
          <LogOut className="mr-2 h-4 w-4 text-primary" />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
