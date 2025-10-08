import { test, expect } from '@playwright/test';

test.describe('WSP E2E', () => {
  test.use({ baseURL: 'http://localhost:3005' });

  test('RBAC gating', async ({ page }) => {
    // without permission
    await page.addInitScript(() => {
      localStorage.setItem('rbac-perms', JSON.stringify([]));
    });
    await page.goto('/wallstreet');
    await expect(page.getByText('No tienes acceso a Wall Street Pulse.')).toBeVisible();
    // with permission
    await page.addInitScript(() => {
      localStorage.setItem('rbac-perms', JSON.stringify(['feature:wsp']));
    });
    await page.goto('/wallstreet');
    await expect(page.getByText('Wall Street Pulse')).toBeVisible();
  });

  test('DnD persistent', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('rbac-perms', JSON.stringify(['feature:wsp']));
    });
    await page.goto('/wallstreet');
    // This is placeholder: widget handles depend on actual markup
    // You can update selectors to match widget cards
    // Persist check
    await page.reload();
    await expect(page).toHaveURL(/wallstreet/);
  });

  test('Signals and stale badge', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('rbac-perms', JSON.stringify(['feature:wsp']));
    });
    // Mock network to force signals and stale
    await page.route('**/api/wsp/indices', route => {
      route.fulfill({ json: { spx: 5000, ndx: 17000, vix: 22, ts: Date.now() }, headers: { 'X-WSP-Data': '' } });
    });
    await page.route('**/api/wsp/etf**', route => {
      route.fulfill({ json: [{ date: '2025-10-06', asset: 'BTC', netFlowUSD: 20_000_000 }], headers: { 'X-WSP-Data': '' } });
    });
    await page.route('**/api/wsp/wsps', route => {
      route.fulfill({ json: { score: 45, color: 'yellow', factors: [], smoothing: { ema: true, hysteresis: { bandMargin: 3 } }, normalization: { source: 'fallback' } } });
    });
    await page.route('**/api/wsp/calendar**', route => {
      route.fulfill({ json: [{ kind: 'FOMC', importance: 'high' }] });
    });
    await page.goto('/wallstreet');
    // Expect at least one banner
    await expect(page.getByText('Señal:')).toBeVisible();
    // Stale badge when we force header
    await page.route('**/api/wsp/etf**', route => {
      route.fulfill({ json: [{ date: '2025-10-06', asset: 'BTC', netFlowUSD: 10 }], headers: { 'X-WSP-Data': 'stale' } });
    });
    await page.reload();
    await expect(page.getByText('Datos en modo contingencia')).toBeVisible();
  });
});
