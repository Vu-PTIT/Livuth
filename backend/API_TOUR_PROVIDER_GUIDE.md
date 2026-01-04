# Tour Provider API Documentation

## 🆕 Tour Provider Listing Endpoints

### Overview
The Tour Provider system is a **connection platform** (directory/marketplace) where tour providers can list their services for events. Users browse listings and contact providers directly - **NOT a booking platform**.

---

## Public Endpoints

### 1. Get Tour Providers by Event

**Endpoint:** `GET /api/tour-providers/event/{event_id}`

**Description:** Get all approved tour provider listings for a specific event

**Parameters:**
- `event_id` (path, required): Event ID

**Example Request:**
```bash
curl "http://localhost:8000/api/tour-providers/event/677..."
```

**Example Response:**
```json
{
  "http_code": 200,
  "data": [
    {
      "id": "678a...",
      "event_id": "677...",
      "event_name": "Lễ hội Chùa Hương",
      "provider_id": "676...",
      "company_name": "Du Lịch Việt Express",
      "service_name": "Tour Chùa Hương VIP - Trọn gói",
       "description": "Chuyên cung cấp tour...",
      "highlights": ["Xe riêng", "HDV chuyên nghiệp", "Bữa ăn buffet"],
      "price_range": "700,000 - 1,500,000 VND/người",
      "contact_name": "Nguyễn Văn An",
      "contact_phone": "0901234567",
      "contact_email": "info@viettravel.vn",
      "contact_website": "https://viettravel.vn",
      "contact_facebook": "https://facebook.com/viettravel",
      "contact_zalo": "0901234567",
      "status": "approved",
      "verification_status": "verified",
      "view_count": 342
    }
  ],
  "metadata": {
    "total": 2,
    "event_id": "677..."
  }
}
```

---

### 2. Get Tour Provider Details

**Endpoint:** `GET /api/tour-providers/{listing_id}`

**Description:** Get tour provider listing details (automatically increments view count)

**Example Request:**
```bash
curl "http://localhost:8000/api/tour-providers/678a..."
```

---

### 3. Search Tour Providers

**Endpoint:** `GET /api/tour-providers/search`

**Parameters:**
- `q` (query, optional): Search query
- `event_id` (query, optional): Filter by event
- `limit` (query, optional): Max results (default: 20, max: 100)

**Example Request:**
```bash
curl "http://localhost:8000/api/tour-providers/search?q=chùa hương&limit=10"
```

---

## Provider Endpoints (Requires Authentication)

### 4. Create Tour Provider Listing

**Endpoint:** `POST /api/tour-providers`

**Auth:** Requires Bearer token

**Example Request:**
```bash
curl -X POST "http://localhost:8000/api/tour-providers" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "677...",
    "company_name": "Du Lịch Việt Express",
    "service_name": "Tour Chùa Hương trọn gói",
    "description": "Chuyên cung cấp tour Chùa Hương...",
    "highlights": ["Xe riêng", "HDV chuyên nghiệp", "Bữa ăn buffet"],
    "price_range": "700,000 - 1,500,000 VND",
    "contact_name": "Nguyễn Văn An",
    "contact_phone": "0901234567",
    "contact_email": "info@viettravel.vn"
  }'
```

---

### 5. Get My Listings

**Endpoint:** `GET /api/tour-providers/my-listings`

**Auth:** Requires Bearer token

**Description:** Get all my listings (including pending, approved, rejected)

**Example Response:**
```json
{
  "data": [...],
  "metadata": {
    "total": 5,
    "total_views": 1250,
    "pending": 1,
    "approved": 3,
    "rejected": 1
  }
}
```

---

### 6. Update Listing

**Endpoint:** `PUT /api/tour-providers/{listing_id}`

**Auth:** Requires Bearer token (must be owner)

---

### 7. Delete Listing

**Endpoint:** `DELETE /api/tour-providers/{listing_id}`

**Auth:** Requires Bearer token (must be owner)

---

## Admin Endpoints

### 8. Get Pending Listings

**Endpoint:** `GET /api/tour-providers/admin/pending`

**Auth:** Requires admin role

---

### 9. Approve Listing

**Endpoint:** `PATCH /api/tour-providers/{listing_id}/approve`

**Auth:** Requires admin role

---

### 10. Reject Listing

**Endpoint:** `PATCH /api/tour-providers/{listing_id}/reject?reason=...`

**Auth:** Requires admin role

**Parameters:**
- `reason` (query, required): Rejection reason

---

### 11. Verify Provider

**Endpoint:** `PATCH /api/tour-providers/{listing_id}/verify`

**Auth:** Requires admin role

**Description:** Mark provider as verified (trusted badge)

---

## Frontend Integration

### Display Tour Providers for Event

```javascript
async function loadTourProviders(eventId) {
  const response = await fetch(`/api/tour-providers/event/${eventId}`);
  const { data: providers } = await response.json();
  
  const listingsHtml = providers.map(provider => `
    <div class="provider-card ${provider.verification_status === 'verified' ? 'verified' : ''}">
      ${provider.verification_status === 'verified' ? 
        '<span class="badge">✓ Đã xác thực</span>' : ''}
      
      <h3>${provider.company_name}</h3>
      <h4>${provider.service_name}</h4>
      <p>${provider.description}</p>
      
      <div class="highlights">
        ${provider.highlights.map(h => `<li>✓ ${h}</li>`).join('')}
      </div>
      
      <div class="price">💰 ${provider.price_range}</div>
      
      <div class="contact">
        <a href="tel:${provider.contact_phone}">📞 ${provider.contact_phone}</a>
        <a href="mailto:${provider.contact_email}">✉️ Email</a>
        ${provider.contact_website ? 
          `<a href="${provider.contact_website}" target="_blank">🌐 Website</a>` : ''}
        ${provider.contact_zalo ? 
          `<a href="https://zalo.me/${provider.contact_zalo}" target="_blank">💬 Zalo</a>` : ''}
      </div>
    </div>
  `).join('');
  
  document.getElementById('providers').innerHTML = listingsHtml;
}
```

---

## Key Points

### ✅ What This System Does:
1. **Listing Platform** - Providers list their services
2. **Contact Directory** - Users find and contact providers
3. **Verification** - Admin verifies trusted providers
4. **Analytics** - View counts for listings

### ❌ What This System DOES NOT Do:
1. **No Booking** - Users contact providers directly
2. **No Payments** - Payment handled offline
3. **No Scheduling** - Providers manage their own calendar
4. **No Reviews** - (could be added later)

---

## Setup Instructions

### 1. Run Event Seed (if not done)
```bash
cd backend
py seed_events.py
```

### 2. Run Tour Provider Seed
```bash
py seed_tour_providers.py
```

### 3. Start Server
```bash
py main.py
```

### 4. Test Endpoints
```bash
# Get tour providers for an event
curl "http://localhost:8000/api/tour-providers/event/{event_id}"

# Search
curl "http://localhost:8000/api/tour-providers/search?q=chùa hương"
```
