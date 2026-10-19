/** Analytics services also attach the current page URL to custom events. */
export function sanitizeMeasurement<T extends { url: string }>(event: T): T | null {
  try {
    const url = new URL(event.url);
    if (url.pathname.startsWith('/admin')) return null;
    if (url.pathname.startsWith('/download/')) url.pathname = '/download/[token]';
    url.search = '';
    url.hash = '';
    return { ...event, url: url.toString() };
  } catch { return null; }
}
