'use client';
import { useEffect, useState } from "react";

type StoreItem = { id: string; active: boolean; item: { id: string; name: string; price: number; imageUrl?: string|null } };
type Me = { id: string; name: string; balance: number; role: string };

export default function StorePage() {
  const [items, setItems] = useState<StoreItem[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function load() {
    const r1 = await fetch("/api/store"); if (r1.ok) setItems(await r1.json());
    const r2 = await fetch("/api/me"); if (r2.ok) setMe(await r2.json());
  }
  useEffect(()=>{ load(); }, []);

  async function buy(id: string) {
    if (loadingId) return;
    setLoadingId(id);
    const r = await fetch("/api/store/buy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storeItemId: id }) });
    const j = await r.json().catch(()=>({}));
    if (!r.ok) {
      alert(j?.error === "NOT_ENOUGH_COINS" ? "Koin yetarli emas." : "Sotib olishda xatolik.");
    } else {
      alert(`Sotib olindi: ${j.bought.name} (${j.bought.price})`);
      await load();
    }
    setLoadingId(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Do‘kon</h1>
        <div className="px-3 py-1 rounded bg-white/5">Balance: <b>{me?.balance ?? 0}</b></div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(s => (
          <div key={s.id} className="p-3 rounded-xl bg-white/5">
            <div className="aspect-video rounded-lg overflow-hidden bg-white/5">
              {s.item.imageUrl ? (
                <img src={s.item.imageUrl} className="w-full h-full object-cover" alt="" />
              ) : null}
            </div>
            <div className="mt-3 font-medium">{s.item.name}</div>
            <div className="text-sm text-neutral-400">{s.item.price} coins</div>
            <button
              onClick={()=>buy(s.id)}
              disabled={!!loadingId}
              className="mt-3 w-full px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
            >
              {loadingId===s.id ? "Sotib olinmoqda..." : "Sotib olish"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
