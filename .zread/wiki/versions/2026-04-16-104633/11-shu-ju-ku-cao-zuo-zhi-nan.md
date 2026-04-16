本文档详细说明项目中数据库操作的各项实践，包括连接管理、查询模式、事务处理、迁移部署和数据初始化等核心内容。

## 数据库架构概览

本项目采用 **PostgreSQL** 作为主数据库，通过 **Drizzle ORM** 进行类型安全的数据库操作。项目还包含一个独立的检查数据库（inspection-db）用于存储质检数据，以及一个 SQLite 数据库用于读取 Open WebUI 的用户 API Key。

```mermaid
flowchart TB
    subgraph "Application Layer"
        API[API Routes]
        Services[Service Layer]
    end
    
    subgraph "Database Layer"
        subgraph "PostgreSQL"
            MainDB[(主数据库<br/>POSTGRES_URL)]
            InspectionDB[(检查数据库<br/>INSPECTION_POSTGRES_URL)]
        end
        subgraph "SQLite"
            WebuiDB[(webui.db)]
        end
    end
    
    API --> Services
    Services --> MainDB
    Services --> InspectionDB
    Services --> WebuiDB
```

Sources: [src/lib/db.ts](src/lib/db.ts#L1-L43)
Sources: [src/lib/inspection-db.ts](src/lib/inspection-db.ts#L1-L13)
Sources: [src/lib/webui-db.ts](src/lib/webui-db.ts#L1-L102)

## 环境配置

### 连接字符串配置

数据库连接通过环境变量管理，在 `env.example` 中定义以下关键变量：

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `POSTGRES_URL` | 主数据库连接串 | `postgresql://user:pass@host/database` |
| `POSTGRES_MAX_CONNECTIONS` | 最大连接数 | `50`（默认值） |
| `INSPECTION_POSTGRES_URL` | 检查数据库连接串 | `postgresql://user:pass@host/inspection` |
| `OPEN_WEBUI_SERVICE_TOKEN` | Open WebUI 服务令牌 | `sk-xxx` |

连接串格式验证在 `db.ts` 中实现，确保包含有效的主机名：

```typescript
const url = new URL(connectionString);
if (!url.hostname) {
  throw new Error("Missing hostname");
}
```

Sources: [src/lib/db.ts](src/lib/db.ts#L15-L26)

### 连接池配置

postgres-js 客户端配置了完整的连接池参数：

```typescript
const client = postgres(connectionString, {
  max: parseInt(process.env.POSTGRES_MAX_CONNECTIONS || "50", 10),
  idle_timeout: 60,
  connect_timeout: 30,
  max_lifetime: 60 * 30,
  prepare: false,
  connection: {
    application_name: "homepage_app",
  },
  transform: {
    undefined: null,
  },
});
```

Sources: [src/lib/db.ts](src/lib/db.ts#L28-L42)

## Drizzle ORM 使用模式

### 数据库实例导出

项目导出两个独立的数据库实例：

```typescript
// 主数据库实例
export const db = drizzle(client, { schema });

// 检查数据库实例
export const inspectionDb = drizzle(inspectionClient, { schema });
```

Sources: [src/lib/db.ts](src/lib/db.ts#L43)
Sources: [src/lib/inspection-db.ts](src/lib/inspection-db.ts#L11-L13)

### 查询构建器模式

项目广泛使用 Drizzle 的查询构建器模式，通过 `db.query.<tableName>` 访问预生成的查询接口：

```typescript
// 查询单个用户
const userRecord = await db.query.user.findFirst({
  where: eq(schema.user.email, email),
  with: {
    tenant: {
      columns: {
        name: true,
      },
    },
    userRoles: {
      with: {
        role: {
          columns: {
            name: true,
            displayName: true,
          },
        },
      },
    },
  },
});
```

Sources: [src/app/api/users/route.ts](src/app/api/users/route.ts#L11-L30)

### 关系查询（Relations）

Schema 中定义了完整的关系映射，支持嵌套加载关联数据：

```typescript
export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  userRoles: many(userRoles),
  tenant: one(tenants, {
    fields: [user.tenantId],
    references: [tenants.id],
  }),
}));
```

Sources: [src/lib/schema.ts](src/lib/schema.ts#L260-L270)

## 常见操作示例

### 用户权限查询

权限检查是核心业务逻辑，使用 `loadAuthorizationSnapshot` 函数加载用户的完整权限快照：

```typescript
async function loadAuthorizationSnapshot(userId: string) {
  const userRecord = await db.query.user.findFirst({
    where: eq(schema.user.id, userId),
    columns: {
      id: true,
      isActive: true,
    },
    with: {
      tenant: {
        columns: {
          features: true,
        },
      },
      userRoles: {
        columns: {},
        with: {
          role: {
            columns: { id: true },
            with: {
              permissions: {
                columns: { permissionId: true },
                with: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });
  // ... 处理权限数据
}
```

Sources: [src/lib/rbac.ts](src/lib/rbac.ts#L58-L95)

### 角色分配操作

使用事务确保角色分配的数据一致性：

```typescript
await db.transaction(async (tx) => {
  // 先删除现有角色
  await tx
    .delete(schema.userRoles)
    .where(eq(schema.userRoles.userId, userId));

  // 再插入新角色
  if (roleRecords.length) {
    await tx.insert(schema.userRoles).values(
      roleRecords.map((roleRecord) => ({
        id: randomUUID(),
        userId,
        roleId: roleRecord.id,
      }))
    );
  }
});
```

Sources: [src/app/api/users/[id]/roles/route.ts](src/app/api/users/[id]/roles/route.ts#L47-L60)

### 插入并返回数据

使用 `.returning()` 获取插入的记录：

```typescript
const inserted = await inspectionDb
  .insert(collectionAuditResults)
  .values(testData)
  .returning();

console.log(`Successfully inserted ${inserted.length} records`);
```

Sources: [scripts/seed-quality-check-data.ts](scripts/seed-quality-check-data.ts#L130-L136)

### Upsert 操作

使用 `onConflictDoNothing` 避免重复插入：

```typescript
await db
  .insert(tenants)
  .values({
    id: "default",
    name: "Default Tenant",
    slug: "default",
    description: "System default tenant",
  })
  .onConflictDoNothing();
```

Sources: [src/lib/rbac-init.ts](src/lib/rbac-init.ts#L52-L59)

## 迁移管理

### 迁移命令

| 命令 | 说明 |
|------|------|
| `pnpm db:generate` | 根据 schema.ts 变更生成迁移文件 |
| `pnpm db:migrate` | 执行迁移（生产环境推荐） |
| `pnpm db:push` | 直接推送 schema 变更（开发环境） |
| `pnpm db:studio` | 打开 Drizzle Studio 可视化工具 |
| `pnpm db:reset` | 删除并重建所有表 |

Sources: [package.json](package.json#L4-L11)

### 迁移文件结构

迁移文件存储在 `drizzle/` 目录下，包含 SQL 文件和快照元数据：

```
drizzle/
├── 0000_chilly_the_phantom.sql
├── 0001_narrow_wolfpack.sql
├── ...
└── meta/
    ├── 0000_snapshot.json
    ├── _journal.json
    └── ...
```

Sources: [drizzle/meta/_journal.json](drizzle/meta/_journal.json#L1-L48)

### Drizzle 配置

```typescript
export default {
  dialect: "postgresql",
  schema: "./src/lib/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.POSTGRES_URL!,
  },
} satisfies Config;
```

Sources: [drizzle.config.ts](drizzle.config.ts#L1-L11)

## 数据初始化

### 主数据库初始化

通过 `ensureCoreAuthData` 函数初始化核心认证数据：

```typescript
export async function ensureCoreAuthData(options?: SeedOptions) {
  const log: SeedLogger = options?.verbose ? console.log : () => {};
  await ensureDefaultTenant(log);
  await ensureRolesAndPermissions(log);
  await ensureLocalAdminUser(log);
}
```

Sources: [src/lib/rbac-init.ts](src/lib/rbac-init.ts#L195-L202)

### 初始角色与权限

系统预置了四个基础角色：

| 角色名 | 显示名称 | 权限范围 |
|--------|----------|----------|
| `admin` | Administrator | 全部权限 |
| `user` | Regular User | 读取和创建 |
| `ppt_admin` | PPT Administrator | PPT 管理 |
| `viewer` | Viewer | 仅读取 |

Sources: [src/lib/rbac-init.ts](src/lib/rbac-init.ts#L18-L40)

### 初始权限定义

```typescript
const basePermissions = [
  { resource: "dashboard", action: "read", description: "Access dashboard" },
  { resource: "ppt", action: "read", description: "View PPT" },
  { resource: "ppt", action: "create", description: "Create PPT" },
  { resource: "ppt", action: "delete", description: "Delete PPT" },
  { resource: "ocr", action: "read", description: "Use OCR recognition" },
  { resource: "tianyancha", action: "read", description: "Query company info" },
  { resource: "qualityCheck", action: "read", description: "Query quality audit results" },
];
```

Sources: [src/lib/rbac-init.ts](src/lib/rbac-init.ts#L43-L51)

## 数据库维护脚本

### 连接测试

```bash
pnpm db:test
```

此脚本会验证连接串格式、测试连接、建立并检查表存在性。

Sources: [scripts/test-db-connection.ts](scripts/test-db-connection.ts#L1-L125)

### 授予管理员角色

```bash
tsx scripts/grant-admin-role.ts <email>
```

Sources: [scripts/grant-admin-role.ts](scripts/grant-admin-role.ts#L1-L58)

### 数据播种

```bash
pnpm db:seed                    # 初始化核心认证数据
tsx scripts/seed-quality-check-data.ts  # 播种质检数据
```

Sources: [src/lib/db-seed.ts](src/lib/db-seed.ts#L1-L20)
Sources: [scripts/seed-quality-check-data.ts](scripts/seed-quality-check-data.ts#L1-L146)

## SQLite 集成

Open WebUI 数据库使用 SQLite，通过 `webui-db.ts` 模块访问：

```typescript
import { DatabaseSync } from "node:sqlite";

const dbPath = join(process.cwd(), "webui.db");
const db = new DatabaseSync(dbPath);

export function getWebuiUserApiKey(email: string): string | null {
  const stmt = database.prepare("SELECT api_key FROM user WHERE email = ?");
  const row = stmt.get(email) as { api_key: string | null } | undefined;
  return row?.api_key ?? null;
}
```

Sources: [src/lib/webui-db.ts](src/lib/webui-db.ts#L1-L102)

## 最佳实践

### 连接管理

始终使用单例模式导出数据库实例，避免重复创建连接池。生产环境确保设置合理的 `max_connections` 值。

### 事务处理

涉及多表操作时使用 `db.transaction()` 确保数据一致性：

```typescript
await db.transaction(async (tx) => {
  // 所有操作在事务内执行
  // 任何失败都会自动回滚
});
```

Sources: [src/app/api/users/[id]/roles/route.ts](src/app/api/users/[id]/roles/route.ts#L47-L60)

### 索引使用

在高频查询字段上添加索引，schema 中已定义以下索引：

```typescript
(table) => ({
  collIdIdx: index("collection_audit_results_coll_id_idx").on(table.collId),
  dateFolderIdx: index("collection_audit_results_date_folder_idx").on(table.dateFolder),
  collIdDateIdx: index("collection_audit_results_coll_id_date_idx").on(table.collId, table.dateFolder),
})
```

Sources: [src/lib/schema.ts](src/lib/schema.ts#L248-L273)

### 类型安全

所有 schema 定义使用 TypeScript 类型，通过 `$type<T>()` 约束 JSONB 字段结构：

```typescript
features: jsonb("features")
  .$type<{
    ppt: boolean;
    ocr: boolean;
    tianyancha: boolean;
    qualityCheck: boolean;
    fileCompare: boolean;
    zimage: boolean;
  }>()
  .default(sql`'{"ppt":true,"ocr":true,...}'::jsonb`)
  .notNull(),
```

Sources: [src/lib/schema.ts](src/lib/schema.ts#L22-L36)

## 下一步

- 继续阅读 [RBAC 权限模型](12-rbac-quan-xian-mo-xing) 了解权限体系设计
- 参考 [数据库模式设计](10-shu-ju-ku-mo-shi-she-ji) 深入理解表结构