import { useEffect, useRef, useState } from "react";

export function Reveal({ children, className = "", delayMs = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        transitionDelay: visible ? `${delayMs}ms` : "0ms",
        transitionProperty: "transform, opacity",
        transitionDuration: "700ms",
        transitionTimingFunction: "ease-out",
        transform: visible ? "translateY(0)" : "translateY(1rem)",
        opacity: visible ? 1 : 0,
      }}
      className={className}
    >
      {children}
    </div>
  );
}
