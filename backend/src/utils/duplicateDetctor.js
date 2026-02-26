import Complaint from "../models/complaint.model.js";
import { similarity } from "./textSimilarity.js";

// simple haversine distance (in meters)
function haversine(lat1, lon1, lat2, lon2) {
  function toRad(x) {
    return (x * Math.PI) / 180;
  }
  const R = 6371e3; // metres
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Look for a previously submitted complaint that is very similar to the new one.
 * - checks only complaints from the same user in the past week
 * - compares text similarity and location distance
 * returns the matching complaint document or null
 */
export const findDuplicateComplaint = async (
  text,
  latitude,
  longitude,
  userId
) => {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const candidates = await Complaint.find({
    user_id: userId,
    createdAt: { $gte: oneWeekAgo }
  });

  for (const c of candidates) {
    // if the existing complaint is already marked duplicate, skip
    if (c.is_duplicate) continue;

    const textSim = similarity(c.complaint_text || "", text || "");
    const dist = haversine(
      latitude,
      longitude,
      c.latitude,
      c.longitude
    );

    // consider duplicate if text is >80% similar AND within 500 meters
    if (textSim > 0.8 && dist < 500) {
      return c;
    }
  }
  return null;
};
