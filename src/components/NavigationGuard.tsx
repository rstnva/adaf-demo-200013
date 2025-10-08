"use client"

import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { ArrowLeft, Save, X } from 'lucide-react'
import { useToast } from '@/hooks'

interface NavigationGuardProps {
  hasUnsavedChanges?: boolean
  onSave?: () => Promise<void> | void
  data?: any
  storageKey?: string
  showBackButton?: boolean
  backUrl?: string
  children?: React.ReactNode
}

export function NavigationGuard({ 
  hasUnsavedChanges = false, 
  onSave, 
  data,
  storageKey,
  children,
  showBackButton = true,
  backUrl 
}: NavigationGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()
  const [showExitDialog, setShowExitDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Auto-save data when it changes
  const autoSave = useCallback(async () => {
    if (data && storageKey) {
      try {
        const savedData = {
          data,
          timestamp: Date.now(),
          pathname,
          expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
        }
        localStorage.setItem(`adaf_autosave_${storageKey}`, JSON.stringify(savedData))
      } catch (error) {
        console.warn('Failed to auto-save data:', error)
      }
    }
  }, [data, storageKey, pathname])

  // Auto-save every 30 seconds if there are changes
  useEffect(() => {
    if (hasUnsavedChanges && data) {
      const interval = setInterval(autoSave, 30000)
      return () => clearInterval(interval)
    }
  }, [hasUnsavedChanges, data, autoSave])

  // Clean up expired auto-saves on mount
  useEffect(() => {
    const cleanExpiredData = () => {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('adaf_autosave_'))
      keys.forEach(key => {
        try {
          const saved = JSON.parse(localStorage.getItem(key) || '{}')
          if (saved.expiresAt && saved.expiresAt < Date.now()) {
            localStorage.removeItem(key)
          }
        } catch {
          localStorage.removeItem(key)
        }
      })
    }
    cleanExpiredData()
  }, [])

  // Handle browser back/forward/close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = '¿Desea salir sin guardar? Los datos se guardarán automáticamente.'
        autoSave() // Save before potentially leaving
      }
    }

    const handlePopState = (e: PopStateEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        setShowExitDialog(true)
        setPendingNavigation('back')
        // Push state back to prevent navigation
        window.history.pushState(null, '', window.location.href)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [hasUnsavedChanges, autoSave])

  const handleBackClick = () => {
    if (hasUnsavedChanges) {
      setShowExitDialog(true)
      setPendingNavigation(backUrl || 'back')
    } else {
      if (backUrl) {
        router.push(backUrl)
      } else {
        router.back()
      }
    }
  }

  const handleSaveAndExit = async () => {
    if (onSave) {
      setIsSaving(true)
      try {
        await onSave()
        toast({
          title: "Datos guardados",
          description: "Los datos se han guardado correctamente."
        })
      } catch (error) {
        toast({
          title: "Error al guardar",
          description: "No se pudieron guardar los datos. Se guardarán automáticamente.",
          variant: "destructive"
        })
      } finally {
        setIsSaving(false)
      }
    }
    
    // Always auto-save regardless of manual save result
    await autoSave()
    
    // Navigate
    setShowExitDialog(false)
    if (pendingNavigation === 'back') {
      router.back()
    } else if (pendingNavigation) {
      router.push(pendingNavigation)
    }
  }

  const handleExitWithoutSaving = async () => {
    // Still auto-save for recovery
    await autoSave()
    
    setShowExitDialog(false)
    if (pendingNavigation === 'back') {
      router.back()
    } else if (pendingNavigation) {
      router.push(pendingNavigation)
    }
  }

  const handleStay = () => {
    setShowExitDialog(false)
    setPendingNavigation(null)
  }

  return (
    <>
      {showBackButton && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackClick}
          className="mb-4 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Regresar
        </Button>
      )}

      {children}

      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <X className="w-5 h-5 text-destructive" />
              ¿Desea salir de esta página?
            </DialogTitle>
            <DialogDescription>
              Tienes cambios sin guardar. ¿Qué deseas hacer?
              <br />
              <span className="text-xs text-muted-foreground mt-2 block">
                💡 Los datos se guardan automáticamente cada 30 segundos y se conservan por 30 días.
              </span>
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleStay}>
              Quedarse
            </Button>
            <Button 
              variant="secondary" 
              onClick={handleExitWithoutSaving}
            >
              Salir sin guardar
            </Button>
            <Button 
              onClick={handleSaveAndExit}
              disabled={isSaving}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Guardando...' : 'Guardar y salir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Hook para usar la funcionalidad de navegación
export function useNavigationGuard(storageKey?: string) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [data, setData] = useState<any>(null)

  // Load auto-saved data on mount
  useEffect(() => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(`adaf_autosave_${storageKey}`)
        if (saved) {
          const parsedData = JSON.parse(saved)
          if (parsedData.expiresAt > Date.now()) {
            setData(parsedData.data)
            return parsedData.data
          } else {
            localStorage.removeItem(`adaf_autosave_${storageKey}`)
          }
        }
      } catch (error) {
        console.warn('Failed to load auto-saved data:', error)
      }
    }
    return null
  }, [storageKey])

  const updateData = useCallback((newData: any) => {
    setData(newData)
    setHasUnsavedChanges(true)
  }, [])

  const markAsSaved = useCallback(() => {
    setHasUnsavedChanges(false)
  }, [])

  const getSavedData = useCallback(() => {
    if (!storageKey) return null
    
    try {
      const saved = localStorage.getItem(`adaf_autosave_${storageKey}`)
      if (saved) {
        const parsedData = JSON.parse(saved)
        if (parsedData.expiresAt > Date.now()) {
          return parsedData.data
        } else {
          localStorage.removeItem(`adaf_autosave_${storageKey}`)
        }
      }
    } catch (error) {
      console.warn('Failed to get saved data:', error)
    }
    return null
  }, [storageKey])

  return {
    hasUnsavedChanges,
    setHasUnsavedChanges,
    data,
    updateData,
    markAsSaved,
    getSavedData
  }
}