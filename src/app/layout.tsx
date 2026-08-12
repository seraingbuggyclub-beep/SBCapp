import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/app-shell/navbar";

import { SimulationProvider } from "@/modules/admin/contexts/SimulationContext";

export const metadata: Metadata = {
  title: "Seraing Buggy Club - SBC",
  description: "Système de présence et d'accès piste pour le Seraing Buggy Club (ASBL FBA)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-background text-foreground selection:bg-primary selection:text-black">
        <SimulationProvider>
          <div className="flex flex-col min-h-screen">
            {/* Top Navbar */}
            <Navbar />
            
            {/* Main App Body */}
            <div className="flex flex-col flex-1">
              {/* Page Content - Edge-to-edge for full-width components */}
              <main className="flex-1">
                {children}
              </main>
            </div>
          </div>
        </SimulationProvider>
      </body>
    </html>
  );
}
