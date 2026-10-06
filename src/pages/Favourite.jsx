import { useEffect, useRef, useState } from "react";

import Navbar from "../components/Navbar";
import Navigator from "../components/Navigator";
import SongsList from "../components/SongsList";

import PlaylistItems from "../components/Items/PlaylistItems";
import AlbumItems from "../components/Items/AlbumItems";

import { FaHeart, FaSpotify } from "react-icons/fa6";

import {
  MdOutlineKeyboardArrowLeft,
  MdOutlineKeyboardArrowRight,
} from "react-icons/md";


// ============================================================
// SAFE HELPERS
// ============================================================

const safeString = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
};


// ============================================================
// SPOTIFY URL
// Supports:
//
// https://open.spotify.com/track/xxxxx
// https://open.spotify.com/album/xxxxx
// https://open.spotify.com/playlist/xxxxx
//
// spotify:track:xxxxx
// spotify:album:xxxxx
// spotify:playlist:xxxxx
//
// spotify://track/xxxxx
// ============================================================

const getSpotifyUrl = (item) => {
  if (!item || typeof item !== "object") {
    return "";
  }

  const possibleUrls = [
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

  let url = possibleUrls.find(
    (value) =>
      typeof value === "string" &&
      value.trim().length > 0
  );

  if (!url) {
    return "";
  }

  url = safeString(url);

  // -----------------------------------------
  // spotify:track:ID
  // spotify:album:ID
  // spotify:playlist:ID
  // -----------------------------------------

  if (url.toLowerCase().startsWith("spotify:")) {
    const parts = url.split(":");

    if (parts.length >= 3) {
      const type = parts[1]?.toLowerCase();
      const id = parts[2];

      if (
        ["track", "album", "playlist"].includes(type) &&
        id
      ) {
        return `https://open.spotify.com/${type}/${id}`;
      }
    }

    return "";
  }


  // -----------------------------------------
  // spotify://track/ID
  // spotify://album/ID
  // spotify://playlist/ID
  // -----------------------------------------

  if (url.toLowerCase().startsWith("spotify://")) {
    const cleanUrl = url.substring(
      "spotify://".length
    );

    const parts = cleanUrl.split("/");

    if (parts.length >= 2) {
      const type = parts[0]?.toLowerCase();
      const id = parts[1];

      if (
        ["track", "album", "playlist"].includes(type) &&
        id
      ) {
        return `https://open.spotify.com/${type}/${id}`;
      }
    }

    return "";
  }


  // -----------------------------------------
  // Normal Spotify HTTPS URL
  // -----------------------------------------

  if (
    /^https?:\/\/open\.spotify\.com\/(track|album|playlist)\//i.test(
      url
    )
  ) {
    return url;
  }


  return "";
};


// ============================================================
// SPOTIFY TYPE
// ============================================================

const getSpotifyType = (item) => {
  const url = getSpotifyUrl(item);

  if (url) {
    const match = url.match(
      /open\.spotify\.com\/(track|album|playlist)(?:\/|$)/i
    );

    if (match) {
      return match[1].toLowerCase();
    }
  }

  const type = safeString(
    item?.spotifyType ||
      item?.spotify_type ||
      item?.type
  ).toLowerCase();

  if (type === "song") {
    return "track";
  }

  if (type === "track") {
    return "track";
  }

  if (type === "album") {
    return "album";
  }

  if (type === "playlist") {
    return "playlist";
  }

  return "";
};


// ============================================================
// UNIQUE KEY
// ============================================================

const getItemKey = (item, index) => {
  return (
    item?.id ||
    item?.spotifyId ||
    item?.spotify_id ||
    getSpotifyUrl(item) ||
    `favourite-${index}`
  );
};


// ============================================================
// IMAGE
// ============================================================

const getImage = (item) => {
  if (!item) {
    return "/Unknown.png";
  }

  let image =
    item.image ||
    item.images?.[0]?.url ||
    item.images?.[0] ||
    item.album?.image ||
    item.album?.images?.[0]?.url ||
    item.album?.images?.[0] ||
    "/Unknown.png";

  if (Array.isArray(image)) {
    image = image[0];
  }

  return (
    safeString(image) ||
    "/Unknown.png"
  );
};


