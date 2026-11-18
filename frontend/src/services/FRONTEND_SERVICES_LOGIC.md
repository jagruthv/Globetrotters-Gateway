# Frontend Services — Logic Audit & Implementation Status

This document provides a factual, code-verified audit of API client services in `frontend/src/services/api.js`.

---

## 1. HTTP Request Engine (`request()`)
- **Implemented Logic**:
  - Automatically prepends `/api` base URL.
  - Injects `Authorization: Bearer <token>` from `localStorage.getItem('globetrotter_token')` if present.
  - Automatically serializes JSON request payloads and parses JSON or text responses.
  - Auto-cleans expired session on HTTP 401: Clears `globetrotter_token` and `globetrotter_user` from `localStorage` and dispatches `auth-change` event to update React context.
  - Extracts descriptive error messages from backend responses (`data.message` or `data.error`).
- **Not Yet Implemented / Gaps**:
  - No automatic retry on network timeout (e.g. exponential backoff).
  - No request cancellation using `AbortController`.

---

## 2. Service Modules

### `authService`
- **Methods**: `login(email, password)`, `register(userData)`, `logout()`, `getCurrentUser()`, `getToken()`.
- **Implemented Logic**: Dispatches `auth-change` window event on login, register, and logout to keep all active tabs synchronized.
- **Gaps**: No token refresh method.

### `circuitService`
- **Methods**:
  - `getAll(state)`: Fetches circuits with optional regional state filtering (e.g. `Andhra Pradesh`, `Telangana`).
  - `getDistinctStates()`: Retrieves list of states hosting circuits for regional tabs.
  - `getFeatured()`: Fetches featured circuits for homepage showcase.
  - `getBySlugOrId(slugOrId)`: Retrieves full circuit details and itinerary stops.
  - `optimizeRoute(circuitId, startPlaceId, startTime)`: Triggers TSP-TW route optimizer.
  - `evaluateNextLocation(circuitId, currentPlaceId, currentTime, visitedPlaceIds)`: Dynamic next-best stop re-routing.
  - `getCorridorPlaces(circuitId)`: Fetches roadside attractions along the circuit transit corridor.
  - `optimizeCustomRoute(payload)`: Solves TSP-TW over arbitrary custom itineraries.
- **Implemented Logic**: Full integration with backend route-optimization and state filtering APIs.

### `placeService`
- **Methods**:
  - `getAll()`: Retrieves all active attractions.
  - `getByCategory(cat)`: Filters attractions by category.
  - `getBySlugOrId(slugOrId)`: Retrieves single attraction details.
  - `getDistricts()`: Retrieves sorted district catalog across Andhra Pradesh and Telangana.
  - `getByDistrict(district)`: Queries verified attractions for a specific district.
  - `getGuide(idOrSlug, day, time)`: Fetches full ground-truth guide (`PlaceGuideDTO`) with dynastic lore and crowd forecast.
  - `getCrowdForecast(id, day, time)`: Fetches diurnal crowd forecast (`CrowdForecastDTO`).
- **Implemented Logic**: Powers 59-district atlas browsing, Trip Planner, and Place Guide Modal.

### `bookingService`
- **Methods**: `checkout(circuitId, numberOfTourists, visitStartDate)`, `getMyPasses()`, `getByReference(reference)`, `getQrImageUrl(reference)`.
- **Implemented Logic**: Step 1 checkout creation, pass history retrieval, and QR image URL resolution.
- **Gaps**: No pass cancellation or date rescheduling methods.

### `paymentService`
- **Methods**: `initiatePayment(bookingReference)`, `verifyPayment(reference, orderId, paymentId, signature)`.
- **Implemented Logic**: Handles 2-step Razorpay payment flow.

### `scannerService`
- **Methods**: `scanPass(passToken, placeId, gateTerminalId)`, `inspectPass(passToken)`.
- **Implemented Logic**: Gate check-in post and pass inspector get.

### `analyticsService`
- **Methods**: `getSummary()`.
- **Implemented Logic**: Calls `/admin/analytics`.
- **Gaps**: No admin CRUD methods (e.g. `createCircuit`, `updateCircuit`, `deleteCircuit`, `createPlace`, etc.) are defined in `api.js` despite existing on the backend.

### `chatService`
- **Methods**: `sendMessage(message, sessionId)`, `getHistory(sessionId)`.
- **Implemented Logic**: Interacts with `/api/chat` endpoints.
