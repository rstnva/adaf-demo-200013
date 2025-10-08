/**
 * Client-side caching configuration for ADAF Dashboard
 * Handles browser caching, service worker, and local storage strategies
 */

// Browser storage configurations
export const CLIENT_CACHE_CONFIG = {
  // Local Storage configuration
  localStorage: {
    maxSize: 5 * 1024 * 1024, // 5MB limit
    keyPrefix: 'adaf_cache_',
    defaultTTL: 3600000, // 1 hour in milliseconds
    strategies: {
      userPreferences: {
        key: 'user_preferences',
        ttl: 7 * 24 * 3600000, // 7 days
        syncWithServer: true
      },
      watchlist: {
        key: 'user_watchlist',
        ttl: 3600000, // 1 hour
        syncWithServer: true
      },
      dashboardLayout: {
        key: 'dashboard_layout',
        ttl: 7 * 24 * 3600000, // 7 days
        syncWithServer: false
      },
      recentSearches: {
        key: 'recent_searches',
        ttl: 24 * 3600000, // 24 hours
        maxItems: 10,
        syncWithServer: false
      }
    }
  },

  // Session Storage configuration (temporary data)
  sessionStorage: {
    keyPrefix: 'adaf_session_',
    strategies: {
      temporaryData: {
        key: 'temp_data',
        maxSize: 1024 * 1024 // 1MB
      },
      formData: {
        key: 'form_data',
        autoSave: true
      },
      navigationState: {
        key: 'nav_state',
        trackHistory: true
      }
    }
  },

  // IndexedDB configuration (large datasets)
  indexedDB: {
    dbName: 'adaf_cache_db',
    version: 1,
    stores: {
      marketData: {
        keyPath: 'symbol',
        ttl: 5 * 60000, // 5 minutes
        maxEntries: 1000
      },
      portfolioData: {
        keyPath: 'userId',
        ttl: 10 * 60000, // 10 minutes
        maxEntries: 100
      },
      strategyData: {
        keyPath: 'strategyId',
        ttl: 15 * 60000, // 15 minutes
        maxEntries: 500
      }
    }
  },

  // HTTP Cache configuration
  httpCache: {
    cacheControl: {
      static: 'public, max-age=31536000, immutable', // 1 year for static assets
      api: 'public, max-age=300, stale-while-revalidate=60', // 5 minutes with stale-while-revalidate
      dynamic: 'public, max-age=60, must-revalidate' // 1 minute for dynamic content
    },
    etag: {
      enabled: true,
      algorithm: 'sha256'
    }
  }
};

/**
 * Client-side cache management class
 */
export class ClientCacheManager {
  private static instance: ClientCacheManager;
  private db: IDBDatabase | null = null;
  
  static getInstance(): ClientCacheManager {
    if (!ClientCacheManager.instance) {
      ClientCacheManager.instance = new ClientCacheManager();
    }
    return ClientCacheManager.instance;
  }

