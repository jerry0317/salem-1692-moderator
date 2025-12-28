import React from 'react';
import { Card, CardType } from '../types';

interface CardDisplayProps {
  card: Card;
  onClick?: () => void;
  selectable?: boolean;
  selected?: boolean;
  hidden?: boolean;
}

const CardDisplay: React.FC<CardDisplayProps> = ({ 
  card, 
  onClick, 
  selectable = false, 
  selected = false,
  hidden = false 
}) => {
  
  if (hidden && !card.isRevealed) {
    return (
      <div 
        onClick={selectable ? onClick : undefined}
        className={`
          relative w-24 h-36 rounded-xl border-2 transition-transform duration-300
          ${selectable ? 'cursor-pointer hover:-translate-y-2' : ''}
          ${selected ? 'border-yellow-400 ring-2 ring-yellow-400/50 -translate-y-2' : 'border-slate-700 bg-slate-800'}
          flex items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]
        `}
      >
        <div className="text-4xl opacity-20">?</div>
      </div>
    );
  }

  const isWitch = card.type === CardType.WITCH;
  const isConstable = card.type === CardType.CONSTABLE;
  const isRevealed = card.isRevealed;

  let bgColor = "bg-slate-200";
  let textColor = "text-slate-900";
  let borderColor = "border-slate-300";

  if (isWitch) {
    bgColor = "bg-purple-900";
    textColor = "text-purple-100";
    borderColor = "border-purple-500";
  } else if (isConstable) {
    bgColor = "bg-blue-900";
    textColor = "text-blue-100";
    borderColor = "border-blue-500";
  }

  return (
    <div 
      onClick={selectable ? onClick : undefined}
      className={`
        relative w-24 h-36 rounded-xl border-2 p-2 flex flex-col items-center justify-between text-center shadow-lg transition-transform duration-300
        ${bgColor} ${borderColor} ${textColor}
        ${selectable ? 'cursor-pointer hover:-translate-y-2' : ''}
        ${selected ? 'ring-4 ring-yellow-400 scale-105' : ''}
        ${isRevealed ? 'opacity-100' : 'opacity-80 grayscale'}
      `}
    >
        <div className="text-xs font-bold tracking-widest uppercase mb-1">
            {isRevealed ? 'REVEALED' : 'HIDDEN'}
        </div>
        <div className="text-sm font-bold leading-tight">
             {card.type.replace(/_/g, ' ')}
        </div>
        {isWitch && <div className="text-2xl">🧙‍♀️</div>}
        {isConstable && <div className="text-2xl">🛡️</div>}
        {!isWitch && !isConstable && <div className="text-2xl">🏘️</div>}
    </div>
  );
};

export default CardDisplay;
