import React, { useEffect, useRef } from 'react';
import { RaceStats, BoatState, CameraView, TrackData } from '../game/types';

interface GameHUDProps {
  stats: RaceStats;
  boat: BoatState;
  track: TrackData;
  cameraView: CameraView;
  gameMode: string;
  weather: string;
  isMuted: boolean;
  onToggleMute: () => void;
  onCycleWeather: () => void;
  onTogglePause: () => void;
  onSwitchCamera: () => void;
  onRestartRace: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  stats,
  boat,
  track,
  cameraView,
  gameMode,
  weather,
  isMuted,
  onToggleMute,
  onCycleWeather,
  onTogglePause,
  onSwitchCamera,
  onRestartRace,
}) => {
  const minimapRef = useRef<HTMLCanvasElement | null>(null);

  // Format seconds to mm:ss.s
  const formatTime = (secs: number) => {
    if (!secs || secs < 0) return '00:00.0';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  const speedKmh = Math.round(boat.speed * 2.2);

  // Draw minimap on canvas
  useEffect(() => {
    const canvas = minimapRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Compute bounding box of track
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    track.pathPoints.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    });

    const pad = 24;
    const scaleX = (w - pad * 2) / (maxX - minX || 1);
    const scaleZ = (h - pad * 2) / (maxZ - minZ || 1);
    const scale = Math.min(scaleX, scaleZ);

    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;

    const toMapX = (worldX: number) => w / 2 + (worldX - cx) * scale;
    const toMapY = (worldZ: number) => h / 2 + (worldZ - cz) * scale;

    // Draw river track loop
    ctx.beginPath();
    ctx.strokeStyle = '#2CB1D8';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    track.pathPoints.forEach((p, idx) => {
      const mx = toMapX(p.x);
      const my = toMapY(p.z);
      if (idx === 0) ctx.moveTo(mx, my);
      else ctx.lineTo(mx, my);
    });
    ctx.closePath();
    ctx.stroke();

    // Inner subtle river centerline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw checkpoints
    track.checkpoints.forEach((cp, idx) => {
      const mx = toMapX(cp.x);
      const my = toMapY(cp.z);
      ctx.beginPath();
      ctx.arc(mx, my, idx === 0 ? 3.5 : 2.5, 0, Math.PI * 2);
      ctx.fillStyle = idx === 0 ? '#E85D4E' : '#FFFFFF';
      ctx.fill();
    });

    // Draw player boat arrow
    const bx = toMapX(boat.x);
    const by = toMapY(boat.z);

    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(boat.heading);

    // Origami boat triangle marker
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.lineTo(-4, -4);
    ctx.lineTo(0, -2);
    ctx.lineTo(4, -4);
    ctx.closePath();
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.restore();
  }, [boat.x, boat.z, boat.heading, track]);

  return (
    <div className="fixed inset-0 pointer-events-none z-10 flex flex-col justify-between p-4 md:p-6 select-none font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Bar: Lap, Timer & Control Cluster */}
      <div className="flex items-start justify-between">
        {/* Top-Left: Lap & Circuit Cluster */}
        <div className="bg-[#FAF8F5] border border-[#E8DFC8] shadow-sm rounded-2xl px-4 py-3 flex items-center gap-4 text-[#2C2723]">
          <div className="flex flex-col">
            <span className="text-[10px] tracking-wider font-bold text-[#8A7E72] uppercase">Circuit</span>
            <span className="text-sm font-bold text-[#1F2937] truncate max-w-[130px] md:max-w-[180px]">
              {track.name}
            </span>
          </div>

          <div className="h-7 w-[1px] bg-[#E8DFC8]" />

          <div className="flex flex-col">
            <span className="text-[10px] tracking-wider font-bold text-[#8A7E72] uppercase">
              {gameMode === 'zen' ? 'Mode' : 'Lap'}
            </span>
            {gameMode === 'zen' ? (
              <span className="text-sm font-extrabold text-[#0D4F6C] uppercase tracking-wide">
                Zen Flow
              </span>
            ) : (
              <div className="flex items-baseline gap-0.5">
                <span className="text-xl font-extrabold text-[#0D4F6C] font-mono tabular-nums">
                  {stats.currentLap}
                </span>
                <span className="text-xs font-semibold text-[#8A7E72]">
                  /{stats.totalLaps}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Top-Center: Live Race Timer */}
        <div className="bg-[#FAF8F5] border border-[#E8DFC8] shadow-sm rounded-2xl px-5 py-2.5 flex items-center gap-3 text-[#2C2723]">
          <div className="flex flex-col items-center">
            <span className="text-[10px] tracking-wider font-bold text-[#8A7E72] uppercase">Current Lap</span>
            <span className="text-lg md:text-xl font-bold font-mono text-[#0D4F6C] tabular-nums">
              {formatTime(stats.currentLapTime)}
            </span>
          </div>
          {stats.bestLapTime > 0 && (
            <>
              <div className="h-6 w-[1px] bg-[#E8DFC8]" />
              <div className="flex flex-col items-center">
                <span className="text-[10px] tracking-wider font-bold text-[#8A7E72] uppercase">Best</span>
                <span className="text-xs md:text-sm font-semibold font-mono text-[#10B981] tabular-nums">
                  {formatTime(stats.bestLapTime)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Top-Right: Quick Utility Buttons (Camera, Mute, Pause, Restart) */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Dynamic Weather Switcher */}
          <button
            type="button"
            onClick={(e) => { e.currentTarget.blur(); onCycleWeather(); }}
            title={`Atmosphere: ${weather.toUpperCase()} [V]`}
            aria-label={`Cycle atmosphere weather, current is ${weather}`}
            tabIndex={-1}
            className="w-10 h-10 rounded-xl bg-[#FAF8F5] hover:bg-[#F3EDE2] border border-[#E8DFC8] shadow-sm flex items-center justify-center text-[#4A4036] transition-all cursor-pointer relative group"
          >
            {weather === 'sakura' ? (
              <span className="text-base" role="img" aria-label="Cherry Blossom">🌸</span>
            ) : weather === 'snow' ? (
              <span className="text-base" role="img" aria-label="Snowfall">❄️</span>
            ) : weather === 'autumn' ? (
              <span className="text-base" role="img" aria-label="Autumn Leaf">🍂</span>
            ) : (
              <svg className="w-5 h-5 text-[#E8BA55]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            )}
          </button>

          {/* Camera View Switcher */}
          <button
            type="button"
            onClick={(e) => { e.currentTarget.blur(); onSwitchCamera(); }}
            title={`Camera: ${cameraView} [C]`}
            aria-label="Switch camera view"
            tabIndex={-1}
            className="w-10 h-10 rounded-xl bg-[#FAF8F5] hover:bg-[#F3EDE2] border border-[#E8DFC8] shadow-sm flex items-center justify-center text-[#4A4036] transition-all cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>

          {/* Mute Toggle */}
          <button
            type="button"
            onClick={(e) => { e.currentTarget.blur(); onToggleMute(); }}
            title={isMuted ? "Unmute [M]" : "Mute [M]"}
            aria-label={isMuted ? "Unmute audio" : "Mute audio"}
            tabIndex={-1}
            className="w-10 h-10 rounded-xl bg-[#FAF8F5] hover:bg-[#F3EDE2] border border-[#E8DFC8] shadow-sm flex items-center justify-center text-[#4A4036] transition-all cursor-pointer"
          >
            {isMuted ? (
              <svg className="w-5 h-5 text-[#E0533C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            )}
          </button>

          {/* Pause Button */}
          <button
            type="button"
            onClick={(e) => { e.currentTarget.blur(); onTogglePause(); }}
            title="Pause [Esc / P]"
            aria-label="Pause game"
            tabIndex={-1}
            className="w-10 h-10 rounded-xl bg-[#FAF8F5] hover:bg-[#F3EDE2] border border-[#E8DFC8] shadow-sm flex items-center justify-center text-[#4A4036] transition-all cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* Quick Restart */}
          <button
            type="button"
            onClick={(e) => { e.currentTarget.blur(); onRestartRace(); }}
            title="Restart [R]"
            aria-label="Restart race"
            tabIndex={-1}
            className="w-10 h-10 rounded-xl bg-[#FAF8F5] hover:bg-[#F3EDE2] border border-[#E8DFC8] shadow-sm flex items-center justify-center text-[#4A4036] transition-all cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Center Drift Notification Badge */}
      <div className="self-center flex flex-col items-center">
        {boat.isDrifting && (
          <div className="bg-[#FAF8F5] border-2 border-[#E87A5D] px-4 py-1.5 rounded-full shadow-md flex items-center gap-2 transform animate-bounce">
            <span className="text-xs font-black tracking-wider uppercase text-[#E87A5D]">DRIFT</span>
            <span className="text-sm font-mono font-extrabold text-[#D97724] tabular-nums">
              x{boat.driftCombo.toFixed(1)}
            </span>
            <span className="text-xs font-mono font-semibold text-[#6B7280]">
              +{Math.round(boat.driftScore)} pts
            </span>
          </div>
        )}
      </div>

      {/* Bottom Bar: Speedometer & Minimap */}
      <div className="flex items-end justify-between">
        {/* Bottom-Left: Speed & Drift Meter */}
        <div className="bg-[#FAF8F5] border border-[#E8DFC8] shadow-sm rounded-2xl p-4 flex items-center gap-4 text-[#2C2723]">
          <div className="flex flex-col">
            <span className="text-[10px] tracking-wider font-bold text-[#8A7E72] uppercase">Speed</span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black font-mono text-[#0D4F6C] tabular-nums">
                {speedKmh}
              </span>
              <span className="text-xs font-bold text-[#8A7E72]">kt</span>
            </div>
            {/* Speed Bar */}
            <div className="w-24 h-1.5 bg-[#E8DFC8] rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-gradient-to-r from-[#2CB1D8] to-[#0D4F6C] rounded-full transition-all duration-75"
                style={{ width: `${Math.min(100, (speedKmh / 55) * 100)}%` }}
              />
            </div>
          </div>

          <div className="h-10 w-[1px] bg-[#E8DFC8]" />

          <div className="flex flex-col">
            <span className="text-[10px] tracking-wider font-bold text-[#8A7E72] uppercase">Drift Score</span>
            <span className="text-lg font-bold font-mono text-[#D97724] tabular-nums">
              {stats.totalDriftScore.toLocaleString()}
            </span>
            <span className="text-[10px] text-[#8A7E72]">
              {cameraView.toUpperCase()} CAM
            </span>
          </div>
        </div>

        {/* Bottom-Right: River Circuit Minimap */}
        <div className="bg-[#FAF8F5] border border-[#E8DFC8] shadow-sm rounded-2xl p-2.5 flex flex-col items-center">
          <canvas
            ref={minimapRef}
            width={120}
            height={120}
            className="w-24 h-24 md:w-28 md:h-28 rounded-xl bg-[#F4EFE6]"
          />
          <span className="text-[9px] tracking-wider font-bold text-[#8A7E72] uppercase mt-1">
            Minimap
          </span>
        </div>
      </div>
    </div>
  );
};
