import type { ProjectKind, ProjectStatus, TaskStatus, TaskPriority } from "@prisma/client";

export const PROJECT_KIND_LABELS: Record<ProjectKind, string> = {
  NACHAT: "نشاط",
  MACHROO3: "مشروع",
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  ACTIVE: "نشط",
  COMPLETED: "منجز",
  CANCELLED: "ملغى",
};

export const PROJECT_STATUS_VARIANT: Record<ProjectStatus, "default" | "secondary" | "outline"> = {
  ACTIVE: "default",
  COMPLETED: "secondary",
  CANCELLED: "outline",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "للقيام",
  IN_PROGRESS: "قيد التنفيذ",
  BLOCKED: "موقوفة",
  DONE: "منجزة",
  CANCELLED: "ملغاة",
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  TODO: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  IN_PROGRESS: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  BLOCKED: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  DONE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  CANCELLED: "bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "منخفضة",
  MEDIUM: "متوسطة",
  HIGH: "عالية",
  URGENT: "عاجلة",
};

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: "text-slate-500",
  MEDIUM: "text-blue-600",
  HIGH: "text-orange-600",
  URGENT: "text-red-600",
};

export const TASK_STATUS_ORDER: TaskStatus[] = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"];
