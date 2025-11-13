# 前端改造实施计划

## 📋 项目信息

- **项目名称**: 工作台系统前端改造
- **预计开发时间**: 10-12 小时
- **开发方式**: 仅前端实现，使用 mock 数据
- **技术栈**: Next.js 15 + React 19 + TypeScript + shadcn/ui + Tailwind CSS

---

## 🗂️ 第一阶段：代码分析与清理 (30分钟)

### 1.1 分析现有代码结构

- [x] 列出所有现有页面
- [x] 列出所有现有组件
- [x] 确定需要保留的文件
- [x] 确定需要删除的文件

### 1.2 删除无关页面

- [x] 删除 `src/app/chat/page.tsx`
- [x] 删除 `src/app/profile/page.tsx`
- [x] 检查并删除 `src/app/api/chat/route.ts`（如果存在）
- [x] 检查并删除 `src/app/api/diagnostics/` 目录（如果存在）

### 1.3 删除无关组件

- [x] 删除 `src/components/setup-checklist.tsx`
- [x] 删除 `src/components/starter-prompt-modal.tsx`
- [x] 删除 `src/components/ui/github-stars.tsx`
- [x] 检查并删除 `src/hooks/use-diagnostics.ts`（如果存在）

### 1.4 简化首页

- [x] 备份现有的 `src/app/page.tsx`
- [x] 重写首页为简单的欢迎页
- [x] 添加"进入工作台"按钮，引导到 `/dashboard`

---

## 🧪 第二阶段：创建 Mock 数据和测试环境 (45分钟)

### 2.1 创建 Mock 数据文件

- [x] 创建 `src/lib/mock-data.ts`
- [x] 定义测试用户数据
  ```typescript
  mockUser = {
    id: "test-user-001",
    name: "张三",
    email: "zhangsan@example.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
  }
  ```
- [x] 定义 mock Todos 数据（至少5条）
- [x] 定义 mock 公告数据（至少3条）
- [x] 定义 mock PPT 模板数据（至少5个）
- [x] 定义 mock OCR 识别结果示例
- [x] 定义 mock 天眼查企业数据（至少2家企业）

### 2.2 创建登录状态模拟

- [x] 创建 `src/contexts/mock-auth-context.tsx`
- [x] 实现 MockAuthProvider 组件
- [ ] 在 `layout.tsx` 中包裹 MockAuthProvider
- [x] 导出 `useMockAuth` hook 供页面使用

### 2.3 类型定义

- [x] 创建 `src/types/index.ts`
- [x] 定义 Todo 类型
- [x] 定义 Announcement 类型
- [x] 定义 PPTTemplate 类型
- [x] 定义 CompanyInfo 类型
- [x] 定义 OCRResult 类型

---

## 🎨 第三阶段：安装 shadcn/ui 组件 (20分钟)

### 3.1 安装通用组件

- [x] `npx shadcn@latest add calendar`
- [x] `npx shadcn@latest add checkbox`
- [x] `npx shadcn@latest add input`
- [x] `npx shadcn@latest add label`
- [x] `npx shadcn@latest add textarea`

### 3.2 安装选择组件

- [x] `npx shadcn@latest add select`
- [x] `npx shadcn@latest add radio-group`
- [x] `npx shadcn@latest add tabs`

### 3.3 安装数据展示组件

- [x] `npx shadcn@latest add table`
- [x] `npx shadcn@latest add alert`
- [x] `npx shadcn@latest add sheet`

### 3.4 安装其他可能需要的组件

- [x] `npx shadcn@latest add progress`（可选，用于加载进度）
- [x] `npx shadcn@latest add sonner`（替代 toast，用于消息提示）
- [x] `npx shadcn@latest add scroll-area`（可选，用于公告栏滚动）

---

## 🏠 第四阶段：实现主页 Dashboard (3小时)

### 4.1 创建 Dashboard 主页面

- [ ] 修改 `src/app/dashboard/page.tsx`
- [ ] 实现页面布局结构（网格布局）
- [ ] 添加页面标题和欢迎信息
- [ ] 集成 MockAuthProvider 获取用户信息

### 4.2 实现实时时钟组件

