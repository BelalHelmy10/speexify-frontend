export const COMPACT_CLASSROOM_QUERY = '(max-width: 1366px) and (pointer: coarse)';

export function normalizePdfRegion(value) {
  if (!value || !['x','y','width','height'].every(key => Number.isFinite(value[key]))) return null;
  const width = Math.min(1, Math.max(0.001, value.width));
  const height = Math.min(1, Math.max(0.001, value.height));
  return { x: Math.min(1-width, Math.max(0,value.x)), y: Math.min(1-height, Math.max(0,value.y)), width, height };
}

export function visiblePdfRegion(page, panel) {
  if (page.width <= 0 || page.height <= 0) return null;
  const left = Math.max(page.left, panel.left), top = Math.max(page.top, panel.top);
  const right = Math.min(page.right, panel.right), bottom = Math.min(page.bottom, panel.bottom);
  if (right <= left || bottom <= top) return null;
  return normalizePdfRegion({ x:(left-page.left)/page.width, y:(top-page.top)/page.height,
    width:(right-left)/page.width, height:(bottom-top)/page.height });
}

export function regionFitZoom(page, panel, region) {
  const valid = normalizePdfRegion(region);
  if (!valid || page.width <= 0 || page.height <= 0 || panel.width <= 0 || panel.height <= 0) return null;
  return Math.min(panel.width/(page.width*valid.width), panel.height/(page.height*valid.height));
}
