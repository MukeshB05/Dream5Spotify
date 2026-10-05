import { useCallback, useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import MusicContext from "../context/MusicContext";
import Navigator from "../components/Navigator";

// ============================================================
// HELPERS
// ============================================================

const getImageUrl = (image) => {
  if (Array.isArray(image)) {
    return (
      image?.[2]?.url ||
      image?.[1]?.url ||
      image?.[0]?.url ||
      "/Unknown.png"
    );
  }

  if (typeof image === "string" && image.trim()) {
    return image;
  }

  return "/Unknown.png";
};

const getArtistNames = (artists) => {
  if (!artists) {
    return "";
  }

  if (Array.isArray(artists)) {
    return artists
      .map((artist) => {
        if (typeof artist === "string") {
          return artist;
        }

        return artist?.name || "";
      })
      .filter(Boolean)
      .join(", ");
  }

  if (Array.isArray(artists?.primary)) {
    return artists.primary
      .map((artist) => {
        if (typeof artist === "string") {
          return artist;
        }

        return artist?.name || "";
      })
      .filter(Boolean)
      .join(", ");
  }

  if (typeof artists === "string") {
    return artists;
  }

  return "";
};

const getDurationSeconds = (song) => {
  const value =
    song?.duration ??
    song?.duration_seconds ??
    song?.durationInSeconds ??
    0;

  const seconds = Number(value);

  if (!Number.isFinite(seconds) || seconds < 0) {
    return 0;
  }

  return Math.floor(seconds);
};

const formatDuration = (value) => {
  const seconds = getDurationSeconds({
    duration: value,
  });

  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;

  return `${minutes}:${String(remaining).padStart(2, "0")}`;
};

const getSongId = (song) => {
  return (
    song?.id ??
    song?.songId ??
    song?.song_id ??
    song?.trackId ??
    null
  );
};

const getAudioUrl = (song) => {
  return (
    song?.downloadUrl ||
    song?.audioUrl ||
    song?.audio ||
    song?.url ||
    song?.media_url ||
    song?.mediaUrl ||
    ""
  );
};

// ============================================================
// SONG CARD
// ============================================================

const FavouriteSong = ({
  song,
  index,
  onRemove,
  onPlay,
}) => {
  const image = getImageUrl(
    song?.image ||
      song?.images ||
      song?.album?.image
  );

  const title =
    song?.name ||
    song?.title ||
    "Unknown Song";

  const artists = getArtistNames(
    song?.artists ||
      song?.artist
  );

  const duration = getDurationSeconds(song);

  return (
    <div
      className="
        group
        w-full
        flex
        items-center
        gap-3
        px-2
        py-2
        rounded-xl
        hover:bg-black/5
        dark:hover:bg-white/5
        transition
      "
    >
      {/* Number */}
      <div className="w-7 shrink-0 text-center text-xs opacity-50">
        {index + 1}
      </div>

      {/* Image */}
      <button
        type="button"
        onClick={() => onPlay(song)}
        className="
          relative
          w-12
          h-12
          shrink-0
          overflow-hidden
          rounded-lg
          cursor-pointer
        "
        aria-label={`Play ${title}`}
      >
        <img
          src={image}
          alt={title}
          className="
            w-full
            h-full
            object-cover
            transition
            group-hover:scale-105
          "
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = "/Unknown.png";
          }}
        />

        <div
          className="
            absolute
            inset-0
            flex
            items-center
            justify-center
            bg-black/40
            opacity-0
            group-hover:opacity-100
            transition
          "
        >
          <span className="text-white text-sm">
            ▶
          </span>
        </div>
      </button>

      {/* Song info */}
      <button
        type="button"
        onClick={() => onPlay(song)}
        className="
          min-w-0
          flex-1
          text-left
          cursor-pointer
        "
      >
        <div
          className="
            font-semibold
            text-sm
            truncate
          "
        >
          {title}
        </div>

        <div
          className="
            text-xs
            opacity-60
            truncate
            mt-0.5
          "
        >
          {artists || "Unknown Artist"}
        </div>
      </button>

      {/* Duration */}
      <div
        className="
          hidden
          sm:block
          text-xs
          opacity-50
          shrink-0
        "
      >
        {formatDuration(duration)}
      </div>

      {/* Remove */}
      <button
        type="button"
        onClick={() => onRemove(getSongId(song))}
        className="
          w-8
          h-8
          shrink-0
          rounded-full
          flex
          items-center
          justify-center
          text-red-500
          hover:bg-red-500/10
          transition
        "
        aria-label={`Remove ${title} from favourites`}
      >
        ×
      </button>
    </div>
  );
};

