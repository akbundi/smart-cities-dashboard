import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { TrendingUp, TrendingDown, Car, Wind, Zap, AlertTriangle } from 'lucide-react';

const getTrafficColor = (value) => {
  if (value < 30) return 'text-green-600';
  if (value < 60) return 'text-yellow-600';
  return 'text-red-600';
};

const getAQIColor = (value) => {
  if (value < 100) return 'text-green-600';
  if (value < 150) return 'text-yellow-600';
  if (value < 200) return 'text-orange-600';
  return 'text-red-600';
};

const getEnergyColor = (value) => {
  if (value < 40) return 'text-green-600';
  if (value < 70) return 'text-yellow-600';
  return 'text-red-600';
};

const MetricsGrid = ({ data }) => {
  const { realTime, predictions } = data;

  const MetricCard = ({ title, icon: Icon, current, oneHour, sixHour, unit, getColor }) => {
    const trend1h = oneHour - current;
    const trend6h = sixHour - current;

    return (
      <Card className="relative overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-600">
            <Icon className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold ${getColor(current)}`}>
                {current}
              </span>
              <span className="text-sm text-gray-500">{unit}</span>
            </div>
            <Progress value={current} className="mt-2 h-2" />
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <div className="text-gray-500">1 Hour</div>
              <div className="flex items-center gap-1">
                <span className={getColor(oneHour)}>{oneHour}{unit}</span>
                <div className="flex items-center">
                  {trend1h > 0 ? (
                    <TrendingUp className="h-3 w-3 text-red-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-green-500" />
                  )}
                  <span className={trend1h > 0 ? 'text-red-500' : 'text-green-500'}>
                    {Math.abs(trend1h)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="text-gray-500">6 Hours</div>
              <div className="flex items-center gap-1">
                <span className={getColor(sixHour)}>{sixHour}{unit}</span>
                <div className="flex items-center">
                  {trend6h > 0 ? (
                    <TrendingUp className="h-3 w-3 text-red-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-green-500" />
                  )}
                  <span className={trend6h > 0 ? 'text-red-500' : 'text-green-500'}>
                    {Math.abs(trend6h)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <MetricCard
        title="Traffic Congestion"
        icon={Car}
        current={realTime.traffic}
        oneHour={predictions.oneHour.traffic}
        sixHour={predictions.sixHours.traffic}
        unit="%"
        getColor={getTrafficColor}
      />
      
      <MetricCard
        title="Air Quality Index"
        icon={Wind}
        current={realTime.aqi}
        oneHour={predictions.oneHour.aqi}
        sixHour={predictions.sixHours.aqi}
        unit=" AQI"
        getColor={getAQIColor}
      />
      
      <MetricCard
        title="Energy Consumption"
        icon={Zap}
        current={realTime.energy}
        oneHour={predictions.oneHour.energy}
        sixHour={predictions.sixHours.energy}
        unit="%"
        getColor={getEnergyColor}
      />
    </div>
  );
};

export default MetricsGrid;