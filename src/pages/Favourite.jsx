import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import MusicContext from "../context/MusicContext";
import SongsList from "../components/SongsList";
import Navbar from "../components/Navbar";
import Navigator from "../components/Navigator";

/* =========================================================
   HELPERS
========================================================= */

const safeString = (value) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const imageUrl = (image) => {
  if (Array.isArray(image)) {
    for (let i = image.length - 1; i >= 0; i -= 1) {
      const item = image[i];

      if (typeof item === "string" && item.trim()) {
        return item.trim();
      }

      if (item && typeof item === "object") {
        const url = item.url || item.link || item.src;
        if (typeof url === "string" && url.trim()) {
          return url.trim();
        }
      }
    }
  }

  if (typeof image === "string" && image.trim()) {
    return image.trim();
  }

  if (image && typeof image === "object") {
    return image.url || image.link || image.src || "/Unknown.png";
  }

  return "/Unknown.png";
};

const artistNames = (artists) => {
  if (Array.isArray(artists?.primary)) {
    return artists.primary
      .map((artist) => safeString(artist?.name))
      .filter(Boolean)
      .join(", ");
  }

  if (Array.isArray(artists?.all)) {
    return artists.all
      .map((artist) => safeString(artist?.name))
      .filter(Boolean)
      .join(", ");
  }

  if (Array.isArray(artists)) {
    return artists
      .map((artist) =>
        typeof artist === "string" ? artist : safeString(artist?.name)
      )
      .filter(Boolean)
      .join(", ");
  }

  return typeof artists === "string" ? artists : "";
};

const readArray = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const getSpotifyUrl = (item) => {
  const candidates = [
    item?.spotifyUrl,
    item?.spotify_url,
    item?.spotifyLink,
    item?.spotify_link,
    item?.external_urls?.spotify,
    item?.externalUrls?.spotify,
    item?.links?.spotify,
    item?.urls?.spotify,
    item?.spotify?.url,
    item?.spotify?.spotifyUrl,
    item?.spotify?.spotify_url,
    item?.spotify?.external_urls?.spotify,
    item?.spotify?.externalUrls?.spotify,
  ];

  for (const value of candidates) {
    const url = safeString(value);
    if (!url) continue;

    if (
      url.startsWith("https://open.spotify.com/") ||
      url.startsWith("http://open.spotify.com/")
    ) {
      return url;
    }

    if (url.startsWith("spotify:")) {
      const parts = url.split(":");
      if (parts.length >= 3) {
        return `https://open.spotify.com/${parts[1]}/${parts[2]}`;
      }
    }

    if (url.startsWith("spotify://")) {
      const parts = url.replace("spotify://", "").split("/");
      if (parts.length >= 2) {
        return `https://open.spotify.com/${parts[0]}/${parts[1]}`;
      }
    }
  }

  return "";
};

const getItemId = (item, fallback) => {
  return item?.id ?? item?.albumId ?? item?.playlistId ?? fallback;
};

