/**
 * ADAF Dashboard Performance Testing Suite with k6
 * 
 * This file contains comprehensive performance tests for the ADAF Dashboard
 * covering load testing, stress testing, spike testing, and endurance testing.
 * 
 * Test Types:
 * - Load Test: Normal expected traffic patterns
 * - Stress Test: Beyond normal capacity to find breaking points  
 * - Spike Test: Sudden traffic increases (news events, market volatility)
 * - Endurance Test: Sustained load over extended periods
 * 
 * Usage:
 * k6 run --vus 50 --duration 10m load-test.js           # Load test
 * k6 run --vus 200 --duration 5m stress-test.js        # Stress test
 * k6 run --stage "0:0s,100:30s,0:30s" spike-test.js    # Spike test
 * k6 run --vus 100 --duration 30m endurance-test.js    # Endurance test
 */

import http from 'k6/http';
import { check, group, sleep, fail } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// Custom metrics for ADAF-specific monitoring
const apiResponseTime = new Trend('adaf_api_response_time');
const databaseQueryTime = new Trend('adaf_database_query_time');
const cacheHitRate = new Rate('adaf_cache_hit_rate');
const errorRate = new Rate('adaf_error_rate');
const concurrentUsers = new Gauge('adaf_concurrent_users');
const businessMetrics = {
  portfolioLoads: new Counter('adaf_portfolio_loads'),
  strategyViews: new Counter('adaf_strategy_views'),
  marketDataRequests: new Counter('adaf_market_data_requests'),
  reportGenerations: new Counter('adaf_report_generations')
};

// Test configuration
export const options = {
  // Default test scenario (can be overridden by command line)
  stages: [
    { duration: '2m', target: 20 },   // Ramp up to 20 users
    { duration: '5m', target: 50 },   // Stay at 50 users  
    { duration: '5m', target: 100 },  // Scale to 100 users
    { duration: '3m', target: 200 },  // Peak load at 200 users
    { duration: '5m', target: 0 },    // Ramp down
  ],
  
  // Performance thresholds - tests fail if these are not met
  thresholds: {
    // Overall HTTP performance
    'http_req_duration': ['p(95)<500', 'p(99)<1000'], // 95% under 500ms, 99% under 1s
    'http_req_failed': ['rate<0.01'], // Error rate under 1%
    
    // ADAF-specific thresholds
    'adaf_api_response_time': ['p(95)<200', 'p(99)<500'],
    'adaf_database_query_time': ['p(95)<50', 'p(99)<100'],
    'adaf_cache_hit_rate': ['rate>0.85'], // Cache hit rate above 85%
    'adaf_error_rate': ['rate<0.005'], // Business error rate under 0.5%
    
    // Endpoint-specific thresholds
    'group_duration{group:::Dashboard Load}': ['p(95)<2000'], // Dashboard loads under 2s
    'group_duration{group:::Portfolio Operations}': ['p(95)<1000'], // Portfolio ops under 1s
    'group_duration{group:::Market Data Access}': ['p(95)<300'], // Market data under 300ms
    'group_duration{group:::Strategy Analysis}': ['p(95)<800'], // Strategy analysis under 800ms
  }
};

// Test environment configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_BASE_URL = `${BASE_URL}/api`;

// Authentication setup (for realistic testing)
const TEST_USERS = [
  { username: 'test_user_1', password: 'test_password_1' },
  { username: 'test_user_2', password: 'test_password_2' },
  { username: 'test_user_3', password: 'test_password_3' },
  // Add more test users as needed
];

// Test data sets
const TEST_SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'BTC-USD', 'ETH-USD'];
const TEST_STRATEGIES = ['momentum', 'mean_reversion', 'arbitrage', 'pairs_trading', 'market_neutral'];
const TEST_TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d'];

// Utility functions
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomUser() {
  return getRandomElement(TEST_USERS);
}

