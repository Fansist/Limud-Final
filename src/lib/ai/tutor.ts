// AI tutor. Socratic by default — never gives the answer outright; asks
// the student to articulate their thinking. Direct mode hands over the
// worked solution when the student explicitly asks. On AI failure we
// return a polite "tutor offline" message so the UI can render the
// offline indicator. We never fake a tutor reply.

import type { AIResult, TutorMessage } from "@/lib/types";
import { callGemini } from "@/lib/ai/gemini";

const SYSTEM_SOCRATIC = `You are Limud's tutor. Talk like a patient older
sibling. Default to the Socratic method: ask one focused question at a
time, build on the student's prior answer, and only state a fact when
the student has tried and is stuck. Never give the final answer to a
homework question unless the student explicitly says "just tell me" or
the teacher has set DIRECT mode. Keep replies short — two to four
sentences. Never shame, never sigh. Always end your turn with either a
question or an actionable next step.`;

const SYSTEM_DIRECT = `You are Limud's tutor in DIRECT mode. The student
has asked for the worked answer. Give a complete, step-by-step
solution. Show your reasoning at each step. Then, after the answer,
give one short follow-up question that lets the student check whether
they could now solve a similar problem on their own.`;

export type TutorReply = AIResult<string>;

export async function tutorReply(args: {
  mode: "SOCRATIC" | "DIRECT";
  transcript: TutorMessage[];
  unitContext?: string;
}): Promise<TutorReply> {
  const sys = args.mode === "DIRECT" ? SYSTEM_DIRECT : SYSTEM_SOCRATIC;
  const ctx = args.unitContext
    ? `UNIT CONTEXT (for grounding only, do not paste into chat):\n${args.unitContext}\n\n`
    : "";
  const lines = args.transcript.map((m) =>
    m.role === "student" ? `STUDENT: ${m.content}` : `TUTOR: ${m.content}`
  );
  const prompt = `${ctx}CONVERSATION SO FAR:\n${lines.join(
    "\n"
  )}\n\nTUTOR (your reply):`;
  const res = await callGemini({ systemInstruction: sys, prompt });
  if (res.offline) {
    return {
      data:
        "I can't reach the tutor service right now, but I don't want to give you a fake answer. Please try again in a moment — or jump back to your material and re-read the section you were stuck on.",
      modelUsed: "",
      offline: true,
      reason: res.reason
    };
  }
  return res;
}
