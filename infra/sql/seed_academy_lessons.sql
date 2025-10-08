-- ADAF Academy - Initial Learning Content Seeds
-- Creates 6 initial lessons covering all ADAF modules

-- Clear existing academy data (for re-seeding)
TRUNCATE TABLE user_badges, user_progress, exercises, checklists, quizzes, lessons, badges, learning_paths CASCADE;

-- Insert Lessons
INSERT INTO lessons (code, title, summary, difficulty, est_minutes, content_md, kind, tags, prerequisites) VALUES

-- INTRO LEVEL
('intro-1-kpis', 'KPIs & Guardrails Fundamentals', 'Learn the core performance indicators and risk guardrails that protect ADAF strategies from excessive drawdowns and ensure consistent returns.', 'intro', 25, 
'# KPIs & Guardrails Fundamentals

## Overview
Understanding Key Performance Indicators (KPIs) and risk guardrails is essential for managing quantitative investment strategies. This lesson covers the fundamental metrics used to evaluate strategy performance and the protective mechanisms that prevent catastrophic losses.

## Core KPIs

### Performance Metrics
- **NAV (Net Asset Value)**: The total value of strategy assets minus liabilities
- **Returns**: Absolute and percentage gains/losses over time periods
- **Sharpe Ratio**: Risk-adjusted return metric (excess return / volatility)
- **Maximum Drawdown**: Largest peak-to-trough decline
- **Hit Rate**: Percentage of profitable trades or periods

### Risk Metrics
- **VaR (Value at Risk)**: Maximum potential loss over a specific time horizon
- **Volatility**: Standard deviation of returns (annualized)
- **Beta**: Correlation with market movements
- **Tracking Error**: Standard deviation of excess returns vs benchmark

## Risk Guardrails

### Position Limits
- **LTV (Loan-to-Value)**: Maximum leverage allowed per position
- **Concentration Limits**: Maximum position size as % of portfolio
- **Sector/Geographic Limits**: Diversification requirements

### Operational Limits  
- **Slippage Tolerance**: Maximum acceptable execution cost
- **Real Yield Minimum**: Minimum required yield after all costs
- **High Frequency Limits**: Maximum trading frequency to control costs

### Emergency Controls
- **Stop-Loss Triggers**: Automatic position closure on excessive losses
- **Circuit Breakers**: Portfolio-wide risk reduction mechanisms
- **Correlation Monitors**: Detection of concentrated risk exposure

## Practical Application

The ADAF Control dashboard (`/control`) provides real-time monitoring of all these metrics. Guardrails are enforced automatically but can be overridden by authorized personnel with proper justification.

## Next Steps

Complete the quiz to test your understanding, then use the checklist to explore the actual Control dashboard and exercise the alert acknowledgment system.', 
'lesson', ARRAY['kpis', 'guardrails', 'risk', 'control'], ARRAY[]::TEXT[]),

-- CORE LEVEL
('core-1-research', 'Research: Backtest & Strategy Promotion', 'Master the research workflow from backtesting new strategies to promoting successful candidates to live trading in the OP-X system.', 'core', 40,
'# Research: Backtest & Strategy Promotion

## Overview
The research module is where quantitative strategies are born, tested, and validated before deployment. This lesson covers the complete workflow from initial backtesting to strategy promotion.

## Backtesting Fundamentals

### Strategy Development Process
1. **Hypothesis Formation**: Define the investment thesis
2. **Data Preparation**: Historical market data and features
3. **Model Implementation**: Trading logic and rules
4. **Backtesting Execution**: Historical performance simulation
5. **Performance Analysis**: KPI evaluation and risk assessment

### Backtest Configuration
- **Universe Selection**: Asset classes and instruments
- **Time Period**: Historical data range for testing
- **Rebalancing Frequency**: How often positions are updated
- **Transaction Costs**: Realistic cost assumptions
- **Risk Constraints**: Position limits and guardrails

## Key Performance Metrics

### Return Metrics
- **Total Return**: Cumulative performance over test period
- **Annualized Return**: Geometric mean return per year
- **Risk-Adjusted Return**: Sharpe ratio, Sortino ratio
- **Benchmark Comparison**: Alpha and beta vs market indices

### Risk Metrics
- **Maximum Drawdown**: Worst peak-to-trough decline
- **Volatility**: Annualized standard deviation
- **Downside Deviation**: Volatility of negative returns only
- **VaR/CVaR**: Value at Risk metrics

### Operational Metrics
- **Hit Rate**: Percentage of profitable periods
- **Profit Factor**: Gross profit / gross loss ratio
- **Average Trade**: Mean return per rebalancing period
- **Turnover**: Portfolio churn rate

## Strategy Promotion Process

### Promotion Criteria
Strategies must meet minimum thresholds:
- **Sharpe Ratio**: ≥ 1.2 (risk-adjusted performance)
- **Maximum Drawdown**: ≤ 15% (risk control)
- **Hit Rate**: ≥ 55% (consistency)
- **Minimum Track Record**: 2+ years of backtest data

### Promotion Workflow
1. **Validation Review**: Independent verification of backtest results
2. **Risk Assessment**: Stress testing and scenario analysis
3. **Capacity Analysis**: Available capital and market impact
4. **Approval Process**: Research committee review
5. **OP-X Deployment**: Integration into live trading system

### Post-Promotion Monitoring
- **Live Performance Tracking**: Real-time vs backtest comparison
- **Attribution Analysis**: Understanding performance drivers
- **Risk Monitoring**: Ongoing guardrail compliance
- **Periodic Review**: Quarterly strategy assessment

## Tools and Interfaces

### Research Dashboard (`/research`)
- Strategy library and search
- Backtest configuration and execution
- Performance analysis and visualization
- Comparison tools and benchmarking

### OP-X Integration (`/opx`)
- Live strategy monitoring
- Performance attribution
- Risk dashboard
- Manual override controls

## Best Practices

1. **Robust Testing**: Use walk-forward analysis and out-of-sample testing
2. **Realistic Assumptions**: Include all costs and constraints
3. **Risk Management**: Always implement appropriate guardrails
4. **Documentation**: Maintain detailed research notes and rationale
5. **Continuous Monitoring**: Track live vs backtest performance

Understanding this workflow is crucial for maintaining ADAF''s competitive edge in quantitative investing.', 
'lesson', ARRAY['research', 'backtest', 'opx', 'strategies'], ARRAY['intro-1-kpis']),

