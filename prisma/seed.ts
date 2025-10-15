// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
const prisma = new PrismaClient()

async function main() {
  // Ensure global spin state
  await prisma.spinState.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      status: 'IDLE',
      userName: '',
      resultTitle: '',
    },
  })

  // Ensure admin user (edit these if you want)
  const adminUsername = 'admin'
  const adminPassword = 'admin123' // change in production
  const passwordHash = await bcrypt.hash(adminPassword, 10)

  await prisma.user.upsert({
    where: { username: adminUsername },
    update: {
      isAdmin: true,
      passwordHash,
    },
    create: {
      username: adminUsername,
      passwordHash,
      isAdmin: true,
    },
  })

  // Sample prizes if table is empty
  const count = await prisma.prize.count()
  if (count === 0) {
    await prisma.prize.createMany({
      data: [
        { title: 'Small Gift', coinCost: 50, showInStore: true },
        { title: 'Medium Gift', coinCost: 100, showInStore: true },
        { title: 'Big Gift', coinCost: 200, showInStore: true },
      ],
    })
  }

  console.log('Seed completed.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })