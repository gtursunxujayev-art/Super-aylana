// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // Ensure the single global SpinState row exists and is healthy
  await prisma.spinState.upsert({
    where: { id: 'global' },
    update: {}, // updatedAt will auto-bump
    create: {
      id: 'global',
      status: 'IDLE',
      // these are optional to set because schema has defaults,
      // but we set them explicitly to guarantee no NULLs exist
      spinStartAt: new Date(),
      durationMs: 0,
      tier: 50,
      userName: '',
      resultTitle: '',
    },
  })

  // Optional: ensure there is an admin user if you need one for first login
  // Replace demo values as appropriate; skip if you already create one elsewhere
  const adminName = 'ADMIN1'
  const passwordHash = null // if you’re using Telegram-only or external auth, keep null

  await prisma.user.upsert({
    where: { username: adminName },
    update: {},
    create: {
      username: adminName,
      isAdmin: true,
      balance: 0,
      passwordHash,        // supply hash if you use password login
      tgId: '',            // default ok
    },
  })
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