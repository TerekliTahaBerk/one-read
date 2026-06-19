import { prisma } from "../lib/prisma";
import { renderLingoEmail } from "../lib/lingo/email-template";
import { sendDailyEmail } from "../lib/resend";

async function main() {
  const to = process.env.ADMIN_EMAIL;
  if (!to) throw new Error("ADMIN_EMAIL is required for lingo:send-test.");

  const lesson = await prisma.lingoDailyLesson.findFirst({
    where: { status: "GENERATED" },
    orderBy: [{ lessonDate: "desc" }, { createdAt: "desc" }],
  });
  if (!lesson) throw new Error("No generated OneLingo lesson found. Run npm run lingo:generate first.");

  const rendered = renderLingoEmail(lesson, {
    date: lesson.lessonDate.toISOString().slice(0, 10),
    targetLanguage: lesson.targetLanguage,
    nativeLanguage: lesson.nativeLanguage,
    level: lesson.level,
    links: { unsubscribe: "https://oneread.app/unsubscribe?preview=1" },
  });

  if (!process.argv.includes("--send")) {
    console.log("[lingo-send-test] dry preview only. Pass -- --send to email ADMIN_EMAIL.");
    console.log(JSON.stringify({ to, subject: rendered.subject, text: rendered.text }, null, 2));
    return;
  }

  const result = await sendDailyEmail({ to, ...rendered });
  console.log(JSON.stringify({ ok: true, to, messageId: result.messageId ?? null }, null, 2));
}

main()
  .catch((err) => {
    console.error("[lingo-send-test] failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
