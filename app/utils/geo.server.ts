const degreesToRadians = (degrees: number) => {
  return degrees * (Math.PI / 180);
};

const radiansToDegrees = (radians: number) => {
  return radians * (180 / Math.PI);
};

export const createRectangleFromCenter = (
  center: { latitude: number; longitude: number },
  radius: number
) => {
  const earthRadius = 6371000; // Earth's radius in meters
  const area = radius * 1000000; // Convert square kilometers to square meters

  // Convert latitude and longitude to radians
  const centerLat = degreesToRadians(center.latitude);
  const centerLng = degreesToRadians(center.longitude);

  // Calculate the angular distance in radians
  const angularDistance = area / earthRadius;

  // Calculate the SW and NE corners of the rectangle
  const swLat = centerLat - angularDistance;
  const swLng = centerLng - angularDistance / Math.cos(centerLat);
  const neLat = centerLat + angularDistance;
  const neLng = centerLng + angularDistance / Math.cos(centerLat);

  // Convert the corners back to degrees
  const swCorner = {
    latitude: radiansToDegrees(swLat),
    longitude: radiansToDegrees(swLng),
  };
  const neCorner = {
    latitude: radiansToDegrees(neLat),
    longitude: radiansToDegrees(neLng),
  };

  return { sw: swCorner, ne: neCorner };
};
