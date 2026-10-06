export const normalizeSpotifyUrl = (value, fallbackType = "", fallbackId = "") => {
  let url = typeof value === "string" ? value.trim() : "";

  if (url) {
    if (/^https?:\/\/open\.spotify\.com\/(track|album|playlist)\//i.test(url)) {
      return url;
    }

    if (/^spotify:(track|album|playlist):[^:]+$/i.test(url)) {
      const [, type, id] = url.split(":");
      return `https://open.spotify.com/${type.toLowerCase()}/${id}`;
    }

    if (/^spotify:\/\/(track|album|playlist)\/[^/]+/i.test(url)) {
      const clean = url.replace(/^spotify:\/\//i, "");
      const [type, id] = clean.split("/");
      return `https://open.spotify.com/${type.toLowerCase()}/${id}`;
    }
  }

  if (fallbackType && fallbackId) {
    const type = String(fallbackType).toLowerCase();
    if (["track", "album", "playlist"].includes(type)) {
      return `https://open.spotify.com/${type}/${fallbackId}`;
    }
  }

  return "";
};

export const getSpotifyUrl = (item, fallbackType = "") => {
  if (!item || typeof item !== "object") return "";

  const candidates = [
    item.spotifyUrl,
    item.spotify_url,
    item.spotifyLink,
    item.spotify_link,
    item.external_urls?.spotify,
    item.externalUrls?.spotify,
    item.spotify?.external_urls?.spotify,
    item.spotify?.externalUrls?.spotify,
    item.spotify?.url,
    item.spotify?.uri,
    item.links?.spotify,
    item.urls?.spotify,
    item.spotifyUri,
    item.spotify_uri,
    item.uri,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeSpotifyUrl(
      candidate,
      fallbackType,
      item.spotifyId || item.spotify_id || item.id
    );

    if (normalized) return normalized;
  }

  return normalizeSpotifyUrl(
    "",
    fallbackType || item.spotifyType || item.spotify_type || item.type,
    item.spotifyId || item.spotify_id || item.id
  );
};

export const getSpotifyType = (item) => {
  const url = getSpotifyUrl(item);

  const match = url.match(
    /open\.spotify\.com\/(track|album|playlist)\//i
  );

  if (match) return match[1].toLowerCase();

  const type = String(
    item?.spotifyType || item?.spotify_type || item?.type || ""
  ).toLowerCase();

  if (type === "song") return "track";
  if (["track", "album", "playlist"].includes(type)) return type;

  return "";
};

export const redirectToSpotify = (item, fallbackType = "") => {
  const url = getSpotifyUrl(item, fallbackType);

  if (!url) {
    console.warn("Spotify URL not found", item);
    return false;
  }

  window.location.assign(url);
  return true;
};
