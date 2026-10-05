import { getSongbyQuery } from "../../fetch";

const SPOTIFY_ACCOUNTS_URL = "https://accounts.spotify.com";
const SPOTIFY_API_URL = "https://api.spotify.com/v1";

const CLIENT_ID = String(
  import.meta.env.VITE_SPOTIFY_CLIENT_ID || ""
).trim();

const TOKEN_KEY = "musicmax_spotify_token";
const VERIFIER_KEY = "musicmax_spotify_pkce_verifier";
const STATE_KEY = "musicmax_spotify_oauth_state";

const DEFAULT_SCOPES = [
  "playlist-read-private",
  "playlist-read-collaborative",
].join(" ");

const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, value));

const cleanText = (value) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

const normaliseSearchText = (value) =>
  cleanText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[&/\\#,+()$~%.'":*?<>{}!\-_[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/* =========================================================
   PKCE
========================================================= */

const randomString = (length = 64) => {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

  const values = new Uint8Array(length);
  crypto.getRandomValues(values);

  return Array.from(
    values,
    (value) => alphabet[value % alphabet.length]
  ).join("");
};

const base64UrlFromBytes = (bytes) => {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

const sha256Base64Url = async (value) => {
  const bytes = new TextEncoder().encode(value);

  const digest = await crypto.subtle.digest(
    "SHA-256",
    bytes
  );

  return base64UrlFromBytes(
    new Uint8Array(digest)
  );
};

/* =========================================================
   CLIENT / REDIRECT
========================================================= */

export const hasSpotifyClientId = () =>
  Boolean(CLIENT_ID);

export const getSpotifyRedirectUri = () => {
  const {
    protocol,
    hostname,
    port,
  } = window.location;

  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  ) {
    return `http://127.0.0.1:${
      port || "5173"
    }/spotify-import`;
  }

  return `${protocol}//${hostname}/spotify-import`;
};

/* =========================================================
   TOKEN STORAGE
========================================================= */

const readStoredToken = () => {
  try {
    const raw = localStorage.getItem(
      TOKEN_KEY
    );

    if (!raw) {
      return null;
    }

    const stored = JSON.parse(raw);

    if (!stored?.access_token) {
      return null;
    }

    const savedAt = Number(
      stored.savedAt || 0
    );

    const expiresIn = Number(
      stored.expires_in || 0
    );

    if (
      savedAt &&
      expiresIn &&
      Date.now() >=
        savedAt +
          expiresIn * 1000 -
          60_000
    ) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }

    return stored;
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
};

export const getSpotifyToken = () =>
  readStoredToken()?.access_token || "";

const saveSpotifyToken = (token) => {
  localStorage.setItem(
    TOKEN_KEY,
    JSON.stringify({
      ...token,
      savedAt: Date.now(),
    })
  );
};

export const disconnectSpotify = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(
    VERIFIER_KEY
  );
  localStorage.removeItem(
    STATE_KEY
  );
};

/* =========================================================
   CONNECT SPOTIFY
========================================================= */

export const connectSpotify = async () => {
  if (!CLIENT_ID) {
    throw new Error(
      "Spotify Client ID is missing. Add VITE_SPOTIFY_CLIENT_ID to your .env file."
    );
  }

  /*
   * Redirect localhost to loopback IP.
   */
  if (
    window.location.hostname ===
    "localhost"
  ) {
    const port =
      window.location.port || "5173";

    const target =
      `http://127.0.0.1:${port}` +
      `${window.location.pathname}`;

    window.location.replace(target);

    return;
  }

  if (
    !window.isSecureContext &&
    window.location.hostname !==
      "127.0.0.1"
  ) {
    throw new Error(
      "Spotify login requires HTTPS. Open the deployed HTTPS website."
    );
  }

  const verifier =
    randomString(96);

  const challenge =
    await sha256Base64Url(
      verifier
    );

  const state =
    randomString(32);

  localStorage.setItem(
    VERIFIER_KEY,
    verifier
  );

  localStorage.setItem(
    STATE_KEY,
    state
  );

  const params =
    new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: "code",
      redirect_uri:
        getSpotifyRedirectUri(),
      scope: DEFAULT_SCOPES,
      state,
      code_challenge_method: "S256",
      code_challenge: challenge,
    });

  window.location.assign(
    `${SPOTIFY_ACCOUNTS_URL}/authorize?${params.toString()}`
  );
};

/* =========================================================
   AUTHORIZATION CODE
========================================================= */

