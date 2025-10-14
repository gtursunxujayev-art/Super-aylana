import { prisma } from '../app/lib/prisma'

async function main(){
  // create a couple of prizes for each tier
  const base = [
    { title:'Mandarin', coinCost:50 },
    { title:'Snickers', coinCost:50 },
    { title:'Kitob', coinCost:50 },
    { title:'Kofe', coinCost:100 },
    { title:'Pulpy', coinCost:100 },
    { title:'Semechka', coinCost:100 },
    { title:'Banan', coinCost:200 },
    { title:'Shokolad', coinCost:200 },
    { title:'Stakanlar to‘plami', coinCost:200 },
  ]
  for (const p of base) {
    await prisma.prize.upsert({ where:{ title_coinCost: { title:p.title, coinCost:p.coinCost } as any }, update:{}, create:{ ...p, showInStore:true } })
  }
  // Ensure global state row
  await prisma.spinState.upsert({ where:{ id:'global' }, update:{}, create:{ id:'global', status:'IDLE' } })
  console.log('seeded')
}
main().catch(e=>{console.error(e);process.exit(1)}).finally(()=>process.exit(0))