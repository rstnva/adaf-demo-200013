import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { RBACProvider } from "@/contexts/RBACContext";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ADAF Dashboard Pro",
  description: "Advanced Algorithmic Digital Asset Framework - Professional Trading Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <RBACProvider permissions={["feature:wsp"]}>
          <Providers>{children}</Providers>
          <Toaster />
        </RBACProvider>
      </body>
    </html>
  );
}