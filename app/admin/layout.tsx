import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Panel de administración | MIDEREC San Juan",
  description: "Superficie privada para gestionar la agenda deportiva provincial.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
