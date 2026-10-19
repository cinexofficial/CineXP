import { getAdSettings } from '@/lib/settings';
import type { AdPlacement } from '@/lib/ad-policy';
import AdSlot from './AdSlot';

/** Server boundary: secrets and saved policies never enter the ad document. */
export default async function DisplayAd({ placement }: { placement: AdPlacement }) {
  const settings = await getAdSettings();
  const policy = settings.placements[placement];
  return policy.enabled ? <AdSlot placement={placement} networkEnabled={policy.networkEnabled} /> : null;
}
