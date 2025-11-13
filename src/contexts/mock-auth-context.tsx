"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import type { User } from "@/types";
import { mockUser } from "@/lib/mock-data";

interface MockAuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const MockAuthContext = createContext<MockAuthContextType | undefined>(
  undefined
);

export function MockAuthProvider({ children }: { children: ReactNode }) {
  // 默认设置为已登录状态，方便测试
  const [user, setUser] = useState<User | null>(mockUser);

  const login = async (email: string, password: string) => {
    // 模拟登录延迟
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 简单的模拟登录验证
    if (email === mockUser.email && password === "password") {
      setUser(mockUser);
    } else {
      throw new Error("Invalid credentials");
    }
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <MockAuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </MockAuthContext.Provider>
  );
}

export function useMockAuth() {
  const context = useContext(MockAuthContext);
  if (context === undefined) {
    throw new Error("useMockAuth must be used within a MockAuthProvider");
  }
  return context;
}
