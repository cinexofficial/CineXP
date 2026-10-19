/** Stable identifiers are shared by rendering, administration and measurement. */
export const AD_PLACEMENTS = {
  'home-primary': 'Home · after two sections',
  'home-secondary': 'Home · after five sections',
  'catalog-movies': 'Movies · below the first results block',
  'catalog-series': 'Series · below the first results block',
  'catalog-trending': 'Trending · below the first results block',
  'catalog-genre': 'Genre results · below the first results block',
  'watch-below-player': 'Watch · below playback and episode controls',
  'download-below-actions': 'Download · below file actions',
} as const;

export type AdPlacement = keyof typeof AD_PLACEMENTS;
export type PlacementPolicy = { enabled: boolean; networkEnabled: boolean };
export type PlacementPolicies = Record<AdPlacement, PlacementPolicy>;
export const placementSettingKey = (placement: AdPlacement) => `ADS_PLACEMENT_${placement.toUpperCase().replaceAll('-', '_')}`;

export function resolveAdPolicy(stored: Record<string, string>, environment: {
  disabled: boolean;
  verified: string;
}): PlacementPolicies {
  const verified = new Set(environment.verified.split(',').map(value => value.trim()));
  return Object.fromEntries(Object.keys(AD_PLACEMENTS).map(value => {
    const id = value as AdPlacement;
    const enabled = !environment.disabled && stored.ADS_DISPLAY_ENABLED !== 'false'
      && stored[placementSettingKey(id)] !== 'false'
      && (id !== 'download-below-actions' || stored.ADS_DOWNLOAD_ENABLED !== 'false');
    return [id, { enabled, networkEnabled: enabled && verified.has(id) }];
  })) as PlacementPolicies;
}
