"use client";
// Store/context para Wall Street Pulse (Zustand o Context API)
import { useState } from 'react';
export function useWallStreetPulse() {
  // TODO: Integrar con DashboardLayoutContext y persistencia localStorage
  const [layout, setLayout] = useState([]);
  return { layout, setLayout };
}
