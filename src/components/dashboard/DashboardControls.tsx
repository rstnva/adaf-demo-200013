'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDashboardLayout } from '@/contexts/DashboardLayoutContext';
import { 
  Settings, 
  Edit3, 
  Save, 
  RotateCcw, 
  Grip,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function DashboardControls() {
  const { isEditMode, setEditMode, resetLayout } = useDashboardLayout();

  return (
    <div className="flex items-center gap-3">
      {/* Edit Mode Toggle */}
      <Button
        variant={isEditMode ? 'default' : 'outline'}
        size="sm"
        onClick={() => setEditMode(!isEditMode)}
        className={cn(
          'flex items-center gap-2',
          isEditMode && 'bg-blue-600 hover:bg-blue-700'
        )}
      >
        {isEditMode ? (
          <>
            <Save className="h-4 w-4" />
            Guardar Layout
          </>
        ) : (
          <>
            <Edit3 className="h-4 w-4" />
            Personalizar
          </>
        )}
      </Button>

      {/* Status Badge */}
      {isEditMode && (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Grip className="h-3 w-3" />
          Modo Edición
        </Badge>
      )}

      {/* Layout Options Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            onClick={() => setEditMode(!isEditMode)}
            className="flex items-center gap-2"
          >
            {isEditMode ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                Salir del Modo Edición
              </>
            ) : (
              <>
                <Edit3 className="h-4 w-4" />
                Activar Modo Edición
              </>
            )}
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            onClick={resetLayout}
            className="flex items-center gap-2 text-orange-600"
          >
            <RotateCcw className="h-4 w-4" />
            Restaurar Layout Original
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <div className="px-2 py-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1 mb-1">
              <Grip className="h-3 w-3" />
              Instrucciones:
            </div>
            <ul className="space-y-1 text-xs">
              <li>• Arrastra las tarjetas para reordenar</li>
              <li>• Los cambios se guardan automáticamente</li>
              <li>• Usa el icono de agarre en cada tarjeta</li>
            </ul>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}