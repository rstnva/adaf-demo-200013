import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EtfMetricsCard } from '@/components/ssv/EtfMetricsCard';
import { CurrentEtfMetrics } from '@/lib/ssv';

const mockMetrics: CurrentEtfMetrics = {
  totalNetAssets: { value: 50e9, unit: 'USD' },
  marketCapPercentage: { value: 2.5, unit: '%' },
  btcHoldings: { value: 800000, unit: 'BTC' },
  dailyNetInflow: { value: 150e6, unit: 'USD' },
  cumulativeNetInflow: { value: 5e9, unit: 'USD' },
  dailyValueTraded: { value: 2e9, unit: 'USD' },
  updateTime: new Date('2024-01-01T10:00:00Z').toISOString()
};

describe('EtfMetricsCard', () => {
  it('renders BTC metrics correctly', () => {
    render(
      <EtfMetricsCard 
        type="us-btc-spot" 
        data={mockMetrics} 
        loading={false} 
        error={null} 
      />
    );

    expect(screen.getByText('US Bitcoin Spot ETFs')).toBeInTheDocument();
    expect(screen.getByText('Total Net Assets')).toBeInTheDocument();
    expect(screen.getByText('BTC Holdings')).toBeInTheDocument();
    expect(screen.getByText('50.0B USD')).toBeInTheDocument();
    expect(screen.getByText('800.0K BTC')).toBeInTheDocument();
  });

  it('renders ETH metrics correctly', () => {
    const ethMetrics = {
      ...mockMetrics,
      ethHoldings: { value: 5000000, unit: 'ETH' },
      btcHoldings: undefined
    };

    render(
      <EtfMetricsCard 
        type="us-eth-spot" 
        data={ethMetrics} 
        loading={false} 
        error={null} 
      />
    );

    expect(screen.getByText('US Ethereum Spot ETFs')).toBeInTheDocument();
    expect(screen.getByText('ETH Holdings')).toBeInTheDocument();
    expect(screen.getByText('5.0M ETH')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <EtfMetricsCard 
        type="us-btc-spot" 
        data={null} 
        loading={true} 
        error={null} 
      />
    );

    expect(screen.getByText('Loading')).toBeInTheDocument();
    // Check for loading skeletons
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows error state', () => {
    const error = new Error('API rate limit exceeded');
    
    render(
      <EtfMetricsCard 
        type="us-btc-spot" 
        data={null} 
        loading={false} 
        error={error} 
      />
    );

    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('API rate limit exceeded')).toBeInTheDocument();
  });

  it('shows trend colors for inflows', () => {
    const positiveInflowMetrics = {
      ...mockMetrics,
      dailyNetInflow: { value: 100e6, unit: 'USD' },
      cumulativeNetInflow: { value: 2e9, unit: 'USD' }
    };

    render(
      <EtfMetricsCard 
        type="us-btc-spot" 
        data={positiveInflowMetrics} 
        loading={false} 
        error={null} 
      />
    );

    // Should show positive (green) trend for inflows - check the actual text element
    const inflowElement = screen.getByText('100.0M USD');
    expect(inflowElement).toHaveClass('text-green-400');
  });

  it('shows "—" for null data without loading', () => {
    render(
      <EtfMetricsCard 
        type="us-btc-spot" 
        data={null} 
        loading={false} 
        error={null} 
      />
    );

    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('renders update time correctly', () => {
    render(
      <EtfMetricsCard 
        type="us-btc-spot" 
        data={mockMetrics} 
        loading={false} 
        error={null} 
      />
    );

    // Should show the formatted update time
    expect(screen.getByText(/Updated:/)).toBeInTheDocument();
  });
});