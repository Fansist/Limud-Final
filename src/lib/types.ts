import type { Role } from "@prisma/client";

export type Viewer =
  | { kind: "demo"; role: Role; name: string; demoStudentId?: string }
  | { kind: "user"; userId: string; role: Role; email: string; name: string | null };

export type StudentProfile = {
  studentId: string;
  name: string;
  gradeLevel: number;
  lexile: number;
  language: string;
  learningStyles: string[];
  interests: string[];
};

export type AIResult<T> = {
  data: T;
  modelUsed: string;
  offline: boolean;
  reason?: string;
};

export type PersonalizedRender = {
  html: string;
  modelUsed: string;
  offline: boolean;
};

export type TutorMessage = {
  role: "student" | "tutor";
  content: string;
  ts: string;
};
