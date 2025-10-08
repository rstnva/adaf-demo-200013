// ================================================================================================
// DSL Parser for Backtest Rules
// ================================================================================================
// Simple expression language for strategy rules evaluation
// Supports comparisons (>, >=, <, <=, ==, !=) and logical operators (AND, OR)
// ================================================================================================

import { ParsedExpression, ParsedRule, ComparisonOperator, LogicalOperator } from '@/types/research';

// Re-export types for convenience
export type { ParsedExpression, ParsedRule, ComparisonOperator, LogicalOperator };

/**
 * Parse and evaluate DSL expressions for backtesting rules
 */
export class DSLParser {
  private static readonly OPERATORS: Record<string, ComparisonOperator> = {
    '>': '>',
    '>=': '>=',
    '<': '<',
    '<=': '<=',
    '==': '==',
    '!=': '!='
  };

  private static readonly LOGICAL_OPS: Record<string, LogicalOperator> = {
    'AND': 'AND',
    'OR': 'OR',
    '&&': 'AND',
    '||': 'OR'
  };

  /**
   * Parse a rule expression (string DSL or JSON format)
   */
  static parseRule(expr: string, weight: number = 1): ParsedRule {
    try {
      // Try parsing as JSON first
      const jsonExpr = JSON.parse(expr);
      return this.parseJSONRule(jsonExpr, weight, expr);
    } catch {
      // Parse as string DSL
      return this.parseStringRule(expr, weight);
    }
  }

  /**
   * Parse JSON format rule: {and: [...]} or {or: [...]}
   */
  private static parseJSONRule(jsonExpr: any, weight: number, originalExpr: string): ParsedRule {
    if (jsonExpr.and && Array.isArray(jsonExpr.and)) {
      const expressions = jsonExpr.and.map(this.parseCondition);
      const operators = new Array(expressions.length - 1).fill('AND' as LogicalOperator);
      return { expressions, operators, weight, originalExpr };
    }
    
    if (jsonExpr.or && Array.isArray(jsonExpr.or)) {
      const expressions = jsonExpr.or.map(this.parseCondition);
      const operators = new Array(expressions.length - 1).fill('OR' as LogicalOperator);
      return { expressions, operators, weight, originalExpr };
    }
    
    // Single condition
    const expression = this.parseCondition(jsonExpr);
    return { expressions: [expression], operators: [], weight, originalExpr };
  }

  /**
   * Parse string DSL: "etf.flow.usd > 100e6 AND tvl.change7d > 0"
   */
  private static parseStringRule(expr: string, weight: number): ParsedRule {
    const expressions: ParsedExpression[] = [];
    const operators: LogicalOperator[] = [];

    // Split by logical operators while preserving them
    const tokens = expr.split(/\s+(AND|OR|&&|\|\|)\s+/);
    
    for (let i = 0; i < tokens.length; i += 2) {
      const conditionStr = tokens[i]?.trim();
      if (conditionStr) {
        expressions.push(this.parseStringCondition(conditionStr));
      }
      
      // Add logical operator if it exists
      if (i + 1 < tokens.length) {
        const logicalOp = tokens[i + 1]?.trim();
        if (logicalOp && this.LOGICAL_OPS[logicalOp]) {
          operators.push(this.LOGICAL_OPS[logicalOp]);
        }
      }
    }

    return { expressions, operators, weight, originalExpr: expr };
  }

  /**
   * Parse single condition from JSON object
   */
  private static parseCondition(condition: any): ParsedExpression {
    if (typeof condition === 'object' && condition.field && condition.op && condition.value !== undefined) {
      return {
        field: condition.field,
        operator: condition.op as ComparisonOperator,
        value: condition.value,
        dataType: typeof condition.value === 'number' ? 'number' : 'string'
      };
    }
    
    throw new Error(`Invalid JSON condition format: ${JSON.stringify(condition)}`);
  }

