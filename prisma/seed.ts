import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "Yönetici";

  if (!email || !password) {
    console.error("ADMIN_EMAIL ve ADMIN_PASSWORD .env içinde tanımlı olmalı.");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Ensure the seeded admin always has the admin role.
    if (existing.role !== "admin") {
      await prisma.user.update({ where: { email }, data: { role: "admin" } });
      console.log(`Kullanıcı admin yapıldı: ${email}`);
    } else {
      console.log(`Admin kullanıcı zaten var: ${email} — atlanıyor.`);
    }
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { email, password: hash, name, role: "admin" },
  });

  console.log(`İlk admin kullanıcı oluşturuldu: ${email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
