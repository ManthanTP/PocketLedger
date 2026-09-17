import { useEffect, useRef } from 'react';

type RevealAnimation = 'fade-up' | 'fade-left' | 'fade-right' | 'scale-in' | 'fade-in';

interface ScrollRevealOptions {
  animation?: RevealAnimation;
  duration?: number;    // ms
  delay?: number;       // ms
  threshold?: number;   // 0-1
  once?: boolean;       // only animate once
}

/**
 * Hook that adds Intersection Observer-based scroll reveal animation to an element.
 * Returns a ref to attach to the target element.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: ScrollRevealOptions = {}
) {
  const {
    animation = 'fade-up',
    duration = 700,
    delay = 0,
    threshold = 0.15,
    once = true,
  } = options;

  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Set initial hidden state
    el.classList.add('scroll-reveal', animation);
    el.style.animationDuration = `${duration}ms`;
    el.style.animationDelay = `${delay}ms`;

    // Respect prefers-reduced-motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      el.classList.remove('scroll-reveal');
      el.style.opacity = '1';
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('revealed');
          if (once) observer.unobserve(el);
        } else if (!once) {
          el.classList.remove('revealed');
        }
      },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [animation, duration, delay, threshold, once]);

  return ref;
}

/**
 * Component wrapper for scroll reveal - useful for mapping over arrays.
 */
export function ScrollReveal({
  children,
  animation = 'fade-up',
  duration = 700,
  delay = 0,
  threshold = 0.15,
  className = '',
  as: Tag = 'div',
}: ScrollRevealOptions & {
  children: React.ReactNode;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
}) {
  const ref = useScrollReveal<HTMLElement>({ animation, duration, delay, threshold });

  return (
    // @ts-expect-error — dynamic tag element
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
