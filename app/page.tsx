'use client';

import React from 'react';

/** Stub widgets — keep your real components here */
function RulesCard() {
  return (
    <div className="panel">
      <h3 className="panel-title">Qoidalar (tanga olish)</h3>
      <ul className="list-disc pl-5 space-y-1 text-sm opacity-90">
        <li>Onlayn 300.000 so‘m = 10 tanga</li>
        <li>Oflayn 1.000.000 so‘m = 10 tanga</li>
      </ul>
      <p className="mt-2 text-xs opacity-70">
        Admin bu ro‘yxatni kerak bo‘lsa keyin kengaytirishi mumkin.
      </p>
    </div>
  );
}

function LastFivePrizes() {
  return (
    <div className="panel">
      <h3 className="panel-title">Oxirgi 5 yutuq</h3>
      <p className="text-sm opacity-80">Hali yutuqlar ro‘yxati yo‘q.</p>
      <p className="mt-2 text-xs opacity-60">Ro‘yxat har 4 soniyada yangilanadi.</p>
    </div>
  );
}

function WheelBlock() {
  return (
    <div className="panel center-panel">
      <div className="flex items-center justify-center gap-2 mb-4">
        <button className="chip">50 tanga</button>
        <button className="chip">100 tanga</button>
        <button className="chip">200 tanga</button>
        {/* add 500 tanga later if needed */}
      </div>

      {/* your wheel component goes here */}
      <div className="mx-auto mb-4 aspect-square rounded-full bg-white/95 text-black w-[420px] max-w-[80vw] flex items-center justify-center">
        <span className="font-semibold">WHEEL</span>
      </div>

      <div className="text-center text-sm opacity-80">Balans: 0 tanga</div>

      <div className="mt-3 flex justify-center">
        <button className="btn-main">Spin (-50)</button>
      </div>

      {/* dropdown is inside a fixed-width wrapper to avoid layout widening */}
      <div className="mt-4 dropdown-wrap">
        <button className="dropdown-button">Barcha sovg‘alar (narxlari bilan) ▼</button>
        {/* place your menu as absolute here */}
        {/* <div className="dropdown-menu"> ... </div> */}
      </div>
    </div>
  );
}

function ParticipantsBalance() {
  return (
    <div className="panel">
      <h3 className="panel-title">Ishtirokchilar balansi</h3>
      <ul className="text-sm space-y-2">
        {['Sabina','Sabrina','Oyshaxon','Marg‘uba','Zilola','Mohinur'].map(n => (
          <li key={n} className="flex justify-between">
            <span className="italic">{n}</span>
            <span>0</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs opacity-60">Ro‘yxat har 3 soniyada yangilanadi.</p>
    </div>
  );
}

function StorePanel() {
  return (
    <div className="panel store-panel">
      <h3 className="panel-title">Do‘kon (sotib olish)</h3>
      <p className="text-sm opacity-80">Hozircha bo‘sh.</p>
    </div>
  );
}

export default function Page() {
  return (
    <main className="page-shell">
      {/* Desktop grid: 320 / 560 / 320; gaps don’t change */}
      <div className="desktop-grid">
        <div className="left-col">
          <RulesCard />
          <LastFivePrizes />
        </div>

        <div className="center-col">
          <WheelBlock />
        </div>

        <div className="right-col">
          <ParticipantsBalance />
          <StorePanel />
        </div>
      </div>
    </main>
  );
}