  /**
   * Parse single condition from string: "etf.flow.usd > 100e6"
   */
  private static parseStringCondition(conditionStr: string): ParsedExpression {
    // Match pattern: field operator value
    const match = conditionStr.match(/^([a-zA-Z][a-zA-Z0-9_.]*)\s*(>=|<=|>|<|==|!=)\s*(.+)$/);
    
    if (!match) {
      throw new Error(`Invalid condition format: ${conditionStr}`);
    }

    const [, field, operatorStr, valueStr] = match;
    const operator = this.OPERATORS[operatorStr];
    
    if (!operator) {
      throw new Error(`Invalid operator: ${operatorStr}`);
    }

    // Parse value (number or string)
    let value: number | string = valueStr.trim();
    let dataType: 'number' | 'string' = 'string';

    // Try parsing as number (supports scientific notation)
    if (/^-?\d*\.?\d+([eE][+-]?\d+)?$/.test(value)) {
      value = parseFloat(value);
      dataType = 'number';
    } else {
      // Remove quotes if present
      value = value.replace(/^["']|["']$/g, '');
    }

    return { field, operator, value, dataType };
  }

  /**
   * Evaluate parsed rule against signal data for a specific day
   */
  static evalRule(rule: ParsedRule, signalData: Record<string, any>): boolean {
    if (rule.expressions.length === 0) {
      return false;
    }

    if (rule.expressions.length === 1) {
      return this.evalExpression(rule.expressions[0], signalData);
    }

    // Evaluate expressions with logical operators
    let result = this.evalExpression(rule.expressions[0], signalData);

    for (let i = 0; i < rule.operators.length; i++) {
      const nextExpr = rule.expressions[i + 1];
      const nextResult = this.evalExpression(nextExpr, signalData);
      
      if (rule.operators[i] === 'AND') {
        result = result && nextResult;
      } else { // OR
        result = result || nextResult;
      }
    }

    return result;
  }

  /**
   * Evaluate single expression against signal data
   */
  private static evalExpression(expr: ParsedExpression, signalData: Record<string, any>): boolean {
    const fieldValue = this.getNestedValue(signalData, expr.field);
    
    // Handle missing values
    if (fieldValue === undefined || fieldValue === null) {
      return false;
    }

    // Type coercion for comparison
    let actualValue = fieldValue;
    let expectedValue = expr.value;

    if (expr.dataType === 'number' && typeof fieldValue !== 'number') {
      actualValue = parseFloat(fieldValue);
      if (isNaN(actualValue)) {
        return false;
      }
    }

    if (expr.dataType === 'string' && typeof fieldValue !== 'string') {
      actualValue = String(fieldValue);
    }

    // Perform comparison
    switch (expr.operator) {
      case '>':
        return actualValue > expectedValue;
      case '>=':
        return actualValue >= expectedValue;
      case '<':
        return actualValue < expectedValue;
      case '<=':
        return actualValue <= expectedValue;
      case '==':
        return actualValue == expectedValue; // Intentional == for type coercion
      case '!=':
        return actualValue != expectedValue; // Intentional != for type coercion
      default:
        return false;
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  private static getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object' ? current[key] : undefined;
    }, obj);
  }

  /**
   * Validate rule expressions for syntax errors
   */
  static validateRule(expr: string): { valid: boolean; error?: string } {
    try {
      this.parseRule(expr);
      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Unknown parsing error' 
      };
    }
  }

  /**
   * Get list of fields referenced in a rule
   */
  static getReferencedFields(rule: ParsedRule): string[] {
    return [...new Set(rule.expressions.map(expr => expr.field))];
  }
}

/**
 * Helper function for direct evaluation of expressions
 */
export function evalExpr(expr: string, signalData: Record<string, any>, weight: number = 1): boolean {
  const rule = DSLParser.parseRule(expr, weight);
  return DSLParser.evalRule(rule, signalData);
}

/**
 * Common field mappings for signal data
 */
export const COMMON_FIELDS = {
  // ETF Flow signals
  'etf.flow.usd': 'etf_flow_usd',
  'etf.flow.net': 'etf_flow_net',
  'etf.flow.5min': 'etf_flow_5min',
  
  // TVL and DeFi metrics
  'tvl.change7d': 'tvl_change_7d',
  'tvl.change1d': 'tvl_change_1d',
  'tvl.total': 'tvl_total',
  
  // Funding and derivatives
  'funding.rate': 'funding_rate',
  'funding.oi': 'funding_open_interest',
  'gamma.exposure': 'gamma_exposure',
  
  // Market data
  'price.close': 'price_close',
  'price.rsi': 'price_rsi_14',
  'volatility.1h': 'volatility_1h',
  'volatility.24h': 'volatility_24h',
  
  // Sentiment
  'news.sentiment': 'news_sentiment_score',
  'social.sentiment': 'social_sentiment_score',
  
  // On-chain metrics
  'onchain.active_addresses': 'onchain_active_addresses',
  'onchain.tx_count': 'onchain_transaction_count',
  'onchain.fees': 'onchain_fees_usd'
};

/**
 * Map DSL field names to database column names
 */
export function mapFieldName(dslField: string): string {
  return COMMON_FIELDS[dslField] || dslField;
}