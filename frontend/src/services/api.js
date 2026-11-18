const API_BASE_URL = '/api';

function getAuthHeader() {
  const token = localStorage.getItem('globetrotter_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });
  
  if (response.status === 401) {
    // If unauthorized, clear invalid token
    if (localStorage.getItem('globetrotter_token') && !endpoint.includes('/auth/login')) {
      localStorage.removeItem('globetrotter_token');
      localStorage.removeItem('globetrotter_user');
      window.dispatchEvent(new Event('auth-change'));
    }
  }

  const contentType = response.headers.get('content-type');
  let data;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = data?.message || data?.error || (typeof data === 'string' ? data : 'API Request Failed');
    throw new Error(errorMsg);
  }

  return data;
}

export const authService = {
  login: async (email, password) => {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('globetrotter_token', data.token);
    localStorage.setItem('globetrotter_user', JSON.stringify(data));
    window.dispatchEvent(new Event('auth-change'));
    return data;
  },

  register: async (userData) => {
    const data = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    localStorage.setItem('globetrotter_token', data.token);
    localStorage.setItem('globetrotter_user', JSON.stringify(data));
    window.dispatchEvent(new Event('auth-change'));
    return data;
  },

  logout: () => {
    localStorage.removeItem('globetrotter_token');
    localStorage.removeItem('globetrotter_user');
    window.dispatchEvent(new Event('auth-change'));
  },

  getCurrentUser: () => {
    try {
      const user = localStorage.getItem('globetrotter_user');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },

  getToken: () => localStorage.getItem('globetrotter_token'),
};

export const circuitService = {
  getAll: (state) => request(state && state !== 'All India' ? `/circuits?state=${encodeURIComponent(state)}` : '/circuits'),
  getDistinctStates: () => request('/circuits/states'),
  getFeatured: () => request('/circuits/featured'),
  getBySlugOrId: (slugOrId) => request(`/circuits/${slugOrId}`),
  optimizeRoute: (circuitId, startPlaceId, startTime = '09:00') =>
    request(`/circuits/${circuitId}/optimize-route?${startPlaceId ? `startPlaceId=${startPlaceId}&` : ''}startTime=${encodeURIComponent(startTime)}`, {
      method: 'POST',
    }),
  evaluateNextLocation: (circuitId, currentPlaceId, currentTime = '12:00', visitedPlaceIds = []) => {
    let query = `currentTime=${encodeURIComponent(currentTime)}`;
    if (currentPlaceId) query += `&currentPlaceId=${currentPlaceId}`;
    if (visitedPlaceIds && visitedPlaceIds.length > 0) {
      query += `&visitedPlaceIds=${visitedPlaceIds.join(',')}`;
    }
    return request(`/circuits/${circuitId}/next-location?${query}`, {
      method: 'POST',
    });
  },
  getCorridorPlaces: (circuitId) => request(`/circuits/${circuitId}/corridor-places`),
  optimizeCustomRoute: (payload) =>
    request('/circuits/custom-route', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

export const placeService = {
  getAll: () => request('/places'),
  getByCategory: (cat) => request(`/places/category/${cat}`),
  getBySlugOrId: (slugOrId) => request(`/places/${slugOrId}`),
  getDistricts: () => request('/places/districts'),
  getByDistrict: (district) => request(`/places/district/${encodeURIComponent(district)}`),
  getGuide: (idOrSlug, day, time) => {
    let query = '';
    if (day) query += `day=${encodeURIComponent(day)}`;
    if (time) query += `${query ? '&' : ''}time=${encodeURIComponent(time)}`;
    return request(`/places/${idOrSlug}/guide${query ? `?${query}` : ''}`);
  },
  getCrowdForecast: (id, day, time) => {
    let query = '';
    if (day) query += `day=${encodeURIComponent(day)}`;
    if (time) query += `${query ? '&' : ''}time=${encodeURIComponent(time)}`;
    return request(`/places/${id}/crowd-forecast${query ? `?${query}` : ''}`);
  },
};

export const bookingService = {
  // Step 1: Creates a PENDING booking before payment
  checkout: (circuitId, numberOfTourists, visitStartDate) =>
    request('/bookings/checkout', {
      method: 'POST',
      body: JSON.stringify({ circuitId, numberOfTourists, visitStartDate }),
    }),

  getMyPasses: () => request('/bookings/my-passes'),

  getByReference: (reference) => request(`/bookings/${reference}`),

  getQrImageUrl: (reference) => `/api/bookings/verify/qr-image/${reference}`,
};

// ── Razorpay Payment Service ──────────────────────────────────────────────────
export const paymentService = {
  /**
   * Step 2: Create a Razorpay order for a PENDING booking.
   * Returns: { razorpayOrderId, amount, razorpayKeyId, ... }
   */
  initiatePayment: (bookingReference) =>
    request(`/payments/initiate?reference=${encodeURIComponent(bookingReference)}`, {
      method: 'POST',
    }),

  /**
   * Step 3: Verify Razorpay payment signature after checkout widget closes.
   * Returns the fully confirmed BookingResponse if signature is valid.
   */
  verifyPayment: (bookingReference, razorpayOrderId, razorpayPaymentId, razorpaySignature) =>
    request('/payments/verify', {
      method: 'POST',
      body: JSON.stringify({
        bookingReference,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      }),
    }),
};

export const scannerService = {
  scanPass: (passToken, placeId, gateTerminalId = 'Gate-Alpha') =>
    request('/verify/scan', {
      method: 'POST',
      body: JSON.stringify({ passToken, placeId, gateTerminalId }),
    }),

  batchSyncOfflineScans: (scans) =>
    request('/verify/batch-sync', {
      method: 'POST',
      body: JSON.stringify(scans),
    }),

  inspectPass: (passToken) => request(`/verify/pass/${encodeURIComponent(passToken)}`),
};

export const poaService = {
  generateToken: (payload) =>
    request('/poa/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  verifyToken: (token) =>
    request('/poa/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  getQrImageUrl: (token) => `/api/poa/qr?token=${encodeURIComponent(token)}`,
};

export const analyticsService = {
  getSummary: () => request('/admin/analytics'),
};

export const adminService = {
  createCircuit: (circuitData) =>
    request('/admin/circuits', {
      method: 'POST',
      body: JSON.stringify(circuitData),
    }),

  createPlace: (placeData) =>
    request('/admin/places', {
      method: 'POST',
      body: JSON.stringify(placeData),
    }),
};

export const chatService = {
  sendMessage: (message, sessionId) =>
    request('/chat/message', {
      method: 'POST',
      body: JSON.stringify({ message, sessionId }),
    }),

  getHistory: (sessionId) => request(`/chat/history/${sessionId}`),

  transcribeAudio: async (audioBlob, filename = 'voice.webm') => {
    const formData = new FormData();
    formData.append('file', audioBlob, filename);
    const token = localStorage.getItem('globetrotter_token');
    const res = await fetch('/api/chat/transcribe', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) throw new Error('Voice transcription failed');
    return res.json();
  },
};

export const tripService = {
  generateAiPlan: (payload) =>
    request('/trip/generate-ai-plan', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getCircuitBreakerStatus: () => request('/trip/circuit-breaker-status'),
};


