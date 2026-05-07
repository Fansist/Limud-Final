// Master demo account dataset. In-memory so demo mode works with zero
// database. Mirrors the brief's exact example: French Revolution unit,
// three students with three pre-baked personalizations.

import type { Role } from "@prisma/client";
import type { StudentProfile } from "@/lib/types";

export type DemoStudent = StudentProfile & {
  avatarHue: number;
  // Pretend mastery summary for the demo dashboards.
  masteryByTopic: Array<{ topic: string; mastery: number; trend: "up" | "flat" | "down" }>;
  // Per-course grades for trend charts.
  grades: Array<{ course: string; grade: number; trend: "improving" | "steady" | "slipping" }>;
  flags: Array<{ severity: "info" | "warn" | "alert"; text: string }>;
};

export type DemoUnit = {
  id: string;
  classroomId: string;
  title: string;
  description: string;
  topicTags: string[];
  dueAt: string;
  publishedAt: string;
  assignment: {
    bodyHtml: string;
    rubric: Array<{ name: string; weight: number; description: string }>;
    pointsTotal: number;
  };
  material: {
    sourceHtml: string;
    sourceLexile: number;
    objectives: string[];
    // demo key used by personalize() to short-circuit to a pre-baked render
    demoKey: string;
  };
};

export type DemoClassroom = {
  id: string;
  name: string;
  subject: string;
  gradeLevel: number;
  studentIds: string[];
  unitIds: string[];
};

export type DemoTeacher = {
  id: string;
  userId: string;
  name: string;
  classroomIds: string[];
};

export type DemoParent = {
  id: string;
  userId: string;
  name: string;
  childIds: string[];
};

export const DEMO_DISTRICT_ID = "demo-district-1";
export const DEMO_TEACHER: DemoTeacher = {
  id: "demo-teacher-1",
  userId: "demo-user-teacher",
  name: "Ms. Alvarez",
  classroomIds: ["demo-classroom-1"]
};

export const DEMO_PARENT: DemoParent = {
  id: "demo-parent-1",
  userId: "demo-user-parent",
  name: "Mr. Chen",
  childIds: ["demo-student-maya"]
};

export const DEMO_STUDENTS: DemoStudent[] = [
  {
    studentId: "demo-student-maya",
    name: "Maya",
    gradeLevel: 8,
    lexile: 1010,
    language: "en",
    learningStyles: ["visual"],
    interests: ["Marvel comics", "graphic novels", "manga", "drawing"],
    avatarHue: 280,
    masteryByTopic: [
      { topic: "French Revolution causes", mastery: 0.62, trend: "up" },
      { topic: "Estates-General", mastery: 0.45, trend: "up" },
      { topic: "Reign of Terror", mastery: 0.28, trend: "flat" },
      { topic: "Algebra: linear equations", mastery: 0.71, trend: "flat" }
    ],
    grades: [
      { course: "World History", grade: 86, trend: "improving" },
      { course: "Algebra I", grade: 91, trend: "steady" },
      { course: "English", grade: 88, trend: "improving" }
    ],
    flags: [
      { severity: "info", text: "Engagement up 22% since switching to visual material." }
    ]
  },
  {
    studentId: "demo-student-diego",
    name: "Diego",
    gradeLevel: 8,
    lexile: 940,
    language: "en",
    learningStyles: ["auditory"],
    interests: ["hip-hop", "rap lyricism", "basketball", "podcasts"],
    avatarHue: 30,
    masteryByTopic: [
      { topic: "French Revolution causes", mastery: 0.55, trend: "up" },
      { topic: "Estates-General", mastery: 0.40, trend: "up" },
      { topic: "Reign of Terror", mastery: 0.22, trend: "flat" },
      { topic: "Algebra: linear equations", mastery: 0.58, trend: "flat" }
    ],
    grades: [
      { course: "World History", grade: 79, trend: "improving" },
      { course: "Algebra I", grade: 74, trend: "steady" },
      { course: "English", grade: 82, trend: "steady" }
    ],
    flags: [
      { severity: "warn", text: "Re-read the same paragraph 3 times last session — possible reading barrier." }
    ]
  },
  {
    studentId: "demo-student-priya",
    name: "Priya",
    gradeLevel: 8,
    lexile: 1080,
    language: "en",
    learningStyles: ["kinesthetic"],
    interests: ["baking", "cooking shows", "soccer", "robotics"],
    avatarHue: 150,
    masteryByTopic: [
      { topic: "French Revolution causes", mastery: 0.78, trend: "up" },
      { topic: "Estates-General", mastery: 0.66, trend: "up" },
      { topic: "Reign of Terror", mastery: 0.51, trend: "up" },
      { topic: "Algebra: linear equations", mastery: 0.84, trend: "flat" }
    ],
    grades: [
      { course: "World History", grade: 93, trend: "improving" },
      { course: "Algebra I", grade: 96, trend: "steady" },
      { course: "English", grade: 90, trend: "steady" }
    ],
    flags: []
  }
];