const exchangeAuthorizationCode =
  async (code) => {
    const verifier =
      localStorage.getItem(
        VERIFIER_KEY
      );

    if (!verifier) {
      throw new Error(
        "Spotify login session expired. Please connect Spotify again."
      );
    }

    const body =
      new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type:
          "authorization_code",
        code,
        redirect_uri:
          getSpotifyRedirectUri(),
        code_verifier: verifier,
      });

    const response =
      await fetch(
        `${SPOTIFY_ACCOUNTS_URL}/api/token`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },
          body,
        }
      );

    const data =
      await response
        .json()
        .catch(() => null);

    if (!response.ok) {
      throw new Error(
        data?.error_description ||
          data?.error ||
          `Spotify token request failed (${response.status}).`
      );
    }

    saveSpotifyToken(data);

    localStorage.removeItem(
      VERIFIER_KEY
    );

    localStorage.removeItem(
      STATE_KEY
    );

    return data.access_token;
  };

export const handleSpotifyCallback =
  async () => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const code =
      params.get("code");

    const error =
      params.get("error");

    if (error) {
      throw new Error(
        `Spotify authorization failed: ${error}`
      );
    }

    if (!code) {
      return false;
    }

    const state =
      params.get("state");

    const expectedState =
      localStorage.getItem(
        STATE_KEY
      );

    if (
      !state ||
      !expectedState ||
      state !== expectedState
    ) {
      disconnectSpotify();

      throw new Error(
        "Spotify security verification failed. Please connect again."
      );
    }

    await exchangeAuthorizationCode(
      code
    );

    window.history.replaceState(
      {},
      document.title,
      window.location.pathname
    );

    return true;
  };

/* =========================================================
   SPOTIFY REQUEST
========================================================= */

const spotifyRequest = async (
  path,
  options = {}
) => {
  const token =
    getSpotifyToken();

  if (!token) {
    throw new Error(
      "Connect Spotify before importing music."
    );
  }

  const response =
    await fetch(
      `${SPOTIFY_API_URL}${path}`,
      {
        ...options,
        headers: {
          Authorization:
            `Bearer ${token}`,
          ...(options.headers || {}),
        },
      }
    );

  const data =
    await response
      .json()
      .catch(() => null);

  if (!response.ok) {
    if (
      response.status === 401
    ) {
      disconnectSpotify();

      throw new Error(
        "Spotify session expired. Please disconnect and connect Spotify again."
      );
    }

    if (
      response.status === 403
    ) {
      throw new Error(
        "Spotify denied access to this playlist. Current Spotify API access is limited to playlists you own or collaborate on. Try one of your own playlists."
      );
    }

    if (
      response.status === 404
    ) {
      throw new Error(
        "Spotify playlist, album, or track was not found."
      );
    }

    if (
      response.status === 429
    ) {
      const retryAfter =
        response.headers.get(
          "Retry-After"
        );

      throw new Error(
        retryAfter
          ? `Spotify rate limit reached. Try again in ${retryAfter} seconds.`
          : "Spotify rate limit reached. Please try again shortly."
      );
    }

    const message =
      data?.error?.message ||
      data?.message ||
      `Spotify request failed (${response.status}).`;

    throw new Error(message);
  }

  return data;
};

/* =========================================================
   PAGINATION
========================================================= */

const getRelativeApiPath =
  (absoluteUrl) => {
    try {
      const url =
        new URL(absoluteUrl);

      let pathname =
        url.pathname;

      if (
        pathname.startsWith(
          "/v1/"
        )
      ) {
        pathname =
          pathname.substring(3);
      }

      return `${pathname}${url.search}`;
    } catch {
      return "";
    }
  };

const fetchAllSpotifyPages =
  async (
    initialPath,
    onPage
  ) => {
    const items = [];

    let path =
      initialPath;

    let safety = 0;

    while (
      path &&
      safety < 100
    ) {
      safety += 1;

      const data =
        await spotifyRequest(
          path
        );

      const pageItems =
        Array.isArray(
          data?.items
        )
          ? data.items
          : [];

      items.push(
        ...pageItems
      );

      onPage?.(
        items.length,
        Number(
          data?.total ||
            items.length
        )
      );

      path = data?.next
        ? getRelativeApiPath(
            data.next
          )
        : "";
    }

    return items;
  };

/* =========================================================
   SPOTIFY URL PARSER
========================================================= */

