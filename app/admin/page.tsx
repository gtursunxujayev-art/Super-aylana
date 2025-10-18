'use client';
import { useEffect, useState } from "react";

type Role = "USER" | "MODERATOR" | "ADMIN";
type User = { id: string; name: string; login: string; balance: number; role: Role };
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
  async function updateItem(partial: Partial<Item> & { id: string }){
    const r = await fetch("/api/items", { method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify(partial) });
    if (r.ok) loadItems(); else alert("Xatolik");
  }
  async function deleteItem(id: string){
    if (!confirm("Delete this item?")) return;
    const r = await fetch("/api/items", { method: "DELETE", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ id }) });
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
    if (!confirm("Remove from store?")) return;
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

      {tab==="users" && (
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left"><th className="p-2">Username</th><th className="p-2">Login</th><th className="p-2">Balance</th><th className="p-2">Role</th><th className="p-2">Save</th></tr></thead>
            <tbody>
            {users.map(u=>(
              <tr key={u.id} className="border-t border-white/10">
                <td className="p-2">
                  <input defaultValue={u.name} className="bg-white/10 px-2 py-1 rounded w-48"
                         onBlur={(e)=>{ u.name = e.currentTarget.value; }} />
                </td>
                <td className="p-2">{u.login}</td>
                <td className="p-2">{u.balance}</td>
                <td className="p-2">
                  <select defaultValue={u.role} className="bg-white/10 px-2 py-1 rounded"
                          onChange={(e)=>{ u.role = e.currentTarget.value as Role; }}>
                    <option>USER</option>
                    <option>MODERATOR</option>
                    <option>ADMIN</option>
                  </select>
                </td>
                <td className="p-2">
                  <button className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs"
                          onClick={async()=>{ 
                            await fetch("/api/admin/users", { method:"PUT", headers:{ "Content-Type":"application/json" },
                              body: JSON.stringify({ id: u.id, name: u.name, role: u.role }) });
                            loadUsers();
                          }}>
                    Save
                  </button>
                </td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>
      )}

      {/* The rest of tabs (rewards/coins/items/store/giftcodes/help) – keep your previously provided versions */}
      {/* ... copy from the previous Admin file I sent (unchanged) */}
      {/* For brevity here, only Users tab changed; if you need the full file with all tabs again, say "send full admin" */}
    </div>
  );
}
