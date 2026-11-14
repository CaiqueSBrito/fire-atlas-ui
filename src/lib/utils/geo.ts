import * as THREE from "three";

export function latLonToVector3(lat: number, lon: number, radius = 1) {
  const phi = THREE.MathUtils.degToRad(lat);
  const theta = THREE.MathUtils.degToRad(lon);
  return new THREE.Vector3(
    radius * Math.cos(phi) * Math.cos(theta),
    radius * Math.sin(phi),
    -radius * Math.cos(phi) * Math.sin(theta),
  );
}

export function vectorToLatLon(v: { x: number; y: number; z: number }) {
  const length = Math.hypot(v.x, v.y, v.z) || 1;
  return {
    lat: THREE.MathUtils.radToDeg(Math.asin(v.y / length)),
    lon: THREE.MathUtils.radToDeg(Math.atan2(-v.z, v.x)),
  };
}
