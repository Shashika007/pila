# Pila

A Chrome extension that captures YouTube subtitles in real time, even when closed captions (CC) are disabled, and sends each completed sentence to the **Jev API** to generate contextual questions during video playback.

## Tech Stack

- **TypeScript + WXT (Manifest V3)** — Chrome extension framework.
- **Content scripts + page-context bridge** — discover subtitles and monitor playback.
- **Background service worker + Fetch API** — retrieve captions and communicate with Jev.
- **Chrome messaging + storage** — internal communication and settings.

## Technical Considerations

Caption extraction relies on YouTube's undocumented interfaces and may not work for every video. Subtitle processing must handle playback synchronization, sentence assembly, and deduplication.

## Example videos

See [example_videos](./example_videos/README.md)
