import type {
  Todo,
  Announcement,
  PPTTemplate,
  OCRResult,
  CompanyInfo,
} from "@/types";

const demoUserId = "test-user-001";

// Mock Todos 数据
export const mockTodos: Todo[] = [
  {
    id: "todo-001",
    title: "完成项目需求文档",
    description: "整理并完善工作台系统的需求文档",
    completed: false,
    dueDate: "2025-11-15",
    createdAt: "2025-11-10T08:00:00Z",
    userId: demoUserId,
  },
  {
    id: "todo-002",
    title: "设计数据库表结构",
    description: "设计用户、待办事项和公告相关的数据库表",
    completed: true,
    dueDate: "2025-11-13",
    createdAt: "2025-11-09T10:30:00Z",
    userId: demoUserId,
  },
  {
    id: "todo-003",
    title: "开发 Dashboard 页面",
    description: "实现用户主页的所有功能组件",
    completed: false,
    dueDate: "2025-11-20",
    createdAt: "2025-11-11T14:20:00Z",
    userId: demoUserId,
  },
  {
    id: "todo-004",
    title: "集成 OCR 服务",
    description: "调研并集成合适的 OCR 文字识别服务",
    completed: false,
    dueDate: "2025-11-25",
    createdAt: "2025-11-12T09:15:00Z",
    userId: demoUserId,
  },
  {
    id: "todo-005",
    title: "团队周会",
    description: "参加团队每周例会，汇报项目进度",
    completed: false,
    dueDate: "2025-11-14",
    createdAt: "2025-11-13T08:00:00Z",
    userId: demoUserId,
  },
  {
    id: "todo-006",
    title: "优化页面性能",
    description: "对首页加载速度进行优化，减少初始加载时间",
    completed: false,
    dueDate: "2025-11-18",
    createdAt: "2025-11-10T16:45:00Z",
    userId: demoUserId,
  },
];

// Mock 公告数据
export const mockAnnouncements: Announcement[] = [
  {
    id: "ann-005",
    title: "🎉 项目更新 - v1.0.1",
    content: `**🎨 UI更新**
- 🎨 全新**暖色皮肤**，深色/浅色主题自适应
- 📝 全新 **Markdown 渲染**引擎，代码，表格显示更美观
- 💬 优化**消息气泡**显示，改进聊天界面布局和交互流畅度
- 📱 新增**响应式侧边栏**组件，支持展开/折叠

**🚀 应用上线**
- 👁️ 全新上线 **deepseekOCR** 应用，一键提取文本
- 📊 全新上线 **PPT生成**应用，一键生成企业级PPT
- 🔍 全新上线**质检查询**应用，根据关键字查询质检信息

---

> **⏳ 后续待更新：**
>
> - 🏢 **天眼查应用**，实时获取企业信息，生成尽调报告
> - 📄 **文件对比应用**，一键对比多个文件在风控，内容的差异`,
    priority: "high",
    publishedAt: "2026-01-05T10:00:00Z",
    type: "success",
  },
  {
    id: "ann-001",
    title: "系统维护通知",
    content: "系统将于本周六凌晨 2:00-4:00 进行例行维护，期间服务可能暂时不可用，请提前做好准备。",
    priority: "high",
    publishedAt: "2025-11-12T10:00:00Z",
    type: "warning",
  },
  {
    id: "ann-002",
    title: "新功能上线：PPT 生成器",
    content: "我们很高兴地宣布 PPT 生成器功能正式上线！现在您可以快速创建专业的演示文稿。",
    priority: "medium",
    publishedAt: "2025-11-10T09:30:00Z",
    type: "success",
  },
  {
    id: "ann-003",
    title: "用户反馈征集",
    content: "我们正在收集用户对工作台系统的使用反馈，欢迎通过邮件或在线表单提交您的宝贵意见。",
    priority: "low",
    publishedAt: "2025-11-08T14:20:00Z",
    type: "info",
  },
  {
    id: "ann-004",
    title: "OCR 功能优化",
    content: "OCR 识别功能已升级，识别准确率提升 15%，处理速度提升 30%。",
    priority: "medium",
    publishedAt: "2025-11-11T11:00:00Z",
    type: "success",
  },
];

