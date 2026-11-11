import React from 'react';
import { BoatInput } from '../game/types';

interface MobileControlsProps {
  onUpdateInput: (updater: (prev: BoatInput) => BoatInput) => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({ onUpdateInput }) => {
  return (
    <div className="fixed bottom-24 inset-x-4 md:hidden pointer-events-none z-15 flex justify-between select-none">
      {/* Left / Right Steering Buttons */}
      <div className="flex gap-2 pointer-events-auto">
        <button
          type="button"
          aria-label="Steer Left"
          onTouchStart={(e) => { e.preventDefault(); onUpdateInput(prev => ({ ...prev, steer: -1 })); }}
          onTouchEnd={(e) => { e.preventDefault(); onUpdateInput(prev => ({ ...prev, steer: 0 })); }}
          onMouseDown={(e) => { e.preventDefault(); onUpdateInput(prev => ({ ...prev, steer: -1 })); }}
          onMouseUp={(e) => { e.preventDefault(); onUpdateInput(prev => ({ ...prev, steer: 0 })); }}
          className="w-14 h-14 rounded-2xl bg-[#FAF8F5]/90 border border-[#E8DFC8] active:bg-[#0D4F6C] active:text-white shadow-md flex items-center justify-center text-[#2C2723] font-bold text-xl cursor-pointer"
        >
          ◀
        </button>
        <button
          type="button"
          aria-label="Steer Right"
          onTouchStart={(e) => { e.preventDefault(); onUpdateInput(prev => ({ ...prev, steer: 1 })); }}
          onTouchEnd={(e) => { e.preventDefault(); onUpdateInput(prev => ({ ...prev, steer: 0 })); }}
          onMouseDown={(e) => { e.preventDefault(); onUpdateInput(prev => ({ ...prev, steer: 1 })); }}
          onMouseUp={(e) => { e.preventDefault(); onUpdateInput(prev => ({ ...prev, steer: 0 })); }}
          className="w-14 h-14 rounded-2xl bg-[#FAF8F5]/90 border border-[#E8DFC8] active:bg-[#0D4F6C] active:text-white shadow-md flex items-center justify-center text-[#2C2723] font-bold text-xl cursor-pointer"
        >
          ▶
        </button>
      </div>

      {/* Accelerate & Drift Buttons */}
      <div className="flex gap-2 pointer-events-auto">
        <button
          type="button"
          aria-label="Brake and Drift"
          onTouchStart={(e) => { e.preventDefault(); onUpdateInput(prev => ({ ...prev, brake: 1, drift: true })); }}
          onTouchEnd={(e) => { e.preventDefault(); onUpdateInput(prev => ({ ...prev, brake: 0, drift: false })); }}
          onMouseDown={(e) => { e.preventDefault(); onUpdateInput(prev => ({ ...prev, brake: 1, drift: true })); }}
          onMouseUp={(e) => { e.preventDefault(); onUpdateInput(prev => ({ ...prev, brake: 0, drift: false })); }}
          className="w-14 h-14 rounded-2xl bg-[#E87A5D]/90 border border-[#D97724] active:bg-[#C2410C] text-white shadow-md flex flex-col items-center justify-center font-bold text-xs uppercase cursor-pointer"
        >
          <span>DRIFT</span>
        </button>
        <button
          type="button"
          aria-label="Accelerate Forward"
          onTouchStart={(e) => { e.preventDefault(); onUpdateInput(prev => ({ ...prev, throttle: 1 })); }}
          onTouchEnd={(e) => { e.preventDefault(); onUpdateInput(prev => ({ ...prev, throttle: 0 })); }}
          onMouseDown={(e) => { e.preventDefault(); onUpdateInput(prev => ({ ...prev, throttle: 1 })); }}
          onMouseUp={(e) => { e.preventDefault(); onUpdateInput(prev => ({ ...prev, throttle: 0 })); }}
          className="w-14 h-14 rounded-2xl bg-[#0D4F6C]/90 border border-[#0D4F6C] active:bg-[#083344] text-white shadow-md flex items-center justify-center font-bold text-xl cursor-pointer"
        >
          ▲
        </button>
      </div>
    </div>
  );
};
