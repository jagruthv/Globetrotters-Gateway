/**
 * Cloudflare Pages Edge Worker for Globetrotter Gateway
 * Handles live AI chat and multimodal vision routing with Google Gemini 3.8 Flash.
 * Hardened with Arena-Grade Anti-Bot, Anti-Scraping & Origin Integrity Armor.
 */

function getGeminiKey(env) {
  // Read exclusively from Cloudflare encrypted environment secrets vault
  return (env && env.GEMINI_API_KEY) ? env.GEMINI_API_KEY : '';
}

// ── Arena-Grade Threat & Automation Armor ────────────────────────────────────
const ALLOWED_HOSTNAMES = new Set([
  'globetrotter-gateway.pages.dev',
  'localhost',
  '127.0.0.1'
]);

function isAllowedHost(urlString) {
  try {
    if (!urlString) return false;
    const parsed = new URL(urlString);
    if (ALLOWED_HOSTNAMES.has(parsed.hostname)) return true;
    if (parsed.hostname.endsWith('.globetrotter-gateway.pages.dev')) return true;
    return false;
  } catch {
    return false;
  }
}

function verifyWebsiteIntegrity(request) {
  const origin = request.headers.get('Origin') || '';
  const referer = request.headers.get('Referer') || '';
  const userAgent = (request.headers.get('User-Agent') || '').toLowerCase();
  const secFetchSite = request.headers.get('Sec-Fetch-Site') || '';

  // 1. Block automated CLI tools, HTTP scripting libraries, headless runners & scrapers
  const blockedSignatures = [
    'curl', 'python', 'aiohttp', 'requests', 'node-fetch', 'axios', 
    'postman', 'insomnia', 'go-http-client', 'httpclient', 'scrapy', 
    'urllib', 'wget', 'libwww-perl', 'java/', 'bot', 'spider', 'crawler'
  ];
  if (!userAgent || blockedSignatures.some(sig => userAgent.includes(sig))) {
    return {
      allowed: false,
      response: new Response(JSON.stringify({
        error: 'Security Alert (OAT-005): Automated API execution prohibited.',
        message: 'This endpoint is strictly coupled to interactive browser sessions at https://globetrotter-gateway.pages.dev.'
      }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'X-Threat-Defense': 'Arena-Grade-Guard-Active'
        }
      })
    };
  }

  // 2. Browser Fetch Metadata Integrity (Sec-Fetch-Site cannot be forged by client scripts)
  if (secFetchSite && secFetchSite === 'cross-site') {
    return {
      allowed: false,
      response: new Response(JSON.stringify({
        error: 'Security Alert: Cross-site invocation blocked. Requests must originate directly on globetrotter-gateway.pages.dev.'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })
    };
  }

  // 3. Strict Origin & Referer Verification
  const validOrigin = origin ? isAllowedHost(origin) : false;
  const validReferer = referer ? isAllowedHost(referer) : false;

  if (!validOrigin && !validReferer) {
    return {
      allowed: false,
      response: new Response(JSON.stringify({
        error: 'Access Denied: Missing or unauthorized Origin/Referer header.',
        message: 'Requests are strictly locked to the Globetrotter Gateway website.'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })
    };
  }

  return { allowed: true };
}

function getCorsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowOrigin = isAllowedHost(origin) ? origin : 'https://globetrotter-gateway.pages.dev';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Vary': 'Origin'
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ── Pre-Flight Edge Armor: Block sensitive dotfiles, path traversal and system probing ──
    const lowerPath = url.pathname.toLowerCase();
    const decodedPath = decodeURIComponent(url.pathname).toLowerCase();
    if (
      lowerPath.startsWith('/.') ||
      lowerPath.includes('/.env') ||
      lowerPath.includes('/.git') ||
      lowerPath.includes('/.aws') ||
      lowerPath.includes('/wp-') ||
      lowerPath.includes('/package.json') ||
      lowerPath.includes('..') ||
      decodedPath.includes('..')
    ) {
      return new Response(JSON.stringify({
        error: 'Security Alert (OAT-004): Direct access to configuration artifacts or directory traversal is strictly forbidden.',
        path: url.pathname
      }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'X-Threat-Defense': 'Active-Defense-Quarantine'
        }
      });
    }

    // ── 1. Plan Generation with Gemini 3.8 Flash (Fallback: Gemini 3.5 Flash Lite) ──
    if (url.pathname === '/api/trip/generate-ai-plan') {
      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: getCorsHeaders(request) });
      }

      if (request.method === 'POST') {
        const check = verifyWebsiteIntegrity(request);
        if (!check.allowed) return check.response;

        try {
          const body = await request.json();
          const places = body.places || [];
          const pace = body.pace || 'BALANCED';
          const requestedDays = body.days || null;

          if (places.length === 0) {
            return new Response(JSON.stringify({ error: 'No places provided' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
            });
          }

          const apiKey = getGeminiKey(env);
          const placesDescription = places.map((p, idx) => `
Spot ${idx + 1}: ${p.name}
- District: ${p.district}
- Category: ${p.category || 'Heritage'}
- Elevation: ${p.elevationMeters || 100}m
- Operating Hours: ${p.timings || `${p.openingTime || '09:00 AM'} - ${p.closingTime || '06:00 PM'}`}
- Best Time to Visit: ${p.bestTimeToVisit || 'Morning or late afternoon'}
- Checkpost Curfew: ${p.checkpostCurfew || 'None'}
- Culinary Specialty: ${p.culinarySpecialty || 'Local Andhra/Telangana cuisine'}
- Entry Ticket: ₹${p.individualPrice || 0}
`).join('\n');

          const systemPrompt = `You are the Lead Tourism & Route Architecture AI for Globetrotter Gateway (covering Andhra Pradesh & Telangana).
Your goal is to create an authentic, topographically optimal, high-converting multi-day itinerary that delights tourists and eliminates travel fatigue on ghat roads.
Factor in physical reality:
1. Schedule caves, valleys, and viewpoints during safe daytime hours before evening fog or checkpost curfews.
2. Pair spots located close to each other on the same day.
3. Factor in realistic driving times and meal stops with regional culinary specialties.
4. Calculate bundle pass savings compared to separate individual gate tickets.

CRITICAL: Return ONLY raw valid JSON (no markdown formatting, no code fences, no prose outside JSON) with this schema:
{
  "title": "string (Compelling Tour Title)",
  "summary": "string (2-3 sentences explaining why this order is optimal)",
  "totalRoadKm": number,
  "totalDriveHours": "string (e.g. 4.5 hrs)",
  "packagePrice": number,
  "individualPriceTotal": number,
  "savings": "string (e.g. Save ₹120 with Unified Circuit Pass)",
  "modelUsed": "Google Gemini 3.8 Flash",
  "days": [
    {
      "dayNumber": number,
      "theme": "string",
      "daySummary": "string",
      "totalKm": number,
      "estimatedDriveTime": "string",
      "stops": [
        {
          "name": "string",
          "district": "string",
          "timeSlot": "string (e.g. 09:30 AM – 11:30 AM)",
          "whyThisTime": "string (reason based on sunlight, temperature, or crowds)",
          "bestTimeToVisit": "string",
          "culinaryTip": "string (authentic dish to try nearby)",
          "curfewNote": "string or null",
          "individualPrice": number
        }
      ]
    }
  ],
  "travelAdvice": ["string (2-3 practical tips)"]
}`;

          const userPrompt = `Generate a ${requestedDays ? `${requestedDays}-day` : 'comfortable'} ${pace.toLowerCase()} pace itinerary for these ${places.length} destinations:\n${placesDescription}`;

          const modelsToTry = ["gemini-3.8-flash", "gemini-3.5-flash-lite"];
          let planData = null;

          for (const modelId of modelsToTry) {
            try {
              const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
              const resp = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: userPrompt }] }],
                  systemInstruction: { parts: [{ text: systemPrompt }] },
                  generationConfig: {
                    temperature: 0.2,
                    maxOutputTokens: 2500,
                    responseMimeType: "application/json"
                  }
                })
              });
              const data = await resp.json();
              const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (rawText) {
                const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                planData = JSON.parse(cleanJson);
                planData.success = true;
                planData.modelUsed = `Google Gemini (${modelId})`;
                break;
              }
            } catch (err) {
              console.warn(`[Plan Gen] ${modelId} error:`, err);
            }
          }

          if (planData) {
            return new Response(JSON.stringify(planData), {
              headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
            });
          }
        } catch (e) {
          console.error("Plan Generation Error:", e);
        }
      }
    }

    // ── 2. Interactive Plan Modification with Gemini 3.8 Flash ──
    if (url.pathname === '/api/trip/modify-ai-plan') {
      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: getCorsHeaders(request) });
      }

      if (request.method === 'POST') {
        const check = verifyWebsiteIntegrity(request);
        if (!check.allowed) return check.response;

        try {
          const body = await request.json();
          const { currentPlan, userFeedback } = body;
          const apiKey = getGeminiKey(env);

          const systemPrompt = `You are the Globetrotter Gateway Autonomous Tourist Concierge & MCP Agent (powered by Google Gemini 3.8 Flash).
You operate directly on the tourist's account according to verified platform rules across Andhra Pradesh and Telangana.

Your agent capabilities (Tools):
1. Plan Modification: Adjust destinations, pacing, sunset viewing, food recommendations, and daily themes while respecting real road curvature and gate operating hours.
2. Tool Execution (MCP Actions):
   - "book_pass": When the tourist asks to book the pass, says "book for me", confirms, or approves the itinerary.
   - "save_itinerary": When the tourist asks to save the trip to their account or profile.
   - "show_passes": When the tourist asks "show my tickets", "what passes do I have?", or "my bookings".
   - "play_audio": When the tourist asks to hear or play the audio guide story for a monument.
   - "none": For general conversational inquiries.

Platform Rules:
- Physical road speeds: 40-50 km/h in ghat/hilly terrain (Araku, Srisailam), 65 km/h on national highways.
- Maximum 5 stops per day to avoid traveler exhaustion.
- Entry gates close by 5:00 PM for caves and forest sanctuaries.

CRITICAL: Return ONLY raw JSON adhering strictly to this schema:
{
  "replyMessage": "string (Warm, human, concise concierge response explaining what you did)",
  "readyToBook": boolean,
  "action": {
    "tool": "book_pass | save_itinerary | show_passes | play_audio | none",
    "params": {
      "passTitle": "string",
      "attractionName": "string"
    }
  },
  "updatedPlan": {
    "title": "string",
    "summary": "string",
    "totalRoadKm": number,
    "totalDriveHours": "string",
    "packagePrice": number,
    "individualPriceTotal": number,
    "savings": "string",
    "days": [
      {
        "dayNumber": number,
        "theme": "string",
        "daySummary": "string",
        "totalKm": number,
        "estimatedDriveTime": "string",
        "stops": [
          {
            "name": "string",
            "district": "string",
            "timeSlot": "string",
            "whyThisTime": "string",
            "bestTimeToVisit": "string",
            "culinaryTip": "string",
            "individualPrice": number
          }
        ]
      }
    ]
  }
}`;

          const userPrompt = `Current Itinerary Plan:\n${JSON.stringify(currentPlan, null, 2)}\n\nTourist Modification Request:\n"${userFeedback}"`;

          const modelsToTry = ["gemini-3.8-flash", "gemini-3.5-flash-lite"];
          let modifyData = null;

          for (const modelId of modelsToTry) {
            try {
              const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
              const resp = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: userPrompt }] }],
                  systemInstruction: { parts: [{ text: systemPrompt }] },
                  generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 2500,
                    responseMimeType: "application/json"
                  }
                })
              });
              const data = await resp.json();
              const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (rawText) {
                const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                modifyData = JSON.parse(cleanJson);
                break;
              }
            } catch (err) {
              console.warn(`[Plan Modify] ${modelId} error:`, err);
            }
          }

          if (modifyData) {
            return new Response(JSON.stringify(modifyData), {
              headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
            });
          }
        } catch (e) {
          console.error("Plan Modification Error:", e);
        }
      }
    }

    // ── 3. AI Chat & Live Multimodal Vision Endpoint ──
    if (url.pathname === '/api/chat' || url.pathname === '/api/chat/message' || url.pathname === '/api/chat/live') {
      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: getCorsHeaders(request) });
      }

      if (request.method === 'POST') {
        const check = verifyWebsiteIntegrity(request);
        if (!check.allowed) return check.response;

        try {
          const body = await request.json();
          const userPrompt = body.message || body.prompt || body.content || '';
          const imageBase64 = body.image || null;
          const mimeType = body.mimeType || 'image/jpeg';

          const contentsParts = [];
          if (userPrompt) {
            contentsParts.push({ text: userPrompt });
          }
          if (imageBase64) {
            const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
            contentsParts.push({
              inlineData: {
                mimeType: mimeType,
                data: cleanBase64
              }
            });
          }

          if (contentsParts.length === 0) {
            contentsParts.push({ text: "Hello" });
          }

          // Primary: gemini-3.8-flash, Fallback: gemini-3.5-flash-lite
          const modelsToTry = ["gemini-3.8-flash", "gemini-3.5-flash-lite"];
          let replyText = null;
          let usedModelName = "Google Gemini 3.8 Flash (Live Edge)";

          const apiKey = getGeminiKey(env);
          for (const modelId of modelsToTry) {
            try {
              const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
              const geminiResp = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: contentsParts }],
                  systemInstruction: {
                    parts: [{
                      text: body.systemInstruction || "You are the Globetrotter Gateway Live Cultural Voice & Vision Concierge for Andhra Pradesh and Telangana. You provide concise, real-time, authentic travel intelligence across all 59 districts, monuments, heritage circuits, and local culture. Speak naturally like an engaging expert local guide. If an image is provided from the live camera, observe what is shown and provide vivid cultural context. Keep responses natural, concise (2-4 sentences for easy voice listening), and never give robotic disclaimer filler."
                    }]
                  },
                  generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 500
                  }
                })
              });

              const geminiData = await geminiResp.json();
              if (geminiData?.candidates?.[0]?.content?.parts) {
                const textPart = geminiData.candidates[0].content.parts.find(p => p.text && !p.thought);
                if (textPart) {
                  replyText = textPart.text;
                } else if (geminiData.candidates[0].content.parts[0]?.text) {
                  replyText = geminiData.candidates[0].content.parts[0].text;
                }
                usedModelName = `Google Gemini (${modelId})`;
                break; // Successfully got response
              } else if (geminiData?.error?.message) {
                console.warn(`[Edge Cascade] ${modelId} error: ${geminiData.error.message}. Cascading...`);
              }
            } catch (modelErr) {
              console.warn(`[Edge Cascade] ${modelId} fetch error:`, modelErr);
            }
          }

          if (!replyText) {
            replyText = "Namaskaram! I am your live cultural guide. What part of Andhra Pradesh or Telangana would you like to explore today?";
          }

          return new Response(JSON.stringify({
            response: replyText,
            message: replyText,
            model: usedModelName
          }), {
            headers: {
              'Content-Type': 'application/json',
              ...getCorsHeaders(request)
            }
          });
        } catch (err) {
          return new Response(JSON.stringify({
            error: err.message,
            response: `Unable to process request: ${err.message}`
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              ...getCorsHeaders(request)
            }
          });
        }
      }
    }

    // ── 4. Proxy all other /api/* endpoints to AWS EC2 Spring Boot Backend ──
    if (url.pathname.startsWith('/api/')) {
      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: getCorsHeaders(request) });
      }
      const backendBase = env?.BACKEND_URL || 'http://ec2-16-4-37-178.ap-south-1.compute.amazonaws.com';
      const targetUrl = new URL(url.pathname + url.search, backendBase);
      const proxyRequest = new Request(targetUrl, {
        method: request.method,
        headers: request.headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
        redirect: 'follow'
      });
      const backendResp = await fetch(proxyRequest);
      const cors = getCorsHeaders(request);
      const newHeaders = new Headers(backendResp.headers);
      for (const [k, v] of Object.entries(cors)) {
        newHeaders.set(k, v);
      }
      newHeaders.set('X-Content-Type-Options', 'nosniff');
      newHeaders.set('X-Frame-Options', 'DENY');
      return new Response(backendResp.body, {
        status: backendResp.status,
        statusText: backendResp.statusText,
        headers: newHeaders
      });
    }

    // Serve static assets via Cloudflare Pages with Defense-in-Depth Security Armor
    const assetResp = await env.ASSETS.fetch(request);
    const secHeaders = new Headers(assetResp.headers);
    secHeaders.set('X-Frame-Options', 'DENY');
    secHeaders.set('X-Content-Type-Options', 'nosniff');
    secHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    secHeaders.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    secHeaders.set('Permissions-Policy', 'geolocation=(self), microphone=(self), camera=(self)');
    secHeaders.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    secHeaders.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://checkout.razorpay.com https://control.msg91.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https: http:; connect-src 'self' https://generativelanguage.googleapis.com https://accounts.google.com https://api.razorpay.com https://control.msg91.com http://ec2-16-4-37-178.ap-south-1.compute.amazonaws.com http://localhost:*; frame-src 'self' https://accounts.google.com https://api.razorpay.com https://control.msg91.com; frame-ancestors 'none';");

    return new Response(assetResp.body, {
      status: assetResp.status,
      statusText: assetResp.statusText,
      headers: secHeaders
    });
  }
};