export const DEMO_CLASSROOM: DemoClassroom = {
  id: "demo-classroom-1",
  name: "Period 3 — World History",
  subject: "World History",
  gradeLevel: 8,
  studentIds: DEMO_STUDENTS.map((s) => s.studentId),
  unitIds: ["demo-unit-frev"]
};

const FRENCH_REVOLUTION_OBJECTIVES = [
  "Identify the three Estates of pre-revolutionary France and the inequities between them.",
  "Explain the financial, political, and social causes of the French Revolution.",
  "Sequence the key events from the Estates-General (1789) to the Reign of Terror (1793–1794).",
  "Define and use the terms: Old Regime, Bastille, Tennis Court Oath, Sans-culottes, Jacobins, Guillotine.",
  "Evaluate how revolutionary ideals (liberty, equality, fraternity) translated — and failed to translate — into policy."
];

const FRENCH_REVOLUTION_SOURCE_HTML = `
<h2>The French Revolution: 1789–1799</h2>
<p>By the late 1780s, France was in crisis. King Louis XVI presided over an
"Old Regime" society divided into three Estates: the clergy (First Estate),
the nobility (Second Estate), and everyone else — about 97% of the
population — as the Third Estate. The first two paid almost no taxes; the
Third paid almost everything.</p>
<p>Repeated wars and palace spending had emptied the treasury. In May 1789,
desperate for tax reform, Louis convened the Estates-General at Versailles
for the first time since 1614. The Third Estate, locked out of the
chamber, gathered in a nearby tennis court and swore not to disperse
until France had a written constitution. This is the Tennis Court Oath.</p>
<p>On July 14, 1789, a Parisian crowd stormed the Bastille fortress in
search of gunpowder. The fall of the Bastille became the symbolic start
of the Revolution. The National Assembly abolished feudal privileges and
issued the Declaration of the Rights of Man and Citizen — liberty,
property, security, and resistance to oppression.</p>
<p>Radicalization followed. In 1792 France declared a republic. In 1793
the king was executed. The Jacobin-led Committee of Public Safety,
under Maximilien Robespierre, launched the Reign of Terror — 16,000
official executions by guillotine, tens of thousands more dead from
conditions and unofficial violence — to defend the Revolution from
internal and external enemies. Terror ended when Robespierre himself was
guillotined in July 1794.</p>
<p>The Revolution did not bring stable democracy. It did permanently end
the Old Regime, plant the language of universal rights into modern
politics, and make Napoleon Bonaparte's rise possible.</p>
`;

const ASSIGNMENT_BODY_HTML = `
<h2>French Revolution — Unit Assessment</h2>
<p>Answer all four questions. Write in complete sentences. Cite at least
one specific date or named figure in each answer.</p>
<ol>
  <li><strong>Causes (25 pts).</strong> Explain three causes of the
  French Revolution: one financial, one political, one social. Make
  clear which is which.</li>
  <li><strong>Sequence (25 pts).</strong> List, in order, five key
  events between May 1789 and July 1794, with dates.</li>
  <li><strong>Vocabulary (25 pts).</strong> Define in your own words:
  Old Regime, Tennis Court Oath, Jacobins, Sans-culottes, Reign of
  Terror.</li>
  <li><strong>Evaluation (25 pts).</strong> The Revolution's slogan was
  "liberty, equality, fraternity." Argue, with evidence from the unit,
  whether the Reign of Terror honored or betrayed that slogan.</li>
</ol>
`;

const ASSIGNMENT_RUBRIC = [
  {
    name: "Historical accuracy",
    weight: 40,
    description:
      "Dates, names, and sequences match the unit. No invented facts."
  },
  {
    name: "Use of vocabulary",
    weight: 25,
    description:
      "Each required term used correctly in context, not just defined in isolation."
  },
  {
    name: "Argument quality (Q4)",
    weight: 25,
    description:
      "Position is stated, supported by at least two specific events, and considers a counter-point."
  },
  {
    name: "Mechanics",
    weight: 10,
    description:
      "Complete sentences, proper proper-noun capitalization, paragraph breaks where appropriate."
  }
];

// ---- The pre-baked personalized renders. ----
// These are the demo proof of the spine: same objectives, same vocab,
// same dates — three radically different presentations.