export const parseSpotifyLink =
  (input) => {
    const value =
      cleanText(input);

    if (!value) {
      throw new Error(
        "Paste a Spotify track, album, or playlist link."
      );
    }

    /*
     * spotify:track:ID
     * spotify:album:ID
     * spotify:playlist:ID
     */
    const uriMatch =
      value.match(
        /^spotify:(track|album|playlist):([A-Za-z0-9]+)$/i
      );

    if (uriMatch) {
      return {
        type:
          uriMatch[1].toLowerCase(),
        id: uriMatch[2],
      };
    }

    /*
     * https://open.spotify.com/playlist/ID?si=...
     */
    const match =
      value.match(
        /(?:^|\/)(track|album|playlist)\/([A-Za-z0-9]+)/i
      );

    if (!match) {
      throw new Error(
        "Invalid Spotify URL. Paste a Spotify track, album, or playlist URL."
      );
    }

    return {
      type:
        match[1].toLowerCase(),
      id: match[2],
    };
  };

/* =========================================================
   SPOTIFY TRACK NORMALIZER
========================================================= */

const toSpotifyTrack =
  (track) => {
    if (!track) {
      return null;
    }

    /*
     * Do not import podcast episodes.
     */
    if (
      track.type ===
      "episode"
    ) {
      return null;
    }

    if (!track.id) {
      return null;
    }

    const artists =
      Array.isArray(
        track.artists
      )
        ? track.artists
            .map(
              (artist) =>
                cleanText(
                  artist?.name
                )
            )
            .filter(Boolean)
        : [];

    const image =
      track.album?.images?.[0]
        ?.url ||
      track.album?.images?.[1]
        ?.url ||
      track.album?.images?.[2]
        ?.url ||
      "/Unknown.png";

    return {
      id: track.id,

      name:
        cleanText(
          track.name
        ) ||
        "Unknown Track",

      artists,

      album:
        cleanText(
          track.album?.name
        ),

      image,

      durationMs:
        Number(
          track.duration_ms
        ) || 0,

      spotifyUrl:
        track.external_urls
          ?.spotify ||
        `https://open.spotify.com/track/${track.id}`,
    };
  };

/* =========================================================
   GET SPOTIFY TRACK / ALBUM / PLAYLIST
========================================================= */

export const getSpotifyItems =
  async (input) => {
    const parsed =
      parseSpotifyLink(
        input
      );

    /* ---------------------------------
       TRACK
    --------------------------------- */

    if (
      parsed.type ===
      "track"
    ) {
      const track =
        await spotifyRequest(
          `/tracks/${parsed.id}`
        );

      const item =
        toSpotifyTrack(track);

      if (!item) {
        throw new Error(
          "Spotify track is unavailable or not playable."
        );
      }

      return {
        type: "track",
        id: parsed.id,
        name:
          item.name ||
          "Spotify Track",
        image:
          item.image ||
          "/Unknown.png",
        items: [item],
      };
    }

    /* ---------------------------------
       ALBUM
    --------------------------------- */

    if (
      parsed.type ===
      "album"
    ) {
      const album =
        await spotifyRequest(
          `/albums/${parsed.id}`
        );

      const tracks =
        await fetchAllSpotifyPages(
          `/albums/${parsed.id}/tracks?limit=50`
        );

      const albumImage =
        album?.images?.[0]
          ?.url ||
        album?.images?.[1]
          ?.url ||
        album?.images?.[2]
          ?.url ||
        "/Unknown.png";

      const items =
        tracks
          .map((track) =>
            toSpotifyTrack({
              ...track,

              album: {
                ...track.album,

                name:
                  album?.name ||
                  track.album?.name,

                images:
                  album?.images ||
                  track.album?.images,
              },
            })
          )
          .filter(Boolean);

      if (!items.length) {
        throw new Error(
          "No playable tracks were found in this Spotify album."
        );
      }

      return {
        type: "album",
        id: parsed.id,
        name:
          cleanText(
            album?.name
          ) ||
          "Spotify Album",
        image: albumImage,
        items,
      };
    }

    /* ---------------------------------
       PLAYLIST
    --------------------------------- */

    const playlist =
      await spotifyRequest(
        `/playlists/${parsed.id}`
      );

    /*
     * IMPORTANT:
     *
     * Spotify 2026 API:
     *
     * OLD:
     * item.track
     *
     * NEW:
     * item.item
     *
     * We support both to make the
     * importer backward compatible.
     */
    const playlistItems =
      await fetchAllSpotifyPages(
        `/playlists/${parsed.id}/items?limit=50`
      );

    const items =
      playlistItems
        .map((entry) => {
          const track =
            entry?.item ||
            entry?.track;

          return toSpotifyTrack(
            track
          );
        })
        .filter(Boolean);

    if (!items.length) {
      throw new Error(
        "Spotify returned no playable tracks. Make sure this playlist is owned by your Spotify account or that you are a collaborator."
      );
    }

    return {
      type: "playlist",
      id: parsed.id,

      name:
        cleanText(
          playlist?.name
        ) ||
        "Spotify Playlist",

      image:
        playlist?.images?.[0]
          ?.url ||
        playlist?.images?.[1]
          ?.url ||
        playlist?.images?.[2]
          ?.url ||
        "/Unknown.png",

      items,
    };
  };

