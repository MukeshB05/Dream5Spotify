import { useContext, useMemo, useState } from "react";
import { GoPlay } from "react-icons/go";
import { FaSpotify } from "react-icons/fa";
import he from "he";

import MusicContext from "../context/MusicContext";

/* =========================================================
   HELPERS
========================================================= */

const safeDecode = (value) => {
  if (value === null || value === undefined) return "";

  try {
    return he.decode(String(value));
  } catch {
    return String(value);
  }
};

const resolveImage = (image) => {
  if (typeof image === "string" && image.trim()) {
    return image.trim();
  }

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

  if (image && typeof image === "object") {
    return image.url || image.link || image.src || "/Unknown.png";
  }

  return "/Unknown.png";
};

const getArtistNames = (artists) => {
  if (Array.isArray(artists?.primary)) {
    return artists.primary
      .map((artist) => artist?.name)
      .filter(Boolean)
      .join(", ");
  }

  if (Array.isArray(artists?.all)) {
    return artists.all
      .map((artist) => artist?.name)
      .filter(Boolean)
      .join(", ");
  }

  if (Array.isArray(artists)) {
    return artists
      .map((artist) =>
        typeof artist === "string"
          ? artist
          : artist?.name
      )
      .filter(Boolean)
      .join(", ");
  }

  if (typeof artists === "string") {
    return artists;
  }

  return "";
};

const formatTime = (value) => {
  const seconds = Math.max(
    0,
    Math.floor(Number(value) || 0)
  );

  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;

  return `${minutes}:${String(remaining).padStart(2, "0")}`;
};

const normalizeSpotifyUrl = (value) => {
  const raw = String(value || "").trim();

  if (!raw) return "";

  if (
    raw.startsWith("https://open.spotify.com/") ||
    raw.startsWith("http://open.spotify.com/")
  ) {
    return raw;
  }

  if (raw.startsWith("spotify:")) {
    const parts = raw.split(":");

    if (parts.length >= 3) {
      return `https://open.spotify.com/${parts[1]}/${parts[2]}`;
    }
  }

  if (raw.startsWith("spotify://")) {
    const parts = raw
      .replace("spotify://", "")
      .split("/");

    if (parts.length >= 2) {
      return `https://open.spotify.com/${parts[0]}/${parts[1]}`;
    }
  }

  return "";
};

const getSpotifyUrl = (song, explicitUrl) => {
  const candidates = [
    explicitUrl,

    song?.spotifyUrl,
    song?.spotify_url,
    song?.spotifyLink,
    song?.spotify_link,

    song?.external_urls?.spotify,
    song?.externalUrls?.spotify,

    song?.links?.spotify,
    song?.urls?.spotify,

    song?.spotify?.url,
    song?.spotify?.uri,
    song?.spotify?.spotifyUrl,
    song?.spotify?.spotify_url,

    song?.spotify?.external_urls?.spotify,
    song?.spotify?.externalUrls?.spotify,
  ];

  for (const value of candidates) {
    const normalized = normalizeSpotifyUrl(value);

    if (normalized) {
      return normalized;
    }
  }

  return "";
};

/* =========================================================
   SONGS LIST
========================================================= */

const SongsList = ({
  name,
  title,
  artists,
  duration,
  downloadUrl,
  image,
  id,
  song,
  songs,
  onPlay,
  spotifyUrl: explicitSpotifyUrl,
  className = "",
}) => {
  const musicContext = useContext(MusicContext) || {};
  const {
    playMusic,
    currentSong,
    isPlaying,
  } = musicContext;

  const [hovering, setHovering] = useState(false);

  const item = song || {
    id,
    name: name || title,
    artists,
    duration,
    downloadUrl,
    image,
  };

  const songName = useMemo(
    () =>
      safeDecode(
        item?.name ||
          item?.title ||
          name ||
          title ||
          "Unknown Song"
      ),
    [item?.name, item?.title, name, title]
  );

  const artistText = useMemo(
    () => getArtistNames(item?.artists || artists),
    [item?.artists, artists]
  );

  const imageSrc = useMemo(
    () =>
      resolveImage(
        item?.image ||
          image
      ),
    [item?.image, image]
  );

  const songDuration = useMemo(
    () =>
      formatTime(
        item?.duration ??
          duration
      ),
    [item?.duration, duration]
  );

  const spotifyUrl = useMemo(
    () => getSpotifyUrl(item, explicitSpotifyUrl),
    [item, explicitSpotifyUrl]
  );

  const isCurrent =
    currentSong?.id != null &&
    item?.id != null &&
    String(currentSong.id) === String(item.id);

  const handlePlay = () => {
    const queue =
      Array.isArray(songs) && songs.length
        ? songs
        : undefined;

    if (typeof onPlay === "function") {
      onPlay(item);
      return;
    }

    if (typeof playMusic === "function") {
      playMusic(item, queue);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handlePlay();
    }
  };

  return (
    <div
      className={`
        group relative flex w-full min-w-0 items-center
        gap-3 sm:gap-4
        px-3 py-2.5 sm:px-4
        bg-[var(--card-bg)]
        text-[var(--text-primary)]
        transition-colors
        hover:bg-[var(--secondary-bg)]
        ${isCurrent ? "bg-[var(--secondary-bg)]" : ""}
        ${className}
      `}
    >
      {/* =================================================
          PLAY / COVER
      ================================================= */}
      <div
        className="
          relative h-14 w-14 shrink-0
          overflow-hidden rounded-lg
          bg-[var(--secondary-bg)]
          cursor-pointer
        "
        onClick={handlePlay}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={`Play ${songName}`}
      >
        <img
          src={imageSrc}
          alt={songName}
          className="h-full w-full object-cover"
          loading="lazy"
          draggable="false"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = "/Unknown.png";
          }}
        />

        <div
          className={`
            absolute inset-0 flex items-center justify-center
            bg-black/45
            transition-opacity duration-200
            ${
              hovering || isCurrent
                ? "opacity-100"
                : "opacity-0"
            }
          `}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
        >
          <GoPlay className="text-2xl text-white" />
        </div>
      </div>

      {/* =================================================
          SONG INFO
      ================================================= */}
      <div
        className="
          min-w-0 flex-1 cursor-pointer
        "
        onClick={handlePlay}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
      >
        <div
          className="
            truncate text-sm sm:text-base
            font-semibold
          "
          title={songName}
        >
          {songName}
        </div>

        <div
          className="
            mt-0.5 truncate text-xs sm:text-sm
            text-[var(--text-secondary)]
          "
          title={artistText}
        >
          {artistText || "Unknown Artist"}
        </div>
      </div>

      {/* =================================================
          SPOTIFY — ONLY ONE ICON
      ================================================= */}
      {spotifyUrl && (
        <a
          href={spotifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="
            flex h-10 w-10 shrink-0
            items-center justify-center
            rounded-full
            text-[#1DB954]
            transition
            hover:bg-[#1DB954]/10
            hover:scale-105
            active:scale-95
          "
          title="Open in Spotify"
          aria-label={`Open ${songName} in Spotify`}
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <FaSpotify className="text-2xl" />
        </a>
      )}

      {/* =================================================
          DURATION
      ================================================= */}
      <span
        className="
          min-w-[42px]
          shrink-0
          text-right
          text-xs sm:text-sm
          tabular-nums
          text-[var(--text-secondary)]
        "
        title="Duration"
      >
        {songDuration}
      </span>
    </div>
  );
};

export default SongsList;
