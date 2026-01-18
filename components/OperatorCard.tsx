import React from 'react';
import { Operator } from '../types';

interface OperatorCardProps {
  operator: Operator;
  isActive: boolean;
  onClick: () => void;
  status?: 'online' | 'busy' | 'offline';
  t: (key: string) => string;
}

const OperatorCard: React.FC<OperatorCardProps> = ({ operator, isActive, onClick, status = 'online', t }) => {
  return (
    <div 
      onClick={onClick}
      className={`
        relative flex items-center p-3 mb-2 cursor-pointer transition-all duration-300
        border-l-4 hover:bg-white/5
        ${isActive 
          ? 'border-cyan-500 bg-cyan-900/20' 
          : 'border-transparent text-gray-400 hover:text-white'}
      `}
    >
      <div className="relative w-12 h-12 mr-3">
        <div className="absolute inset-0 bg-gray-800 rhombus-clip">
            <img 
                src={operator.avatar} 
                alt={operator.name}
                className="w-full h-full object-cover opacity-80"
            />
        </div>
        {/* Status dot */}
        <div className={`
            absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-black
            ${status === 'online' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-gray-500'}
        `} />
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-bold tracking-wider text-sm uppercase truncate font-['JetBrains_Mono']">
          {operator.name}
        </h4>
        <p className="text-[10px] text-gray-500 truncate uppercase tracking-widest">
            {isActive ? t('connected') : t('standby')}
        </p>
      </div>
      
      {/* Decorative scanline on active */}
      {isActive && (
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent pointer-events-none" />
      )}
    </div>
  );
};

export default OperatorCard;
