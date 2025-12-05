import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Play, Pause } from 'lucide-react';

interface ShelfSimulationProps {
  initialCount?: number;
}

const ShelfSimulation: React.FC<ShelfSimulationProps> = ({ initialCount = 11 }) => {
  const [shelfCount, setShelfCount] = useState(initialCount);
  const [isOpen, setIsOpen] = useState(false);

  const shelves = useMemo(
    () => Array.from({ length: shelfCount }, (_, i) => i),
    [shelfCount]
  );

  return (
    <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-primary-300/50 dark:border-primary-800/50 relative overflow-hidden z-10">
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary-500/10 dark:bg-primary-400/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary-800/10 dark:bg-primary-700/10 rounded-full blur-3xl" />

      <div className="relative flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/60 text-[#012169] dark:text-primary-200">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Shelf Opening Simulation
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Visualize how your shelves open and create space between them.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#012169] text-white text-sm font-medium shadow-md hover:bg-[#011a54] transition-all"
        >
          {isOpen ? (
            <>
              <Pause className="w-4 h-4" />
              <span>Close Shelves</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>Open Shelves</span>
            </>
          )}
        </button>
      </div>

      <div className="relative mb-6">
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
          Number of shelves
        </label>
        <div className="flex items-center space-x-4">
          <input
            type="number"
            min={1}
            max={48}
            value={shelfCount}
            onChange={(e) => {
              const value = parseInt(e.target.value || '1', 10);
              if (!Number.isNaN(value)) {
                setShelfCount(Math.min(48, Math.max(1, value)));
              }
            }}
            className="w-20 px-3 py-1.5 rounded-md border border-primary-300 dark:border-primary-800 bg-white dark:bg-primary-900/50 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-700"
          />
          <div className="flex-1">
            <input
              type="range"
              min={1}
              max={48}
              step={1}
              value={shelfCount}
              onChange={(e) => setShelfCount(parseInt(e.target.value, 10))}
              className="w-full h-1 rounded-full appearance-none bg-primary-200 dark:bg-primary-900/60 accent-primary-700"
            />
          </div>
        </div>
      </div>

      <div className="relative mt-4 border border-dashed border-primary-300/60 dark:border-primary-700/60 rounded-xl px-4 py-6 bg-primary-50/60 dark:bg-primary-950/40">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-100/40 via-transparent to-transparent dark:from-primary-900/40 pointer-events-none rounded-xl" />
        <div className="relative flex flex-col space-y-4">
          <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
            <span>{shelfCount} shelves</span>
            <span>{isOpen ? 'Open state – space between shelves' : 'Closed state – compact view'}</span>
          </div>

          <div className="relative h-28 flex items-center justify-center overflow-hidden">
            <div className="flex items-center justify-center w-full">
              {shelves.map((index) => {
                const center = (shelfCount - 1) / 2;
                const offset = index - center;

                return (
                  <motion.div
                    key={index}
                    initial={false}
                    animate={{
                      x: isOpen ? offset * 18 : 0,
                      scaleY: isOpen ? 0.85 : 1,
                      boxShadow: isOpen
                        ? '0 12px 30px rgba(76, 29, 149, 0.35)'
                        : '0 6px 18px rgba(76, 29, 149, 0.25)',
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 180,
                      damping: 18,
                      delay: (index / Math.max(1, shelfCount)) * 0.08,
                    }}
                    className="relative h-16 w-6 mx-0.5 rounded-lg bg-gradient-to-b from-[#011a54] via-[#012169] to-[#000d2a] dark:from-[#011a54] dark:via-[#012169] dark:to-[#000d2a] border border-primary-200/80 dark:border-primary-700/80"
                  >
                    <div className="absolute inset-0.5 rounded-md bg-gradient-to-b from-white/40 via-transparent to-black/30 opacity-70" />
                    <div className="absolute inset-x-1 top-1 h-1 rounded-full bg-white/60 dark:bg-white/40" />
                    <div className="absolute inset-x-1 bottom-1 h-1 rounded-full bg-white/40 dark:bg-white/30" />
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShelfSimulation;