// ============================================================
// ARTISTS
// ============================================================

const getArtistText = (artists) => {
  if (!artists) {
    return "Unknown Artist";
  }

  if (typeof artists === "string") {
    return artists;
  }

  if (Array.isArray(artists)) {
    return artists
      .map((artist) => {
        if (typeof artist === "string") {
          return artist;
        }

        return (
          artist?.name ||
          artist?.title ||
          ""
        );
      })
      .filter(Boolean)
      .join(", ");
  }

  if (artists?.primary) {
    return getArtistText(artists.primary);
  }

  if (artists?.name) {
    return artists.name;
  }

  return "Unknown Artist";
};


// ============================================================
// SAME-TAB SPOTIFY REDIRECT
// ============================================================

const redirectToSpotify = (item) => {
  const spotifyUrl = getSpotifyUrl(item);

  if (!spotifyUrl) {
    console.warn(
      "Spotify URL not found:",
      item
    );

    return;
  }

  // IMPORTANT:
  // Same browser tab.
  // This prevents your local /playlists route.
  window.location.assign(spotifyUrl);
};


// ============================================================
// SPOTIFY TRACK CARD
// ============================================================

const SpotifyTrackCard = ({
  track,
  index,
}) => {
  const spotifyUrl = getSpotifyUrl(track);

  const name =
    track?.name ||
    track?.title ||
    "Spotify Track";

  const artists =
    track?.artists ||
    track?.artist ||
    track?.artists?.primary;

  return (
    <div
      className="
        flex
        items-center
        gap-3
        w-full
        min-w-0
        p-3
        rounded-xl
        border
        bg-[var(--card-bg)]
        border-[var(--card-border)]
        hover:bg-[var(--secondary-bg)]
        transition-colors
      "
    >
      <img
        src={getImage(track)}
        alt={name}
        className="
          w-14
          h-14
          rounded-lg
          object-cover
          flex-shrink-0
        "
        onError={(event) => {
          event.currentTarget.src =
            "/Unknown.png";
        }}
      />

      <div className="flex-1 min-w-0">
        <h3
          className="
            font-semibold
            truncate
            text-[var(--text-primary)]
          "
        >
          {name}
        </h3>

        <p
          className="
            text-sm
            truncate
            text-[var(--text-secondary)]
          "
        >
          {getArtistText(artists)}
        </p>
      </div>

      {spotifyUrl && (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();

            redirectToSpotify(track);
          }}
          className="
            flex
            items-center
            justify-center
            gap-2
            px-3
            py-2
            rounded-full
            bg-[#1DB954]
            text-white
            flex-shrink-0
            hover:scale-105
            transition-transform
          "
          title="Open Spotify Track"
        >
          <FaSpotify />

          <span className="hidden sm:inline">
            Spotify
          </span>
        </button>
      )}
    </div>
  );
};


// ============================================================
// SPOTIFY ALBUM CARD
// ============================================================

const SpotifyAlbumCard = ({
  album,
  index,
}) => {
  const spotifyUrl = getSpotifyUrl(album);

  return (
    <div
      key={getItemKey(album, index)}
      className="
        relative
        flex-shrink-0
      "
    >
      <AlbumItems {...album} />

      {spotifyUrl && (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();

            redirectToSpotify(album);
          }}
          className="
            absolute
            right-2
            bottom-2
            z-[100]
            flex
            items-center
            justify-center
            w-10
            h-10
            rounded-full
            bg-[#1DB954]
            text-white
            shadow-lg
            hover:scale-110
            transition-transform
          "
          title="Open Spotify Album"
        >
          <FaSpotify />
        </button>
      )}
    </div>
  );
};


// ============================================================
// SPOTIFY PLAYLIST CARD
// ============================================================

const SpotifyPlaylistCard = ({
  playlist,
  index,
}) => {
  const spotifyUrl =
    getSpotifyUrl(playlist);

  return (
    <div
      key={getItemKey(
        playlist,
        index
      )}
      className="
        relative
        flex-shrink-0
      "
    >
      <PlaylistItems
        {...playlist}
      />

      {spotifyUrl && (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();

            redirectToSpotify(
              playlist
            );
          }}
          className="
            absolute
            right-2
            bottom-2
            z-[100]
            flex
            items-center
            justify-center
            w-10
            h-10
            rounded-full
            bg-[#1DB954]
            text-white
            shadow-lg
            hover:scale-110
            transition-transform
          "
          title="Open Spotify Playlist"
        >
          <FaSpotify />
        </button>
      )}
    </div>
  );
};


