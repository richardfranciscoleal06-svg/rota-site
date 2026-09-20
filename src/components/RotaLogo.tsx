interface RotaLogoProps {
  className?: string;
  size?: number;
}

export default function RotaLogo({ className = '', size = 40 }: RotaLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Logo da ROTA"
      role="img"
    >
      <rect x="2" y="2" width="116" height="116" rx="22" fill="#F5F5F5" stroke="#0B0B0B" strokeWidth="6"/>
      <path
        d="M26 22H60C78 22 90 31 90 46C90 58 82 67 69 71L92 98H77L58 78H39V98H26V22ZM39 35V65H59C68 65 75 60 75 49C75 38 68 35 59 35H39Z"
        fill="#0B0B0B"
      />
      <path d="M55 35L71 98H60L49 75H44L55 35Z" fill="#0B0B0B"/>
    </svg>
  );
}