const Favourite = () => {
  const { playMusic } = useContext(MusicContext) || {};

  const [likedSongs, setLikedSongs] = useState([]);
  const [likedAlbums, setLikedAlbums] = useState([]);
  const [likedPlaylists, setLikedPlaylists] = useState([]);

  const loadFavourites = useCallback(() => {
    setLikedSongs(readArray("likedSongs"));
    setLikedAlbums(readArray("likedAlbums"));
    setLikedPlaylists(readArray("likedPlaylists"));
  }, []);

  useEffect(() => {
    loadFavourites();

    const update = () => loadFavourites();

    window.addEventListener("storage", update);
    window.addEventListener("favouritesUpdated", update);

    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("favouritesUpdated", update);
    };
  }, [loadFavourites]);

  const removeItem = useCallback(
    (key, id) => {
      if (id === null || id === undefined) return;

      const current = readArray(key);

      const updated = current.filter(
        (item) => String(item?.id) !== String(id)
      );

      try {
        localStorage.setItem(key, JSON.stringify(updated));
      } catch (error) {
        console.error(`Failed to update ${key}:`, error);
        return;
      }

      loadFavourites();

      window.dispatchEvent(new Event("favouritesUpdated"));
    },
    [loadFavourites]
  );

  const removeSong = (id) => removeItem("likedSongs", id);
  const removeAlbum = (id) => removeItem("likedAlbums", id);
  const removePlaylist = (id) => removeItem("likedPlaylists", id);

  const playFavouriteSong = useCallback(
    (song) => {
      if (!song || typeof playMusic !== "function") return;

      const queue = likedSongs.filter((item) => item?.id != null);

      playMusic(song, queue.length ? queue : undefined);
    },
    [likedSongs, playMusic]
  );

  const total = useMemo(
    () =>
      likedSongs.length +
      likedAlbums.length +
      likedPlaylists.length,
    [likedSongs, likedAlbums, likedPlaylists]
  );

  return (
    <>
      <Navbar />

      <main
        className="
          min-h-screen w-full
          bg-[var(--background)]
          text-[var(--text-primary)]
          pt-[9.5rem] sm:pt-[8rem] lg:pt-[7rem]
          px-4 pb-[8rem] lg:pb-12
        "
      >
        <div className="mx-auto w-full max-w-7xl">

          {/* =================================================
              HEADER
          ================================================= */}
          <header
            className="
              relative z-10 mb-7 w-full
              flex flex-col gap-4
              sm:flex-row sm:items-end sm:justify-between
            "
          >
            <div className="min-w-0">
              <h1
                className="
                  text-3xl sm:text-4xl
                  font-extrabold tracking-tight
                "
              >
                Favourite
              </h1>

              <p className="mt-2 text-sm sm:text-base text-[var(--text-secondary)]">
                Your favourite songs, albums and playlists
              </p>
            </div>

            <div
              className="
                inline-flex w-fit items-center gap-2
                rounded-full border
                border-[var(--card-border)]
                bg-[var(--secondary-bg)]
                px-4 py-2
                text-sm font-semibold
              "
            >
              <span
                className="
                  flex h-7 min-w-7 items-center justify-center
                  rounded-full
                  bg-[var(--card-bg)]
                  px-2
                  text-xs
                "
              >
                {total}
              </span>
              <span>{total === 1 ? "Item" : "Items"}</span>
            </div>
          </header>

          {/* =================================================
              EMPTY STATE
          ================================================= */}
          {total === 0 && (
            <section
              className="
                flex min-h-[45vh]
                flex-col items-center justify-center
                rounded-2xl border
                border-[var(--card-border)]
                bg-[var(--card-bg)]
                px-6 text-center
              "
            >
              <div className="mb-4 text-6xl opacity-60">♡</div>

              <h2 className="text-xl font-bold">
                No Favourite Items
              </h2>

              <p className="mt-2 max-w-md text-sm text-[var(--text-secondary)]">
                Import from Spotify or like songs, albums and playlists.
              </p>
            </section>
          )}

          {/* =================================================
              SONGS
              IMPORTANT: Spotify icon is rendered ONLY by
              SongsList.jsx. Do not add another FaSpotify here.
          ================================================= */}
          {likedSongs.length > 0 && (
            <section className="mb-10">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-2xl font-bold">Songs</h2>

                <span className="text-sm text-[var(--text-secondary)]">
                  {likedSongs.length}
                </span>
              </div>

              <div
                className="
                  w-full overflow-hidden rounded-2xl
                  border border-[var(--card-border)]
                  bg-[var(--card-bg)]
                "
              >
                {likedSongs.map((song, index) => (
                  <div
                    key={song?.id ?? `song-${index}`}
                    className="
                      border-b border-[var(--card-border)]
                      last:border-b-0
                    "
                  >
                    <SongsList
                      {...song}
                      song={song}
                      songs={likedSongs}
                      onPlay={playFavouriteSong}
                      spotifyUrl={getSpotifyUrl(song)}
                    />

                    <div className="flex justify-end px-3 pb-2">
                      <button
                        type="button"
                        onClick={() => removeSong(song?.id)}
                        className="
                          flex h-8 w-8 items-center justify-center
                          rounded-full
                          text-xl leading-none
                          text-red-500
                          transition
                          hover:bg-red-500/10
                          active:scale-95
                        "
                        title="Remove from Favourite"
                        aria-label="Remove song from Favourite"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* =================================================
              ALBUMS
          ================================================= */}
          {likedAlbums.length > 0 && (
            <section className="mb-10">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold">Albums</h2>
                <span className="text-sm text-[var(--text-secondary)]">
                  {likedAlbums.length}
                </span>
              </div>

              <div
                className="
                  grid grid-cols-2 gap-4
                  sm:grid-cols-3
                  md:grid-cols-4
                  lg:grid-cols-5
                  xl:grid-cols-6
                "
              >
                {likedAlbums.map((album, index) => {
                  const spotifyUrl = getSpotifyUrl(album);
                  const isSpotify =
                    Boolean(spotifyUrl) ||
                    album?.source === "spotify";

                  const albumId = getItemId(
                    album,
                    `album-${index}`
                  );

                  const content = (
                    <>
                      <div
                        className="
                          relative aspect-square
                          overflow-hidden rounded-xl
                          bg-[var(--secondary-bg)]
                        "
                      >
                        <img
                          src={imageUrl(album?.image)}
                          alt={safeString(album?.name) || "Album"}
                          className="
                            h-full w-full object-cover
                            transition duration-300
                            group-hover:scale-105
                          "
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = "/Unknown.png";
                          }}
                        />

                        {isSpotify && (
                          <span
                            className="
                              absolute right-2 top-2
                              rounded-full
                              bg-[#1DB954]
                              px-2 py-1
                              text-[10px] font-bold
                              text-black
                            "
                          >
                            Spotify
                          </span>
                        )}
                      </div>

                      <div className="px-1 pt-2">
                        <div className="truncate text-sm font-semibold">
                          {safeString(album?.name) || "Unknown Album"}
                        </div>

                        <div className="mt-1 truncate text-xs text-[var(--text-secondary)]">
                          {artistNames(album?.artists) || "Album"}
                        </div>
                      </div>
                    </>
                  );

                  return (
                    <div
                      key={albumId}
                      className="group relative min-w-0"
                    >
                      {spotifyUrl ? (
                        <a
                          href={spotifyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          {content}
                        </a>
                      ) : (
                        <Link
                          to={`/albums/${album?.id}`}
                          className="block"
                        >
                          {content}
                        </Link>
                      )}

                      <button
                        type="button"
                        onClick={() => removeAlbum(album?.id)}
                        className="
                          absolute left-2 top-2
                          flex h-8 w-8 items-center justify-center
                          rounded-full
                          bg-black/70 text-white
                          opacity-100
                          transition
                          hover:bg-red-500
                        "
                        aria-label="Remove album from Favourite"
                        title="Remove album"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* =================================================
              PLAYLISTS
          ================================================= */}
          {likedPlaylists.length > 0 && (
            <section className="mb-10">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold">Playlists</h2>

                <span className="text-sm text-[var(--text-secondary)]">
                  {likedPlaylists.length}
                </span>
              </div>

              <div
                className="
                  grid grid-cols-2 gap-4
                  sm:grid-cols-3
                  md:grid-cols-4
                  lg:grid-cols-5
                  xl:grid-cols-6
                "
              >
                {likedPlaylists.map((playlist, index) => {
                  const spotifyUrl = getSpotifyUrl(playlist);
                  const isSpotify =
                    Boolean(spotifyUrl) ||
                    playlist?.source === "spotify";

                  const playlistId = getItemId(
                    playlist,
                    `playlist-${index}`
                  );

                  const content = (
                    <>
                      <div
                        className="
                          relative aspect-square
                          overflow-hidden rounded-xl
                          bg-[var(--secondary-bg)]
                        "
                      >
                        <img
                          src={imageUrl(playlist?.image)}
                          alt={
                            safeString(playlist?.name) ||
                            "Playlist"
                          }
                          className="
                            h-full w-full object-cover
                            transition duration-300
                            group-hover:scale-105
                          "
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = "/Unknown.png";
                          }}
                        />

                        {isSpotify && (
                          <span
                            className="
                              absolute right-2 top-2
                              rounded-full
                              bg-[#1DB954]
                              px-2 py-1
                              text-[10px] font-bold
                              text-black
                            "
                          >
                            Spotify
                          </span>
                        )}
                      </div>

                      <div className="px-1 pt-2">
                        <div className="truncate text-sm font-semibold">
                          {safeString(playlist?.name) ||
                            "Unknown Playlist"}
                        </div>

                        <div className="mt-1 truncate text-xs text-[var(--text-secondary)]">
                          Playlist
                        </div>
                      </div>
                    </>
                  );

                  return (
                    <div
                      key={playlistId}
                      className="group relative min-w-0"
                    >
                      {spotifyUrl ? (
                        <a
                          href={spotifyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          {content}
                        </a>
                      ) : (
                        <Link
                          to={`/playlists/${playlist?.id}`}
                          className="block"
                        >
                          {content}
                        </Link>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          removePlaylist(playlist?.id)
                        }
                        className="
                          absolute left-2 top-2
                          flex h-8 w-8 items-center justify-center
                          rounded-full
                          bg-black/70 text-white
                          opacity-100
                          transition
                          hover:bg-red-500
                        "
                        aria-label="Remove playlist from Favourite"
                        title="Remove playlist"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </main>

      <Navigator />
    </>
  );
};

export default Favourite;
