import { ASSET_URLS } from '../Config/assets.ts';

/** Keep every request under the deployed page's base, including GitHub project pages. */
export function resolveAssetUrls(baseUrl: string) {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return { shoe: base + ASSET_URLS.shoe, runner: base + ASSET_URLS.runner };
}
