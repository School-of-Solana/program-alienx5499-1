import React from "react";
import Image from "next/image";

type LogoProps = {
  className?: string
  size?: number
  title?: string
  variant?: "light" | "dark" // light = white logo (for dark backgrounds), dark = dark logo (for light backgrounds)
}

const Logo: React.FC<LogoProps> = ({ className, size = 28, title = "ZYURA", variant = "light" }) => {
  // For dark variant on light background, we need to invert the white logo to black
  const filterStyle = variant === "dark" 
    ? { filter: "invert(1) brightness(0)" }
    : {};
  
  return (
    <div 
      className={className}
      style={{ 
        display: 'inline-flex',
        width: size,
        height: size,
        minWidth: size,
        maxWidth: size,
        position: 'relative',
        lineHeight: 0,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        ...filterStyle
      }}
    >
      <Image 
        src="/logo.svg"
        alt={title}
        width={size} 
        height={size}
        className="object-contain object-center"
        style={{
          display: 'block',
          width: size,
          height: size,
          objectFit: 'contain',
          objectPosition: 'center'
        }}
        priority
      />
    </div>
  );
}

export { Logo }