('core-2-reports', 'Reporting & Client Delivery', 'Learn to generate comprehensive investment reports, including one-pagers, performance tearsheets, and client-facing deliverables with proper formatting and compliance.', 'core', 35,
'# Reporting & Client Delivery

## Overview
Professional investment reporting is critical for client communication, regulatory compliance, and internal decision-making. This lesson covers ADAF''s reporting framework and best practices for creating clear, accurate, and actionable investment reports.

## Report Types and Purposes

### One-Page Summary Reports
- **Executive Summary**: High-level performance and key metrics
- **Portfolio Snapshot**: Current positions and allocations  
- **Performance Attribution**: Sources of returns and risk
- **Key Insights**: Notable market conditions and strategy performance

### Detailed Performance Reports
- **Return Analysis**: Multi-period performance breakdown
- **Risk Metrics**: Comprehensive risk assessment
- **Benchmark Comparison**: Relative performance analysis
- **Transaction Summary**: Trading activity and costs

### Client-Facing Deliverables
- **Monthly Letters**: Narrative performance commentary
- **Quarterly Reviews**: Comprehensive strategy updates
- **Annual Reports**: Full-year performance and outlook
- **Ad-Hoc Reports**: Special situations and market events

## Key Financial Metrics

### Performance Metrics
- **IRR (Internal Rate of Return)**: Time-weighted return accounting for cash flows
- **TVPI (Total Value to Paid-In)**: Multiple of invested capital returned
- **MoIC (Multiple of Invested Capital)**: Gross multiple before fees
- **DPI (Distributions to Paid-In)**: Cash returned to investors
- **RVPI (Residual Value to Paid-In)**: Remaining investment value

### Risk and Attribution
- **Tracking Error**: Deviation from benchmark performance
- **Information Ratio**: Risk-adjusted active return
- **Factor Attribution**: Performance drivers by risk factor
- **Sector/Geographic Attribution**: Sources of relative return

### Portfolio Construction (PoR - Portfolio of Records)
- **Asset Allocation**: Strategic and tactical weightings
- **Position Sizing**: Individual investment weights
- **Concentration Analysis**: Top positions and sector exposure
- **Liquidity Profile**: Time to liquidate positions

## Report Generation Process

### Data Collection and Validation
1. **Portfolio Data**: Current positions and historical transactions
2. **Performance Data**: Returns, benchmarks, and peer comparisons
3. **Market Data**: Pricing, corporate actions, and adjustments
4. **Risk Data**: VaR, stress tests, and scenario analysis

### Quality Assurance
- **Data Reconciliation**: Cross-checking multiple data sources
- **Calculation Verification**: Independent validation of metrics
- **Format Review**: Consistency with brand and compliance standards
- **Client Customization**: Tailoring for specific audience needs

### Delivery and Distribution
- **PDF Generation**: Professional formatting and layout
- **Secure Delivery**: Encrypted transmission and access controls
- **Version Control**: Tracking revisions and amendments
- **Archive Management**: Historical report storage and retrieval

## Compliance and Regulatory Considerations

### Performance Presentation Standards
- **GIPS Compliance**: Global Investment Performance Standards
- **Disclosure Requirements**: Risk warnings and methodology notes
- **Benchmark Selection**: Appropriate and fair comparisons
- **Fee Transparency**: Clear presentation of all costs

### Documentation Requirements
- **Methodology Documentation**: Calculation and attribution methods
- **Data Sources**: Third-party providers and internal systems
- **Assumptions and Limitations**: Model and data constraints
- **Review and Approval**: Internal control processes

## Technology and Automation

### Report Generation Platform
- **Template Management**: Standardized formats and layouts
- **Data Integration**: Automated data sourcing and validation
- **Calculation Engine**: Consistent metric computation
- **Distribution System**: Secure client portals and delivery

### Quality Control Systems
- **Automated Checks**: Data validation and calculation verification
- **Exception Reporting**: Identification of anomalies and issues
- **Audit Trails**: Complete history of report generation process
- **Error Correction**: Procedures for handling mistakes and revisions

## Best Practices

1. **Clarity First**: Focus on clear communication over complexity
2. **Accuracy Always**: Never compromise on data quality or calculations
3. **Consistent Formatting**: Maintain professional standards across all reports
4. **Timely Delivery**: Meet all deadlines and client expectations
5. **Continuous Improvement**: Regularly review and enhance reporting processes

Mastering these reporting skills ensures ADAF maintains its reputation for transparency, professionalism, and client service excellence.', 
'lesson', ARRAY['reports', 'performance', 'compliance'], ARRAY['intro-1-kpis']),

