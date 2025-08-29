import React, { useState, useEffect } from 'react';
import DashboardHeader from './DashboardHeader';
import MetricsGrid from './MetricsGrid';
import HistoricalChart from './HistoricalChart';
import AlertsPanel from './AlertsPanel';
import SearchBar from './SearchBar';
import SearchResults from './SearchResults';
import { dashboardAPI, searchAPI } from '../services/apiService';
import { Button } from './ui/button';
import { RefreshCw, Settings, Download, AlertCircle, Wifi, WifiOff, Search } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { Alert, AlertDescription } from './ui/alert';

const Dashboard = ({ selectedState, selectedCity, onBack }) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  
  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState({});
  
  const { toast } = useToast();

  const fetchData = async (showLoadingToast = false) => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (showLoadingToast) {
        toast({
          title: "Refreshing Data",
          description: "Fetching latest metrics from sensors...",
          duration: 2000,
        });
      }
      
      // Fetch dashboard data from backend
      const dashboardData = await dashboardAPI.getDashboardData(selectedState, selectedCity);
      
      setData(dashboardData);
      setIsOnline(true);
      
      if (showLoadingToast) {
        toast({
          title: "✅ Data Updated",
          description: `Latest AI predictions and sensor data loaded for ${selectedCity}`,
          duration: 3000,
        });
      }
      
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.message);
      setIsOnline(false);
      
      toast({
        title: "❌ Connection Error",
        description: `Failed to load data: ${err.message}`,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCity, selectedState]);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => fetchData(), 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, selectedCity, selectedState]);

  // Check online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (!data) fetchData();
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [data]);

  const handleRefresh = () => {
    fetchData(true);
  };

  const handleExport = () => {
    toast({
      title: "📄 Export Started",
      description: "Preparing dashboard report for download...",
      duration: 3000,
    });
    
    // Create simple CSV export
    if (data) {
      const csvContent = [
        'Time,Traffic %,AQI,Energy %',
        ...data.historical.map(point => 
          `${point.time},${point.traffic},${point.aqi},${point.energy}`
        )
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedCity}_dashboard_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  // ============ SEARCH FUNCTIONS ============
  
  const handleSearch = async (query, filters) => {
    setIsSearching(true);
    setSearchQuery(query);
    setSearchFilters(filters);
    
    try {
      toast({
        title: "🔍 Searching Dashboard",
        description: "Analyzing data across all cities...",
        duration: 2000,
      });
      
      const results = await searchAPI.globalSearch(query, filters, 100);
      setSearchResults(results);
      
      toast({
        title: "✅ Search Complete",
        description: `Found ${results.results.total} results`,
        duration: 3000,
      });
      
    } catch (error) {
      console.error('Search failed:', error);
      toast({
        title: "❌ Search Failed",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      });
      setSearchResults({ results: { total: 0, metrics: [], alerts: [], predictions: [] } });
    } finally {
      setIsSearching(false);
    }
  };

  const handleFiltersChange = (newFilters) => {
    setSearchFilters(newFilters);
    // Auto-search when filters change (if there's already a query)
    if (searchQuery || Object.values(newFilters).some(v => v && v.length > 0)) {
      handleSearch(searchQuery, newFilters);
    }
  };

  const handleToggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
    if (isSearchOpen) {
      // Clear search results when closing search
      setSearchResults(null);
      setSearchQuery('');
      setSearchFilters({});
    }
  };

  // ============ END SEARCH FUNCTIONS ============

  if (isLoading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading AI-powered dashboard...</p>
          <p className="text-sm text-gray-500 mt-2">Analyzing sensor data and generating predictions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <DashboardHeader selectedState={selectedState} selectedCity={selectedCity} />
        
        {/* Search Bar */}
        <div className="mb-6">
          <SearchBar
            onSearch={handleSearch}
            onFiltersChange={handleFiltersChange}
            isSearchOpen={isSearchOpen}
            onToggleSearch={handleToggleSearch}
          />
        </div>
        
        {/* Search Results */}
        {isSearchOpen && searchResults && (
          <SearchResults
            results={searchResults}
            query={searchQuery}
            filters={searchFilters}
            isLoading={isSearching}
          />
        )}
        
        {/* Show Dashboard Content Only When Search is Not Open */}
        {!isSearchOpen && (
          <>
            {/* Error Alert */}
            {error && (
              <Alert className="mb-6 border-red-300 bg-red-900/20 backdrop-blur-sm">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-200">
                  <strong>Connection Error:</strong> {error}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="ml-3 border-red-400 text-red-200 hover:bg-red-800/30" 
                    onClick={handleRefresh}
                    disabled={isLoading}
                  >
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            
            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
                  ← Change Location
                </Button>
                
                {/* Connection Status */}
                <div className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${
                  isOnline ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                  {isOnline ? 'Online' : 'Offline'}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={autoRefresh ? "bg-green-50 text-green-700 border-green-200" : ""}
                >
                  {autoRefresh ? "🟢 Auto-refresh ON" : "⭕ Auto-refresh OFF"}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  disabled={!data}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-2"
                  onClick={() => toast({ title: "⚙️ Settings", description: "Settings panel coming soon!" })}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
              </div>
            </div>

            {/* Main Dashboard Content */}
            {data && (
              <div className="space-y-6">
                {/* Metrics Grid */}
                <MetricsGrid data={data} />
                
                {/* Charts and Alerts Layout */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Historical Chart */}
                  <div className="xl:col-span-2">
                    <HistoricalChart data={data.historical} />
                  </div>
                  
                  {/* Alerts Panel */}
                  <div className="xl:col-span-1">
                    <AlertsPanel alerts={data.alerts} />
                  </div>
                </div>
                
                {/* Additional Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <h3 className="font-medium text-gray-700 mb-2">🔍 Data Sources</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>• Traffic: Live sensors + AI</div>
                      <div>• AQI: Environmental monitors</div>
                      <div>• Energy: Smart grid data</div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <h3 className="font-medium text-gray-700 mb-2">⏱️ Update Frequency</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>• Real-time: 30 seconds</div>
                      <div>• AI predictions: 15 minutes</div>
                      <div>• Historical: Hourly</div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <h3 className="font-medium text-gray-700 mb-2">🎯 AI Accuracy</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>• Traffic: 87% accuracy</div>
                      <div>• AQI: 82% accuracy</div>
                      <div>• Energy: 91% accuracy</div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <h3 className="font-medium text-gray-700 mb-2">📍 Coverage</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>• {selectedCity} Metro Area</div>
                      <div>• {data.historical.length} data points</div>
                      <div>• 99.2% system uptime</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* No Data State */}
            {!data && !isLoading && (
              <div className="text-center py-12">
                <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-700 mb-2">No Data Available</h3>
                <p className="text-gray-500 mb-4">Unable to load dashboard data for {selectedCity}</p>
                <Button onClick={handleRefresh} disabled={isLoading}>
                  Try Again
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;