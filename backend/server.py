from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import List, Dict, Any
import asyncio
from datetime import datetime

# Import our custom modules
from models import (
    CityMetrics, CityMetricsCreate, Prediction, PredictionCreate, 
    Alert, AlertCreate, DashboardResponse, INDIAN_STATES_CITIES
)
from ai_service import ai_service
from data_generator import data_generator
from elasticsearch_service import elasticsearch_service

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Smart City Dashboard API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Health check endpoint
@api_router.get("/")
async def root():
    return {"message": "Smart City Dashboard API is running", "version": "1.0.0"}

@api_router.get("/locations")
async def get_locations() -> Dict[str, List[str]]:
    """Get available states and cities"""
    return INDIAN_STATES_CITIES

@api_router.get("/dashboard/{state}/{city}")
async def get_dashboard_data(state: str, city: str) -> Dict[str, Any]:
    """
    Get complete dashboard data for a city including real-time, predictions, historical, and alerts
    """
    # Validate state and city first
    if state not in INDIAN_STATES_CITIES or city not in INDIAN_STATES_CITIES[state]:
        raise HTTPException(status_code=404, detail=f"City {city} not found in state {state}")
    
    try:
        # Generate current metrics
        current_metrics = data_generator.generate_current_metrics(city, state)
        
        # Store current metrics in database
        metrics_doc = CityMetrics(
            state=state,
            city=city,
            traffic_percentage=current_metrics["traffic"],
            aqi_value=current_metrics["aqi"],
            energy_percentage=current_metrics["energy"],
            source="sensor"
        )
        await db.city_metrics.insert_one(metrics_doc.dict())
        
        # Index metrics in Elasticsearch (non-blocking)
        try:
            await elasticsearch_service.index_metric(metrics_doc.dict())
        except Exception as e:
            logger.warning(f"Failed to index metrics in Elasticsearch: {str(e)}")
        
        # Generate historical data
        historical_data = data_generator.generate_historical_data(city, 24)
        
        # Generate AI predictions for 1 hour and 6 hours
        prediction_tasks = [
            generate_prediction(state, city, current_metrics, historical_data, "1hour"),
            generate_prediction(state, city, current_metrics, historical_data, "6hours")
        ]
        
        predictions_1h, predictions_6h = await asyncio.gather(*prediction_tasks)
        
        # Generate alerts
        alerts = data_generator.generate_alerts(city, state, current_metrics)
        
        # Store alerts in database
        for alert in alerts:
            await db.alerts.insert_one(alert.dict())
            # Index alert in Elasticsearch (non-blocking)
            try:
                await elasticsearch_service.index_alert(alert.dict())
            except Exception as e:
                logger.warning(f"Failed to index alert in Elasticsearch: {str(e)}")
        
        # Format response
        response = {
            "realTime": {
                "traffic": round(current_metrics["traffic"]),
                "aqi": round(current_metrics["aqi"]),
                "energy": round(current_metrics["energy"]),
                "timestamp": current_metrics["timestamp"].isoformat()
            },
            "predictions": {
                "oneHour": {
                    "traffic": round(predictions_1h["predictions"]["traffic"]),
                    "aqi": round(predictions_1h["predictions"]["aqi"]),
                    "energy": round(predictions_1h["predictions"]["energy"])
                },
                "sixHours": {
                    "traffic": round(predictions_6h["predictions"]["traffic"]),
                    "aqi": round(predictions_6h["predictions"]["aqi"]),
                    "energy": round(predictions_6h["predictions"]["energy"])
                }
            },
            "historical": [
                {
                    "time": point["time"],
                    "traffic": round(point["traffic"]),
                    "aqi": round(point["aqi"]),
                    "energy": round(point["energy"])
                }
                for point in historical_data
            ],
            "alerts": [
                {
                    "id": alert.id,
                    "type": alert.alert_type,
                    "category": alert.category,
                    "message": alert.message,
                    "severity": alert.severity,
                    "timestamp": alert.created_at.strftime("%H:%M:%S")
                }
                for alert in alerts
            ]
        }
        
        return response
        
    except Exception as e:
        logger.error(f"Error getting dashboard data for {city}, {state}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get dashboard data: {str(e)}")

