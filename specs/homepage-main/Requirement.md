# Login Landing Page

- [x] Split the hero into two equal columns: left column shows Bank of Beijing / Consumer Finance / Company, right column remains empty for future widgets.
- [x] Position the primary login button directly beneath the hero. Clicking it swaps the button for username/password inputs.
- [x] Pre-fill and validate credentials against the fixed pair zhangbin / Bobcfc1234 so manual smoke tests stay deterministic.
- [x] Remove the global navigation bar when users view `/` so the landing screen stays distraction free.
- [x] Redirect successful logins to the legacy homepage at `/home` until the dashboard flow is ready.
- [x] Stretch the landing view to fill the viewport (`min-h-svh`) so no scrolling is needed on any window size.
- [x] Hide the footer (2025 工作台系统文本) on the landing page to keep the canvas clean.
- [x] Remove the welcome helper sentence so only the three-line headline remains on the left side.
- [x] Present a single-column hero with the three-line headline centered both vertically and horizontally.
- [x] Place the 登录 button (or login form) directly beneath the headline with comfortable spacing.

# 项目需求文档

## 项目概述

将现有的 Next.js AI 应用改造为一个集成工作台系统，用户登录后能够访问个人主页和三个工具。

---

## 核心需求

### 1. 主页 Dashboard

- [ ] 用户登录后显示个人主页
- [ ] 显示用户欢迎信息（显示用户名）
- [ ] 实时数字时钟组件
- [ ] 个人 Todo 待办事项列表
  - [ ] 显示待办事项列表
  - [ ] 添加新的待办事项
  - [ ] 编辑现有待办事项
  - [ ] 删除待办事项
  - [ ] 标记待办事项为完成
- [ ] 日历组件
  - [ ] 显示当月日历
  - [ ] 在日历上标注有待办事项的日期
- [ ] 公告栏
  - [ ] 显示系统公告
  - [ ] 支持滚动浏览多条公告
  - [ ] 显示公告优先级
- [ ] 三个工具入口卡片
  - [ ] PPT 生成工具入口
  - [ ] OCR 识别工具入口
  - [ ] 天眼查工具入口

---

### 2. 工具一：PPT 生成器

#### 2.1 页面布局

- [ ] 顶部导航栏（四个入口）
  - [ ] 创建模板
  - [ ] 模板库
  - [ ] 仪表盘
  - [ ] 设置

#### 2.2 页面标题

- [ ] 显示"创建演示文稿"标题

#### 2.3 基本设置区域

- [ ] 幻灯片页数选择下拉框
  - [ ] 支持选项：5页、10页、15页、20页、30页
- [ ] 语言选择下拉框
  - [ ] 支持选项：中文、英文、日文、韩文
- [ ] 高级设置图标按钮
  - [ ] 点击打开高级选项对话框

#### 2.4 文本输入区域

- [ ] 大文本输入框
- [ ] 用于填写"关于演示文稿的内容介绍"
- [ ] 支持多行文本输入

#### 2.5 上传资料区域

- [ ] 可拖拽上传区域
- [ ] 点击选择文件功能
- [ ] 支持的文件类型
  - [ ] PDF
  - [ ] 文本文件（TXT）
  - [ ] PPTX
  - [ ] DOCX
- [ ] "选择文件"按钮
- [ ] 显示已上传文件列表
- [ ] 删除已上传文件功能

#### 2.6 底部操作按钮

- [ ] "下一步"按钮
- [ ] 表单验证（确保必填项已填写）
- [ ] 成功提示信息

---

### 3. 工具二：OCR 识别工具

#### 3.1 页面标题与简介

- [ ] 显示 OCR 工具标题
- [ ] 简介文本说明
  - [ ] 说明可上传图片进行文字提取
  - [ ] 说明支持文本、文档、表格等内容识别

#### 3.2 功能特点区域

- [ ] 列出支持的能力
  - [ ] 提供免费文字识别
  - [ ] 支持按文档结构输出
  - [ ] 提供多种模型选择（速度与精度平衡）
  - [ ] 支持多种不同类型的文档图片

#### 3.3 左侧部分 - 输入与设置

##### 3.3.1 上传图片区域

- [ ] "上传图片"按钮
- [ ] 可拖拽上传区域
- [ ] 点击上传功能
- [ ] 上传提示文本
- [ ] 图片预览功能

