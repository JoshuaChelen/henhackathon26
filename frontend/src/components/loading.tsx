import React from "react";
import tumbleweedImg from "../assets/tumbleweed-png-tumbleweed-vector-11562851710dk3sfjdg07-removebg-preview.png";

interface LoadingProps {
  // optional: allow overriding animation duration or vertical position later
  className?: string;
}

export default function Loading({ className = "" }: LoadingProps) {
  return (
    <div className={`tumbleweed-wrapper ${className}`}>
      <img
        src={tumbleweedImg}
        alt="Loading tumbleweed"
        className="tumbleweed"
      />
    </div>
  );
}
