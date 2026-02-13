const LandscapeScene = () => {
  return (
    <div className="relative w-full h-[70vh] min-h-[500px] overflow-hidden">
      <svg
        viewBox="0 0 1440 700"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Sky gradient */}
          <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(250, 35%, 25%)" />
            <stop offset="40%" stopColor="hsl(280, 30%, 40%)" />
            <stop offset="70%" stopColor="hsl(20, 80%, 55%)" />
            <stop offset="100%" stopColor="hsl(40, 95%, 65%)" />
          </linearGradient>

          {/* Water gradient */}
          <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(32, 70%, 45%)" />
            <stop offset="50%" stopColor="hsl(260, 25%, 30%)" />
            <stop offset="100%" stopColor="hsl(250, 30%, 18%)" />
          </linearGradient>

          {/* Sun glow */}
          <radialGradient id="sunGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="hsl(45, 100%, 90%)" />
            <stop offset="40%" stopColor="hsl(40, 95%, 65%)" />
            <stop offset="100%" stopColor="hsl(40, 95%, 65%)" stopOpacity="0" />
          </radialGradient>

          {/* Sun reflection on water */}
          <linearGradient id="sunReflection" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(40, 95%, 70%)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="hsl(40, 95%, 65%)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Sky */}
        <rect x="0" y="0" width="1440" height="700" fill="url(#skyGrad)" />

        {/* Sun with glow */}
        <g className="animate-sun-pulse">
          <circle cx="720" cy="320" r="80" fill="url(#sunGlow)" />
          <circle cx="720" cy="320" r="35" fill="hsl(45, 100%, 88%)" />
        </g>

        {/* Far mountains */}
        <path
          d="M0 420 L120 340 L200 370 L320 300 L440 350 L520 310 L650 360 L720 290 L800 340 L900 310 L1000 350 L1100 300 L1200 340 L1300 310 L1440 360 L1440 700 L0 700Z"
          fill="hsl(260, 25%, 32%)"
          opacity="0.7"
        />

        {/* Mid mountains */}
        <path
          d="M0 450 L100 390 L220 420 L350 370 L450 410 L580 360 L680 400 L780 370 L880 410 L1000 380 L1100 400 L1250 370 L1350 400 L1440 380 L1440 700 L0 700Z"
          fill="hsl(260, 22%, 24%)"
          opacity="0.85"
        />

        {/* Near mountains / cliffs */}
        <path
          d="M0 480 L80 440 L180 460 L280 430 L380 455 L500 420 L600 450 L720 430 L840 460 L960 435 L1060 455 L1160 425 L1280 450 L1380 435 L1440 450 L1440 700 L0 700Z"
          fill="hsl(30, 18%, 14%)"
        />

        {/* Water */}
        <rect x="0" y="460" width="1440" height="240" fill="url(#waterGrad)" />

        {/* Sun reflection on water */}
        <ellipse cx="720" cy="480" rx="60" ry="200" fill="url(#sunReflection)" />

        {/* Water shimmer lines */}
        {[480, 510, 540, 570, 600, 630].map((y, i) => (
          <line
            key={i}
            x1={620 + i * 10}
            y1={y}
            x2={820 - i * 10}
            y2={y}
            stroke="hsl(40, 95%, 75%)"
            strokeWidth="1"
            opacity="0.3"
            className="animate-shimmer"
            style={{ animationDelay: `${i * 0.5}s` }}
          />
        ))}

        {/* Animated birds */}
        <g className="animate-bird" opacity="0.6">
          <path d="M0 0 Q5 -5 10 0 Q15 -5 20 0" stroke="hsl(30, 20%, 20%)" strokeWidth="1.5" fill="none" transform="translate(0, 280)" />
        </g>
        <g className="animate-bird-delay" opacity="0.5">
          <path d="M0 0 Q4 -4 8 0 Q12 -4 16 0" stroke="hsl(30, 20%, 25%)" strokeWidth="1.2" fill="none" transform="translate(0, 260)" />
        </g>

        {/* Animated sailboat */}
        <g className="animate-sail">
          <g className="animate-bob">
            {/* Hull */}
            <path d="M-20 0 Q-15 8 0 10 Q15 8 20 0Z" fill="hsl(25, 30%, 18%)" transform="translate(0, 475)" />
            {/* Mast */}
            <line x1="0" y1="475" x2="0" y2="445" stroke="hsl(25, 25%, 25%)" strokeWidth="1.5" />
            {/* Sail */}
            <path d="M0 448 L15 470 L0 472Z" fill="hsl(35, 40%, 75%)" opacity="0.9" />
            <path d="M0 450 L-10 468 L0 472Z" fill="hsl(35, 30%, 65%)" opacity="0.8" />
          </g>
        </g>

        {/* Foreground dark silhouette - left cliff */}
        <path
          d="M0 700 L0 400 L30 380 L60 420 L90 390 L110 430 L130 500 L150 700Z"
          fill="hsl(30, 20%, 8%)"
        />

        {/* Foreground dark silhouette - right rocks */}
        <path
          d="M1440 700 L1440 430 L1410 410 L1380 440 L1350 420 L1330 460 L1310 500 L1290 700Z"
          fill="hsl(30, 20%, 8%)"
        />

        {/* Pine tree silhouettes on left */}
        <g fill="hsl(30, 20%, 8%)">
          <polygon points="45,400 55,400 50,365" />
          <polygon points="42,410 58,410 50,380" />
          <polygon points="70,420 82,420 76,385" />
          <polygon points="67,430 85,430 76,400" />
        </g>
      </svg>

      {/* Overlay text */}
      <div className="absolute inset-0 flex items-end justify-center pb-20">
        <div className="text-center">
          <h1 className="font-display text-5xl md:text-7xl font-bold text-foreground animate-float-up tracking-tight">
            Hello, I'm <span className="text-gradient-warm">Your Name</span>
          </h1>
          <p className="font-body text-lg md:text-xl text-muted-foreground mt-4 animate-float-up-delay-1">
            Developer · Creator · Explorer
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandscapeScene;