##### 3.3.2 识别模式选择

- [ ] 单选按钮组
  - [ ] 普通识别模式
  - [ ] 文档结构输出模式
  - [ ] 自定义模式

##### 3.3.3 模型大小选择

- [ ] 单选按钮组
  - [ ] 迷你模型
  - [ ] 小型模型
  - [ ] 基础模型
  - [ ] 大型模型
  - [ ] 推荐模型（默认选中）

##### 3.3.4 操作按钮

- [ ] "开始处理"按钮
- [ ] 显示处理中的 loading 状态

##### 3.3.5 使用提示

- [ ] 显示使用建议
  - [ ] 推荐模型适用于大多数文档
  - [ ] 文档结构输出适合结构化内容
  - [ ] 普通识别适合简单提取
  - [ ] 高分辨率图片效果更好

#### 3.4 右侧部分 - 识别结果展示

- [ ] 识别结果展示框
  - [ ] 显示识别后的文字
  - [ ] 只读模式
- [ ] 导出区域
  - [ ] "复制结果"按钮
  - [ ] 复制成功提示

---

### 4. 工具三：天眼查企业查询

#### 4.1 搜索区域

- [ ] 企业名称输入框
- [ ] 查询按钮
- [ ] 显示查询中的 loading 状态

#### 4.2 企业基本信息展示

- [ ] 企业名称（标题）
- [ ] 法人代表
- [ ] 注册资本
- [ ] 成立日期
- [ ] 经营状态（带状态标签）
- [ ] 统一社会信用代码
- [ ] 注册地址

#### 4.3 详细信息区域

- [ ] Tab 切换功能
  - [ ] 工商信息标签页
  - [ ] 股东信息标签页（表格展示）
  - [ ] 变更记录标签页（表格展示）
  - [ ] 经营范围标签页

#### 4.4 尽调报告生成

- [ ] "一键生成尽调报告"按钮
- [ ] 生成成功提示信息
- [ ] 报告预览功能（可选）

---

## 技术要求

### 前端技术栈

- [ ] Next.js 15 (App Router)
- [ ] React 19
- [ ] TypeScript
- [ ] shadcn/ui 组件库
- [ ] tweakcn 样式系统
- [ ] Tailwind CSS
- [ ] 支持暗色模式

### 用户体验

- [ ] 响应式设计（支持桌面和移动端）
- [ ] 流畅的加载状态
- [ ] 友好的错误提示
- [ ] 统一的视觉风格
- [ ] 无障碍访问支持

### 测试用户

- [ ] 创建测试用户 mock 数据
- [ ] 模拟已登录状态
- [ ] 提供示例 Todo 数据
- [ ] 提供示例公告数据
- [ ] 提供示例 PPT 模板数据
- [ ] 提供示例企业查询结果

---

## 需要移除的内容

### 删除的页面

- [ ] `/chat` - AI 聊天页面
- [ ] `/profile` - 用户资料页面
- [ ] `/api/chat` - AI 聊天 API 路由

### 删除的组件

- [ ] `setup-checklist.tsx` - 设置检查清单
- [ ] `starter-prompt-modal.tsx` - 启动提示模态框
- [ ] `github-stars.tsx` - GitHub stars 组件
- [ ] `use-diagnostics.ts` - 诊断 hook

### 更新的内容

- [ ] 简化首页（`/` 路由）
- [ ] 更新导航栏，移除无关链接
- [ ] 更新页面标题和元数据

---

## 非功能性需求

- [ ] 代码质量
  - [ ] 通过 ESLint 检查
  - [ ] 通过 TypeScript 类型检查
  - [ ] 遵循项目代码规范
- [ ] 性能
  - [ ] 快速页面加载
  - [ ] 流畅的交互动画
  - [ ] 优化的资源加载
- [ ] 可维护性
  - [ ] 清晰的组件结构
  - [ ] 可复用的组件设计
  - [ ] 完善的代码注释

---

## 开发阶段说明

**本阶段重点：**
- 仅实现前端界面和交互
- 使用 mock 数据模拟后端响应
- 不涉及真实的数据库操作
- 不涉及真实的文件上传和处理
- 不调用真实的第三方 API

**后续阶段：**
- 集成后端 API
- 实现数据库操作
- 实现真实的文件上传
- 集成 OCR 服务
- 集成天眼查 API
