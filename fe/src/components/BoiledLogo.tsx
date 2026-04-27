const oswald = "'Oswald', sans-serif";

interface BoiledLogoProps {
  size?: 'sm' | 'lg';
}

export default function BoiledLogo({ size = 'sm' }: BoiledLogoProps) {
  if (size === 'lg') {
    return (
      <div className="flex flex-col items-center leading-none gap-1">
        <span style={{ fontFamily: oswald, fontWeight: 700, fontSize: '112px', color: '#fff', lineHeight: 1, letterSpacing: '-1px' }}>
          BOILED
        </span>
        <span style={{ fontFamily: oswald, fontWeight: 600, fontSize: '20px', color: '#fff', lineHeight: 1 }}>
          The University of Tokyo Street Dance Circle
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center leading-none gap-[3px]">
      <span style={{ fontFamily: oswald, fontWeight: 700, fontSize: '26px', color: '#fff', lineHeight: 1, letterSpacing: '-0.5px' }}>
        BOILED
      </span>
      <span style={{ fontFamily: oswald, fontWeight: 600, fontSize: '6px', color: '#fff', lineHeight: 1 }}>
        The University of Tokyo Street Dance Circle
      </span>
    </div>
  );
}
