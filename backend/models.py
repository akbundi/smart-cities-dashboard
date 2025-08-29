from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid

# MongoDB Models for Smart City Dashboard

class CityMetrics(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    state: str
    city: str
    traffic_percentage: float = Field(ge=0, le=100)
    aqi_value: float = Field(ge=0)
    energy_percentage: float = Field(ge=0, le=100)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    source: str = "sensor"  # sensor, predicted, manual

class CityMetricsCreate(BaseModel):
    state: str
    city: str
    traffic_percentage: float = Field(ge=0, le=100)
    aqi_value: float = Field(ge=0)
    energy_percentage: float = Field(ge=0, le=100)
    source: str = "sensor"

class Prediction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    state: str
    city: str
    timeframe: str  # "1hour", "6hours"
    predicted_traffic: float = Field(ge=0, le=100)
    predicted_aqi: float = Field(ge=0)
    predicted_energy: float = Field(ge=0, le=100)
    confidence_score: float = Field(ge=0, le=1)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    base_data_id: str  # Reference to the data used for prediction

class PredictionCreate(BaseModel):
    state: str
    city: str
    timeframe: str
    predicted_traffic: float = Field(ge=0, le=100)
    predicted_aqi: float = Field(ge=0)
    predicted_energy: float = Field(ge=0, le=100)
    confidence_score: float = Field(ge=0, le=1)
    base_data_id: str

class Alert(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    state: str
    city: str
    alert_type: str  # warning, danger, info
    category: str    # traffic, pollution, energy
    message: str
    severity: str    # low, medium, high
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None

class AlertCreate(BaseModel):
    state: str
    city: str
    alert_type: str
    category: str
    message: str
    severity: str

class DashboardResponse(BaseModel):
    realTime: dict
    predictions: dict
    historical: List[dict]
    alerts: List[Alert]

class HistoricalDataPoint(BaseModel):
    time: str
    traffic: float
    aqi: float
    energy: float
    timestamp: datetime

# Location data structure
INDIAN_STATES_CITIES = {
    "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad"],
    "Karnataka": ["Bangalore", "Mysore", "Hubli", "Mangalore", "Belgaum"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Trichy", "Salem"],
    "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar"],
    "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Bikaner"],
    "West Bengal": ["Kolkata", "Durgapur", "Asansol", "Siliguri", "Howrah"],
    "Delhi": ["New Delhi", "East Delhi", "West Delhi", "North Delhi", "South Delhi"],
    "Uttar Pradesh": ["Lucknow", "Kanpur", "Agra", "Varanasi", "Allahabad"]
}