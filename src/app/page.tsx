'use client';

import { DashboardLayoutProvider } from '@/contexts/DashboardLayoutContext';
import { DashboardLayoutContainer } from '@/components/dashboard/DashboardLayoutContainer';
import { DashboardControls } from '@/components/dashboard/DashboardControls';
import { HotkeyProvider } from '@/components/providers/hotkey-provider';
import { SpotlightProvider } from '@/components/spotlight/Spotlight';
import { TopBar } from '@/components/layout/TopBar';
import { NavLeft } from '@/components/layout/NavLeft';

export default function HomePage() {
  return (
    <HotkeyProvider context="global">
      <SpotlightProvider>
        <DashboardLayoutProvider>
          <div className="min-h-screen bg-gray-50 font-sans antialiased">
            <div className="flex h-screen">
              {/* Left Navigation */}
              <NavLeft />
              
              {/* Main Content Area */}
              <div className="flex flex-1 flex-col overflow-hidden">
                {/* Top Bar with Dashboard Controls */}
                <TopBar>
                  <DashboardControls />
                </TopBar>
                
                {/* Page Content */}
                <main className="flex-1 overflow-y-auto">
                  <div className="container mx-auto px-6 py-8">
                    {/* Page Header */}
                    <div className="mb-8">
                      <h1 className="text-3xl font-bold tracking-tight">ADAF Dashboard Pro</h1>
                      <p className="text-gray-600 mt-2">
                        Inteligencia de Mercados • Gestión de Riesgos • Optimización de Estrategias
                      </p>
                    </div>

                    {/* Draggable Dashboard Layout */}
                    <DashboardLayoutContainer />
                  </div>
                </main>
              </div>
            </div>
          </div>
        </DashboardLayoutProvider>
      </SpotlightProvider>
    </HotkeyProvider>
  );
}