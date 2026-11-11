import React from 'react';
import { TRACKS } from '../game/trackData';
import { GameMode } from '../game/types';

interface TitleScreenProps {
  selectedTrackId: string;
  onSelectTrack: (trackId: string) => void;
  gameMode: GameMode;
  onSelectGameMode: (mode: GameMode) => void;
  onStartGame: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  selectedTrackId,
  onSelectTrack,
  gameMode,
  onSelectGameMode,
  onStartGame,
}) => {
  const currentTrack = TRACKS.find(t => t.id === selectedTrackId) || TRACKS[0];

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-6 md:p-12 font-['Plus_Jakarta_Sans',sans-serif] pointer-events-none select-none">
      {/* Top Header & Custom Bespoke SVG Title Lockup */}
      <div className="flex flex-col items-center md:items-start max-w-xl pointer-events-auto">
        {/* Bespoke Origami Boat Emblem & Title */}
        <div className="flex items-center gap-3.5 mb-2">
          {/* Custom Inline SVG Origami Boat Emblem */}
          <svg className="w-10 h-10 md:w-12 md:h-12 text-[#0D4F6C]" viewBox="0 0 64 64" fill="none">
            <path d="M4 38L32 46L60 38L48 54L16 54L4 38Z" fill="#FBF8F3" stroke="#0D4F6C" strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M32 10L18 38H46L32 10Z" fill="#FAF6EE" stroke="#0D4F6C" strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M32 10V46" stroke="#2CB1D8" strokeWidth="2" strokeDasharray="3 2" />
            <path d="M32 10L42 16L32 20" fill="#E87A5D" stroke="#0D4F6C" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>

          <div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-[#1E293B] drop-shadow-sm leading-none">
              LO-FI PAPER DRIFT
            </h1>
            <p className="text-xs md:text-sm font-semibold tracking-wider text-[#8A7E72] uppercase mt-1">
              Cozy Origami River Racing
            </p>
          </div>
        </div>

        <p className="text-sm text-[#5C5349] leading-relaxed hidden sm:block max-w-md">
          A serene paper boat gliding across winding natural circuits. Drift around river stones, catch the current, and embrace the tranquil flow.
        </p>
      </div>

      {/* Center-Left: Track Selector & Mode Cards */}
      <div className="self-center md:self-start w-full max-w-md pointer-events-auto flex flex-col gap-4 mt-auto mb-6">
        {/* Track Picker Card */}
        <div className="bg-[#FAF8F5] border border-[#E8DFC8] rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-bold tracking-wider text-[#8A7E72] uppercase block mb-2">
            Select Circuit
          </span>
          <div className="grid grid-cols-3 gap-2">
            {TRACKS.map(track => {
              const isSelected = track.id === selectedTrackId;
              return (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => onSelectTrack(track.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#0D4F6C] border-[#0D4F6C] text-[#FAF8F5] shadow-sm'
                      : 'bg-[#F4EFE6] hover:bg-[#EAE2D3] border-[#E8DFC8] text-[#3E362F]'
                  }`}
                >
                  <span className={`text-[9px] font-bold uppercase tracking-wider block ${
                    isSelected ? 'text-[#8AD8EE]' : 'text-[#8A7E72]'
                  }`}>
                    {track.difficulty}
                  </span>
                  <span className="text-xs font-bold leading-tight mt-0.5 truncate w-full">
                    {track.name}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-2.5 pt-2 border-t border-[#E8DFC8] text-[11px] text-[#6E6459] flex items-center justify-between">
            <span>{currentTrack.subtitle}</span>
            <span className="font-semibold text-[#0D4F6C]">{currentTrack.riverWidth}m river width</span>
          </div>
        </div>

        {/* Game Mode Selector */}
        <div className="bg-[#FAF8F5] border border-[#E8DFC8] rounded-2xl p-3 shadow-sm flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold tracking-wider text-[#8A7E72] uppercase pl-1">
            Mode
          </span>
          <div className="flex gap-1.5">
            {(['race', 'drift', 'zen'] as GameMode[]).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => onSelectGameMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  gameMode === mode
                    ? 'bg-[#2CB1D8] text-white shadow-xs'
                    : 'bg-[#F4EFE6] text-[#5C5349] hover:bg-[#EAE2D3]'
                }`}
              >
                {mode === 'race' ? '3 Laps' : mode === 'drift' ? 'Drift Trial' : 'Zen Cruise'}
              </button>
            ))}
          </div>
        </div>

        {/* Primary Start CTA Button */}
        <button
          type="button"
          data-start="true"
          onClick={onStartGame}
          className="w-full py-4 px-6 rounded-2xl bg-[#0D4F6C] hover:bg-[#13678A] text-[#FAF8F5] font-extrabold text-base md:text-lg tracking-wide shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 cursor-pointer group"
        >
          <span>Launch Paper Boat</span>
          <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>

      {/* Flat Single Control-Hint Line */}
      <div className="self-center text-center text-xs text-[#6B5E51] font-medium tracking-wide">
        <span className="hidden sm:inline">Controls: </span>
        <strong className="text-[#1E293B]">WASD / Arrow Keys</strong> Steer · <strong className="text-[#1E293B]">Space</strong> Drift · <strong className="text-[#1E293B]">C</strong> Camera · <strong className="text-[#1E293B]">V</strong> Atmosphere · <strong className="text-[#1E293B]">Esc</strong> Pause
      </div>
    </div>
  );
};