/* =========================================================
   JIOSAAVN SEARCH
========================================================= */

const getJioSongResults =
  async (spotifyTrack) => {
    const artist =
      spotifyTrack.artists.join(
        " "
      );

    const title =
      spotifyTrack.name;

    const queries = [
      `${title} ${artist}`,
      title,
    ];

    const seen =
      new Set();

    const results = [];

    for (
      const query of queries
    ) {
      try {
        /*
         * Spotify search max is now 10.
         */
        const response =
          await getSongbyQuery(
            query,
            10
          );

        const list =
          Array.isArray(
            response?.data
              ?.results
          )
            ? response.data.results
            : [];

        for (
          const song of list
        ) {
          const key =
            String(
              song?.id ||
                song?.songId ||
                ""
            );

          if (
            key &&
            !seen.has(key)
          ) {
            seen.add(key);
            results.push(song);
          }
        }
      } catch (error) {
        console.warn(
          "JioSaavn search failed:",
          query,
          error
        );
      }
    }

    return results;
  };

/* =========================================================
   ARTIST NORMALIZER
========================================================= */

const songArtists =
  (song) => {
    if (
      Array.isArray(
        song?.artists?.primary
      )
    ) {
      return song.artists.primary
        .map(
          (artist) =>
            cleanText(
              artist?.name
            )
        )
        .filter(Boolean);
    }

    if (
      Array.isArray(
        song?.artists
      )
    ) {
      return song.artists
        .map((artist) =>
          typeof artist ===
          "string"
            ? cleanText(
                artist
              )
            : cleanText(
                artist?.name
              )
        )
        .filter(Boolean);
    }

    if (
      typeof song?.artist ===
      "string"
    ) {
      return [
        cleanText(
          song.artist
        ),
      ];
    }

    return [];
  };

/* =========================================================
   AUDIO URL
========================================================= */

const getAudioUrl =
  (song) => {
    const urls =
      Array.isArray(
        song?.downloadUrl
      )
        ? song.downloadUrl
        : [];

    for (
      let i =
        urls.length - 1;
      i >= 0;
      i--
    ) {
      const url =
        typeof urls[i] ===
        "string"
          ? urls[i]
          : urls[i]?.url;

      if (url) {
        return url;
      }
    }

    return (
      song?.downloadUrl ||
      song?.audioUrl ||
      song?.audio ||
      song?.url ||
      ""
    );
  };

/* =========================================================
   MATCH SCORE
========================================================= */

const scoreSong =
  (
    spotifyTrack,
    song
  ) => {
    const spotifyTitle =
      normaliseSearchText(
        spotifyTrack.name
      );

    const spotifyArtists =
      spotifyTrack.artists.map(
        normaliseSearchText
      );

    const jioTitle =
      normaliseSearchText(
        song?.name ||
          song?.title ||
          song?.songName
      );

    const jioArtists =
      songArtists(song).map(
        normaliseSearchText
      );

    if (
      !jioTitle ||
      !getAudioUrl(song)
    ) {
      return -Infinity;
    }

    let score = 0;

    /* TITLE */

    if (
      jioTitle ===
      spotifyTitle
    ) {
      score += 70;
    } else if (
      jioTitle.includes(
        spotifyTitle
      ) ||
      spotifyTitle.includes(
        jioTitle
      )
    ) {
      score += 35;
    }

    /* ARTIST */

    for (
      const artist of spotifyArtists
    ) {
      if (!artist) {
        continue;
      }

      if (
        jioArtists.includes(
          artist
        )
      ) {
        score += 25;
      } else if (
        jioArtists.some(
          (candidate) =>
            candidate.includes(
              artist
            ) ||
            artist.includes(
              candidate
            )
        )
      ) {
        score += 12;
      }
    }

    /* DURATION */

    const spotifyDuration =
      Number(
        spotifyTrack.durationMs ||
          0
      ) / 1000;

    const jioDuration =
      Number(
        song?.duration ||
          song?.durationInSeconds ||
          0
      );

    if (
      spotifyDuration > 0 &&
      jioDuration > 0
    ) {
      const difference =
        Math.abs(
          spotifyDuration -
            jioDuration
        );

      if (
        difference <= 2
      ) {
        score += 10;
      } else if (
        difference <= 5
      ) {
        score += 6;
      } else if (
        difference <= 10
      ) {
        score += 2;
      }
    }

    return score;
  };