// Mock PPT 演示提示词数据
export const mockPPTTemplates: PPTTemplate[] = [
  // 通用主题
  {
    id: "prompt-001",
    name: "商务报告",
    description: "创建一份关于企业年度报告或季度总结的演示文稿",
    thumbnail: "https://via.placeholder.com/300x200/4F46E5/FFFFFF?text=Business+Report",
    theme: "business",
    colorScheme: "blue-gray",
    slideCount: 20,
    category: "商务",
    tags: ["报告", "商务", "正式"],
    createdAt: "2025-10-15T10:00:00Z",
  },
  {
    id: "prompt-002",
    name: "产品发布",
    description: "准备一场产品发布会或设计展示的演示文稿",
    thumbnail: "https://via.placeholder.com/300x200/EC4899/FFFFFF?text=Product+Launch",
    theme: "creative",
    colorScheme: "pink-purple",
    slideCount: 15,
    category: "创意",
    tags: ["设计", "创意", "产品"],
    createdAt: "2025-10-18T14:30:00Z",
  },
  {
    id: "prompt-003",
    name: "项目总结",
    description: "总结项目成果和经验的简约演示文稿",
    thumbnail: "https://via.placeholder.com/300x200/10B981/FFFFFF?text=Project+Summary",
    theme: "simple",
    colorScheme: "green-white",
    slideCount: 10,
    category: "简约",
    tags: ["简约", "清新", "通用"],
    createdAt: "2025-10-20T09:00:00Z",
  },
  {
    id: "prompt-004",
    name: "技术分享",
    description: "制作技术分享或产品介绍的演示文稿",
    thumbnail: "https://via.placeholder.com/300x200/3B82F6/FFFFFF?text=Tech+Talk",
    theme: "modern",
    colorScheme: "blue-dark",
    slideCount: 25,
    category: "科技",
    tags: ["科技", "现代", "技术"],
    createdAt: "2025-10-22T16:45:00Z",
  },
  {
    id: "prompt-005",
    name: "教育培训",
    description: "设计教育培训课程或讲座的演示文稿",
    thumbnail: "https://via.placeholder.com/300x200/F59E0B/FFFFFF?text=Education",
    theme: "simple",
    colorScheme: "orange-yellow",
    slideCount: 30,
    category: "教育",
    tags: ["教育", "培训", "课程"],
    createdAt: "2025-10-25T11:20:00Z",
  },

  // 消费金融专题
  {
    id: "prompt-cf-001",
    name: "消金年度报告",
    description: "制作一份消费金融公司年度经营报告，包括业务规模、资产质量、盈利能力等核心指标分析",
    thumbnail: "https://via.placeholder.com/300x200/8B5CF6/FFFFFF?text=Annual+Report",
    theme: "business",
    colorScheme: "purple-blue",
    slideCount: 25,
    category: "消费金融",
    tags: ["金融", "报告", "数据分析"],
    createdAt: "2025-10-26T10:00:00Z",
  },
  {
    id: "prompt-cf-002",
    name: "风险管理体系",
    description: "介绍消费金融公司的全面风险管理体系，涵盖信用风险、操作风险、流动性风险等多维度管控措施",
    thumbnail: "https://via.placeholder.com/300x200/EF4444/FFFFFF?text=Risk+Management",
    theme: "business",
    colorScheme: "red-gray",
    slideCount: 20,
    category: "消费金融",
    tags: ["风控", "合规", "管理"],
    createdAt: "2025-10-27T11:00:00Z",
  },
  {
    id: "prompt-cf-003",
    name: "信贷产品发布",
    description: "发布新的消费信贷产品，介绍产品特色、目标客群、额度利率、申请流程及竞争优势",
    thumbnail: "https://via.placeholder.com/300x200/06B6D4/FFFFFF?text=Credit+Product",
    theme: "creative",
    colorScheme: "cyan-blue",
    slideCount: 15,
    category: "消费金融",
    tags: ["产品", "信贷", "营销"],
    createdAt: "2025-10-28T09:30:00Z",
  },
  {
    id: "prompt-cf-004",
    name: "合规管理培训",
    description: "开展消费金融行业合规培训，解读监管政策、反洗钱要求、消费者权益保护等法律法规",
    thumbnail: "https://via.placeholder.com/300x200/059669/FFFFFF?text=Compliance",
    theme: "simple",
    colorScheme: "green-white",
    slideCount: 30,
    category: "消费金融",
    tags: ["培训", "合规", "法规"],
    createdAt: "2025-10-29T14:00:00Z",
  },
  {
    id: "prompt-cf-005",
    name: "数字化转型战略",
    description: "阐述消费金融公司的数字化转型战略，包括智能风控、线上获客、大数据应用等创新举措",
    thumbnail: "https://via.placeholder.com/300x200/7C3AED/FFFFFF?text=Digital+Transformation",
    theme: "modern",
    colorScheme: "purple-dark",
    slideCount: 20,
    category: "消费金融",
    tags: ["数字化", "科技", "创新"],
    createdAt: "2025-10-30T10:30:00Z",
  },
  {
    id: "prompt-cf-006",
    name: "资产质量分析",
    description: "深入分析消费金融资产质量，包括不良率、逾期率、拨备覆盖率、资产分层等关键指标",
    thumbnail: "https://via.placeholder.com/300x200/DC2626/FFFFFF?text=Asset+Quality",
    theme: "business",
    colorScheme: "red-blue",
    slideCount: 18,
    category: "消费金融",
    tags: ["资产", "质量", "分析"],
    createdAt: "2025-10-31T11:30:00Z",
  },
  {
    id: "prompt-cf-007",
    name: "客户服务优化",
    description: "提升消费金融客户服务质量，优化客户体验、投诉处理、满意度管理等服务流程",
    thumbnail: "https://via.placeholder.com/300x200/F97316/FFFFFF?text=Customer+Service",
    theme: "simple",
    colorScheme: "orange-white",
    slideCount: 16,
    category: "消费金融",
    tags: ["客服", "体验", "优化"],
    createdAt: "2025-11-01T09:00:00Z",
  },
  {
    id: "prompt-cf-008",
    name: "市场拓展计划",
    description: "制定消费金融业务市场拓展计划，分析目标市场、竞争格局、渠道策略及增长目标",
    thumbnail: "https://via.placeholder.com/300x200/0891B2/FFFFFF?text=Market+Expansion",
    theme: "business",
    colorScheme: "cyan-gray",
    slideCount: 22,
    category: "消费金融",
    tags: ["市场", "拓展", "战略"],
    createdAt: "2025-11-02T10:00:00Z",
  },
  {
    id: "prompt-cf-009",
    name: "反欺诈体系建设",
    description: "构建消费金融反欺诈体系，介绍欺诈识别技术、黑名单管理、设备指纹、生物识别等防控手段",
    thumbnail: "https://via.placeholder.com/300x200/BE123C/FFFFFF?text=Anti-Fraud",
    theme: "modern",
    colorScheme: "red-dark",
    slideCount: 20,
    category: "消费金融",
    tags: ["安全", "反欺诈", "技术"],
    createdAt: "2025-11-03T13:00:00Z",
  },
  {
    id: "prompt-cf-010",
    name: "智能催收策略",
    description: "设计智能化催收策略，运用AI外呼、分层管理、柔性催收等方式提升回收率并保护客户体验",
    thumbnail: "https://via.placeholder.com/300x200/0D9488/FFFFFF?text=Collection+Strategy",
    theme: "business",
    colorScheme: "teal-gray",
    slideCount: 18,
    category: "消费金融",
    tags: ["催收", "智能", "策略"],
    createdAt: "2025-11-04T14:30:00Z",
  },
];

