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
  // Base items priced exactly at mode
  const base = await prisma.item.findMany({ where: { active: true, price: mode } });
  const res: WheelEntry[] = base.map(i => ({
    id: i.id, name: i.name, imageUrl: i.imageUrl ?? undefined, price: i.price, weight: 10, kind: "item"
  }));

  // helpers
  async function addExtras(price: number, harderOrEasier: number, count: number) {
    // harderOrEasier > 1 => harder (lower weight), < 1 => easier (higher weight)
    const list = await prisma.item.findMany({ where: { active: true, price } });
    for (let i = 0; i < Math.min(count, list.length); i++) {
      const it = list[i];
      const baseW = 10;
      const w = harderOrEasier > 1
        ? Math.max(1, Math.round(baseW / harderOrEasier))
        : Math.round(baseW / Math.max(0.25, harderOrEasier)); // 0.5 => x2 easier
      res.push({ id: it.id, name: it.name, imageUrl: it.imageUrl ?? undefined, price: it.price, weight: w, kind: "item" });
    }
  }

  if (mode === 100) {
    await addExtras(200, 3, 2);
    await addExtras(50, 0.5, 1);   // easier x2
    await addExtras(150, 2, 1);
  } else if (mode === 50) {
    await addExtras(100, 3, 2);
    await addExtras(75, 2, 1);
  } else if (mode === 200) {
    await addExtras(500, 5, 2);
    await addExtras(100, 0.5, 1);  // easier x2
    await addExtras(300, 2, 1);
  }

  // one "another spin"
  res.push({ name: "Another spin", weight: 8, kind: "another" });

  // guarantee at least 6 slices for visual variety
  while (res.length < 6) res.push({ name: "Another spin", weight: 5, kind: "another" });

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
