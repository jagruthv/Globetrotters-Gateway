/**
 * Globetrotter Gateway • Client-Side Audit & Telemetry Logger
 * Records successes, warnings, network calls, and auth failures into a rolling in-memory & localStorage ledger.
 */

const LOG_STORAGE_KEY = 'gt_telemetry_audit_log';
const MAX_ENTRIES = 100;

class TelemetryLogger {
  constructor() {
    this.memoryLogs = [];
    this.loadPersistedLogs();
    this.bindGlobalHandlers();
  }

  loadPersistedLogs() {
    try {
      const stored = localStorage.getItem(LOG_STORAGE_KEY);
      if (stored) {
        this.memoryLogs = JSON.parse(stored);
      }
    } catch {
      this.memoryLogs = [];
    }
  }

  persistLogs() {
    try {
      localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(this.memoryLogs.slice(-MAX_ENTRIES)));
    } catch {
      // Storage quota fallback
    }
  }

  log(level, category, message, details = null) {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      level, // 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR'
      category, // 'AUTH' | 'NETWORK' | 'UI' | 'SYSTEM'
      message,
      details: details ? (typeof details === 'object' ? JSON.parse(JSON.stringify(details)) : String(details)) : null
    };

    this.memoryLogs.push(entry);
    if (this.memoryLogs.length > MAX_ENTRIES) {
      this.memoryLogs.shift();
    }
    this.persistLogs();

    // Mirror to native console (errors/warnings always visible for runtime troubleshooting)
    const prefix = `[GT-${category}]`;
    if (level === 'ERROR') {
      console.error(prefix, message, details || '');
    } else if (level === 'WARN') {
      console.warn(prefix, message, details || '');
    } else if (import.meta.env.DEV) {
      console.log(prefix, message, details || '');
    }

    return entry;
  }

  info(category, message, details) {
    return this.log('INFO', category, message, details);
  }

  success(category, message, details) {
    return this.log('SUCCESS', category, message, details);
  }

  warn(category, message, details) {
    return this.log('WARN', category, message, details);
  }

  error(category, message, details) {
    return this.log('ERROR', category, message, details);
  }

  getLogs() {
    return [...this.memoryLogs];
  }

  clearLogs() {
    this.memoryLogs = [];
    try {
      localStorage.removeItem(LOG_STORAGE_KEY);
    } catch {}
  }

  bindGlobalHandlers() {
    if (typeof window === 'undefined') return;

    // Expose global inspection helpers for developers and user testing
    window.gtAuditLog = () => {
      console.table(this.memoryLogs.map(l => ({
        time: l.timestamp.split('T')[1].slice(0, 8),
        level: l.level,
        category: l.category,
        message: l.message
      })));
      return this.memoryLogs;
    };

    window.gtExportLogs = () => {
      return JSON.stringify(this.memoryLogs, null, 2);
    };

    // Auto-capture uncaught runtime errors
    window.addEventListener('error', (event) => {
      this.error('SYSTEM', `Uncaught: ${event.message}`, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.error('SYSTEM', `Unhandled Promise Rejection`, {
        reason: event.reason?.message || String(event.reason)
      });
    });
  }
}

export const logger = new TelemetryLogger();