('core-3-dqp', 'Data Quality & Pipeline Management', 'Understand ADAF''s Data Quality Platform (DQP) for monitoring data freshness, completeness, and integrity across all market data feeds and internal calculations.', 'core', 30,
'# Data Quality & Pipeline Management (DQP)

## Overview
Data quality is the foundation of reliable quantitative investment strategies. The Data Quality Platform (DQP) provides comprehensive monitoring, validation, and alerting for all data pipelines feeding ADAF''s investment systems.

## Data Quality Dimensions

### Freshness
- **Latency Monitoring**: Time from market event to system availability
- **Update Frequency**: Regular data refresh cycles and schedules
- **Staleness Detection**: Identification of outdated or missing updates
- **SLA Compliance**: Meeting data provider service level agreements

### Completeness  
- **Coverage Analysis**: Percentage of expected data received
- **Missing Data Detection**: Gaps in time series or cross-sectional data
- **Universe Consistency**: Complete coverage of investment universe
- **Historical Integrity**: Consistent data availability over time

### Accuracy
- **Price Validation**: Cross-reference multiple data sources
- **Corporate Actions**: Dividend, split, and merger adjustments
- **Currency Conversion**: FX rate accuracy and timing
- **Benchmark Reconciliation**: Index composition and weighting validation

### Consistency
- **Cross-Source Validation**: Comparing data from multiple providers
- **Time Series Consistency**: Detecting breaks or anomalies in historical data
- **Calculation Validation**: Verifying derived metrics and indicators
- **Reference Data Sync**: Ensuring master data consistency

## DQP Architecture

### Data Ingestion Layer
- **Multiple Sources**: Bloomberg, Reuters, internal calculations
- **Real-Time Streams**: Live market data feeds
- **Batch Processing**: End-of-day and historical data updates
- **API Integration**: Systematic data retrieval and validation

### Quality Assessment Engine
- **Rule-Based Validation**: Configurable quality checks and thresholds
- **Statistical Analysis**: Anomaly detection using historical patterns  
- **Cross-Validation**: Multi-source data comparison and reconciliation
- **Business Logic**: Domain-specific validation rules

### Alerting and Notification System
- **Severity Levels**: CRITICAL, WARN, INFO classification
- **Escalation Procedures**: Automated notification workflows
- **Dashboard Visualization**: Real-time quality status monitoring
- **Historical Tracking**: Quality metrics and trend analysis

## Quality Check Categories

### CRITICAL Failures
- **Missing Core Data**: Essential pricing or reference data unavailable
- **Stale Data**: Data older than acceptable thresholds
- **Calculation Errors**: Failed derived metric computation
- **System Downtime**: Data provider or internal system failures

### WARNING Conditions  
- **Partial Data**: Some expected data missing but core operations possible
- **Delayed Updates**: Data available but later than usual
- **Quality Degradation**: Accuracy metrics below normal levels
- **Capacity Constraints**: System resources approaching limits

### INFO Notifications
- **Planned Maintenance**: Scheduled system updates or outages
- **Data Provider Changes**: New sources or methodology updates
- **Performance Metrics**: Routine quality statistics and reports
- **System Health**: Regular operational status updates

## Operational Procedures

### Daily Monitoring Workflow
1. **Morning Checks**: Review overnight quality reports and alerts
2. **Market Open**: Validate real-time data feeds and pricing
3. **Intraday Monitoring**: Continuous quality assessment and alerting
4. **End-of-Day**: Final data validation and reconciliation
5. **Overnight Processing**: Batch quality checks and report generation

### Issue Resolution Process
1. **Alert Triage**: Assess severity and business impact
2. **Root Cause Analysis**: Investigate data source or system issues
3. **Fallback Procedures**: Activate backup data sources or estimates
4. **Issue Escalation**: Engage data providers or technical teams
5. **Resolution Validation**: Confirm fix and resume normal operations

### Quality Improvement
- **Trend Analysis**: Identify recurring quality issues
- **Process Enhancement**: Improve validation rules and procedures  
- **Vendor Management**: Work with data providers on quality improvements
- **System Upgrades**: Enhance monitoring and alerting capabilities

## Fallback and Recovery Strategies

### Data Source Redundancy
- **Primary Sources**: Preferred high-quality data providers
- **Secondary Sources**: Backup providers for critical data
- **Estimation Models**: Statistical methods for missing data imputation
- **Historical Proxies**: Using past patterns to estimate current values

### Automated Recovery
- **Retry Logic**: Automatic data retrieval attempts
- **Source Switching**: Failover to alternative data providers
- **Quality Scoring**: Dynamic source selection based on quality metrics
- **Graceful Degradation**: Reduced functionality during quality issues

## Integration with Trading Systems

### Pre-Trade Validation
- **Portfolio Construction**: Ensure all required data is available and accurate
- **Risk Calculations**: Validate risk metrics before trading decisions
- **Compliance Checks**: Verify regulatory and internal limit compliance
- **Performance Attribution**: Accurate data for return analysis

### Post-Trade Reconciliation
- **Trade Confirmation**: Validate executed trade details against market data
- **Settlement Tracking**: Monitor trade settlement and corporate actions
- **Performance Measurement**: Accurate calculation of returns and metrics
- **Reporting Preparation**: Ensure data quality for client reports

Understanding DQP is essential for maintaining the integrity of ADAF''s investment process and ensuring reliable decision-making based on high-quality data.', 
'lesson', ARRAY['dqp', 'data-quality', 'monitoring', 'ops'], ARRAY['intro-1-kpis']),

