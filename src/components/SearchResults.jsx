import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Clock, MapPin, AlertTriangle, TrendingUp, TrendingDown, 
  Car, Wind, Zap, Search, Calendar, Filter, Eye
} from 'lucide-react';

const SearchResults = ({ results, query, filters, isLoading }) => {
  const [selectedTab, setSelectedTab] = useState('all');
  
  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-white mb-2">Searching...</h3>
          <p className="text-blue-200">Analyzing dashboard data with Elasticsearch</p>
        </div>
      </div>
    );
  }

  if (!results || results.total === 0) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">No Results Found</h3>
          <p className="text-blue-200 mb-4">
            {query 
              ? `No matches found for "${query}"`
              : "Try adjusting your search filters"
            }
          </p>
          <div className="text-sm text-blue-300">
            <p>Search suggestions:</p>
            <ul className="mt-2 space-y-1">
              <li>• Try broader terms like "Mumbai" or "traffic"</li>
              <li>• Use different date ranges</li>
              <li>• Check spelling and try alternative keywords</li>
              <li>• Remove some filters to expand results</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  const getMetricsCount = () => results?.results?.metrics?.length || 0;
  const getAlertsCount = () => results?.results?.alerts?.length || 0;
  const getPredictionsCount = () => results?.results?.predictions?.length || 0;
  const getTotalCount = () => results?.results?.total || 0;

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      return new Date(timestamp).toLocaleString();
    } catch (error) {
      return timestamp;
    }
  };

  const getMetricIcon = (type) => {
    switch (type) {
      case 'traffic': return <Car className="h-4 w-4" />;
      case 'aqi': return <Wind className="h-4 w-4" />;
      case 'energy': return <Zap className="h-4 w-4" />;
      default: return <TrendingUp className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryColor = (category) => {
    switch (category?.toLowerCase()) {
      case 'traffic': return 'bg-orange-100 text-orange-800';
      case 'pollution': return 'bg-red-100 text-red-800';
      case 'energy': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const MetricsResults = ({ metrics }) => (
    <div className="space-y-4">
      {metrics.map((metric, index) => (
        <Card key={index} className="bg-white/90 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="h-5 w-5 text-blue-600" />
                {metric.city}, {metric.state}
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                Score: {metric.score?.toFixed(2) || 'N/A'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center justify-center gap-1 text-orange-600 mb-1">
                  <Car className="h-4 w-4" />
                  <span className="font-medium">Traffic</span>
                </div>
                <div className="text-2xl font-bold text-orange-700">
                  {metric.traffic_percentage?.toFixed(0) || 'N/A'}%
                </div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
                  <Wind className="h-4 w-4" />
                  <span className="font-medium">AQI</span>
                </div>
                <div className="text-2xl font-bold text-red-700">
                  {metric.aqi_value?.toFixed(0) || 'N/A'}
                </div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                  <Zap className="h-4 w-4" />
                  <span className="font-medium">Energy</span>
                </div>
                <div className="text-2xl font-bold text-blue-700">
                  {metric.energy_percentage?.toFixed(0) || 'N/A'}%
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTimestamp(metric.timestamp)}
              </span>
              <Badge variant="outline">{metric.source || 'sensor'}</Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const AlertsResults = ({ alerts }) => (
    <div className="space-y-4">
      {alerts.map((alert, index) => (
        <Card key={index} className="bg-white/90 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <span className="font-medium text-gray-900">{alert.city}, {alert.state}</span>
              </div>
              <div className="flex gap-2">
                <Badge className={getSeverityColor(alert.severity)}>
                  {alert.severity?.toUpperCase() || 'UNKNOWN'}
                </Badge>
                <Badge className={getCategoryColor(alert.category)}>
                  {alert.category || 'general'}
                </Badge>
              </div>
            </div>
            
            <p className="text-gray-700 mb-3 leading-relaxed">
              {alert.message || 'No message available'}
            </p>
            
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-gray-500">
                <Clock className="h-3 w-3" />
                {formatTimestamp(alert.created_at)}
              </span>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-xs">
                  {alert.alert_type || 'info'}
                </Badge>
                {alert.score && (
                  <Badge variant="outline" className="text-xs">
                    Score: {alert.score.toFixed(2)}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const PredictionsResults = ({ predictions }) => (
    <div className="space-y-4">
      {predictions.map((prediction, index) => (
        <Card key={index} className="bg-white/90 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              {prediction.city}, {prediction.state} - {prediction.timeframe}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-sm text-purple-600 mb-1">Traffic</div>
                <div className="text-xl font-bold text-purple-700">
                  {prediction.predicted_traffic?.toFixed(0) || 'N/A'}%
                </div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-sm text-purple-600 mb-1">AQI</div>
                <div className="text-xl font-bold text-purple-700">
                  {prediction.predicted_aqi?.toFixed(0) || 'N/A'}
                </div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-sm text-purple-600 mb-1">Energy</div>
                <div className="text-xl font-bold text-purple-700">
                  {prediction.predicted_energy?.toFixed(0) || 'N/A'}%
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Confidence: {(prediction.confidence_score * 100)?.toFixed(1) || 'N/A'}%</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTimestamp(prediction.created_at)}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      {/* Results Header */}
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-6 border border-white/20">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-2xl font-bold text-white">Search Results</h2>
          <Badge className="bg-blue-600 text-white">
            {getTotalCount()} total results
          </Badge>
        </div>
        
        {query && (
          <p className="text-blue-200 mb-2">
            <strong>Query:</strong> "{query}"
          </p>
        )}
        
        {Object.keys(filters || {}).length > 0 && (
          <div className="text-blue-200 text-sm">
            <strong>Active filters:</strong> {Object.keys(filters).join(', ')}
          </div>
        )}
        
        {results?.results?.mock_mode && (
          <div className="mt-3 p-3 bg-yellow-100 text-yellow-800 rounded-lg text-sm">
            <strong>Demo Mode:</strong> Elasticsearch is not available. Showing mock results.
          </div>
        )}
      </div>

      {/* Results Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4 bg-white/10 backdrop-blur-sm">
          <TabsTrigger value="all" className="text-white data-[state=active]:bg-blue-600">
            All ({getTotalCount()})
          </TabsTrigger>
          <TabsTrigger value="metrics" className="text-white data-[state=active]:bg-blue-600">
            Metrics ({getMetricsCount()})
          </TabsTrigger>
          <TabsTrigger value="alerts" className="text-white data-[state=active]:bg-blue-600">
            Alerts ({getAlertsCount()})
          </TabsTrigger>
          <TabsTrigger value="predictions" className="text-white data-[state=active]:bg-blue-600">
            Predictions ({getPredictionsCount()})
          </TabsTrigger>
        </TabsList>
        
        <div className="mt-6">
          <TabsContent value="all">
            <div className="space-y-8">
              {getMetricsCount() > 0 && (
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <Car className="h-5 w-5" />
                    City Metrics ({getMetricsCount()})
                  </h3>
                  <MetricsResults metrics={results.results.metrics.slice(0, 3)} />
                  {getMetricsCount() > 3 && (
                    <Button 
                      variant="outline" 
                      className="mt-4 text-white border-white/20"
                      onClick={() => setSelectedTab('metrics')}
                    >
                      View All {getMetricsCount()} Metrics
                    </Button>
                  )}
                </div>
              )}
              
              {getAlertsCount() > 0 && (
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Alerts ({getAlertsCount()})
                  </h3>
                  <AlertsResults alerts={results.results.alerts.slice(0, 3)} />
                  {getAlertsCount() > 3 && (
                    <Button 
                      variant="outline" 
                      className="mt-4 text-white border-white/20"
                      onClick={() => setSelectedTab('alerts')}
                    >
                      View All {getAlertsCount()} Alerts
                    </Button>
                  )}
                </div>
              )}
              
              {getPredictionsCount() > 0 && (
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Predictions ({getPredictionsCount()})
                  </h3>
                  <PredictionsResults predictions={results.results.predictions.slice(0, 2)} />
                  {getPredictionsCount() > 2 && (
                    <Button 
                      variant="outline" 
                      className="mt-4 text-white border-white/20"
                      onClick={() => setSelectedTab('predictions')}
                    >
                      View All {getPredictionsCount()} Predictions
                    </Button>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="metrics">
            <MetricsResults metrics={results.results.metrics || []} />
          </TabsContent>
          
          <TabsContent value="alerts">
            <AlertsResults alerts={results.results.alerts || []} />
          </TabsContent>
          
          <TabsContent value="predictions">
            <PredictionsResults predictions={results.results.predictions || []} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default SearchResults;