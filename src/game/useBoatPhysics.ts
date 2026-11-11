import { useRef, useCallback, useEffect } from 'react';
import { BoatInput, BoatState, TrackData } from './types';
import { updateBoatPhysics } from './physics';

export interface UseBoatPhysicsOptions {
  track: TrackData;
  initialBoat: BoatState;
  onCollision?: (event: { type: 'bank' | 'obstacle' | 'checkpoint'; intensity: number }) => void;
}

/**
 * Custom hook providing tactile, weighted boat physics and responsive WASD controls
 */
export function useBoatPhysics({ initialBoat }: UseBoatPhysicsOptions) {
  const boatRef = useRef<BoatState>(initialBoat);
  const inputRef = useRef<BoatInput>({ throttle: 0, steer: 0, brake: 0, drift: false });
  const keysPressedRef = useRef<Set<string>>(new Set());

  // Reset physics to a given state
  const resetBoat = useCallback((newBoat: BoatState) => {
    boatRef.current = { ...newBoat };
    inputRef.current = { throttle: 0, steer: 0, brake: 0, drift: false };
    keysPressedRef.current.clear();
  }, []);

  // Update input directly (e.g. from touch controls)
  const setInput = useCallback((updater: (prev: BoatInput) => BoatInput) => {
    inputRef.current = updater(inputRef.current);
  }, []);

  // Physics simulation step
  const stepPhysics = useCallback((dt: number, time: number) => {
    const { nextState, collisionEvents } = updateBoatPhysics(
      boatRef.current,
      inputRef.current,
      dt,
      time
    );
    boatRef.current = nextState;
    return { boat: nextState, collisionEvents };
  }, []);

  // Listen for keyboard controls
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
      if (['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        keysPressedRef.current.add(e.code);
        updateInputFromKeys();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (keysPressedRef.current.has(e.code)) {
        keysPressedRef.current.delete(e.code);
        updateInputFromKeys();
      }
    };

    const handleBlur = () => {
      keysPressedRef.current.clear();
      inputRef.current = { throttle: 0, steer: 0, brake: 0, drift: false };
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  return {
    boatRef,
    inputRef,
    resetBoat,
    setInput,
    stepPhysics,
  };
}