-- ADVANCED LEVEL  
('advanced-1-lineage', 'Data Lineage & Forensic Analysis', 'Master advanced data lineage tracking to understand the complete flow of data from sources through calculations to final reports, enabling forensic analysis of any data discrepancy.', 'advanced', 30,
'# Data Lineage & Forensic Analysis

## Overview
Data lineage provides complete visibility into the flow of data through ADAF''s systems, from initial ingestion through complex calculations to final client reports. This capability is essential for troubleshooting, compliance, and maintaining confidence in our quantitative processes.

## Data Lineage Fundamentals

### What is Data Lineage?
Data lineage is the complete audit trail of data movement and transformation throughout the investment process. It answers critical questions:
- Where did this data come from?
- How was it processed and transformed?  
- What calculations used this data?
- Which reports include this information?
- When did changes occur and who made them?

### Why Lineage Matters
- **Regulatory Compliance**: Demonstrating data governance and controls
- **Quality Assurance**: Rapid identification of data quality issues
- **Impact Analysis**: Understanding downstream effects of data changes
- **Forensic Investigation**: Diagnosing performance discrepancies
- **Audit Support**: Providing complete audit trails for internal and external reviews

## Lineage Architecture

### Data Flow Tracking
- **Source Registration**: All data inputs registered with metadata
- **Transformation Logging**: Every calculation and data manipulation recorded
- **Dependency Mapping**: Relationships between data elements tracked
- **Version Control**: Historical changes and data evolution captured

### Metadata Management
- **Schema Evolution**: Tracking changes to data structures over time
- **Business Context**: Linking technical data flows to business processes
- **Quality Metrics**: Associating quality scores with lineage paths
- **Access Patterns**: Recording how data is consumed by different systems

### Visual Lineage Graphs
- **Interactive Diagrams**: Click-through exploration of data relationships
- **Impact Analysis Views**: Upstream and downstream dependency visualization
- **Quality Overlays**: Color-coding for data quality status
- **Time-Based Views**: Historical lineage evolution over time

## Forensic Analysis Use Cases

### Performance Discrepancy Investigation
When strategy performance differs from expectations:
1. **Identify Affected Calculations**: Which metrics show discrepancies?
2. **Trace Input Data**: Follow lineage to source data feeds
3. **Validate Transformations**: Verify each calculation step
4. **Compare Historical Patterns**: Check for data or process changes
5. **Root Cause Identification**: Pinpoint exact source of discrepancy

### Data Quality Issue Resolution
When quality alerts are triggered:
1. **Scope Assessment**: Determine full impact of quality issue
2. **Source Analysis**: Trace problem to origin (provider, feed, calculation)
3. **Downstream Impact**: Identify all affected calculations and reports
4. **Remediation Planning**: Prioritize fixes based on business impact
5. **Validation**: Confirm resolution across entire lineage chain

### Regulatory Inquiry Response
For compliance investigations or audits:
1. **Data Provenance**: Demonstrate authoritative source of all data
2. **Calculation Verification**: Show step-by-step calculation methodology
3. **Change Documentation**: Provide history of any data or process changes
4. **Access Logging**: Show who accessed what data when
5. **Quality Assurance**: Demonstrate data validation and quality controls

## Lineage Query and Analysis

### Query Interface
- **Natural Language Queries**: "Show me all data sources for Strategy Alpha returns"
- **GraphQL API**: Programmatic access to lineage metadata
- **Visual Exploration**: Click-and-drag investigation tools
- **Saved Investigations**: Bookmark common analysis patterns

### Analysis Patterns
- **Impact Analysis**: "If this data source fails, what is affected?"
- **Source Tracing**: "Where did this calculated value originate?"
- **Quality Propagation**: "How does this quality issue spread through the system?"
- **Change Analysis**: "What changed between these two report versions?"

### Reporting and Documentation
- **Lineage Reports**: Formal documentation of data flows
- **Compliance Summaries**: Regulatory-focused lineage documentation
- **Quality Dashboards**: Real-time lineage health monitoring
- **Investigation Notes**: Collaborative forensic analysis workspace

## Advanced Lineage Features

### Automated Anomaly Detection
- **Pattern Recognition**: ML-based detection of unusual data flows
- **Baseline Comparison**: Alerting on deviations from normal patterns
- **Cross-System Correlation**: Identifying related issues across systems
- **Predictive Quality**: Forecasting potential data quality problems

### Business Impact Scoring
- **Criticality Weighting**: Prioritizing lineage paths by business importance
- **Client Impact Assessment**: Understanding downstream effects on clients
- **Risk Quantification**: Measuring potential financial impact of data issues
- **Recovery Time Estimation**: Predicting time to resolve lineage-related problems

### Integration with Operations
- **Incident Response**: Automatic lineage analysis during operational issues
- **Change Management**: Pre-assessment of proposed system changes
- **Capacity Planning**: Understanding data flow volume and complexity
- **Performance Optimization**: Identifying bottlenecks in data processing

## Best Practices

### Lineage Hygiene
1. **Complete Coverage**: Ensure all data flows are tracked
2. **Accurate Metadata**: Maintain up-to-date lineage information
3. **Regular Validation**: Periodically verify lineage accuracy
4. **Documentation Standards**: Consistent naming and description conventions

### Investigation Methodology
1. **Systematic Approach**: Follow structured investigation procedures
2. **Evidence Preservation**: Maintain complete records of forensic analysis
3. **Collaborative Review**: Engage multiple stakeholders in complex investigations
4. **Lessons Learned**: Document findings for future reference

### Operational Integration
1. **Daily Monitoring**: Regular review of lineage health metrics
2. **Alert Integration**: Connect lineage anomalies to operational alerting
3. **Training Programs**: Ensure team proficiency in lineage analysis
4. **Continuous Improvement**: Regular enhancement of lineage capabilities

Mastering data lineage and forensic analysis enables rapid resolution of complex data issues and maintains ADAF''s reputation for data integrity and transparency.', 
'lesson', ARRAY['lineage', 'forensics', 'data-governance', 'advanced'], ARRAY['core-3-dqp']),

