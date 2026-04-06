import { motion } from 'framer-motion';

interface SkeletonProps {
  width?: string;
  height?: string;
  count?: number;
  circle?: boolean;
}

export const Skeleton = ({
  width = 'w-full',
  height = 'h-4',
  count = 1,
  circle = false,
}: SkeletonProps) => {
  const skeletons = Array.from({ length: count }, (_, i) => i);

  return (
    <div className="space-y-3">
      {skeletons.map((i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className={`${width} ${height} bg-stone-200 rounded-lg ${
            circle ? 'rounded-full' : ''
          }`}
        />
      ))}
    </div>
  );
};

export const CardSkeleton = () => (
  <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-stone-200/50 p-6 shadow-lg">
    <Skeleton height="h-6" width="w-32" />
    <div className="mt-4 space-y-3">
      <Skeleton height="h-4" width="w-full" />
      <Skeleton height="h-4" width="w-5/6" />
      <Skeleton height="h-4" width="w-4/5" />
    </div>
    <div className="mt-6 space-y-2">
      <Skeleton height="h-10" width="w-full" count={3} />
    </div>
  </div>
);

export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-2">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="grid grid-cols-5 gap-4">
        <Skeleton height="h-8" width="w-full" />
        <Skeleton height="h-8" width="w-full" />
        <Skeleton height="h-8" width="w-full" />
        <Skeleton height="h-8" width="w-full" />
        <Skeleton height="h-8" width="w-full" />
      </div>
    ))}
  </div>
);
