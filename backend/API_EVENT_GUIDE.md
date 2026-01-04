# API Documentation - Event Location & Recommendation Features

## 🆕 New API Endpoints

### 1. Get Personalized Recommendations

**Endpoint:** `GET /api/events/recommendations/{user_id}`

**Description:** Get personalized event recommendations based on user's hobbies

**Parameters:**
- `user_id` (path, required): User ID
- `limit` (query, optional): Maximum number of results (default: 10, max: 50)

**Example Request:**
```bash
curl "http://localhost:8000/api/events/recommendations/60a7c8d3e4b0f3a1e7c8d3e4?limit=5"
```

**Example Response:**
```json
{
  "http_code": 200,
  "data": [
    {
      "id": "60a7...",
      "name": "Lễ hội Chùa Hương",
      "categories": ["lễ hội", "văn hóa", "tâm linh"],
      "location": {
        "address": "Hương Sơn, Mỹ Đức, Hà Nội",
        "city": "Hà Nội",
        "coordinates": {
          "type": "Point",
          "coordinates": [105.7644, 20.5595]
        }
      },
      "relevance_score": 25.0
    }
  ],
  "metadata": {
    "total": 5,
    "limit": 5,
    "has_more": false
  }
}
```

---

### 2. Get Nearby Events

**Endpoint:** `GET /api/events/nearby`

**Description:** Find events within a specified radius from a location

**Parameters:**
- `lat` (query, required): Latitude of center point
- `lng` (query, required): Longitude of center point
- `radius_km` (query, optional): Search radius in kilometers (default: 10, max: 500)
- `limit` (query, optional): Maximum results (default: 20, max: 100)

**Example Request:**
```bash
curl "http://localhost:8000/api/events/nearby?lat=21.0285&lng=105.8542&radius_km=50"
```

**Example Response:**
```json
{
  "http_code": 200,
  "data": [
    {
      "id": "60a7...",
      "name": "Lễ hội Chùa Hương",
      "location": {
        "coordinates": {
          "type": "Point",
          "coordinates": [105.7644, 20.5595]
        }
      },
      "distance_km": 28.5
    }
  ],
  "metadata": {
    "total": 3,
    "center": {"lat": 21.0285, "lng": 105.8542},
    "radius_km": 50,
    "limit": 20
  }
}
```

---

### 3. Search Events

**Endpoint:** `GET /api/events/search`

**Description:** Search and filter events by multiple criteria

**Parameters:**
- `q` (query, optional): Search query (searches in name, intro, history)
- `city` (query, optional): Filter by city
- `province` (query, optional): Filter by province
- `categories` (query, optional): Comma-separated list of categories
- `limit` (query, optional): Maximum results (default: 20, max: 100)

**Example Request:**
```bash
curl "http://localhost:8000/api/events/search?city=Hà Nội&categories=lễ hội,văn hóa"
```

**Example Response:**
```json
{
  "http_code": 200,
  "data": [
    {
      "id": "60a7...",
      "name": "Lễ hội Chùa Hương",
      "categories": ["lễ hội", "văn hóa", "tâm linh"],
      "location": {
        "city": "Hà Nội",
        "province": "Hà Nội"
      }
    }
  ],
  "metadata": {
    "total": 2,
    "query": null,
    "filters": {
      "city": "Hà Nội",
      "province": null,
      "categories": ["lễ hội", "văn hóa"]
    },
    "limit": 20
  }
}
```

---

### 4. Get Events by Category

**Endpoint:** `GET /api/events/category/{category}`

**Description:** Get all events in a specific category

**Parameters:**
- `category` (path, required): Category name

**Example Request:**
```bash
curl "http://localhost:8000/api/events/category/âm nhạc"
```

**Example Response:**
```json
{
  "http_code": 200,
  "data": [
    {
      "id": "60a7...",
      "name": "Festival Huế",
      "categories": ["lễ hội", "văn hóa", "nghệ thuật", "âm nhạc"]
    }
  ],
  "metadata": {
    "total": 2,
    "category": "âm nhạc"
  }
}
```

---

## 📊 Event Data Structure

### Location Object
```typescript
{
  address: string;        // Full address
  city: string;          // City name
  province: string;      // Province name
  coordinates: {         // GeoJSON Point
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  }
}
```

### Categories & Tags
```typescript
{
  categories: string[];  // ["lễ hội", "văn hóa", "âm nhạc"]
  tags: string[];       // ["huế", "cung đình", "áo dài"]
}
```

---

## 🗺️ Frontend Integration Examples

### 1. Display Events on Map (Google Maps)

```javascript
// Fetch events
const response = await fetch('/api/events/all');
const { data: events } = await response.json();

// Create markers
events.forEach(event => {
  if (event.location?.coordinates) {
    const [lng, lat] = event.location.coordinates.coordinates;
    
    new google.maps.Marker({
      position: { lat, lng },
      map: map,
      title: event.name
    });
  }
});
```

### 2. Get User Location and Find Nearby Events

```javascript
navigator.geolocation.getCurrentPosition(async (position) => {
  const { latitude, longitude } = position.coords;
  
  const response = await fetch(
    `/api/events/nearby?lat=${latitude}&lng=${longitude}&radius_km=20`
  );
  
  const { data: nearbyEvents } = await response.json();
  // Display nearby events
});
```

### 3. Get Personalized Recommendations

```javascript
const userId = getCurrentUserId();
const response = await fetch(`/api/events/recommendations/${userId}?limit=10`);
const { data: recommendations } = await response.json();

// recommendations are already sorted by relevance
recommendations.forEach(event => {
  console.log(`${event.name} - Score: ${event.relevance_score}`);
});
```

### 4. Advanced Search

```javascript
const searchParams = new URLSearchParams({
  q: 'hội',
  city: 'Hà Nội',
  categories: 'lễ hội,văn hóa',
  limit: 20
});

const response = await fetch(`/api/events/search?${searchParams}`);
const { data: results } = await response.json();
```

---

## 🔧 Setup Instructions

### 1. Run Seed Script
```bash
cd backend
python seed_events.py
```

### 2. Create Geospatial Indexes
```bash
python init_geospatial_indexes.py
```

### 3. Start Server
```bash
python main.py
```

### 4. Test Endpoints
```bash
# Get all events
curl http://localhost:8000/api/events/all

# Search
curl "http://localhost:8000/api/events/search?city=Hà Nội"

# Nearby (example coordinates for Hanoi)
curl "http://localhost:8000/api/events/nearby?lat=21.0285&lng=105.8542&radius_km=100"
```

---

## 📝 Available Categories

Common categories you can use:
- `lễ hội` - Festivals
- `văn hóa` - Culture
- `tâm linh` - Spiritual
- `du lịch` - Tourism
- `âm nhạc` - Music
- `nghệ thuật` - Arts
- `ẩm thực` - Food/Cuisine
- `thiên nhiên` - Nature
- `truyền thống` - Traditional
- `gia đình` - Family

---

## 🎯 Recommendation Algorithm

The recommendation system scores events based on:
- **Exact match** (hobby == category): 10 points
- **Partial match** (substring): 5 points
- **Related keywords**: 2 points

Events are ranked by total score (highest first). Only events with score > 0 are returned.

---

## 🌐 Geospatial Features

The system uses MongoDB's geospatial capabilities:
- **2dsphere index** for efficient location queries
- **GeoJSON Point format** for coordinates
- **Haversine formula** for distance calculation
- Support for queries like "find events within X km"
