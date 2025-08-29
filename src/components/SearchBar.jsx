import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, X, Download } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { searchAPI } from '../services/apiService';
import { useToast } from '../hooks/use-toast';

const SearchBar = ({ onSearch, onFiltersChange, isSearchOpen, onToggleSearch }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({
    cities: [],
    states: [],
    dateFrom: '',
    dateTo: '',
    trafficMin: '',
    trafficMax: '',
    aqiMin: '',
    aqiMax: '',
    energyMin: '',
    energyMax: '',
    severities: [],
    categories: []
  });
  const [showFilters, setShowFilters] = useState(false);
  
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const { toast } = useToast();

  // Debounced search suggestions
  useEffect(() => {
    if (query.length >= 2) {
      // Clear previous timeout
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      
      // Set new timeout
      debounceRef.current = setTimeout(async () => {
        try {
          const suggestions = await searchAPI.getSuggestions(query, 8);
          setSuggestions(suggestions);
          setShowSuggestions(true);
        } catch (error) {
          console.warn('Failed to fetch suggestions:', error.message);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  const handleSearch = async () => {
    if (!query.trim() && Object.values(filters).every(v => !v || (Array.isArray(v) && v.length === 0))) {
      toast({
        title: "⚠️ Search Query Required",
        description: "Please enter a search term or apply filters",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setShowSuggestions(false);
    
    try {
      await onSearch(query.trim(), filters);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSuggestionSelect = (suggestion) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    // Auto-search when suggestion is selected
    setTimeout(() => {
      onSearch(suggestion, filters);
    }, 100);
  };

  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    onSearch('', {});
  };

  const updateFilter = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const addFilterTag = (type, value) => {
    if (type === 'cities' || type === 'states' || type === 'severities' || type === 'categories') {
      const current = filters[type] || [];
      if (!current.includes(value)) {
        updateFilter(type, [...current, value]);
      }
    }
  };

  const removeFilterTag = (type, value) => {
    if (type === 'cities' || type === 'states' || type === 'severities' || type === 'categories') {
      const current = filters[type] || [];
      updateFilter(type, current.filter(item => item !== value));
    } else {
      updateFilter(type, '');
    }
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value) && value.length > 0) count += value.length;
      else if (value && value !== '') count += 1;
    });
    return count;
  };

  const handleExport = async () => {
    if (!query.trim() && Object.values(filters).every(v => !v || (Array.isArray(v) && v.length === 0))) {
      toast({
        title: "⚠️ No Search to Export",
        description: "Please perform a search first",
        variant: "destructive"
      });
      return;
    }

    try {
      toast({
        title: "📤 Exporting Results",
        description: "Preparing search results for download...",
        duration: 2000
      });

      const exportData = await searchAPI.exportSearchResults(query, filters, 'json');
      
      // Create and download file
      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smartcity_search_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "✅ Export Complete",
        description: `Downloaded ${exportData.total_records} records`,
        duration: 3000
      });

    } catch (error) {
      toast({
        title: "❌ Export Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (!isSearchOpen) {
    return (
      <Button
        onClick={onToggleSearch}
        variant="outline"
        className="flex items-center gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
      >
        <Search className="h-4 w-4" />
        Search Dashboard
      </Button>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
      {/* Search Input */}
      <div className="relative mb-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search cities, metrics, alerts... (e.g., 'Mumbai traffic', 'heavy pollution')"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10 pr-4 py-2 bg-white border-gray-300 focus:border-blue-500"
            />
            
            {/* Clear button */}
            {query && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={clearSearch}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
            
            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                <Command>
                  <CommandList>
                    <CommandGroup>
                      {suggestions.map((suggestion, index) => (
                        <CommandItem
                          key={index}
                          onSelect={() => handleSuggestionSelect(suggestion)}
                          className="cursor-pointer"
                        >
                          <Search className="h-3 w-3 mr-2 text-gray-400" />
                          {suggestion}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </div>
            )}
          </div>
          
          <Button
            onClick={handleSearch}
            disabled={isLoading}
            className="px-6 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </Button>
          
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="relative">
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {getActiveFiltersCount() > 0 && (
                  <Badge className="ml-2 bg-blue-600 text-white text-xs">
                    {getActiveFiltersCount()}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-4">
              <div className="space-y-4">
                <h3 className="font-medium">Advanced Filters</h3>
                
                {/* Date Range */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600">Date Range</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="date"
                      placeholder="From"
                      value={filters.dateFrom}
                      onChange={(e) => updateFilter('dateFrom', e.target.value)}
                    />
                    <Input
                      type="date"
                      placeholder="To"
                      value={filters.dateTo}
                      onChange={(e) => updateFilter('dateTo', e.target.value)}
                    />
                  </div>
                </div>
                
                {/* Traffic Range */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600">Traffic % Range</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="Min %"
                      value={filters.trafficMin}
                      onChange={(e) => updateFilter('trafficMin', e.target.value)}
                      min="0"
                      max="100"
                    />
                    <Input
                      type="number"
                      placeholder="Max %"
                      value={filters.trafficMax}
                      onChange={(e) => updateFilter('trafficMax', e.target.value)}
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
                
                {/* AQI Range */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600">AQI Range</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="Min AQI"
                      value={filters.aqiMin}
                      onChange={(e) => updateFilter('aqiMin', e.target.value)}
                      min="0"
                    />
                    <Input
                      type="number"
                      placeholder="Max AQI"
                      value={filters.aqiMax}
                      onChange={(e) => updateFilter('aqiMax', e.target.value)}
                      min="0"
                    />
                  </div>
                </div>
                
                {/* Quick filter buttons */}
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Cities</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Pune'].map(city => (
                        <Button
                          key={city}
                          variant={filters.cities?.includes(city) ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            if (filters.cities?.includes(city)) {
                              removeFilterTag('cities', city);
                            } else {
                              addFilterTag('cities', city);
                            }
                          }}
                          className="text-xs"
                        >
                          {city}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Alert Severity</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {['low', 'medium', 'high'].map(severity => (
                        <Button
                          key={severity}
                          variant={filters.severities?.includes(severity) ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            if (filters.severities?.includes(severity)) {
                              removeFilterTag('severities', severity);
                            } else {
                              addFilterTag('severities', severity);
                            }
                          }}
                          className="text-xs"
                        >
                          {severity}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Categories</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {['traffic', 'pollution', 'energy'].map(category => (
                        <Button
                          key={category}
                          variant={filters.categories?.includes(category) ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            if (filters.categories?.includes(category)) {
                              removeFilterTag('categories', category);
                            } else {
                              addFilterTag('categories', category);
                            }
                          }}
                          className="text-xs"
                        >
                          {category}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Clear filters */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilters({
                      cities: [], states: [], dateFrom: '', dateTo: '',
                      trafficMin: '', trafficMax: '', aqiMin: '', aqiMax: '',
                      energyMin: '', energyMax: '', severities: [], categories: []
                    });
                    onFiltersChange({});
                  }}
                  className="w-full"
                >
                  Clear All Filters
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          
          <Button
            onClick={handleExport}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          
          <Button
            onClick={onToggleSearch}
            variant="outline"
            size="sm"
            className="px-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Active Filter Tags */}
      {getActiveFiltersCount() > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {filters.cities?.map(city => (
            <Badge key={`city-${city}`} variant="secondary" className="flex items-center gap-1">
              City: {city}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilterTag('cities', city)} />
            </Badge>
          ))}
          {filters.severities?.map(severity => (
            <Badge key={`severity-${severity}`} variant="secondary" className="flex items-center gap-1">
              {severity} severity
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilterTag('severities', severity)} />
            </Badge>
          ))}
          {filters.categories?.map(category => (
            <Badge key={`category-${category}`} variant="secondary" className="flex items-center gap-1">
              {category}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilterTag('categories', category)} />
            </Badge>
          ))}
          {filters.dateFrom && (
            <Badge variant="secondary" className="flex items-center gap-1">
              From: {filters.dateFrom}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilterTag('dateFrom', '')} />
            </Badge>
          )}
          {filters.dateTo && (
            <Badge variant="secondary" className="flex items-center gap-1">
              To: {filters.dateTo}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilterTag('dateTo', '')} />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;