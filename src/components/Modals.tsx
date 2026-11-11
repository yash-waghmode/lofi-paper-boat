import React from 'react';
import { RaceStats, TrackData } from '../game/types';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onExitToTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onExitToTitle,
}) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[rgba(26,38,47,0.45)] select-none font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="bg-[#FAF8F5] border-2 border-[#E8DFC8] rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl text-center">
        <h2 className="text-2xl font-black text-[#1E293B] tracking-tight mb-1">
          RIVER PAUSED
        </h2>
        <p className="text-xs text-[#8A7E72] font-semibold uppercase tracking-wider mb-6">
          Take a breath in the tranquil flow
        </p>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-3.5 px-4 rounded-xl bg-[#0D4F6C] hover:bg-[#13678A] text-white font-bold text-sm tracking-wide shadow-md transition-all cursor-pointer"
          >
            Resume Drifting
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="w-full py-3 px-4 rounded-xl bg-[#F4EFE6] hover:bg-[#EAE2D3] border border-[#E8DFC8] text-[#3E362F] font-bold text-sm transition-all cursor-pointer"
          >
            Restart Circuit
          </button>

          <button
            type="button"
            onClick={onExitToTitle}
            className="w-full py-2.5 px-4 rounded-xl text-[#8A7E72] hover:text-[#3E362F] font-semibold text-xs transition-all cursor-pointer"
          >
            Exit to Title
          </button>
        </div>
      </div>
    </div>
  );
};

interface VictoryModalProps {
  stats: RaceStats;
  track: TrackData;
  onPlayAgain: () => void;
  onNextTrack: () => void;
  onExitToTitle: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  stats,
  track,
  onPlayAgain,
  onNextTrack,
  onExitToTitle,
}) => {
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  // Determine stars (1-3) based on time and collisions
  const stars = stats.collisions === 0 && stats.totalTime < 90 ? 3 : stats.collisions <= 2 ? 2 : 1;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[rgba(26,38,47,0.55)] select-none font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="bg-[#FAF8F5] border-2 border-[#E8DFC8] rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl text-center">
        {/* Star Rating Banner */}
        <div className="flex justify-center gap-1.5 mb-2">
          {[1, 2, 3].map(st => (
            <svg
              key={st}
              className={`w-7 h-7 ${st <= stars ? 'text-[#E8BA55]' : 'text-[#D2C5A8]'}`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
          ))}
        </div>

        <h2 className="text-3xl font-black text-[#1E293B] tracking-tight">
          CIRCUIT COMPLETE!
        </h2>
        <p className="text-xs font-semibold text-[#8A7E72] uppercase tracking-wider mb-6">
          {track.name} · {stats.totalLaps} Laps Logged
        </p>

        {/* Stat Tiles */}
        <div className="grid grid-cols-2 gap-2.5 mb-6 text-left">
          <div className="bg-[#F4EFE6] border border-[#E8DFC8] rounded-2xl p-3">
            <span className="text-[10px] font-bold text-[#8A7E72] uppercase block">Total Time</span>
            <span className="text-xl font-black font-mono text-[#0D4F6C] tabular-nums">
              {formatTime(stats.totalTime)}
            </span>
          </div>

          <div className="bg-[#F4EFE6] border border-[#E8DFC8] rounded-2xl p-3">
            <span className="text-[10px] font-bold text-[#8A7E72] uppercase block">Best Lap</span>
            <span className="text-xl font-black font-mono text-[#10B981] tabular-nums">
              {formatTime(stats.bestLapTime)}
            </span>
          </div>

          <div className="bg-[#F4EFE6] border border-[#E8DFC8] rounded-2xl p-3">
            <span className="text-[10px] font-bold text-[#8A7E72] uppercase block">Drift Score</span>
            <span className="text-xl font-black font-mono text-[#D97724] tabular-nums">
              {stats.totalDriftScore.toLocaleString()}
            </span>
          </div>

          <div className="bg-[#F4EFE6] border border-[#E8DFC8] rounded-2xl p-3">
            <span className="text-[10px] font-bold text-[#8A7E72] uppercase block">Collisions</span>
            <span className="text-xl font-black font-mono text-[#5C5349] tabular-nums">
              {stats.collisions}
            </span>
          </div>
        </div>

        {/* Lap Breakdown List */}
        {stats.lapTimes.length > 0 && (
          <div className="bg-[#F9F6F0] rounded-2xl p-3 mb-6 border border-[#EFE8DC] text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7E72] block mb-1.5 text-left">
              Lap Breakdown
            </span>
            <div className="space-y-1">
              {stats.lapTimes.map((lt, idx) => (
                <div key={idx} className="flex justify-between font-mono text-[#3E362F]">
                  <span>Lap {idx + 1}</span>
                  <span className="font-semibold tabular-nums">{formatTime(lt)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            data-start="true"
            onClick={onNextTrack}
            className="w-full py-3.5 px-4 rounded-xl bg-[#0D4F6C] hover:bg-[#13678A] text-white font-extrabold text-sm tracking-wide shadow-md transition-all cursor-pointer"
          >
            Next River Circuit
          </button>

          <button
            type="button"
            onClick={onPlayAgain}
            className="w-full py-3 px-4 rounded-xl bg-[#F4EFE6] hover:bg-[#EAE2D3] border border-[#E8DFC8] text-[#3E362F] font-bold text-sm transition-all cursor-pointer"
          >
            Race Again
          </button>

          <button
            type="button"
            onClick={onExitToTitle}
            className="w-full py-2 px-4 rounded-xl text-[#8A7E72] hover:text-[#3E362F] font-semibold text-xs transition-all cursor-pointer"
          >
            Return to Title
          </button>
        </div>
      </div>
    </div>
  );
};
