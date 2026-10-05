import { useEffect, useState } from "react";
import SongsList from "../components/Items/SongsList";
import AlbumItems from "../components/Items/AlbumItems";
import PlaylistItems from "../components/Items/PlaylistItems";
import Navigator from "../components/Navigator";

const Favourite = () => {
  const [likedSongs, setLikedSongs] = useState([]);
  const [likedAlbums, setLikedAlbums] = useState([]);
  const [likedPlaylists, setLikedPlaylists] = useState([]);

  /* ==========================================
     LOAD FAVOURITES
  ========================================== */

  const loadFavourites = () => {
    try {
      const songs = JSON.parse(
        localStorage.getItem("likedSongs") || "[]"
      );

      const albums = JSON.parse(
        localStorage.getItem("likedAlbums") || "[]"
      );

      const playlists = JSON.parse(
        localStorage.getItem("likedPlaylists") || "[]"
      );

      setLikedSongs(
        Array.isArray(songs) ? songs : []
      );

      setLikedAlbums(
        Array.isArray(albums) ? albums : []
      );

      setLikedPlaylists(
        Array.isArray(playlists) ? playlists : []
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
  };

  useEffect(() => {
    loadFavourites();

    const handleStorage = () => {
      loadFavourites();
    };

    window.addEventListener(
      "storage",
      handleStorage
    );

    /*
      Custom event is useful when SpotifyImport
      changes localStorage in the same browser tab.
    */
    window.addEventListener(
      "favouritesUpdated",
      handleStorage
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorage
      );

      window.removeEventListener(
        "favouritesUpdated",
        handleStorage
      );
    };
  }, []);

  /* ==========================================
     REMOVE SONG
  ========================================== */

  const removeSong = (songId) => {
    try {
      const updated =
        likedSongs.filter(
          (song) =>
            String(song?.id) !==
            String(songId)
        );

      localStorage.setItem(
        "likedSongs",
        JSON.stringify(updated)
      );

      setLikedSongs(updated);

      window.dispatchEvent(
        new Event("favouritesUpdated")
      );
    } catch (error) {
      console.error(
        "Failed to remove favourite song:",
        error
      );
    }
  };

  /* ==========================================
     REMOVE ALBUM
  ========================================== */

  const removeAlbum = (albumId) => {
    try {
      const updated =
        likedAlbums.filter(
          (album) =>
            String(album?.id) !==
            String(albumId)
        );

      localStorage.setItem(
        "likedAlbums",
        JSON.stringify(updated)
      );

      setLikedAlbums(updated);

      window.dispatchEvent(
        new Event("favouritesUpdated")
      );
    } catch (error) {
      console.error(
        "Failed to remove favourite album:",
        error
      );
    }
  };

  /* ==========================================
     REMOVE PLAYLIST
  ========================================== */

  const removePlaylist = (playlistId) => {
    try {
      const updated =
        likedPlaylists.filter(
          (playlist) =>
            String(playlist?.id) !==
            String(playlistId)
        );

      localStorage.setItem(
        "likedPlaylists",
        JSON.stringify(updated)
      );

      setLikedPlaylists(updated);

      window.dispatchEvent(
        new Event("favouritesUpdated")
      );
    } catch (error) {
      console.error(
        "Failed to remove favourite playlist:",
        error
      );
    }
  };

  /* ==========================================
     EMPTY STATE
  ========================================== */

  const hasFavourites =
    likedSongs.length > 0 ||
    likedAlbums.length > 0 ||
    likedPlaylists.length > 0;

  return (
    <>
      <main
        className="
          min-h-screen
          pt-[5.5rem]
          px-4
          pb-28
        "
      >
        {/* ====================================
            PAGE TITLE
        ==================================== */}

        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            Favourite
          </h1>

          <p className="text-sm opacity-60 mt-1">
            Your favourite songs, albums and
            playlists
          </p>
        </div>

        {/* ====================================
            EMPTY
        ==================================== */}

        {!hasFavourites && (
          <div
            className="
              min-h-[50vh]
              flex
              flex-col
              items-center
              justify-center
              text-center
              opacity-60
            "
          >
            <div className="text-5xl mb-4">
              ♡
            </div>

            <h2 className="text-lg font-semibold">
              No Favourite Items
            </h2>

            <p className="text-sm mt-1">
              Add songs, albums or playlists
              to see them here.
            </p>
          </div>
        )}

        {/* ====================================
            FAVOURITE SONGS
        ==================================== */}

        {likedSongs.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold">
                Songs
              </h2>

              <span className="text-xs opacity-60">
                {likedSongs.length}
              </span>
            </div>

            <div className="w-full">
              {likedSongs.map(
                (song, index) => (
                  <div
                    key={
                      song?.id ??
                      `liked-song-${index}`
                    }
                    className="relative"
                  >
                    <SongsList
                      {...song}
                      song={song}
                    />
                  </div>
                )
              )}
            </div>
          </section>
        )}

        {/* ====================================
            FAVOURITE ALBUMS
        ==================================== */}

        {likedAlbums.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
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
                  <AlbumItems
                    key={
                      album?.id ??
                      `liked-album-${index}`
                    }
                    name={album?.name}
                    artists={
                      album?.artists
                    }
                    id={album?.id}
                    image={album?.image}
                    source={
                      album?.source
                    }
                    spotifyUrl={
                      album?.spotifyUrl
                    }
                  />
                )
              )}
            </div>
          </section>
        )}

        {/* ====================================
            FAVOURITE PLAYLISTS
        ==================================== */}

        {likedPlaylists.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
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
                gap-5
              "
            >
              {likedPlaylists.map(
                (
                  playlist,
                  index
                ) => (
                  <PlaylistItems
                    key={
                      playlist?.id ??
                      `liked-playlist-${index}`
                    }
                    name={
                      playlist?.name
                    }
                    image={
                      playlist?.image
                    }
                    id={
                      playlist?.id
                    }
                    source={
                      playlist?.source
                    }
                    spotifyUrl={
                      playlist?.spotifyUrl
                    }
                  />
                )
              )}
            </div>
          </section>
        )}
      </main>

      {/* ======================================
          FIXED MOBILE NAVIGATION
      ======================================= */}

      <Navigator />
    </>
  );
};

export default Favourite;