('advanced-2-ops', 'Operations: Retention, CSP & Rate Limiting', 'Master advanced operational tools including data retention policies, Content Security Policy (CSP) enforcement, and rate limiting controls for maintaining system security and performance.', 'advanced', 45,
'# Operations: Retention, CSP & Rate Limiting

## Overview  
Advanced operational controls are essential for maintaining ADAF''s security posture, performance characteristics, and regulatory compliance. This lesson covers three critical operational domains: data retention policies, Content Security Policy enforcement, and API rate limiting.

## Data Retention Management

### Retention Policy Framework
Data retention policies balance business needs, regulatory requirements, and storage costs:
- **Business Requirements**: How long data is needed for operations
- **Regulatory Obligations**: Legal requirements for data preservation
- **Storage Optimization**: Managing costs and performance
- **Privacy Compliance**: GDPR and other privacy regulation adherence

### Retention Categories
Different data types have different retention requirements:

**Market Data (7+ years)**
- Historical pricing and volume data
- Corporate actions and adjustments
- Economic indicators and benchmarks
- Regulatory requirement for audit trails

**Portfolio Data (10+ years)**
- Transaction history and trade confirmations
- Position data and portfolio valuations
- Performance calculations and attribution
- Client reporting and compliance records

**System Logs (1-3 years)**
- Application logs and error messages
- Security events and access logs
- Performance metrics and monitoring data
- Operational procedures and changes

**Personal Data (Variable)**
- User accounts and access credentials
- Client communications and documents
- Employment records and internal data
- Subject to privacy regulations and consent

### Automated Retention Processing
- **Scheduled Cleanup**: Automated deletion of expired data
- **Archive Migration**: Moving old data to cheaper storage tiers
- **Compliance Reporting**: Tracking retention policy adherence
- **Legal Hold Management**: Preserving data for litigation or investigation

## Content Security Policy (CSP)

### CSP Fundamentals
Content Security Policy is a security standard that prevents code injection attacks by controlling which resources the browser is allowed to load:
- **Script Sources**: Controlling JavaScript execution
- **Style Sources**: Managing CSS and styling resources
- **Image Sources**: Restricting image loading domains
- **Connect Sources**: Limiting AJAX and WebSocket connections

### ADAF CSP Configuration
Our CSP policy balances security with functionality:

**Default Policy (Restrictive)**
```
default-src 'self';
script-src 'self' 'unsafe-inline' cdn.jsdelivr.net;
style-src 'self' 'unsafe-inline' fonts.googleapis.com;
font-src 'self' fonts.gstatic.com;
img-src 'self' data: https:;
connect-src 'self' api.adaf.com wss://realtime.adaf.com;
```

**Development Mode (Permissive)**
- Allows localhost connections for development
- Permits eval() and inline scripts for debugging
- Enables hot reload and development tools
- Should never be used in production

### CSP Enforcement Modes
- **Report-Only Mode**: Monitors violations without blocking
- **Enforcement Mode**: Actively blocks policy violations
- **Mixed Mode**: Different policies for different endpoints
- **Gradual Rollout**: Progressive tightening of policies

### Violation Monitoring
- **Real-Time Alerts**: Immediate notification of policy violations
- **Pattern Analysis**: Identifying systematic security issues
- **Source Investigation**: Tracing violation origins
- **Policy Adjustment**: Refining rules based on legitimate needs

## API Rate Limiting

### Rate Limiting Strategy
Rate limiting protects ADAF''s systems from abuse while ensuring fair resource allocation:
- **Abuse Prevention**: Stopping malicious or excessive usage
- **Resource Protection**: Preventing system overload
- **Fair Usage**: Ensuring equitable access for all users
- **Cost Control**: Managing infrastructure expenses

### Rate Limiting Tiers
Different user classes have different rate limits:

**Public API (Strict Limits)**
- 100 requests/hour for unauthenticated users
- 1,000 requests/hour for registered users
- Focused on market data and basic functionality
- Designed for external integration use cases

**Internal API (Moderate Limits)**  
- 10,000 requests/hour for authenticated staff
- Higher limits for dashboard and operational use
- Burst allowances for interactive usage
- Separate limits for different API categories

**System API (Minimal Limits)**
- Very high limits for internal service communication
- Separate tracking for service-to-service calls
- Circuit breaker integration for failure handling
- Performance monitoring and alerting

### Rate Limiting Implementation
- **Token Bucket Algorithm**: Smooth rate limiting with burst capacity
- **Sliding Window**: Time-based request counting
- **Distributed Limiting**: Consistent limits across multiple servers
- **Redis Backend**: Shared state for rate limit counters

### Rate Limit Headers
Standard HTTP headers communicate rate limit status:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 750  
X-RateLimit-Reset: 1640995200
X-RateLimit-Retry-After: 3600
```

## Operational Procedures

### Retention Job Execution
Regular maintenance tasks keep data retention policies current:
1. **Analysis Phase**: Identify data eligible for retention processing
2. **Validation Phase**: Confirm no legal holds or business exceptions
3. **Archive Phase**: Move data to long-term storage if required
4. **Deletion Phase**: Permanently remove expired data
5. **Reporting Phase**: Document retention actions and compliance

### CSP Policy Updates
Changes to CSP require careful coordination:
1. **Policy Review**: Analyze current violations and business needs
2. **Staging Testing**: Validate new policies in non-production environment
3. **Gradual Rollout**: Implement changes incrementally across user segments
4. **Monitoring Phase**: Watch for unexpected violations or functionality issues
5. **Full Deployment**: Complete rollout after successful validation

### Rate Limit Adjustments  
Rate limit changes require performance and usage analysis:
1. **Usage Analysis**: Review current API usage patterns and trends
2. **Capacity Assessment**: Ensure system can handle proposed limits
3. **User Communication**: Notify affected users of limit changes
4. **Implementation**: Deploy new limits with monitoring
5. **Feedback Collection**: Gather user feedback and adjust if necessary

## Integration Points

### Monitoring and Alerting
- **Retention Compliance**: Alerts for retention policy violations
- **CSP Violations**: Real-time security policy breach notifications  
- **Rate Limit Breaches**: Notifications of excessive API usage
- **System Performance**: Correlation between policies and system health

### Audit and Compliance
- **Retention Reporting**: Regular compliance reports for regulators
- **Security Posture**: CSP effectiveness and vulnerability management
- **Usage Analytics**: API consumption patterns and fair usage monitoring
- **Policy Documentation**: Maintaining current operational procedures

## Emergency Procedures

### Data Recovery
- **Accidental Deletion**: Procedures for recovering mistakenly deleted data
- **Legal Hold Activation**: Rapidly preserving data for legal proceedings
- **Retention Extension**: Extending retention periods for business needs
- **Audit Preparation**: Quickly assembling data for regulatory requests

### Security Incidents
- **CSP Bypass Attempts**: Responding to security policy violations
- **Rate Limit Evasion**: Detecting and preventing abuse attempts
- **System Compromise**: Emergency security measures and policy tightening
- **Incident Documentation**: Complete logging and forensic analysis

Mastering these advanced operational controls ensures ADAF maintains the highest standards of security, compliance, and system reliability while supporting business objectives and regulatory requirements.', 
'lesson', ARRAY['ops', 'retention', 'csp', 'rate-limiting', 'security'], ARRAY['core-3-dqp', 'advanced-1-lineage']);

-- Insert Quizzes
INSERT INTO quizzes (lesson_id, title, description, items, pass_percentage, time_limit_minutes) VALUES

((SELECT id FROM lessons WHERE code = 'intro-1-kpis'), 'KPIs & Guardrails Assessment', 'Test your understanding of key performance indicators and risk management controls.', 
'[
  {
    "question": "What does NAV stand for in investment management?",
    "choices": ["Net Asset Value", "Net Annual Value", "Normalized Asset Variance", "National Asset Verification"],
    "answerIdx": 0,
    "explanation": "NAV (Net Asset Value) represents the total value of strategy assets minus liabilities, providing the fundamental measure of portfolio worth."
  },
  {
    "question": "Which metric measures risk-adjusted returns?",
    "choices": ["Total Return", "Maximum Drawdown", "Sharpe Ratio", "Hit Rate"],
    "answerIdx": 2,
    "explanation": "The Sharpe Ratio measures excess return per unit of risk (volatility), providing a standardized way to compare risk-adjusted performance."
  },
  {
    "question": "What is the primary purpose of LTV (Loan-to-Value) limits?",
    "choices": ["Maximize returns", "Control leverage risk", "Increase trading frequency", "Reduce transaction costs"],
    "answerIdx": 1,
    "explanation": "LTV limits control the maximum leverage allowed per position, preventing excessive borrowing that could amplify losses."
  },
  {
    "question": "VaR (Value at Risk) measures:",
    "choices": ["Average daily return", "Maximum potential loss over a time horizon", "Total portfolio value", "Trading volume"],
    "answerIdx": 1,
    "explanation": "VaR quantifies the maximum potential loss over a specific time period at a given confidence level, helping assess downside risk."
  },
  {
    "question": "High Frequency trading limits help control:",
    "choices": ["Market volatility", "Transaction costs", "Asset allocation", "Benchmark tracking"],
    "answerIdx": 1,
    "explanation": "High frequency limits prevent excessive trading that can erode returns through accumulated transaction costs and market impact."
  }
]'::JSONB, 80, 15),

((SELECT id FROM lessons WHERE code = 'core-1-research'), 'Research & Backtesting Mastery', 'Evaluate your knowledge of the research workflow and strategy promotion process.',
'[
  {
    "question": "What is the minimum Sharpe Ratio required for strategy promotion?",
    "choices": ["0.8", "1.0", "1.2", "1.5"],
    "answerIdx": 2,
    "explanation": "ADAF requires a minimum Sharpe Ratio of 1.2 to ensure strategies deliver adequate risk-adjusted returns before promotion to live trading."
  },
  {
    "question": "Maximum drawdown limits for strategy promotion are:",
    "choices": ["≤ 10%", "≤ 15%", "≤ 20%", "≤ 25%"],
    "answerIdx": 1,
    "explanation": "Strategies must demonstrate drawdown control with maximum losses ≤ 15% to qualify for promotion, ensuring acceptable risk management."
  },
  {
    "question": "What does hit rate measure in backtesting?",
    "choices": ["Total return", "Percentage of profitable periods", "Trading frequency", "Market correlation"],
    "answerIdx": 1,
    "explanation": "Hit rate measures the percentage of profitable periods or trades, indicating strategy consistency and reliability."
  },
  {
    "question": "The minimum track record for strategy promotion is:",
    "choices": ["6 months", "1 year", "2 years", "3 years"],
    "answerIdx": 2,
    "explanation": "Strategies require at least 2 years of backtest data to demonstrate performance across different market conditions before promotion."
  },
  {
    "question": "What is the primary purpose of out-of-sample testing?",
    "choices": ["Increase returns", "Reduce overfitting", "Speed up backtests", "Simplify analysis"],
    "answerIdx": 1,
    "explanation": "Out-of-sample testing validates strategy performance on unseen data, helping identify and reduce overfitting to historical patterns."
  }
]'::JSONB, 80, 20),

((SELECT id FROM lessons WHERE code = 'core-2-reports'), 'Investment Reporting Excellence', 'Test your understanding of investment metrics and reporting best practices.',
'[
  {
    "question": "TVPI (Total Value to Paid-In) represents:",
    "choices": ["Annual return rate", "Multiple of invested capital returned", "Risk-adjusted return", "Transaction volume"],
    "answerIdx": 1,
    "explanation": "TVPI measures the total value (distributions + residual value) relative to paid-in capital, showing the multiple of investment returned."
  },
  {
    "question": "What does DPI measure in investment reporting?",
    "choices": ["Dividend Per Investment", "Distributions to Paid-In", "Daily Performance Index", "Diversification Portfolio Indicator"],
    "answerIdx": 1,
    "explanation": "DPI (Distributions to Paid-In) measures the cash returned to investors relative to their total investment, indicating liquidity realization."
  },
  {
    "question": "IRR (Internal Rate of Return) differs from simple returns because it:",
    "choices": ["Ignores time", "Accounts for cash flow timing", "Only measures gains", "Excludes fees"],
    "answerIdx": 1,
    "explanation": "IRR accounts for the timing of cash flows, providing a time-weighted return that reflects the actual investment experience."
  },
  {
    "question": "GIPS compliance in reporting ensures:",
    "choices": ["Higher returns", "Standardized performance presentation", "Lower fees", "Faster execution"],
    "answerIdx": 1,
    "explanation": "GIPS (Global Investment Performance Standards) ensures fair and consistent performance presentation across different managers and strategies."
  },
  {
    "question": "Portfolio of Records (PoR) primarily focuses on:",
    "choices": ["Trading frequency", "Asset allocation and position sizing", "Market timing", "Cost reduction"],
    "answerIdx": 1,
    "explanation": "PoR documents the strategic and tactical asset allocation decisions and individual position weights that drive portfolio construction."
  }
]'::JSONB, 80, 18);

-- Insert more quizzes for remaining lessons
INSERT INTO quizzes (lesson_id, title, description, items, pass_percentage, time_limit_minutes) VALUES

((SELECT id FROM lessons WHERE code = 'core-3-dqp'), 'Data Quality Mastery', 'Assess your knowledge of data quality monitoring and pipeline management.',
'[
  {
    "question": "What are the four main dimensions of data quality in DQP?",
    "choices": ["Speed, Volume, Variety, Veracity", "Freshness, Completeness, Accuracy, Consistency", "Input, Process, Output, Feedback", "Source, Transform, Load, Validate"],
    "answerIdx": 1,
    "explanation": "DQP monitors Freshness (timeliness), Completeness (coverage), Accuracy (correctness), and Consistency (reliability) as the four core quality dimensions."
  },
  {
    "question": "A CRITICAL data quality failure requires:",
    "choices": ["Weekly review", "End-of-day analysis", "Immediate attention and escalation", "Monthly reporting"],
    "answerIdx": 2,
    "explanation": "CRITICAL failures indicate essential data unavailability or system issues that can impact trading decisions, requiring immediate response."
  },
  {
    "question": "Data staleness detection helps identify:",
    "choices": ["Calculation errors", "Missing updates beyond acceptable thresholds", "Network issues", "Storage problems"],
    "answerIdx": 1,
    "explanation": "Staleness detection monitors when data hasn''t been updated within expected timeframes, indicating potential feed or system issues."
  },
  {
    "question": "Fallback procedures in DQP include:",
    "choices": ["Only manual data entry", "Backup data sources and estimation models", "Shutting down systems", "Ignoring quality issues"],
    "answerIdx": 1,
    "explanation": "DQP employs backup data sources, statistical estimation models, and historical proxies to maintain operations during quality issues."
  },
  {
    "question": "Cross-validation in data quality involves:",
    "choices": ["Single source verification", "Comparing data from multiple providers", "Internal calculations only", "Historical analysis only"],
    "answerIdx": 1,
    "explanation": "Cross-validation compares data from multiple independent sources to identify discrepancies and verify accuracy through consensus."
  }
]'::JSONB, 75, 15),

((SELECT id FROM lessons WHERE code = 'advanced-1-lineage'), 'Data Lineage & Forensics Expert', 'Test your advanced skills in data lineage analysis and forensic investigation.',
'[
  {
    "question": "Data lineage primarily helps with:",
    "choices": ["Faster calculations", "Complete audit trail and impact analysis", "Reduced storage costs", "Improved user interface"],
    "answerIdx": 1,
    "explanation": "Data lineage provides complete visibility into data flow and transformations, enabling forensic analysis and impact assessment."
  },
  {
    "question": "When investigating a performance discrepancy, the first step should be:",
    "choices": ["Blame the data provider", "Identify affected calculations and metrics", "Restart all systems", "Generate new reports"],
    "answerIdx": 1,
    "explanation": "Systematic forensic analysis starts with identifying which specific calculations or metrics show discrepancies before tracing upstream."
  },
  {
    "question": "Lineage metadata management includes:",
    "choices": ["Only current data structure", "Schema evolution and historical changes", "User preferences only", "System configuration only"],
    "answerIdx": 1,
    "explanation": "Comprehensive lineage tracking includes schema evolution, historical changes, business context, and quality metrics over time."
  },
  {
    "question": "Business impact scoring in lineage helps:",
    "choices": ["Reduce storage costs", "Prioritize issues by business criticality", "Speed up calculations", "Improve user experience"],
    "answerIdx": 1,
    "explanation": "Impact scoring helps prioritize lineage-related issues based on business criticality and potential client impact."
  },
  {
    "question": "Automated anomaly detection in lineage can identify:",
    "choices": ["Only calculation errors", "Unusual data flows and pattern deviations", "Network latency only", "User login issues"],
    "answerIdx": 1,
    "explanation": "ML-based anomaly detection identifies unusual data flow patterns and deviations from normal lineage behavior across systems."
  }
]'::JSONB, 85, 25),

((SELECT id FROM lessons WHERE code = 'advanced-2-ops'), 'Advanced Operations Expert', 'Master-level assessment of retention, CSP, and rate limiting operational controls.',
'[
  {
    "question": "Market data retention requirements are typically:",
    "choices": ["1-2 years", "3-5 years", "7+ years", "No retention required"],
    "answerIdx": 2,
    "explanation": "Market data must be retained for 7+ years to meet regulatory requirements for audit trails and compliance documentation."
  },
  {
    "question": "Content Security Policy (CSP) primarily prevents:",
    "choices": ["Network latency", "Code injection attacks", "Data corruption", "System overload"],
    "answerIdx": 1,
    "explanation": "CSP prevents XSS and code injection attacks by controlling which resources browsers are allowed to load and execute."
  },
  {
    "question": "The default CSP directive ''default-src self'' means:",
    "choices": ["Block all content", "Allow only same-origin resources", "Allow all HTTPS content", "Require authentication"],
    "answerIdx": 1,
    "explanation": "''self'' restricts resource loading to the same origin (protocol, domain, port), providing strong default security."
  },
  {
    "question": "Rate limiting using token bucket algorithm provides:",
    "choices": ["Fixed rate only", "Smooth rate limiting with burst capacity", "No rate control", "User-based limits only"],
    "answerIdx": 1,
    "explanation": "Token bucket allows smooth rate limiting while accommodating burst traffic, providing flexible and fair resource allocation."
  },
  {
    "question": "Legal hold processing requires:",
    "choices": ["Immediate data deletion", "Preserving data despite retention policies", "Faster data processing", "Reduced security"],
    "answerIdx": 1,
    "explanation": "Legal holds override normal retention policies, preserving data that would otherwise be deleted due to litigation or investigation needs."
  }
]'::JSONB, 85, 30);

COMMIT;