'use client'

import { useState, useEffect } from 'react'

interface ResponsiveState {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isLandscape: boolean
  isPortrait: boolean
  isTouchDevice: boolean
  screenWidth: number
  screenHeight: number
}

interface BreakpointConfig {
  mobile: number
  tablet: number
  desktop: number
}

const defaultBreakpoints: BreakpointConfig = {
  mobile: 640,   // sm breakpoint
  tablet: 1024,  // lg breakpoint
  desktop: 1280  // xl breakpoint
}

export function useResponsive(breakpoints: BreakpointConfig = defaultBreakpoints): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isLandscape: false,
    isPortrait: true,
    isTouchDevice: false,
    screenWidth: 0,
    screenHeight: 0
  })

  useEffect(() => {
    const updateState = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const isLandscape = width > height
      const isPortrait = height >= width

      // Detect touch device
      const isTouchDevice = 'ontouchstart' in window || 
                           navigator.maxTouchPoints > 0 ||
                           // @ts-ignore
                           navigator.msMaxTouchPoints > 0

      setState({
        isMobile: width < breakpoints.mobile,
        isTablet: width >= breakpoints.mobile && width < breakpoints.desktop,
        isDesktop: width >= breakpoints.desktop,
        isLandscape,
        isPortrait,
        isTouchDevice,
        screenWidth: width,
        screenHeight: height
      })
    }

    // Initial state
    updateState()

    // Listen for resize events
    window.addEventListener('resize', updateState)
    window.addEventListener('orientationchange', updateState)

    return () => {
      window.removeEventListener('resize', updateState)
      window.removeEventListener('orientationchange', updateState)
    }
  }, [breakpoints])

  return state
}

// Hook for specific breakpoint queries
export function useBreakpoint(breakpoint: keyof BreakpointConfig): boolean {
  const { isMobile, isTablet, isDesktop } = useResponsive()
  
  switch (breakpoint) {
    case 'mobile':
      return isMobile
    case 'tablet':
      return isTablet
    case 'desktop':
      return isDesktop
    default:
      return false
  }
}

// Hook for media query matching
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    setMatches(mediaQuery.matches)

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [query])

  return matches
}

// Predefined media queries
export const mediaQueries = {
  mobile: '(max-width: 639px)',
  tablet: '(min-width: 640px) and (max-width: 1023px)',
  desktop: '(min-width: 1024px)',
  landscape: '(orientation: landscape)',
  portrait: '(orientation: portrait)',
  touch: '(pointer: coarse)',
  mouse: '(pointer: fine)',
  reducedMotion: '(prefers-reduced-motion: reduce)',
  highContrast: '(prefers-contrast: high)',
  darkMode: '(prefers-color-scheme: dark)'
}

// Utility function to get responsive classes
export function getResponsiveClasses(config: {
  mobile?: string
  tablet?: string
  desktop?: string
  base?: string
}): string {
  const classes = []
  
  if (config.base) classes.push(config.base)
  if (config.mobile) classes.push(`max-sm:${config.mobile}`)
  if (config.tablet) classes.push(`sm:max-lg:${config.tablet}`)
  if (config.desktop) classes.push(`lg:${config.desktop}`)
  
  return classes.join(' ')
}

// Utility function for responsive values
export function useResponsiveValue<T>(values: {
  mobile?: T
  tablet?: T
  desktop?: T
  default: T
}): T {
  const { isMobile, isTablet, isDesktop } = useResponsive()
  
  if (isMobile && values.mobile !== undefined) return values.mobile
  if (isTablet && values.tablet !== undefined) return values.tablet
  if (isDesktop && values.desktop !== undefined) return values.desktop
  
  return values.default
}

// Hook for device capabilities detection
export function useDeviceCapabilities() {
  const [capabilities, setCapabilities] = useState({
    touch: false,
    hover: false,
    pointerFine: false,
    vibration: false,
    clipboard: false,
    darkMode: false,
    reducedMotion: false,
    highContrast: false,
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateCapabilities = () => {
      setCapabilities({
        touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        hover: window.matchMedia('(hover: hover)').matches,
        pointerFine: window.matchMedia('(pointer: fine)').matches,
        vibration: 'vibrate' in navigator,
        clipboard: 'clipboard' in navigator,
        darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        highContrast: window.matchMedia('(prefers-contrast: high)').matches,
      })
    }

    updateCapabilities()

    // Listen for preference changes
    const mediaQueries = [
      window.matchMedia('(hover: hover)'),
      window.matchMedia('(pointer: fine)'),
      window.matchMedia('(prefers-color-scheme: dark)'),
      window.matchMedia('(prefers-reduced-motion: reduce)'),
      window.matchMedia('(prefers-contrast: high)'),
    ]

    const handler = () => updateCapabilities()
    mediaQueries.forEach(mq => mq.addEventListener('change', handler))

    return () => {
      mediaQueries.forEach(mq => mq.removeEventListener('change', handler))
    }
  }, [])

  return capabilities
}

// Hook for safe area insets (for mobile devices with notches)
export function useSafeAreaInsets() {
  const [insets, setInsets] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateInsets = () => {
      const computedStyle = getComputedStyle(document.documentElement)
      setInsets({
        top: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0'),
        right: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0'),
        bottom: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
        left: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0'),
      })
    }

    updateInsets()
    window.addEventListener('resize', updateInsets)
    window.addEventListener('orientationchange', updateInsets)

    return () => {
      window.removeEventListener('resize', updateInsets)
      window.removeEventListener('orientationchange', updateInsets)
    }
  }, [])

  return insets
}

// Hook for viewport height that accounts for mobile browser UI
export function useViewportHeight() {
  const [viewportHeight, setViewportHeight] = useState(() => {
    if (typeof window === 'undefined') return 768
    return window.innerHeight
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateHeight = () => {
      const height = window.innerHeight
      setViewportHeight(height)
      
      // Set CSS custom property for mobile browsers
      document.documentElement.style.setProperty('--vh', `${height * 0.01}px`)
    }

    updateHeight()
    
    window.addEventListener('resize', updateHeight, { passive: true })
    window.addEventListener('orientationchange', updateHeight, { passive: true })

    return () => {
      window.removeEventListener('resize', updateHeight)
      window.removeEventListener('orientationchange', updateHeight)
    }
  }, [])

  return viewportHeight
}