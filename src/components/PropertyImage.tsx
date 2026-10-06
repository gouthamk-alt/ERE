import React, { useState } from 'react';
import { Building2 } from 'lucide-react';

interface PropertyImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export const PropertyImage: React.FC<PropertyImageProps> = ({
  src,
  alt,
  className = 'w-full h-full object-cover',
  fallbackLabel = 'Exceptional Real Estate',
}) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#000000] text-white p-6 text-center border border-[#302f2f] ${className}`}
      >
        <Building2 className="w-8 h-8 text-white/70 mb-2" />
        <span className="font-cormorant text-lg tracking-wide text-white">
          {fallbackLabel}
        </span>
        <span className="text-xs text-white/60 mt-1 font-montserrat">
          2/28 Kintail Road, Applecross 6153
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
};