const RENDER_MAYA_VISUAL_COMIC = `
<aside class="ai-personalized" data-style="visual" data-interest="marvel comics">
  <strong>Made for Maya — visual / comic-book treatment.</strong>
  <span class="muted"> Same objectives, same dates, same vocab as the source.</span>
</aside>

<h2>The French Revolution — Issue #1: "Three Estates, One Powder Keg"</h2>

<figure class="panel">
  <strong>PANEL 1 — Splash page, top of cover.</strong>
  <p>Three figures stand on a tilted scale. On one tiny side: a clergyman
  in robes (FIRST ESTATE) and a noble in a powdered wig (SECOND ESTATE),
  smiling, arms crossed. On the other side, sagging under the weight: a
  baker, a seamstress, a farmer, a printer's apprentice, a market
  woman — the THIRD ESTATE — about <em>97 out of every 100 people in
  France</em>. The first two pay almost no taxes. The third pays almost
  everything. This is the <strong>Old Regime</strong>.</p>
</figure>

<figure class="panel">
  <strong>PANEL 2 — Wide shot, the royal palace at Versailles, May 1789.</strong>
  <p>King Louis XVI, sweat on his brow, summons the <strong>Estates-General</strong>.
  Speech bubble: "Help me. The treasury is empty." It hasn't met since
  1614. Caption box: <em>Cause #1 — financial. Wars and palace spending
  have bankrupted the kingdom.</em></p>
</figure>

<figure class="panel">
  <strong>PANEL 3 — Close-up, indoor tennis court, June 1789.</strong>
  <p>The Third Estate has been locked out of the meeting hall. They
  crowd into a tennis court. Right hands raised. Speech balloon, in
  unison: "We will not disperse until France has a constitution." This
  is the <strong>Tennis Court Oath</strong>.</p>
</figure>

<figure class="panel">
  <strong>PANEL 4 — Action splash, Paris, July 14, 1789.</strong>
  <p>A Parisian crowd storms the <strong>Bastille</strong> fortress
  searching for gunpowder. Smoke. Banners. Caption: <em>The symbolic
  start of the Revolution.</em> Inset: the National Assembly later
  abolishes feudal privileges and issues the <strong>Declaration of the
  Rights of Man and Citizen</strong> — liberty, property, security,
  resistance to oppression.</p>
</figure>

<figure class="panel">
  <strong>PANEL 5 — Hard cut to 1792–1794. Color shifts to red.</strong>
  <p>France declares a republic (1792). The king is executed (1793). A
  new figure steps to the front: <strong>Maximilien Robespierre</strong>
  of the <strong>Jacobins</strong>, leading the Committee of Public
  Safety. The street fighters in red caps — the
  <strong>Sans-culottes</strong> — back him up. The
  <strong>Reign of Terror</strong> begins: 16,000 official executions
  by guillotine, tens of thousands more dead from conditions and mob
  violence.</p>
</figure>

<figure class="panel">
  <strong>PANEL 6 — Final panel, Robespierre's silhouette under the blade, July 1794.</strong>
  <p>The Terror eats its own. Robespierre is guillotined. Caption:
  <em>The Old Regime is dead. Stable democracy is not yet born. The
  language of universal rights is now permanent. Napoleon is waiting in
  the wings.</em></p>
</figure>

<h3>What you should now be able to do</h3>
<ul>
  <li>Name the three Estates and explain why the Third was furious.</li>
  <li>Tell a friend, in order, what happened from May 1789 to July 1794.</li>
  <li>Use the words <em>Old Regime, Bastille, Tennis Court Oath,
  Sans-culottes, Jacobins, Guillotine</em> in a sentence each.</li>
  <li>Argue whether the Terror honored or betrayed
  "liberty, equality, fraternity."</li>
</ul>
`;

