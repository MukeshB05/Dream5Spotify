import {
  useEffect,
  useState,
} from "react";

import Navigator from "../components/Navigator";

import MusicContext from "../context/MusicContext";

import {
  createSpotifyLoginUrl,
  exchangeSpotifyCode,
  getSpotifyItems,
  getSpotifyToken,
  logoutSpotify,
} from "../services/spotifyImport";

import {
  useContext,
} from "react";

const saveImportedSongsToFavourites =
  (songs) => {
    try {
      const stored =
        JSON.parse(
          localStorage.getItem(
            "likedSongs"
          ) || "[]"
        );

      const current =
        Array.isArray(stored)
          ? stored
          : [];

      const map = new Map();

      current.forEach((song) => {
        if (song?.id != null) {
          map.set(
            String(song.id),
            song
          );
        }
      });

      let added = 0;

      for (const song of songs || []) {
        if (!song?.id) {
          continue;
        }

        const id =
          String(song.id);

        if (!map.has(id)) {
          added++;
        }

        map.set(id, {
          ...song,

          audio:
            song?.audioUrl ||
            song?.audio ||
            song?.downloadUrl ||
            "",
        });
      }

      localStorage.setItem(
        "likedSongs",
        JSON.stringify(
          Array.from(
            map.values()
          )
        )
      );

      return added;
    } catch (error) {
      console.error(
        "Favourite songs save failed:",
        error
      );

      return 0;
    }
  };

const saveImportedSourceToFavourite =
  (spotifyData) => {
    if (!spotifyData?.id) {
      return false;
    }

    let key = "";

    if (
      spotifyData.type ===
      "album"
    ) {
      key = "likedAlbums";
    }

    if (
      spotifyData.type ===
      "playlist"
    ) {
      key = "likedPlaylists";
    }

    if (!key) {
      return false;
    }

    try {
      const stored =
        JSON.parse(
          localStorage.getItem(
            key
          ) || "[]"
        );

      const current =
        Array.isArray(stored)
          ? stored
          : [];

      const exists =
        current.some(
          (item) =>
            String(item?.id) ===
            String(
              spotifyData.id
            )
        );

      if (exists) {
        return false;
      }

      const source = {
        id: spotifyData.id,

        name:
          spotifyData.name ||
          `Spotify ${spotifyData.type}`,

        image:
          spotifyData.image ||
          "/Unknown.png",

        artists:
          spotifyData.artists || {
            primary: [],
          },

        source: "spotify",

        spotifyType:
          spotifyData.type,

        spotifyUrl:
          spotifyData.spotifyUrl ||
          "",
      };

      localStorage.setItem(
        key,
        JSON.stringify([
          ...current,
          source,
        ])
      );

      return true;
    } catch (error) {
      console.error(
        "Spotify Favourite save failed:",
        error
      );

      return false;
    }
  };

