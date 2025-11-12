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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Main Animation */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-full shadow-lg mb-6 animate-bounce">
            <span className="text-5xl">{steps[currentStep].icon}</span>
          </div>
          
          <h2 className="text-2xl font-bold mb-2 text-gray-800">
            Creating Your Perfect Itinerary
          </h2>
          
          <p className="text-gray-600 animate-pulse">
            {steps[currentStep].text}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-purple-600 to-blue-600 h-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            >
              <div className="h-full w-full bg-white/30 animate-pulse"></div>
            </div>
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-500">
            <span>{progress}%</span>
            <span>{Math.max(0, Math.ceil((100 - progress) * 0.18))}s remaining</span>
          </div>
        </div>

        {/* Fun Facts */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h3 className="font-semibold mb-3 text-gray-700">💡 Did you know?</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            We analyze over 200 factors to find your perfect destination, including weather patterns, local events, and crowd density predictions.
          </p>
        </div>

        {/* Micro-animations */}
        <div className="mt-6 flex justify-center gap-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${
                i <= currentStep ? 'bg-purple-600' : 'bg-gray-300'
              } transition-colors duration-300`}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
}