async def generate_prediction(state: str, city: str, current_metrics: Dict[str, float], 
                            historical_data: List[Dict], timeframe: str) -> Dict[str, Any]:
    """
    Generate AI prediction for given timeframe
    """
    try:
        prediction_result = await ai_service.predict_metrics(
            city=city,
            state=state, 
            current_data=current_metrics,
            historical_data=historical_data,
            timeframe=timeframe
        )
        
        # Store prediction in database
        prediction_doc = Prediction(
            state=state,
            city=city,
            timeframe=timeframe,
            predicted_traffic=prediction_result["predictions"]["traffic"],
            predicted_aqi=prediction_result["predictions"]["aqi"],
            predicted_energy=prediction_result["predictions"]["energy"],
            confidence_score=prediction_result["confidence"],
            base_data_id="current"  # Could reference actual metrics ID
        )
        await db.predictions.insert_one(prediction_doc.dict())
        
        # Index prediction in Elasticsearch (non-blocking)
        try:
            await elasticsearch_service.index_prediction(prediction_doc.dict())
        except Exception as e:
            logger.warning(f"Failed to index prediction in Elasticsearch: {str(e)}")
        
        return prediction_result
        
    except Exception as e:
        logger.warning(f"Prediction failed for {city} {timeframe}: {str(e)}")
        # Return fallback prediction
        return {
            "predictions": current_metrics,
            "confidence": 0.5,
            "source": "fallback"
        }

@api_router.get("/metrics/{state}/{city}")
async def get_recent_metrics(state: str, city: str, limit: int = 24) -> List[CityMetrics]:
    """Get recent metrics for a city"""
    try:
        cursor = db.city_metrics.find(
            {"state": state, "city": city}
        ).sort("timestamp", -1).limit(limit)
        
        metrics = await cursor.to_list(length=limit)
        return [CityMetrics(**metric) for metric in metrics]
        
    except Exception as e:
        logger.error(f"Error getting metrics for {city}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get metrics")

@api_router.get("/alerts/{state}/{city}")
async def get_active_alerts(state: str, city: str) -> List[Alert]:
    """Get active alerts for a city"""
    try:
        cursor = db.alerts.find(
            {"state": state, "city": city, "is_active": True}
        ).sort("created_at", -1)
        
        alerts = await cursor.to_list(length=50)
        return [Alert(**alert) for alert in alerts]
        
    except Exception as e:
        logger.error(f"Error getting alerts for {city}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get alerts")

# ============ ELASTICSEARCH SEARCH ENDPOINTS ============

