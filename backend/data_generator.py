import random
import math
from datetime import datetime, timedelta
import zoneinfo
from typing import Dict, List
from models import CityMetrics, Alert, HistoricalDataPoint

class SmartCityDataGenerator:
    """
    Generates realistic mock sensor data for Indian cities
    """
    
    def __init__(self):
        # Base values for different cities (representing typical conditions)
        self.city_baselines = {
            "Mumbai": {"traffic": 75, "aqi": 185, "energy": 68},
            "Pune": {"traffic": 55, "aqi": 145, "energy": 45},
            "Bangalore": {"traffic": 80, "aqi": 120, "energy": 52},
            "Chennai": {"traffic": 70, "aqi": 165, "energy": 58},
            "New Delhi": {"traffic": 85, "aqi": 220, "energy": 75},
            "East Delhi": {"traffic": 80, "aqi": 210, "energy": 70},
            "West Delhi": {"traffic": 78, "aqi": 200, "energy": 68},
            "North Delhi": {"traffic": 82, "aqi": 215, "energy": 72},
            "South Delhi": {"traffic": 75, "aqi": 190, "energy": 65},
            "Kolkata": {"traffic": 65, "aqi": 190, "energy": 48},
            "Ahmedabad": {"traffic": 60, "aqi": 155, "energy": 42},
            "Jaipur": {"traffic": 50, "aqi": 140, "energy": 38},
            "Surat": {"traffic": 45, "aqi": 130, "energy": 35},
            "Lucknow": {"traffic": 55, "aqi": 175, "energy": 40},
            "Nagpur": {"traffic": 40, "aqi": 125, "energy": 35},
            "Coimbatore": {"traffic": 50, "aqi": 110, "energy": 40},
            "Vadodara": {"traffic": 45, "aqi": 120, "energy": 38}
        }
    
    def get_current_ist_time(self) -> datetime:
        """Get current Indian Standard Time using proper timezone"""
        try:
            ist = zoneinfo.ZoneInfo("Asia/Kolkata")
            ist_now = datetime.now(ist)
            return ist_now
        except Exception:
            # Fallback to UTC+5:30 if zoneinfo fails
            utc_now = datetime.utcnow()
            ist_now = utc_now + timedelta(hours=5, minutes=30)
            return ist_now
    
    def generate_current_metrics(self, city: str, state: str) -> Dict[str, float]:
        """
        Generate realistic real-time metrics for a city
        """
        baseline = self.city_baselines.get(city, {"traffic": 60, "aqi": 150, "energy": 50})
        ist_time = self.get_current_ist_time()
        current_hour = ist_time.hour
        day_of_week = ist_time.weekday()  # 0=Monday, 6=Sunday
        
        # Time-based multipliers
        traffic_mult = self._get_traffic_multiplier(current_hour, day_of_week)
        energy_mult = self._get_energy_multiplier(current_hour, ist_time.month)
        aqi_mult = self._get_aqi_multiplier(current_hour, ist_time.month)
        
        # Add random variation (±15%)
        traffic_var = random.uniform(-0.15, 0.15)
        aqi_var = random.uniform(-0.1, 0.1)
        energy_var = random.uniform(-0.12, 0.12)
        
        return {
            "traffic": max(0, min(100, baseline["traffic"] * traffic_mult * (1 + traffic_var))),
            "aqi": max(50, baseline["aqi"] * aqi_mult * (1 + aqi_var)),
            "energy": max(0, min(100, baseline["energy"] * energy_mult * (1 + energy_var))),
            "timestamp": ist_time
        }
    
    def _get_traffic_multiplier(self, hour: int, day_of_week: int) -> float:
        """Calculate traffic multiplier based on time and day"""
        base_mult = 1.0
        
        # Weekend reduction
        if day_of_week >= 5:  # Saturday, Sunday
            base_mult *= 0.7
        
        # Time of day patterns
        if 8 <= hour <= 10:  # Morning rush
            return base_mult * 1.4
        elif 17 <= hour <= 20:  # Evening rush
            return base_mult * 1.5
        elif 11 <= hour <= 16:  # Daytime
            return base_mult * 1.1
        elif 21 <= hour <= 23:  # Late evening
            return base_mult * 0.8
        else:  # Night time
            return base_mult * 0.4
    
    def _get_energy_multiplier(self, hour: int, month: int) -> float:
        """Calculate energy multiplier based on time and season"""
        base_mult = 1.0
        
        # Seasonal adjustment (summer months need more AC)
        if month in [4, 5, 6, 7, 8]:  # Summer months
            base_mult *= 1.2
        elif month in [12, 1, 2]:  # Winter months
            base_mult *= 1.1
        
        # Time of day patterns
        if 18 <= hour <= 22:  # Evening peak
            return base_mult * 1.3
        elif 14 <= hour <= 17:  # Afternoon (AC usage)
            return base_mult * 1.15
        elif 6 <= hour <= 8:  # Morning
            return base_mult * 1.1
        elif 23 <= hour or hour <= 5:  # Night
            return base_mult * 0.7
        else:
            return base_mult
    
    def _get_aqi_multiplier(self, hour: int, month: int) -> float:
        """Calculate AQI multiplier based on time and season"""
        base_mult = 1.0
        
        # Seasonal patterns
        if month in [11, 12, 1, 2]:  # Winter - higher pollution
            base_mult *= 1.4
        elif month in [6, 7, 8, 9]:  # Monsoon - lower pollution
            base_mult *= 0.7
        
        # Daily patterns
        if 6 <= hour <= 9:  # Morning traffic buildup
            return base_mult * 1.2
        elif 18 <= hour <= 21:  # Evening traffic + temperature inversion
            return base_mult * 1.3
        elif 2 <= hour <= 5:  # Early morning - lowest
            return base_mult * 0.8
        else:
            return base_mult
    
    def generate_historical_data(self, city: str, hours: int = 24) -> List[Dict]:
        """
        Generate historical data points for the past N hours
        """
        historical = []
        current_time = self.get_current_ist_time()
        baseline = self.city_baselines.get(city, {"traffic": 60, "aqi": 150, "energy": 50})
        
        for i in range(hours, 0, -1):
            point_time = current_time - timedelta(hours=i)
            hour = point_time.hour
            day_of_week = point_time.weekday()
            month = point_time.month
            
            # Calculate multipliers for this specific time
            traffic_mult = self._get_traffic_multiplier(hour, day_of_week)
            energy_mult = self._get_energy_multiplier(hour, month)
            aqi_mult = self._get_aqi_multiplier(hour, month)
            
            # Add some random variation
            traffic_var = random.uniform(-0.1, 0.1)
            aqi_var = random.uniform(-0.08, 0.08)
            energy_var = random.uniform(-0.1, 0.1)
            
            historical.append({
                "time": point_time.strftime("%H:%M"),
                "traffic": max(0, min(100, baseline["traffic"] * traffic_mult * (1 + traffic_var))),
                "aqi": max(50, baseline["aqi"] * aqi_mult * (1 + aqi_var)),
                "energy": max(0, min(100, baseline["energy"] * energy_mult * (1 + energy_var))),
                "timestamp": point_time
            })
        
        return historical
    
    def generate_alerts(self, city: str, state: str, current_metrics: Dict[str, float]) -> List[Alert]:
        """
        Generate alerts based on current metrics and thresholds
        """
        alerts = []
        current_time = self.get_current_ist_time()
        
        # Traffic alerts
        if current_metrics["traffic"] > 80:
            alerts.append(Alert(
                state=state,
                city=city,
                alert_type="warning",
                category="traffic",
                message=f"Heavy traffic congestion detected in {city}. Consider alternate routes.",
                severity="high" if current_metrics["traffic"] > 90 else "medium",
                created_at=current_time
            ))
        
        # AQI alerts
        if current_metrics["aqi"] > 200:
            alerts.append(Alert(
                state=state,
                city=city,
                alert_type="danger",
                category="pollution",
                message=f"Air quality very poor in {city}. Avoid outdoor activities.",
                severity="high",
                created_at=current_time
            ))
        elif current_metrics["aqi"] > 150:
            alerts.append(Alert(
                state=state,
                city=city,
                alert_type="warning",
                category="pollution",
                message=f"Air quality unhealthy in {city}. Limit outdoor exposure.",
                severity="medium",
                created_at=current_time
            ))
        
        # Energy alerts
        if current_metrics["energy"] > 85:
            alerts.append(Alert(
                state=state,
                city=city,
                alert_type="warning",
                category="energy",
                message=f"Very high energy demand in {city}. Peak load conditions.",
                severity="high",
                created_at=current_time
            ))
        elif current_metrics["energy"] > 70:
            alerts.append(Alert(
                state=state,
                city=city,
                alert_type="info",
                category="energy",
                message=f"High energy demand in {city}. Consider energy conservation.",
                severity="medium",
                created_at=current_time
            ))
        
        return alerts

# Global instance
data_generator = SmartCityDataGenerator()