  /**
   * Initialize IndexedDB
   */
  async initIndexedDB(): Promise<void> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      console.warn('IndexedDB not supported');
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(
        CLIENT_CACHE_CONFIG.indexedDB.dbName,
        CLIENT_CACHE_CONFIG.indexedDB.version
      );

      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        Object.entries(CLIENT_CACHE_CONFIG.indexedDB.stores).forEach(([storeName, config]) => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: config.keyPath });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('ttl', 'ttl', { unique: false });
          }
        });
      };
    });
  }

  /**
   * Local Storage operations
   */
  setLocalStorage<T>(key: string, data: T, ttl?: number): boolean {
    if (typeof window === 'undefined') return false;

    try {
      const item = {
        data,
        timestamp: Date.now(),
        ttl: ttl || CLIENT_CACHE_CONFIG.localStorage.defaultTTL
      };

      const serialized = JSON.stringify(item);
      
      // Check size limits
      if (serialized.length > CLIENT_CACHE_CONFIG.localStorage.maxSize) {
        console.warn('Data too large for localStorage');
        return false;
      }

      localStorage.setItem(
        `${CLIENT_CACHE_CONFIG.localStorage.keyPrefix}${key}`,
        serialized
      );

      return true;
    } catch (error) {
      console.error('LocalStorage set error:', error);
      return false;
    }
  }

  getLocalStorage<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;

    try {
      const item = localStorage.getItem(`${CLIENT_CACHE_CONFIG.localStorage.keyPrefix}${key}`);
      
      if (!item) return null;

      const parsed = JSON.parse(item);
      
      // Check if expired
      if (Date.now() - parsed.timestamp > parsed.ttl) {
        this.removeLocalStorage(key);
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.error('LocalStorage get error:', error);
      return null;
    }
  }

  removeLocalStorage(key: string): boolean {
    if (typeof window === 'undefined') return false;

    try {
      localStorage.removeItem(`${CLIENT_CACHE_CONFIG.localStorage.keyPrefix}${key}`);
      return true;
    } catch (error) {
      console.error('LocalStorage remove error:', error);
      return false;
    }
  }

  /**
   * IndexedDB operations
   */
  async setIndexedDB<T>(storeName: string, key: string, data: T): Promise<boolean> {
    if (!this.db) {
      await this.initIndexedDB();
    }

    if (!this.db) return false;

    const storeConfig = CLIENT_CACHE_CONFIG.indexedDB.stores[storeName];
    if (!storeConfig) return false;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const item = {
        [storeConfig.keyPath]: key,
        data,
        timestamp: Date.now(),
        ttl: storeConfig.ttl
      };

      const request = store.put(item);
      
      request.onsuccess = () => resolve(true);
      request.onerror = () => {
        console.error('IndexedDB set error:', request.error);
        resolve(false);
      };
    });
  }

  async getIndexedDB<T>(storeName: string, key: string): Promise<T | null> {
    if (!this.db) {
      await this.initIndexedDB();
    }

    if (!this.db) return null;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        
        if (!result) {
          resolve(null);
          return;
        }

        // Check if expired
        if (Date.now() - result.timestamp > result.ttl) {
          this.removeIndexedDB(storeName, key);
          resolve(null);
          return;
        }

        resolve(result.data);
      };

      request.onerror = () => {
        console.error('IndexedDB get error:', request.error);
        resolve(null);
      };
    });
  }

  async removeIndexedDB(storeName: string, key: string): Promise<boolean> {
    if (!this.db) return false;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve(true);
      request.onerror = () => {
        console.error('IndexedDB remove error:', request.error);
        resolve(false);
      };
    });
  }

  /**
   * Memory cache (in-memory for session duration)
   */
  private memoryCache = new Map<string, { data: unknown; timestamp: number; ttl: number }>();

  setMemoryCache<T>(key: string, data: T, ttl = 300000): void { // Default 5 minutes
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  getMemoryCache<T>(key: string): T | null {
    const item = this.memoryCache.get(key);
    
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.memoryCache.delete(key);
      return null;
    }

    return item.data as T;
  }

  /**
   * Smart caching strategy - choose best storage based on data characteristics
   */
  async smartCache<T>(
    key: string,
    data: T,
    options: {
      priority: 'speed' | 'persistence' | 'size';
      ttl?: number;
      size?: number;
    }
  ): Promise<boolean> {
    const { priority, ttl = 300000, size } = options;

    try {
      // Choose storage strategy based on priority and data characteristics
      switch (priority) {
        case 'speed':
          // Memory cache for fastest access
          this.setMemoryCache(key, data, ttl);
          return true;

        case 'persistence':
          // LocalStorage for data that should survive browser restart
          return this.setLocalStorage(key, data, ttl);

        case 'size':
          // IndexedDB for large datasets
          const storeName = this.getOptimalStoreName(key);
          return await this.setIndexedDB(storeName, key, data);

        default:
          // Default to memory cache
          this.setMemoryCache(key, data, ttl);
          return true;
      }
    } catch (error) {
      console.error('Smart cache error:', error);
      return false;
    }
  }

  async smartRetrieve<T>(key: string): Promise<T | null> {
    // Try memory cache first (fastest)
    let result = this.getMemoryCache<T>(key);
    if (result !== null) return result;

    // Try localStorage next
    result = this.getLocalStorage<T>(key);
    if (result !== null) {
      // Promote to memory cache for faster future access
      this.setMemoryCache(key, result);
      return result;
    }

    // Try IndexedDB last
    const storeName = this.getOptimalStoreName(key);
    result = await this.getIndexedDB<T>(storeName, key);
    if (result !== null) {
      // Promote to memory cache
      this.setMemoryCache(key, result);
      return result;
    }

    return null;
  }

  /**
   * Cache cleanup and maintenance
   */
  async cleanup(): Promise<void> {
    // Clean memory cache
    const now = Date.now();
    for (const [key, item] of this.memoryCache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.memoryCache.delete(key);
      }
    }

    // Clean localStorage
    if (typeof window !== 'undefined') {
      const prefix = CLIENT_CACHE_CONFIG.localStorage.keyPrefix;
      Object.keys(localStorage)
        .filter(key => key.startsWith(prefix))
        .forEach(key => {
          try {
            const item = JSON.parse(localStorage.getItem(key) || '');
            if (now - item.timestamp > item.ttl) {
              localStorage.removeItem(key);
            }
          } catch {
            // Remove corrupted entries
            localStorage.removeItem(key);
          }
        });
    }

    // Clean IndexedDB (implement based on TTL indices)
    await this.cleanIndexedDB();
  }

  private async cleanIndexedDB(): Promise<void> {
    if (!this.db) return;

    const stores = Object.keys(CLIENT_CACHE_CONFIG.indexedDB.stores);
    
    for (const storeName of stores) {
      try {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const index = store.index('timestamp');
        
        const request = index.openCursor();
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            const record = cursor.value;
            if (Date.now() - record.timestamp > record.ttl) {
              cursor.delete();
            }
            cursor.continue();
          }
        };
      } catch (error) {
        console.error(`IndexedDB cleanup error for store ${storeName}:`, error);
      }
    }
  }

  private getOptimalStoreName(key: string): string {
    // Simple heuristic - could be made more sophisticated
    if (key.includes('market')) return 'marketData';
    if (key.includes('portfolio')) return 'portfolioData';
    if (key.includes('strategy')) return 'strategyData';
    return 'marketData'; // Default fallback
  }

  /**
   * Cache statistics
   */
  getCacheStats() {
    return {
      memoryCache: {
        size: this.memoryCache.size,
        keys: Array.from(this.memoryCache.keys())
      },
      localStorage: {
        available: typeof window !== 'undefined' && !!window.localStorage,
        usage: this.getLocalStorageUsage()
      },
      indexedDB: {
        available: !!this.db,
        connected: !!this.db
      }
    };
  }

  private getLocalStorageUsage(): number {
    if (typeof window === 'undefined') return 0;
    
    try {
      const prefix = CLIENT_CACHE_CONFIG.localStorage.keyPrefix;
      return Object.keys(localStorage)
        .filter(key => key.startsWith(prefix))
        .reduce((total, key) => {
          return total + (localStorage.getItem(key)?.length || 0);
        }, 0);
    } catch {
      return 0;
    }
  }
}

// Export singleton instance
export const clientCache = ClientCacheManager.getInstance();

// Auto-initialize when in browser environment
if (typeof window !== 'undefined') {
  clientCache.initIndexedDB().catch(console.error);
  
  // Setup cleanup interval (every 5 minutes)
  setInterval(() => {
    clientCache.cleanup().catch(console.error);
  }, 5 * 60 * 1000);
}