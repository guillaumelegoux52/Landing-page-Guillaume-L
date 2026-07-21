import * as THREE from "https://unpkg.com/three@0.167.1/build/three.module.js";

console.log("script chargé");

const container = document.getElementById("three-container");

// Scène
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Caméra
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.z = 4;

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 1);
container.appendChild(renderer.domElement);

// Géométrie
const geometry = new THREE.SphereGeometry(1, 128, 128);

// Matériau argent brossé doux
const material = new THREE.MeshStandardMaterial({
  color: 0xcfcfcf,
  roughness: 0.32,
  metalness: 0.82
});

const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

// Lumières
const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
scene.add(ambientLight);

const light1 = new THREE.DirectionalLight(0xffffff, 2.8);
light1.position.set(3, 2, 4);
scene.add(light1);

const light2 = new THREE.DirectionalLight(0xffffff, 1.6);
light2.position.set(-3, -2, 3);
scene.add(light2);

// Variables de rotation manuelle
let isDragging = false;
let previousMouseX = 0;
let previousMouseY = 0;

let targetRotationX = 0;
let targetRotationY = 0;

let currentRotationX = 0;
let currentRotationY = 0;

// Quand on appuie sur le clic
window.addEventListener("mousedown", (event) => {
  isDragging = true;
  previousMouseX = event.clientX;
  previousMouseY = event.clientY;
});

// Quand on relâche
window.addEventListener("mouseup", () => {
  isDragging = false;
});

// Quand la souris bouge
window.addEventListener("mousemove", (event) => {
  if (!isDragging) return;

  const deltaX = event.clientX - previousMouseX;
  const deltaY = event.clientY - previousMouseY;

  targetRotationY += deltaX * 0.01;
  targetRotationX += deltaY * 0.01;

  previousMouseX = event.clientX;
  previousMouseY = event.clientY;
});

// Animation
function animate() {
  requestAnimationFrame(animate);

  currentRotationX += (targetRotationX - currentRotationX) * 0.08;
  currentRotationY += (targetRotationY - currentRotationY) * 0.08;

  sphere.rotation.x = currentRotationX;
  sphere.rotation.y = currentRotationY;

  renderer.render(scene, camera);
}

animate();

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});