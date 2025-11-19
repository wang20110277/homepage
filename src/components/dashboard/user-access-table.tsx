"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

interface RoleOption {
  name: string;
  displayName: string;
  description?: string;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  tenantName?: string | null;
  isActive: boolean;
  roles: string[];
}

interface UserAccessTableProps {
  initialUsers: UserRow[];
  roleOptions: RoleOption[];
}

interface RowState extends UserRow {
  pendingRoles: string[];
  isSaving: boolean;
  status?: "idle" | "success" | "error";
  message?: string;
}

export function UserAccessTable({
  initialUsers,
  roleOptions,
}: UserAccessTableProps) {
  const [rows, setRows] = useState<RowState[]>(
    initialUsers.map((user) => ({
      ...user,
      pendingRoles: user.roles,
      isSaving: false,
      status: "idle",
    }))
  );

  const hasRolesConfigured = roleOptions.length > 0;

  const handleToggleRole = (userId: string, roleName: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === userId
          ? {
              ...row,
              pendingRoles: row.pendingRoles.includes(roleName)
                ? row.pendingRoles.filter((name) => name !== roleName)
                : [...row.pendingRoles, roleName],
              status: "idle",
              message: undefined,
            }
          : row
      )
    );
  };

  const handleReset = (userId: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === userId
          ? {
              ...row,
              pendingRoles: row.roles,
              status: "idle",
              message: undefined,
            }
          : row
      )
    );
  };

  const handleSave = async (userId: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === userId
          ? { ...row, isSaving: true, status: "idle", message: undefined }
          : row
      )
    );

    const targetRow = rows.find((row) => row.id === userId);
    if (!targetRow) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}/roles`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ roles: targetRow.pendingRoles }),
      });

      if (!response.ok) {
        throw new Error("Failed to update user roles");
      }

      const payload = await response.json();
      const updatedRoles =
        (payload?.data?.roles as string[] | undefined) ??
        (payload?.roles as string[] | undefined) ??
        targetRow.pendingRoles;

      setRows((prev) =>
        prev.map((row) =>
          row.id === userId
            ? {
                ...row,
                roles: updatedRoles,
                pendingRoles: updatedRoles,
                isSaving: false,
                status: "success",
                message: "Roles updated successfully",
              }
            : row
        )
      );
    } catch (error) {
      console.error("Failed to update user roles", error);
      setRows((prev) =>
        prev.map((row) =>
          row.id === userId
            ? {
                ...row,
                isSaving: false,
                status: "error",
                message:
                  error instanceof Error
                    ? error.message
                    : "Unable to update roles",
              }
            : row
        )
      );
    }
  };

  const dirtyUsers = useMemo(
    () =>
      rows
        .filter((row) => {
          if (row.pendingRoles.length !== row.roles.length) {
            return true;
          }
          const pending = new Set(row.pendingRoles);
          return row.roles.some((role) => !pending.has(role));
        })
        .map((row) => row.id),
    [rows]
  );

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Tenant</TableHead>
              {roleOptions.map((role) => (
                <TableHead key={role.name} className="text-center">
                  {role.displayName}
                </TableHead>
              ))}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const isDirty = dirtyUsers.includes(row.id);
              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{row.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {row.email}
                      </span>
                      {!row.isActive && (
                        <Badge variant="destructive" className="mt-1 w-fit">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.tenantName || "—"}
                  </TableCell>
                  {roleOptions.map((role) => (
                    <TableCell key={`${row.id}-${role.name}`} className="text-center">
                      <Checkbox
                        checked={row.pendingRoles.includes(role.name)}
                        onCheckedChange={() =>
                          handleToggleRole(row.id, role.name)
                        }
                        disabled={row.isSaving || !hasRolesConfigured}
                      />
                    </TableCell>
                  ))}
                  <TableCell>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={row.isSaving || !isDirty}
                          onClick={() => handleReset(row.id)}
                        >
                          Reset
                        </Button>
                        <Button
                          size="sm"
                          disabled={row.isSaving || !isDirty}
                          onClick={() => handleSave(row.id)}
                        >
                          {row.isSaving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving
                            </>
                          ) : (
                            "Save"
                          )}
                        </Button>
                      </div>
                      {row.status !== "idle" && row.message ? (
                        <p
                          className={`text-xs ${
                            row.status === "error"
                              ? "text-destructive"
                              : "text-green-600"
                          }`}
                        >
                          {row.message}
                        </p>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {!hasRolesConfigured && (
        <div className="p-4">
          <Alert variant="destructive">
            <AlertDescription>
              No roles are configured for this tenant. Seed base roles to manage
              user access.
            </AlertDescription>
          </Alert>
        </div>
      )}
    </Card>
  );
}
