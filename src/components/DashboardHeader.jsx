import React from 'react';
import { MapPin, Activity } from 'lucide-react';

const DashboardHeader = ({ selectedState, selectedCity }) => {
  return (
    <div className="w-full bg-gradient-to-r from-indigo-900 via-purple-900 to-blue-900 p-6 rounded-lg mb-6 text-white">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/10 backdrop-blur-sm rounded-full">
            <Activity className="h-8 w-8 text-orange-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Smart India Cities
            </h1>
            <div className="flex items-center gap-2 text-blue-200">
              <MapPin className="h-4 w-4" />
              <span className="font-medium">{selectedCity}, {selectedState}</span>
            </div>
            <p className="text-blue-300 text-sm mt-1">
              AI-powered predictions for traffic, pollution, and energy optimization across Indian urban areas
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-6 text-sm">
          <div className="text-center">
            <div className="text-orange-400 font-semibold">Traffic Analysis</div>
            <div className="text-blue-200">Real-time monitoring</div>
          </div>
          <div className="text-center">
            <div className="text-green-400 font-semibold">Air Quality</div>
            <div className="text-blue-200">AQI tracking</div>
          </div>
          <div className="text-center">
            <div className="text-yellow-400 font-semibold">Energy Grid</div>
            <div className="text-blue-200">Smart monitoring</div>
          </div>
          <div className="text-center">
            <div className="text-purple-400 font-semibold">Smart Cities</div>
            <div className="text-blue-200">Population: 1,34,00,373</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;