import React from 'react';

interface BrandLogoProps {
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className = "h-8" }) => {
  return (
    <div className={`flex items-center select-none ${className}`}>
      <svg viewBox="0 0 160 40" className="h-full w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Ícone: F estilizado com Seta */}
        <g strokeLinecap="round" strokeLinejoin="round">
          {/* Haste do F */}
          <path d="M12 32V12C12 7 15 4 20 4H26" stroke="#0f766e" strokeWidth="4" />
          {/* Barra do F */}
          <path d="M8 18H22" stroke="#0f766e" strokeWidth="4" />
          {/* Seta de crescimento (Verde Limão) saindo do F */}
          <path d="M22 18C28 18 32 10 38 4" stroke="#84cc16" strokeWidth="3" />
          <path d="M32 4H38V10" stroke="#84cc16" strokeWidth="3" />
        </g>

        {/* Texto: Flu (Verde Escuro - Brand 700) */}
        <text x="44" y="29" fontFamily="sans-serif" fontWeight="800" fontSize="26" fill="#0f766e" letterSpacing="-1">Flu</text>
        
        {/* Texto: next (Verde Limão - Lime 500) */}
        <text x="82" y="29" fontFamily="sans-serif" fontWeight="500" fontSize="26" fill="#84cc16" letterSpacing="-0.5">next</text>
      </svg>
    </div>
  );
};