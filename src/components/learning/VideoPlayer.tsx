import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { StickyNote } from "lucide-react";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VideoPlayer({
  url,
  title,
  resumeAt = 0,
  onPosition,
  onReached90,
  onTakeNote,
}: {
  url: string;
  title: string;
  resumeAt?: number;
  onPosition?: (seconds: number) => void;
  onReached90?: () => void;
  onTakeNote?: (seconds: number) => void;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [speed, setSpeed] = useState(1);
  const [current, setCurrent] = useState(0);
  const [showResume, setShowResume] = useState(resumeAt > 5);
  const reported = useRef(false);
  const lastSaved = useRef(0);

  useEffect(() => {
    if (ref.current) ref.current.playbackRate = speed;
  }, [speed]);

  const yt = extractYouTubeId(url);
  if (yt) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-xl border border-border bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${yt}?start=${Math.floor(resumeAt)}`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-black">
        <video
          ref={ref}
          src={url}
          controls
          controlsList="nodownload"
          className="w-full h-full"
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            setCurrent(v.currentTime);
            if (v.currentTime - lastSaved.current >= 10) {
              lastSaved.current = v.currentTime;
              onPosition?.(Math.floor(v.currentTime));
            }
            if (!reported.current && v.duration && v.currentTime / v.duration >= 0.9) {
              reported.current = true;
              onReached90?.();
            }
          }}
          onDoubleClick={() => {
            const v = ref.current;
            if (!v) return;
            if (v.paused) void v.play();
            else v.pause();
          }}
        />
        {showResume && (
          <div className="absolute inset-x-0 bottom-14 flex justify-center">
            <div className="rounded-full bg-card/95 border border-border px-4 py-2 text-xs flex items-center gap-3 shadow-lg">
              <span>Resume from {fmt(resumeAt)}?</span>
              <Button
                size="sm"
                className="h-7"
                onClick={() => {
                  if (ref.current) ref.current.currentTime = resumeAt;
                  setShowResume(false);
                }}
              >
                Resume
              </Button>
              <Button size="sm" variant="ghost" className="h-7" onClick={() => setShowResume(false)}>
                Start over
              </Button>
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <label className="inline-flex items-center gap-1.5">
          Speed
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="bg-transparent border border-border rounded px-1 py-0.5"
          >
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s}x
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 hover:text-foreground"
          onClick={() => {
            const v = ref.current;
            if (v && document.pictureInPictureEnabled) void v.requestPictureInPicture().catch(() => {});
          }}
        >
          Picture-in-picture
        </button>
        {onTakeNote && (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 hover:text-foreground"
            onClick={() => onTakeNote(Math.floor(current))}
          >
            <StickyNote className="h-3.5 w-3.5" /> Take note at {fmt(current)}
          </button>
        )}
      </div>
    </div>
  );
}

export function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([\w-]{11})/) ?? null;
  return m ? m[1] : null;
}