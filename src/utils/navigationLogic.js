// src/utils/navigationLogic.js

// 1. Decode Google's Encoded Polyline String into Coordinates
export const decodePolyline = (t, e) => {
  let n,
    o,
    u = 0,
    l = 0,
    r = 0,
    d = [],
    h = 0,
    i = 0,
    a = null,
    c = Math.pow(10, e || 5);
  for (; u < t.length; ) {
    (a = null), (h = 0), (i = 0);
    do {
      (a = t.charCodeAt(u++) - 63), (i |= (31 & a) << h), (h += 5);
    } while (a >= 32);
    (n = 1 & i ? ~(i >> 1) : i >> 1), (l += n);
    (h = 0), (i = 0);
    do {
      (a = t.charCodeAt(u++) - 63), (i |= (31 & a) << h), (h += 5);
    } while (a >= 32);
    (o = 1 & i ? ~(i >> 1) : i >> 1), (r += o);
    d.push({ latitude: l / c, longitude: r / c });
  }
  return d;
};

// 2. Calculate Distance from Point to Line Segment (The "Cross-Track" Distance)
const distToSegment = (p, v, w) => {
  const l2 = (w.latitude - v.latitude) ** 2 + (w.longitude - v.longitude) ** 2;
  if (l2 === 0) return getDist(p, v);
  let t =
    ((p.latitude - v.latitude) * (w.latitude - v.latitude) +
      (p.longitude - v.longitude) * (w.longitude - v.longitude)) /
    l2;
  t = Math.max(0, Math.min(1, t));
  const projection = {
    latitude: v.latitude + t * (w.latitude - v.latitude),
    longitude: v.longitude + t * (w.longitude - v.longitude),
  };
  return getDist(p, projection);
};

// Helper: Simple Distance (Pythagoreanish approximation for short distances is faster, but Haversine is safer)
const getDist = (p1, p2) => {
  const R = 6371e3; // meters
  const φ1 = (p1.latitude * Math.PI) / 180;
  const φ2 = (p2.latitude * Math.PI) / 180;
  const Δφ = ((p2.latitude - p1.latitude) * Math.PI) / 180;
  const Δλ = ((p2.longitude - p1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

// 3. MAIN FUNCTION: Are we off route?
// Checks if the user is further than 'threshold' meters from ANY point on the polyline path
// Optimization: Only check the closest 5-10 segments to avoid checking a 500km route every second
export const isUserOffRoute = (userLoc, polylinePoints, threshold = 50) => {
  if (!userLoc || !polylinePoints || polylinePoints.length < 2) return false;

  let minDistance = Number.MAX_VALUE;

  // Check distance to every segment (Optimizable: create a "window" around current index)
  for (let i = 0; i < polylinePoints.length - 1; i++) {
    const p1 = polylinePoints[i];
    const p2 = polylinePoints[i + 1];
    const d = distToSegment(userLoc, p1, p2);
    if (d < minDistance) minDistance = d;
  }

  // Return TRUE if closest point is further than threshold (e.g. 50 meters)
  return minDistance > threshold;
};
