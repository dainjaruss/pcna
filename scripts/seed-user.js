const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const email = process.env.SEED_EMAIL || 'test@example.com'
  const password = process.env.SEED_PASSWORD || 'Password123!'
  const hash = bcrypt.hashSync(password, 10)

  let user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    user = await prisma.user.create({ data: { email, passwordHash: hash, name: 'Test User' } })
    console.log('Created user:', user.email)
  } else {
    console.log('User already exists:', user.email)
  }

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