- [ ] 创建 `src/components/dashboard/digital-clock.tsx`
- [ ] 使用 `useEffect` 和 `setInterval` 实现每秒更新
- [ ] 显示格式：HH:mm:ss
- [ ] 添加日期显示
- [ ] 组件卸载时清理定时器

### 4.3 实现 Todo 列表组件

- [ ] 创建 `src/components/dashboard/todo-list.tsx`
- [ ] 显示 Todo 列表（从 mock 数据加载）
- [ ] 使用 Checkbox 组件实现勾选功能
- [ ] 实现"添加 Todo"按钮
- [ ] 实现删除 Todo 功能
- [ ] 实现编辑 Todo 功能
- [ ] 使用 `useState` 管理 Todo 状态

### 4.4 实现添加/编辑 Todo 对话框

- [ ] 创建 `src/components/dashboard/todo-dialog.tsx`
- [ ] 使用 Dialog 组件
- [ ] 表单字段：标题、描述、截止日期
- [ ] 表单验证
- [ ] 保存功能（更新本地状态）

### 4.5 实现日历组件

- [ ] 创建 `src/components/dashboard/calendar-view.tsx`
- [ ] 使用 shadcn Calendar 组件
- [ ] 显示当月日历
- [ ] 标注有待办事项的日期（使用特殊样式）
- [ ] 点击日期显示当天的待办事项

### 4.6 实现公告栏组件

- [ ] 创建 `src/components/dashboard/announcement-board.tsx`
- [ ] 使用 Card 组件展示公告
- [ ] 使用 ScrollArea 实现滚动
- [ ] 显示公告标题、内容、发布时间
- [ ] 使用 Badge 显示优先级（高/中/低）
- [ ] 添加"查看更多"链接（可选）

### 4.7 实现工具卡片组件

- [ ] 创建 `src/components/dashboard/tool-cards.tsx`
- [ ] 创建三个工具卡片
  - [ ] PPT 生成器卡片（图标 + 标题 + 描述）
  - [ ] OCR 识别卡片（图标 + 标题 + 描述）
  - [ ] 天眼查卡片（图标 + 标题 + 描述）
- [ ] 使用 Card 组件
- [ ] 添加 hover 效果
- [ ] 点击跳转到对应工具页面

### 4.8 Dashboard 整体布局

- [ ] 实现响应式布局
  - [ ] 桌面端：3栏布局（Todo | 日历 | 公告栏）
  - [ ] 移动端：单栏堆叠布局
- [ ] 添加 loading 状态
- [ ] 测试所有交互功能

---

## 🎤 第五阶段：实现 PPT 生成工具 (2.5小时)

### 5.1 创建页面目录和主文件

- [ ] 创建目录 `src/app/tools/ppt-generator/`
- [ ] 创建 `src/app/tools/ppt-generator/page.tsx`
- [ ] 设置页面布局和标题

### 5.2 实现顶部导航 Tabs

- [ ] 使用 shadcn Tabs 组件
- [ ] 创建四个 Tab
  - [ ] 创建模板（默认选中）
  - [ ] 模板库
  - [ ] 仪表盘
  - [ ] 设置
- [ ] 实现 Tab 切换功能

### 5.3 实现基本设置区域

- [ ] 创建表单区域容器
- [ ] 添加幻灯片页数 Select
  - [ ] 选项：5, 10, 15, 20, 30 页
  - [ ] 默认选中 10 页
- [ ] 添加语言选择 Select
  - [ ] 选项：中文、英文、日文、韩文
  - [ ] 默认选中中文
- [ ] 添加高级设置图标按钮
- [ ] 创建高级设置 Dialog

### 5.4 实现高级设置对话框

- [ ] 创建 `src/components/tools/ppt-settings-dialog.tsx`
- [ ] 使用 Dialog 组件
- [ ] 添加主题风格选择（商务、创意、简约等）
- [ ] 添加配色方案选择
- [ ] 添加字体大小调整
- [ ] 保存设置功能

### 5.5 实现内容输入区域

- [ ] 添加 Label："关于演示文稿的内容介绍"
- [ ] 添加 Textarea 组件
- [ ] 设置最小高度（150px）
- [ ] 添加字符计数（可选）
- [ ] 添加必填验证

### 5.6 实现文件上传组件

