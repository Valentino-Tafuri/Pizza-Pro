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

  return (
    <div className={`flex items-center justify-between p-4 bg-gray-50 rounded-2xl ${disabled ? 'opacity-50' : ''}`}>
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
  );
};

export default IOSStepper;
