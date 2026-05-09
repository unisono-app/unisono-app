"use client";

import type { SongWithPerformances } from "@/features/songs/api";

type Props = {
  songs: SongWithPerformances[];
  onEdit: (song: SongWithPerformances) => void;
};

function formatPerformance(year: number, event: string): string {
  // 例: コンクール '26
  const yy = String(year).slice(-2);
  return `${event} '${yy}`;
}

export function SongsList({ songs, onEdit }: Props) {
  return (
    <div className="space-y-3">
      {songs.map((song) => {
        // 作曲者・編曲者の表示: "{作曲者} 作 / {編曲者} 編"
        const credits = [
          song.composer ? `${song.composer} 作` : null,
          song.arranger ? `${song.arranger} 編` : null,
        ]
          .filter(Boolean)
          .join(" / ");

        return (
          <div
            key={song.id}
            onClick={() => onEdit(song)}
            className="cursor-pointer rounded-lg border border-gray-300 bg-white p-3 transition-colors hover:border-gray-400"
          >
            <div className="text-base font-semibold">{song.title}</div>
            {credits.length > 0 && (
              <div className="mt-0.5 text-sm text-gray-600">{credits}</div>
            )}
            {song.song_performances.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {song.song_performances
                  .slice()
                  .sort((a, b) => b.year - a.year)
                  .map((p) => (
                    <span
                      key={p.id}
                      className="rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-700"
                    >
                      {formatPerformance(p.year, p.event)}
                    </span>
                  ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
