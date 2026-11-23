import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter, Merriweather } from "next/font/google";
import { ESCOLA_IDENTIDADE_PADRAO } from "@/lib/escola";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    default: `DecideAI — ${ESCOLA_IDENTIDADE_PADRAO.nomeCompleto}`,
    template: `%s | DecideAI — ${ESCOLA_IDENTIDADE_PADRAO.nomeCurto}`,
  },
  description: `Sistema Oficial de Eleição de Chapas do Grêmio Estudantil da ${ESCOLA_IDENTIDADE_PADRAO.nomeCompleto} (${ESCOLA_IDENTIDADE_PADRAO.cidade}).`,
  manifest: "/manifest.json",
  applicationName: `DecideAI — ${ESCOLA_IDENTIDADE_PADRAO.nomeCurto}`,
};

export const viewport: Viewport = {
  themeColor: "#004ac6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${plusJakarta.variable} ${inter.variable} ${merriweather.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#f8f9ff] dark:bg-slate-950 text-[#0b1c30] dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}
