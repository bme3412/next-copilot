'use client';

import ChatInterface from '../../components/ChatInterface'
import Link from 'next/link';

export default function ChatPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 relative">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-blue-500/10"
              style={{
                width: Math.random() * 4 + 2 + 'px',
                height: Math.random() * 4 + 2 + 'px',
                left: Math.random() * 100 + '%',
                top: Math.random() * 100 + '%',
                animation: `float ${Math.random() * 10 + 10}s linear infinite`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Header */}
      <div className="relative z-10 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link 
              href="/"
              className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-600 hover:opacity-80 transition-opacity"
            >
              Clarity 2.0
            </Link>
            <div className="flex items-center space-x-4">
              <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-gray-400 text-sm">Connected</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-gray-900/50 backdrop-blur-lg rounded-2xl border border-gray-800 shadow-xl">
          <ChatInterface />
        </div>
      </div>

      <style jsx>{`
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
    </main>
  );
}