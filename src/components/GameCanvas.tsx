import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { SceneRenderer } from '../game/sceneRenderer';
import { TrackData, BoatState, CameraView, WeatherType, GameState } from '../game/types';

export interface GameCanvasHandle {
  renderer: SceneRenderer | null;
  triggerCheckpointPulse: (index: number) => void;
  emitSplash: (x: number, y: number, z: number, intensity: number) => void;
  addTrauma: (amount: number) => void;
  setWeather: (weather: WeatherType) => void;
  switchTrack: (track: TrackData) => void;
}

interface GameCanvasProps {
  track: TrackData;
  boatRef: React.MutableRefObject<BoatState>;
  cameraView: CameraView;
  weather: WeatherType;
  gameState: GameState;
}

/**
 * Isolated WebGL canvas container with exponential cream fog (#F5EFEB),
 * warm directional sun shadows, soft ambient fill, and weather effects.
 */
export const GameCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(({
  track,
  boatRef,
  cameraView,
  weather,
  gameState,
}, ref) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<SceneRenderer | null>(null);

  // Initialize SceneRenderer once on mount
  useEffect(() => {
    if (!mountRef.current) return;

    const renderer = new SceneRenderer(mountRef.current, track);
    rendererRef.current = renderer;
    renderer.setWeather(weather);

    const handleResize = () => {
      renderer.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      rendererRef.current = null;
    };
  }, []); // Run once on mount

  // Sync weather changes
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setWeather(weather);
    }
  }, [weather]);

  // Expose imperative methods to parent without triggering React re-renders
  useImperativeHandle(ref, () => ({
    get renderer() {
      return rendererRef.current;
    },
    triggerCheckpointPulse: (index: number) => {
      rendererRef.current?.triggerCheckpointPulse(index);
    },
    emitSplash: (x: number, y: number, z: number, intensity: number) => {
      rendererRef.current?.emitSplash(x, y, z, intensity);
    },
    addTrauma: (amount: number) => {
      if (rendererRef.current) {
        rendererRef.current.trauma = Math.min(1.0, rendererRef.current.trauma + amount);
      }
    },
    setWeather: (newWeather: WeatherType) => {
      rendererRef.current?.setWeather(newWeather);
    },
    switchTrack: (newTrack: TrackData) => {
      rendererRef.current?.buildTrack(newTrack);
    },
  }), []);

  return (
    <div
      ref={mountRef}
      data-testid="game-canvas-container"
      className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
    />
  );
});

GameCanvas.displayName = 'GameCanvas';
