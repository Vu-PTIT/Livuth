"""
Geospatial utility functions for location-based features
"""
import math
from typing import Dict, Tuple


def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Calculate distance between two coordinates using Haversine formula
    
    Args:
        lat1: Latitude of first point
        lng1: Longitude of first point
        lat2: Latitude of second point
        lng2: Longitude of second point
    
    Returns:
        Distance in kilometers
    """
    # Earth radius in kilometers
    R = 6371
    
    # Convert to radians
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lng = math.radians(lng2 - lng1)
    
    # Haversine formula
    a = (math.sin(delta_lat / 2) ** 2 + 
         math.cos(lat1_rad) * math.cos(lat2_rad) * 
         math.sin(delta_lng / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    distance = R * c
    
    return distance


def create_geojson_point(lng: float, lat: float) -> Dict:
    """
    Create a GeoJSON Point object
    
    Args:
        lng: Longitude
        lat: Latitude
    
    Returns:
        GeoJSON Point dictionary
    """
    return {
        "type": "Point",
        "coordinates": [lng, lat]
    }


def validate_coordinates(lat: float, lng: float) -> Tuple[bool, str]:
    """
    Validate latitude and longitude values
    
    Args:
        lat: Latitude to validate
        lng: Longitude to validate
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not -90 <= lat <= 90:
        return False, f"Latitude must be between -90 and 90, got {lat}"
    
    if not -180 <= lng <= 180:
        return False, f"Longitude must be between -180 and 180, got {lng}"
    
    return True, ""


def extract_coordinates_from_geojson(geojson: Dict) -> Tuple[float, float]:
    """
    Extract latitude and longitude from GeoJSON Point
    
    Args:
        geojson: GeoJSON Point object
    
    Returns:
        Tuple of (latitude, longitude)
    """
    if geojson.get("type") != "Point":
        raise ValueError("GeoJSON object must be of type 'Point'")
    
    coordinates = geojson.get("coordinates", [])
    if len(coordinates) != 2:
        raise ValueError("Invalid GeoJSON coordinates")
    
    lng, lat = coordinates
    return lat, lng