const RENDER_DIEGO_AUDITORY_RAP = `
<aside class="ai-personalized" data-style="auditory" data-interest="hip-hop">
  <strong>Made for Diego — auditory / lyrical breakdown.</strong>
  <span class="muted"> Read it aloud. The rhythm is the point. Same objectives, same dates, same vocab as the source.</span>
</aside>

<h2>"Three Estates" — a French Revolution rap, in four verses</h2>

<h3>Verse 1 — The Setup (Old Regime)</h3>
<p style="font-style:italic">
Seventeen-eighty-nine, France is on the brink, /<br>
King Louis Sixteen and the treasury sinks. /<br>
Three Estates stacked, but the math don't add: /<br>
First Estate clergy, robes and a Bible pad, /<br>
Second Estate nobles, powdered wigs and a crest — /<br>
Pay almost nothing, sit pretty, get blessed. /<br>
Third Estate? Ninety-seven out of a hundred — /<br>
Bakers, farmers, printers, paying every coin plundered. /<br>
That's the Old Regime, that's the powder in the keg. /<br>
Wars and Versailles emptied every barrel and peg.
</p>

<h3>Verse 2 — Estates-General to Bastille (May–July 1789)</h3>
<p style="font-style:italic">
May, eighty-nine, Louis call the Estates-General — /<br>
First time since sixteen-fourteen, ceremonial. /<br>
Third Estate locked out, walk it to a tennis court, /<br>
Hands up high, sworn an oath — short report: /<br>
"Won't disperse till France has a constitution wrote." /<br>
That's the Tennis Court Oath, history quote. /<br>
Then July fourteen: Paris crowds storm the Bastille, /<br>
Hunting gunpowder, breaking the steel — /<br>
National Assembly drops the feudal chain, /<br>
Declaration of the Rights of Man and Citizen, plain: /<br>
Liberty, property, security, resistance — /<br>
Old Regime done, no more pretendin'.
</p>

<h3>Verse 3 — Republic and Terror (1792–1794)</h3>
<p style="font-style:italic">
Seventeen-ninety-two, the Republic declared, /<br>
Seventeen-ninety-three, the king's head impaired. /<br>
Enter Robespierre, lead the Jacobin pack, /<br>
Committee of Public Safety, no looking back. /<br>
Sans-culottes in the streets, red cap, no breeches, /<br>
Backing the Committee with the slogans they preaches. /<br>
Reign of Terror: sixteen-thousand official, /<br>
Tens of thousands more dead, that ain't artificial. /<br>
The Guillotine drops, day after day, /<br>
Defending the Revolution, that's what they say.
</p>

<h3>Verse 4 — The Hook Comes Back (July 1794)</h3>
<p style="font-style:italic">
July, seventeen-ninety-four — Terror eats its own, /<br>
Robespierre under the blade, on the same throne. /<br>
Old Regime? Dead. Democracy? Not yet here. /<br>
Universal rights in the language — that's clear. /<br>
Napoleon's in the wings, polishing his boots. /<br>
Liberty, equality, fraternity — check the receipts. /<br>
Did Terror honor the slogan, or did Terror betray it? /<br>
That's your essay question. Now you say it.
</p>

<h3>What you should now be able to do</h3>
<ul>
  <li>Recite, in order, what happened from May 1789 to July 1794.</li>
  <li>Name the three Estates and explain the inequity.</li>
  <li>Use the words <em>Old Regime, Bastille, Tennis Court Oath,
  Sans-culottes, Jacobins, Guillotine</em> in a sentence each.</li>
  <li>Argue whether the Terror honored or betrayed
  "liberty, equality, fraternity."</li>
</ul>
`;

