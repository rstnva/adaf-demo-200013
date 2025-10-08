"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { usePlan } from "@/lib/state/usePlan"

export function PresetsDrawer() {
  const { presets, confirm } = usePlan()
  const [isOpen, setIsOpen] = useState(false)

  const handleConfirm = () => {
    confirm()
    setIsOpen(false)
    // toast simple: alert como fallback sin dependencias
    alert("Plan confirmado")
  }

  const handleExport = () => {
    const plan = { presets }
    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'execution-plan.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline">Ver Presets de Ejecución</Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Presets de Ejecución</DrawerTitle>
            <DrawerDescription>
              Estrategias disponibles para tu plan actual.
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 pb-0 space-y-4">
            {presets.map((preset) => (
              <Card key={preset.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{preset.name}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">APY:</span>
                    <span className="font-semibold text-green-600">{preset.apy}%</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-muted-foreground">Costos:</span>
                    <span className="font-semibold">{preset.costos}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <DrawerFooter className="grid grid-cols-2 gap-2">
            <Button onClick={handleConfirm} className="w-full">
              Confirmar
            </Button>
            <Button variant="outline" onClick={handleExport} className="w-full">
              Exportar
            </Button>
            <DrawerClose asChild>
              <Button variant="ghost" className="col-span-2">Cerrar</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}