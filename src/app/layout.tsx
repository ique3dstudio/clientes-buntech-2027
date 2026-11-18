import type { Metadata, Viewport } from "next";
import "./globals.css";
import { OfflineSync } from "@/components/OfflineSync";

export const metadata: Metadata = {
  title: { default: "Buntech Agro · Mapa de Clientes", template: "%s · Buntech Agro" },
  description: "App oficial de prospecção de clientes Buntech Agro 2027",
  applicationName: "Buntech Clientes",
  appleWebApp: { capable: true, title: "Buntech Clientes", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#0891d1",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full flex flex-col">{children}
        <OfflineSync />
      </body>
    </html>
  );
}
