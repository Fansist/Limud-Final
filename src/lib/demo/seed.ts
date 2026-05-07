// Optional: seed the demo dataset into a real database for users who
// want to play with persistence. Demo mode does NOT require this — the
// in-memory data in ./data.ts powers `?demo=true` end-to-end.
//
// Run with: npm run db:seed

import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  DEMO_DISTRICT_ID,
  DEMO_CLASSROOM,
  DEMO_STUDENTS,
  DEMO_TEACHER,
  DEMO_PARENT,
  DEMO_UNITS
} from "@/lib/demo/data";

async function main(): Promise<void> {
  const password = await hash("demo-password", 10);

  await prisma.district.upsert({
    where: { id: DEMO_DISTRICT_ID },
    create: { id: DEMO_DISTRICT_ID, name: "Limud Demo District" },
    update: {}
  });

  // Teacher.
  const teacherUser = await prisma.user.upsert({
    where: { email: "teacher@demo.limud" },
    create: {
      id: DEMO_TEACHER.userId,
      email: "teacher@demo.limud",
      name: DEMO_TEACHER.name,
      role: "TEACHER",
      passwordHash: password
    },
    update: {}
  });
  await prisma.teacher.upsert({
    where: { userId: teacherUser.id },
    create: {
      id: DEMO_TEACHER.id,
      userId: teacherUser.id,
      districtId: DEMO_DISTRICT_ID
    },
    update: {}
  });

  // Parent.
  const parentUser = await prisma.user.upsert({
    where: { email: "parent@demo.limud" },
    create: {
      id: DEMO_PARENT.userId,
      email: "parent@demo.limud",
      name: DEMO_PARENT.name,
      role: "PARENT",
      passwordHash: password
    },
    update: {}
  });
  await prisma.parent.upsert({
    where: { userId: parentUser.id },
    create: {
      id: DEMO_PARENT.id,
      userId: parentUser.id
    },
    update: {}
  });

  // Classroom.
  await prisma.classroom.upsert({
    where: { id: DEMO_CLASSROOM.id },
    create: {
      id: DEMO_CLASSROOM.id,
      districtId: DEMO_DISTRICT_ID,
      teacherId: DEMO_TEACHER.id,
      name: DEMO_CLASSROOM.name,
      subject: DEMO_CLASSROOM.subject,
      gradeLevel: DEMO_CLASSROOM.gradeLevel
    },
    update: {}
  });

  // Students + enrollments.
  for (const s of DEMO_STUDENTS) {
    const u = await prisma.user.upsert({
      where: { email: `${s.studentId}@demo.limud` },
      create: {
        email: `${s.studentId}@demo.limud`,
        name: s.name,
        role: "STUDENT",
        passwordHash: password
      },
      update: {}
    });
    await prisma.student.upsert({
      where: { userId: u.id },
      create: {
        id: s.studentId,
        userId: u.id,
        districtId: DEMO_DISTRICT_ID,
        gradeLevel: s.gradeLevel,
        lexile: s.lexile,
        language: s.language,
        learningStyles: s.learningStyles.join(","),
        interests: s.interests.join(",")
      },
      update: {}
    });
    await prisma.enrollment.upsert({
      where: {
        classroomId_studentId: {
          classroomId: DEMO_CLASSROOM.id,
          studentId: s.studentId
        }
      },
      create: {
        classroomId: DEMO_CLASSROOM.id,
        studentId: s.studentId
      },
      update: {}
    });
  }

  // Link Maya to the demo parent.
  await prisma.parentChild.upsert({
    where: {
      parentId_studentId: {
        parentId: DEMO_PARENT.id,
        studentId: "demo-student-maya"
      }
    },
    create: {
      parentId: DEMO_PARENT.id,
      studentId: "demo-student-maya"
    },
    update: {}
  });

  // Units (Assignment + Material — never collapsed).
  for (const u of DEMO_UNITS) {
    await prisma.unit.upsert({
      where: { id: u.id },
      create: {
        id: u.id,
        classroomId: u.classroomId,
        title: u.title,
        description: u.description,
        topicTags: u.topicTags.join(","),
        publishedAt: new Date(u.publishedAt),
        dueAt: new Date(u.dueAt)
      },
      update: {}
    });
    await prisma.assignment.upsert({
      where: { unitId: u.id },
      create: {
        unitId: u.id,
        bodyHtml: u.assignment.bodyHtml,
        rubricJson: JSON.stringify(u.assignment.rubric),
        pointsTotal: u.assignment.pointsTotal
      },
      update: {}
    });
    await prisma.material.upsert({
      where: { unitId: u.id },
      create: {
        unitId: u.id,
        sourceHtml: u.material.sourceHtml,
        sourceLexile: u.material.sourceLexile,
        objectives: JSON.stringify(u.material.objectives)
      },
      update: {}
    });
  }
}

main()
  .then(() => {
    console.log("Demo seed complete.");
    return prisma.$disconnect();
  })
  .catch((e: unknown) => {
    console.error(e);
    return prisma.$disconnect().finally(() => process.exit(1));
  });
