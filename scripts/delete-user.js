#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function parseEmailArg() {
  const idx = process.argv.indexOf('--email');
  if (idx === -1) return null;
  return process.argv[idx + 1];
}

async function main() {
  const email = parseEmailArg();
  if (!email) {
    console.error('Usage: node delete-user.js --email user@example.com');
    process.exit(2);
  }

  // Safety: require explicit ALLOW_DELETE=true in environment to perform destructive actions.
  if (process.env.ALLOW_DELETE !== 'true') {
    console.error('Skipping deletion: set environment variable ALLOW_DELETE=true to allow destructive cleanup.');
    await prisma.$disconnect();
    process.exit(0);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log('User not found, nothing to delete:', email);
    await prisma.$disconnect();
    return;
  }

  await prisma.user.delete({ where: { email } });
  console.log('Deleted user:', email);
  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Error deleting user:', err);
  prisma.$disconnect().finally(() => process.exit(1));
});