// Mock OCR 识别结果数据
export const mockOCRResults: Record<string, OCRResult> = {
  normal: {
    id: "ocr-001",
    text: "这是一段通过 OCR 识别得到的文本内容。\n\n本文档包含了多行文字，识别效果良好。\n\n文字识别技术可以将图片中的文字转换为可编辑的文本格式，极大地提高了工作效率。",
    confidence: 0.95,
    processTime: 1200,
    mode: "normal",
    modelSize: "recommended",
    createdAt: "2025-11-13T10:30:00Z",
  },
  structured: {
    id: "ocr-002",
    text: `# 文档标题

## 第一章 概述

这是第一章的内容，包含了结构化的信息。

### 1.1 背景介绍

背景介绍的详细内容...

### 1.2 目标说明

- 目标 1：提高识别准确率
- 目标 2：优化处理速度
- 目标 3：支持多种文档格式

## 第二章 技术方案

技术方案的详细描述...`,
    confidence: 0.92,
    processTime: 2500,
    mode: "structured",
    modelSize: "recommended",
    createdAt: "2025-11-13T10:35:00Z",
  },
  custom: {
    id: "ocr-003",
    text: "自定义模式识别结果。\n\n本模式可以根据用户的特定需求进行定制化识别。\n\n支持特殊格式、特定字段的提取等高级功能。",
    confidence: 0.89,
    processTime: 3200,
    mode: "custom",
    modelSize: "large",
    createdAt: "2025-11-13T10:40:00Z",
  },
};

