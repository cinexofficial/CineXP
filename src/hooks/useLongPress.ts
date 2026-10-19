import { useEffect, useRef } from 'react';
import type { MouseEvent, PointerEvent } from 'react';

type Point = { clientX: number; clientY: number };
export default function useLongPress(onLongPress: (point: Point) => void, onClick?: (point: Point) => void, { delay = 600, shouldPreventDefault = true }: { delay?: number; shouldPreventDefault?: boolean } = {}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef<Point | null>(null);
  const triggered = useRef(false);
  const cancel = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; start.current = null; };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      cancel();
      const point = { clientX: event.clientX, clientY: event.clientY };
      start.current = point; triggered.current = false;
      timer.current = setTimeout(() => { triggered.current = true; onLongPress(point); }, delay);
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      if (start.current && (Math.abs(event.clientX - start.current.clientX) > 10 || Math.abs(event.clientY - start.current.clientY) > 10)) cancel();
    },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onClickCapture: (event: MouseEvent<HTMLElement>) => {
      if (triggered.current && shouldPreventDefault) { event.preventDefault(); event.stopPropagation(); }
      else onClick?.({ clientX: event.clientX, clientY: event.clientY });
      triggered.current = false;
    },
  };
}
