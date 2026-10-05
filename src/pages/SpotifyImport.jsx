import {
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { FaSpotify } from "react-icons/fa";
import { Link } from "react-router-dom";

import MusicContext from "../context/MusicContext";
import Navbar from "../components/Navbar";

import {
  connectSpotify,
  disconnectSpotify,
  getSpotifyItems,
  getSpotifyToken,
  handleSpotifyCallback,
  hasSpotifyClientId,
  resolveSpotifyTracks,
} from "../services/spotifyImport";

const SpotifyImport = () => {
  const { playMusic } =
    useContext(MusicContext);

  const [url, setUrl] =
    useState("");

  const [connected, setConnected] =
    useState(() =>
      Boolean(
        getSpotifyToken()
      )
    );

  const [loading, setLoading] =
    useState(false);

  const [callbackLoading, setCallbackLoading] =
    useState(() =>
      new URLSearchParams(
        window.location.search
      ).has("code")
    );

  const [progress, setProgress] =
    useState({
      done: 0,
      total: 0,
    });

  const [result, setResult] =
    useState(null);

  const [error, setError] =
    useState("");

  const configured =
    hasSpotifyClientId();

  const canImport =
    useMemo(
      () =>
        Boolean(
          connected &&
            url.trim() &&
            !loading
        ),
      [
        connected,
        url,
        loading,
      ]
    );

  /* =====================================================
     SPOTIFY CALLBACK
  ===================================================== */

  useEffect(() => {
    let cancelled = false;

    const finishCallback =
      async () => {
        try {
          const params =
            new URLSearchParams(
              window.location.search
            );

          if (
            params.has("error")
          ) {
            throw new Error(
              `Spotify authorization failed: ${params.get(
                "error"
              )}`
            );
          }

          if (
            params.has("code")
          ) {
            await handleSpotifyCallback();

            if (!cancelled) {
              setConnected(
                Boolean(
                  getSpotifyToken()
                )
              );
            }
          }
        } catch (callbackError) {
          if (!cancelled) {
            setError(
              callbackError?.message ||
                "Spotify connection failed."
            );

            setConnected(false);
          }
        } finally {
          if (!cancelled) {
            setCallbackLoading(
              false
            );
          }
        }
      };

    finishCallback();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =====================================================
     CONNECT
  ===================================================== */

  const handleConnect =
    async () => {
      setError("");

      try {
        await connectSpotify();
      } catch (connectError) {
        setError(
          connectError?.message ||
            "Could not connect Spotify."
        );
      }
    };

  /* =====================================================
     DISCONNECT
  ===================================================== */

  const handleDisconnect =
    () => {
      disconnectSpotify();

      setConnected(false);

      setResult(null);

      setError("");

      setProgress({
        done: 0,
        total: 0,
      });
    };

  /* =====================================================
     IMPORT
  ===================================================== */

  const handleImport =
    async () => {
      if (!canImport) {
        return;
      }

      setLoading(true);

      setError("");

      setResult(null);

      setProgress({
        done: 0,
        total: 0,
      });

      try {
        const spotifyData =
          await getSpotifyItems(
            url.trim()
          );

        if (
          !spotifyData?.items
            ?.length
        ) {
          throw new Error(
            "No Spotify tracks were found. If this is a playlist, make sure you own it or collaborate on it."
          );
        }

        setProgress({
          done: 0,
          total:
            spotifyData.items.length,
        });

        const resolved =
          await resolveSpotifyTracks(
            spotifyData.items,
            (
              done,
              total
            ) => {
              setProgress({
                done,
                total,
              });
            },
            5
          );

        if (
          !resolved.songs.length
        ) {
          throw new Error(
            "Spotify tracks were found, but no matching playable JioSaavn songs were found."
          );
        }

        const finalResult = {
          ...spotifyData,
          ...resolved,
        };

        setResult(
          finalResult
        );

        /*
         * Add all imported songs
         * to existing player queue.
         */
        playMusic(
          resolved.songs[0],
          resolved.songs
        );
      } catch (importError) {
        console.error(
          "Spotify import failed:",
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

  /* =====================================================
     CALLBACK LOADING
  ===================================================== */

  if (callbackLoading) {
    return (
      <>
        <Navbar />

        <main className="min-h-screen pt-32 px-5 flex items-center justify-center">
          <div className="card rounded-2xl p-8 max-w-lg w-full text-center">
            <div className="mx-auto mb-4 h-10 w-10 border-4 border-current border-t-transparent rounded-full animate-spin" />

            <h1 className="text-xl font-bold">
              Connecting Spotify…
            </h1>

            <p className="mt-2 opacity-70">
              Please wait.
            </p>
          </div>
        </main>
      </>
    );
  }

  /* =====================================================
     PAGE
  ===================================================== */

  return (
    <>
      <Navbar />

      <main className="min-h-screen pt-[9rem] px-4 pb-32">
        <section className="max-w-3xl mx-auto">

          <div className="card rounded-2xl p-5 md:p-8">

            {/* HEADER */}

            <div className="flex items-center gap-4 mb-7">

              <div className="h-14 w-14 shrink-0 rounded-full flex items-center justify-center bg-black text-green-500">
                <FaSpotify
                  size={34}
                />
              </div>

              <div className="min-w-0">

                <h1 className="text-2xl font-bold">
                  Spotify Import
                </h1>

                <p className="opacity-70 text-sm md:text-base">
                  Import Spotify tracks,
                  albums and playlists
                  into your queue.
                </p>

              </div>
            </div>

            {/* CLIENT ID WARNING */}

            {!configured && (
              <div className="mb-5 rounded-xl bg-yellow-500/10 border border-yellow-500/30 p-4">

                <p className="font-semibold">
                  Spotify Client ID is missing
                </p>

                <p className="text-sm opacity-70 mt-1">
                  Add{" "}
                  <code>
                    VITE_SPOTIFY_CLIENT_ID
                  </code>{" "}
                  to your environment variables.
                </p>

              </div>
            )}

            {/* CONNECT */}

            {!connected ? (
              <button
                type="button"
                onClick={
                  handleConnect
                }
                disabled={
                  !configured
                }
                className="w-full px-5 py-3 rounded-xl search-btn font-semibold flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <FaSpotify
                  size={22}
                />

                Connect Spotify
              </button>
            ) : (
              <>
                {/* CONNECTED */}

                <div className="flex items-center justify-between gap-3 mb-5">

                  <span className="text-sm text-green-500 font-semibold">
                    Spotify connected
                  </span>

                  <button
                    type="button"
                    onClick={
                      handleDisconnect
                    }
                    className="text-sm opacity-70 hover:opacity-100"
                  >
                    Disconnect
                  </button>

                </div>

                {/* URL */}

                <label
                  htmlFor="spotify-url"
                  className="block text-sm font-semibold mb-2"
                >
                  Spotify URL
                </label>

                <input
                  id="spotify-url"
                  value={url}
                  onChange={(event) =>
                    setUrl(
                      event.target
                        .value
                    )
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key ===
                      "Enter"
                    ) {
                      handleImport();
                    }
                  }}
                  placeholder="https://open.spotify.com/playlist/..."
                  className="w-full rounded-xl border border-zinc-500/30 bg-transparent px-4 py-3 outline-none focus:ring-2 focus:ring-green-500/40"
                  autoComplete="off"
                  disabled={loading}
                />

                {/* IMPORT */}

                <button
                  type="button"
                  onClick={
                    handleImport
                  }
                  disabled={
                    !canImport
                  }
                  className="mt-4 w-full px-5 py-3 rounded-xl search-btn font-semibold disabled:opacity-50"
                >
                  {loading
                    ? "Importing…"
                    : "Import Spotify Music"}
                </button>

              </>
            )}

            {/* PROGRESS */}

            {loading &&
              progress.total >
                0 && (
                <div className="mt-5">

                  <div className="flex justify-between text-sm mb-2">

                    <span>
                      Matching songs
                    </span>

                    <span>
                      {progress.done}/
                      {
                        progress.total
                      }
                    </span>

                  </div>

                  <div className="h-2 rounded-full bg-zinc-700/40 overflow-hidden">

                    <div
                      className="h-full bg-green-500 transition-all duration-300"
                      style={{
                        width:
                          `${Math.round(
                            (progress.done /
                              progress.total) *
                              100
                          )}%`,
                      }}
                    />

                  </div>
                </div>
              )}

            {/* ERROR */}

            {error && (
              <div className="mt-5 rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-red-500">

                <p className="font-semibold">
                  Spotify Import Error
                </p>

                <p className="mt-1 text-sm">
                  {error}
                </p>

              </div>
            )}

            {/* RESULT */}

            {result && (
              <div className="mt-7 border-t border-zinc-500/20 pt-6">

                <div className="flex items-center gap-4 mb-5">

                  <img
                    src={
                      result.image ||
                      "/Unknown.png"
                    }
                    alt={
                      result.name
                    }
                    className="h-16 w-16 rounded-xl object-cover"
                    onError={(
                      event
                    ) => {
                      event.currentTarget.onerror =
                        null;

                      event.currentTarget.src =
                        "/Unknown.png";
                    }}
                  />

                  <div className="min-w-0">

                    <h2 className="text-xl font-bold truncate">
                      {result.name}
                    </h2>

                    <p className="text-sm opacity-70">
                      {
                        result.songs
                          .length
                      }{" "}
                      playable
                      {result.failed
                        .length
                        ? ` • ${result.failed.length} not matched`
                        : " • all matched"}
                    </p>

                  </div>
                </div>

                {/* PLAY QUEUE */}

                <button
                  type="button"
                  onClick={() =>
                    playMusic(
                      result.songs[0],
                      result.songs
                    )
                  }
                  className="w-full px-5 py-3 rounded-xl search-btn font-semibold"
                >
                  Play Imported Queue
                </button>

                {/* FAILED */}

                {result.failed
                  .length >
                  0 && (
                  <details className="mt-5">

                    <summary className="cursor-pointer font-semibold">
                      Show unmatched songs
                    </summary>

                    <div className="mt-3 max-h-60 overflow-auto rounded-xl border border-zinc-500/20 p-3 space-y-2">

                      {result.failed.map(
                        (
                          track,
                          index
                        ) => (
                          <div
                            key={`${track.id || track.name}-${index}`}
                            className="text-sm"
                          >
                            <span className="font-medium">
                              {
                                track.name
                              }
                            </span>

                            {track
                              .artists
                              ?.length >
                              0 && (
                              <span className="opacity-60">
                                {" — "}
                                {track.artists.join(
                                  ", "
                                )}
                              </span>
                            )}
                          </div>
                        )
                      )}

                    </div>
                  </details>
                )}

              </div>
            )}

          </div>

          <div className="mt-5 text-center">
            <Link
              to="/"
              className="opacity-70 hover:opacity-100"
            >
              ← Back to Home
            </Link>
          </div>

        </section>
      </main>
    </>
  );
};

export default SpotifyImport;
