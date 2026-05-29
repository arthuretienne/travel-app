import { useCallback, useRef, useState } from 'react';

const THRESHOLD = 90; // px — swipe distance to trigger action
const RESIST = 0.65; // resistance when over-swiping
const MAX_HINT = 140; // max visual translation

/**
 * Lightweight swipe hook for touch devices.
 * Returns props to spread on the swipeable element + the live offset for visual feedback.
 *
 * Usage:
 *   const { handlers, offset, isSwiping, complete } = useSwipe({
 *     onSwipeLeft: () => dismiss(),
 *     onSwipeRight: () => accept(),
 *   });
 */
export default function useSwipe({ onSwipeLeft, onSwipeRight, enabled = true } = {}) {
  const [offset, setOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [complete, setComplete] = useState(null); // 'left' | 'right' | null
  const startX = useRef(0);
  const startY = useRef(0);
  const lockedAxis = useRef(null);

  const reset = useCallback(() => {
    setOffset(0);
    setIsSwiping(false);
    lockedAxis.current = null;
  }, []);

  const onTouchStart = useCallback(
    (e) => {
      if (!enabled) return;
      const t = e.touches[0];
      startX.current = t.clientX;
      startY.current = t.clientY;
      lockedAxis.current = null;
      setIsSwiping(true);
    },
    [enabled]
  );

  const onTouchMove = useCallback(
    (e) => {
      if (!enabled || !isSwiping) return;
      const t = e.touches[0];
      const dx = t.clientX - startX.current;
      const dy = t.clientY - startY.current;

      // Lock axis on first significant movement
      if (!lockedAxis.current) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        lockedAxis.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      }
      if (lockedAxis.current === 'y') return;

      // Resist past threshold for elastic feel
      const sign = Math.sign(dx);
      const abs = Math.abs(dx);
      const limited = abs <= THRESHOLD ? abs : THRESHOLD + (abs - THRESHOLD) * RESIST;
      setOffset(sign * Math.min(limited, MAX_HINT));
    },
    [enabled, isSwiping]
  );

  const onTouchEnd = useCallback(() => {
    if (!enabled) return;
    if (Math.abs(offset) >= THRESHOLD) {
      if (offset < 0 && onSwipeLeft) {
        setComplete('left');
        // animate out
        setOffset(-MAX_HINT * 1.5);
        setTimeout(() => {
          onSwipeLeft();
          reset();
          setComplete(null);
        }, 180);
        return;
      }
      if (offset > 0 && onSwipeRight) {
        setComplete('right');
        setOffset(MAX_HINT * 1.5);
        setTimeout(() => {
          onSwipeRight();
          reset();
          setComplete(null);
        }, 180);
        return;
      }
    }
    reset();
  }, [enabled, offset, onSwipeLeft, onSwipeRight, reset]);

  const handlers = {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel: reset,
  };

  return { handlers, offset, isSwiping, complete, threshold: THRESHOLD };
}