- [ ] 创建 `src/components/tools/file-upload.tsx`
- [ ] 实现拖拽上传区域
  - [ ] 监听 `onDragOver`, `onDragLeave`, `onDrop` 事件
  - [ ] 显示拖拽状态样式
- [ ] 实现点击上传功能
  - [ ] 使用 hidden input[type="file"]
  - [ ] 点击区域触发文件选择
- [ ] 文件类型验证
  - [ ] 允许：.pdf, .txt, .pptx, .docx
  - [ ] 拒绝其他类型并提示
- [ ] 文件大小验证（限制 10MB）
- [ ] 显示已上传文件列表
  - [ ] 文件名
  - [ ] 文件大小
  - [ ] 删除按钮
- [ ] 使用 `useState` 管理上传的文件列表

### 5.7 实现底部操作按钮

- [ ] 添加"下一步"Button
- [ ] 实现表单验证
  - [ ] 检查内容介绍是否已填写
  - [ ] 检查是否至少上传一个文件（可选）
- [ ] 点击后显示成功提示
- [ ] 模拟跳转到下一步（可选）

### 5.8 模板库页面（简化版）

- [ ] 从 mock 数据加载模板列表
- [ ] 使用 Card 组件展示模板
- [ ] 显示模板缩略图、名称、描述
- [ ] 添加"使用模板"按钮

### 5.9 测试和优化

- [ ] 测试所有表单交互
- [ ] 测试文件上传功能
- [ ] 测试响应式布局
- [ ] 添加必要的 loading 状态

---

## 🔍 第六阶段：实现 OCR 识别工具 (2.5小时)

### 6.1 创建页面目录和主文件

- [ ] 创建目录 `src/app/tools/ocr/`
- [ ] 创建 `src/app/tools/ocr/page.tsx`
- [ ] 设置左右分栏布局

### 6.2 实现页面头部

- [ ] 添加页面标题："OCR 文字识别工具"
- [ ] 添加简介文本
- [ ] 添加功能特点列表
  - [ ] 使用 Badge 组件展示特点
  - [ ] 免费识别、文档结构输出、多模型选择、多类型支持

### 6.3 实现左侧输入区域

#### 6.3.1 图片上传组件

- [ ] 创建 `src/components/tools/image-upload.tsx`
- [ ] 实现拖拽上传功能
- [ ] 实现点击上传功能
- [ ] 文件类型验证（仅图片：jpg, png, jpeg, webp）
- [ ] 文件大小验证（限制 5MB）
- [ ] 显示图片预览
  - [ ] 使用 Next.js Image 组件
  - [ ] 限制预览尺寸
- [ ] 添加"清除图片"按钮

#### 6.3.2 识别模式选择

- [ ] 使用 RadioGroup 组件
- [ ] 添加 Label："识别模式"
- [ ] 三个选项
  - [ ] 普通识别模式（默认）
  - [ ] 文档结构输出模式
  - [ ] 自定义模式
- [ ] 使用 `useState` 管理选中状态

#### 6.3.3 模型大小选择

- [ ] 使用 RadioGroup 组件
- [ ] 添加 Label："模型大小"
- [ ] 五个选项
  - [ ] 迷你（速度快）
  - [ ] 小型
  - [ ] 基础
  - [ ] 大型（精度高）
  - [ ] 推荐模型 ⭐（默认选中）
- [ ] 使用 `useState` 管理选中状态

#### 6.3.4 开始处理按钮

- [ ] 添加 Button："开始处理"
- [ ] 验证是否已上传图片
- [ ] 点击后显示 loading 状态
- [ ] 模拟 OCR 处理（3秒延迟）
- [ ] 处理完成后在右侧显示结果

#### 6.3.5 使用提示

- [ ] 使用 Alert 组件
- [ ] 添加四条提示信息
  - [ ] 推荐模型适用于大多数文档
  - [ ] 文档结构输出适合结构化内容
  - [ ] 普通识别适合简单提取
  - [ ] 高分辨率图片效果更好

### 6.4 实现右侧结果展示区域

- [ ] 添加 Label："识别结果"
- [ ] 添加 Textarea 组件（只读模式）
- [ ] 设置最小高度（400px）
- [ ] 从 mock 数据显示识别结果
- [ ] 添加"复制结果"Button
  - [ ] 使用 Clipboard API
  - [ ] 复制成功后显示 Toast 提示

