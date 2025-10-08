import { describe, it, expect } from 'vitest';
import { wspI18n } from '@/components/dashboard/wsp/utils/i18n';

describe('WSP i18n Configuration', () => {
  describe('Translation keys coverage', () => {
    it('should have all required WSP translation keys', () => {
      // Test main title
      expect(wspI18n['wsp.title']).toBe('Wall Street Pulse');
      
      // Test component titles
      expect(wspI18n['wsp.etf.title']).toBe('Flujos ETF');
      expect(wspI18n['wsp.rates.title']).toBe('Tasas y Dólar');
      expect(wspI18n['wsp.indices.title']).toBe('Índices y Beta');
      expect(wspI18n['wsp.calendar.title']).toBe('Calendario de Catalizadores');
      expect(wspI18n['wsp.wsps.title']).toBe('WSPS Score');
      expect(wspI18n['wsp.events.title']).toBe('Señales Institucionales');
    });

    it('should have all action translation keys', () => {
      expect(wspI18n['wsp.actions.refresh']).toBe('Refrescar');
      expect(wspI18n['wsp.actions.snapshot']).toBe('Snapshot');
      expect(wspI18n['wsp.actions.plan']).toBe('Plan simulado');
    });

    it('should have status color translation keys', () => {
      expect(wspI18n['wsp.status.green']).toBe('Verde');
      expect(wspI18n['wsp.status.yellow']).toBe('Amarillo');
      expect(wspI18n['wsp.status.red']).toBe('Rojo');
    });

    it('should have event type translation keys', () => {
      expect(wspI18n['wsp.event.flushRebound']).toBe('Flush-Rebound');
      expect(wspI18n['wsp.event.basisClean']).toBe('Basis Clean');
      expect(wspI18n['wsp.event.reduceLeverage']).toBe('Reduce Leverage');
      expect(wspI18n['wsp.event.rotateRwa']).toBe('Rotar a RWA');
    });

    it('should have banner message translation keys', () => {
      expect(wspI18n['wsp.banner.flushRebound']).toBe('Señal: Flush-Rebound');
      expect(wspI18n['wsp.banner.basisClean']).toBe('Señal: Basis Clean');
      expect(wspI18n['wsp.banner.reduceLeverage']).toBe('Señal: Reducir Apalancamiento');
      expect(wspI18n['wsp.banner.rotateRwa']).toBe('Señal: Rotar a RWA');
    });

    it('should have system and UI translation keys', () => {
      expect(wspI18n['wsp.guardrails.active']).toBe('Guardrails activos');
      expect(wspI18n['wsp.note.semaforo']).toBe('Semáforo LAV');
      expect(wspI18n['wsp.rbac.denied']).toBe('No tienes acceso a Wall Street Pulse.');
      expect(wspI18n['wsp.score.breakdown']).toBe('Desglose del score');
    });

    it('should have checklist translation keys', () => {
      expect(wspI18n['wsp.checklist.title']).toBe('Checklist ADAF');
      expect(wspI18n['wsp.checklist.slippage']).toBe('Slippage ≤ 0.5%');
      expect(wspI18n['wsp.checklist.ltv']).toBe('LTV ≤ 35%');
    });
  });

  describe('Translation object structure', () => {
    it('should be a valid object with string values', () => {
      expect(typeof wspI18n).toBe('object');
      expect(wspI18n).not.toBeNull();
      
      // Verify all values are strings
      Object.values(wspI18n).forEach(value => {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      });
    });

    it('should have consistent key naming pattern', () => {
      const keys = Object.keys(wspI18n);
      
      // All keys should start with 'wsp.'
      keys.forEach(key => {
        expect(key).toMatch(/^wsp\./);
      });
      
      // Should have at least the expected number of keys
      expect(keys.length).toBeGreaterThanOrEqual(20);
    });

    it('should have proper Spanish translations', () => {
      // Verify Spanish-specific characteristics
      const spanishTexts = Object.values(wspI18n);
      
      // Check for Spanish accented characters
      const hasSpanishChars = spanishTexts.some(text => 
        /[áéíóúñü]/i.test(text)
      );
      
      // Should contain some Spanish-specific words
      const spanishWords = ['Tasas', 'Dólar', 'Índices', 'Calendario', 'Señales'];
      spanishWords.forEach(word => {
        const hasWord = spanishTexts.some(text => text.includes(word));
        expect(hasWord).toBe(true);
      });
    });

    it('should support dynamic key access patterns', () => {
      // Test dynamic key access
      const dynamicKey1 = 'wsp.title';
      const dynamicKey2 = 'wsp.status.green';
      
      expect(wspI18n[dynamicKey1 as keyof typeof wspI18n]).toBe('Wall Street Pulse');
      expect(wspI18n[dynamicKey2 as keyof typeof wspI18n]).toBe('Verde');
      
      // Test key existence checking
      expect('wsp.title' in wspI18n).toBe(true);
      expect('nonexistent.key' in wspI18n).toBe(false);
    });
  });
});