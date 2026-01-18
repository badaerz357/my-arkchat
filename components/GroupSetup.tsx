import React from 'react';
import { Operator } from '../types';

interface GroupSetupProps {
    operators: Operator[];
    selectedIds: string[];
    onToggle: (id: string) => void;
    onClose: () => void;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    t: (key: string) => string;
}

const GroupSetup: React.FC<GroupSetupProps> = ({ 
    operators, 
    selectedIds, 
    onToggle, 
    onClose,
    onSelectAll,
    onDeselectAll,
    t
}) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
            <div className="w-[800px] h-[600px] bg-[#0a0a0a] border border-gray-700 flex flex-col relative shadow-[0_0_50px_rgba(0,0,0,0.8)]">
                {/* Header */}
                <div className="h-16 flex items-center justify-between px-6 border-b border-gray-800 bg-[#121212]">
                    <div className="flex items-center gap-3">
                         <div className="w-8 h-8 bg-yellow-500 flex items-center justify-center">
                             <span className="material-symbols-outlined text-black font-bold">groups</span>
                         </div>
                         <div>
                            <h2 className="text-xl font-bold text-white tracking-widest uppercase">{t('group_setup_title')}</h2>
                            <p className="text-[10px] text-gray-500 font-mono tracking-wider">{t('group_setup_desc')}</p>
                         </div>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white px-4 py-2 hover:bg-white/10 transition-colors uppercase text-[10px] font-bold tracking-widest">
                        [ ESC ] CLOSE
                    </button>
                </div>

                {/* Controls */}
                <div className="p-4 border-b border-gray-800 bg-[#0f0f0f] flex gap-4">
                    <button 
                        onClick={onSelectAll}
                        className="px-4 py-2 border border-gray-700 hover:border-cyan-500 text-xs text-gray-300 hover:text-cyan-500 font-bold uppercase tracking-wider transition-all"
                    >
                        {t('select_all')}
                    </button>
                    <button 
                        onClick={onDeselectAll}
                        className="px-4 py-2 border border-gray-700 hover:border-red-500 text-xs text-gray-300 hover:text-red-500 font-bold uppercase tracking-wider transition-all"
                    >
                        {t('deselect_all')}
                    </button>
                    <div className="ml-auto flex items-center px-4 bg-gray-900 border border-gray-800">
                        <span className="text-[10px] text-gray-500 font-mono">SELECTED: <span className="text-yellow-500 font-bold text-sm ml-2">{selectedIds.length}</span> / {operators.length}</span>
                    </div>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto p-6 bg-[radial-gradient(circle_at_center,#111_0%,#000_100%)]">
                    <div className="grid grid-cols-4 gap-4">
                        {operators.map(op => {
                            const isSelected = selectedIds.includes(op.id);
                            return (
                                <div 
                                    key={op.id}
                                    onClick={() => onToggle(op.id)}
                                    className={`
                                        relative cursor-pointer border transition-all duration-300 group
                                        ${isSelected 
                                            ? 'border-yellow-500 bg-yellow-900/10 opacity-100' 
                                            : 'border-gray-800 bg-[#0a0a0a] opacity-50 hover:opacity-80 hover:border-gray-600'}
                                    `}
                                >
                                    {/* Image */}
                                    <div className="h-32 w-full overflow-hidden relative">
                                        <img 
                                            src={op.tachieUrl || op.avatar} 
                                            className={`w-full h-full object-cover object-top transition-transform duration-500 ${isSelected ? 'scale-110 grayscale-0' : 'scale-100 grayscale'}`}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                                        
                                        {/* Status Indicator */}
                                        <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${isSelected ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : 'bg-gray-800'}`}></div>
                                    </div>

                                    {/* Info */}
                                    <div className="p-3 border-t border-gray-800 bg-[#151515] relative overflow-hidden">
                                        <h3 className={`text-xs font-bold uppercase tracking-wider truncate ${isSelected ? 'text-white' : 'text-gray-500'}`}>{op.name}</h3>
                                        <p className="text-[8px] text-gray-600 font-mono mt-1">{op.id.toUpperCase()}</p>
                                        
                                        {isSelected && (
                                            <div className="absolute inset-0 border-2 border-yellow-500 opacity-20 pointer-events-none"></div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-800 bg-[#0f0f0f] flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-8 py-3 bg-yellow-500 hover:bg-white text-black font-bold uppercase tracking-[0.2em] transition-all shadow-lg text-xs"
                    >
                        {t('confirm_group')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GroupSetup;