const RENDER_PRIYA_KINESTHETIC_KITCHEN = `
<aside class="ai-personalized" data-style="kinesthetic" data-interest="cooking">
  <strong>Made for Priya — kinesthetic / kitchen-revolution metaphor.</strong>
  <span class="muted"> Same objectives, same dates, same vocab as the source — but as a recipe you can feel in your hands.</span>
</aside>

<h2>The French Revolution: A Recipe in Five Steps</h2>
<p><em>Cook time: 1789–1794. Serves: a country of 28 million.</em></p>

<h3>Step 1 — Mise en place: the Old Regime ingredients</h3>
<p>You're stocking a pantry that's about to fail you. On the top shelf:
the <strong>First Estate</strong> (clergy) — pretty jars, almost weightless,
no tax. Just below: the <strong>Second Estate</strong> (nobility) — heavy
crystal, also tax-free, also barely contributing to dinner. On the
bottom shelf, holding everything up: the <strong>Third Estate</strong> —
about 97 out of every 100 jars, paying nearly all the kitchen rent.
Years of war and palace spending have emptied the cash drawer. The
shelves are about to crack.</p>

<h3>Step 2 — Heat it up: Estates-General &amp; the Tennis Court Oath (May–June 1789)</h3>
<p>You finally turn the burner on. King Louis XVI calls the
<strong>Estates-General</strong> at Versailles — the first time the
recipe has been opened since 1614. The Third Estate gets locked out of
the kitchen. They walk next door to a tennis court (yes, an indoor
one) and swear, with their hands on the cutting board, not to leave
until France has a written constitution. This is the
<strong>Tennis Court Oath</strong>. The dough is rising.</p>

<h3>Step 3 — Sear it: storming the Bastille (July 14, 1789)</h3>
<p>July 14, 1789. A Parisian crowd, hungry and out of patience, storms
the <strong>Bastille</strong> fortress in search of gunpowder. This is
the moment your pan hits the flame and the smoke goes up. The
National Assembly abolishes feudal privileges and writes the
<strong>Declaration of the Rights of Man and Citizen</strong> —
liberty, property, security, resistance to oppression. Take this as
the base flavor of every dish that follows in modern politics.</p>

<h3>Step 4 — Reduce, hard: Republic &amp; the Reign of Terror (1792–1794)</h3>
<p>Now you're reducing the sauce too far. France declares a Republic
(1792). The king is executed (1793). <strong>Maximilien Robespierre</strong>
of the <strong>Jacobins</strong> takes the spoon, with the
<strong>Sans-culottes</strong> (the street cooks in red caps) crowded
around the stove. The Committee of Public Safety launches the
<strong>Reign of Terror</strong>: 16,000 official executions by
<strong>guillotine</strong>, tens of thousands more dead. The pan is
black. Anything that even <em>looks</em> burnt gets scraped out — and
sometimes the cook scrapes out things that weren't burnt at all.</p>

<h3>Step 5 — Plate it: Thermidor (July 1794)</h3>
<p>The Terror eats its own. Robespierre is guillotined in July 1794.
You take the pan off the heat. The Old Regime, the original recipe, is
gone forever — that part is done. Stable democracy is not yet on the
plate. But the language of universal rights is permanently in the
pantry, and a young general named Napoleon is washing his hands at the
sink, ready to take over the kitchen.</p>

<h3>What you should now be able to do</h3>
<ul>
  <li>Name the three Estates and explain the inequity.</li>
  <li>Sequence — in order — what happened from May 1789 to July 1794.</li>
  <li>Use the words <em>Old Regime, Bastille, Tennis Court Oath,
  Sans-culottes, Jacobins, Guillotine</em> in a sentence each.</li>
  <li>Argue whether the Terror honored or betrayed
  "liberty, equality, fraternity."</li>
</ul>
`;

export const DEMO_UNITS: DemoUnit[] = [
  {
    id: "demo-unit-frev",
    classroomId: "demo-classroom-1",
    title: "The French Revolution (1789–1799)",
    description:
      "Causes, key events, vocabulary, and the lasting consequences of the French Revolution. Same assessment for everyone — the reading is personalized.",
    topicTags: ["world-history", "french-revolution", "1789", "old-regime"],
    dueAt: "2026-05-21T23:59:00.000Z",
    publishedAt: "2026-05-01T08:00:00.000Z",
    assignment: {
      bodyHtml: ASSIGNMENT_BODY_HTML,
      rubric: ASSIGNMENT_RUBRIC,
      pointsTotal: 100
    },
    material: {
      sourceHtml: FRENCH_REVOLUTION_SOURCE_HTML,
      sourceLexile: 1100,
      objectives: FRENCH_REVOLUTION_OBJECTIVES,
      demoKey: "french-revolution"
    }
  }
];

const DEMO_RENDER_TABLE: Record<string, Record<string, string>> = {
  "french-revolution": {
    "demo-student-maya": RENDER_MAYA_VISUAL_COMIC,
    "demo-student-diego": RENDER_DIEGO_AUDITORY_RAP,
    "demo-student-priya": RENDER_PRIYA_KINESTHETIC_KITCHEN
  }
};

export function findDemoRender(
  demoMaterialKey: string,
  studentId: string
): string | null {
  return DEMO_RENDER_TABLE[demoMaterialKey]?.[studentId] ?? null;
}

export function findDemoStudent(studentId: string): DemoStudent | null {
  return DEMO_STUDENTS.find((s) => s.studentId === studentId) ?? null;
}

export function findDemoUnit(unitId: string): DemoUnit | null {
  return DEMO_UNITS.find((u) => u.id === unitId) ?? null;
}

// Demo "users" for each role. The cookie value `ROLE` (or `ROLE:studentId`
// for the STUDENT role to choose which kid) selects one of these.
export const DEMO_ROLES: Record<
  Role,
  { name: string; defaultStudentId?: string }
> = {
  STUDENT: { name: "Maya (demo)", defaultStudentId: "demo-student-maya" },
  TEACHER: { name: "Ms. Alvarez (demo)" },
  PARENT: { name: "Mr. Chen (demo)" },
  DISTRICT_ADMIN: { name: "Dr. Patel (demo)" },
  SELF_ED: { name: "Homeschool family (demo)" },
  DEMO: { name: "Limud demo walkthrough" }
};
