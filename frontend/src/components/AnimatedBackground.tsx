
import { useEffect, useState } from 'react';


export default function AnimatedBackground(props) {
  // Detect dark mode (system and manual toggle)
  const [dark, setDark] = useState(false); // default to false, update in useEffect
  useEffect(() => {
    // Only run on client
    const update = () => setDark(document.documentElement.classList.contains('dark'));
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Day and night color palettes
  const colors = dark
    ? {
        sky1: '#2a2d4a', // deep night blue
        sky2: '#3a3e5c', // mid night blue
        sky3: '#4b4e6b', // lighter night blue
        sun: '#e6e6fa', // pale moon
        sunGlow: '#e6e6fa',
        spokes: '#bfcfff',
        ground: '#3b2330', // dark brown
      }
    : {
        sky1: '#f2a85b',
        sky2: '#fac071',
        sky3: '#f9d594',
        sun: '#ffe7b5',
        sunGlow: '#ffe7b5',
        spokes: '#ffd173',
        ground: '#d7813b',
      };

  return (
    <svg
      width="100vw"
      height="100vh"
      viewBox="0 0 1920 1080"
      preserveAspectRatio="xMidYMid slice"
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: -1,
        pointerEvents: 'none',
        userSelect: 'none',
        width: '100vw',
        height: '100vh',
        minHeight: 0,
        minWidth: 0,
      }}
      aria-hidden="true"
      {...props}
    >
      <defs>
        <linearGradient id="linearGradient23">
          <stop style={{ stopColor: colors.sunGlow, stopOpacity: 1 }} offset="0" />
          <stop style={{ stopColor: colors.sunGlow, stopOpacity: 0.98 }} offset="1" />
        </linearGradient>
        <radialGradient id="radialGradient24" cx="1053.324" cy="725.74774" r="216.24013" gradientUnits="userSpaceOnUse">
          <stop style={{ stopColor: colors.sunGlow, stopOpacity: 1 }} offset="0" />
          <stop style={{ stopColor: colors.sunGlow, stopOpacity: 0.98 }} offset="1" />
        </radialGradient>
        <filter id="filter26" x="-0.338" y="-0.338" width="1.676" height="1.676">
          <feGaussianBlur stdDeviation="97.3" />
        </filter>
      </defs>
      <g>
        <path style={{ fill: colors.sky3 }} d="M 0.35,453.74 H 1919.65 V 992.5 H 0.35 Z" />
        <path style={{ fill: colors.sky2 }} d="m 0.25,270.25 1297.39,-60.95 621.86,60.15 0.25,270.3 -505.08,102.62 c -78.12,15.87 -158.78,14.32 -236.24,-4.55 L 745.15,532.28 C 646.07,508.15 543.72,500.29 442.11,509.03 L 84.70,539.76 c -23.78,2.05 -46.89,-8.60 -60.79,-28.00 L 0.44,480.97 Z" />
        <path style={{ fill: colors.sky1 }} d="M 0.25,0.25 H 1919.75 V 269.75 l -454.00,-26.70 a 1651.29,1651.29 176.72 0 0 -381.70,21.89 L 589.33,351.55 A 879.48,879.48 3.75 0 1 174.37,324.38 L 0.25,269.75 Z" />
      </g>
      {/* Sun's glow (always visible, color changes for night/day) */}
      <circle style={{ fill: colors.sunGlow, fillOpacity: 0.8, filter: 'url(#filter26)' }} cx="1053.32" cy="725.75" r="345.36" />
      {/* Sun and spokes (day only) */}
      {!dark && (
        <>
          <path
            className="spokes-spin"
            style={{ fill: colors.spokes, fillOpacity: 0.8 }}
            d="m 1309.44,962.63 -165.22,-84.24 -0.14,185.46 -93.45,-160.19 -100.38,155.94 7.99,-185.29 -168.76,76.91 106.90,-151.55 -183.55,-26.53 171.86,-69.70 -140.07,-121.56 182.26,34.28 -52.11,-177.98 134.80,127.38 52.38,-177.91 44.53,180.03 140.25,-121.34 -59.87,175.53 183.59,-26.25 -145.26,115.30 168.64,77.17 -184.54,18.46 z"
          />
          <circle style={{ fill: 'url(#radialGradient24)' }} cx="1053.32" cy="725.75" r="215.74" />
        </>
      )}
      {/* Moon and spots (night only) */}
      {dark && (
        <>
          {/* Moon main shape */}
          <path
            id="moon"
            style={{ fill: '#b6e6f0', fillOpacity: 1, stroke: 'none', strokeWidth: 1.00157 }}
            d="m 1048.4521,510.88859 c -275.61716,-8e-5 -279.25627,431.47854 0,431.47852 119.1494,-3e-5 215.7383,-96.58887 215.7383,-215.73828 0,-25.05491 -22.3785,19.92889 -57.0781,60.66015 -23.8852,28.03702 -77.7349,57.996 -114.3243,61.96485 -1.7132,0.18583 -3.4293,0.35397 -5.1445,0.50586 -55.9749,4.95661 -124.17907,-55.57041 -135.45699,-111.02149 -2.22057,-10.91808 -4.12216,-21.97073 -5.57812,-32.70898 -4.64459,-34.25564 9.1268,-89.25792 32.20703,-114.64649 36.21618,-39.83838 86.05388,-80.49413 69.63668,-80.49414 z"
          />
          {/* Moon spot 1 */}
          <path
            id="moon-spot1"
            style={{ fill: '#aed3db', strokeWidth: 1.23724 }}
            d="m 853.3582,720.47 c -3.64232,0 -11.51396,-0.12165 -12.1497,-2.5878 -0.74759,-2.90005 -0.39644,-7.1073 0.0806,-12.66332 0.39766,-4.63152 0.54839,-11.41466 2.33648,-14.68804 1.59357,-2.91727 5.3657,-3.74506 9.73266,-3.74506 22.02259,0 22.02261,33.68422 0,33.68422 z"
          />
          {/* Moon spot 2 */}
          <path
            id="moon-spot2"
            style={{ fill: '#aed3db', strokeWidth: 1.00157 }}
            d="m 928.72179,676.09021 a 13.634086,13.634086 0 0 1 -13.63408,13.63409 13.634086,13.634086 0 0 1 -13.63409,-13.63409 13.634086,13.634086 0 0 1 13.63409,-13.63409 13.634086,13.634086 0 0 1 13.63408,13.63409 z"
          />
          {/* Moon spot 3 */}
          <path
            id="moon-spot3"
            style={{ fill: '#aed3db', strokeWidth: 1.82639 }}
            d="m 939.06484,731.66404 a 24.862156,24.862156 0 0 1 -24.86216,24.86216 24.862156,24.862156 0 0 1 -24.86216,-24.86216 24.862156,24.862156 0 0 1 24.86216,-24.86215 24.862156,24.862156 0 0 1 24.86216,24.86215 z"
          />
        </>
      )}
      <g>
        <path style={{ fill: colors.ground }} d="M 0.25,810.25 148.13,720.56 a 109.33,109.33 6.22 0 1 132.20,14.41 l 102.95,98.30 a 361.67,361.67 31.85 0 0 125.95,78.24 l 52.95,19.29 a 415.90,415.90 3.44 0 0 236.89,14.25 L 968.89,905.41 A 796.09,796.09 172.50 0 1 1123.87,885.00 l 49.71,-1.62 A 266.84,266.84 160.05 0 0 1329.31,826.85 l 34.79,-27.22 a 167.82,167.82 173.50 0 1 174.42,-19.88 l 180.09,84.11 a 121.87,121.87 7.42 0 0 73.12,9.53 L 1920,850.35 1919.75,1079.75 H 0.25 Z" />
      </g>
    </svg>
  );
}