// ============================================================
// ALBUM CARD
// ============================================================

const FavouriteAlbum = ({
  album,
  onRemove,
}) => {
  const image = getImageUrl(album?.image);

  const name =
    album?.name ||
    album?.title ||
    "Unknown Album";

  const artists = getArtistNames(
    album?.artists
  );

  const isSpotify =
    album?.source === "spotify" &&
    Boolean(album?.spotifyUrl);

  const content = (
    <>
      <div className="relative w-full aspect-square overflow-hidden rounded-xl">
        <img
          src={image}
          alt={name}
          className="
            w-full
            h-full
            object-cover
            transition
            duration-300
            hover:scale-105
          "
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = "/Unknown.png";
          }}
        />

        {isSpotify && (
          <div
            className="
              absolute
              top-2
              right-2
              px-2
              py-1
              rounded-full
              bg-[#1DB954]
              text-black
              text-[10px]
              font-bold
            "
          >
            Spotify
          </div>
        )}
      </div>

      <div className="pt-2 px-1">
        <div className="font-semibold text-sm truncate">
          {name}
        </div>

        <div className="text-xs opacity-60 truncate mt-1">
          {artists || "Album"}
        </div>
      </div>
    </>
  );

  if (isSpotify) {
    return (
      <div className="relative group">
        <a
          href={album.spotifyUrl}
          target="_blank"
          rel="noreferrer"
          className="block"
        >
          {content}
        </a>

        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            onRemove(album?.id);
          }}
          className="
            absolute
            top-2
            left-2
            w-7
            h-7
            rounded-full
            bg-black/70
            text-white
            opacity-0
            group-hover:opacity-100
            transition
          "
          aria-label={`Remove ${name}`}
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div className="relative group">
      <Link
        to={`/albums/${album?.id}`}
        className="block"
      >
        {content}
      </Link>

      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          onRemove(album?.id);
        }}
        className="
          absolute
          top-2
          left-2
          w-7
          h-7
          rounded-full
          bg-black/70
          text-white
          opacity-0
          group-hover:opacity-100
          transition
        "
        aria-label={`Remove ${name}`}
      >
        ×
      </button>
    </div>
  );
};

// ============================================================
// PLAYLIST CARD
// ============================================================

const FavouritePlaylist = ({
  playlist,
  onRemove,
}) => {
  const image = getImageUrl(
    playlist?.image
  );

  const name =
    playlist?.name ||
    playlist?.title ||
    "Unknown Playlist";

  const isSpotify =
    playlist?.source === "spotify" &&
    Boolean(playlist?.spotifyUrl);

  const content = (
    <>
      <div className="relative w-full aspect-square overflow-hidden rounded-xl">
        <img
          src={image}
          alt={name}
          className="
            w-full
            h-full
            object-cover
            transition
            duration-300
            hover:scale-105
          "
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = "/Unknown.png";
          }}
        />

        {isSpotify && (
          <div
            className="
              absolute
              top-2
              right-2
              px-2
              py-1
              rounded-full
              bg-[#1DB954]
              text-black
              text-[10px]
              font-bold
            "
          >
            Spotify
          </div>
        )}
      </div>

      <div className="pt-2 px-1">
        <div className="font-semibold text-sm truncate">
          {name}
        </div>

        <div className="text-xs opacity-60 mt-1">
          Playlist
        </div>
      </div>
    </>
  );

  if (isSpotify) {
    return (
      <div className="relative group">
        <a
          href={playlist.spotifyUrl}
          target="_blank"
          rel="noreferrer"
          className="block"
        >
          {content}
        </a>

        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            onRemove(playlist?.id);
          }}
          className="
            absolute
            top-2
            left-2
            w-7
            h-7
            rounded-full
            bg-black/70
            text-white
            opacity-0
            group-hover:opacity-100
            transition
          "
          aria-label={`Remove ${name}`}
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div className="relative group">
      <Link
        to={`/playlists/${playlist?.id}`}
        className="block"
      >
        {content}
      </Link>

      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          onRemove(playlist?.id);
        }}
        className="
          absolute
          top-2
          left-2
          w-7
          h-7
          rounded-full
          bg-black/70
          text-white
          opacity-0
          group-hover:opacity-100
          transition
        "
        aria-label={`Remove ${name}`}
      >
        ×
      </button>
    </div>
  );
};

