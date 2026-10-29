import type { Metadata } from "next";
import { CardsProvider } from "@/features/cards/CardsProvider";
import { RegisterSW } from "@/components/RegisterSW";
import { Shell } from "@/components/Shell";

export const metadata: Metadata = {
  title: "Strivr Card Folder",
  manifest: "/cards-manifest.webmanifest",
  appleWebApp: { capable: true, title: "Strivr Cards", statusBarStyle: "default" },
};

export default function CardsLayout({ children }: { children: React.ReactNode }) {
  return (
    <CardsProvider>
      <Shell>{children}</Shell>
      <RegisterSW />
    </CardsProvider>
  );
}
