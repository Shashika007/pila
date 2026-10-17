import {
  YoutubeTranscript,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
} from "youtube-transcript";
import { transcribeWithGemini } from "./gemini.js";

export interface TranscriptSegment {
  text: string;
  /** Start time in seconds. */
  start: number;
  /** Duration in seconds. */
  duration: number;
}

/** Accepts a bare video ID or any common YouTube URL and returns the ID. */
export function extractVideoId(input: string): string {
  const trimmed = input.trim();
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(`Not a valid YouTube URL or video ID: ${input}`);
  }

  const host = url.hostname.replace(/^www\./, "");
  let id: string | null = null;
  if (host === "youtu.be") {
    id = url.pathname.slice(1).split("/")[0];
  } else if (host.endsWith("youtube.com")) {
    id =
      url.searchParams.get("v") ??
      url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})/)?.[1] ??
      null;
  }

  if (!id || !/^[\w-]{11}$/.test(id)) {
    throw new Error(`Could not find a video ID in: ${input}`);
  }
  return id;
}

export interface TranscriptResult {
  segments: TranscriptSegment[];
  /** "captions" = YouTube's own track; "gemini" = transcribed by Gemini. */
  source: "captions" | "gemini";
}

export async function getTranscript(
  videoIdOrUrl: string,
  lang?: string,
  opts: { fallback?: boolean } = {},
): Promise<TranscriptResult> {
  const { fallback = true } = opts;
  const videoId = extractVideoId(videoIdOrUrl);

  try {
    const raw = await YoutubeTranscript.fetchTranscript(
      videoId,
      lang ? { lang } : undefined,
    );
    // The library reports ms for the newer caption format (seconds for the
    // classic one); normalize so callers always get seconds.
    const segments = raw.map((r) => ({
      text: decodeEntities(r.text),
      start: r.offset / 1000,
      duration: r.duration / 1000,
    }));
    return { segments, source: "captions" };
  } catch (err) {
    const noCaptions =
      err instanceof YoutubeTranscriptDisabledError ||
      err instanceof YoutubeTranscriptNotAvailableError;
    if (!fallback || !noCaptions) throw err;

    console.error("No captions available; falling back to Gemini...");
    return { segments: await transcribeWithGemini(videoId), source: "gemini" };
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;#39;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function toPlainText(segments: TranscriptSegment[]): string {
  return segments.map((s) => s.text).join(" ");
}
