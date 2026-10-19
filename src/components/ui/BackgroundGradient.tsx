'use client';

import { useSyncExternalStore } from 'react';

const gradients = [
  // 1. Original (Purple)
  "radial-gradient(ellipse at top, #6c1b9b 0%, #1c0436 40%, #04010a 100%)",
  // 2. Cosmic Blue
  "radial-gradient(ellipse at top, #1b3b9b 0%, #041236 40%, #04010a 100%)",
  // 3. Emerald Dark
  "radial-gradient(ellipse at top, #0f5c35 0%, #042416 40%, #04010a 100%)",
  // 4. Crimson Night
  "radial-gradient(ellipse at top, #8a131c 0%, #2e0508 40%, #04010a 100%)",
  // 5. Deep Teal
  "radial-gradient(ellipse at top, #146b6e 0%, #042b2e 40%, #04010a 100%)",
  // 6. Midnight Violet
  "radial-gradient(ellipse at top, #48148c 0%, #180533 40%, #04010a 100%)",
  // 7. Sunset Orange Dark
  "radial-gradient(ellipse at top, #8c4114 0%, #301303 40%, #04010a 100%)",
  // 8. Galactic Magenta
  "radial-gradient(ellipse at top, #8c146e 0%, #2e0524 40%, #04010a 100%)",
  // 9. Abyssal Blue
  "radial-gradient(ellipse at top, #122147 0%, #050b1a 40%, #04010a 100%)",
  // 10. Phantom Green
  "radial-gradient(ellipse at top, #184712 0%, #071705 40%, #04010a 100%)",
  // 11. Deep Space
  "radial-gradient(ellipse at top, #000428 0%, #004e92 40%, #04010a 100%)",
  // 12. Electric Purple
  "radial-gradient(ellipse at top, #4b0082 0%, #000000 70%, #04010a 100%)",
  // 13. Forest Night
  "radial-gradient(ellipse at top, #0b3d1d 0%, #051d0e 50%, #04010a 100%)",
  // 14. Golden Shadow
  "radial-gradient(ellipse at top, #3d300b 0%, #1d1705 50%, #04010a 100%)",
  // 15. Cyber Neon
  "radial-gradient(ellipse at top, #0b3d3d 0%, #051d1d 50%, #04010a 100%)",
  // 16. Blood Moon
  "radial-gradient(ellipse at top, #4d0b0b 0%, #260505 50%, #04010a 100%)",
];

export default function BackgroundGradient() {
  const epoch = useSyncExternalStore(callback => {
    const interval = setInterval(callback, 60000);
    return () => clearInterval(interval);
  }, () => Math.floor(Date.now() / 28800000), () => 0);
  const gradient = gradients[(epoch * 17 + 5) % gradients.length];
  return <div style={{ position: 'fixed', inset: 0, zIndex: -100, pointerEvents: 'none', background: gradient }} />;
}
