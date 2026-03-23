import React, { useRef, useState } from 'react';
import { useLang } from '../../hooks/useLang';

const PULL_THRESHOLD = 80;

interface Props {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export function PullToRefresh({ onRefresh, children }: Props) {
  const { t } = useLang();
  const startYRef = useRef<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  function handleTouchStart(e: React.TouchEvent) {
    // Only track pull-to-refresh when scrolled to top
    if (window.scrollY > 0) return;
    startYRef.current = e.touches[0].clientY;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (startYRef.current === null || refreshing) return;
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta > 0) {
      setPullDistance(Math.min(delta, PULL_THRESHOLD * 1.5));
    }
  }

  async function handleTouchEnd() {
    if (pullDistance >= PULL_THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(0);
      startYRef.current = null;
      await onRefresh();
      setRefreshing(false);
    } else {
      setPullDistance(0);
      startYRef.current = null;
    }
  }

  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const showIndicator = pullDistance > 8 || refreshing;
  const released = pullDistance >= PULL_THRESHOLD;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {showIndicator && (
        <div
          className="flex items-center justify-center gap-2 text-white/70 text-xs overflow-hidden transition-all duration-200"
          style={{ height: refreshing ? 40 : pullDistance * 0.5 }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`w-4 h-4 transition-transform duration-200 ${refreshing ? 'animate-spin' : ''}`}
            style={{ transform: refreshing ? undefined : `rotate(${progress * 180}deg)` }}
          >
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M8 16H3v5" />
          </svg>
          <span>{refreshing ? t.auth.syncing : released ? t.auth.releaseToRefresh : t.auth.pullToRefresh}</span>
        </div>
      )}
      {children}
    </div>
  );
}
