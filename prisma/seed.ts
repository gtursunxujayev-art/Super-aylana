import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function ensurePrize(p: { title: string; coinCost: number; showInStore?: boolean; active?: boolean }) {
  const existing = await prisma.prize.findFirst({
    where: { title: p.title, coinCost: p.coinCost },
    select: { id: true },
  })
  if (existing) {
    await prisma.prize.update({
      where: { id: existing.id },
      data: {
        active: p.active ?? true,
        showInStore: p.showInStore ?? false,
      },
    })
  } else {
    await prisma.prize.create({
      data: {
        title: p.title,
        coinCost: p.coinCost,
        showInStore: p.showInStore ?? false,
        active: p.active ?? true,
      },
    })
  }
}

async function main() {
  const base = [
    { title: 'Qo‘shimcha aylantirish', coinCost: 50,  showInStore: false },
    { title: '75 tanga',               coinCost: 50,  showInStore: false },
    { title: '150 tanga',              coinCost: 100, showInStore: false },
    { title: '300 tanga',              coinCost: 200, showInStore: false },
  ]
  for (const p of base) await ensurePrize(p)

  // Ensure global SpinState row exists
  await prisma.spinState.upsert({
    where: { id: 'global' },
    update: {},
    create: { id: 'global', status: 'IDLE' },
  })
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
