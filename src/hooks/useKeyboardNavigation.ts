import { useEffect, useCallback, RefObject } from 'react';

interface UseKeyboardNavigationOptions {
  onEnter?: () => void;
  onSpace?: () => void;
  onEscape?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onHome?: () => void;
  onEnd?: () => void;
  onTab?: (e: KeyboardEvent) => void;
  enabled?: boolean;
  preventDefault?: boolean;
}

export function useKeyboardNavigation(
  ref: RefObject<HTMLElement>,
  options: UseKeyboardNavigationOptions
) {
  const {
    onEnter,
    onSpace,
    onEscape,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onHome,
    onEnd,
    onTab,
    enabled = true,
    preventDefault = true,
  } = options;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      const handlers: Record<string, (() => void) | ((e: KeyboardEvent) => void) | undefined> = {
        Enter: onEnter,
        ' ': onSpace,
        Escape: onEscape,
        ArrowUp: onArrowUp,
        ArrowDown: onArrowDown,
        ArrowLeft: onArrowLeft,
        ArrowRight: onArrowRight,
        Home: onHome,
        End: onEnd,
        Tab: onTab,
      };

      const handler = handlers[e.key];
      if (handler) {
        if (preventDefault && e.key !== 'Tab') {
          e.preventDefault();
        }
        if (e.key === 'Tab' && onTab) {
          onTab(e);
        } else if (typeof handler === 'function') {
          handler();
        }
      }
    },
    [
      enabled,
      preventDefault,
      onEnter,
      onSpace,
      onEscape,
      onArrowUp,
      onArrowDown,
      onArrowLeft,
      onArrowRight,
      onHome,
      onEnd,
      onTab,
    ]
  );

  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;

    element.addEventListener('keydown', handleKeyDown);
    return () => {
      element.removeEventListener('keydown', handleKeyDown);
    };
  }, [ref, handleKeyDown, enabled]);
}

// Hook for managing focus within a list of items
export function useListKeyboardNavigation<T extends HTMLElement>(
  items: RefObject<T>[],
  options?: {
    wrap?: boolean;
    orientation?: 'vertical' | 'horizontal' | 'both';
    onSelect?: (index: number) => void;
    enabled?: boolean;
  }
) {
  const {
    wrap = true,
    orientation = 'vertical',
    onSelect,
    enabled = true,
  } = options || {};

  const handleNavigation = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right' | 'home' | 'end') => {
      if (!enabled) return;

      const currentIndex = items.findIndex(
        (item) => item.current === document.activeElement
      );

      let nextIndex = currentIndex;

      switch (direction) {
        case 'up':
          if (orientation === 'vertical' || orientation === 'both') {
            nextIndex = currentIndex - 1;
            if (nextIndex < 0) {
              nextIndex = wrap ? items.length - 1 : 0;
            }
          }
          break;
        case 'down':
          if (orientation === 'vertical' || orientation === 'both') {
            nextIndex = currentIndex + 1;
            if (nextIndex >= items.length) {
              nextIndex = wrap ? 0 : items.length - 1;
            }
          }
          break;
        case 'left':
          if (orientation === 'horizontal' || orientation === 'both') {
            nextIndex = currentIndex - 1;
            if (nextIndex < 0) {
              nextIndex = wrap ? items.length - 1 : 0;
            }
          }
          break;
        case 'right':
          if (orientation === 'horizontal' || orientation === 'both') {
            nextIndex = currentIndex + 1;
            if (nextIndex >= items.length) {
              nextIndex = wrap ? 0 : items.length - 1;
            }
          }
          break;
        case 'home':
          nextIndex = 0;
          break;
        case 'end':
          nextIndex = items.length - 1;
          break;
      }

      if (nextIndex !== currentIndex && items[nextIndex]?.current) {
        items[nextIndex].current.focus();
        if (onSelect) {
          onSelect(nextIndex);
        }
      }
    },
    [items, wrap, orientation, onSelect, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const handlers: Record<string, () => void> = {
        ArrowUp: () => handleNavigation('up'),
        ArrowDown: () => handleNavigation('down'),
        ArrowLeft: () => handleNavigation('left'),
        ArrowRight: () => handleNavigation('right'),
        Home: () => handleNavigation('home'),
        End: () => handleNavigation('end'),
      };

      const handler = handlers[e.key];
      if (handler) {
        e.preventDefault();
        handler();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleNavigation, enabled]);

  return { handleNavigation };
}

// Hook for roving tabindex pattern
export function useRovingTabIndex<T extends HTMLElement>(
  items: RefObject<T>[],
  options?: {
    defaultIndex?: number;
    orientation?: 'vertical' | 'horizontal' | 'both';
    loop?: boolean;
  }
) {
  const {
    defaultIndex = 0,
    orientation = 'vertical',
    loop = true,
  } = options || {};

  useEffect(() => {
    // Set initial tabindex
    items.forEach((item, index) => {
      if (item.current) {
        item.current.tabIndex = index === defaultIndex ? 0 : -1;
      }
    });
  }, [items, defaultIndex]);

  const { handleNavigation } = useListKeyboardNavigation(items, {
    wrap: loop,
    orientation,
    onSelect: (index) => {
      // Update tabindex for roving pattern
      items.forEach((item, i) => {
        if (item.current) {
          item.current.tabIndex = i === index ? 0 : -1;
        }
      });
    },
  });

  return { handleNavigation };
}