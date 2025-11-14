// 用户类型
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

// Todo 待办事项类型
export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: string; // ISO 8601 date string
  createdAt: string;
  userId: string;
}

// 公告类型
export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: "high" | "medium" | "low";
  publishedAt: string;
  type?: "info" | "warning" | "success" | "error";
}

// PPT 模板类型
export interface PPTTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  theme: "business" | "creative" | "simple" | "modern";
  colorScheme: string;
  slideCount: number;
  category: string;
  tags: string[];
  createdAt: string;
}

// PPT 创建设置类型
export interface PPTSettings {
  slideCount: 5 | 10 | 15 | 20 | 30;
  language: "zh" | "en" | "ja" | "ko";
  theme?: string;
  colorScheme?: string;
  fontSize?: "small" | "medium" | "large";
}

// OCR 识别结果类型
export interface OCRResult {
  id: string;
  text: string;
  confidence: number;
  processTime: number; // 毫秒
  imageUrl?: string;
  mode: "normal" | "structured" | "custom";
  modelSize: "mini" | "small" | "base" | "large" | "recommended";
  createdAt: string;
}

// OCR 设置类型
export interface OCRSettings {
  mode: "normal" | "structured" | "custom";
  modelSize: "mini" | "small" | "base" | "large" | "recommended";
}

// 企业信息类型
export interface CompanyInfo {
  id: string;
  name: string;
  legalRepresentative: string; // 法人代表
  registeredCapital: string; // 注册资本
  establishDate: string; // 成立日期
  status: "active" | "cancelled" | "revoked"; // 在业、注销、吊销
  creditCode: string; // 统一社会信用代码
  registeredAddress: string; // 注册地址
  businessInfo: CompanyBusinessInfo;
  shareholders: Shareholder[];
  changeRecords: ChangeRecord[];
  businessScope: string; // 经营范围
}

// 企业工商信息类型
export interface CompanyBusinessInfo {
  companyType: string; // 企业类型
  operatingPeriod: string; // 营业期限
  registrationAuthority: string; // 登记机关
  approvalDate: string; // 核准日期
  organizationCode: string; // 组织机构代码
}

// 股东信息类型
export interface Shareholder {
  id: string;
  name: string;
  shareholdingRatio: string; // 持股比例
  subscribedCapital: string; // 认缴出资额
  paidInCapital: string; // 实缴出资额
}

// 变更记录类型
export interface ChangeRecord {
  id: string;
  changeDate: string;
  changeItem: string; // 变更项目
  contentBefore: string; // 变更前内容
  contentAfter: string; // 变更后内容
}

// 尽调报告类型
export interface DueDiligenceReport {
  id: string;
  companyId: string;
  companyName: string;
  generatedAt: string;
  summary: string;
  riskLevel: "low" | "medium" | "high";
  sections: {
    basicInfo: boolean;
    financialInfo: boolean;
    shareholding: boolean;
    litigation: boolean;
    personnel: boolean;
  };
}
