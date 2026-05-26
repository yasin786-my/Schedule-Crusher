import React from 'react';
import { SpotlightCard } from '../reactbits/SpotlightCard';

export interface UnitData {
  name: string;
  importance: number;
  total_points: number;
}

interface UnitFormProps {
  unit: UnitData;
  index: number;
  onChange: (index: number, field: keyof UnitData, value: string | number) => void;
}

export const UnitForm: React.FC<UnitFormProps> = ({ unit, index, onChange }) => {
  // Calculate color based on importance
  const getGradient = (value: number) => {
    if (value <= 3) return 'from-green-500 to-green-400';
    if (value <= 6) return 'from-yellow-500 to-yellow-400';
    return 'from-red-500 to-red-400';
  };

  return (
    <SpotlightCard className="p-5 mb-4">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-8 h-8 rounded bg-gradient-to-br ${getGradient(unit.importance)} flex items-center justify-center font-bold text-white shadow-lg`}>
          {index + 1}
        </div>
        <h4 className="font-bold text-lg text-white">Unit {index + 1}</h4>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-surface-400 mb-1">Topic / Name</label>
          <input 
            type="text" 
            value={unit.name}
            onChange={(e) => onChange(index, 'name', e.target.value)}
            className="w-full px-3 py-2 bg-surface-900 border border-surface-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 text-white text-sm"
            placeholder={`E.g., ${index === 0 ? 'Introduction' : 'Advanced Concepts'}`}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1 flex justify-between">
              <span>Importance (1-10)</span>
              <span className="font-bold text-white">{unit.importance}</span>
            </label>
            <input 
              type="range" 
              min="1" max="10" 
              value={unit.importance}
              onChange={(e) => onChange(index, 'importance', parseInt(e.target.value))}
              className="w-full accent-primary-500 h-2 bg-surface-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1">Break Points</label>
            <input 
              type="number" 
              min="1" max="70" 
              value={unit.total_points}
              onChange={(e) => onChange(index, 'total_points', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-surface-900 border border-surface-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 text-white text-sm"
              required
            />
          </div>
        </div>
      </div>
    </SpotlightCard>
  );
};
