export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[70vh] w-full flex items-center justify-center px-4 pt-6">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 shadow-lg">
        {children}
      </div>
    </div>
  );
}
