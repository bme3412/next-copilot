'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

const Particle = ({ index }) => {
  const [styles, setStyles] = useState({
    width: '3px',
    height: '3px',
    left: '50%',
    top: '50%',
    animation: 'float 15s linear infinite'
  });

  useEffect(() => {
    setStyles({
      width: `${Math.random() * 4 + 2}px`,
      height: `${Math.random() * 4 + 2}px`,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animation: `float ${Math.random() * 10 + 10}s linear infinite`
    });
  }, []);

  return (
    <div
      className="absolute rounded-full bg-blue-500/20"
      style={styles}
    />
  );
};

const RippleCircle = ({ index, mounted }) => (
  <div
    className={`absolute inset-0 border border-blue-500/20 rounded-full transition-all duration-1000 ${
      mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
    }`}
    style={{
      animation: `ripple 8s infinite ease-out ${index * 1}s`,
      transform: `scale(${0.5 + index * 0.15})`
    }}
  />
);

const LandingPage = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 relative overflow-hidden">
      {/* Animated particles */}
      <div className="absolute inset-0">
        {Array.from({ length: 20 }).map((_, i) => (
          <Particle key={i} index={i} />
        ))}
      </div>

      {/* Main circles background */}
      <div className="absolute inset-0 flex justify-center items-center">
        <div className="w-[800px] h-[800px]">
          {Array.from({ length: 4 }).map((_, i) => (
            <RippleCircle key={i} index={i} mounted={mounted} />
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <h1 
          className={`text-7xl md:text-8xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-600 mb-4 transition-all duration-1000 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          Clarity 2.0
        </h1>
        <div className={`space-y-4 mb-12 transition-all duration-1000 delay-300 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <p className="text-2xl md:text-3xl text-blue-100 font-semibold">
            AI-Powered Tech Investment Analysis
          </p>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Get instant, in-depth analysis of tech giants' performance, trends, and strategic moves.
          </p>
        </div>

        {/* Action Buttons */}
        <div 
          className={`flex flex-col sm:flex-row gap-4 mb-16 transition-all duration-1000 delay-500 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <Link
            href="/chat"
            className="group relative px-8 py-4 bg-blue-600 text-white rounded-full text-lg font-medium overflow-hidden transition-all hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30"
          >
            <span className="relative z-10">Analyze Now</span>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-700 transform transition-transform group-hover:scale-105" />
          </Link>
          <Link
            href="/companies"
            className="group px-8 py-4 bg-transparent text-white rounded-full text-lg font-medium border border-gray-700 hover:border-blue-500 transition-all hover:scale-105 hover:shadow-lg hover:shadow-blue-500/10"
          >
            How I made this
          </Link>
        </div>

        {/* Feature Grid */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto transition-all duration-1000 delay-700 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className="p-6 bg-gray-900/30 backdrop-blur-sm rounded-xl border border-gray-800 text-left">
            <div className="text-blue-400 text-xl mb-2">Financial Intelligence</div>
            <p className="text-gray-400">Deep analysis of quarterly results, revenue trends, and key metrics in seconds</p>
          </div>
          <div className="p-6 bg-gray-900/30 backdrop-blur-sm rounded-xl border border-gray-800 text-left">
            <div className="text-blue-400 text-xl mb-2">Strategic Insights</div>
            <p className="text-gray-400">AI initiatives, cloud developments, and competitive positioning decoded</p>
          </div>
          <div className="p-6 bg-gray-900/30 backdrop-blur-sm rounded-xl border border-gray-800 text-left">
            <div className="text-blue-400 text-xl mb-2">Market Impact</div>
            <p className="text-gray-400">Industry trends, market share dynamics, and growth trajectory analysis</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes ripple {
          0% {
            transform: scale(1);
            opacity: 0.4;
          }
          50% {
            opacity: 0.2;
          }
          100% {
            transform: scale(1.2);
            opacity: 0.4;
          }
        }
        @keyframes float {
          0% {
            transform: translateY(0) translateX(0);
          }
          33% {
            transform: translateY(-10px) translateX(10px);
          }
          66% {
            transform: translateY(10px) translateX(-10px);
          }
          100% {
            transform: translateY(0) translateX(0);
          }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;