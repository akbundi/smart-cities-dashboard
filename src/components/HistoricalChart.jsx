import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { LineChart, BarChart3, TrendingUp } from 'lucide-react';

const HistoricalChart = ({ data }) => {
  const [activeMetric, setActiveMetric] = useState('traffic');
  const [chartType, setChartType] = useState('line');

  const metricConfig = {
    traffic: { 
      label: 'Traffic Congestion %', 
      color: 'rgb(239, 68, 68)', 
      bgColor: 'rgba(239, 68, 68, 0.1)' 
    },
    aqi: { 
      label: 'Air Quality Index', 
      color: 'rgb(245, 158, 11)', 
      bgColor: 'rgba(245, 158, 11, 0.1)' 
    },
    energy: { 
      label: 'Energy Consumption %', 
      color: 'rgb(34, 197, 94)', 
      bgColor: 'rgba(34, 197, 94, 0.1)' 
    }
  };

  const LineChartView = ({ metric }) => {
    const config = metricConfig[metric];
    const maxValue = Math.max(...data.map(d => d[metric]));
    
    return (
      <div className="relative h-64 w-full">
        <svg className="w-full h-full" viewBox="0 0 800 200">
          <defs>
            <linearGradient id={`gradient-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={config.color} stopOpacity="0.3"/>
              <stop offset="100%" stopColor={config.color} stopOpacity="0"/>
            </linearGradient>
          </defs>
          
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(y => (
            <line
              key={y}
              x1="40"
              y1={180 - (y / 100) * 160}
              x2="780"
              y2={180 - (y / 100) * 160}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          ))}
          
          {/* Y-axis labels */}
          {[0, 25, 50, 75, 100].map(y => (
            <text
              key={y}
              x="35"
              y={185 - (y / 100) * 160}
              textAnchor="end"
              className="text-xs fill-gray-500"
            >
              {y}
            </text>
          ))}
          
          {/* Line chart */}
          <path
            d={`M ${data.map((d, i) => 
              `${40 + (i / (data.length - 1)) * 740},${180 - (d[metric] / 100) * 160}`
            ).join(' L ')}`}
            fill="none"
            stroke={config.color}
            strokeWidth="3"
          />
          
          {/* Area fill */}
          <path
            d={`M 40,180 L ${data.map((d, i) => 
              `${40 + (i / (data.length - 1)) * 740},${180 - (d[metric] / 100) * 160}`
            ).join(' L ')} L 780,180 Z`}
            fill={`url(#gradient-${metric})`}
          />
          
          {/* Data points */}
          {data.map((d, i) => (
            <circle
              key={i}
              cx={40 + (i / (data.length - 1)) * 740}
              cy={180 - (d[metric] / 100) * 160}
              r="4"
              fill={config.color}
              className="cursor-pointer hover:r-6 transition-all"
            />
          ))}
          
          {/* X-axis labels */}
          {data.filter((_, i) => i % 4 === 0).map((d, i) => (
            <text
              key={i}
              x={40 + (i * 4 / (data.length - 1)) * 740}
              y="195"
              textAnchor="middle"
              className="text-xs fill-gray-500"
            >
              {d.time}
            </text>
          ))}
        </svg>
      </div>
    );
  };

  const BarChartView = ({ metric }) => {
    const config = metricConfig[metric];
    const barWidth = 680 / data.length - 2;
    
    return (
      <div className="relative h-64 w-full">
        <svg className="w-full h-full" viewBox="0 0 800 200">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(y => (
            <line
              key={y}
              x1="40"
              y1={180 - (y / 100) * 160}
              x2="780"
              y2={180 - (y / 100) * 160}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          ))}
          
          {/* Y-axis labels */}
          {[0, 25, 50, 75, 100].map(y => (
            <text
              key={y}
              x="35"
              y={185 - (y / 100) * 160}
              textAnchor="end"
              className="text-xs fill-gray-500"
            >
              {y}
            </text>
          ))}
          
          {/* Bars */}
          {data.map((d, i) => (
            <rect
              key={i}
              x={40 + (i / data.length) * 740}
              y={180 - (d[metric] / 100) * 160}
              width={barWidth}
              height={(d[metric] / 100) * 160}
              fill={config.color}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            />
          ))}
          
          {/* X-axis labels */}
          {data.filter((_, i) => i % 4 === 0).map((d, i) => (
            <text
              key={i}
              x={40 + (i * 4 / data.length) * 740 + barWidth / 2}
              y="195"
              textAnchor="middle"
              className="text-xs fill-gray-500"
            >
              {d.time}
            </text>
          ))}
        </svg>
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5" />
            24-Hour Historical Trends
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <div className="flex gap-1 border rounded-lg p-1">
              {Object.entries(metricConfig).map(([key, config]) => (
                <Button
                  key={key}
                  variant={activeMetric === key ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveMetric(key)}
                  className="text-xs px-3"
                >
                  {config.label.split(' ')[0]}
                </Button>
              ))}
            </div>
            
            <div className="flex gap-1 border rounded-lg p-1">
              <Button
                variant={chartType === 'line' ? "default" : "ghost"}
                size="sm"
                onClick={() => setChartType('line')}
              >
                <LineChart className="h-4 w-4" />
              </Button>
              <Button
                variant={chartType === 'bar' ? "default" : "ghost"}
                size="sm"
                onClick={() => setChartType('bar')}
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <h3 className="font-medium text-gray-700 mb-2">
            {metricConfig[activeMetric].label}
          </h3>
        </div>
        
        {chartType === 'line' ? (
          <LineChartView metric={activeMetric} />
        ) : (
          <BarChartView metric={activeMetric} />
        )}
      </CardContent>
    </Card>
  );
};

export default HistoricalChart;