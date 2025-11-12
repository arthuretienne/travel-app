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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-6 md:p-8">
      <div className="max-w-lg w-full">
        {/* Main Animation */}
        <div className="text-center mb-12 md:mb-16">
          <div className="inline-flex items-center justify-center w-28 h-28 md:w-32 md:h-32 bg-white rounded-full shadow-xl mb-8 md:mb-10 animate-bounce">
            <span className="text-6xl md:text-7xl">{steps[currentStep].icon}</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold mb-4 md:mb-5 text-gray-800 leading-tight">
            Creating Your Perfect Itinerary
          </h2>
          
          <p className="text-lg md:text-xl text-gray-600 animate-pulse font-medium">
            {steps[currentStep].text}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-12 md:mb-16">
          <div className="bg-gray-200 rounded-full h-4 md:h-5 overflow-hidden shadow-inner">
            <div 
              className="bg-gradient-to-r from-purple-600 to-blue-600 h-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            >
              <div className="h-full w-full bg-white/30 animate-pulse"></div>
            </div>
          </div>
          <div className="flex justify-between mt-4 text-base md:text-lg font-semibold text-gray-600">
            <span className="text-purple-600">{progress}%</span>
            <span className="text-blue-600">{Math.max(0, Math.ceil((100 - progress) * 0.18))}s remaining</span>
          </div>
        </div>

        {/* Fun Facts */}
        <div className="bg-white rounded-2xl p-8 md:p-10 shadow-xl mb-10 md:mb-12 border border-gray-100">
          <h3 className="font-bold text-xl md:text-2xl mb-4 md:mb-5 text-gray-800 flex items-center gap-2">
            <span className="text-3xl">💡</span>
            <span>Did you know?</span>
          </h3>
          <p className="text-base md:text-lg text-gray-600 leading-relaxed md:leading-loose">
            We analyze over 200 factors to find your perfect destination, including weather patterns, local events, and crowd density predictions.
          </p>
        </div>

        {/* Micro-animations */}
        <div className="flex justify-center gap-3 md:gap-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 md:w-4 md:h-4 rounded-full transition-all duration-300 ${
                i <= currentStep ? 'bg-purple-600 shadow-lg scale-110' : 'bg-gray-300'
              }`}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
}

