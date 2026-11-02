// Upserts the admin user from ADMIN_EMAIL / ADMIN_PASSWORD env vars.
// Runs at container startup (docker-entrypoint.sh) and via `npm run seed` locally.
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { adminPasswordProblem } = require('./passwordPolicy');

const prisma = new PrismaClient();

// Passwords that were ever shown publicly (the old login page's demo hint).
// Any account still using one is locked on every start, whatever the env says.
const LEAKED_PASSWORDS = ['password'];

/**
 * Replaces the password of any account using one of `passwords` with a random
 * hash and bumps sessionVersion, which also signs out its existing sessions.
 */
async function lockAccountsUsing(passwords) {
  const users = await prisma.user.findMany({ select: { id: true, email: true, password: true } });
  for (const user of users) {
    for (const candidate of passwords) {
      if (await bcrypt.compare(candidate, user.password)) {
        const unusable = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
        await prisma.user.update({
          where: { id: user.id },
          data: { password: unusable, sessionVersion: { increment: 1 } },
        });
        console.error(`Locked ${user.email}: it used a weak or publicly shown password. Set a strong ADMIN_PASSWORD (12+ characters, not a common password) and restart to sign in.`);
        break;
      }
    }
  }
}

async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  const problem = password ? adminPasswordProblem(password, email) : null;

  // Runs before anything else so a missing or weak env can't skip it.
  await lockAccountsUsing(problem ? [...LEAKED_PASSWORDS, password] : LEAKED_PASSWORDS);

  if (!email || !password) {
    console.warn('ADMIN_EMAIL / ADMIN_PASSWORD not set; skipping admin user seed.');
    return;
  }

  const others = await prisma.user.count({ where: { email: { not: email } } });
  if (others > 0) {
    console.warn(`${others} other account(s) exist besides ${email}; they keep their current role and password.`);
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (problem) {
    // Don't crash the container: the public site should stay up. The account
    // was locked above if it was on this password.
    console.error(`ADMIN_PASSWORD ${problem}. Admin password not updated.`);
    // ADMIN_EMAIL is the trust root for the admin role, independent of the password.
    if (existing && existing.role !== 'admin') {
      await prisma.user.update({ where: { email }, data: { role: 'admin' } });
      console.log(`${email} set to admin.`);
    }
    return;
  }

  if (existing && (await bcrypt.compare(password, existing.password))) {
    if (existing.role !== 'admin') {
      await prisma.user.update({ where: { email }, data: { role: 'admin' } });
      console.log(`${email} set to admin.`);
    } else {
      console.log(`Admin user ${email} already up to date.`);
    }
    return;
  }

  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    // A new password signs out every existing session for this account.
    update: { password: hashed, role: 'admin', sessionVersion: { increment: 1 } },
    create: { email, password: hashed, role: 'admin' },
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