### 6.5 实现 OCR 处理逻辑

- [ ] 创建处理函数 `handleOCRProcess`
- [ ] 实现 loading 状态管理
- [ ] 使用 `setTimeout` 模拟异步处理
- [ ] 根据选择的模式和模型返回不同的 mock 结果
- [ ] 错误处理（未上传图片时提示）

### 6.6 测试和优化

- [ ] 测试图片上传功能
- [ ] 测试模式和模型选择
- [ ] 测试 OCR 处理流程
- [ ] 测试结果展示和复制功能
- [ ] 测试响应式布局

---

## 🏢 第七阶段：实现天眼查工具 (2.5小时)

### 7.1 创建页面目录和主文件

- [ ] 创建目录 `src/app/tools/tianyancha/`
- [ ] 创建 `src/app/tools/tianyancha/page.tsx`
- [ ] 设置页面布局

### 7.2 实现搜索区域

- [ ] 添加页面标题："企业信息查询"
- [ ] 添加简介文本
- [ ] 创建搜索表单
  - [ ] Input 组件：企业名称输入框
  - [ ] 添加占位符："请输入企业名称"
  - [ ] Button："查询"按钮
- [ ] 使用 `useState` 管理输入值
- [ ] 实现查询功能
  - [ ] 验证输入不为空
  - [ ] 显示 loading 状态
  - [ ] 模拟 API 请求（2秒延迟）
  - [ ] 从 mock 数据匹配企业信息

### 7.3 实现企业基本信息卡片

- [ ] 创建 `src/components/tools/company-info-card.tsx`
- [ ] 使用 Card 组件
- [ ] 显示企业基本信息
  - [ ] 企业名称（大标题）
  - [ ] 法人代表
  - [ ] 注册资本
  - [ ] 成立日期
  - [ ] 经营状态（使用 Badge 组件）
    - [ ] 在业（绿色）
    - [ ] 注销（灰色）
    - [ ] 吊销（红色）
  - [ ] 统一社会信用代码
  - [ ] 注册地址
- [ ] 实现响应式布局

### 7.4 实现详细信息 Tabs

#### 7.4.1 创建 Tabs 结构

- [ ] 使用 shadcn Tabs 组件
- [ ] 创建四个 TabsTrigger
  - [ ] 工商信息
  - [ ] 股东信息
  - [ ] 变更记录
  - [ ] 经营范围

#### 7.4.2 工商信息页

- [ ] 创建 `src/components/tools/company-business-info.tsx`
- [ ] 使用描述列表布局
- [ ] 显示详细工商信息
  - [ ] 企业类型
  - [ ] 营业期限
  - [ ] 登记机关
  - [ ] 核准日期
  - [ ] 组织机构代码

#### 7.4.3 股东信息页

- [ ] 创建 `src/components/tools/company-shareholders.tsx`
- [ ] 使用 Table 组件
- [ ] 表格列
  - [ ] 股东名称
  - [ ] 持股比例
  - [ ] 认缴出资额
  - [ ] 实缴出资额
- [ ] 从 mock 数据加载股东列表

#### 7.4.4 变更记录页

- [ ] 创建 `src/components/tools/company-changes.tsx`
- [ ] 使用 Table 组件
- [ ] 表格列
  - [ ] 变更日期
  - [ ] 变更项目
  - [ ] 变更前内容
  - [ ] 变更后内容
- [ ] 从 mock 数据加载变更记录
- [ ] 添加分页功能（可选）

#### 7.4.5 经营范围页

- [ ] 创建 `src/components/tools/company-business-scope.tsx`
- [ ] 使用文本展示
- [ ] 显示完整的经营范围描述
- [ ] 添加关键词高亮（可选）

### 7.5 实现尽调报告生成功能

- [ ] 添加"一键生成尽调报告"Button
- [ ] 放置在企业信息底部
- [ ] 点击后显示 loading 状态
- [ ] 模拟报告生成（3秒延迟）
- [ ] 显示成功提示 Toast
- [ ] 创建报告预览 Dialog（可选）
  - [ ] 显示报告摘要
  - [ ] 提供下载 PDF 按钮（模拟）

