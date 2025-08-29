import React, { useState } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import StateSelector from "./components/StateSelector";
import Dashboard from "./components/Dashboard";
import { Toaster } from "./components/ui/toaster";

const SmartCityApp = () => {
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [showDashboard, setShowDashboard] = useState(false);

  const handleStateChange = (state) => {
    setSelectedState(state);
    setSelectedCity('');
    setShowDashboard(false);
  };

  const handleCityChange = (city) => {
    setSelectedCity(city);
    if (city) {
      setTimeout(() => setShowDashboard(true), 500);
    }
  };

  const handleBackToSelection = () => {
    setShowDashboard(false);
  };

  if (showDashboard && selectedState && selectedCity) {
    return (
      <Dashboard
        selectedState={selectedState}
        selectedCity={selectedCity}
        onBack={handleBackToSelection}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="mb-8">
            <h1 className="text-5xl font-bold text-gray-800 mb-4">
              Smart City Dashboard
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Real-time monitoring and AI-powered predictions for traffic, air quality, 
              and energy consumption across Indian cities
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
            <div className="bg-white/70 backdrop-blur-sm p-6 rounded-xl border border-white/20 shadow-lg">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🚗</span>
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Traffic Monitoring</h3>
              <p className="text-sm text-gray-600">Real-time congestion data and predictions</p>
            </div>
            
            <div className="bg-white/70 backdrop-blur-sm p-6 rounded-xl border border-white/20 shadow-lg">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🌬️</span>
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Air Quality</h3>
              <p className="text-sm text-gray-600">AQI monitoring with health alerts</p>
            </div>
            
            <div className="bg-white/70 backdrop-blur-sm p-6 rounded-xl border border-white/20 shadow-lg">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Energy Grid</h3>
              <p className="text-sm text-gray-600">Power consumption analytics</p>
            </div>
          </div>
        </div>

        {/* Selection Interface */}
        <div className="flex justify-center">
          <StateSelector
            selectedState={selectedState}
            selectedCity={selectedCity}
            onStateChange={handleStateChange}
            onCityChange={handleCityChange}
          />
        </div>

        {/* Loading State */}
        {selectedCity && !showDashboard && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-xl shadow-2xl text-center max-w-md mx-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Initializing Dashboard
              </h3>
              <p className="text-gray-600">
                Loading real-time data for {selectedCity}, {selectedState}...
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-16 text-gray-500 text-sm">
          <p>Powered by AI • Real-time data • Indian Standard Time (IST)</p>
        </div>
      </div>
      
      <Toaster />
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SmartCityApp />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;