@api_router.get("/search/global")
async def global_search(
    q: str = "", 
    cities: str = None,
    states: str = None,
    date_from: str = None,
    date_to: str = None,
    traffic_min: float = None,
    traffic_max: float = None,
    aqi_min: float = None,
    aqi_max: float = None,
    energy_min: float = None,
    energy_max: float = None,
    severities: str = None,
    categories: str = None,
    size: int = 50
) -> Dict[str, Any]:
    """
    Global search across all data types with advanced filters
    
    Query Parameters:
    - q: Search query text
    - cities: Comma-separated list of cities
    - states: Comma-separated list of states 
    - date_from/date_to: Date range (YYYY-MM-DD format)
    - traffic_min/max: Traffic percentage thresholds
    - aqi_min/max: AQI value thresholds
    - energy_min/max: Energy percentage thresholds
    - severities: Comma-separated alert severities (low,medium,high)
    - categories: Comma-separated alert categories (traffic,pollution,energy)
    - size: Maximum results to return
    """
    try:
        # Build filters dictionary
        filters = {}
        
        if cities:
            filters['cities'] = [city.strip() for city in cities.split(',')]
        if states:
            filters['states'] = [state.strip() for state in states.split(',')]
        if date_from:
            filters['date_from'] = date_from
        if date_to:
            filters['date_to'] = date_to
        if traffic_min is not None:
            filters['traffic_min'] = traffic_min
        if traffic_max is not None:
            filters['traffic_max'] = traffic_max
        if aqi_min is not None:
            filters['aqi_min'] = aqi_min
        if aqi_max is not None:
            filters['aqi_max'] = aqi_max
        if energy_min is not None:
            filters['energy_min'] = energy_min
        if energy_max is not None:
            filters['energy_max'] = energy_max
        if severities:
            filters['severities'] = [sev.strip() for sev in severities.split(',')]
        if categories:
            filters['categories'] = [cat.strip() for cat in categories.split(',')]
        
        # Perform search
        results = await elasticsearch_service.search_global(q, filters, size)
        
        return {
            "query": q,
            "filters_applied": filters,
            "results": results,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Global search failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@api_router.get("/search/metrics")
async def search_metrics(
    cities: str = None,
    states: str = None,
    date_from: str = None,
    date_to: str = None,
    traffic_min: float = None,
    traffic_max: float = None,
    aqi_min: float = None,
    aqi_max: float = None,
    energy_min: float = None,
    energy_max: float = None,
    size: int = 50
) -> Dict[str, Any]:
    """
    Search city metrics with specific filters
    
    Example: /api/search/metrics?cities=Mumbai,Delhi&traffic_min=80&date_from=2025-08-01
    """
    try:
        filters = {}
        
        if cities:
            filters['cities'] = [city.strip() for city in cities.split(',')]
        if states:
            filters['states'] = [state.strip() for state in states.split(',')]
        if date_from:
            filters['date_from'] = date_from
        if date_to:
            filters['date_to'] = date_to
        if traffic_min is not None:
            filters['traffic_min'] = traffic_min
        if traffic_max is not None:
            filters['traffic_max'] = traffic_max
        if aqi_min is not None:
            filters['aqi_min'] = aqi_min
        if aqi_max is not None:
            filters['aqi_max'] = aqi_max
        if energy_min is not None:
            filters['energy_min'] = energy_min
        if energy_max is not None:
            filters['energy_max'] = energy_max
        
        results = await elasticsearch_service.search_metrics(filters, size)
        
        return {
            "filters_applied": filters,
            "results": results,
            "count": len(results),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Metrics search failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Metrics search failed: {str(e)}")

@api_router.get("/search/alerts")
async def search_alerts(
    q: str = "",
    cities: str = None,
    states: str = None,
    severities: str = None,
    categories: str = None,
    date_from: str = None,
    date_to: str = None,
    size: int = 50
) -> Dict[str, Any]:
    """
    Search alerts by message content and filters
    
    Example: /api/search/alerts?q=heavy traffic&cities=Mumbai&severities=high
    """
    try:
        filters = {}
        
        if cities:
            filters['cities'] = [city.strip() for city in cities.split(',')]
        if states:
            filters['states'] = [state.strip() for state in states.split(',')]
        if severities:
            filters['severities'] = [sev.strip() for sev in severities.split(',')]
        if categories:
            filters['categories'] = [cat.strip() for cat in categories.split(',')]
        if date_from:
            filters['date_from'] = date_from
        if date_to:
            filters['date_to'] = date_to
        
        results = await elasticsearch_service.search_alerts(q, filters, size)
        
        return {
            "query": q,
            "filters_applied": filters,
            "results": results,
            "count": len(results),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Alerts search failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Alerts search failed: {str(e)}")

@api_router.get("/search/suggestions")
async def get_search_suggestions(q: str, size: int = 10) -> List[str]:
    """
    Get autocomplete suggestions for search queries
    
    Example: /api/search/suggestions?q=mum
    """
    try:
        suggestions = await elasticsearch_service.get_search_suggestions(q, size)
        return suggestions
        
    except Exception as e:
        logger.error(f"Suggestions failed: {str(e)}")
        return []

@api_router.get("/search/export")
async def export_search_results(
    q: str = "",
    cities: str = None,
    states: str = None,
    date_from: str = None,
    date_to: str = None,
    traffic_min: float = None,
    traffic_max: float = None,
    aqi_min: float = None,
    aqi_max: float = None,
    energy_min: float = None,
    energy_max: float = None,
    severities: str = None,
    categories: str = None,
    format: str = "json"
) -> Dict[str, Any]:
    """
    Export search results in specified format
    
    Formats: json, csv
    """
    try:
        # Build filters (same as global search)
        filters = {}
        
        if cities:
            filters['cities'] = [city.strip() for city in cities.split(',')]
        if states:
            filters['states'] = [state.strip() for state in states.split(',')]
        if date_from:
            filters['date_from'] = date_from
        if date_to:
            filters['date_to'] = date_to
        if traffic_min is not None:
            filters['traffic_min'] = traffic_min
        if traffic_max is not None:
            filters['traffic_max'] = traffic_max
        if aqi_min is not None:
            filters['aqi_min'] = aqi_min
        if aqi_max is not None:
            filters['aqi_max'] = aqi_max
        if energy_min is not None:
            filters['energy_min'] = energy_min
        if energy_max is not None:
            filters['energy_max'] = energy_max
        if severities:
            filters['severities'] = [sev.strip() for sev in severities.split(',')]
        if categories:
            filters['categories'] = [cat.strip() for cat in categories.split(',')]
        
        # Get search results with higher limit for export
        results = await elasticsearch_service.search_global(q, filters, 1000)
        
        # Flatten results for export
        export_data = []
        
        # Add metrics data
        for item in results.get('metrics', []):
            export_data.append({
                'type': 'metric',
                'city': item.get('city'),
                'state': item.get('state'),
                'traffic_percentage': item.get('traffic_percentage'),
                'aqi_value': item.get('aqi_value'),
                'energy_percentage': item.get('energy_percentage'),
                'timestamp': item.get('timestamp'),
                'source': item.get('source')
            })
        
        # Add alerts data
        for item in results.get('alerts', []):
            export_data.append({
                'type': 'alert',
                'city': item.get('city'),
                'state': item.get('state'),
                'alert_type': item.get('alert_type'),
                'category': item.get('category'),
                'message': item.get('message'),
                'severity': item.get('severity'),
                'timestamp': item.get('created_at')
            })
        
        return {
            "export_data": export_data,
            "total_records": len(export_data),
            "query": q,
            "filters": filters,
            "format": format,
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Export failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

# ============ END SEARCH ENDPOINTS ============

# Include the router in the main app
app.include_router(api_router)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
