/**
 * Strategy Preset Selector Component
 * 
 * Interactive UI for browsing, selecting, and configuring professional strategy presets.
 * Includes search, filtering, parameter configuration, and success criteria display.
 */

'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { 
  Search, 
  Filter, 
  Star, 
  Clock, 
  TrendingUp, 
  Shield, 
  ChevronDown, 
  ChevronRight,
  Settings,
  Play,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Info
} from 'lucide-react';

import { 
  allStrategyTemplates, 
  strategyCategories, 
  getStrategyByCategory, 
  validateStrategyParameters
} from '../../lib/strategyPresets';
import { type StrategyPreset, type StrategyParameter, type StrategyTemplate, type RiskLevel, type TimeHorizon } from '../../types/strategyPresets';

interface StrategyPresetSelectorProps {
  onSelectStrategy: (strategy: StrategyTemplate, parameters: Record<string, any>) => void;
  className?: string;
}

interface ParameterInputProps {
  parameter: StrategyParameter;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}

// Parameter input component
function ParameterInput({ parameter, value, onChange, error }: ParameterInputProps) {
  const handleChange = (newValue: string | number) => {
    if (parameter.type === 'number' || parameter.type === 'percentage') {
      onChange(Number(newValue));
    } else {
      onChange(newValue);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={parameter.name} className="text-sm font-medium">
        {parameter.name}
        {parameter.validation?.required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      
      {parameter.type === 'selection' ? (
        <Select value={String(value)} onValueChange={handleChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select option" />
          </SelectTrigger>
          <SelectContent>
            {parameter.options?.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          id={parameter.name}
          type={parameter.type === 'number' || parameter.type === 'percentage' ? 'number' : 'text'}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          min={parameter.min}
          max={parameter.max}
          placeholder={String(parameter.defaultValue)}
          className={error ? 'border-red-500' : ''}
        />
      )}
      
      <p className="text-xs text-muted-foreground">{parameter.description}</p>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// Strategy card component
function StrategyCard({ 
  template, 
  isSelected, 
  onSelect, 
  onConfigure 
}: { 
  template: StrategyTemplate;
  isSelected: boolean;
  onSelect: () => void;
  onConfigure: () => void;
}) {
  const { preset } = template;
  
  const riskLevelColors = {
    conservative: 'bg-green-100 text-green-800 border-green-200',
    moderate: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    aggressive: 'bg-red-100 text-red-800 border-red-200'
  };

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-blue-500 shadow-md' : ''
      }`}
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{preset.displayConfig.icon}</span>
            <div>
              <CardTitle className="text-lg">{preset.name}</CardTitle>
              <CardDescription className="text-sm">{preset.description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            {Array.from({ length: preset.displayConfig.difficulty }).map((_, i) => (
              <Star key={i} className="h-3 w-3 fill-current text-yellow-400" />
            ))}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge 
              variant="outline" 
              className={riskLevelColors[preset.riskLevel]}
            >
              {preset.riskLevel}
            </Badge>
            <Badge variant="secondary">
              <Clock className="h-3 w-3 mr-1" />
              {preset.timeHorizon}
            </Badge>
            <Badge variant="secondary">
              <TrendingUp className="h-3 w-3 mr-1" />
              Target: {preset.successCriteria[0].target}{preset.successCriteria[0].unit}
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-2">
            {preset.overview}
          </p>
          
          <div className="flex justify-between items-center pt-2">
            <span className="text-xs text-muted-foreground">
              Setup: {preset.displayConfig.estimatedSetupTime}
            </span>
            <Button 
              size="sm" 
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onConfigure();
              }}
            >
              <Settings className="h-4 w-4 mr-1" />
              Configure
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Strategy configuration dialog
function StrategyConfigDialog({ 
  template, 
  isOpen, 
  onClose, 
  onApply 
}: {
  template: StrategyTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  onApply: (template: StrategyTemplate, parameters: Record<string, any>) => void;
}) {
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  React.useEffect(() => {
    if (template) {
      const defaultParams = template.preset.parameters.reduce((acc, param) => ({
        ...acc,
        [param.name]: param.defaultValue
      }), {});
      setParameters(defaultParams);
    }
  }, [template]);
  
  const handleParameterChange = (name: string, value: any) => {
    setParameters(prev => ({ ...prev, [name]: value }));
    
    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const { [name]: _, ...rest } = prev;
        return rest;
      });
    }
  };
  
  const handleApply = () => {
    if (!template) return;
    
    const validation = validateStrategyParameters(template.preset.id, parameters);
    if (!validation.valid) {
      const errorMap = validation.errors.reduce((acc, error) => {
        const match = error.match(/^(\w+)/);
        if (match) {
          acc[match[1]] = error;
        }
        return acc;
      }, {} as Record<string, string>);
      setValidationErrors(errorMap);
      return;
    }
    
    onApply(template, parameters);
    onClose();
  };
  
  if (!template) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span className="text-2xl">{template.preset.displayConfig.icon}</span>
            <span>Configure {template.preset.name}</span>
          </DialogTitle>
          <DialogDescription>
            Customize parameters and review strategy details before applying.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 pr-4 max-h-96 overflow-y-auto">
          <Tabs defaultValue="parameters" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="parameters">Parameters</TabsTrigger>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="rules">Rules & Logic</TabsTrigger>
              <TabsTrigger value="research">Research</TabsTrigger>
            </TabsList>
            
            <TabsContent value="parameters" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {template.preset.parameters.map((param) => (
                  <ParameterInput
                    key={param.name}
                    parameter={param}
                    value={parameters[param.name]}
                    onChange={(value) => handleParameterChange(param.name, value)}
                    error={validationErrors[param.name]}
                  />
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Strategy Overview</h4>
                    <p className="text-sm text-muted-foreground">{template.preset.overview}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Success Criteria</h4>
                    <div className="space-y-2">
                      {template.preset.successCriteria.map((criterion) => (
                        <div key={criterion.name} className="flex justify-between items-center text-sm">
                          <span>{criterion.name}:</span>
                          <Badge variant={criterion.priority === 'primary' ? 'default' : 'secondary'}>
                            {criterion.target}{criterion.unit}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Risk Metrics</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Max Drawdown: {(template.preset.riskMetrics.maxDrawdown * 100).toFixed(1)}%</div>
                      <div>Volatility Target: {(template.preset.riskMetrics.volatilityTarget * 100).toFixed(1)}%</div>
                      <div>Target Sharpe: {template.preset.riskMetrics.sharpeRatio}</div>
                      <div>Max Leverage: {template.preset.riskMetrics.maxLeverage}x</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Configuration</h4>
                    <div className="space-y-1 text-sm">
                      <div>Risk Level: <Badge>{template.preset.riskLevel}</Badge></div>
                      <div>Time Horizon: <Badge>{template.preset.timeHorizon}</Badge></div>
                      <div>Market Conditions: {template.preset.marketConditions.join(', ')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="rules" className="space-y-4">
              <div>
                <h4 className="font-medium mb-3">Strategy Rules</h4>
                <div className="space-y-3">
                  {template.preset.rules.map((rule) => (
                    <Card key={rule.id} className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="font-medium text-sm">{rule.name}</h5>
                        <div className="flex items-center space-x-2">
                          <Badge variant={rule.enabled ? 'default' : 'secondary'} className="text-xs">
                            {rule.enabled ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Weight: {rule.weight}
                          </Badge>
                        </div>
                      </div>
                      {rule.description && (
                        <p className="text-xs text-muted-foreground mb-2">{rule.description}</p>
                      )}
                      <div className="text-xs font-mono bg-muted p-2 rounded">
                        <div><strong>Condition:</strong> {rule.condition}</div>
                        <div><strong>Action:</strong> {rule.action}</div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
              
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-3">DSL Code Preview</h4>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-xs overflow-auto">
                    {template.dslCode.slice(0, 500)}
                    {template.dslCode.length > 500 && '...'}
                  </pre>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="research" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Methodology</h4>
                  <p className="text-sm text-muted-foreground">{template.preset.researchNotes.methodology}</p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Key Insights</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {template.preset.researchNotes.keyInsights.map((insight, i) => (
                      <li key={i} className="flex items-start space-x-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Market Assumptions</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {template.preset.researchNotes.marketAssumptions.map((assumption, i) => (
                      <li key={i} className="flex items-start space-x-2">
                        <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <span>{assumption}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Limitations</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {template.preset.researchNotes.limitations.map((limitation, i) => (
                      <li key={i} className="flex items-start space-x-2">
                        <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <span>{limitation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {template.preset.researchNotes.references.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">References</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {template.preset.researchNotes.references.map((ref, i) => (
                        <li key={i} className="flex items-start space-x-2">
                          <BookOpen className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                          <span>{ref}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Estimated setup time: {template.preset.displayConfig.estimatedSetupTime}
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={Object.keys(validationErrors).length > 0}>
              <Play className="h-4 w-4 mr-1" />
              Apply Strategy
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Main component
export function StrategyPresetSelector({ onSelectStrategy, className }: StrategyPresetSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<RiskLevel | 'all'>('all');
  const [selectedTimeHorizon, setSelectedTimeHorizon] = useState<TimeHorizon | 'all'>('all');
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [configStrategy, setConfigStrategy] = useState<StrategyTemplate | null>(null);
  
  const filteredStrategies = useMemo(() => {
    return allStrategyTemplates.filter(template => {
      const matchesSearch = template.preset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           template.preset.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           template.preset.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || template.preset.category === selectedCategory;
      const matchesRisk = selectedRiskLevel === 'all' || template.preset.riskLevel === selectedRiskLevel;
      const matchesHorizon = selectedTimeHorizon === 'all' || template.preset.timeHorizon === selectedTimeHorizon;
      
      return matchesSearch && matchesCategory && matchesRisk && matchesHorizon;
    });
  }, [searchTerm, selectedCategory, selectedRiskLevel, selectedTimeHorizon]);
  
  const handleConfigureStrategy = (template: StrategyTemplate) => {
    setConfigStrategy(template);
    setConfigDialogOpen(true);
  };
  
  const handleApplyStrategy = (template: StrategyTemplate, parameters: Record<string, any>) => {
    onSelectStrategy(template, parameters);
  };
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Strategy Presets</h3>
          <p className="text-sm text-muted-foreground">
            Professional strategy templates with pre-configured rules and parameters
          </p>
        </div>
        <Badge variant="secondary">{allStrategyTemplates.length} strategies</Badge>
      </div>
      
      {/* Search and Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search strategies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(strategyCategories).map(([key, category]) => (
              <SelectItem key={key} value={key}>
                <span className="flex items-center space-x-2">
                  <span>{category.icon}</span>
                  <span>{category.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={selectedRiskLevel} onValueChange={(value) => setSelectedRiskLevel(value as RiskLevel | 'all')}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risk Levels</SelectItem>
            <SelectItem value="conservative">Conservative</SelectItem>
            <SelectItem value="moderate">Moderate</SelectItem>
            <SelectItem value="aggressive">Aggressive</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={selectedTimeHorizon} onValueChange={(value) => setSelectedTimeHorizon(value as TimeHorizon | 'all')}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Horizons</SelectItem>
            <SelectItem value="intraday">Intraday</SelectItem>
            <SelectItem value="short-term">Short-term</SelectItem>
            <SelectItem value="medium-term">Medium-term</SelectItem>
            <SelectItem value="long-term">Long-term</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Results */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredStrategies.length} of {allStrategyTemplates.length} strategies
      </div>
      
      {/* Strategy Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStrategies.map((template) => (
          <StrategyCard
            key={template.preset.id}
            template={template}
            isSelected={selectedStrategy === template.preset.id}
            onSelect={() => setSelectedStrategy(
              selectedStrategy === template.preset.id ? null : template.preset.id
            )}
            onConfigure={() => handleConfigureStrategy(template)}
          />
        ))}
      </div>
      
      {filteredStrategies.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No strategies match your current filters.</p>
          <Button 
            variant="link" 
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('all');
              setSelectedRiskLevel('all');
              setSelectedTimeHorizon('all');
            }}
          >
            Clear filters
          </Button>
        </div>
      )}
      
      {/* Configuration Dialog */}
      <StrategyConfigDialog
        template={configStrategy}
        isOpen={configDialogOpen}
        onClose={() => {
          setConfigDialogOpen(false);
          setConfigStrategy(null);
        }}
        onApply={handleApplyStrategy}
      />
    </div>
  );
}