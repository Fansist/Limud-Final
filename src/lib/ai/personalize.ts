// Personalize a Material per student. The output is HTML the student
// will read. The prompt PRESERVES the learning objectives; only the
// presentation changes (style, examples, reading level, language).
// On AI failure we return the source material wrapped with an offline
// banner — never a fabricated personalization.

import type { PersonalizedRender, StudentProfile } from "@/lib/types";
import { callGemini } from "@/lib/ai/gemini";
import { findDemoRender } from "@/lib/demo/data";

const SYSTEM = `You are Limud's personalization engine. You rewrite K-12
teaching material for one specific student so it matches HOW they learn
and WHAT they care about, while preserving every learning objective
exactly. You never change the assessment, only the explanation.

Output rules:
- Return semantic HTML only. No <html>/<head>/<body> wrappers.
- Use <h2> for sections, <p> for prose, <ul>/<ol> for lists, <figure>
  for callouts, <aside class="example"> for worked examples.
- Keep the SAME key facts, dates, definitions, and vocabulary terms as
  the source. The student must learn the same content.
- Re-render in the student's primary modality. For visual learners,
  describe visuals the reader can mentally picture and use diagrammatic
  lists. For auditory, use rhythm/dialog/call-and-response. For
  kinesthetic, use step-by-step physical metaphors. For
  reading/writing, dense prose with strong topic sentences. For
  social, framed as conversation or debate. For solitary, framed as
  quiet reflection. For logical, framed as a chain of premises.
- Lean on the student's interests for analogies — but the analogy must
  serve the concept, never replace it.
- Match the student's reading level (Lexile). Lower Lexile means
  shorter sentences and simpler vocabulary outside the technical terms
  the unit is teaching.
- Translate naturally if the student's primary language is not English.
- End with a short "What you should now be able to do" recap
  enumerating the unit's objectives in the student's own framing.`;

function buildPrompt(args: {
  sourceHtml: string;
  objectives: string[];
  profile: StudentProfile;
}): string {
  return [
    "STUDENT PROFILE",
    `- Name: ${args.profile.name}`,
    `- Grade: ${args.profile.gradeLevel}`,
    `- Lexile: ${args.profile.lexile || "unknown"}`,
    `- Primary language: ${args.profile.language}`,
    `- Learning styles: ${args.profile.learningStyles.join(", ")}`,
    `- Interests: ${args.profile.interests.join(", ") || "(none stated)"}`,
    "",
    "LEARNING OBJECTIVES (must be preserved in the rewrite)",
    ...args.objectives.map((o, i) => `${i + 1}. ${o}`),
    "",
    "SOURCE MATERIAL (rewrite this for the student above)",
    args.sourceHtml
  ].join("\n");
}

export function profileHash(p: StudentProfile): string {
  const stable = JSON.stringify({
    g: p.gradeLevel,
    lx: p.lexile,
    lg: p.language,
    s: [...p.learningStyles].sort(),
    i: [...p.interests].sort()
  });
  // Cheap stable hash. We don't need crypto strength here, just stability.
  let h = 5381;
  for (let i = 0; i < stable.length; i++) {
    h = ((h << 5) + h + stable.charCodeAt(i)) | 0;
  }
  return `p_${(h >>> 0).toString(36)}`;
}

export async function personalizeMaterial(args: {
  sourceHtml: string;
  objectives: string[];
  profile: StudentProfile;
  // Demo materials short-circuit to a pre-baked render so the master
  // demo account always works with zero AI / zero DB.
  demoMaterialKey?: string;
}): Promise<PersonalizedRender> {
  if (args.demoMaterialKey) {
    const demo = findDemoRender(args.demoMaterialKey, args.profile.studentId);
    if (demo) {
      return { html: demo, modelUsed: "demo", offline: true };
    }
  }
  const prompt = buildPrompt({
    sourceHtml: args.sourceHtml,
    objectives: args.objectives,
    profile: args.profile
  });
  const res = await callGemini({ systemInstruction: SYSTEM, prompt });
  if (res.offline) {
    return {
      html: offlineFallbackHtml(args.sourceHtml, args.profile),
      modelUsed: "",
      offline: true
    };
  }
  return { html: res.data, modelUsed: res.modelUsed, offline: false };
}

function offlineFallbackHtml(sourceHtml: string, profile: StudentProfile): string {
  return [
    `<aside class="ai-offline-notice" data-offline="true">`,
    `<strong>AI offline.</strong> Limud could not personalize this `,
    `material right now. You're seeing the original source content. `,
    `Personalization for ${escapeHtml(profile.name)} (`,
    `${escapeHtml(profile.learningStyles.join(", "))}) will resume when `,
    `the AI service is back.`,
    `</aside>`,
    sourceHtml
  ].join("");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
