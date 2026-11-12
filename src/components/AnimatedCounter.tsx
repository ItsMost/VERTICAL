import { useEffect, useState } from 'react';

/** Counts up to `value` with an ease-out curve (numbers in tabular mono). */
export default function AnimatedCounter({ value, duration = 1000, decimals = 1 }: { value: string | number; duration?: number; decimals?: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const start = 0;
    const end = parseFloat(String(value)) || 0;
    if (start === end) { setCount(0); return; }
    const startTime = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      setCount(start + (end - start) * progress * (2 - progress));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span className="font-mono tabular-nums">{count.toFixed(decimals)}</span>;
}
