const canvas = document.getElementById("canvas3d");

if (!window.THREE) {
  throw new Error("Three.js n'est pas chargé.");
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance"
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
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

const fillLight = new THREE.DirectionalLight(0xffd9d9, 0.75);
fillLight.position.set(-160, 40, 120);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 1.22);
rimLight.position.set(0, 30, -220);
scene.add(rimLight);

const underGlow = new THREE.DirectionalLight(0xff2222, 3.3);
underGlow.position.set(0, -220, 140);
scene.add(underGlow);

const warmBounce = new THREE.AmbientLight(0xff5252, 0.16);
scene.add(warmBounce);

const logoPivot = new THREE.Group();
scene.add(logoPivot);

const logoGroup = new THREE.Group();
logoGroup.scale.y = -1;
logoPivot.add(logoGroup);

const renderTarget = new THREE.WebGLRenderTarget(
  window.innerWidth,
  window.innerHeight,
  {
    format: THREE.RGBAFormat,
    encoding: THREE.sRGBEncoding,
    type: THREE.HalfFloatType,
    depthBuffer: true,
    stencilBuffer: false
  }
);

const composer = new THREE.EffectComposer(renderer, renderTarget);

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

// === CUSTOM SHADER : BAYER MATRIX DITHERING (VERSION DRAMATIQUE / 1-BIT) ===
const BayerDitheringShader = {
  uniforms: {
    "tDiffuse": { value: null },
    "resolution": { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    varying vec2 vUv;

    // Matrice de Bayer 4x4
    const float bayer4[16] = float[16](
        0.0/16.0,  8.0/16.0,  2.0/16.0, 10.0/16.0,
        12.0/16.0,  4.0/16.0, 14.0/16.0,  6.0/16.0,
        3.0/16.0, 11.0/16.0,  1.0/16.0,  9.0/16.0,
        15.0/16.0,  7.0/16.0, 13.0/16.0,  5.0/16.0
    );

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      
      // Calcul de la luminance avec boost agressif du contraste
      float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      luminance = clamp((luminance - 0.32) * 2.8 + 0.32, 0.0, 1.0);

      // Division des coordonnées pour grossir les pixels du tramage (effet bitmap rétro)
      vec2 coord = gl_FragCoord.xy / 1.75;
      int x = int(mod(coord.x, 4.0));
      int y = int(mod(coord.y, 4.0));
      int index = x + y * 4;
      
      float limit = bayer4[index];

      // Palette stricte 1-bit : Noir profond ou Rouge/Orange saturé agressif
      vec3 retroRed = vec3(1.0, 0.06, 0.06);
      vec3 finalColor = luminance > limit ? color.rgb * retroRed * 1.6 : vec3(0.0);

      gl_FragColor = vec4(finalColor, color.a);
    }
  `
};

const ditherPass = new THREE.ShaderPass(BayerDitheringShader);
composer.addPass(ditherPass);

function updateCamera(frustum = currentFrustumSize) {
  currentFrustumSize = frustum;

  const aspect = window.innerWidth / window.innerHeight;
  camera.left = (-frustum * aspect) / 2;
  camera.right = (frustum * aspect) / 2;
  camera.top = frustum / 2;
  camera.bottom = -frustum / 2;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  
  if (ditherPass.uniforms.resolution) {
    ditherPass.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
  }
}

const svgLoader = new THREE.SVGLoader();

svgLoader.load(
  "./3d assets/logo-gl.svg",
  function (data) {
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xf4efe9,
      metalness: 1,
      roughness: 0.18,
      clearcoat: 0.30,
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
    updateCamera(maxDim * margin);
  },
  undefined,
  function (error) {
    console.error("Erreur chargement SVG :", error);
  }
);

function animate() {
  requestAnimationFrame(animate);
  logoPivot.rotation.y += 0.01;
  composer.render();
}

animate();

window.addEventListener("resize", function () {
  updateCamera();
});

// Liaison des 5 projets (GIFT, LUXOR, CURRUS, LOEWE, COZE MAG)
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
  },
  {
    trigger: document.getElementById("currus-trigger"),
    overlay: document.getElementById("currus-popup-overlay"),
    close: document.getElementById("currus-popup-close")
  },
  {
    trigger: document.getElementById("loewe-trigger"),
    overlay: document.getElementById("loewe-popup-overlay"),
    close: document.getElementById("loewe-popup-close")
  },
  {
    trigger: document.getElementById("coze-trigger"),
    overlay: document.getElementById("coze-popup-overlay"),
    close: document.getElementById("coze-popup-close")
  }
];

function triggerClosePopup(overlay) {
  if (!overlay || (!overlay.classList.contains("is-open") && !overlay.classList.contains("is-closing"))) return;
  
  overlay.classList.remove("is-open");
  overlay.classList.add("is-closing");
  overlay.setAttribute("aria-hidden", "true");

  setTimeout(function () {
    overlay.classList.remove("is-closing");
  }, 700); // Correspond à la durée de l'animation CSS de fermeture (700ms)
}

function closeAllPopups() {
  popupBindings.forEach(function ({ overlay }) {
    triggerClosePopup(overlay);
  });
}

popupBindings.forEach(function ({ trigger, overlay, close }) {
  if (trigger && overlay) {
    trigger.addEventListener("click", function (event) {
      event.preventDefault();
      closeAllPopups();

      overlay.classList.remove("is-open", "is-closing");
      void overlay.offsetWidth;

      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
    });
  }

  if (close && overlay) {
    close.addEventListener("click", function () {
      triggerClosePopup(overlay);
    });
  }

  if (overlay) {
    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) {
        triggerClosePopup(overlay);
      }
    });
  }
});

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    closeAllPopups();
  }
});