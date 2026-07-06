/** Provider-neutral event delivered after a tracked torrent reaches completion. */
export interface DownloadCompletedNotification {
  type: "download_completed";
  torrentHash: string;
  torrentName: string;
  mediaId?: number;
  animeTitle?: string;
  episodeNumber?: number | string;
  episodeTitle?: string;
  animeCoverUrl?: string;
  episodeImageUrl?: string;
  animeFormat?: string;
  animeYear?: number;
  animeScore?: number;
  animeDurationMinutes?: number;
  animeGenres?: string[];
  displayTorrentName?: string;
  torrentSize?: string;
  quality?: string;
  releaseSource?: string;
  videoCodec?: string;
  audioCodec?: string;
  audioLanguage?: string;
  subtitleLanguages?: string;
  releaseGroup?: string;
  contentPath?: string;
  completedAt: string;
  source: "auto_downloader";
  isSimulationSmoke?: boolean;
}

/** Minimal Seanime Auto Downloader hook contract used by the core adapter. */
export interface AutoDownloaderEvent {
  next(): void;
  torrent?: { infoHash?: string; hash?: string; name?: string };
  rule?: { mediaId?: number; animeTitle?: string; title?: string };
  episode: number;
  downloaded: boolean;
  isSimulation: boolean;
}
