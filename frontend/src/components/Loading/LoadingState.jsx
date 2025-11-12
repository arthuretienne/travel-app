import React, { useState, useEffect } from 'react';

export default function LoadingState() {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { icon: "🤖", text: "AI analyzing your travel profile...", duration: 5000 },
    { icon: "🔍", text: "Searching 1,000+ destinations...", duration: 8000 },
    { icon: "✈️", text: "Finding best flights & hotels...", duration: 12000 },
    { icon: "🎯", text: "Matching with your dates...", duration: 15000 },
    { icon: "✨", text: "Finalizing top 3 recommendations...", duration: 18000 }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 180); // 18 seconds total

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timeouts = steps.map((step, index) => {
      return setTimeout(() => {
        setCurrentStep(index);
      }, step.duration);
    });

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center px-4 py-8 sm:px-6 sm:py-12 md:px-8 md:py-16">
      <div className="max-w-lg w-full space-y-12 sm:space-y-16 md:space-y-20">
        {/* Main Animation */}
        <div className="text-center space-y-6 sm:space-y-8 md:space-y-10">
          <div className="inline-flex items-center justify-center w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 bg-white rounded-full shadow-lg mb-4 sm:mb-6 md:mb-8 animate-bounce">
            <span className="text-7xl sm:text-8xl md:text-9xl">{steps[currentStep].icon}</span>
          </div>
          
          <div className="space-y-3 sm:space-y-4 md:space-y-5">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 leading-tight tracking-tight">
              Creating Your Perfect Itinerary
            </h2>
            
            <p className="text-lg sm:text-xl md:text-2xl text-gray-600 font-medium animate-pulse px-4">
              {steps[currentStep].text}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-4 sm:space-y-5 md:space-y-6">
          <div className="bg-gray-200/80 rounded-full h-5 sm:h-6 md:h-7 overflow-hidden shadow-inner">
            <div 
              className="bg-gradient-to-r from-purple-600 to-blue-600 h-full transition-all duration-300 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            >
              <div className="h-full w-full bg-white/20 animate-pulse rounded-full"></div>
            </div>
          </div>
          <div className="flex justify-between items-center px-1">
            <span className="text-base sm:text-lg md:text-xl font-bold text-purple-600">
              {progress}%
            </span>
            <span className="text-base sm:text-lg md:text-xl font-bold text-blue-600">
              {Math.max(0, Math.ceil((100 - progress) * 0.18))}s remaining
            </span>
          </div>
        </div>

        {/* Fun Facts */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 sm:p-10 md:p-12 shadow-lg border border-gray-200/50 space-y-4 sm:space-y-5 md:space-y-6">
          <h3 className="font-bold text-xl sm:text-2xl md:text-3xl text-gray-800 flex items-center gap-3 sm:gap-4">
            <span className="text-3xl sm:text-4xl md:text-5xl">💡</span>
            <span>Did you know?</span>
          </h3>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 leading-relaxed sm:leading-loose md:leading-loose">
            We analyze over 200 factors to find your perfect destination, including weather patterns, local events, and crowd density predictions.
          </p>
        </div>

        {/* Micro-animations */}
        <div className="flex justify-center items-center gap-3 sm:gap-4 md:gap-5 pt-4 sm:pt-6 md:pt-8">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 rounded-full transition-all duration-500 ${
                i <= currentStep 
                  ? 'bg-purple-600 shadow-md scale-125 sm:scale-150' 
                  : 'bg-gray-300 scale-100'
              }`}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
}

