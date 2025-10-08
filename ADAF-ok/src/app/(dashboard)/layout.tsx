import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import QueryProvider from "@/components/providers/query-provider";
import { TopBar } from "@/components/layout/TopBar";
import { NavLeft } from "@/components/layout/NavLeft";

const inter = Inter({ subsets: ["latin"] });

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <div className={cn("min-h-screen bg-gray-50 font-sans antialiased", inter.className)}>
        <div className="flex h-screen">
          {/* Left Navigation */}
          <NavLeft />
          
          {/* Main Content Area */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Top Bar */}
            <TopBar />
            
            {/* Page Content */}
            <main className="flex-1 overflow-y-auto">
              <div className="container mx-auto px-6 py-8">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </QueryProvider>
  );
}