// ============================================================
// FAVOURITE PAGE
// ============================================================

const Favourite = () => {
  const [likedSongs, setLikedSongs] = useState([]);
  const [likedAlbums, setLikedAlbums] = useState([]);
  const [likedPlaylists, setLikedPlaylists] =
    useState([]);

  const [spotifyTracks, setSpotifyTracks] =
    useState([]);

  const [spotifyAlbums, setSpotifyAlbums] =
    useState([]);

  const [spotifyPlaylists, setSpotifyPlaylists] =
    useState([]);

  const [list, setList] = useState([]);


  // ==========================================================
  // REFS
  // ==========================================================

  const albumsScrollRef =
    useRef(null);

  const playlistsScrollRef =
    useRef(null);

  const spotifyAlbumsScrollRef =
    useRef(null);

  const spotifyPlaylistsScrollRef =
    useRef(null);


  // ==========================================================
  // LOAD FAVOURITES
  // ==========================================================

  const loadFavourites = () => {
    try {
      const songs = JSON.parse(
        localStorage.getItem(
          "likedSongs"
        ) || "[]"
      );

      const albums = JSON.parse(
        localStorage.getItem(
          "likedAlbums"
        ) || "[]"
      );

      const playlists = JSON.parse(
        localStorage.getItem(
          "likedPlaylists"
        ) || "[]"
      );


      const safeSongs =
        Array.isArray(songs)
          ? songs
          : [];

      const safeAlbums =
        Array.isArray(albums)
          ? albums
          : [];

      const safePlaylists =
        Array.isArray(playlists)
          ? playlists
          : [];


      setLikedSongs(safeSongs);
      setLikedAlbums(safeAlbums);
      setLikedPlaylists(
        safePlaylists
      );

      setList(safeSongs);


      // ======================================================
      // SPOTIFY TRACKS
      // ======================================================

      const tracks = safeSongs.filter(
        (item) => {
          return (
            getSpotifyUrl(item) &&
            getSpotifyType(item) ===
              "track"
          );
        }
      );


      // ======================================================
      // SPOTIFY ALBUMS
      // ======================================================

      const albumsWithSpotify =
        safeAlbums.filter(
          (item) => {
            return (
              getSpotifyUrl(item) &&
              getSpotifyType(item) ===
                "album"
            );
          }
        );


      // ======================================================
      // SPOTIFY PLAYLISTS
      // ======================================================

      const playlistsWithSpotify =
        safePlaylists.filter(
          (item) => {
            return (
              getSpotifyUrl(item) &&
              getSpotifyType(item) ===
                "playlist"
            );
          }
        );


      // ======================================================
      // REMOVE DUPLICATES
      // ======================================================

      const uniqueTracks =
        Array.from(
          new Map(
            tracks.map(
              (item, index) => [
                getItemKey(
                  item,
                  index
                ),
                item,
              ]
            )
          ).values()
        );


      const uniqueAlbums =
        Array.from(
          new Map(
            albumsWithSpotify.map(
              (item, index) => [
                getItemKey(
                  item,
                  index
                ),
                item,
              ]
            )
          ).values()
        );


      const uniquePlaylists =
        Array.from(
          new Map(
            playlistsWithSpotify.map(
              (item, index) => [
                getItemKey(
                  item,
                  index
                ),
                item,
              ]
            )
          ).values()
        );


      setSpotifyTracks(
        uniqueTracks
      );

      setSpotifyAlbums(
        uniqueAlbums
      );

      setSpotifyPlaylists(
        uniquePlaylists
      );

    } catch (error) {
      console.error(
        "Failed to load favourites:",
        error
      );

      setLikedSongs([]);
      setLikedAlbums([]);
      setLikedPlaylists([]);

      setSpotifyTracks([]);
      setSpotifyAlbums([]);
      setSpotifyPlaylists([]);

      setList([]);
    }
  };


  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    loadFavourites();

    const handleStorage = () => {
      loadFavourites();
    };

    const handleFavouriteUpdate = () => {
      loadFavourites();
    };

    window.addEventListener(
      "storage",
      handleStorage
    );

    window.addEventListener(
      "favouritesUpdated",
      handleFavouriteUpdate
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorage
      );

      window.removeEventListener(
        "favouritesUpdated",
        handleFavouriteUpdate
      );
    };
  }, []);


  // ==========================================================
  // SCROLL
  // ==========================================================

  const scrollLeft = (ref) => {
    if (!ref.current) return;

    ref.current.scrollBy({
      left: -700,
      behavior: "smooth",
    });
  };


  const scrollRight = (ref) => {
    if (!ref.current) return;

    ref.current.scrollBy({
      left: 700,
      behavior: "smooth",
    });
  };


  // ==========================================================
  // CHECK EMPTY
  // ==========================================================

  const hasFavourites =
    likedSongs.length > 0 ||
    likedAlbums.length > 0 ||
    likedPlaylists.length > 0 ||
    spotifyTracks.length > 0 ||
    spotifyAlbums.length > 0 ||
    spotifyPlaylists.length > 0;


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <>
      <Navbar />

      <main
        className="
          min-h-screen
          flex
          flex-col
          gap-8
          pt-[7rem]
          pb-[12rem]
          bg-[var(--background)]
          text-[var(--text-primary)]
        "
      >

        {/* ====================================================
            HEADER
        ==================================================== */}

        <div
          className="
            flex
            items-center
            gap-5
            ml-5
            lg:ml-12
          "
        >
          <div
            className="
              flex
              items-center
              justify-center
              w-32
              h-32
              lg:w-48
              lg:h-48
              rounded-xl
              bg-[var(--card-bg)]
              border
              border-[var(--card-border)]
            "
          >
            <FaHeart
              className="
                text-5xl
                lg:text-7xl
                text-[#1DB954]
              "
            />
          </div>

          <h1
            className="
              text-3xl
              lg:text-4xl
              font-bold
              text-[var(--text-primary)]
            "
          >
            My Favourite
          </h1>
        </div>


        {/* ====================================================
            LIKED SONGS
        ==================================================== */}

        {likedSongs.length > 0 && (
          <section>
            <h2
              className="
                px-5
                py-3
                text-2xl
                font-semibold
                text-[var(--text-primary)]
              "
            >
              Liked Songs
            </h2>

            <div className="flex flex-wrap">
              {likedSongs
                .filter(
                  (song) =>
                    getSpotifyType(song) !==
                    "track"
                )
                .map(
                  (song, index) =>
                    song && (
                      <SongsList
                        key={getItemKey(
                          song,
                          index
                        )}
                        id={song.id}
                        image={song.image}
                        artists={
                          song.artists
                        }
                        name={song.name}
                        duration={
                          song.duration
                        }
                        downloadUrl={
                          song.audio ||
                          song.downloadUrl
                        }
                        song={list}
                      />
                    )
                )}
            </div>
          </section>
        )}


        {/* ====================================================
            SPOTIFY TRACKS
        ==================================================== */}

        {spotifyTracks.length > 0 && (
          <section className="px-4 lg:px-8">
            <div
              className="
                flex
                items-center
                justify-between
                mb-3
              "
            >
              <h2
                className="
                  text-2xl
                  font-semibold
                  text-[var(--text-primary)]
                "
              >
                Spotify Tracks
              </h2>

              <FaSpotify
                className="
                  text-2xl
                  text-[#1DB954]
                "
              />
            </div>

            <div
              className="
                grid
                grid-cols-1
                md:grid-cols-2
                xl:grid-cols-3
                gap-3
              "
            >
              {spotifyTracks.map(
                (track, index) => (
                  <SpotifyTrackCard
                    key={getItemKey(
                      track,
                      index
                    )}
                    track={track}
                    index={index}
                  />
                )
              )}
            </div>
          </section>
        )}


        {/* ====================================================
            LIKED ALBUMS
        ==================================================== */}

        {likedAlbums.length > 0 && (
          <section>
            <h2
              className="
                px-5
                py-3
                text-2xl
                font-semibold
                text-[var(--text-primary)]
              "
            >
              Liked Albums
            </h2>

            <div
              className="
                relative
                flex
                items-center
                mx-1
                lg:mx-8
              "
            >
              <button
                type="button"
                onClick={() =>
                  scrollLeft(
                    albumsScrollRef
                  )
                }
                className="
                  absolute
                  left-0
                  z-20
                  hidden
                  lg:flex
                  items-center
                  justify-center
                  w-10
                  h-36
                  text-3xl
                  cursor-pointer
                  text-[var(--text-primary)]
                "
                aria-label="Previous albums"
              >
                <MdOutlineKeyboardArrowLeft />
              </button>

              <div
                ref={albumsScrollRef}
                className="
                  flex
                  gap-3
                  overflow-x-auto
                  scroll-hide
                  scroll-smooth
                  w-full
                  px-3
                "
              >
                {likedAlbums
                  .filter(
                    (album) =>
                      getSpotifyType(
                        album
                      ) !== "album"
                  )
                  .map(
                    (album, index) => (
                      <div
                        key={getItemKey(
                          album,
                          index
                        )}
                        className="flex-shrink-0"
                      >
                        <AlbumItems
                          {...album}
                        />
                      </div>
                    )
                  )}
              </div>

              <button
                type="button"
                onClick={() =>
                  scrollRight(
                    albumsScrollRef
                  )
                }
                className="
                  absolute
                  right-0
                  z-20
                  hidden
                  lg:flex
                  items-center
                  justify-center
                  w-10
                  h-36
                  text-3xl
                  cursor-pointer
                  text-[var(--text-primary)]
                "
                aria-label="Next albums"
              >
                <MdOutlineKeyboardArrowRight />
              </button>
            </div>
          </section>
        )}


        {/* ====================================================
            SPOTIFY ALBUMS
        ==================================================== */}

        {spotifyAlbums.length > 0 && (
          <section>
            <div
              className="
                flex
                items-center
                justify-between
                px-5
                py-3
              "
            >
              <h2
                className="
                  text-2xl
                  font-semibold
                  text-[var(--text-primary)]
                "
              >
                Spotify Albums
              </h2>

              <FaSpotify
                className="
                  text-2xl
                  text-[#1DB954]
                "
              />
            </div>

            <div
              className="
                relative
                flex
                items-center
                mx-1
                lg:mx-8
              "
            >
              <button
                type="button"
                onClick={() =>
                  scrollLeft(
                    spotifyAlbumsScrollRef
                  )
                }
                className="
                  absolute
                  left-0
                  z-20
                  hidden
                  lg:flex
                  items-center
                  justify-center
                  w-10
                  h-36
                  text-3xl
                  cursor-pointer
                  text-[var(--text-primary)]
                "
                aria-label="Previous Spotify albums"
              >
                <MdOutlineKeyboardArrowLeft />
              </button>

              <div
                ref={
                  spotifyAlbumsScrollRef
                }
                className="
                  flex
                  gap-3
                  overflow-x-auto
                  scroll-hide
                  scroll-smooth
                  w-full
                  px-3
                "
              >
                {spotifyAlbums.map(
                  (album, index) => (
                    <SpotifyAlbumCard
                      key={getItemKey(
                        album,
                        index
                      )}
                      album={album}
                      index={index}
                    />
                  )
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  scrollRight(
                    spotifyAlbumsScrollRef
                  )
                }
                className="
                  absolute
                  right-0
                  z-20
                  hidden
                  lg:flex
                  items-center
                  justify-center
                  w-10
                  h-36
                  text-3xl
                  cursor-pointer
                  text-[var(--text-primary)]
                "
                aria-label="Next Spotify albums"
              >
                <MdOutlineKeyboardArrowRight />
              </button>
            </div>
          </section>
        )}


        {/* ====================================================
            LIKED PLAYLISTS
        ==================================================== */}

        {likedPlaylists.length > 0 && (
          <section>
            <h2
              className="
                px-5
                py-3
                text-2xl
                font-semibold
                text-[var(--text-primary)]
              "
            >
              Liked Playlists
            </h2>

            <div
              className="
                relative
                flex
                items-center
                mx-1
                lg:mx-8
              "
            >
              <button
                type="button"
                onClick={() =>
                  scrollLeft(
                    playlistsScrollRef
                  )
                }
                className="
                  absolute
                  left-0
                  z-20
                  hidden
                  lg:flex
                  items-center
                  justify-center
                  w-10
                  h-36
                  text-3xl
                  cursor-pointer
                  text-[var(--text-primary)]
                "
                aria-label="Previous playlists"
              >
                <MdOutlineKeyboardArrowLeft />
              </button>

              <div
                ref={
                  playlistsScrollRef
                }
                className="
                  flex
                  gap-3
                  overflow-x-auto
                  scroll-hide
                  scroll-smooth
                  w-full
                  px-3
                "
              >
                {likedPlaylists
                  .filter(
                    (playlist) =>
                      getSpotifyType(
                        playlist
                      ) !==
                      "playlist"
                  )
                  .map(
                    (
                      playlist,
                      index
                    ) => (
                      <div
                        key={getItemKey(
                          playlist,
                          index
                        )}
                        className="flex-shrink-0"
                      >
                        <PlaylistItems
                          {...playlist}
                        />
                      </div>
                    )
                  )}
              </div>

              <button
                type="button"
                onClick={() =>
                  scrollRight(
                    playlistsScrollRef
                  )
                }
                className="
                  absolute
                  right-0
                  z-20
                  hidden
                  lg:flex
                  items-center
                  justify-center
                  w-10
                  h-36
                  text-3xl
                  cursor-pointer
                  text-[var(--text-primary)]
                "
                aria-label="Next playlists"
              >
                <MdOutlineKeyboardArrowRight />
              </button>
            </div>
          </section>
        )}


        {/* ====================================================
            SPOTIFY PLAYLISTS
        ==================================================== */}

        {spotifyPlaylists.length > 0 && (
          <section>
            <div
              className="
                flex
                items-center
                justify-between
                px-5
                py-3
              "
            >
              <h2
                className="
                  text-2xl
                  font-semibold
                  text-[var(--text-primary)]
                "
              >
                Spotify Playlists
              </h2>

              <FaSpotify
                className="
                  text-2xl
                  text-[#1DB954]
                "
              />
            </div>

            <div
              className="
                relative
                flex
                items-center
                mx-1
                lg:mx-8
              "
            >
              <button
                type="button"
                onClick={() =>
                  scrollLeft(
                    spotifyPlaylistsScrollRef
                  )
                }
                className="
                  absolute
                  left-0
                  z-20
                  hidden
                  lg:flex
                  items-center
                  justify-center
                  w-10
                  h-36
                  text-3xl
                  cursor-pointer
                  text-[var(--text-primary)]
                "
                aria-label="Previous Spotify playlists"
              >
                <MdOutlineKeyboardArrowLeft />
              </button>

              <div
                ref={
                  spotifyPlaylistsScrollRef
                }
                className="
                  flex
                  gap-3
                  overflow-x-auto
                  scroll-hide
                  scroll-smooth
                  w-full
                  px-3
                "
              >
                {spotifyPlaylists.map(
                  (
                    playlist,
                    index
                  ) => (
                    <SpotifyPlaylistCard
                      key={getItemKey(
                        playlist,
                        index
                      )}
                      playlist={playlist}
                      index={index}
                    />
                  )
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  scrollRight(
                    spotifyPlaylistsScrollRef
                  )
                }
                className="
                  absolute
                  right-0
                  z-20
                  hidden
                  lg:flex
                  items-center
                  justify-center
                  w-10
                  h-36
                  text-3xl
                  cursor-pointer
                  text-[var(--text-primary)]
                "
                aria-label="Next Spotify playlists"
              >
                <MdOutlineKeyboardArrowRight />
              </button>
            </div>
          </section>
        )}


        {/* ====================================================
            EMPTY
        ==================================================== */}

        {!hasFavourites && (
          <div
            className="
              mx-5
              px-6
              py-10
              rounded-xl
              border
              border-[var(--card-border)]
              bg-[var(--card-bg)]
              text-center
              text-lg
              text-[var(--text-secondary)]
            "
          >
            No Liked Songs, Albums, or Playlists.
          </div>
        )}

      </main>

      <Navigator />
    </>
  );
};

export default Favourite;