### 7.6 实现状态管理

- [ ] 使用 `useState` 管理搜索状态
  - [ ] `searchQuery`: 搜索关键词
  - [ ] `companyData`: 企业数据
  - [ ] `isLoading`: 加载状态
  - [ ] `error`: 错误信息
- [ ] 创建查询函数 `handleSearch`
- [ ] 创建报告生成函数 `handleGenerateReport`

### 7.7 Mock 数据准备

- [ ] 在 `mock-data.ts` 中添加企业数据
  - [ ] 至少 2-3 家不同行业的企业
  - [ ] 包含完整的工商信息
  - [ ] 包含 3-5 个股东
  - [ ] 包含 5-8 条变更记录
  - [ ] 包含详细的经营范围

### 7.8 测试和优化

- [ ] 测试搜索功能
- [ ] 测试企业信息展示
- [ ] 测试 Tabs 切换
- [ ] 测试报告生成功能
- [ ] 测试响应式布局
- [ ] 测试错误处理（企业不存在等情况）

---

## 🧭 第八阶段：更新导航栏和全局样式 (45分钟)

### 8.1 更新导航栏

- [ ] 修改 `src/components/site-header.tsx`
- [ ] 更新 Logo 和应用名称
  - [ ] 将"Starter Kit"改为"工作台"
  - [ ] 更新图标（可选）
- [ ] 添加主导航链接
  - [ ] 主页（Dashboard）
  - [ ] PPT 生成
  - [ ] OCR 识别
  - [ ] 天眼查
- [ ] 保留右侧功能
  - [ ] 用户头像和下拉菜单
  - [ ] 暗色模式切换
- [ ] 实现当前页面高亮效果
- [ ] 移动端响应式菜单（汉堡菜单）

### 8.2 更新页脚

- [ ] 修改 `src/components/site-footer.tsx`
- [ ] 更新版权信息
- [ ] 添加相关链接（可选）
- [ ] 保持简洁设计

### 8.3 更新全局元数据

- [ ] 修改 `src/app/layout.tsx`
- [ ] 更新 `<title>` 为"工作台系统"
- [ ] 更新 `<description>`
- [ ] 更新 favicon（可选）

### 8.4 更新首页

- [ ] 简化 `src/app/page.tsx`
- [ ] 创建简洁的欢迎页面
  - [ ] 应用介绍
  - [ ] 主要功能展示
  - [ ] "进入工作台"CTA 按钮
- [ ] 移除所有 setup 相关内容

---

## 🎨 第九阶段：UI 优化和细节完善 (1.5小时)

### 9.1 统一视觉风格

- [ ] 检查所有页面的颜色使用
- [ ] 确保使用 shadcn 的色彩 token
  - [ ] `bg-background`, `text-foreground`
  - [ ] `bg-card`, `text-card-foreground`
  - [ ] `bg-primary`, `text-primary-foreground`
- [ ] 统一卡片圆角和阴影
- [ ] 统一间距和布局

### 9.2 暗色模式适配

- [ ] 测试所有页面的暗色模式
- [ ] 确保文字可读性
- [ ] 检查图标颜色
- [ ] 检查边框颜色
- [ ] 调整必要的颜色

### 9.3 响应式设计优化

- [ ] 测试各页面在不同屏幕尺寸下的表现
  - [ ] 移动端（< 640px）
  - [ ] 平板（640px - 1024px）
  - [ ] 桌面端（> 1024px）
- [ ] 调整布局断点
- [ ] 优化移动端交互
- [ ] 确保触摸目标足够大

### 9.4 加载状态和骨架屏

- [ ] 为 Dashboard 添加 loading skeleton
- [ ] 为工具页面添加 loading 状态
- [ ] 为数据请求添加 loading spinner
- [ ] 统一 loading 动画风格

### 9.5 错误处理和提示

- [ ] 添加表单验证错误提示
- [ ] 添加文件上传错误提示
- [ ] 添加查询失败错误提示
- [ ] 使用 Toast 组件统一消息提示

### 9.6 动画和过渡效果

- [ ] 添加页面切换过渡动画
- [ ] 添加卡片 hover 效果
- [ ] 添加按钮点击反馈
- [ ] 添加对话框打开/关闭动画
- [ ] 保持动画流畅自然

