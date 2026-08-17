import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppShell from "@/components/app-shell/AppShell";
import ServiceWorkerRegister from "@/components/pwa/ServiceWorkerRegister";
import { AuthProvider } from "@/contexts/AuthContext";
import { SimulationProvider } from "@/modules/admin/contexts/SimulationContext";
import { PresenceZoneProvider } from "@/modules/presence/contexts/PresenceZoneContext";

export const viewport: Viewport = {
  themeColor: "#ff6e00",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "Seraing Buggy Club - SBC",
  description: "Système de présence et d'accès piste pour le Seraing Buggy Club (ASBL FBA)",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SBC App",
  },
  icons: {
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-background text-foreground selection:bg-primary selection:text-black">
        <ServiceWorkerRegister />
        <AuthProvider>
          <SimulationProvider>
            <PresenceZoneProvider>
              <AppShell>
                {children}
              </AppShell>
            </PresenceZoneProvider>
          </SimulationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
