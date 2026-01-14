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
    <div className="min-h-screen bg-gradient-to-br from-primary-light via-white to-stone-50 flex items-center justify-center px-4 sm:px-6 md:px-8 py-12 sm:py-16 md:py-20">
      <div className="max-w-md w-full">
        {/* Main Animation */}
        <div className="text-center mb-16 sm:mb-20 md:mb-24">
          <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-full shadow-sm mb-8 sm:mb-10 animate-bounce">
            <span className="text-4xl sm:text-5xl">{steps[currentStep].icon}</span>
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-semibold mb-4 sm:mb-5 text-gray-800 leading-tight">
            Creating Your Perfect Itinerary
          </h2>
          
          <p className="text-base sm:text-lg text-gray-600 font-normal">
            {steps[currentStep].text}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-16 sm:mb-20 md:mb-24">
          <div className="bg-gray-200 rounded-full h-2 sm:h-2.5 overflow-hidden mb-3 sm:mb-4">
            <div 
              className="bg-gradient-to-r from-primary to-teal-600 h-full transition-all duration-300 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-sm sm:text-base text-gray-600">
            <span className="font-medium">{progress}%</span>
            <span className="font-medium">{Math.max(0, Math.ceil((100 - progress) * 0.18))}s remaining</span>
          </div>
        </div>

        {/* Fun Facts */}
        <div className="bg-white rounded-xl p-6 sm:p-7 md:p-8 shadow-sm border border-gray-100 mb-8 sm:mb-10">
          <h3 className="font-semibold text-lg sm:text-xl mb-3 sm:mb-4 text-gray-800 flex items-center gap-2">
            <span className="text-2xl">💡</span>
            <span>Did you know?</span>
          </h3>
          <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
            We analyze over 200 factors to find your perfect destination, including weather patterns, local events, and crowd density predictions.
          </p>
        </div>

        {/* Micro-animations */}
        <div className="flex justify-center items-center gap-2 sm:gap-2.5">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-all duration-300 ${
                i <= currentStep 
                  ? 'bg-primary' 
                  : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

