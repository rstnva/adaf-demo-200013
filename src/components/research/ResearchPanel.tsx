'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { CalendarDays, Play, TrendingUp, AlertCircle, Camera, BarChart3 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { BacktestList } from './BacktestList';
import { EquityChart } from './EquityChart';
import { MonthlyPnLChart } from './MonthlyPnLChart';
import { CompareDrawer } from './CompareDrawer';

import { ResearchApi, ResearchApiError, STRATEGY_PRESETS, AGENT_OPTIONS, BENCHMARK_OPTIONS } from '@/lib/research/api';
import { BacktestConfig, Backtest, CreateBacktestRequest, RunBacktestRequest, PromoteBacktestRequest } from '@/types/research';
import { createSnapshot, getAllSnapshots } from '@/lib/research/snapshots';

/**
 * Main research panel component with configuration, execution, and visualization
 */
export function ResearchPanel() {
  // Configuration state
  const [config, setConfig] = useState<Partial<BacktestConfig>>({
    name: '',
    agents: [],
    rules: [{ expr: '', weight: 1, description: '' }],
    window: {
      from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      to: new Date().toISOString().split('T')[0]
    },
    benchmark: 'BTC',
    sizing: { notionalPctNAV: 0.1 },
    feesBps: 5,
    slippageBps: 3,
    rebalanceDays: 1
  });

  // UI state
  const [isCreating, setIsCreating] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);
  const [selectedBacktest, setSelectedBacktest] = useState<Backtest | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Snapshot state
  const [isCompareDrawerOpen, setIsCompareDrawerOpen] = useState(false);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);

  // Validate configuration on changes
  useEffect(() => {
    if (config.name || config.agents?.length || config.rules?.some(r => r.expr)) {
      const { valid, errors } = ResearchApi.validateConfig(config as BacktestConfig);
      setValidationErrors(valid ? [] : errors);
    } else {
      setValidationErrors([]);
    }
  }, [config]);

  /**
   * Handle strategy preset selection
   */
  const handlePresetSelection = (presetKey: keyof typeof STRATEGY_PRESETS) => {
    const preset = STRATEGY_PRESETS[presetKey];
    setConfig(prev => ({
      ...prev,
      name: preset.name,
      agents: preset.agents,
      rules: preset.rules,
      benchmark: preset.benchmark
    }));
    toast.success(`Se aplicó preset ${preset.name}`);
  };

  /**
   * Handle agent selection
   */
  const handleAgentToggle = (agentCode: string) => {
    setConfig(prev => ({
      ...prev,
      agents: prev.agents?.includes(agentCode)
        ? prev.agents.filter(a => a !== agentCode)
        : [...(prev.agents || []), agentCode]
    }));
  };

  /**
   * Handle rule changes
   */
  const handleRuleChange = (index: number, field: keyof typeof config.rules[0], value: string | number) => {
    setConfig(prev => ({
      ...prev,
      rules: prev.rules?.map((rule, i) => 
        i === index ? { ...rule, [field]: value } : rule
      ) || []
    }));
  };

  /**
   * Add new rule
   */
  const addRule = () => {
    setConfig(prev => ({
      ...prev,
      rules: [...(prev.rules || []), { expr: '', weight: 1, description: '' }]
    }));
  };

  /**
   * Remove rule
   */
  const removeRule = (index: number) => {
    if (config.rules && config.rules.length > 1) {
      setConfig(prev => ({
        ...prev,
        rules: prev.rules?.filter((_, i) => i !== index) || []
      }));
    }
  };

  /**
   * Create backtest configuration
   */
  const handleCreate = async () => {
    try {
      setIsCreating(true);

      const request: CreateBacktestRequest = {
        config: config as BacktestConfig,
        actor: 'ui@adaf.com'
      };

      const response = await ResearchApi.createBacktest(request);
      
      if (response.success && response.id) {
        toast.success(`Backtest creado #${response.id}: ${config.name}`);
        setRefreshKey(prev => prev + 1); // Trigger backtest list refresh
      } else {
        throw new Error(response.error || 'Error al crear backtest');
      }

    } catch (error) {
      console.error('Error crear backtest:', error);
      const message = error instanceof ResearchApiError 
        ? error.message 
        : 'Error al crear backtest';
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Run backtest execution
   */
  const handleRun = async () => {
    if (!selectedBacktest) {
      toast.error('Please select a backtest to run');
      return;
    }

    try {
      setIsRunning(true);

      const request: RunBacktestRequest = {
        id: selectedBacktest.id,
        actor: 'ui@adaf.com'
      };

      toast.loading('Running backtest...', { id: 'backtest-run' });

      const response = await ResearchApi.runBacktest(request);
      
      if (response.success && response.status === 'done') {
        toast.success(
          `Backtest completed in ${(response.durationMs || 0) / 1000}s`, 
          { id: 'backtest-run' }
        );
        
        // Refresh backtest details
        const detailResponse = await ResearchApi.getBacktest(selectedBacktest.id);
        if (detailResponse.success && detailResponse.backtest) {
          setSelectedBacktest(detailResponse.backtest);
        }
        
        setRefreshKey(prev => prev + 1); // Trigger list refresh
        
      } else {
        throw new Error(response.errorMessage || response.error || 'Backtest execution failed');
      }

    } catch (error) {
      console.error('Run backtest error:', error);
      const message = error instanceof ResearchApiError 
        ? error.message 
        : 'Error al ejecutar backtest';
      toast.error(message, { id: 'backtest-run' });
    } finally {
      setIsRunning(false);
    }
  };

  /**
   * Promote backtest to OP-X
   */
  const handlePromote = async () => {
    if (!selectedBacktest) return;

    try {
      setIsPromoting(true);

      const request: PromoteBacktestRequest = {
        backtestId: selectedBacktest.id,
        name: `${selectedBacktest.name} - OP-X Strategy`,
        description: `Promoted from successful backtest: ${selectedBacktest.name}`,
        actor: 'ui@adaf.com'
      };

      const response = await ResearchApi.promoteBacktest(request);
      
      if (response.success && response.opportunity) {
        toast.success(`Oportunidad OP-X creada: ${response.opportunity.id}`);
        // TODO: Navigate to /opx when implemented
      } else {
        throw new Error(response.error || 'Error al promover backtest');
      }

    } catch (error) {
      console.error('Promote backtest error:', error);
      const message = error instanceof ResearchApiError 
        ? error.message 
        : 'Error al promover backtest';
      toast.error(message);
    } finally {
      setIsPromoting(false);
    }
  };

  /**
   * Handle creating a snapshot from current backtest results
   */
  const handleCreateSnapshot = async () => {
    if (!selectedBacktest?.results) {
      toast.error('No hay resultados de backtest para capturar');
      return;
    }

    try {
      setIsCreatingSnapshot(true);
      
      const snapshot = createSnapshot(
        selectedBacktest.name,
        {
          agents: selectedBacktest.config.agents,
          rules: selectedBacktest.config.rules.map(rule => ({
            id: `rule_${Math.random().toString(36).substr(2, 9)}`,
            expression: rule.expr,
            weight: rule.weight || 1,
            enabled: true
          })),
          tradingParams: {
            maxPositionSize: selectedBacktest.config.sizing?.notionalPctNAV || 0.1,
            slippageBps: selectedBacktest.config.slippageBps || 3,
            feesBps: selectedBacktest.config.feesBps || 5,
            timeframe: `${selectedBacktest.config.rebalanceDays || 1}d`,
            lookback: `${Math.ceil((new Date(selectedBacktest.config.window.to).getTime() - new Date(selectedBacktest.config.window.from).getTime()) / (1000 * 60 * 60 * 24))}d`
          },
          riskParams: {
            maxDrawdown: Math.abs(selectedBacktest.results.kpis.maxDDPct),
            stopLoss: 0.05, // Default 5%
            positionSizing: 'equal_weight'
          }
        },
        {
          pnlPercent: selectedBacktest.results.kpis.pnlPct,
          sharpe: selectedBacktest.results.kpis.sharpe,
          maxDrawdown: Math.abs(selectedBacktest.results.kpis.maxDDPct),
          hitRate: selectedBacktest.results.kpis.hitRate,
          volatility: selectedBacktest.results.kpis.volPct,
          totalTrades: selectedBacktest.results.kpis.trades,
          winRate: selectedBacktest.results.kpis.hitRate,
          avgWin: 0, // Not available in current API
          avgLoss: 0, // Not available in current API
          profitFactor: 0, // Not available in current API
          calmarRatio: 0, // Not available in current API
          sortinoRatio: 0 // Not available in current API
        },
        ['backtest', selectedBacktest.config.benchmark.toLowerCase()]
      );

      toast.success(`Snapshot "${snapshot.name}" creado exitosamente`);
      
    } catch (error) {
      console.error('Create snapshot error:', error);
      toast.error('Failed to create snapshot');
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  /**
   * Handle opening the compare drawer
   */
  const handleOpenCompare = () => {
    const snapshots = getAllSnapshots();
    if (snapshots.length === 0) {
      toast.error('No snapshots available for comparison');
      return;
    }
    setIsCompareDrawerOpen(true);
  };

  /**
   * Check if current user can run backtests (RBAC)
   */
  const canRun = true; // TODO: Implement RBAC check

  /**
   * Check if current user can promote (RBAC)
   */
  const canPromote = true; // TODO: Implement RBAC check

  /**
   * Check if selected backtest can be promoted
   */
  const promotionCheck = selectedBacktest ? ResearchApi.canPromote(selectedBacktest) : { canPromote: false };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Configuration Panel */}
      <div className="lg:col-span-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Strategy Configuration
            </CardTitle>
            <CardDescription>
              Design and configure your backtesting strategy
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Strategy Presets */}
            <div>
              <Label>Plantillas de Inicio Rápido</Label>
              <div className="grid grid-cols-1 gap-2 mt-2">
                {Object.entries(STRATEGY_PRESETS).map(([key, preset]) => (
                  <Button
                    key={key}
                    variant="outline"
                    size="sm"
                    onClick={() => handlePresetSelection(key as keyof typeof STRATEGY_PRESETS)}
                    className="justify-start text-sm"
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Basic Configuration */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre de la Estrategia</Label>
                <Input
                  id="name"
                  value={config.name || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Mi Estrategia de Trading"
                />
              </div>

              <div>
                <Label htmlFor="from-date">Rango de Fechas</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Input
                    id="from-date"
                    type="date"
                    value={config.window?.from?.split('T')[0] || ''}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      window: { ...prev.window!, from: e.target.value }
                    }))}
                  />
                  <Input
                    type="date"
                    value={config.window?.to?.split('T')[0] || ''}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      window: { ...prev.window!, to: e.target.value }
                    }))}
                  />
                </div>
              </div>

              <div>
                <Label>Agentes de Señal</Label>
                <div className="grid grid-cols-1 gap-1 mt-2">
                  {AGENT_OPTIONS.map((agent) => (
                    <div
                      key={agent.code}
                      className={`p-2 rounded border cursor-pointer transition-colors ${
                        config.agents?.includes(agent.code)
                          ? 'bg-primary/10 border-primary'
                          : 'border-border hover:bg-muted'
                      }`}
                      onClick={() => handleAgentToggle(agent.code)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{agent.code}</div>
                          <div className="text-xs text-muted-foreground">{agent.name}</div>
                        </div>
                        {config.agents?.includes(agent.code) && (
                          <Badge variant="secondary">Seleccionado</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="benchmark">Benchmark</Label>
                <Select 
                  value={config.benchmark} 
                  onValueChange={(value) => setConfig(prev => ({ ...prev, benchmark: value as 'BTC' | 'ETH' | 'NAV' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BENCHMARK_OPTIONS.map((bench) => (
                      <SelectItem key={bench.code} value={bench.code}>
                        {bench.name} - {bench.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Rules Configuration */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Reglas de Estrategia</Label>
                <Button size="sm" variant="outline" onClick={addRule}>
                  Agregar Regla
                </Button>
              </div>

              {config.rules?.map((rule, index) => (
                <Card key={index}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Regla {index + 1}</Label>
                      {config.rules && config.rules.length > 1 && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => removeRule(index)}
                          className="text-xs"
                        >
                          Eliminar
                        </Button>
                      )}
                    </div>
                    
                    <Textarea
                      value={rule.expr}
                      onChange={(e) => handleRuleChange(index, 'expr', e.target.value)}
                      placeholder="etf.flow.usd > 100e6 AND tvl.change7d > 0"
                      className="font-mono text-sm"
                      rows={2}
                    />
                    
                    <div>
                      <Label className="text-xs">Peso: {rule.weight}</Label>
                      <Slider
                        value={[rule.weight || 1]}
                        onValueChange={([value]) => handleRuleChange(index, 'weight', value)}
                        min={0.1}
                        max={5}
                        step={0.1}
                        className="mt-1"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              <div className="text-xs text-muted-foreground">
                <p>Example DSL:</p>
                <code className="bg-muted px-1 py-0.5 rounded text-xs">
                  etf.flow.usd &gt; 150e6
                </code>
                <br />
                <code className="bg-muted px-1 py-0.5 rounded text-xs">
                  funding.rate &lt; 0 AND gamma.exposure &gt; 50e6
                </code>
              </div>
            </div>

            <Separator />

            {/* Trading Parameters */}
            <div className="space-y-4">
              <Label>Trading Parameters</Label>
              
              <div>
                                <Label className="text-sm">Tamaño de Posición: {(config.sizing?.notionalPctNAV || 0.1) * 100}%</Label>
                <Slider
                  value={[(config.sizing?.notionalPctNAV || 0.1) * 100]}
                  onValueChange={([value]) => setConfig(prev => ({
                    ...prev,
                    sizing: { notionalPctNAV: value / 100 }
                  }))}
                  min={1}
                  max={100}
                  step={1}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label className="text-sm">Fees: {config.feesBps || 5} bps</Label>
                <Slider
                  value={[config.feesBps || 5]}
                  onValueChange={([value]) => setConfig(prev => ({ ...prev, feesBps: value }))}
                  min={0}
                  max={200}
                  step={1}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label className="text-sm">Slippage: {config.slippageBps || 3} bps</Label>
                <Slider
                  value={[config.slippageBps || 3]}
                  onValueChange={([value]) => setConfig(prev => ({ ...prev, slippageBps: value }))}
                  min={0}
                  max={100}
                  step={1}
                  className="mt-1"
                />
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="space-y-2">
              {validationErrors.length > 0 && (
                <div className="text-sm text-destructive space-y-1">
                  {validationErrors.map((error, index) => (
                    <div key={index} className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {error}
                    </div>
                  ))}
                </div>
              )}
              
              <Button 
                onClick={handleCreate} 
                disabled={isCreating || validationErrors.length > 0}
                className="w-full"
              >
                {isCreating ? 'Creando...' : 'Crear Backtest'}
              </Button>
              
              {canRun && (
                <Button 
                  onClick={handleRun} 
                  disabled={isRunning || !selectedBacktest || selectedBacktest.status !== 'queued'}
                  variant="secondary"
                  className="w-full"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {isRunning ? 'Ejecutando...' : 'Ejecutar Seleccionado'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results and Visualization Panel */}
      <div className="lg:col-span-2 space-y-6">
        <Tabs defaultValue="results" className="h-full">
          <TabsList>
            <TabsTrigger value="results">Resultados y Gráficos</TabsTrigger>
            <TabsTrigger value="backtests">Todos los Backtests</TabsTrigger>
          </TabsList>

          <TabsContent value="results" className="space-y-6">
            {selectedBacktest ? (
              <>
                {/* Backtest Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{selectedBacktest.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          selectedBacktest.status === 'done' ? 'default' :
                          selectedBacktest.status === 'running' ? 'secondary' :
                          selectedBacktest.status === 'failed' ? 'destructive' : 'outline'
                        }>
                          {selectedBacktest.status}
                        </Badge>
                        
                        {selectedBacktest.results && selectedBacktest.status === 'done' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCreateSnapshot}
                              disabled={isCreatingSnapshot}
                              className="ml-2"
                            >
                              <Camera className="h-4 w-4 mr-2" />
                              {isCreatingSnapshot ? 'Creando...' : 'Snapshot'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleOpenCompare}
                              className="ml-2"
                            >
                              <BarChart3 className="h-4 w-4 mr-2" />
                              Comparar
                            </Button>
                          </>
                        )}
                        
                        {canPromote && promotionCheck.canPromote && (
                          <Button
                            size="sm"
                            onClick={handlePromote}
                            disabled={isPromoting}
                            className="ml-2"
                          >
                            <TrendingUp className="h-4 w-4 mr-2" />
                            {isPromoting ? 'Promoviendo...' : 'Promover a OP-X'}
                          </Button>
                        )}
                      </div>
                    </CardTitle>
                    <CardDescription>
                      Creado {new Date(selectedBacktest.createdAt).toLocaleDateString()} • 
                      {selectedBacktest.config.agents.join(', ')} • 
                      benchmark {selectedBacktest.config.benchmark}
                    </CardDescription>
                  </CardHeader>

                  {selectedBacktest.results && (
                    <CardContent>
                      {/* KPI Cards */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                        <div className="text-center p-3 bg-muted rounded">
                          <div className="text-2xl font-bold">
                            {ResearchApi.formatKpi(selectedBacktest.results.kpis.pnlPct, 'percentage')}
                          </div>
                          <div className="text-xs text-muted-foreground">Return Total</div>
                        </div>
                        <div className="text-center p-3 bg-muted rounded">
                          <div className="text-2xl font-bold">
                            {ResearchApi.formatKpi(selectedBacktest.results.kpis.sharpe, 'ratio')}
                          </div>
                          <div className="text-xs text-muted-foreground">Sharpe Ratio</div>
                        </div>
                        <div className="text-center p-3 bg-muted rounded">
                          <div className="text-2xl font-bold">
                            {ResearchApi.formatKpi(selectedBacktest.results.kpis.maxDDPct, 'percentage')}
                          </div>
                          <div className="text-xs text-muted-foreground">Drawdown Máximo</div>
                        </div>
                        <div className="text-center p-3 bg-muted rounded">
                          <div className="text-2xl font-bold">
                            {ResearchApi.formatKpi(selectedBacktest.results.kpis.hitRate, 'percentage')}
                          </div>
                          <div className="text-xs text-muted-foreground">Hit Rate</div>
                        </div>
                        <div className="text-center p-3 bg-muted rounded">
                          <div className="text-2xl font-bold">
                            {ResearchApi.formatKpi(selectedBacktest.results.kpis.vsBenchmarkPct, 'percentage')}
                          </div>
                          <div className="text-xs text-muted-foreground">vs Benchmark</div>
                        </div>
                      </div>

                      {/* Charts */}
                      <div className="space-y-6">
                        <EquityChart data={selectedBacktest.results.equity} />
                        <MonthlyPnLChart data={selectedBacktest.results.monthlyPnL} />
                      </div>

                      {/* Notes/Warnings */}
                      {selectedBacktest.results.notes && selectedBacktest.results.notes.length > 0 && (
                        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded">
                          <h4 className="font-medium text-amber-800 mb-2">Notas y Advertencias</h4>
                          <ul className="text-sm text-amber-700 space-y-1">
                            {selectedBacktest.results.notes.map((note, index) => (
                              <li key={index} className="flex items-center gap-2">
                                <AlertCircle className="h-3 w-3" />
                                {note}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Promotion Status */}
                      {!promotionCheck.canPromote && promotionCheck.reason && (
                        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded">
                          <h4 className="font-medium text-gray-800 mb-2">Requisitos de Promoción</h4>
                          <p className="text-sm text-gray-600">{promotionCheck.reason}</p>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="p-12 text-center text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">Ningún backtest seleccionado</p>
                  <p>Selecciona un backtest de la lista para ver resultados y gráficos</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="backtests">
            <BacktestList
              key={refreshKey}
              onSelect={setSelectedBacktest}
              selectedId={selectedBacktest?.id}
            />
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Compare Drawer */}
      <CompareDrawer 
        open={isCompareDrawerOpen}
        onOpenChange={setIsCompareDrawerOpen}
      />
    </div>
  );
}