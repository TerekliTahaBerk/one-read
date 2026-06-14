import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
try {
  const r = await p.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`;
  console.log("TABLES:", r.map((x) => x.table_name).join(", "));
  const cols = await p.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='Article' ORDER BY ordinal_position`;
  console.log("Article cols:", cols.map((x) => x.column_name).join(", "));
  const sumCols = await p.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='Summary' ORDER BY ordinal_position`;
  console.log("Summary cols:", sumCols.map((x) => x.column_name).join(", "));
  const subCols = await p.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='Subscriber' ORDER BY ordinal_position`;
  console.log("Subscriber cols:", subCols.map((x) => x.column_name).join(", "));
} finally {
  await p.$disconnect();
}
