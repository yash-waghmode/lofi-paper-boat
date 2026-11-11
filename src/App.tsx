import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SceneRenderer, isSoftwareGl } from './game/sceneRenderer';
import { TRACKS } from './game/trackData';
import {
  BoatInput,
  BoatState,
  CameraView,
  GameMode,
  GameState,
  RaceStats,
  TrackData,
  WeatherType,
} from './game/types';
import {
  updateBoatPhysics,
  resolveRiverBankCollision,
  checkObstacleCollisions,
  evaluateCheckpoints,
} from './game/physics';
import { sound } from './game/audio';
import { GameHUD } from './components/GameHUD';
import { TitleScreen } from './components/TitleScreen';
import { PauseModal, VictoryModal } from './components/Modals';
import { MobileControls } from './components/MobileControls';

function createInitialBoatState(track: TrackData): BoatState {
  const p0 = track.pathPoints[0] || { x: 0, z: 0 };
  const p1 = track.pathPoints[1] || { x: 0, z: 1 };
  const dx = p1.x - p0.x;
  const dz = p1.z - p0.z;
  const len = Math.sqrt(dx * dx + dz * dz) || 1;
  const initialHeading = Math.atan2(dx, dz);

  // Spawn slightly ahead of gate line along track direction
  const spawnX = p0.x + (dx / len) * 2.5;
  const spawnZ = p0.z + (dz / len) * 2.5;

  return {
    x: spawnX,
    y: 0,
    z: spawnZ,
    vx: 0,
    vz: 0,
    heading: initialHeading,
    yawRate: 0,
    speed: 0,
    roll: 0,
    pitch: 0,
    driftFactor: 0,
    isDrifting: false,
    driftScore: 0,
    driftCombo: 1.0,
    invulnerableTime: 0,
  };
}

