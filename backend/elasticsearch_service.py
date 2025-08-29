import os
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, date
import json
from elasticsearch import Elasticsearch
from elasticsearch.exceptions import ConnectionError, NotFoundError
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class ElasticsearchService:
    """
    Elasticsearch service for Smart City Dashboard search functionality
    """
    
    def __init__(self):
        # Try to connect to Elasticsearch, fall back to mock mode if not available
        self.es = None
        self.mock_mode = True  # Default to mock mode
        
        try:
            elasticsearch_url = os.environ.get('ELASTICSEARCH_URL', 'http://localhost:9200')
            self.es = Elasticsearch([elasticsearch_url])
            # Test connection with a real operation
            self.es.info()
            self.mock_mode = False  # Only disable mock mode if connection successful
            logger.info("Connected to Elasticsearch successfully")
        except Exception as e:
            logger.warning(f"Elasticsearch not available, using mock mode: {str(e)}")
            self.mock_mode = True
            self.es = None
        
        # Index names
        self.indices = {
            'metrics': 'smartcity_metrics',
            'alerts': 'smartcity_alerts', 
            'predictions': 'smartcity_predictions'
        }
        
        logger.info(f"ElasticsearchService initialized with mock_mode: {self.mock_mode}")
        
        if not self.mock_mode and self.es:
            self._create_indices()
    
    def _create_indices(self):
        """Create Elasticsearch indices with proper mappings"""
        
        # Metrics index mapping
        metrics_mapping = {
            "mappings": {
                "properties": {
                    "id": {"type": "keyword"},
                    "state": {"type": "keyword"},
                    "city": {"type": "keyword"},
                    "traffic_percentage": {"type": "float"},
                    "aqi_value": {"type": "float"},
                    "energy_percentage": {"type": "float"},
                    "timestamp": {"type": "date"},
                    "source": {"type": "keyword"},
                    "search_text": {"type": "text", "analyzer": "standard"}
                }
            }
        }
        
        # Alerts index mapping
        alerts_mapping = {
            "mappings": {
                "properties": {
                    "id": {"type": "keyword"},
                    "state": {"type": "keyword"},
                    "city": {"type": "keyword"},
                    "alert_type": {"type": "keyword"},
                    "category": {"type": "keyword"},
                    "message": {"type": "text", "analyzer": "standard"},
                    "severity": {"type": "keyword"},
                    "is_active": {"type": "boolean"},
                    "created_at": {"type": "date"},
                    "resolved_at": {"type": "date"}
                }
            }
        }
        
        # Predictions index mapping
        predictions_mapping = {
            "mappings": {
                "properties": {
                    "id": {"type": "keyword"},
                    "state": {"type": "keyword"},
                    "city": {"type": "keyword"},
                    "timeframe": {"type": "keyword"},
                    "predicted_traffic": {"type": "float"},
                    "predicted_aqi": {"type": "float"},
                    "predicted_energy": {"type": "float"},
                    "confidence_score": {"type": "float"},
                    "created_at": {"type": "date"},
                    "base_data_id": {"type": "keyword"}
                }
            }
        }
        
        # Create indices if they don't exist
        for index_type, index_name in self.indices.items():
            try:
                if not self.es.indices.exists(index=index_name):
                    if index_type == 'metrics':
                        self.es.indices.create(index=index_name, body=metrics_mapping)
                    elif index_type == 'alerts':
                        self.es.indices.create(index=index_name, body=alerts_mapping)
                    elif index_type == 'predictions':
                        self.es.indices.create(index=index_name, body=predictions_mapping)
                    
                    logger.info(f"Created Elasticsearch index: {index_name}")
            except Exception as e:
                logger.error(f"Failed to create index {index_name}: {str(e)}")
    
    async def index_metric(self, metric_data: Dict[str, Any]) -> bool:
        """Index a city metric document"""
        if self.mock_mode:
            return True
            
        try:
            # Add searchable text field
            metric_data['search_text'] = f"{metric_data.get('city', '')} {metric_data.get('state', '')} traffic aqi energy"
            
            result = self.es.index(
                index=self.indices['metrics'],
                id=metric_data.get('id'),
                body=metric_data
            )
            return result['result'] in ['created', 'updated']
        except Exception as e:
            logger.error(f"Failed to index metric: {str(e)}")
            return False
    
    async def index_alert(self, alert_data: Dict[str, Any]) -> bool:
        """Index an alert document"""
        if self.mock_mode:
            return True
            
        try:
            result = self.es.index(
                index=self.indices['alerts'],
                id=alert_data.get('id'),
                body=alert_data
            )
            return result['result'] in ['created', 'updated']
        except Exception as e:
            logger.error(f"Failed to index alert: {str(e)}")
            return False
    
    async def index_prediction(self, prediction_data: Dict[str, Any]) -> bool:
        """Index a prediction document"""
        if self.mock_mode:
            return True
            
        try:
            result = self.es.index(
                index=self.indices['predictions'],
                id=prediction_data.get('id'),
                body=prediction_data
            )
            return result['result'] in ['created', 'updated']
        except Exception as e:
            logger.error(f"Failed to index prediction: {str(e)}")
            return False
    
    async def search_global(self, query: str, filters: Dict[str, Any] = None, size: int = 50) -> Dict[str, Any]:
        """
        Global search across all indices
        """
        logger.info(f"Search global called with mock_mode: {self.mock_mode}")
        
        if self.mock_mode:
            logger.info("Using mock search results")
            return self._mock_search_results(query, filters or {}, size)
        
        try:
            # Build search query
            search_body = {
                "query": {
                    "bool": {
                        "must": [],
                        "filter": []
                    }
                },
                "size": size,
                "sort": [{"timestamp": {"order": "desc", "missing": "_last"}}]
            }
            
            # Add text search if query provided
            if query and query.strip():
                search_body["query"]["bool"]["must"].append({
                    "multi_match": {
                        "query": query,
                        "fields": ["city^3", "state^2", "message^2", "search_text", "category", "alert_type"],
                        "type": "best_fields",
                        "fuzziness": "AUTO"
                    }
                })
            else:
                search_body["query"]["bool"]["must"].append({"match_all": {}})
            
            # Apply filters
            if filters:
                self._apply_filters(search_body, filters)
            
            # Search across all indices
            results = {"metrics": [], "alerts": [], "predictions": [], "total": 0}
            
            for index_type, index_name in self.indices.items():
                try:
                    response = self.es.search(index=index_name, body=search_body)
                    hits = response['hits']['hits']
                    results[index_type] = [
                        {
                            **hit['_source'],
                            'score': hit['_score'],
                            'index_type': index_type
                        }
                        for hit in hits
                    ]
                    results['total'] += len(hits)
                except NotFoundError:
                    logger.warning(f"Index {index_name} not found")
                    continue
                except Exception as e:
                    logger.error(f"Search failed for index {index_name}: {str(e)}")
                    continue
            
            return results
            
        except Exception as e:
            logger.error(f"Global search failed: {str(e)}")
            return {
                "metrics": [], 
                "alerts": [], 
                "predictions": [], 
                "total": 0, 
                "error": str(e),
                "mock_mode": self.mock_mode
            }
    
    async def search_metrics(self, filters: Dict[str, Any], size: int = 50) -> List[Dict[str, Any]]:
        """Search city metrics with advanced filters"""
        if self.mock_mode:
            return self._mock_metrics_search(filters, size)
        
        try:
            search_body = {
                "query": {"bool": {"filter": []}},
                "size": size,
                "sort": [{"timestamp": {"order": "desc"}}]
            }
            
            self._apply_filters(search_body, filters)
            
            response = self.es.search(index=self.indices['metrics'], body=search_body)
            return [hit['_source'] for hit in response['hits']['hits']]
            
        except Exception as e:
            logger.error(f"Metrics search failed: {str(e)}")
            return []
    
    async def search_alerts(self, query: str = "", filters: Dict[str, Any] = None, size: int = 50) -> List[Dict[str, Any]]:
        """Search alerts by message content and filters"""
        if self.mock_mode:
            return self._mock_alerts_search(query, filters, size)
        
        try:
            search_body = {
                "query": {"bool": {"must": [], "filter": []}},
                "size": size,
                "sort": [{"created_at": {"order": "desc"}}]
            }
            
            # Text search in alert messages
            if query and query.strip():
                search_body["query"]["bool"]["must"].append({
                    "multi_match": {
                        "query": query,
                        "fields": ["message^2", "category", "alert_type"],
                        "type": "phrase_prefix"
                    }
                })
            else:
                search_body["query"]["bool"]["must"].append({"match_all": {}})
            
            # Apply filters
            if filters:
                self._apply_filters(search_body, filters)
            
            response = self.es.search(index=self.indices['alerts'], body=search_body)
            return [hit['_source'] for hit in response['hits']['hits']]
            
        except Exception as e:
            logger.error(f"Alerts search failed: {str(e)}")
            return []
    
    async def get_search_suggestions(self, query: str, size: int = 10) -> List[str]:
        """Get autocomplete suggestions for search"""
        if self.mock_mode or not query or len(query) < 2:
            return ["Mumbai", "Delhi", "Bangalore", "Chennai", "Kolkata", "Pune", "Ahmedabad"][:size]
        
        try:
            suggestions = set()
            
            # Get city and state suggestions
            for index_name in self.indices.values():
                search_body = {
                    "suggest": {
                        "city_suggest": {
                            "prefix": query.lower(),
                            "completion": {
                                "field": "city.suggest",
                                "size": size
                            }
                        }
                    },
                    "size": 0
                }
                
                try:
                    response = self.es.search(index=index_name, body=search_body)
                    # Add simple prefix matching as fallback
                    search_body = {
                        "query": {
                            "bool": {
                                "should": [
                                    {"prefix": {"city": query.lower()}},
                                    {"prefix": {"state": query.lower()}}
                                ]
                            }
                        },
                        "size": size,
                        "_source": ["city", "state"]
                    }
                    
                    response = self.es.search(index=index_name, body=search_body)
                    for hit in response['hits']['hits']:
                        source = hit['_source']
                        if 'city' in source:
                            suggestions.add(source['city'])
                        if 'state' in source:
                            suggestions.add(source['state'])
                    
                except Exception:
                    continue
            
            return list(suggestions)[:size]
            
        except Exception as e:
            logger.error(f"Suggestions failed: {str(e)}")
            return ["Mumbai", "Delhi", "Bangalore", "Chennai"][:size]
    
    def _apply_filters(self, search_body: Dict, filters: Dict[str, Any]):
        """Apply filters to search query"""
        filter_clauses = search_body["query"]["bool"]["filter"]
        
        # Date range filter
        if filters.get('date_from') or filters.get('date_to'):
            date_range = {}
            if filters.get('date_from'):
                date_range['gte'] = filters['date_from']
            if filters.get('date_to'):
                date_range['lte'] = filters['date_to']
            
            filter_clauses.append({
                "range": {"timestamp": date_range}
            })
        
        # City filter
        if filters.get('cities'):
            filter_clauses.append({
                "terms": {"city": filters['cities']}
            })
        
        # State filter
        if filters.get('states'):
            filter_clauses.append({
                "terms": {"state": filters['states']}
            })
        
        # Metric threshold filters
        if filters.get('traffic_min') is not None:
            filter_clauses.append({
                "range": {"traffic_percentage": {"gte": filters['traffic_min']}}
            })
        
        if filters.get('traffic_max') is not None:
            filter_clauses.append({
                "range": {"traffic_percentage": {"lte": filters['traffic_max']}}
            })
        
        if filters.get('aqi_min') is not None:
            filter_clauses.append({
                "range": {"aqi_value": {"gte": filters['aqi_min']}}
            })
        
        if filters.get('aqi_max') is not None:
            filter_clauses.append({
                "range": {"aqi_value": {"lte": filters['aqi_max']}}
            })
        
        if filters.get('energy_min') is not None:
            filter_clauses.append({
                "range": {"energy_percentage": {"gte": filters['energy_min']}}
            })
        
        if filters.get('energy_max') is not None:
            filter_clauses.append({
                "range": {"energy_percentage": {"lte": filters['energy_max']}}
            })
        
        # Alert severity filter
        if filters.get('severities'):
            filter_clauses.append({
                "terms": {"severity": filters['severities']}
            })
        
        # Alert category filter
        if filters.get('categories'):
            filter_clauses.append({
                "terms": {"category": filters['categories']}
            })
    
    def _mock_search_results(self, query: str, filters: Dict[str, Any], size: int) -> Dict[str, Any]:
        """Mock search results when Elasticsearch is not available"""
        logger.info(f"Mock search called with query: {query}, filters: {filters}")
        
        mock_metrics = [
            {
                "id": "mock-1",
                "city": "Mumbai",
                "state": "Maharashtra",
                "traffic_percentage": 85.5,
                "aqi_value": 180,
                "energy_percentage": 72.3,
                "timestamp": "2025-08-29T16:30:00Z",
                "source": "sensor",
                "score": 1.0,
                "index_type": "metrics"
            },
            {
                "id": "mock-2", 
                "city": "Delhi",
                "state": "Delhi",
                "traffic_percentage": 92.1,
                "aqi_value": 220,
                "energy_percentage": 78.5,
                "timestamp": "2025-08-29T16:25:00Z",
                "source": "sensor", 
                "score": 0.95,
                "index_type": "metrics"
            },
            {
                "id": "mock-3",
                "city": "Bangalore",
                "state": "Karnataka", 
                "traffic_percentage": 68.3,
                "aqi_value": 125,
                "energy_percentage": 55.7,
                "timestamp": "2025-08-29T16:20:00Z",
                "source": "sensor",
                "score": 0.88,
                "index_type": "metrics"
            }
        ]
        
        mock_alerts = [
            {
                "id": "mock-alert-1",
                "city": "Mumbai", 
                "state": "Maharashtra",
                "alert_type": "warning",
                "category": "traffic",
                "message": "Heavy traffic congestion detected in Mumbai city center",
                "severity": "high",
                "created_at": "2025-08-29T16:25:00Z",
                "is_active": True,
                "score": 0.9,
                "index_type": "alerts"
            },
            {
                "id": "mock-alert-2",
                "city": "Delhi",
                "state": "Delhi", 
                "alert_type": "danger",
                "category": "pollution",
                "message": "Air quality very poor in Delhi - avoid outdoor activities",
                "severity": "high",
                "created_at": "2025-08-29T16:20:00Z",
                "is_active": True,
                "score": 0.95,
                "index_type": "alerts"
            },
            {
                "id": "mock-alert-3",
                "city": "Bangalore",
                "state": "Karnataka",
                "alert_type": "info", 
                "category": "energy",
                "message": "Peak energy demand expected in Bangalore evening hours",
                "severity": "medium",
                "created_at": "2025-08-29T16:15:00Z",
                "is_active": True,
                "score": 0.75,
                "index_type": "alerts"
            }
        ]
        
        mock_predictions = [
            {
                "id": "mock-pred-1",
                "city": "Mumbai",
                "state": "Maharashtra",
                "timeframe": "1hour",
                "predicted_traffic": 88.2,
                "predicted_aqi": 185,
                "predicted_energy": 75.1,
                "confidence_score": 0.87,
                "created_at": "2025-08-29T16:30:00Z",
                "score": 0.87,
                "index_type": "predictions"
            }
        ]
        
        # Apply basic filtering for demo
        filtered_metrics = mock_metrics
        filtered_alerts = mock_alerts 
        filtered_predictions = mock_predictions
        
        # Simple query filtering
        if query and query.strip().lower():
            query_lower = query.strip().lower()
            filtered_metrics = [m for m in mock_metrics if query_lower in m['city'].lower() or query_lower in m['state'].lower()]
            filtered_alerts = [a for a in mock_alerts if query_lower in a['city'].lower() or query_lower in a['message'].lower()]
            filtered_predictions = [p for p in mock_predictions if query_lower in p['city'].lower()]
        
        # Apply traffic filter
        if filters.get('traffic_min') is not None:
            filtered_metrics = [m for m in filtered_metrics if m['traffic_percentage'] >= filters['traffic_min']]
        
        # Apply city filter
        if filters.get('cities'):
            cities_lower = [c.lower() for c in filters['cities']]
            filtered_metrics = [m for m in filtered_metrics if m['city'].lower() in cities_lower]
            filtered_alerts = [a for a in filtered_alerts if a['city'].lower() in cities_lower]
            filtered_predictions = [p for p in filtered_predictions if p['city'].lower() in cities_lower]
        
        # Apply severity filter  
        if filters.get('severities'):
            filtered_alerts = [a for a in filtered_alerts if a['severity'] in filters['severities']]
        
        total = len(filtered_metrics) + len(filtered_alerts) + len(filtered_predictions)
        
        return {
            "metrics": filtered_metrics[:size//3] if filtered_metrics else [],
            "alerts": filtered_alerts[:size//3] if filtered_alerts else [],
            "predictions": filtered_predictions[:size//3] if filtered_predictions else [],
            "total": total,
            "mock_mode": True
        }
    
    def _mock_metrics_search(self, filters: Dict[str, Any], size: int) -> List[Dict[str, Any]]:
        """Mock metrics search results"""
        return [
            {
                "id": "mock-metric-1",
                "city": "Mumbai",
                "state": "Maharashtra", 
                "traffic_percentage": 85.5,
                "aqi_value": 180,
                "energy_percentage": 72.3,
                "timestamp": "2025-08-29T16:30:00Z",
                "source": "sensor"
            }
        ]
    
    def _mock_alerts_search(self, query: str, filters: Dict[str, Any], size: int) -> List[Dict[str, Any]]:
        """Mock alerts search results"""
        return [
            {
                "id": "mock-alert-1",
                "city": "Mumbai",
                "state": "Maharashtra",
                "alert_type": "warning",
                "category": "traffic",
                "message": "Heavy traffic congestion in Mumbai city center",
                "severity": "high",
                "created_at": "2025-08-29T16:25:00Z",
                "is_active": True
            }
        ]

# Global instance
elasticsearch_service = ElasticsearchService()