const SpotifyImport = () => {
  const {
    playMusic,
  } = useContext(
    MusicContext
  );

  const [url, setUrl] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [connected, setConnected] =
    useState(
      Boolean(
        getSpotifyToken()
      )
    );

  const [result, setResult] =
    useState(null);

  const [error, setError] =
    useState("");

  const [favouriteAdded, setFavouriteAdded] =
    useState(0);

  /* ========================================
     SPOTIFY CALLBACK
  ======================================== */

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const code =
      params.get("code");

    const state =
      params.get("state");

    const errorParam =
      params.get("error");

    if (errorParam) {
      setError(
        `Spotify login failed: ${errorParam}`
      );

      window.history.replaceState(
        {},
        document.title,
        "/spotify-import"
      );

      return;
    }

    if (!code) {
      return;
    }

    const completeLogin =
      async () => {
        try {
          setLoading(true);

          await exchangeSpotifyCode(
            code,
            state
          );

          setConnected(true);

          window.history.replaceState(
            {},
            document.title,
            "/spotify-import"
          );
        } catch (loginError) {
          console.error(
            loginError
          );

          setError(
            loginError?.message ||
              "Spotify connection failed."
          );
        } finally {
          setLoading(false);
        }
      };

    completeLogin();
  }, []);

  /* ========================================
     CONNECT
  ======================================== */

  const connectSpotify =
    async () => {
      try {
        const loginUrl =
          await createSpotifyLoginUrl();

        window.location.href =
          loginUrl;
      } catch (error) {
        setError(
          error?.message ||
            "Unable to connect Spotify."
        );
      }
    };

  /* ========================================
     IMPORT
  ======================================== */

  const handleImport =
    async (event) => {
      event.preventDefault();

      setError("");
      setResult(null);
      setFavouriteAdded(0);

      if (!connected) {
        setError(
          "Please connect Spotify first."
        );

        return;
      }

      if (!url.trim()) {
        setError(
          "Paste a Spotify track, album or playlist URL."
        );

        return;
      }

      try {
        setLoading(true);

        const spotifyData =
          await getSpotifyItems(
            url.trim()
          );

        if (
          !spotifyData.songs?.length
        ) {
          throw new Error(
            "No playable Spotify tracks were found."
          );
        }

        const addedSongs =
          saveImportedSongsToFavourites(
            spotifyData.songs
          );

        const addedSource =
          saveImportedSourceToFavourite(
            spotifyData
          );

        setFavouriteAdded(
          addedSongs +
            (addedSource ? 1 : 0)
        );

        setResult(
          spotifyData
        );

        /* Queue ALL imported tracks */
        playMusic(
          spotifyData.songs[0],
          spotifyData.songs
        );
      } catch (importError) {
        console.error(
          importError
        );

        setError(
          importError?.message ||
            "Spotify import failed."
        );
      } finally {
        setLoading(false);
      }
    };

  /* ========================================
     LOGOUT
  ======================================== */

  const handleLogout = () => {
    logoutSpotify();

    setConnected(false);
    setResult(null);
    setError("");
  };

  return (
    <>
      <main
        className="
          min-h-screen
          pt-[6rem]
          px-4
          pb-32
          flex
          justify-center
        "
      >
        <div
          className="
            w-full
            max-w-2xl
            mt-5
          "
        >
          <div
            className="
              rounded-2xl
              border
              border-gray-200
              dark:border-gray-800
              bg-white
              dark:bg-black
              p-5
              shadow-lg
            "
          >
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold">
                Spotify Import
              </h1>

              <p className="mt-2 text-sm opacity-60">
                Import Spotify tracks,
                albums and playlists
                into your queue.
              </p>
            </div>

            {!connected ? (
              <button
                type="button"
                onClick={
                  connectSpotify
                }
                disabled={loading}
                className="
                  w-full
                  rounded-xl
                  bg-green-500
                  hover:bg-green-600
                  text-white
                  py-3
                  font-semibold
                  disabled:opacity-50
                "
              >
                {loading
                  ? "Connecting..."
                  : "Connect Spotify"}
              </button>
            ) : (
              <>
                <div
                  className="
                    mb-4
                    rounded-lg
                    bg-green-500/10
                    text-green-500
                    px-4
                    py-3
                    text-sm
                  "
                >
                  ✓ Spotify connected
                </div>

                <form
                  onSubmit={
                    handleImport
                  }
                  className="space-y-3"
                >
                  <input
                    type="url"
                    value={url}
                    onChange={(event) =>
                      setUrl(
                        event.target.value
                      )
                    }
                    placeholder="Paste Spotify track, album or playlist URL"
                    className="
                      w-full
                      rounded-xl
                      border
                      border-gray-300
                      dark:border-gray-700
                      bg-transparent
                      px-4
                      py-3
                      outline-none
                      focus:border-green-500
                    "
                  />

                  <button
                    type="submit"
                    disabled={loading}
                    className="
                      w-full
                      rounded-xl
                      bg-green-500
                      hover:bg-green-600
                      text-white
                      py-3
                      font-semibold
                      disabled:opacity-50
                    "
                  >
                    {loading
                      ? "Importing..."
                      : "Import to Queue + Favourite"}
                  </button>
                </form>

                <button
                  type="button"
                  onClick={
                    handleLogout
                  }
                  className="
                    mt-3
                    w-full
                    rounded-xl
                    border
                    border-red-500
                    text-red-500
                    py-2
                  "
                >
                  Disconnect Spotify
                </button>
              </>
            )}

            {error && (
              <div
                className="
                  mt-4
                  rounded-xl
                  bg-red-500/10
                  text-red-500
                  px-4
                  py-3
                  text-sm
                "
              >
                {error}
              </div>
            )}

            {favouriteAdded > 0 && (
              <div
                className="
                  mt-4
                  rounded-xl
                  bg-green-500/10
                  text-green-500
                  px-4
                  py-3
                  text-sm
                "
              >
                ✓ Added automatically
                to Favourite
                {favouriteAdded > 1
                  ? ` (${favouriteAdded} new items)`
                  : ""}
              </div>
            )}

            {result && (
              <div className="mt-5">
                <div
                  className="
                    flex
                    items-center
                    gap-3
                  "
                >
                  <img
                    src={
                      result.image ||
                      "/Unknown.png"
                    }
                    alt={result.name}
                    className="
                      w-16
                      h-16
                      rounded-xl
                      object-cover
                    "
                    onError={(event) => {
                      event.currentTarget.onerror =
                        null;

                      event.currentTarget.src =
                        "/Unknown.png";
                    }}
                  />

                  <div>
                    <p className="font-bold">
                      {result.name}
                    </p>

                    <p className="text-sm opacity-60 capitalize">
                      {result.type}
                    </p>

                    <p className="text-xs text-green-500">
                      {result.songs.length}{" "}
                      songs queued
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Navigator />
    </>
  );
};

export default SpotifyImport;
