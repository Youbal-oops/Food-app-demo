import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createFoodModel, disposeFoodModel, type FoodLayer } from './food-models';

describe('signature food sculptures', () => {
  for (const id of ['m1', 'm2', 'm4']) it(`${id} has finite geometry, inspectable layers, and releases GPU resources`, () => {
    const model = createFoodModel(id);
    const layers = model.userData.layers as FoodLayer[];
    expect(layers.length).toBeGreaterThanOrEqual(3);
    expect(layers.every(layer => Number.isFinite(layer.userData.explodeOffset) && Number.isFinite(layer.userData.baseY))).toBe(true);
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    let instanceCount = 0;
    model.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
      expect(Array.from(object.geometry.attributes.position.array).every(Number.isFinite)).toBe(true);
      if (object instanceof THREE.InstancedMesh) { instanceCount += object.count; expect(Array.from(object.instanceMatrix.array).every(Number.isFinite)).toBe(true); }
    });
    const bounds = new THREE.Box3().setFromObject(model);
    expect(bounds.isEmpty()).toBe(false);
    expect(bounds.getSize(new THREE.Vector3()).length()).toBeLessThan(10);
    if (id === 'm4') expect(instanceCount).toBeGreaterThan(2000);
    let disposedGeometry = 0, disposedMaterials = 0;
    geometries.forEach(g => g.addEventListener('dispose', () => disposedGeometry++));
    materials.forEach(m => m.addEventListener('dispose', () => disposedMaterials++));
    disposeFoodModel(model);
    expect(disposedGeometry).toBe(geometries.size);
    expect(disposedMaterials).toBe(materials.size);
    expect(model.children).toHaveLength(0);
  });
});
