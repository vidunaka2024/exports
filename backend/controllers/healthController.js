// backend/controllers/healthController.js
import mongoose from 'mongoose';
import cache from '../utils/cache.js';
import os from 'os';

// Basic health check
export const healthCheck = async (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
};

// Detailed health check
export const detailedHealthCheck = async (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: 'unknown',
      cache: 'unknown',
    },
    system: {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: (os.totalmem() / 1024 / 1024 / 1024).toFixed(2) + ' GB',
      freeMemory: (os.freemem() / 1024 / 1024 / 1024).toFixed(2) + ' GB',
      loadAverage: os.loadavg(),
    },
    process: {
      pid: process.pid,
      memoryUsage: {
        rss: (process.memoryUsage().rss / 1024 / 1024).toFixed(2) + ' MB',
        heapTotal:
          (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2) + ' MB',
        heapUsed:
          (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + ' MB',
        external:
          (process.memoryUsage().external / 1024 / 1024).toFixed(2) + ' MB',
      },
      nodeVersion: process.version,
    },
  };

  // Check MongoDB connection
  try {
    if (mongoose.connection.readyState === 1) {
      health.services.database = 'connected';
      const dbStats = await mongoose.connection.db.stats();
      health.services.databaseStats = {
        collections: dbStats.collections,
        dataSize: (dbStats.dataSize / 1024 / 1024).toFixed(2) + ' MB',
        indexes: dbStats.indexes,
      };
    } else {
      health.services.database = 'disconnected';
      health.status = 'DEGRADED';
    }
  } catch (error) {
    health.services.database = 'error';
    health.services.databaseError = error.message;
    health.status = 'DEGRADED';
  }

  // Check Redis connection
  try {
    if (cache.isConnected) {
      health.services.cache = 'connected';
      await cache.set('health_check', { timestamp: Date.now() }, 10);
      const testValue = await cache.get('health_check');
      health.services.cacheTest = testValue ? 'passed' : 'failed';
    } else {
      health.services.cache = 'disconnected';
      health.status = 'DEGRADED';
    }
  } catch (error) {
    health.services.cache = 'error';
    health.services.cacheError = error.message;
    health.status = 'DEGRADED';
  }

  const statusCode = health.status === 'OK' ? 200 : 503;
  res.status(statusCode).json(health);
};

// Readiness probe for Kubernetes/orchestration
export const readinessCheck = async (req, res) => {
  const ready = {
    database: false,
    cache: false,
  };

  // Check if database is ready
  if (mongoose.connection.readyState === 1) {
    ready.database = true;
  }

  // Check if cache is ready
  if (cache.isConnected) {
    ready.cache = true;
  }

  const isReady = ready.database; // Cache is optional
  const statusCode = isReady ? 200 : 503;

  res.status(statusCode).json({
    ready: isReady,
    services: ready,
    timestamp: new Date().toISOString(),
  });
};

// Liveness probe for Kubernetes/orchestration
export const livenessCheck = async (req, res) => {
  res.status(200).json({
    alive: true,
    timestamp: new Date().toISOString(),
  });
};

// Get system metrics
export const getMetrics = async (req, res) => {
  const metrics = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem(),
      usagePercent: (
        ((os.totalmem() - os.freemem()) / os.totalmem()) *
        100
      ).toFixed(2),
    },
    cpu: {
      count: os.cpus().length,
      model: os.cpus()[0]?.model || 'unknown',
      loadAverage: os.loadavg(),
    },
    process: {
      pid: process.pid,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
    },
  };

  res.json(metrics);
};
