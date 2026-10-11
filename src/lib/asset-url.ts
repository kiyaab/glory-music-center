// Lovable-hosted CDN base. Assets are served from this origin regardless of
// where the app is deployed (Vercel, custom domain, etc.), so we prepend it
// to the relative `/__l5e/...` path stored in each `.asset.json` pointer.
const LOVABLE_ASSET_ORIGIN = "https://glorymusiccenter.lovable.app";

export function assetUrl(asset: { url: string }): string {
  const path = asset.url;
  if (/^https?:\/\//i.test(path)) return path;
  return `${LOVABLE_ASSET_ORIGIN}${path}`;
}
