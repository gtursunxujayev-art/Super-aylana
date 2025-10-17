import "./globals.css";

export const metadata = { title: "Super Aylana" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 flex justify-center">
        <main className="max-w-4xl w-full p-6">{children}</main>
      </body>
    </html>
  );
}
