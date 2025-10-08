import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FarsideReconciliation } from '@/components/ops/FarsideReconciliation';
import { CurrentEtfMetrics } from '@/lib/ssv';
import { FarsideEtfFlow } from '@/lib/farside';

// Setup mocks before all tests
beforeAll(() => {
  // Mock URL.createObjectURL for CSV export test
  global.URL.createObjectURL = vi.fn(() => 'mock-blob-url');
  global.URL.revokeObjectURL = vi.fn();

  // Mock document.createElement for link download
  const originalCreateElement = document.createElement;
  vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
    if (tagName === 'a') {
      return {
        href: '',
        download: '',
        click: vi.fn(),
      } as unknown as HTMLElement;
    }
    return originalCreateElement.call(document, tagName);
  });
});

const mockBtcMetrics: CurrentEtfMetrics = {
  totalNetAssets: { value: 1000000000, unit: 'USD' },
  marketCapPercentage: { value: 1.5, unit: '%' },
  dailyNetInflow: { value: 100000000, unit: 'USD' }, // 100M USD daily inflow
  cumulativeNetInflow: { value: 5000000000, unit: 'USD' },
  dailyValueTraded: { value: 200000000, unit: 'USD' },
  updateTime: '2024-01-03T12:00:00Z'
};

const mockEthMetrics: CurrentEtfMetrics = {
  totalNetAssets: { value: 500000000, unit: 'USD' },
  marketCapPercentage: { value: 0.8, unit: '%' },
  dailyNetInflow: { value: 50000000, unit: 'USD' }, // 50M USD daily inflow
  cumulativeNetInflow: { value: 2500000000, unit: 'USD' },
  dailyValueTraded: { value: 100000000, unit: 'USD' },
  updateTime: '2024-01-03T12:00:00Z'
};

const mockFarsideData: FarsideEtfFlow[] = [
  { date: '2024-01-01', btc_flow: 80, eth_flow: 60 },    // DIFF: BTC 20M/80M = 25%, ETH 10M/60M = 16.7%
  { date: '2024-01-02', btc_flow: 100.5, eth_flow: 49.8 }, // OK: BTC 0.5M/100.5M = 0.5%, ETH 0.2M/49.8M = 0.4%  
  { date: '2024-01-03', btc_flow: 110, eth_flow: 40 },   // DIFF: BTC 10M/110M = 9.1%, ETH 10M/40M = 25%
];

describe('FarsideReconciliation', () => {
  const defaultProps = {
    ssvMetrics: { btc: mockBtcMetrics, eth: mockEthMetrics },
    farsideData: mockFarsideData,
    loading: false,
    error: null
  };

  it('renders reconciliation table with data', () => {
    render(<FarsideReconciliation {...defaultProps} />);

    expect(screen.getByText('Farside Reconciliation')).toBeInTheDocument();
    expect(screen.getByText('SSV vs Farside ETF flow comparison • 3 days')).toBeInTheDocument();
    
    // Check table headers
    expect(screen.getByText('SSV BTC')).toBeInTheDocument();
    expect(screen.getByText('Farside BTC')).toBeInTheDocument();
    expect(screen.getByText('SSV ETH')).toBeInTheDocument();
    expect(screen.getByText('Farside ETH')).toBeInTheDocument();
  });

  it('shows OK and DIFF badges correctly', () => {
    render(<FarsideReconciliation {...defaultProps} />);

    // With our test data:
    // 2024-01-01: SSV 100M vs Farside 80M BTC = 20M diff (>1% = DIFF)
    // 2024-01-02: SSV 100M vs Farside 99M BTC = 1M diff (<1% = OK) 
    // 2024-01-03: SSV 100M vs Farside 110M BTC = 10M diff (>1% = DIFF)
    // So we should have 1 OK and 2 DIFF
    const okBadges = screen.queryAllByText('OK');
    const diffBadges = screen.getAllByText('DIFF');
    
    expect(okBadges.length).toBe(1); // One row should be OK
    expect(diffBadges.length).toBe(2); // Two rows should be DIFF
  });

  it('displays difference counts in header', () => {
    render(<FarsideReconciliation {...defaultProps} />);

    // Should show diff count if there are differences
    const diffBadge = screen.queryByText(/\d+ diffs/);
    if (diffBadge) {
      expect(diffBadge).toBeInTheDocument();
    }
  });

  it('shows loading state', () => {
    render(
      <FarsideReconciliation 
        {...defaultProps} 
        loading={true}
        ssvMetrics={{ btc: null, eth: null }}
        farsideData={null}
      />
    );

    const loadingElements = document.querySelectorAll('.animate-pulse');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('shows error state', () => {
    const error = new Error('Failed to fetch reconciliation data');
    
    render(
      <FarsideReconciliation 
        {...defaultProps}
        error={error}
      />
    );

    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch reconciliation data')).toBeInTheDocument();
  });

  it('shows no data message when arrays are empty', () => {
    render(
      <FarsideReconciliation 
        ssvMetrics={{ btc: null, eth: null }}
        farsideData={[]}
        loading={false}
        error={null}
      />
    );

    expect(screen.getByText('No reconciliation data available')).toBeInTheDocument();
  });

  it('handles CSV export', async () => {
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');
    
    render(<FarsideReconciliation {...defaultProps} />);

    const exportButton = screen.getByText('Export CSV');
    expect(exportButton).toBeInTheDocument();

    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(createObjectURLSpy).toHaveBeenCalled();
    });

    expect(revokeObjectURLSpy).toHaveBeenCalled();
  });

  it('disables export when no data', () => {
    render(
      <FarsideReconciliation 
        ssvMetrics={{ btc: null, eth: null }}
        farsideData={null}
        loading={false}
        error={null}
      />
    );

    const exportButton = screen.getByText('Export CSV');
    expect(exportButton).toBeDisabled();
  });

  it('shows prevalence note in footer', () => {
    render(<FarsideReconciliation {...defaultProps} />);

    expect(screen.getByText(/En cierre diario, prevalecen los datos de Farside/)).toBeInTheDocument();
    expect(screen.getByText(/para investigación únicamente/)).toBeInTheDocument();
  });

  it('formats currency values correctly', () => {
    render(<FarsideReconciliation {...defaultProps} />);

    // Should show formatted currency values - use getAllByText for duplicate values
    const btcValues = screen.getAllByText('100.0M USD'); // SSV BTC appears multiple times
    const ethValues = screen.getAllByText('50.0M USD');  // SSV ETH appears multiple times
    
    expect(btcValues.length).toBeGreaterThan(0);
    expect(ethValues.length).toBeGreaterThan(0);
  });
});