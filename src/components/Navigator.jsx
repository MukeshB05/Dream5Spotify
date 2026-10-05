import { GoHome, GoHomeFill } from "react-icons/go";
import {
  IoHeartOutline,
  IoHeartSharp,
} from "react-icons/io5";
import {
  RiFolderMusicFill,
  RiFolderMusicLine,
} from "react-icons/ri";
import { MdLiveTv } from "react-icons/md";
import { FaSpotify } from "react-icons/fa";

import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

const Navigator = () => {
  const location = useLocation();

  const [showTVModal, setShowTVModal] =
    useState(false);

  const [wakeLockStatus, setWakeLockStatus] =
    useState("Inactive");

  const [wakeLock, setWakeLock] =
    useState(null);

  // ============================================================
  // LIVE TV MODAL
  // ============================================================

  const openTVModal = () => {
    setShowTVModal(true);
    setWakeLockStatus("Active");
  };

  const closeTVModal = () => {
    setShowTVModal(false);

    if (wakeLock) {
      wakeLock.release();
      setWakeLock(null);
      setWakeLockStatus("Inactive");
    }
  };

  // ============================================================
  // SCREEN WAKE LOCK
  // ============================================================

  const requestWakeLock = async () => {
    try {
      if ("wakeLock" in navigator) {
        const lock =
          await navigator.wakeLock.request(
            "screen"
          );

        setWakeLock(lock);
        setWakeLockStatus("Active");

        lock.addEventListener(
          "release",
          () => {
            setWakeLockStatus("Inactive");
            setWakeLock(null);
          }
        );
      } else {
        setWakeLockStatus(
          "Not Supported"
        );
      }
    } catch (error) {
      console.error(
        "Wake Lock request failed:",
        error
      );

      setWakeLockStatus("Failed");
    }
  };

  // ============================================================
  // LIVE TV CLICK
  // ============================================================

  const handleLiveTvClick = () => {
    requestWakeLock();
    openTVModal();
  };

  // ============================================================
  // RESTORE WAKE LOCK AFTER TAB VISIBILITY
  // ============================================================

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState ===
          "visible" &&
        showTVModal &&
        !wakeLock
      ) {
        requestWakeLock();
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [wakeLock, showTVModal]);

  // ============================================================
  // ACTIVE ROUTE
  // ============================================================

  const isHome =
    location.pathname === "/";

  const isPlaylist =
    location.pathname === "/Playlist";

  const isFavourite =
    location.pathname === "/Favourite";

  const isSpotifyImport =
    location.pathname ===
    "/spotify-import";

  // ============================================================
  // UI
  // ============================================================

  return (
    <>
      {/* ======================================================
          MOBILE BOTTOM NAVIGATION
      ======================================================= */}

      <div
        className="
          lg:hidden
          fixed
          bottom-0
          z-20
          w-full
          Navigator
          h-[3.6rem]
          lg:h-[3.5rem]
          flex
          items-center
          justify-around
          bg-white
          border-t
          border-gray-200
        "
      >
        {/* ====================================================
            HOME
        ===================================================== */}

        <Link
          to="/"
          aria-label="Home"
          className="flex-1"
        >
          <div
            className={`
              flex
              flex-col
              items-center
              text-sm
              ${
                isHome
                  ? "text-green-500"
                  : ""
              }
            `}
          >
            {isHome ? (
              <GoHomeFill className="text-2xl" />
            ) : (
              <GoHome className="text-2xl" />
            )}

            <span>Home</span>
          </div>
        </Link>

        {/* ====================================================
            PLAYLIST
        ===================================================== */}

        <Link
          to="/Playlist"
          aria-label="Playlist"
          className="flex-1"
        >
          <div
            className={`
              flex
              flex-col
              items-center
              text-sm
              ${
                isPlaylist
                  ? "text-green-500"
                  : ""
              }
            `}
          >
            {isPlaylist ? (
              <RiFolderMusicFill className="text-2xl" />
            ) : (
              <RiFolderMusicLine className="text-2xl" />
            )}

            <span>Playlist</span>
          </div>
        </Link>

        {/* ====================================================
            FAVOURITE
        ===================================================== */}

        <Link
          to="/Favourite"
          aria-label="Favourite"
          className="flex-1"
        >
          <div
            className={`
              flex
              flex-col
              items-center
              text-sm
              ${
                isFavourite
                  ? "text-green-500"
                  : ""
              }
            `}
          >
            {isFavourite ? (
              <IoHeartSharp className="text-2xl" />
            ) : (
              <IoHeartOutline className="text-2xl" />
            )}

            <span>Favourite</span>
          </div>
        </Link>

        {/* ====================================================
            SPOTIFY IMPORT
            Immediately after Favourite

            Description:
            Import Spotify tracks, albums and
            playlists into your queue.
        ===================================================== */}

        <Link
          to="/spotify-import"
          aria-label="Import Spotify tracks, albums and playlists into your queue"
          title="Import Spotify tracks, albums and playlists into your queue"
          className="flex-1"
        >
          <div
            className={`
              flex
              flex-col
              items-center
              text-sm
              ${
                isSpotifyImport
                  ? "text-green-500"
                  : ""
              }
            `}
          >
            <FaSpotify className="text-2xl" />

            <span>Spotify</span>
          </div>
        </Link>

        {/* ====================================================
            LIVE TV
        ===================================================== */}

        <button
          type="button"
          onClick={handleLiveTvClick}
          className="
            flex-1
            relative
            flex
            flex-col
            items-center
            text-sm
          "
          aria-label="Live TV"
        >
          <div className="flex items-center space-x-1">
            <MdLiveTv className="text-2xl" />

            {wakeLockStatus ===
              "Active" && (
              <span
                className="
                  text-[9px]
                  text-green-500
                  font-semibold
                "
              >
                Active
              </span>
            )}
          </div>

          <span>Live TV</span>
        </button>
      </div>

      {/* ======================================================
          LIVE TV MODAL
      ======================================================= */}

      {showTVModal && (
        <div
          className="
            fixed
            inset-0
            z-50
            flex
            items-center
            justify-center
            bg-black
            bg-opacity-75
          "
        >
          <div
            className="
              relative
              w-full
              h-full
              max-w-4xl
              max-h-[80vh]
              bg-black
            "
          >
            {/* Close */}
            <button
              type="button"
              className="
                absolute
                -top-10
                right-0
                text-white
                text-2xl
                z-10
                p-2
              "
              onClick={closeTVModal}
              aria-label="Close Live TV"
            >
              × Close
            </button>

            {/* Live TV */}
            <iframe
              src="https://dreamplay.pages.dev/"
              className="
                w-full
                h-full
                border-none
              "
              title="Dreamly5 Live TV"
              allowFullScreen
              frameBorder="0"
              scrolling="yes"
              style={{
                overflow: "hidden",
              }}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default Navigator;