// Mock 天眼查企业数据
export const mockCompanyData: Record<string, CompanyInfo> = {
  "阿里巴巴": {
    id: "company-001",
    name: "阿里巴巴（中国）有限公司",
    legalRepresentative: "张勇",
    registeredCapital: "50000万人民币",
    establishDate: "1999-09-09",
    status: "active",
    creditCode: "91330100MA27XYZ123",
    registeredAddress: "浙江省杭州市余杭区文一西路969号",
    businessInfo: {
      companyType: "有限责任公司（外商投资企业投资）",
      operatingPeriod: "1999-09-09 至 无固定期限",
      registrationAuthority: "杭州市市场监督管理局",
      approvalDate: "2023-05-15",
      organizationCode: "MA27XYZ123",
    },
    shareholders: [
      {
        id: "sh-001",
        name: "软银集团",
        shareholdingRatio: "25.5%",
        subscribedCapital: "12750万人民币",
        paidInCapital: "12750万人民币",
      },
      {
        id: "sh-002",
        name: "雅虎公司",
        shareholdingRatio: "20.0%",
        subscribedCapital: "10000万人民币",
        paidInCapital: "10000万人民币",
      },
      {
        id: "sh-003",
        name: "马云",
        shareholdingRatio: "8.9%",
        subscribedCapital: "4450万人民币",
        paidInCapital: "4450万人民币",
      },
      {
        id: "sh-004",
        name: "蔡崇信",
        shareholdingRatio: "3.6%",
        subscribedCapital: "1800万人民币",
        paidInCapital: "1800万人民币",
      },
    ],
    changeRecords: [
      {
        id: "cr-001",
        changeDate: "2023-05-15",
        changeItem: "法定代表人",
        contentBefore: "张勇",
        contentAfter: "吴泳铭",
      },
      {
        id: "cr-002",
        changeDate: "2022-10-20",
        changeItem: "注册资本",
        contentBefore: "40000万人民币",
        contentAfter: "50000万人民币",
      },
      {
        id: "cr-003",
        changeDate: "2022-03-10",
        changeItem: "经营范围",
        contentBefore: "互联网信息服务",
        contentAfter: "互联网信息服务；技术开发、技术咨询；计算机软硬件开发",
      },
      {
        id: "cr-004",
        changeDate: "2021-08-15",
        changeItem: "注册地址",
        contentBefore: "浙江省杭州市余杭区文一西路900号",
        contentAfter: "浙江省杭州市余杭区文一西路969号",
      },
      {
        id: "cr-005",
        changeDate: "2020-12-01",
        changeItem: "董事成员",
        contentBefore: "张三、李四、王五",
        contentAfter: "张三、李四、王五、赵六",
      },
    ],
    businessScope:
      "互联网信息服务；第二类增值电信业务；技术开发、技术咨询、技术服务、技术转让；计算机软硬件的开发与销售；电子商务平台的开发与运营；数据处理和存储服务；云计算服务；人工智能技术的研发与应用；企业管理咨询；市场营销策划；广告设计、制作、代理、发布；会议会展服务；知识产权服务。（依法须经批准的项目，经相关部门批准后方可开展经营活动）",
  },
  "腾讯": {
    id: "company-002",
    name: "深圳市腾讯计算机系统有限公司",
    legalRepresentative: "马化腾",
    registeredCapital: "100000万人民币",
    establishDate: "1998-11-11",
    status: "active",
    creditCode: "91440300MA5D1ABC456",
    registeredAddress: "广东省深圳市南山区高新科技园南区科技园大厦",
    businessInfo: {
      companyType: "有限责任公司",
      operatingPeriod: "1998-11-11 至 无固定期限",
      registrationAuthority: "深圳市市场监督管理局",
      approvalDate: "2023-03-20",
      organizationCode: "MA5D1ABC456",
    },
    shareholders: [
      {
        id: "sh-101",
        name: "马化腾",
        shareholdingRatio: "10.2%",
        subscribedCapital: "10200万人民币",
        paidInCapital: "10200万人民币",
      },
      {
        id: "sh-102",
        name: "Naspers集团",
        shareholdingRatio: "31.5%",
        subscribedCapital: "31500万人民币",
        paidInCapital: "31500万人民币",
      },
      {
        id: "sh-103",
        name: "张志东",
        shareholdingRatio: "3.5%",
        subscribedCapital: "3500万人民币",
        paidInCapital: "3500万人民币",
      },
    ],
    changeRecords: [
      {
        id: "cr-101",
        changeDate: "2023-03-20",
        changeItem: "注册资本",
        contentBefore: "80000万人民币",
        contentAfter: "100000万人民币",
      },
      {
        id: "cr-102",
        changeDate: "2022-11-10",
        changeItem: "经营范围",
        contentBefore: "计算机软件开发",
        contentAfter: "计算机软件开发；互联网信息服务；游戏运营",
      },
      {
        id: "cr-103",
        changeDate: "2022-06-15",
        changeItem: "董事成员",
        contentBefore: "马化腾、刘炽平、张志东",
        contentAfter: "马化腾、刘炽平、张志东、任宇昕",
      },
      {
        id: "cr-104",
        changeDate: "2021-09-05",
        changeItem: "注册地址",
        contentBefore: "深圳市南山区高新科技园",
        contentAfter: "深圳市南山区高新科技园南区科技园大厦",
      },
    ],
    businessScope:
      "计算机软硬件的技术开发与销售；互联网信息服务；第二类增值电信业务；网络游戏的开发与运营；在线支付服务；云计算和大数据服务；人工智能技术研发；数字内容服务；广告业务；投资兴办实业；企业管理咨询；市场信息咨询；国内贸易；货物及技术进出口。（依法须经批准的项目，经相关部门批准后方可开展经营活动）",
  },
  "字节跳动": {
    id: "company-003",
    name: "北京字节跳动科技有限公司",
    legalRepresentative: "梁汝波",
    registeredCapital: "30000万人民币",
    establishDate: "2012-03-12",
    status: "active",
    creditCode: "91110108MA001DEF789",
    registeredAddress: "北京市海淀区知春路甲48号盈都大厦C座4层",
    businessInfo: {
      companyType: "有限责任公司（自然人投资或控股）",
      operatingPeriod: "2012-03-12 至 2042-03-11",
      registrationAuthority: "北京市海淀区市场监督管理局",
      approvalDate: "2023-08-10",
      organizationCode: "MA001DEF789",
    },
    shareholders: [
      {
        id: "sh-201",
        name: "张一鸣",
        shareholdingRatio: "20.0%",
        subscribedCapital: "6000万人民币",
        paidInCapital: "6000万人民币",
      },
      {
        id: "sh-202",
        name: "梁汝波",
        shareholdingRatio: "8.0%",
        subscribedCapital: "2400万人民币",
        paidInCapital: "2400万人民币",
      },
      {
        id: "sh-203",
        name: "红杉资本",
        shareholdingRatio: "15.0%",
        subscribedCapital: "4500万人民币",
        paidInCapital: "4500万人民币",
      },
      {
        id: "sh-204",
        name: "软银愿景基金",
        shareholdingRatio: "12.0%",
        subscribedCapital: "3600万人民币",
        paidInCapital: "3600万人民币",
      },
    ],
    changeRecords: [
      {
        id: "cr-201",
        changeDate: "2023-08-10",
        changeItem: "法定代表人",
        contentBefore: "张一鸣",
        contentAfter: "梁汝波",
      },
      {
        id: "cr-202",
        changeDate: "2023-01-15",
        changeItem: "注册资本",
        contentBefore: "20000万人民币",
        contentAfter: "30000万人民币",
      },
      {
        id: "cr-203",
        changeDate: "2022-07-20",
        changeItem: "经营范围",
        contentBefore: "技术开发、技术服务",
        contentAfter: "技术开发、技术服务；互联网信息服务；广告发布",
      },
      {
        id: "cr-204",
        changeDate: "2021-12-05",
        changeItem: "注册地址",
        contentBefore: "北京市海淀区知春路48号",
        contentAfter: "北京市海淀区知春路甲48号盈都大厦C座4层",
      },
      {
        id: "cr-205",
        changeDate: "2021-05-10",
        changeItem: "董事成员",
        contentBefore: "张一鸣、梁汝波、张利东",
        contentAfter: "梁汝波、张利东、杨震原",
      },
    ],
    businessScope:
      "技术开发、技术推广、技术转让、技术咨询、技术服务；软件开发；基础软件服务；应用软件服务；计算机系统服务；数据处理；互联网信息服务；设计、制作、代理、发布广告；组织文化艺术交流活动；会议服务；承办展览展示活动；企业管理；经济贸易咨询；企业策划；市场调查；公共关系服务；投资管理；资产管理。（市场主体依法自主选择经营项目，开展经营活动；互联网信息服务以及依法须经批准的项目，经相关部门批准后依批准的内容开展经营活动；不得从事国家和本市产业政策禁止和限制类项目的经营活动。）",
  },
};
