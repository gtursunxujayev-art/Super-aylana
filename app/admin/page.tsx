'use client';
import { useEffect, useState } from "react";

type User = { id: string; name: string; login: string; balance: number; role: "USER"|"MODERATOR"|"ADMIN" };
type Item = { id: string; name: string; price: number; imageUrl?: string|null; active: boolean; weight: number };
type Reward = { id: string; username: string; price: number; prize: string; imageUrl?: string|null; status: "PENDING"|"DELIVERED"; createdAt: string };
type StoreItem = { id: string; active: boolean; item: Item };
type GiftCode = { id: string; code: string; amount: number; maxRedemptions: number; redeemedCount: number; active: boolean };

export default function AdminPage() {
  const [tab, setTab] = useState<"rewards"|"coins"|"users"|"items"|"store"|"giftcodes"|"help">("rewards");
  const [users, setUsers] = useState<User[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [store, setStore] = useState<StoreItem[]>([]);
  const [codes, setCodes] = useState<GiftCode[]>([]);
  const [err, setErr] = useState<string>("");

  const [give, setGive] = useState({ userId: "", delta: 0, reason: "" });
  const [newItem, setNewItem] = useState({ name: "", price: 100, imageUrl: "", weight: 10 });
  const [addStoreItemId, setAddStoreItemId] = useState<string>("");
  const [newCode, setNewCode] = useState({ code: "", amount: 100, maxRedemptions: 1 });

  async function loadUsers(){ setErr(""); const r = await fetch("/api/admin/users"); if (r.ok) setUsers(await r.json()); else setErr("You are not ADMIN/MOD."); }
  async function loadItems(){ const r = await fetch("/api/items"); if (r.ok) setItems(await r.json()); }
  async function loadRewards(){ const r = await fetch("/api/admin/rewards"); if (r.ok) setRewards(await r.json()); }
  async function loadStore(){ const r = await fetch("/api/store"); if (r.ok) setStore(await r.json()); }
  async function loadCodes(){ const r = await fetch("/api/admin/gift-codes"); if (r.ok) setCodes(await r.json()); }

  useEffect(()=>{ loadUsers(); loadItems(); loadRewards(); loadStore(); loadCodes(); }, []);

  async function becomeAdmin() {
    const r = await fetch("/api/auth/refresh", { method: "POST" });
    const j = await r.json().catch(()=>({}));
    if (j?.role === "ADMIN") { setErr(""); loadUsers(); alert("You are ADMIN now."); }
    else alert("Your TGID must match ADMIN_TGID in env.");
  }

  async function doGive(){
    const r = await fetch("/api/admin/coins", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(give) });
    if (r.ok) { alert("OK"); loadUsers(); } else alert("Xatolik");
  }
  async function addItem(){
    const r = await fetch("/api/items", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(newItem) });
    if (r.ok) { setNewItem({ name:"", price:100, imageUrl:"", weight:10 }); loadItems(); } else alert("Xatolik");
  }
  async function updateItem(it: Item){
    const r = await fetch("/api/items", { method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify(it) });
    if (r.ok) loadItems(); else alert("Xatolik");
  }

  async function storeAdd(){
    if (!addStoreItemId) return;
    const r = await fetch("/api/store", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ itemId: addStoreItemId }) });
    if (r.ok) { setAddStoreItemId(""); loadStore(); } else alert("Xatolik");
  }
  async function storeToggle(id: string, active: boolean) {
    const r = await fetch("/api/store", { method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ id, active }) });
    if (r.ok) loadStore(); else alert("Xatolik");
  }
  async function storeDelete(id: string) {
    const r = await fetch("/api/store", { method: "DELETE", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ id }) });
    if (r.ok) loadStore(); else alert("Xatolik");
  }

  async function setDelivered(id: string, delivered: boolean) {
    const r = await fetch("/api/admin/rewards", { method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ id, status: delivered ? "DELIVERED" : "PENDING" }) });
    if (r.ok) loadRewards(); else alert("Xatolik");
  }

  async function createCode(){
    const r = await fetch("/api/admin/gift-codes", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(newCode) });
    if (r.ok) { setNewCode({ code: "", amount: 100, maxRedemptions: 1 }); loadCodes(); } else alert("Xatolik");
  }
  async function toggleCode(id: string, active: boolean) {
    const r = await fetch("/api/admin/gift-codes", { method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ id, active }) });
    if (r.ok) loadCodes(); else alert("Xatolik");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">Admin</h1>
        {err && <button onClick={becomeAdmin} className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-700 text-sm">Become Admin</button>}
      </div>

      <div className="text-red-400 text-sm">{err}</div>

      <div className="flex gap-2 flex-wrap">
        {["rewards","coins","users","items","store","giftcodes","help"].map(t=>(
          <button key={t} onClick={()=>setTab(t as any)} className={`px-3 py-2 rounded ${tab===t?'bg-emerald-600':'bg-white/10'}`}>{t}</button>
        ))}
      </div>

      {tab==="rewards" && (
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left">
              <th className="p-2">User</th><th className="p-2">Mode</th><th className="p-2">Prize</th><th className="p-2">Status</th><th className="p-2">Time</th><th className="p-2">Action</th>
            </tr></thead>
            <tbody>
              {rewards.map(r=>(
                <tr key={r.id} className="border-t border-white/10">
                  <td className="p-2">{r.username}</td>
                  <td className="p-2">{r.price}</td>
                  <td className="p-2">{r.prize}</td>
                  <td className="p-2">{r.status}</td>
                  <td className="p-2">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="p-2">
                    <button onClick={()=>setDelivered(r.id, r.status!=="DELIVERED")} className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs">
                      {r.status==="DELIVERED" ? "Mark Pending" : "Mark Delivered"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab==="coins" && (
        <div className="space-y-3">
          <select className="bg-white/10 px-3 py-2 rounded" value={give.userId} onChange={e=>setGive(v=>({ ...v, userId: e.target.value }))}>
            <option value="">Select user</option>
            {users.map(u=><option key={u.id} value={u.id}>{u.name} ({u.balance})</option>)}
          </select>
          <input className="bg-white/10 px-3 py-2 rounded" type="number" value={give.delta} onChange={e=>setGive(v=>({ ...v, delta: Number(e.target.value) }))} placeholder="Delta (+/-)"/>
          <input className="bg-white/10 px-3 py-2 rounded" value={give.reason} onChange={e=>setGive(v=>({ ...v, reason: e.target.value }))} placeholder="Reason"/>
          <button onClick={doGive} className="px-4 py-2 bg-emerald-600 rounded">Submit</button>
        </div>
      )}

      {tab==="users" && (
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left"><th className="p-2">Username</th><th className="p-2">Login</th><th className="p-2">Balance</th><th className="p-2">Role</th></tr></thead>
            <tbody>
            {users.map(u=>(
              <tr key={u.id} className="border-t border-white/10">
                <td className="p-2">{u.name}</td>
                <td className="p-2">{u.login}</td>
                <td className="p-2">{u.balance}</td>
                <td className="p-2">{u.role}</td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>
      )}

      {tab==="items" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <input className="bg-white/10 px-3 py-2 rounded" placeholder="Name" value={newItem.name} onChange={e=>setNewItem(v=>({...v, name: e.target.value}))}/>
            <input type="number" className="bg-white/10 px-3 py-2 rounded w-28" placeholder="Price" value={newItem.price} onChange={e=>setNewItem(v=>({...v, price: Number(e.target.value)}))}/>
            <input type="number" className="bg-white/10 px-3 py-2 rounded w-28" placeholder="Weight" value={newItem.weight} onChange={e=>setNewItem(v=>({...v, weight: Number(e.target.value)}))}/>
            <input className="bg-white/10 px-3 py-2 rounded w-[320px]" placeholder="Image URL" value={newItem.imageUrl} onChange={e=>setNewItem(v=>({...v, imageUrl: e.target.value}))}/>
            <button onClick={addItem} className="px-3 py-2 bg-emerald-600 rounded">Add</button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {items.map(i=>(
              <div key={i.id} className="p-3 bg-white/5 rounded flex items-center gap-3">
                <img src={i.imageUrl ?? ""} alt="" className="w-16 h-16 object-cover rounded"/>
                <div className="flex-1">
                  <div className="font-medium">{i.name}</div>
                  <div className="text-sm text-neutral-400">{i.price} coins · weight {i.weight}</div>
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={()=>updateItem({...i, active: !i.active})} className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs">{i.active?"Disable":"Enable"}</button>
                  <button onClick={()=>updateItem({...i, weight: Math.max(1, i.weight-1)})} className="px-2 py-1 rounded bg-white/10 text-xs">- weight</button>
                  <button onClick={()=>updateItem({...i, weight: i.weight+1})} className="px-2 py-1 rounded bg-white/10 text-xs">+ weight</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==="store" && (
        <div className="space-y-4">
          <div className="flex gap-2 items-center">
            <select className="bg-white/10 px-3 py-2 rounded min-w-64" value={addStoreItemId} onChange={e=>setAddStoreItemId(e.target.value)}>
              <option value="">Add item to store…</option>
              {items.map(i=>(
                <option key={i.id} value={i.id}>{i.name} — {i.price}</option>
              ))}
            </select>
            <button onClick={storeAdd} className="px-3 py-2 bg-emerald-600 rounded">Add</button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {store.map(s=>(
              <div key={s.id} className="p-3 bg-white/5 rounded">
                <div className="aspect-video rounded-lg overflow-hidden bg-white/10">
                  {s.item.imageUrl ? <img src={s.item.imageUrl} className="w-full h-full object-cover" alt=""/> : null}
                </div>
                <div className="mt-2 font-medium">{s.item.name}</div>
                <div className="text-sm text-neutral-400">{s.item.price} coins</div>
                <div className="mt-2 flex gap-2">
                  <button onClick={()=>storeToggle(s.id, !s.active)} className="px-3 py-1 rounded bg-white/10 hover:bg-white/20">
                    {s.active ? "Disable" : "Enable"}
                  </button>
                  <button onClick={()=>storeDelete(s.id)} className="px-3 py-1 rounded bg-red-600 hover:bg-red-700">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==="giftcodes" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <input className="bg-white/10 px-3 py-2 rounded" placeholder="CODE" value={newCode.code} onChange={e=>setNewCode(v=>({...v, code:e.target.value}))}/>
            <input type="number" className="bg-white/10 px-3 py-2 rounded w-28" placeholder="Amount" value={newCode.amount} onChange={e=>setNewCode(v=>({...v, amount:Number(e.target.value)}))}/>
            <input type="number" className="bg-white/10 px-3 py-2 rounded w-40" placeholder="Max redemptions" value={newCode.maxRedemptions} onChange={e=>setNewCode(v=>({...v, maxRedemptions:Number(e.target.value)}))}/>
            <button onClick={createCode} className="px-3 py-2 bg-emerald-600 rounded">Create</button>
          </div>

          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left">
                <th className="p-2">Code</th><th className="p-2">Amount</th><th className="p-2">Redeemed</th><th className="p-2">Active</th><th className="p-2">Action</th>
              </tr></thead>
              <tbody>
                {codes.map(c=>(
                  <tr key={c.id} className="border-t border-white/10">
                    <td className="p-2">{c.code}</td>
                    <td className="p-2">{c.amount}</td>
                    <td className="p-2">{c.redeemedCount}/{c.maxRedemptions}</td>
                    <td className="p-2">{String(c.active)}</td>
                    <td className="p-2">
                      <button onClick={()=>toggleCode(c.id, !c.active)} className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs">{c.active?"Disable":"Enable"}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab==="help" && (
        <div className="space-y-3 text-sm text-neutral-300">
          <div>❗ If Users/Items are empty or you get 403, click <b>Become Admin</b>. It promotes you if your TGID matches <code>ADMIN_TGID</code>.</div>
          <div>• Items tab lets you set <b>weight</b> (odds). Higher weight ⇒ more likely when price equals the mode.</div>
          <div>• Rewards tab lets you mark items <b>DELIVERED</b>.</div>
          <div>• Gift codes: create <code>AYLANA100</code> and share. Users redeem at <code>/redeem</code> (you can wire a small UI later).</div>
        </div>
      )}
    </div>
  );
}
