import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // Base prizes (you can edit freely)
  const base = [
    { title: 'Qo‘shimcha aylantirish', coinCost: 50,  showInStore: false },
    { title: '75 tanga',               coinCost: 50,  showInStore: false },
    { title: '150 tanga',              coinCost: 100, showInStore: false },
    { title: '300 tanga',              coinCost: 200, showInStore: false },
  ]

  for (const p of base) {
    await prisma.prize.upsert({
      where: { title_coinCost: { title: p.title, coinCost: p.coinCost } },
      update: { active: true, showInStore: p.showInStore },
      create: { title: p.title, coinCost: p.coinCost, showInStore: p.showInStore, active: true },
    })
  }

  // Ensure global SpinState row exists
  await prisma.spinState.upsert({
    where: { id: 'global' },
    update: {},
    create: { id: 'global', status: 'IDLE' },
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