### 9.7 无障碍优化

- [ ] 添加必要的 `aria-label`
- [ ] 确保键盘导航可用
- [ ] 检查颜色对比度
- [ ] 添加 alt 文本到图片

---

## ✅ 第十阶段：测试和质量保证 (1小时)

### 10.1 功能测试

- [ ] 测试 Dashboard 所有功能
  - [ ] Todo 增删改查
  - [ ] 日历查看
  - [ ] 公告栏滚动
  - [ ] 工具卡片跳转
- [ ] 测试 PPT 生成工具
  - [ ] 表单填写
  - [ ] 文件上传
  - [ ] Tab 切换
  - [ ] 提交流程
- [ ] 测试 OCR 工具
  - [ ] 图片上传
  - [ ] 模式选择
  - [ ] 识别处理
  - [ ] 结果复制
- [ ] 测试天眼查工具
  - [ ] 企业搜索
  - [ ] 信息展示
  - [ ] Tab 切换
  - [ ] 报告生成

### 10.2 浏览器兼容性测试

- [ ] Chrome 测试
- [ ] Firefox 测试
- [ ] Safari 测试（如果可能）
- [ ] Edge 测试

### 10.3 代码质量检查

- [ ] 运行 `npm run lint`
- [ ] 修复所有 ESLint 错误
- [ ] 修复所有 ESLint 警告（尽可能）
- [ ] 运行 `npm run typecheck`
- [ ] 修复所有 TypeScript 类型错误

### 10.4 性能检查

- [ ] 检查页面加载时间
- [ ] 检查图片加载优化
- [ ] 检查是否有不必要的重渲染
- [ ] 使用 React DevTools Profiler 分析

### 10.5 代码清理

- [ ] 删除未使用的 import
- [ ] 删除注释掉的代码
- [ ] 删除 console.log 调试语句
- [ ] 格式化所有代码文件

---

## 📝 第十一阶段：文档和交付 (30分钟)

### 11.1 更新项目文档

- [ ] 更新 README.md
  - [ ] 项目介绍
  - [ ] 功能列表
  - [ ] 技术栈
  - [ ] 安装和运行说明
- [ ] 更新 CLAUDE.md（如果需要）

### 11.2 创建组件文档

- [ ] 为自定义组件添加 JSDoc 注释
- [ ] 说明组件的 props 和用法
- [ ] 添加使用示例（可选）

### 11.3 标记完成的任务

- [ ] 检查本文档的所有 checkbox
- [ ] 标记已完成的任务
- [ ] 记录未完成的任务和原因

### 11.4 准备演示

- [ ] 准备演示数据
- [ ] 截图关键页面（可选）
- [ ] 准备演示流程说明

---

## 🚀 后续扩展（可选，不在本阶段范围）

### 后端集成

- [ ] 设计 RESTful API 接口
- [ ] 实现数据库 schema
- [ ] 集成真实的认证系统
- [ ] 实现文件上传服务

### 第三方服务集成

- [ ] 集成 OCR 服务（如 Tesseract.js、云 OCR）
- [ ] 集成天眼查 API
- [ ] 集成 PPT 生成库（如 pptxgenjs）

### 高级功能

- [ ] 实现数据持久化
- [ ] 添加数据导出功能
- [ ] 添加用户设置页面
- [ ] 实现通知系统
- [ ] 添加搜索功能

---

## 📊 进度追踪

- **阶段一**: ✅ 已完成
- **阶段二**: ✅ 已完成
- **阶段三**: ✅ 已完成
- **阶段四**: ⬜ 未开始
- **阶段五**: ⬜ 未开始
- **阶段六**: ⬜ 未开始
- **阶段七**: ⬜ 未开始
- **阶段八**: ⬜ 未开始
- **阶段九**: ⬜ 未开始
- **阶段十**: ⬜ 未开始
- **阶段十一**: ⬜ 未开始

---

## 🎯 成功标准

- [ ] 所有页面正常渲染
- [ ] 所有交互功能正常工作
- [ ] 通过 lint 和 typecheck
- [ ] 支持暗色模式
- [ ] 响应式设计良好
- [ ] 用户体验流畅
- [ ] 代码质量符合规范
