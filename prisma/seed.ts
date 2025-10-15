// prisma/seed.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Ensure a single global SpinState row exists with all required fields
  await prisma.spinState.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      status: 'IDLE',
      // required (strings)
      userName: '',
      resultTitle: '',
      // optional (nullable) — align with your schema where these are now ?
      spinStartAt: null,
      durationMs: null,
      tier: null,
      // optional pointer to the user currently spinning
      byUserId: null,
    },
  })

  // (Optional) seed basics you need later — keep commented unless you want base data
  // await prisma.prize.createMany({
  //   data: [
  //     { title: 'Namuna 50', coinCost: 50, active: true, showInStore: true },
  //     { title: 'Namuna 100', coinCost: 100, active: true, showInStore: true },
  //     { title: 'Namuna 200', coinCost: 200, active: true, showInStore: true },
  //     { title: 'Namuna 500', coinCost: 500, active: true, showInStore: true },
  //   ],
  //   skipDuplicates: true,
  // })
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
