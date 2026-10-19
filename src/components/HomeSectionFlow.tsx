"use client";

import { Children, Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import AdSlot from './ads/AdSlot';
import type { PlacementPolicies } from '@/lib/ad-policy';

/** Client-only rows can return null. Count their real section elements, rather
 * than configured indices, and keep ad placement independent of section names. */
export default function HomeSectionFlow({ children, placements }: {
  children: ReactNode;
  placements: PlacementPolicies;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState<number[]>([]);
  const items = Children.toArray(children);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const update = () => {
      const next = [...element.querySelectorAll<HTMLElement>(':scope > [data-home-section]')]
        .filter(wrapper => wrapper.querySelector('section'))
        .map(wrapper => Number(wrapper.dataset.homeSection));
      setRendered(previous => previous.join(',') === next.join(',') ? previous : next);
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(element, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return <div ref={root}>
    {items.map((item, index) => {
      const position = rendered.indexOf(index) + 1;
      const placement = position === 2 ? 'home-primary' : position === 5 ? 'home-secondary' : null;
      return <Fragment key={index}>
        <div data-home-section={index}>{item}</div>
        {placement && placements[placement].enabled && <AdSlot placement={placement} networkEnabled={placements[placement].networkEnabled} />}
      </Fragment>;
    })}
  </div>;
}
