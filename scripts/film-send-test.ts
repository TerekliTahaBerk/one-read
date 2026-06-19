import { prisma } from "../lib/prisma";
import { renderFilmEmail } from "../lib/film/email-template";
import { sendDailyEmail } from "../lib/resend";

async function main() {
  const to = process.env.ADMIN_EMAIL;
  if (!to) throw new Error("ADMIN_EMAIL is required for film:send-test.");

  const issue = await prisma.filmDailyIssue.findFirst({
    where: { status: "GENERATED" },
    orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
  });
  if (!issue) throw new Error("No generated OneFilm issue found. Run npm run film:generate first.");

  const rendered = renderFilmEmail(issue, {
    date: issue.issueDate.toISOString().slice(0, 10),
    emailLanguage: issue.emailLanguage,
    links: { unsubscribe: "https://oneread.app/unsubscribe?preview=1" },
  });

  if (!process.argv.includes("--send")) {
    console.log("[film-send-test] dry preview only. Pass -- --send to email ADMIN_EMAIL.");
    console.log(JSON.stringify({ to, subject: rendered.subject, text: rendered.text }, null, 2));
    return;
  }

  const result = await sendDailyEmail({ to, ...rendered });
  console.log(JSON.stringify({ ok: true, to, messageId: result.messageId ?? null }, null, 2));
}

main()
  .catch((err) => {
    console.error("[film-send-test] failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
