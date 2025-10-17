import { prisma } from "./prisma";

export type WheelEntry = {
  id?: string;             // item id if real item
  name: string;
  imageUrl?: string;
  weight: number;
  price?: number;
  kind: "item" | "another";
};

// Build mode entries using DB items
export async function buildWheel(mode: 50 | 100 | 200): Promise<WheelEntry[]> {
  // pull base items
  const base = await prisma.item.findMany({ where: { active: true, price: mode } });
  const res: WheelEntry[] = base.map(i => ({
    id: i.id, name: i.name, imageUrl: i.imageUrl ?? undefined, price: i.price, weight: 10, kind: "item"
  }));

  function addExtras(price: number, harder: number, count: number) {
    return prisma.item.findMany({ where: { active: true, price } }).then(list => {
      // pick up to 'count' items (any order)
      for (let i = 0; i < Math.min(count, list.length); i++) {
        const it = list[i];
        const weightBase = 10;
        const w = harder > 1 ? Math.max(1, Math.round(weightBase / harder)) : weightBase * harder; // harder -> smaller weight; easier -> bigger
        res.push({ id: it.id, name: it.name, imageUrl: it.imageUrl ?? undefined, price: it.price, weight: w, kind: "item" });
      }
    });
  }

  if (mode === 100) {
    await addExtras(200, 3, 2);
    await addExtras(50, 0.5, 1);   // easier x2 => weight * 2 -> we pass 0.5 (inverse)
    await addExtras(150, 2, 1);
  } else if (mode === 50) {
    await addExtras(100, 3, 2);
    await addExtras(75, 2, 1);
  } else if (mode === 200) {
    await addExtras(500, 5, 2);
    await addExtras(100, 0.5, 1);
    await addExtras(300, 2, 1);
  }

  // one "another spin"
  res.push({ name: "Another spin", weight: 8, kind: "another" });

  return res;
}

export function weightedPick(entries: WheelEntry[]) {
  const total = entries.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const e of entries) {
    if ((r -= e.weight) <= 0) return e;
  }
  return entries.at(-1)!;
}
