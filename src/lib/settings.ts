import 'server-only';
import { cache } from 'react';
import { prisma } from './admin';
import { AD_PLACEMENTS, placementSettingKey, resolveAdPolicy } from './ad-policy';

export const AD_SETTING_KEYS = { display: 'ADS_DISPLAY_ENABLED', download: 'ADS_DOWNLOAD_ENABLED' } as const;
export const getAdSettings = cache(async () => {
  const stored: Record<string, string> = {};
  let settingsAvailable = true;
  if (process.env.DATABASE_URL) {
    try {
      const rows = await prisma.appSettings.findMany({ where: { key: { in: [
        ...Object.values(AD_SETTING_KEYS), ...Object.keys(AD_PLACEMENTS).map(id => placementSettingKey(id as keyof typeof AD_PLACEMENTS)),
      ] } } });
      rows.forEach(row => { stored[row.key] = row.value; });
    } catch { settingsAvailable = false; console.error('Ad settings unavailable; network ads disabled.'); }
  }
  const environmentDisabled = process.env.DISPLAY_ADS_ENABLED === 'false';
  const placements = resolveAdPolicy(stored, {
    disabled: environmentDisabled,
    verified: settingsAvailable ? process.env.ADS_VERIFIED_PLACEMENTS || '' : '',
  });
  return {
    postersEnabled: !environmentDisabled && stored.ADS_DISPLAY_ENABLED !== 'false',
    waitingPageEnabled: !environmentDisabled && stored.ADS_DOWNLOAD_ENABLED !== 'false',
    displayPreference: stored.ADS_DISPLAY_ENABLED !== 'false',
    downloadPreference: stored.ADS_DOWNLOAD_ENABLED !== 'false',
    placementPreferences: Object.fromEntries(Object.keys(AD_PLACEMENTS).map(id => [id, stored[placementSettingKey(id as keyof typeof AD_PLACEMENTS)] !== 'false'])),
    placements, environmentDisabled, settingsAvailable,
    popunderEnabled: false, nativeEnabled: false, socialBarEnabled: false,
  };
});
