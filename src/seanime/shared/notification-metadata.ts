/**
 * Creates pure notification metadata helpers inside the caller's Denshi runtime.
 * The factory deliberately has no imports or module-scope dependencies.
 */
export function createNotificationMetadataHelpers() {
  function inferTorrentDetails(name: string): {
    displayTorrentName: string; quality?: string; releaseSource?: string; videoCodec?: string; audioCodec?: string;
    audioLanguage?: string; subtitleLanguages?: string; releaseGroup?: string;
  } {
    const languageNames: Record<string, string> = {
      ja: "Japanese", jpn: "Japanese", en: "English", eng: "English", zh: "Chinese", zhhant: "Chinese (Traditional)",
      ko: "Korean", kor: "Korean", es: "Spanish", spa: "Spanish", fr: "French", fra: "French", de: "German", deu: "German",
      id: "Indonesian", ind: "Indonesian", ms: "Malay", th: "Thai", vi: "Vietnamese", ar: "Arabic", pt: "Portuguese", ru: "Russian",
    };
    const summarizeLanguages = (codes: string[]): string | undefined => {
      const names = [...new Set(codes.map((code) => languageNames[code.trim().toLowerCase()] ?? code.trim().toUpperCase()).filter(Boolean))];
      if (!names.length) return undefined;
      return names.length > 3 ? `${names.slice(0, 2).join(", ")} +${names.length - 2} more` : names.join(", ");
    };
    const tagBlock = name.match(/\{Tags:(.*?)\}/i)?.[1] ?? "";
    const audioLanguage = summarizeLanguages(tagBlock.match(/(?:^|;)A=([^;]*)/i)?.[1]?.split(",") ?? []);
    const subtitleLanguages = summarizeLanguages(tagBlock.match(/(?:^|;)S=([^;]*)/i)?.[1]?.split(",") ?? []) ?? (/multi[ .-]?subs?/i.test(name) ? "Multiple languages" : undefined);
    const withoutTags = name.replace(/\s*\{Tags:.*?\}\s*/gi, " ").replace(/\.(?:mkv|mp4|avi|mov|webm)$/i, "").trim();
    const leadingGroup = withoutTags.match(/^\[([^\]]+)]/)?.[1];
    const trailingGroup = withoutTags.match(/-([A-Za-z0-9][A-Za-z0-9._-]{1,30})$/)?.[1];
    const releaseGroup = leadingGroup ?? trailingGroup;
    const withoutGroup = withoutTags.replace(/^\[[^\]]+]\s*/, "");
    const technicalIndex = withoutGroup.search(/\b(?:2160p|1080p|720p|480p|web[- .]?dl|webrip|blu[- ]?ray|bdrip|hdtv|dvd|x26[45]|h[ .]?26[45]|hevc|av1)\b/i);
    let displayTorrentName = (technicalIndex > 0 ? withoutGroup.slice(0, technicalIndex) : withoutGroup).replace(/[._]+/g, " ").replace(/\s+/g, " ").replace(/[\s.\-–—]+$/, "").trim();
    if (displayTorrentName.length > 120) displayTorrentName = `${displayTorrentName.slice(0, 117).trimEnd()}...`;
    const quality = name.match(/\b(2160p|1080p|720p|480p)\b/i)?.[1]?.toLowerCase();
    const releaseSource = /\b(?:blu[- ]?ray|bdrip)\b/i.test(name) ? "Blu-ray" : /\bweb[- .]?dl\b/i.test(name) ? "WEB-DL" : /\bwebrip\b/i.test(name) ? "WEBRip" : /\bhdtv\b/i.test(name) ? "HDTV" : /\bdvd(?:rip)?\b/i.test(name) ? "DVD" : undefined;
    const videoCodec = /\b(?:x265|h[ .]?265|hevc)\b/i.test(name) ? "H.265 / HEVC" : /\b(?:x264|h[ .]?264|avc)\b/i.test(name) ? "H.264 / AVC" : /\bav1\b/i.test(name) ? "AV1" : undefined;
    const audioMatch = name.match(/\b(AAC|FLAC|E-?AC-?3|EAC3|DDP|AC-?3|OPUS|MP3)(?:[ .]?([257]\.[01]))?/i);
    const audioCodec = audioMatch ? `${audioMatch[1]!.toUpperCase().replace("EAC3", "E-AC-3").replace("DDP", "E-AC-3")}${audioMatch[2] ? ` ${audioMatch[2]}` : ""}` : undefined;
    return { displayTorrentName: displayTorrentName || withoutTags.slice(0, 120), ...(quality ? { quality } : {}), ...(releaseSource ? { releaseSource } : {}), ...(videoCodec ? { videoCodec } : {}), ...(audioCodec ? { audioCodec } : {}), ...(audioLanguage ? { audioLanguage } : {}), ...(subtitleLanguages ? { subtitleLanguages } : {}), ...(releaseGroup ? { releaseGroup } : {}) };
  }
  return { inferTorrentDetails };
}
