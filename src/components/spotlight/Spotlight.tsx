'use client';

import { Fragment } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useSpotlight } from '@/hooks/useSpotlight';
import { SpotlightCommand } from '@/lib/ux/commands';
import { formatDistanceToNow } from 'date-fns';
import { 
  Search,
  Loader2,
  Clock,
  ArrowRight,
  Command
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Etiquetas y colores de categorías
const CATEGORY_CONFIG = {
  goto: { label: 'Ir A', color: 'bg-blue-100 text-blue-800' },
  run: { label: 'Ejecutar', color: 'bg-green-100 text-green-800' },
  entities: { label: 'Entidades', color: 'bg-purple-100 text-purple-800' },
  docs: { label: 'Docs', color: 'bg-orange-100 text-orange-800' },
  hashes: { label: 'Hash', color: 'bg-gray-100 text-gray-800' },
} as const;

interface SpotlightResultProps {
  command: SpotlightCommand;
  isSelected: boolean;
  onClick: () => void;
}

function SpotlightResult({ command, isSelected, onClick }: SpotlightResultProps) {
  const category = CATEGORY_CONFIG[command.category];
  const Icon = command.icon;
  
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
        'hover:bg-gray-50 focus:bg-gray-50 focus:outline-none',
        isSelected && 'bg-blue-50 border border-blue-200'
      )}
      onClick={onClick}
      role="option"
      aria-selected={isSelected}
      tabIndex={-1}
    >
      {/* Icon */}
      <div className={cn(
        'flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center',
        'bg-gray-100 text-gray-600'
      )}>
        <Icon className="h-4 w-4" />
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {command.title}
          </h3>
          <Badge 
            variant="secondary" 
            className={cn('text-xs', category.color)}
          >
            {category.label}
          </Badge>
        </div>
        
        {command.subtitle && (
          <p className="text-xs text-gray-500 truncate">
            {command.subtitle}
          </p>
        )}
        
        {command.asOf && (
          <div className="flex items-center gap-1 mt-1">
            <Clock className="h-3 w-3 text-gray-400" />
            <span className="text-xs text-gray-400">
              {formatDistanceToNow(new Date(command.asOf), { addSuffix: true })}
            </span>
          </div>
        )}
      </div>
      
      {/* Action indicator */}
      <div className="flex-shrink-0">
        {isSelected && (
          <ArrowRight className="h-4 w-4 text-blue-600" />
        )}
      </div>
    </div>
  );
}

interface SpotlightProps {
  className?: string;
}

export function Spotlight({ className }: SpotlightProps) {
  const {
    isOpen,
    query,
    selectedIndex,
    isLoading,
    commands,
    closeSpotlight,
    setQuery,
    executeCommand,
  } = useSpotlight();

  // Group commands by category for better visual organization
  const groupedCommands = commands.reduce((groups, command, index) => {
    const category = command.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push({ ...command, originalIndex: index });
    return groups;
  }, {} as Record<string, Array<SpotlightCommand & { originalIndex: number }>>);

  // Category order for display
  const categoryOrder: Array<keyof typeof CATEGORY_CONFIG> = ['goto', 'run', 'entities', 'docs', 'hashes'];
  const visibleCategories = categoryOrder.filter(cat => groupedCommands[cat]?.length > 0);

  return (
    <Dialog open={isOpen} onOpenChange={closeSpotlight}>
      <DialogContent 
        className={cn(
          'max-w-2xl p-0 gap-0 overflow-hidden',
          'focus:outline-none',
          className
        )}
        role="dialog"
        aria-label="Spotlight Search"
        aria-modal="true"
      >
        {/* Encabezado de Búsqueda */}
        <div className="border-b border-gray-200 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Buscar comandos, ir a páginas, ejecutar acciones..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-10 border-0 focus:ring-0 text-base"
              autoFocus
              role="combobox"
              aria-label="Buscar comandos"
              aria-autocomplete="list"
              aria-expanded={commands.length > 0}
              aria-controls="spotlight-results"
            />
            {isLoading && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
            )}
          </div>
        </div>

        {/* Resultados */}
        <div 
          className="max-h-96 overflow-y-auto p-2"
          id="spotlight-results"
          role="listbox"
          aria-label="Resultados de búsqueda"
        >
          {commands.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {query.trim() ? 'No se encontraron resultados' : 'Empieza a escribir para buscar...'}
            </div>
          ) : (
            <div className="space-y-1">
              {visibleCategories.map(category => (
                <Fragment key={category}>
                  {visibleCategories.length > 1 && (
                    <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {CATEGORY_CONFIG[category].label}
                    </div>
                  )}
                  {groupedCommands[category].map(command => (
                    <SpotlightResult
                      key={command.id}
                      command={command}
                      isSelected={selectedIndex === command.originalIndex}
                      onClick={() => executeCommand(command)}
                    />
                  ))}
                </Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-4 py-3 text-xs text-gray-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border text-xs">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border text-xs">↓</kbd>
                <span>navigate</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border text-xs">Enter</kbd>
                <span>select</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border text-xs">Esc</kbd>
                <span>close</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-gray-400">
              <Command className="h-3 w-3" />
              <span>Spotlight</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Provider component to include Spotlight in the app
export function SpotlightProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Spotlight />
    </>
  );
}