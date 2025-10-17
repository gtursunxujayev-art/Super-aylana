'use client';
import { useEffect, useState } from "react";

type User = { id: string; name: string; login: string; balance: number; role: "USER"|"ADMIN" };
type Item = { id: string; name: string; price: number; imageUrl?: string|null; active: boolean };
type Reward = { id: string; username: string; price: number; prize: string; imageUrl?: string|null; createdAt: string };

export default function AdminPage() {
  const [tab, setTab] = useState<"rewards"|"coins"|"users"|"items"|"store">("rewards");
  const [users, setUsers] = useState<User[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [give, setGive] = useState({ userId: "", delta: 0, reason: "" });
  const [newItem, setNewItem] = useState({ name: "", price: 100, imageUrl: "" });

  async function loadUsers(){ const r = await fetch("/api/admin/users"); if (r.ok) setUsers(await r.json()); }
  async function loadItems(){ const r = await fetch("/api/items"); if (r.ok) setItems(await r.json()); }
  async function loadRewards(){ const r = await fetch("/api/admin/rewards"); if (r.ok) setRewards(await r.json()); }

  useEffect(()=>{ loadUsers(); loadItems(); loadRewards(); }, []);

  async function doGive(){
    const r = await fetch("/api/admin/coins", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(give) });
    if (r.ok) { alert("OK"); loadUsers(); } else alert("Xatolik");
  }
  async function addItem(){
    const r = await fetch("/api/items", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(newItem) });
    if (r.ok) { setNewItem({ name:"", price:100, imageUrl:""}); loadItems(); } else alert("Xatolik");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <div className="flex gap-2">
        {["rewards","coins","users","items","store"].map(t=>(
          <button key={t} onClick={()=>setTab(t as any)} className={`px-3 py-2 rounded ${tab===t?'bg-emerald-600':'bg-white/10'}`}>{t}</button>
        ))}
      </div>

      {tab==="rewards" && (
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left">
              <th className="p-2">User</th><th className="p-2">Price</th><th className="p-2">Prize</th><th className="p-2">Image</th><th className="p-2">Time</th>
            </tr></thead>
            <tbody>
              {rewards.map(r=>(
                <tr key={r.id} className="border-t border-white/10">
                  <td className="p-2">{r.username}</td>
                  <td className="p-2">{r.price}</td>
                  <td className="p-2">{r.prize}</td>
                  <td className="p-2">{r.imageUrl ? <img src={r.imageUrl} className="w-10 h-10 rounded object-cover"/> : "-"}</td>
                  <td className="p-2">{new Date(r.createdAt).toLocaleString()}</td>
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
          <div className="flex gap-2">
            <input className="bg-white/10 px-3 py-2 rounded" placeholder="Name" value={newItem.name} onChange={e=>setNewItem(v=>({...v, name: e.target.value}))}/>
            <input type="number" className="bg-white/10 px-3 py-2 rounded w-28" placeholder="Price" value={newItem.price} onChange={e=>setNewItem(v=>({...v, price: Number(e.target.value)}))}/>
            <input className="bg-white/10 px-3 py-2 rounded w-[320px]" placeholder="Image URL" value={newItem.imageUrl} onChange={e=>setNewItem(v=>({...v, imageUrl: e.target.value}))}/>
            <button onClick={addItem} className="px-3 py-2 bg-emerald-600 rounded">Add</button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {items.map(i=>(
              <div key={i.id} className="p-3 bg-white/5 rounded flex items-center gap-3">
                <img src={i.imageUrl ?? ""} alt="" className="w-16 h-16 object-cover rounded"/>
                <div className="flex-1">
                  <div className="font-medium">{i.name}</div>
                  <div className="text-sm text-neutral-400">{i.price} coins</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==="store" && (
        <div className="text-neutral-400">
          Simple MVP: store reading list via `/api/store` (admin can add by POST).  
          (Uploader can be added later — for now items use image URLs.)
        </div>
      )}
    </div>
  );
}
