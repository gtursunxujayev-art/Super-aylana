import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Ensure SpinState row exists with safe defaults
  await prisma.spinState.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      status: 'IDLE',
      // the rest have defaults in schema, but set explicitly for clarity
      spinStartAt: new Date(),
      durationMs: 0,
      tier: 0,
      userName: '',
      resultTitle: ''
    }
  })

  // Optional: bootstrap an admin user if none exists
  const adminUsername = process.env.BOOTSTRAP_ADMIN_USERNAME || 'admin'
  const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD || 'admin123'

  const existingAdmin = await prisma.user.findFirst({
    where: { isAdmin: true }
  })

  if (!existingAdmin) {
    const hash = await bcrypt.hash(adminPassword, 10)
    await prisma.user.create({
      data: {
        tgId: `seed-${Date.now()}`,
        username: adminUsername,
        passwordHash: hash,
        isAdmin: true,
        balance: 0
      }
    })
    console.log(`Seeded admin user -> username: ${adminUsername}  password: ${adminPassword}`)
  } else {
    console.log('Admin user already present, skipping admin seed.')
  }

  // Optional: baseline prizes (adjust as you like)
  const basePrizes = [
    { title: 'Small Prize', coinCost: 50,  showInStore: true, active: true },
    { title: 'Medium Prize', coinCost: 100, showInStore: true, active: true },
    { title: 'Big Prize',   coinCost: 200, showInStore: true, active: true },
  ]
  for (const p of basePrizes) {
    await prisma.prize.upsert({
      where: { title_coinCost: { title: p.title, coinCost: p.coinCost } },
      update: {},
      create: p as any
    })
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
