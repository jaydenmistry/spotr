// Upserts the admin user from ADMIN_EMAIL / ADMIN_PASSWORD env vars.
// Runs at container startup (docker-entrypoint.sh) and via `npm run seed` locally.
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn('ADMIN_EMAIL / ADMIN_PASSWORD not set; skipping admin user seed.');
    return;
  }

  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters.');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && (await bcrypt.compare(password, existing.password))) {
    console.log(`Admin user ${email} already up to date.`);
    return;
  }

  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: { password: hashed },
    create: { email, password: hashed },
  });
  console.log(`Admin user ${email} ${existing ? 'updated' : 'created'}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
