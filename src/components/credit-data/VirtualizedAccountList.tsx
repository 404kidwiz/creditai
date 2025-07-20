'use client';

import React, { useMemo } from 'react';
import { useVirtualScroll, usePerformanceMonitor } from '@/lib/performance/lazyLoader';
import { AccountCard } from './cards/AccountCard';
import { Account } from '@/types/enhanced-credit';

interface VirtualizedAccountListProps {
  accounts: Account[];
  onAccountSelect?: (account: Account) => void;
  className?: string;
}

const ITEM_HEIGHT = 120; // Height of each account card
const CONTAINER_HEIGHT = 600; // Height of the scrollable container

export const VirtualizedAccountList: React.FC<VirtualizedAccountListProps> = ({
  accounts,
  onAccountSelect,
  className = ''
}) => {
  usePerformanceMonitor('VirtualizedAccountList');

  const {
    visibleItems,
    totalHeight,
    offsetY,
    startIndex,
    setScrollTop
  } = useVirtualScroll(accounts, {
    itemHeight: ITEM_HEIGHT,
    containerHeight: CONTAINER_HEIGHT,
    overscan: 3
  });

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  // Memoize visible items to prevent unnecessary re-renders
  const memoizedItems = useMemo(() => {
    return visibleItems.map((account, index) => (
      <div
        key={account.id}
        style={{
          position: 'absolute',
          top: (startIndex + index) * ITEM_HEIGHT,
          left: 0,
          right: 0,
          height: ITEM_HEIGHT
        }}
      >
        <AccountCard
          account={account}
          onClick={() => onAccountSelect?.(account)}
          className="mx-2 mb-2"
        />
      </div>
    ));
  }, [visibleItems, startIndex, onAccountSelect]);

  if (accounts.length === 0) {
    return (
      <div className={`flex items-center justify-center h-32 text-gray-500 ${className}`}>
        No accounts found
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div
        className="overflow-auto border rounded-lg"
        style={{ height: CONTAINER_HEIGHT }}
        onScroll={handleScroll}
      >
        <div
          style={{
            height: totalHeight,
            position: 'relative'
          }}
        >
          <div
            style={{
              transform: `translateY(${offsetY}px)`,
              position: 'relative'
            }}
          >
            {memoizedItems}
          </div>
        </div>
      </div>
      
      {/* Performance indicator */}
      <div className="mt-2 text-xs text-gray-500">
        Showing {visibleItems.length} of {accounts.length} accounts
      </div>
    </div>
  );
};