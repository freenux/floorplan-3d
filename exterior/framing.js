import {Vector3} from 'three';

// Fit the finite building bounds inside the viewport, excluding the distant ground.
export function frameCamera(camera, controls, bounds, width, height, direction) {
  if (width <= 0 || height <= 0 || bounds.isEmpty()) return;
  const center = bounds.getCenter(new Vector3());
  const towardCamera = direction.clone().normalize();
  if (Math.abs(towardCamera.dot(camera.up)) > .999999) {
    towardCamera.z += .001;
    towardCamera.normalize();
  }
  const right = new Vector3().crossVectors(camera.up, towardCamera).normalize();
  const up = new Vector3().crossVectors(towardCamera, right).normalize();
  const horizontalPadding = Math.min(24, width * .1);
  const verticalPadding = Math.min(64, height * .18);
  camera.aspect = width / height;
  const verticalSlope = Math.tan(camera.fov * Math.PI / 360) / camera.zoom;
  const horizontalSlope = verticalSlope * camera.aspect;
  const usableX = 1 - 2 * horizontalPadding / width;
  const usableY = 1 - 2 * verticalPadding / height;
  let distance = controls.minDistance;
  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) {
        const corner = new Vector3(x, y, z).sub(center);
        const depth = corner.dot(towardCamera);
        distance = Math.max(distance,
          depth + Math.abs(corner.dot(right)) / (horizontalSlope * usableX),
          depth + Math.abs(corner.dot(up)) / (verticalSlope * usableY));
      }
    }
  }
  distance *= 1.04;
  controls.maxDistance = Math.max(48, distance * 3);
  camera.far = Math.max(140, distance + bounds.getSize(new Vector3()).length() * 4);
  // Clear any remaining drag movement before setting a preset or fitting a resize.
  const damping = controls.enableDamping;
  const rotating = controls.autoRotate;
  controls.enableDamping = false;
  controls.autoRotate = false;
  controls.update();
  controls.target.copy(center);
  camera.position.copy(center).addScaledVector(towardCamera, distance);
  camera.lookAt(center);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  controls.update();
  controls.enableDamping = damping;
  controls.autoRotate = rotating;
}