function createInitialRaceStats(track: TrackData): RaceStats {
  return {
    currentLap: 1,
    totalLaps: track.totalLaps,
    lapTimes: [],
    currentLapTime: 0,
    bestLapTime: 0,
    totalTime: 0,
    totalDriftScore: 0,
    collisions: 0,
    checkpointsPassed: 0,
    isFinished: false,
  };
}

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<SceneRenderer | null>(null);

  // Track selection & game mode
  const [selectedTrackId, setSelectedTrackId] = useState<string>('willow-bend');
  const [gameMode, setGameMode] = useState<GameMode>('race');
  const [gameState, setGameState] = useState<GameState>('title');
  const [cameraView, setCameraView] = useState<CameraView>('chase');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [weather, setWeather] = useState<WeatherType>('sakura');

  // Active track reference
  const currentTrack = TRACKS.find(t => t.id === selectedTrackId) || TRACKS[0];

  // Game loop state held in refs for 60fps zero-react-overhead simulation
  const boatRef = useRef<BoatState>(createInitialBoatState(currentTrack));
  const statsRef = useRef<RaceStats>(createInitialRaceStats(currentTrack));
  const checkpointIdxRef = useRef<number>(0);
  const inputRef = useRef<BoatInput>({ throttle: 0, steer: 0, brake: 0, drift: false });
  const keysPressedRef = useRef<Set<string>>(new Set());

  // Throttled UI state for React HUD
  const [uiStats, setUiStats] = useState<RaceStats>(statsRef.current);
  const [uiBoat, setUiBoat] = useState<BoatState>(boatRef.current);

  // State machine sync to document.body
  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  // Autostart query parameter support (?autostart=1)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      sound.init();
      setGameState('playing');
    }
  }, []);

  // Initialize Three.js scene once
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const renderer = new SceneRenderer(canvasMountRef.current, currentTrack);
    rendererRef.current = renderer;

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

  // Change track
  const handleSelectTrack = useCallback((trackId: string) => {
    setSelectedTrackId(trackId);
    const newTrack = TRACKS.find(t => t.id === trackId) || TRACKS[0];
    boatRef.current = createInitialBoatState(newTrack);
    statsRef.current = createInitialRaceStats(newTrack);
    checkpointIdxRef.current = 0;
    setWeather(newTrack.defaultWeather || 'sakura');
    if (rendererRef.current) {
      rendererRef.current.buildTrack(newTrack);
    }
  }, []);

  // Cycle weather / atmosphere
  const handleCycleWeather = useCallback(() => {
    setWeather(prev => {
      let next: WeatherType = 'sakura';
      if (prev === 'sakura') next = 'snow';
      else if (prev === 'snow') next = 'autumn';
      else if (prev === 'autumn') next = 'clear';
      else next = 'sakura';
      if (rendererRef.current) {
        rendererRef.current.setWeather(next);
      }
      return next;
    });
  }, []);

  // Start game handler
  const handleStartGame = useCallback(() => {
    sound.init();
    setGameState('playing');
    // Clear any stuck inputs
    keysPressedRef.current.clear();
    inputRef.current = { throttle: 0, steer: 0, brake: 0, drift: false };
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []);

  // Restart race
  const handleRestartRace = useCallback(() => {
    boatRef.current = createInitialBoatState(currentTrack);
    statsRef.current = createInitialRaceStats(currentTrack);
    checkpointIdxRef.current = 0;
    setUiStats(statsRef.current);
    setUiBoat(boatRef.current);
    setGameState('playing');
  }, [currentTrack]);

  // Next circuit
  const handleNextTrack = useCallback(() => {
    const currentIndex = TRACKS.findIndex(t => t.id === selectedTrackId);
    const nextIndex = (currentIndex + 1) % TRACKS.length;
    const nextTrack = TRACKS[nextIndex];
    handleSelectTrack(nextTrack.id);
    handleRestartRace();
  }, [selectedTrackId, handleSelectTrack, handleRestartRace]);

  // Toggle Mute
  const handleToggleMute = useCallback(() => {
    sound.init();
    const muted = sound.toggleMute();
    setIsMuted(muted);
  }, []);

  // Camera switcher
  const handleSwitchCamera = useCallback(() => {
    setCameraView(prev => {
      if (prev === 'chase') return 'hood';
      if (prev === 'hood') return 'isometric';
      return 'chase';
    });
  }, []);

  // Unified keyboard inputs
  useEffect(() => {
    const updateInputFromKeys = () => {
      const keys = keysPressedRef.current;
      const throttle = keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0;
      const brake = keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0;
      let steer = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) steer -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) steer += 1;
      const drift = keys.has('Space');

      inputRef.current = { throttle, steer, brake, drift };
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow Enter or Space on Title screen to launch
      if (gameState === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        handleStartGame();
        return;
      }

      // Pause toggle
      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        setGameState(prev => (prev === 'playing' ? 'paused' : prev === 'paused' ? 'playing' : prev));
        return;
      }

      // Camera switch
      if (e.code === 'KeyC') {
        e.preventDefault();
        handleSwitchCamera();
        return;
      }

      // Atmosphere / Weather toggle
      if (e.code === 'KeyV') {
        e.preventDefault();
        handleCycleWeather();
        return;
      }

      // Audio mute
      if (e.code === 'KeyM') {
        e.preventDefault();
        handleToggleMute();
        return;
      }

      // Restart race
      if (e.code === 'KeyR' && (gameState === 'playing' || gameState === 'paused')) {
        e.preventDefault();
        handleRestartRace();
        return;
      }

      keysPressedRef.current.add(e.code);
      updateInputFromKeys();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current.delete(e.code);
      updateInputFromKeys();
    };

    const handleWindowBlur = () => {
      keysPressedRef.current.clear();
      inputRef.current = { throttle: 0, steer: 0, brake: 0, drift: false };
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [gameState, handleStartGame, handleSwitchCamera, handleToggleMute, handleRestartRace]);

  // Main 60 FPS Animation & Simulation Loop
  useEffect(() => {
    let animFrameId: number;
    let lastTime = performance.now();
    let uiThrottleCounter = 0;

    const tick = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);
      const timeInSec = now / 1000;

      const renderer = rendererRef.current;

      if (renderer) {
        if (gameState === 'playing') {
          // 1. Advance Boat Physics
          const { nextState } = updateBoatPhysics(
            boatRef.current,
            inputRef.current,
            dt,
            timeInSec
          );
          let currentBoat = nextState;

          // 2. Resolve River Bank Collisions
          const bankResult = resolveRiverBankCollision(
            currentBoat,
            currentTrack.pathPoints,
            currentTrack.riverWidth
          );
          if (bankResult.hitBank) {
            currentBoat = bankResult.boat;
            renderer.emitSplash(currentBoat.x, currentBoat.y, currentBoat.z, 0.6);
            sound.playSplash(0.5);
            renderer.trauma = Math.min(1.0, renderer.trauma + 0.3);
            statsRef.current.collisions += 1;
          }

          // 3. Resolve Obstacle Collisions
          const obsResult = checkObstacleCollisions(currentBoat, currentTrack.obstacles);
          if (obsResult.hitObstacle) {
            currentBoat = obsResult.boat;
            const isHeavy = obsResult.hitObstacle.type === 'rock' || obsResult.hitObstacle.type === 'log';
            renderer.emitSplash(currentBoat.x, currentBoat.y, currentBoat.z, isHeavy ? 1.0 : 0.4);
            if (isHeavy) {
              sound.playBump(0.8);
              renderer.trauma = Math.min(1.0, renderer.trauma + 0.55);
              statsRef.current.collisions += 1;
            } else {
              sound.playSplash(0.4);
            }
          }

          boatRef.current = currentBoat;

          // 4. Evaluate Checkpoints & Laps
          const cpResult = evaluateCheckpoints(
            currentBoat,
            currentTrack.checkpoints,
            checkpointIdxRef.current,
            statsRef.current,
            dt
          );
          checkpointIdxRef.current = cpResult.nextCheckpointIdx;
          statsRef.current = cpResult.stats;
          statsRef.current.totalDriftScore = Math.round(currentBoat.driftScore);

          if (cpResult.passedCheckpoint) {
            sound.playCheckpointChime();
            renderer.emitSplash(currentBoat.x, currentBoat.y + 0.5, currentBoat.z, 0.5);
          }

          if (cpResult.lapCompleted) {
            sound.playLapFanfare();
          }

          if (cpResult.stats.isFinished) {
            sound.playVictoryFanfare();
            setGameState('gameover');
          }

          // 5. Update Continuous Sound (motor tone and drift splash)
          sound.updateMotorAndDrift(
            currentBoat.speed,
            26.0,
            currentBoat.isDrifting,
            currentBoat.driftFactor
          );
        } else {
          // If paused or title, silence motor audio
          sound.updateMotorAndDrift(0, 26.0, false, 0);
        }

        // Update 3D Scene (Boat position, water wave motion, particles, camera)
        renderer.update(boatRef.current, cameraView, gameState, dt, timeInSec);
        renderer.render();

        // Throttle React HUD state update to ~12 FPS
        uiThrottleCounter += 1;
        if (uiThrottleCounter % 5 === 0) {
          setUiBoat({ ...boatRef.current });
          setUiStats({ ...statsRef.current });
        }
      }

      if (isSoftwareGl) {
        // Software WebGL pacing
        const gl = renderer?.renderer.getContext() as WebGL2RenderingContext | null;
        if (gl) {
          const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
          gl.flush();
          const poll = () => {
            const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
            if (state === gl.UNSIGNALED) {
              animFrameId = window.setTimeout(poll, 5);
            } else {
              if (sync) gl.deleteSync(sync);
              animFrameId = window.setTimeout(() => tick(performance.now()), 70);
            }
          };
          animFrameId = window.setTimeout(poll, 5);
        } else {
          animFrameId = requestAnimationFrame(tick);
        }
      } else {
        animFrameId = requestAnimationFrame(tick);
      }
    };

    animFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animFrameId);
      clearTimeout(animFrameId);
    };
  }, [gameState, cameraView, currentTrack]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#FAF8F5] select-none">
      {/* Three.js Isolated WebGL Canvas Container */}
      <div
        ref={canvasMountRef}
        data-testid="threejs-canvas-container"
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Title Screen Overlay */}
      {gameState === 'title' && (
        <TitleScreen
          selectedTrackId={selectedTrackId}
          onSelectTrack={handleSelectTrack}
          gameMode={gameMode}
          onSelectGameMode={setGameMode}
          onStartGame={handleStartGame}
        />
      )}

      {/* Active Playing HUD */}
      {gameState === 'playing' && (
        <>
          <GameHUD
            stats={uiStats}
            boat={uiBoat}
            track={currentTrack}
            cameraView={cameraView}
            gameMode={gameMode}
            weather={weather}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            onCycleWeather={handleCycleWeather}
            onTogglePause={() => setGameState('paused')}
            onSwitchCamera={handleSwitchCamera}
            onRestartRace={handleRestartRace}
          />
          <MobileControls onUpdateInput={(updater) => { inputRef.current = updater(inputRef.current); }} />
        </>
      )}

      {/* Paused Modal */}
      {gameState === 'paused' && (
        <PauseModal
          onResume={() => setGameState('playing')}
          onRestart={handleRestartRace}
          onExitToTitle={() => {
            setGameState('title');
            boatRef.current = createInitialBoatState(currentTrack);
            statsRef.current = createInitialRaceStats(currentTrack);
            checkpointIdxRef.current = 0;
          }}
        />
      )}

      {/* Victory / Stage Clear Modal */}
      {gameState === 'gameover' && (
        <VictoryModal
          stats={statsRef.current}
          track={currentTrack}
          onPlayAgain={handleRestartRace}
          onNextTrack={handleNextTrack}
          onExitToTitle={() => {
            setGameState('title');
            boatRef.current = createInitialBoatState(currentTrack);
            statsRef.current = createInitialRaceStats(currentTrack);
            checkpointIdxRef.current = 0;
          }}
        />
      )}
    </div>
  );
}
