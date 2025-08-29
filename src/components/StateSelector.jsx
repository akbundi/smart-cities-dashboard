import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';
import { dashboardAPI } from '../services/apiService';
import { Alert, AlertDescription } from './ui/alert';

const StateSelector = ({ onStateChange, onCityChange, selectedState, selectedCity }) => {
  const [statesAndCities, setStatesAndCities] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const locations = await dashboardAPI.getLocations();
      setStatesAndCities(locations);
    } catch (err) {
      console.error('Failed to fetch locations:', err);
      setError(err.message);
      // Fallback to static data if API fails
      setStatesAndCities({
        "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad"],
        "Karnataka": ["Bangalore", "Mysore", "Hubli", "Mangalore", "Belgaum"],
        "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Trichy", "Salem"],
        "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar"],
        "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Bikaner"],
        "West Bengal": ["Kolkata", "Durgapur", "Asansol", "Siliguri", "Howrah"],
        "Delhi": ["New Delhi", "East Delhi", "West Delhi", "North Delhi", "South Delhi"],
        "Uttar Pradesh": ["Lucknow", "Kanpur", "Agra", "Varanasi", "Allahabad"]
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStateChange = (state) => {
    onStateChange(state);
    onCityChange(''); // Reset city when state changes
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading available locations...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-2xl text-gray-800">
          <MapPin className="h-6 w-6 text-blue-600" />
          Select Your Location
        </CardTitle>
        {error && (
          <Alert className="mt-4 border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>Note:</strong> Using cached location data. {error}
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">State</label>
          <Select value={selectedState} onValueChange={handleStateChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a state" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(statesAndCities).map((state) => (
                <SelectItem key={state} value={state}>
                  {state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {selectedState && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">City</label>
            <Select value={selectedCity} onValueChange={onCityChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a city" />
              </SelectTrigger>
              <SelectContent>
                {(statesAndCities[selectedState] || []).map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedCity && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>🎯 Ready to launch:</strong> Smart monitoring for {selectedCity}, {selectedState}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Real-time data • AI predictions • IST timezone
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StateSelector;