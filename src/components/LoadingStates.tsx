/**
 * Loading State Components
 * Skeleton and placeholder components for loading states
 */

import { motion } from 'framer-motion';

// ============================================================================
// SKELETON VARIANTS
// ============================================================================

/**
 * Generic skeleton pulse effect wrapper
 */
export function SkeletonPulse({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      animate={{ opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 2, repeat: Infinity }}
      className="bg-stone-200 rounded-lg"
    >
      {children}
    </motion.div>
  );
}

/**
 * Skeleton loader for text content
 */
export function TextSkeleton({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={className}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonPulse key={i}>
          <div className="h-4 rounded w-full mb-3" />
        </SkeletonPulse>
      ))}
    </div>
  );
}

/**
 * Skeleton loader for card content
 */
export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-lg shadow-stone-200/50">
      <div className="flex items-center gap-4 mb-4">
        <SkeletonPulse>
          <div className="w-12 h-12 rounded-lg" />
        </SkeletonPulse>
        <div className="flex-1 space-y-2">
          <SkeletonPulse>
            <div className="h-4 rounded w-32" />
          </SkeletonPulse>
          <SkeletonPulse>
            <div className="h-3 rounded w-24" />
          </SkeletonPulse>
        </div>
      </div>
      <SkeletonPulse>
        <div className="h-8 rounded w-full" />
      </SkeletonPulse>
    </div>
  );
}

/**
 * Skeleton loader for table rows
 */
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-6 py-4 text-sm">
          <SkeletonPulse>
            <div className="h-4 rounded w-full" />
          </SkeletonPulse>
        </td>
      ))}
    </tr>
  );
}

/**
 * Skeleton loader for table content
 */
export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-stone-200">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-6 py-3 text-left">
                <SkeletonPulse>
                  <div className="h-4 rounded w-24" />
                </SkeletonPulse>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Skeleton loader for chart container
 */
export function ChartSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-lg shadow-stone-200/50">
      <SkeletonPulse>
        <div className="h-6 rounded w-32 mb-6" />
      </SkeletonPulse>
      <SkeletonPulse>
        <div className="h-64 rounded w-full" />
      </SkeletonPulse>
    </div>
  );
}

/**
 * Skeleton loader for grid of cards
 */
export function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton loader for member/person card
 */
export function MemberCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-stone-200/50 p-4 shadow-lg">
      <div className="flex items-start gap-4 mb-4">
        <SkeletonPulse>
          <div className="w-12 h-12 rounded-full" />
        </SkeletonPulse>
        <div className="flex-1 space-y-2">
          <SkeletonPulse>
            <div className="h-4 rounded w-32" />
          </SkeletonPulse>
          <SkeletonPulse>
            <div className="h-3 rounded w-24" />
          </SkeletonPulse>
        </div>
      </div>
      <div className="space-y-2">
        <SkeletonPulse>
          <div className="h-3 rounded w-full" />
        </SkeletonPulse>
        <SkeletonPulse>
          <div className="h-3 rounded w-5/6" />
        </SkeletonPulse>
      </div>
    </div>
  );
}

/**
 * Skeleton loader for list items
 */
export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg border border-stone-200 p-4">
          <div className="flex items-center gap-4">
            <SkeletonPulse>
              <div className="w-10 h-10 rounded-lg" />
            </SkeletonPulse>
            <div className="flex-1 space-y-2">
              <SkeletonPulse>
                <div className="h-4 rounded w-40" />
              </SkeletonPulse>
              <SkeletonPulse>
                <div className="h-3 rounded w-32" />
              </SkeletonPulse>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton loader for stats cards
 */
export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-gradient-to-br from-stone-50 to-stone-100 rounded-xl border border-stone-200 p-6">
          <SkeletonPulse>
            <div className="w-10 h-10 rounded-lg mb-4" />
          </SkeletonPulse>
          <SkeletonPulse>
            <div className="h-6 rounded w-20 mb-2" />
          </SkeletonPulse>
          <SkeletonPulse>
            <div className="h-4 rounded w-32" />
          </SkeletonPulse>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton loader for page header
 */
export function HeaderSkeleton() {
  return (
    <div className="mb-8">
      <SkeletonPulse>
        <div className="h-8 rounded w-48 mb-2" />
      </SkeletonPulse>
      <SkeletonPulse>
        <div className="h-4 rounded w-64" />
      </SkeletonPulse>
    </div>
  );
}

/**
 * Generic loading state overlay
 */
export function LoadingOverlay({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="w-12 h-12 border-4 border-stone-200 border-t-amber-500 rounded-full mb-4"
      />
      <p className="text-stone-600 font-medium">{message}</p>
    </div>
  );
}

/**
 * Empty state placeholder
 */
export function EmptyStatePlaceholder({ 
  title = 'No data available',
  description = 'No items to display',
}: { title?: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mb-4">
        <div className="w-8 h-8 bg-stone-300 rounded-full" />
      </div>
      <h3 className="text-lg font-medium text-stone-800 mb-1">{title}</h3>
      <p className="text-stone-600">{description}</p>
    </div>
  );
}
