import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const email = `db-smoke-${Date.now()}@oneread.test`;

try {
  const created = await prisma.subscriber.upsert({
    where: { email },
    update: {},
    create: { email, interests: [], status: "PENDING_PREFERENCES" },
  });
  console.log("CREATED:", {
    id: created.id,
    email: created.email,
    status: created.status,
  });

  const updated = await prisma.subscriber.update({
    where: { email },
    data: {
      interests: ["Artificial Intelligence", "Design"],
      sourceLanguage: "Any",
      summaryLanguage: "English",
      status: "ACTIVE",
    },
  });
  console.log("UPDATED:", {
    interests: updated.interests,
    sourceLanguage: updated.sourceLanguage,
    summaryLanguage: updated.summaryLanguage,
    status: updated.status,
  });

  const total = await prisma.subscriber.count();
  console.log("TOTAL_ROWS:", total);

  await prisma.subscriber.delete({ where: { email } });
  console.log("CLEANED_UP");
} finally {
  await prisma.$disconnect();
}
