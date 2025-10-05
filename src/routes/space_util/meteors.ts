import * as THREE from 'three';

export function addSphere(scene: THREE.Scene, {
    radius = 1,
    widthSegs = 32,
    heightSegs = 16,
    color = 0xff5533,
    position = [0, 0, 0],
    metalness = 0.1,
    roughness = 0.6
} = {}) {
    const geometry = new THREE.SphereGeometry(radius, widthSegs, heightSegs);
    const material = new THREE.MeshStandardMaterial({ color, metalness, roughness });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh; // handy if you want to animate or reference it later
}