import tumbleweedImg from "../assets/tumbleweed-png-tumbleweed-vector-11562851710dk3sfjdg07-removebg-preview.png";

interface LoadingProps {
  className?: string;
  loop?: boolean; // true for continuous looping, false for single play
}

export default function Loading({ className = "", loop = false }: LoadingProps) {
  const animationClass = loop ? 'tumbleweed-loop' : 'tumbleweed';
  return (
    <div className={`tumbleweed-wrapper ${className}`}>
      <img
        src={tumbleweedImg}
        alt="Loading tumbleweed"
        className={animationClass}
      />
    </div>
  );
}
