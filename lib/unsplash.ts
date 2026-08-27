const SEARCH_ENDPOINT = "https://api.unsplash.com/search/photos";
const CACHE_SECONDS = 86400;

type UnsplashSearchResponse = {
  results?: Array<{ urls?: { regular?: string } }>;
};

/**
 * Looks up a landscape photo for a city. Every failure path — missing API key,
 * rate limit, non-JSON body, network error — resolves to null: a photo outage
 * must never take the whole city page down with it.
 */
export async function fetchCityPhoto(cityName: string): Promise<string | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return null;

  const query = encodeURIComponent(cityName);
  const url = `${SEARCH_ENDPOINT}?query=${query}&orientation=landscape&per_page=1`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Client-ID ${accessKey}` },
      next: { revalidate: CACHE_SECONDS },
    });

    if (!response.ok) return null;

    const data = (await response.json()) as UnsplashSearchResponse;
    return data.results?.[0]?.urls?.regular ?? null;
  } catch {
    return null;
  }
}
