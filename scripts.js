const canvas = document.getElementById("canvas3d");

if (!canvas) {
  throw new Error("Canvas #canvas3d introuvable.");
}

if (!window.THREE) {
  throw new Error("Three.js n'est pas chargé.");
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance"
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

if ("outputColorSpace" in renderer && THREE.SRGBColorSpace) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
} else if ("outputEncoding" in renderer && THREE.sRGBEncoding) {
  renderer.outputEncoding = THREE.sRGBEncoding;
}

if ("toneMapping" in renderer && THREE.ACESFilmicToneMapping) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
}
renderer.toneMappingExposure = 1.72;

const baseFrustumSize = 260;
let currentFrustumSize = baseFrustumSize;

const camera = new THREE.OrthographicCamera(
  (-baseFrustumSize * (window.innerWidth / window.innerHeight)) / 2,
  (baseFrustumSize * (window.innerWidth / window.innerHeight)) / 2,
  baseFrustumSize / 2,
  -baseFrustumSize / 2,
  0.1,
  2000
);

camera.position.set(0, 0, 500);
camera.lookAt(0, 0, 0);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.14);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.1);
keyLight.position.set(150, 140, 220);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xd9e2ff, 0.75);
fillLight.position.set(-160, 40, 120);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 1.22);
rimLight.position.set(0, 30, -220);
scene.add(rimLight);

const underGlow = new THREE.DirectionalLight(0xff7417, 3.3);
underGlow.position.set(0, -220, 140);
scene.add(underGlow);

const warmBounce = new THREE.AmbientLight(0xff9a52, 0.16);
scene.add(warmBounce);

const logoPivot = new THREE.Group();
scene.add(logoPivot);

const logoGroup = new THREE.Group();
logoGroup.scale.y = -1;
logoPivot.add(logoGroup);

const renderTargetOptions = {
  format: THREE.RGBAFormat,
  depthBuffer: true,
  stencilBuffer: false
};

if (THREE.HalfFloatType) {
  renderTargetOptions.type = THREE.HalfFloatType;
}

const renderTarget = new THREE.WebGLRenderTarget(
  window.innerWidth,
  window.innerHeight,
  renderTargetOptions
);

const hasComposer =
  typeof THREE.EffectComposer !== "undefined" &&
  typeof THREE.SSAARenderPass !== "undefined" &&
  typeof THREE.UnrealBloomPass !== "undefined";

let composer = null;

if (hasComposer) {
  composer = new THREE.EffectComposer(renderer, renderTarget);

  const ssaaPass = new THREE.SSAARenderPass(scene, camera);
  ssaaPass.sampleLevel = 2;
  ssaaPass.unbiased = true;
  composer.addPass(ssaaPass);

  const bloomPass = new THREE.UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.05,
    0.72,
    0.12
  );
  bloomPass.threshold = 0.05;
  bloomPass.strength = 3.05;
  bloomPass.radius = 0.42;
  composer.addPass(bloomPass);
}

function updateCamera(frustum = currentFrustumSize) {
  currentFrustumSize = frustum;

  const aspect = window.innerWidth / window.innerHeight;
  camera.left = (-frustum * aspect) / 2;
  camera.right = (frustum * aspect) / 2;
  camera.top = frustum / 2;
  camera.bottom = -frustum / 2;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  if (composer) {
    composer.setSize(window.innerWidth, window.innerHeight);
  }
}

function loadLogo() {
  if (typeof THREE.SVGLoader === "undefined") {
    console.warn("SVGLoader n'est pas chargé.");
    return;
  }

  const svgLoader = new THREE.SVGLoader();

  svgLoader.load(
    "./3d assets/logo-gl.svg",
    function (data) {
      while (logoGroup.children.length) {
        const child = logoGroup.children[0];
        logoGroup.remove(child);

        if (child.geometry) {
          child.geometry.dispose();
        }

        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((material) => material.dispose && material.dispose());
          } else if (child.material.dispose) {
            child.material.dispose();
          }
        }
      }

      const material = new THREE.MeshPhysicalMaterial({
        color: 0xf4efe9,
        metalness: 1,
        roughness: 0.18,
        clearcoat: 0.3,
        clearcoatRoughness: 0.08,
        reflectivity: 1,
        dithering: true
      });

      data.paths.forEach(function (path) {
        const shapes = THREE.SVGLoader.createShapes(path);

        shapes.forEach(function (shape) {
          const geometry = new THREE.ExtrudeGeometry(shape, {
            depth: 32,
            bevelEnabled: false
          });

          geometry.computeVertexNormals();

          const mesh = new THREE.Mesh(geometry, material);
          logoGroup.add(mesh);
        });
      });

      const box = new THREE.Box3().setFromObject(logoGroup);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      logoGroup.position.set(-center.x, -center.y, -center.z);
      logoPivot.rotation.x = 0.12;

      const maxDim = Math.max(size.x, size.y, size.z);
      const margin = 1.85;

      if (Number.isFinite(maxDim) && maxDim > 0) {
        updateCamera(maxDim * margin);
      } else {
        updateCamera(baseFrustumSize);
      }
    },
    undefined,
    function (error) {
      console.error("Erreur chargement SVG :", error);
    }
  );
}

function renderScene() {
  if (composer) {
    composer.render();
  } else {
    renderer.render(scene, camera);
  }
}

function animate() {
  requestAnimationFrame(animate);
  logoPivot.rotation.y += 0.01;
  renderScene();
}

updateCamera();
loadLogo();
animate();

window.addEventListener("resize", function () {
  updateCamera();
});

const popupBindings = [
  {
    trigger: document.getElementById("gift-trigger"),
    overlay: document.getElementById("gift-popup-overlay"),
    close: document.getElementById("gift-popup-close")
  },
  {
    trigger: document.getElementById("luxor-trigger"),
    overlay: document.getElementById("luxor-popup-overlay"),
    close: document.getElementById("luxor-popup-close")
  }
];

function closeAllPopups() {
  popupBindings.forEach(function ({ overlay }) {
    if (!overlay) return;
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
  });
}

popupBindings.forEach(function ({ trigger, overlay, close }) {
  if (trigger && overlay) {
    trigger.addEventListener("click", function (event) {
      event.preventDefault();
      closeAllPopups();
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
    });
  }

  if (close && overlay) {
    close.addEventListener("click", function () {
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
    });
  }

  if (overlay) {
    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) {
        overlay.classList.remove("is-open");
        overlay.setAttribute("aria-hidden", "true");
      }
    });
  }
});

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    closeAllPopups();
  }
});