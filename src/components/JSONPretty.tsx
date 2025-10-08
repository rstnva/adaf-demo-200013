'use client';

import React from 'react';

interface JSONPrettyProps {
  data: unknown;
  className?: string;
  maxHeight?: string;
}

/**
 * Componente para renderizar JSON de forma legible sin dependencias externas
 * Formateo simple con indentación y coloreado básico
 */
export function JSONPretty({ data, className = '', maxHeight = '300px' }: JSONPrettyProps) {
  const jsonString = React.useMemo(() => {
    try {
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return `Error formatting JSON: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }, [data]);

  return (
    <div 
      className={`bg-slate-50 border rounded-md p-3 ${className}`}
      style={{ maxHeight, overflowY: 'auto' }}
    >
      <pre className="text-xs font-mono whitespace-pre-wrap text-slate-800 leading-relaxed">
        {jsonString}
      </pre>
    </div>
  );
}

/**
 * Utilidad para copiar texto al portapapeles con toast feedback
 */
export async function copyToClipboard(text: string, successMessage = 'Copiado al portapapeles'): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      
      // Toast simple - en producción podrías usar una librería de toast
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-md shadow-lg z-50 transition-all duration-300';
      toast.textContent = successMessage;
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => document.body.removeChild(toast), 300);
      }, 2000);
      
      return true;
    } else {
      // Fallback para navegadores que no soportan clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (success) {
        // Toast feedback
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-md shadow-lg z-50';
        toast.textContent = successMessage;
        document.body.appendChild(toast);
        
        setTimeout(() => document.body.removeChild(toast), 2000);
      }
      
      return success;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    
    // Toast de error
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-md shadow-lg z-50';
    toast.textContent = 'Error al copiar';
    document.body.appendChild(toast);
    
    setTimeout(() => document.body.removeChild(toast), 2000);
    
    return false;
  }
}

/**
 * Utilidad para truncar hashes largos manteniendo inicio y final
 */
export function truncateHash(hash: string, keepStart = 6, keepEnd = 4): string {
  if (!hash || hash.length <= keepStart + keepEnd + 3) {
    return hash;
  }
  
  return `${hash.substring(0, keepStart)}…${hash.substring(hash.length - keepEnd)}`;
}