// ============================================================
// MAIN FAVOURITE PAGE
// ============================================================

const Favourite = () => {
  const { playMusic } = useContext(MusicContext);

  const [likedSongs, setLikedSongs] = useState([]);
  const [likedAlbums, setLikedAlbums] = useState([]);
  const [likedPlaylists, setLikedPlaylists] =
    useState([]);

  // ==========================================================
  // LOAD FAVOURITES
  // ==========================================================

  const loadFavourites = useCallback(() => {
    try {
      const songsRaw =
        localStorage.getItem("likedSongs");

      const albumsRaw =
        localStorage.getItem("likedAlbums");

      const playlistsRaw =
        localStorage.getItem(
          "likedPlaylists"
        );

      const songs = songsRaw
        ? JSON.parse(songsRaw)
        : [];

      const albums = albumsRaw
        ? JSON.parse(albumsRaw)
        : [];

      const playlists = playlistsRaw
        ? JSON.parse(playlistsRaw)
        : [];

      setLikedSongs(
        Array.isArray(songs)
          ? songs
          : []
      );

      setLikedAlbums(
        Array.isArray(albums)
          ? albums
          : []
      );

      setLikedPlaylists(
        Array.isArray(playlists)
          ? playlists
          : []
      );
    } catch (error) {
      console.error(
        "Failed to load favourites:",
        error
      );

      setLikedSongs([]);
      setLikedAlbums([]);
      setLikedPlaylists([]);
    }
  }, []);

  // ==========================================================
  // INITIAL LOAD + EVENTS
  // ==========================================================

  useEffect(() => {
    loadFavourites();

    const handleFavouriteUpdate = () => {
      loadFavourites();
    };

    window.addEventListener(
      "storage",
      handleFavouriteUpdate
    );

    window.addEventListener(
      "favouritesUpdated",
      handleFavouriteUpdate
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleFavouriteUpdate
      );

      window.removeEventListener(
        "favouritesUpdated",
        handleFavouriteUpdate
      );
    };
  }, [loadFavourites]);

  // ==========================================================
  // REFRESH EVENT
  // ==========================================================

  const notifyFavouriteUpdate = () => {
    window.dispatchEvent(
      new Event("favouritesUpdated")
    );
  };

  // ==========================================================
  // PLAY SONG
  // ==========================================================

  const handlePlaySong = (song) => {
    if (!song) {
      return;
    }

    const audioUrl = getAudioUrl(song);

    const playableSong = {
      ...song,
      audio:
        song?.audio ||
        song?.audioUrl ||
        song?.downloadUrl ||
        audioUrl,
      audioUrl:
        song?.audioUrl ||
        song?.audio ||
        song?.downloadUrl ||
        audioUrl,
    };

    const queue =
      likedSongs.length > 0
        ? likedSongs
        : [playableSong];

    try {
      playMusic(
        playableSong,
        queue
      );
    } catch (error) {
      console.error(
        "Failed to play favourite song:",
        error
      );
    }
  };

  // ==========================================================
  // REMOVE SONG
  // ==========================================================

  const removeSong = (songId) => {
    if (songId == null) {
      return;
    }

    const updated =
      likedSongs.filter(
        (song) =>
          String(getSongId(song)) !==
          String(songId)
      );

    try {
      localStorage.setItem(
        "likedSongs",
        JSON.stringify(updated)
      );

      setLikedSongs(updated);

      notifyFavouriteUpdate();
    } catch (error) {
      console.error(
        "Failed to remove favourite song:",
        error
      );
    }
  };

  // ==========================================================
  // REMOVE ALBUM
  // ==========================================================

  const removeAlbum = (albumId) => {
    if (albumId == null) {
      return;
    }

    const updated =
      likedAlbums.filter(
        (album) =>
          String(album?.id) !==
          String(albumId)
      );

    try {
      localStorage.setItem(
        "likedAlbums",
        JSON.stringify(updated)
      );

      setLikedAlbums(updated);

      notifyFavouriteUpdate();
    } catch (error) {
      console.error(
        "Failed to remove favourite album:",
        error
      );
    }
  };

  // ==========================================================
  // REMOVE PLAYLIST
  // ==========================================================

  const removePlaylist = (playlistId) => {
    if (playlistId == null) {
      return;
    }

    const updated =
      likedPlaylists.filter(
        (playlist) =>
          String(playlist?.id) !==
          String(playlistId)
      );

    try {
      localStorage.setItem(
        "likedPlaylists",
        JSON.stringify(updated)
      );

      setLikedPlaylists(updated);

      notifyFavouriteUpdate();
    } catch (error) {
      console.error(
        "Failed to remove favourite playlist:",
        error
      );
    }
  };

  // ==========================================================
  // COUNTS
  // ==========================================================

  const totalCount =
    likedSongs.length +
    likedAlbums.length +
    likedPlaylists.length;

  // ==========================================================
  // EMPTY STATE
  // ==========================================================

  return (
    <>
      <main
        className="
          min-h-screen
          pt-[5.5rem]
          px-4
          pb-32
          w-full
        "
      >
        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="mb-7">
          <h1 className="text-2xl sm:text-3xl font-bold">
            Favourite
          </h1>

          <p className="text-sm opacity-60 mt-1">
            Your favourite songs, albums and playlists
          </p>

          {totalCount > 0 && (
            <div className="text-xs opacity-50 mt-2">
              {totalCount} item
              {totalCount !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        {/* ==================================================
            EMPTY
        ================================================== */}

        {totalCount === 0 && (
          <div
            className="
              min-h-[55vh]
              flex
              flex-col
              items-center
              justify-center
              text-center
              opacity-60
            "
          >
            <div className="text-6xl mb-4">
              ♡
            </div>

            <h2 className="text-lg font-semibold">
              No Favourite Items
            </h2>

            <p className="text-sm mt-2 max-w-sm">
              Add songs, albums or playlists
              to see them here.
            </p>
          </div>
        )}

        {/* ==================================================
            SONGS
        ================================================== */}

        {likedSongs.length > 0 && (
          <section className="mb-10">
            <div
              className="
                flex
                items-center
                justify-between
                mb-3
              "
            >
              <h2 className="text-xl font-bold">
                Songs
              </h2>

              <span className="text-xs opacity-60">
                {likedSongs.length}
              </span>
            </div>

            <div
              className="
                w-full
                rounded-xl
                overflow-hidden
              "
            >
              {likedSongs.map(
                (song, index) => (
                  <FavouriteSong
                    key={
                      getSongId(song) ??
                      `favourite-song-${index}`
                    }
                    song={song}
                    index={index}
                    onRemove={removeSong}
                    onPlay={handlePlaySong}
                  />
                )
              )}
            </div>
          </section>
        )}

        {/* ==================================================
            ALBUMS
        ================================================== */}

        {likedAlbums.length > 0 && (
          <section className="mb-10">
            <div
              className="
                flex
                items-center
                justify-between
                mb-4
              "
            >
              <h2 className="text-xl font-bold">
                Albums
              </h2>

              <span className="text-xs opacity-60">
                {likedAlbums.length}
              </span>
            </div>

            <div
              className="
                grid
                grid-cols-2
                sm:grid-cols-3
                md:grid-cols-4
                lg:grid-cols-5
                xl:grid-cols-6
                gap-4
              "
            >
              {likedAlbums.map(
                (album, index) => (
                  <FavouriteAlbum
                    key={
                      album?.id ??
                      `favourite-album-${index}`
                    }
                    album={album}
                    onRemove={removeAlbum}
                  />
                )
              )}
            </div>
          </section>
        )}

        {/* ==================================================
            PLAYLISTS
        ================================================== */}

        {likedPlaylists.length > 0 && (
          <section className="mb-10">
            <div
              className="
                flex
                items-center
                justify-between
                mb-4
              "
            >
              <h2 className="text-xl font-bold">
                Playlists
              </h2>

              <span className="text-xs opacity-60">
                {likedPlaylists.length}
              </span>
            </div>

            <div
              className="
                grid
                grid-cols-2
                sm:grid-cols-3
                md:grid-cols-4
                lg:grid-cols-5
                xl:grid-cols-6
                gap-4
              "
            >
              {likedPlaylists.map(
                (playlist, index) => (
                  <FavouritePlaylist
                    key={
                      playlist?.id ??
                      `favourite-playlist-${index}`
                    }
                    playlist={playlist}
                    onRemove={removePlaylist}
                  />
                )
              )}
            </div>
          </section>
        )}
      </main>

      <Navigator />
    </>
  );
};

export default Favourite;
