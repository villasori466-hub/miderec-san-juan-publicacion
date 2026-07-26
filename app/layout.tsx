import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Barlow_Condensed, Geist, Geist_Mono, Sora } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const publicDisplay = Barlow_Condensed({
  variable: "--font-public-display",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
});

const publicBody = Sora({
  variable: "--font-public-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const viewport: Viewport = {
  themeColor: "#03132f",
};

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    metadataBase: new URL(origin),
    title: "MIDEREC | Dirección Provincial San Juan",
    description:
      "Noticias, actividades, fotos, videos y oportunidades deportivas de la provincia San Juan.",
    applicationName: "MIDEREC San Juan",
    keywords: [
      "MIDEREC",
      "San Juan",
      "deportes",
      "República Dominicana",
      "actividades deportivas",
    ],
    icons: {
      icon: "/miderec-logo.svg",
      shortcut: "/miderec-logo.svg",
    },
    manifest: "/manifest.webmanifest",
    openGraph: {
      type: "website",
      locale: "es_DO",
      url: origin,
      siteName: "MIDEREC — Dirección Provincial San Juan",
      title: "El deporte nos une. San Juan se mueve.",
      description:
        "El punto de encuentro para la actualidad deportiva de la provincia San Juan.",
      images: [
        {
          url: `${origin}/og-v4.jpg`,
          width: 1731,
          height: 909,
          alt: "MIDEREC Dirección Provincial San Juan — El deporte nos une. San Juan se mueve.",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "MIDEREC — Dirección Provincial San Juan",
      description: "El deporte nos une. San Juan se mueve.",
      images: [`${origin}/og-v4.jpg`],
    },
  };
}

const structuredData = {
  "@context": "https://schema.org",
  "@type": "GovernmentOrganization",
  name: "MIDEREC — Dirección Provincial San Juan",
  alternateName: "Ministerio de Deportes y Recreación, Provincia San Juan",
  slogan: "San Juan se mueve",
  areaServed: "Provincia San Juan, República Dominicana",
  parentOrganization: {
    "@type": "GovernmentOrganization",
    name: "Ministerio de Deportes y Recreación (MIDEREC)",
    url: "https://miderec.gob.do",
  },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+1-809-284-7909",
    email: "luisdelcristosantiago@gmail.com",
    contactType: "customer service",
    availableLanguage: "es",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} ${publicDisplay.variable} ${publicBody.variable}`}>
        <link rel="preload" as="image" href="/hero-deporte.webp" fetchPriority="high" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {children}
      </body>
    </html>
  );
}
