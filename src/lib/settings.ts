import { cache } from 'react';

export const getAdSettings = cache(async () => {
  return {
    postersEnabled: true,
    popunderEnabled: true,
    nativeEnabled: true,
    socialBarEnabled: true,
    waitingPageEnabled: true,
  };
});

