// AI-drafted feedback for teacher review. Output is a draft only —
// the teacher edits and signs off. Never auto-sent to students.

import type { AIResult } from "@/lib/types";
import { callGemini } from "@/lib/ai/gemini";

const SYSTEM = `You are Limud drafting feedback for a teacher. The
teacher will review and edit before the student sees it. Be specific,
warm, and forward-looking. Reference exact lines from the student's
submission. Praise concrete strengths. Identify the single most
important next step. Keep it under 120 words. Never assign a grade in
the text — the teacher controls the grade.`;

export type FeedbackDraft = AIResult<string>;

export async function draftFeedback(args: {
  rubricJson: string;
  assignmentBody: string;
  submissionBody: string;
  studentFirstName: string;
}): Promise<FeedbackDraft> {
  const prompt = [
    `STUDENT FIRST NAME: ${args.studentFirstName}`,
    "",
    "RUBRIC (JSON):",
    args.rubricJson,
    "",
    "ASSIGNMENT (what the student was asked to do):",
    args.assignmentBody,
    "",
    "STUDENT SUBMISSION:",
    args.submissionBody,
    "",
    "Draft the feedback now."
  ].join("\n");
  const res = await callGemini({ systemInstruction: SYSTEM, prompt });
  if (res.offline) {
    return {
      data:
        "[AI offline] Draft unavailable right now. Please write feedback manually or retry later — Limud will not auto-generate fake feedback.",
      modelUsed: "",
      offline: true,
      reason: res.reason
    };
  }
  return res;
}