/* =========================================================
   JIOSAAVN NORMALIZER
========================================================= */

const normaliseJioSong =
  (
    song,
    spotifyTrack
  ) => {
    const audioUrl =
      getAudioUrl(song);

    if (!audioUrl) {
      return null;
    }

    return {
      ...song,

      id:
        song?.id ||
        song?.songId,

      name:
        song?.name ||
        song?.title ||
        spotifyTrack.name,

      duration:
        Number(
          song?.duration ||
            song?.durationInSeconds
        ) ||
        Math.round(
          spotifyTrack.durationMs /
            1000
        ),

      image:
        song?.image?.[2]
          ?.url ||
        song?.image?.[1]
          ?.url ||
        song?.image?.[0]
          ?.url ||
        song?.image ||
        spotifyTrack.image ||
        "/Unknown.png",

      artists:
        song?.artists || {
          primary:
            spotifyTrack.artists.map(
              (name) => ({
                name,
              })
            ),
        },

      downloadUrl:
        audioUrl,

      audioUrl,

      spotifyId:
        spotifyTrack.id,

      spotifyUrl:
        spotifyTrack.spotifyUrl,
    };
  };

/* =========================================================
   RESOLVE ONE TRACK
========================================================= */

const resolveOneTrack =
  async (spotifyTrack) => {
    const results =
      await getJioSongResults(
        spotifyTrack
      );

    let best = null;
    let bestScore =
      -Infinity;

    for (
      const result of results
    ) {
      const score =
        scoreSong(
          spotifyTrack,
          result
        );

      if (
        score >
        bestScore
      ) {
        bestScore =
          score;

        best =
          result;
      }
    }

    /*
     * Minimum matching score.
     */
    if (
      !best ||
      bestScore < 45
    ) {
      return null;
    }

    return normaliseJioSong(
      best,
      spotifyTrack
    );
  };

/* =========================================================
   CONCURRENCY
========================================================= */

const runWithConcurrency =
  async (
    items,
    worker,
    concurrency = 5,
    onProgress
  ) => {
    const output =
      new Array(
        items.length
      );

    let cursor = 0;
    let completed = 0;

    const runners =
      Array.from(
        {
          length:
            clamp(
              concurrency,
              1,
              10
            ),
        },
        async () => {
          while (true) {
            const index =
              cursor++;

            if (
              index >=
              items.length
            ) {
              return;
            }

            try {
              output[index] =
                await worker(
                  items[index],
                  index
                );
            } catch (error) {
              console.warn(
                "Track resolution failed:",
                error
              );

              output[index] =
                null;
            } finally {
              completed++;

              onProgress?.(
                completed,
                items.length
              );
            }
          }
        }
      );

    await Promise.all(
      runners
    );

    return output;
  };

/* =========================================================
   RESOLVE ALL SPOTIFY TRACKS
========================================================= */

export const resolveSpotifyTracks =
  async (
    spotifyTracks,
    onProgress,
    concurrency = 5
  ) => {
    const unique = [];
    const seen =
      new Set();

    for (
      const track of
        spotifyTracks || []
    ) {
      const key =
        track?.id ||
        `${track?.name}:${track?.artists?.join(
          ","
        )}`;

      if (
        !key ||
        seen.has(key)
      ) {
        continue;
      }

      seen.add(key);
      unique.push(track);
    }

    const resolved =
      await runWithConcurrency(
        unique,
        resolveOneTrack,
        concurrency,
        onProgress
      );

    const songs =
      resolved.filter(Boolean);

    const failed =
      unique.filter(
        (_, index) =>
          !resolved[index]
      );

    return {
      songs,
      failed,
      total:
        unique.length,
    };
  };
