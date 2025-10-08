"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    const root = document.documentElement
    if (enabled) {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
  }, [enabled])

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground">Theme</span>
      <Button variant="outline" size="sm" onClick={() => setEnabled((v) => !v)}>
        {enabled ? "Dark" : "Light"}
      </Button>
    </div>
  )
}
