// app/page.tsx
'use client';

/**
 * Fixed-width main page layout that prevents horizontal widening
 * when lists grow or dropdowns open. This is a full, ready-to-replace
 * page file. Plug your existing widgets/content into the marked slots
 * without changing the layout behavior.
 */

import React from 'react';

export default function Page() {
  return (
    <div className="page">
      <div className="columns">
        {/* ========== LEFT PANEL ========== */}
        <aside className="left panel">
          <section className="panel box">
            <h3 className="title">Qoidalar (soddalashtirilgan)</h3>
            {/* 👉 Place your existing "rules" content here */}
            <div className="text sm break">
              <ul className="bullets">
                <li>Odatiy 10,000 so‘m = 10 tanga</li>
                <li>Odatiy 100,000 so‘m = 100 tanga</li>
                <li>Adminlar bu yerga yozib ko‘rsatma qoldirishi mumkin.</li>
              </ul>
            </div>
          </section>

          <section className="panel box" style={{ marginTop: 12 }}>
            <h3 className="title">Oxirgi 5 yutug‘</h3>
            {/* 👉 Replace this list with your real "last 5 prizes" */}
            <div className="scroll">
              {Array.from({ length: 12 }).map((_, i) => (
                <div className="row" key={i}>
                  <span className="label truncate">Guest{i + 1} • Mahsulot {i + 1}</span>
                  <span className="val">+{(i + 1) * 10}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>

        {/* ========== CENTER ========== */}
        <main className="center panel">
          <div className="center-inner">
            <h4 className="muted">Aylanaylik tayyormisiz?</h4>

            {/* Wheel area */}
            <div className="wheel-wrap">
              {/* 👉 Mount your actual Wheel component inside this box */}
              <div className="wheel-box">
                <div className="wheel">WHEEL</div>
                <div className="pin" />
              </div>
            </div>

            {/* User + balance info under wheel */}
            <div className="info-line">
              <span className="muted">Foydalanuvchi:</span>
              <span className="bold ellipsis">Guest1786</span>
              <span className="dot" />
              <span className="muted">Balans:</span>
              <span className="bold">0</span>
            </div>

            {/* Spin button */}
            <div className="actions">
              <button className="btn">Spin (50)</button>
            </div>

            {/* Demo coins */}
            <section className="panel box" style={{ marginTop: 16 }}>
              <div className="row">
                <span className="title">Demo: Coins</span>
              </div>
              <div className="btns">
                <button className="btn sm">+50</button>
                <button className="btn sm">+100</button>
                <button className="btn sm">+200</button>
              </div>
              <p className="muted sm" style={{ marginTop: 8 }}>
                Faqat dev/test: MINT_PUBLIC, ALLOW_SELF_SPINni true bo‘lsa ko‘rinadi.
              </p>
            </section>
          </div>
        </main>

        {/* ========== RIGHT PANEL ========== */}
        <aside className="right panel">
          <section className="panel box">
            <h3 className="title">Ishtirokchilar balansi</h3>
            {/* 👉 Replace with your live "users + balances" list */}
            <div className="scroll">
              {Array.from({ length: 40 }).map((_, i) => (
                <div className="row" key={i}>
                  <span className="label truncate">Guest{i + 1015}</span>
                  <span className="val">{i % 7 === 0 ? (i + 1) * 10 : 0}</span>
                </div>
              ))}
            </div>
            <p className="muted xs" style={{ marginTop: 6 }}>
              Ro‘yxat har 2 soniyada yangilanadi.
            </p>
          </section>

          <section className="panel box" style={{ marginTop: 12 }}>
            <h3 className="title">Do‘kon (coin bilan)</h3>

            {/* Filter / tabs */}
            <div className="tabs">
              <label className="tab">
                <input type="radio" name="cat" defaultChecked /> Mavjud
              </label>
              <label className="tab">
                <input type="radio" name="cat" /> Yangisi
              </label>
              <label className="tab">
                <input type="radio" name="cat" /> Yoqtirganlar
              </label>
            </div>

            {/* Store list — fixed, non-widening */}
            <div className="scroll">
              <table className="store table-fixed">
                <colgroup>
                  <col style={{ width: '55%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '30%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className="left">Nomi</th>
                    <th className="left">Narx</th>
                    <th className="left">Amal</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 18 }).map((_, i) => (
                    <tr key={i}>
                      <td className="left ellipsis">Item {i + 1} — batafsil tavsif juda-uzun bo‘lsa ham…</td>
                      <td className="left">{[50, 100, 200, 500][i % 4]}</td>
                      <td className="left">
                        <div className="stack">
                          <button className="btn xs">Sotib olish</button>
                          <button className="btn xs ghost">Savatcha</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Coin presets */}
            <div className="chipbar">
              <span className="chip">50 tanga</span>
              <span className="chip">100 tanga</span>
              <span className="chip">200 tanga</span>
            </div>
          </section>
        </aside>
      </div>

      {/* ====== PAGE SCOPED STYLES (styled-jsx global) ====== */}
      <style jsx global>{`
        :root {
          --bg: #0b111a;
          --panel: #0f1420;
          --muted: #9fb1c9;
          --text: #dbe7ff;
          --border: #243044;
          --accent: #6aa6ff;
          --accent2: #8b5cf6;
        }

        html, body {
          background: var(--bg);
          color: var(--text);
        }
        * { box-sizing: border-box; }

        .page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 50px 12px 24px; /* 50px top space as requested */
          overflow-x: hidden; /* STOP horizontal widening */
        }

        .columns {
          display: flex;
          gap: 16px;
          align-items: flex-start;
          /* allow responsive wrap but never widen */
          flex-wrap: wrap;
        }

        .panel {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 14px;
        }

        .left, .right {
          flex: 0 0 260px;          /* fixed sidebars */
          max-width: 260px;
          min-width: 0;             /* allow inner truncation */
        }
        .center {
          flex: 1 1 0%;
          min-width: 380px;
          max-width: 640px;         /* wheel area never balloons */
        }

        .box {
          padding: 12px;
          overflow: hidden;         /* ensure children can't push width */
        }

        .title {
          font-weight: 700;
          margin: 0 0 8px 0;
        }

        .muted { color: var(--muted); }
        .xs { font-size: 11px; }
        .sm { font-size: 13px; }
        .text { line-height: 1.5; }
        .bold { font-weight: 700; }
        .ellipsis { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .break { word-break: break-word; overflow-wrap: anywhere; }
        .bullets { padding-left: 18px; margin: 0; }
        .bullets li { margin: 6px 0; }

        .scroll {
          max-height: 420px;      /* vertical scroll instead of width growth */
          overflow-y: auto;
          overflow-x: hidden;
          overscroll-behavior: contain;
        }

        .row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 6px 0;
          min-width: 0;           /* critical for truncation */
          border-bottom: 1px dashed rgba(255,255,255,0.05);
        }
        .row:last-child { border-bottom: 0; }
        .row .label { flex: 1 1 auto; min-width: 0; }
        .row .val { flex: 0 0 auto; opacity: 0.9; }

        .center-inner { padding: 8px; }
        .wheel-wrap {
          width: 360px;
          max-width: 100%;
          margin: 10px auto 0;
        }
        .wheel-box {
          position: relative;
          width: 100%;
          padding-top: 100%;      /* 1:1 square */
          border: 1px solid var(--border);
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: radial-gradient(ellipse at center, #101827 0%, #0a1220 65%);
        }
        .wheel {
          position: absolute;
          inset: 8%;
          border-radius: 50%;
          display: grid;
          place-items: center;
          border: 1px solid var(--border);
          font-weight: 700;
          letter-spacing: 2px;
          opacity: 0.7;
        }
        .pin {
          position: absolute;
          top: -6px;
          left: 50%;
          transform: translateX(-50%);
          width: 0; height: 0;
          border-left: 10px solid transparent;
          border-right: 10px solid transparent;
          border-bottom: 14px solid var(--accent);
          filter: drop-shadow(0 2px 0 rgba(0,0,0,0.4));
        }

        .info-line {
          margin: 10px auto 0;
          display: flex; align-items: center; gap: 8px;
          justify-content: center;
          max-width: 90%;
        }
        .dot { width: 4px; height: 4px; background: var(--border); border-radius: 999px; }

        .actions {
          display: flex;
          justify-content: center;
          margin-top: 10px;
        }

        .btn {
          background: linear-gradient(180deg, #1a2740, #131e33);
          border: 1px solid var(--border);
          color: var(--text);
          padding: 10px 16px;
          border-radius: 12px;
          cursor: pointer;
          user-select: none;
          white-space: nowrap;
        }
        .btn:hover { filter: brightness(1.06); }
        .btn:active { transform: translateY(1px); }
        .btn.sm { padding: 6px 10px; font-size: 13px; border-radius: 10px; }
        .btn.xs { padding: 5px 8px; font-size: 12px; border-radius: 10px; }
        .btn.ghost {
          background: transparent;
          border-style: dashed;
          opacity: 0.85;
        }

        .btns { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }

        .tabs {
          display: flex; gap: 10px; margin-bottom: 8px; flex-wrap: wrap;
        }
        .tab { font-size: 13px; color: var(--muted); display: flex; gap: 6px; align-items: center; }
        .tab input { accent-color: var(--accent2); }

        .table-fixed { table-layout: fixed; width: 100%; border-collapse: collapse; }
        .table-fixed thead th {
          position: sticky; top: 0;
          background: rgba(0,0,0,0.15);
          backdrop-filter: blur(2px);
          font-weight: 600;
        }
        th, td { border-bottom: 1px solid rgba(255,255,255,0.06); padding: 8px 6px; }
        .left { text-align: left; }

        .stack { display: flex; gap: 6px; flex-wrap: wrap; }

        .chipbar {
          display: flex; gap: 8px; flex-wrap: wrap;
          margin-top: 10px;
        }
        .chip {
          font-size: 12px;
          padding: 6px 10px;
          background: rgba(138,160,255,0.12);
          border: 1px solid var(--border);
          border-radius: 999px;
          white-space: nowrap;
        }

        /* Inputs / dropdowns stable borders (no width jump on focus/hover) */
        input, select, button {
          border-width: 1px;
          border-style: solid;
          border-color: var(--border);
        }
        input:focus, select:focus, button:focus {
          outline: 2px solid rgba(255,255,255,0.08);
          outline-offset: 0;
        }
      `}</style>
    </div>
  );
}
