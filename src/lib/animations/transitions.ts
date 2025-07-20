export interface AnimationConfig {
  duration: number;
  easing: string;
  delay?: number;
  fillMode?: 'forwards' | 'backwards' | 'both' | 'none';
}

export const ANIMATION_PRESETS = {
  fadeIn: {
    duration: 300,
    easing: 'ease-out',
    keyframes: [
      { opacity: 0, transform: 'translateY(10px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ]
  },
  fadeOut: {
    duration: 200,
    easing: 'ease-in',
    keyframes: [
      { opacity: 1, transform: 'translateY(0)' },
      { opacity: 0, transform: 'translateY(-10px)' }
    ]
  },
  slideInLeft: {
    duration: 400,
    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    keyframes: [
      { transform: 'translateX(-100%)', opacity: 0 },
      { transform: 'translateX(0)', opacity: 1 }
    ]
  },
  slideInRight: {
    duration: 400,
    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    keyframes: [
      { transform: 'translateX(100%)', opacity: 0 },
      { transform: 'translateX(0)', opacity: 1 }
    ]
  },
  scaleIn: {
    duration: 250,
    easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    keyframes: [
      { transform: 'scale(0.8)', opacity: 0 },
      { transform: 'scale(1)', opacity: 1 }
    ]
  },
  pulse: {
    duration: 1000,
    easing: 'ease-in-out',
    keyframes: [
      { transform: 'scale(1)' },
      { transform: 'scale(1.05)' },
      { transform: 'scale(1)' }
    ]
  },
  shimmer: {
    duration: 1500,
    easing: 'ease-in-out',
    keyframes: [
      { backgroundPosition: '-200px 0' },
      { backgroundPosition: 'calc(200px + 100%) 0' }
    ]
  }
};

export class AnimationManager {
  private static instance: AnimationManager;
  private runningAnimations = new Map<string, Animation>();
  private prefersReducedMotion = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
  }

  static getInstance(): AnimationManager {
    if (!this.instance) {
      this.instance = new AnimationManager();
    }
    return this.instance;
  }

  animate(
    element: HTMLElement,
    preset: keyof typeof ANIMATION_PRESETS | Keyframe[],
    config?: Partial<AnimationConfig>
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.prefersReducedMotion) {
        resolve();
        return;
      }

      try {
        let keyframes: Keyframe[];
        let animationConfig: AnimationConfig;

        if (typeof preset === 'string') {
          const presetConfig = ANIMATION_PRESETS[preset];
          keyframes = presetConfig.keyframes;
          animationConfig = {
            duration: presetConfig.duration,
            easing: presetConfig.easing,
            ...config
          };
        } else {
          keyframes = preset;
          animationConfig = {
            duration: 300,
            easing: 'ease-out',
            ...config
          };
        }

        const animation = element.animate(keyframes, {
          duration: animationConfig.duration,
          easing: animationConfig.easing,
          delay: animationConfig.delay || 0,
          fill: animationConfig.fillMode || 'forwards'
        });

        const animationId = `${element.id || 'element'}-${Date.now()}`;
        this.runningAnimations.set(animationId, animation);

        animation.addEventListener('finish', () => {
          this.runningAnimations.delete(animationId);
          resolve();
        });

        animation.addEventListener('cancel', () => {
          this.runningAnimations.delete(animationId);
          reject(new Error('Animation cancelled'));
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  cancelAnimation(element: HTMLElement): void {
    this.runningAnimations.forEach((animation, id) => {
      if (id.startsWith(element.id || 'element')) {
        animation.cancel();
        this.runningAnimations.delete(id);
      }
    });
  }

  cancelAllAnimations(): void {
    this.runningAnimations.forEach(animation => animation.cancel());
    this.runningAnimations.clear();
  }

  // Stagger animations for multiple elements
  async staggerAnimate(
    elements: HTMLElement[],
    preset: keyof typeof ANIMATION_PRESETS,
    staggerDelay: number = 100,
    config?: Partial<AnimationConfig>
  ): Promise<void> {
    const promises = elements.map((element, index) => 
      this.animate(element, preset, {
        ...config,
        delay: (config?.delay || 0) + (index * staggerDelay)
      })
    );

    await Promise.all(promises);
  }

  // Create loading shimmer effect
  createShimmerEffect(element: HTMLElement): void {
    if (this.prefersReducedMotion) return;

    element.style.background = `
      linear-gradient(90deg, 
        #f0f0f0 25%, 
        #e0e0e0 50%, 
        #f0f0f0 75%
      )
    `;
    element.style.backgroundSize = '200px 100%';
    element.style.animation = 'shimmer 1.5s infinite ease-in-out';
  }

  removeShimmerEffect(element: HTMLElement): void {
    element.style.background = '';
    element.style.backgroundSize = '';
    element.style.animation = '';
  }
}

// CSS-in-JS animations for React components
export const createTransitionStyles = (
  property: string,
  duration: number = 300,
  easing: string = 'ease-out'
) => ({
  transition: `${property} ${duration}ms ${easing}`,
  willChange: property
});

export const TRANSITION_CLASSES = {
  fadeIn: 'transition-opacity duration-300 ease-out',
  fadeOut: 'transition-opacity duration-200 ease-in',
  slideIn: 'transition-transform duration-400 ease-out',
  scaleIn: 'transition-transform duration-250 ease-out',
  colorChange: 'transition-colors duration-200 ease-out',
  sizeChange: 'transition-all duration-300 ease-out'
};