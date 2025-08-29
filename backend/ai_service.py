import os
import json
import logging
from typing import Dict, List, Any
from datetime import datetime, timedelta
import zoneinfo
from emergentintegrations.llm.chat import LlmChat, UserMessage
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class SmartCityAIService:
    def __init__(self):
        self.api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not self.api_key:
            raise ValueError("EMERGENT_LLM_KEY not found in environment variables")
        
        self.system_message = """You are an expert smart city data analyst specializing in Indian urban environments. 
        You analyze real-time traffic, air quality (AQI), and energy consumption patterns to provide accurate predictions.

        Your expertise includes:
        - Indian traffic patterns (rush hours 8-10 AM, 6-9 PM)
        - Seasonal AQI variations (winter pollution spikes, monsoon improvements)
        - Energy consumption patterns (evening peaks, cooling load in summer)
        - City-specific characteristics (Mumbai traffic, Delhi pollution, Bangalore tech hubs)

        Always respond with valid JSON containing predictions and confidence scores.
        Consider factors like:
        - Time of day and day of week
        - Historical trends
        - Seasonal patterns
        - City-specific behaviors
        
        Response format:
        {
            "predictions": {
                "traffic": <0-100>,
                "aqi": <positive number>,
                "energy": <0-100>
            },
            "confidence": <0.0-1.0>,
            "reasoning": "<brief explanation>"
        }"""

    async def predict_metrics(self, city: str, state: str, current_data: Dict[str, float], 
                            historical_data: List[Dict], timeframe: str) -> Dict[str, Any]:
        """
        Generate AI-powered predictions for city metrics
        """
        try:
            # Create session ID based on city and current time
            session_id = f"smartcity_{city}_{datetime.now().strftime('%Y%m%d_%H')}"
            
            # Initialize LLM chat
            chat = LlmChat(
                api_key=self.api_key,
                session_id=session_id,
                system_message=self.system_message
            ).with_model("openai", "gpt-4o-mini")
            
            # Prepare context for AI
            try:
                ist = zoneinfo.ZoneInfo("Asia/Kolkata")
                ist_time = datetime.now(ist)
            except Exception:
                # Fallback to UTC+5:30
                current_time = datetime.utcnow()
                ist_time = current_time + timedelta(hours=5, minutes=30)
            
            # Build prompt with context
            prompt = self._build_prediction_prompt(
                city, state, current_data, historical_data, timeframe, ist_time
            )
            
            user_message = UserMessage(text=prompt)
            response = await chat.send_message(user_message)
            
            # Parse AI response
            return self._parse_ai_response(response, current_data, timeframe)
            
        except Exception as e:
            logger.error(f"AI prediction failed for {city}: {str(e)}")
            # Fallback to rule-based prediction
            return self._fallback_prediction(current_data, timeframe, city)

    def _build_prediction_prompt(self, city: str, state: str, current_data: Dict[str, float], 
                                historical_data: List[Dict], timeframe: str, ist_time: datetime) -> str:
        """
        Build detailed prompt for AI prediction
        """
        prompt = f"""Predict {timeframe} metrics for {city}, {state} at {ist_time.strftime('%H:%M IST on %A, %B %d, %Y')}.

Current Metrics:
- Traffic Congestion: {current_data['traffic']}%
- Air Quality Index: {current_data['aqi']} AQI
- Energy Consumption: {current_data['energy']}%

Recent 6-hour trend (latest first):
"""
        
        # Add recent historical data
        for i, point in enumerate(historical_data[-6:]):
            prompt += f"- {point.get('time', 'N/A')}: Traffic {point.get('traffic', 0)}%, AQI {point.get('aqi', 0)}, Energy {point.get('energy', 0)}%\n"
        
        prompt += f"""
Context:
- City: {city} (known for specific characteristics)
- Current time: {ist_time.strftime('%H:%M')} IST
- Prediction timeframe: {timeframe}
- Day: {ist_time.strftime('%A')}

Consider these factors:
1. Time-based patterns (rush hours, evening energy peaks)
2. City-specific trends ({city} characteristics)
3. Day of week effects
4. Seasonal considerations
5. Logical progression from current values

Provide predictions for {timeframe} from now with confidence score.
Respond with valid JSON only."""

        return prompt

    def _parse_ai_response(self, response: str, current_data: Dict[str, float], timeframe: str) -> Dict[str, Any]:
        """
        Parse and validate AI response
        """
        try:
            # Extract JSON from response
            response_text = response.strip()
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1]
            
            result = json.loads(response_text)
            
            # Validate and clean response
            predictions = result.get('predictions', {})
            
            return {
                'predictions': {
                    'traffic': max(0, min(100, float(predictions.get('traffic', current_data['traffic'])))),
                    'aqi': max(50, float(predictions.get('aqi', current_data['aqi']))),
                    'energy': max(0, min(100, float(predictions.get('energy', current_data['energy']))))
                },
                'confidence': max(0.0, min(1.0, float(result.get('confidence', 0.75)))),
                'reasoning': result.get('reasoning', f'AI prediction for {timeframe}'),
                'source': 'ai'
            }
            
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            logger.warning(f"Failed to parse AI response: {str(e)}")
            return self._fallback_prediction(current_data, timeframe, "Unknown")

    def _fallback_prediction(self, current_data: Dict[str, float], timeframe: str, city: str) -> Dict[str, Any]:
        """
        Rule-based fallback prediction when AI fails
        """
        current_hour = datetime.now().hour
        
        # Rule-based prediction logic
        traffic_change = 0
        aqi_change = 0
        energy_change = 0
        
        if timeframe == "1hour":
            # 1-hour predictions based on time patterns
            if 8 <= current_hour <= 10 or 17 <= current_hour <= 20:  # Rush hours
                traffic_change = 10
            elif 22 <= current_hour or current_hour <= 6:  # Night time
                traffic_change = -15
                energy_change = -10
            
            if 18 <= current_hour <= 22:  # Evening energy peak
                energy_change = 8
        
        elif timeframe == "6hours":
            # 6-hour predictions - more conservative changes
            future_hour = (current_hour + 6) % 24
            
            if 8 <= future_hour <= 10 or 17 <= future_hour <= 20:
                traffic_change = 5
            
            # AQI typically varies by ±10-20 points
            aqi_change = -5  # Slight improvement trend
        
        return {
            'predictions': {
                'traffic': max(0, min(100, current_data['traffic'] + traffic_change)),
                'aqi': max(50, current_data['aqi'] + aqi_change),
                'energy': max(0, min(100, current_data['energy'] + energy_change))
            },
            'confidence': 0.65,  # Lower confidence for rule-based
            'reasoning': f'Rule-based {timeframe} prediction for {city}',
            'source': 'fallback'
        }

# Global instance
ai_service = SmartCityAIService()