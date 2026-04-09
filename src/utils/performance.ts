/**
 * Performance monitoring and optimization utilities
 */

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private marks = new Map<string, number>();
  private enabled = import.meta.env.DEV;

  /**
   * Start measuring a named operation
   */
  mark(name: string): void {
    if (!this.enabled) return;
    this.marks.set(name, performance.now());
  }

  /**
   * End measuring and record the metric
   */
  measure(name: string, metadata?: Record<string, unknown>): number {
    if (!this.enabled) return 0;

    const startTime = this.marks.get(name);
    if (!startTime) {
      console.warn(`No mark found for "${name}"`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.metrics.push({
      name,
      duration,
      timestamp: Date.now(),
      metadata,
    });

    this.marks.delete(name);

    // Log slow operations
    if (duration > 1000) {
      console.warn(`[Performance] ${name} took ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  /**
   * Measure async operation
   */
  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    this.mark(name);
    try {
      return await fn();
    } finally {
      this.measure(name, metadata);
    }
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get average duration for a metric name
   */
  getAverageDuration(name: string): number {
    const matching = this.metrics.filter(m => m.name === name);
    if (matching.length === 0) return 0;
    const sum = matching.reduce((acc, m) => acc + m.duration, 0);
    return sum / matching.length;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.marks.clear();
  }

  /**
   * Get performance report
   */
  getReport(): Record<string, { count: number; avg: number; min: number; max: number }> {
    const report: Record<string, { count: number; avg: number; min: number; max: number }> = {};

    for (const metric of this.metrics) {
      if (!report[metric.name]) {
        report[metric.name] = { count: 0, avg: 0, min: Infinity, max: -Infinity };
      }

      const entry = report[metric.name];
      entry.count += 1;
      entry.avg = (entry.avg * (entry.count - 1) + metric.duration) / entry.count;
      entry.min = Math.min(entry.min, metric.duration);
      entry.max = Math.max(entry.max, metric.duration);
    }

    return report;
  }
}

export const performanceMonitor = new PerformanceMonitor();

/**
 * Hook for measuring component render time
 */
import { useEffect, useRef } from 'react';

export function useRenderTime(componentName: string): void {
  const renderTimeRef = useRef<number>(0);

  useEffect(() => {
    renderTimeRef.current = performance.now();
  });

  useEffect(() => {
    return () => {
      const renderTime = performance.now() - renderTimeRef.current;
      if (renderTime > 16) { // Longer than one frame at 60fps
        console.warn(`[Render] ${componentName} took ${renderTime.toFixed(2)}ms`);
      }
    };
  }, [componentName]);
}

/**
 * Measure Web Vitals
 */
export function measureWebVitals(): void {
  if (!('web-vital' in window)) {
    // Measure Largest Contentful Paint (LCP)
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        console.log('[Web Vital] LCP:', (entry as any).renderTime || (entry as any).loadTime);
      }
    });
    observer.observe({ entryTypes: ['largest-contentful-paint'] });

    // Measure Cumulative Layout Shift (CLS)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
          console.log('[Web Vital] CLS:', clsValue);
        }
      }
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });

    // Measure First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        console.log('[Web Vital] FID:', (entry as any).processingDuration);
      }
    });
    fidObserver.observe({ entryTypes: ['first-input'] });
  }
}
