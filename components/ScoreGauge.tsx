import React from 'react';

interface ScoreGaugeProps {
  score: number;
  label: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score, label, size = 'md' }) => {
  // Color based on score
  let colorClass = 'text-red-500';
  let bgClass = 'bg-red-100';
  let strokeClass = 'stroke-red-500';
  
  if (score >= 90) {
    colorClass = 'text-green-500';
    bgClass = 'bg-green-100';
    strokeClass = 'stroke-green-500';
  } else if (score >= 50) {
    colorClass = 'text-orange-500';
    bgClass = 'bg-orange-100';
    strokeClass = 'stroke-orange-500';
  }

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'w-32 h-32',
    lg: 'w-48 h-48',
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div className={`relative ${sizeClasses[size]}`}>
        {/* Background Circle */}
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="8"
            className="text-gray-200"
          />
          {/* Progress Circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={`${strokeClass} transition-all duration-1000 ease-out`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <span className={`text-3xl font-bold ${colorClass}`}>{score}</span>
        </div>
      </div>
      <p className="mt-2 text-sm font-medium text-gray-600 uppercase tracking-wide">{label}</p>
    </div>
  );
};