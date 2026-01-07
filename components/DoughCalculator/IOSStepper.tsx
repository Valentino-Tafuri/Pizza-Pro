import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface IOSStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  label?: string;
  sublabel?: string;
  disabled?: boolean;
}

export const IOSStepper: React.FC<IOSStepperProps> = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 0.5,
  unit = '%',
  label,
  sublabel,
  disabled = false
}) => {
  const handleDecrement = () => {
    const newValue = Math.max(min, value - step);
    onChange(parseFloat(newValue.toFixed(2)));
  };

  const handleIncrement = () => {
    const newValue = Math.min(max, value + step);
    onChange(parseFloat(newValue.toFixed(2)));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value) || 0;
    onChange(Math.max(min, Math.min(max, newValue)));
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    onChange(parseFloat(newValue.toFixed(step < 1 ? 2 : 0)));
  };

  // Calcola la percentuale per il range slider
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className={`${disabled ? 'opacity-50' : ''}`}>
      <div className={`flex items-center justify-between p-4 bg-gray-50 rounded-2xl`}>
        <div className="flex-1">
          {label && (
            <p className="text-sm font-bold text-gray-900">{label}</p>
          )}
          {sublabel && (
            <p className="text-xs text-gray-500 font-medium mt-0.5">{sublabel}</p>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Stepper Container - iOS Style */}
          <div className="flex items-center bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Decrement Button */}
            <button
              type="button"
              onClick={handleDecrement}
              disabled={disabled || value <= min}
              className="w-11 h-11 flex items-center justify-center text-blue-600 hover:bg-gray-50 active:bg-gray-100 disabled:text-gray-300 disabled:hover:bg-white transition-colors border-r border-gray-200"
            >
              <Minus size={18} strokeWidth={2.5} />
            </button>

            {/* Value Display / Input */}
            <div className="w-20 h-11 flex items-center justify-center">
              <input
                type="number"
                value={value}
                onChange={handleInputChange}
                disabled={disabled}
                min={min}
                max={max}
                step={step}
                className="w-full h-full text-center text-base font-bold text-gray-900 bg-transparent focus:outline-none focus:bg-blue-50 disabled:bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            {/* Increment Button */}
            <button
              type="button"
              onClick={handleIncrement}
              disabled={disabled || value >= max}
              className="w-11 h-11 flex items-center justify-center text-blue-600 hover:bg-gray-50 active:bg-gray-100 disabled:text-gray-300 disabled:hover:bg-white transition-colors border-l border-gray-200"
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>
          </div>

          {/* Unit */}
          <span className="text-sm font-bold text-gray-500 w-8">{unit}</span>
        </div>
      </div>

      {/* Slider Bar - iOS Style - Integrato sotto la barra principale */}
      <div className="px-4 pt-2 pb-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleSliderChange}
          disabled={disabled}
          className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-ios"
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`
          }}
        />
        <style>{`
          .slider-ios::-webkit-slider-thumb {
            appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #3b82f6;
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            transition: all 0.2s;
          }
          .slider-ios::-webkit-slider-thumb:hover {
            transform: scale(1.1);
            box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
          }
          .slider-ios::-webkit-slider-thumb:active {
            transform: scale(1.15);
          }
          .slider-ios::-moz-range-thumb {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #3b82f6;
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            transition: all 0.2s;
          }
          .slider-ios::-moz-range-thumb:hover {
            transform: scale(1.1);
            box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
          }
          .slider-ios:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          .slider-ios:disabled::-webkit-slider-thumb {
            cursor: not-allowed;
          }
          .slider-ios:disabled::-moz-range-thumb {
            cursor: not-allowed;
          }
        `}</style>
      </div>
    </div>
  );
};

export default IOSStepper;