function authenticateUser() {
  const user = getRandomUser();
  
  const loginResponse = http.post(`${API_BASE_URL}/auth/login`, JSON.stringify({
    username: user.username,
    password: user.password
  }), {
    headers: { 'Content-Type': 'application/json' }
  });

  check(loginResponse, {
    'login successful': (r) => r.status === 200,
    'received auth token': (r) => r.json('token') !== undefined
  });

  if (loginResponse.status === 200) {
    const token = loginResponse.json('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }
  
  return null;
}

function measureApiCall(url, method = 'GET', payload = null, headers = {}) {
  const startTime = Date.now();
  
  let response;
  if (method === 'POST') {
    response = http.post(url, payload ? JSON.stringify(payload) : null, { headers });
  } else if (method === 'PUT') {
    response = http.put(url, payload ? JSON.stringify(payload) : null, { headers });
  } else {
    response = http.get(url, { headers });
  }
  
  const endTime = Date.now();
  const responseTime = endTime - startTime;
  
  // Record custom metrics
  apiResponseTime.add(responseTime);
  
  // Check for cache headers
  const cacheHeader = response.headers['X-Cache'];
  if (cacheHeader) {
    cacheHitRate.add(cacheHeader === 'HIT');
  }
  
  // Check for database query time header
  const dbTime = response.headers['X-DB-Query-Time'];
  if (dbTime) {
    databaseQueryTime.add(parseFloat(dbTime));
  }
  
  // Record error rate
  errorRate.add(response.status >= 400);
  
  return response;
}

// Main test function
export default function () {
  // Authenticate user for this VU
  const authHeaders = authenticateUser();
  if (!authHeaders) {
    fail('Authentication failed');
  }
  
  // Record concurrent user count
  concurrentUsers.add(1);
  
  // Simulate user session with realistic workflow
  group('User Session', () => {
    
    // 1. Dashboard Load (most common user action)
    group('Dashboard Load', () => {
      const dashboardResponse = measureApiCall(`${API_BASE_URL}/dashboard`, 'GET', null, authHeaders);
      
      check(dashboardResponse, {
        'dashboard loads successfully': (r) => r.status === 200,
        'dashboard response time acceptable': (r) => r.timings.duration < 2000,
        'dashboard contains required data': (r) => {
          const data = r.json();
          return data.portfolio && data.strategies && data.marketSummary;
        }
      });
      
      businessMetrics.portfolioLoads.add(1);
    });
    
    sleep(1); // User reading dashboard
    
    // 2. Portfolio Operations (high value actions)
    group('Portfolio Operations', () => {
      // Get portfolio positions
      const portfolioResponse = measureApiCall(`${API_BASE_URL}/portfolio/positions`, 'GET', null, authHeaders);
      
      check(portfolioResponse, {
        'portfolio loads successfully': (r) => r.status === 200,
        'portfolio has positions': (r) => Array.isArray(r.json().positions)
      });
      
      businessMetrics.portfolioLoads.add(1);
      
      // Get portfolio performance
      const performanceResponse = measureApiCall(`${API_BASE_URL}/portfolio/performance`, 'GET', null, authHeaders);
      
      check(performanceResponse, {
        'performance data loads': (r) => r.status === 200,
        'performance metrics present': (r) => {
          const data = r.json();
          return data.totalReturn !== undefined && data.sharpeRatio !== undefined;
        }
      });
    });
    
    sleep(2); // User analyzing portfolio
    
    // 3. Market Data Access (frequent, cached requests)
    group('Market Data Access', () => {
      const symbol = getRandomElement(TEST_SYMBOLS);
      const timeframe = getRandomElement(TEST_TIMEFRAMES);
      
      const marketDataResponse = measureApiCall(
        `${API_BASE_URL}/market-data/${symbol}?timeframe=${timeframe}`,
        'GET',
        null,
        authHeaders
      );
      
      check(marketDataResponse, {
        'market data loads': (r) => r.status === 200,
        'market data is current': (r) => {
          const data = r.json();
          return data.prices && data.prices.length > 0;
        },
        'response from cache or fast': (r) => r.timings.duration < 300
      });
      
      businessMetrics.marketDataRequests.add(1);
    });
    
    sleep(1);
    
    // 4. Strategy Analysis (computation-heavy operations)
    group('Strategy Analysis', () => {
      const strategy = getRandomElement(TEST_STRATEGIES);
      const symbol = getRandomElement(TEST_SYMBOLS);
      
      const strategyResponse = measureApiCall(
        `${API_BASE_URL}/strategies/${strategy}/performance?symbol=${symbol}`,
        'GET',
        null,
        authHeaders
      );
      
      check(strategyResponse, {
        'strategy data loads': (r) => r.status === 200,
        'strategy has performance metrics': (r) => {
          const data = r.json();
          return data.returns && data.drawdown !== undefined;
        }
      });
      
      businessMetrics.strategyViews.add(1);
    });
    
    sleep(3); // User analyzing strategy
    
    // 5. Occasional Report Generation (resource intensive)
    if (Math.random() < 0.1) { // 10% of users generate reports
      group('Report Generation', () => {
        const reportResponse = measureApiCall(
          `${API_BASE_URL}/reports/portfolio-summary`,
          'POST',
          { format: 'pdf', period: '1M' },
          authHeaders
        );
        
        check(reportResponse, {
          'report generation starts': (r) => r.status === 202 || r.status === 200,
          'report job id provided': (r) => r.json('jobId') !== undefined
        });
        
        businessMetrics.reportGenerations.add(1);
      });
    }
    
    // 6. Search Operations (text search, potentially slow)
    if (Math.random() < 0.3) { // 30% of users search
      group('Search Operations', () => {
        const searchTerm = getRandomElement(['Apple', 'Tesla', 'Bitcoin', 'SPY', 'QQQ']);
        
        const searchResponse = measureApiCall(
          `${API_BASE_URL}/search?q=${encodeURIComponent(searchTerm)}&type=all`,
          'GET',
          null,
          authHeaders
        );
        
        check(searchResponse, {
          'search returns results': (r) => r.status === 200,
          'search response time acceptable': (r) => r.timings.duration < 1000
        });
      });
    }
  });
  
  // Simulate think time between user actions
  sleep(Math.random() * 3 + 1); // 1-4 seconds
}

// Load test specific configuration
export const loadTestOptions = {
  stages: [
    { duration: '5m', target: 50 },   // Ramp up to 50 users
    { duration: '10m', target: 100 }, // Normal load
    { duration: '5m', target: 0 },    // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<300', 'p(99)<500'],
    'http_req_failed': ['rate<0.005'],
  }
};

// Stress test specific configuration  
export const stressTestOptions = {
  stages: [
    { duration: '2m', target: 100 },  // Quick ramp to baseline
    { duration: '5m', target: 200 },  // Stress level
    { duration: '5m', target: 400 },  // High stress
    { duration: '5m', target: 600 },  // Breaking point
    { duration: '3m', target: 0 },    // Recovery
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1000'], // More lenient during stress
    'http_req_failed': ['rate<0.02'],    // Allow higher error rate
  }
};

// Spike test configuration
export const spikeTestOptions = {
  stages: [
    { duration: '1m', target: 50 },   // Normal baseline
    { duration: '30s', target: 500 }, // Sudden spike
    { duration: '1m', target: 50 },   // Back to baseline  
    { duration: '30s', target: 800 }, // Larger spike
    { duration: '2m', target: 50 },   // Recovery
  ]
};

// Endurance test configuration
export const enduranceTestOptions = {
  stages: [
    { duration: '5m', target: 100 },  // Ramp up
    { duration: '30m', target: 100 }, // Sustained load
    { duration: '5m', target: 0 },    // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<400'],
    'http_req_failed': ['rate<0.01'],
    // Memory leak detection
    'adaf_api_response_time': ['p(95)<300', 'trend<0.02'], // Response time shouldn't increase
  }
};

// Custom HTML report generation
export function handleSummary(data) {
  return {
    'performance-test-report.html': htmlReport(data),
    'performance-test-summary.txt': textSummary(data, { indent: ' ', enableColors: true }),
    'performance-test-results.json': JSON.stringify(data),
  };
}

// Setup function (runs once at start)
export function setup() {
  console.log('Starting ADAF Dashboard Performance Tests');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test Users: ${TEST_USERS.length}`);
  
  // Verify application is accessible
  const healthCheck = http.get(`${BASE_URL}/api/health`);
  if (healthCheck.status !== 200) {
    throw new Error('Application health check failed - cannot start tests');
  }
  
  console.log('Application health check passed');
  
  return {
    startTime: Date.now(),
    baseUrl: BASE_URL,
    testConfig: options
  };
}

// Teardown function (runs once at end)
export function teardown(data) {
  const duration = Date.now() - data.startTime;
  console.log(`Performance tests completed in ${duration}ms`);
  
  // Could send results to monitoring system here
  // e.g., sendToDatadog(data), sendToGrafana(data), etc.
}