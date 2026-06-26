import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

const auraVideoUrl =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_064122_c4750c0e-7476-4b44-94a2-a85a65c63bf2.mp4';

const vertexShader = `
uniform sampler2D uVideo;
uniform float uTime;
uniform float uAspect;
uniform float uVideoAspect;
uniform vec2 uVideoTexel;
uniform float uPixelRatio;

attribute vec2 aUv;
attribute vec2 aJitter;
attribute float aSeed;
attribute float aDepth;
attribute float aSize;

varying vec3 vColor;
varying float vAlpha;
varying float vSignal;
varying float vSeed;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

vec2 coverUv(vec2 uv) {
  vec2 nextUv = uv;

  if (uAspect > uVideoAspect) {
    float visible = uVideoAspect / uAspect;
    nextUv.y = (uv.y - 0.5) * visible + 0.5;
  } else {
    float visible = uAspect / uVideoAspect;
    nextUv.x = (uv.x - 0.5) * visible + 0.5;
  }

  return clamp(nextUv, 0.001, 0.999);
}

vec4 sampleVideo(vec2 uv) {
  vec2 texel = uVideoTexel * 1.5;
  vec4 color = texture2D(uVideo, uv) * 0.48;
  color += texture2D(uVideo, clamp(uv + vec2(texel.x, 0.0), 0.001, 0.999)) * 0.13;
  color += texture2D(uVideo, clamp(uv - vec2(texel.x, 0.0), 0.001, 0.999)) * 0.13;
  color += texture2D(uVideo, clamp(uv + vec2(0.0, texel.y), 0.001, 0.999)) * 0.13;
  color += texture2D(uVideo, clamp(uv - vec2(0.0, texel.y), 0.001, 0.999)) * 0.13;
  return color;
}

void main() {
  vec2 videoUv = coverUv(aUv);
  vec4 videoColor = sampleVideo(videoUv);
  float luminance = dot(videoColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  float signal = smoothstep(0.035, 0.56, luminance);

  float coarse = snoise(vec3(aUv * 10.0 + aSeed * 0.01, uTime * 0.045));
  float fine = snoise(vec3(aUv * 44.0 - uTime * 0.07, aSeed * 0.03));
  float turbulence = coarse * 0.7 + fine * 0.3;

  vec2 screen = aUv * 2.0 - 1.0;
  vec2 drift = vec2(
    snoise(vec3(aUv * 4.0, uTime * 0.018 + aSeed)),
    snoise(vec3(aUv.yx * 4.0, uTime * 0.016 - aSeed))
  );

  float flowSignal = mix(signal, smoothstep(-0.55, 0.75, coarse), 0.12);
  float depth = (flowSignal - 0.35) * 0.54 + turbulence * 0.32 + aDepth * 0.18;
  vec3 position = vec3(
    screen.x * uAspect + aJitter.x * (0.012 + signal * 0.03) + drift.x * (0.018 + signal * 0.006) + depth * 0.052,
    screen.y + aJitter.y * (0.012 + signal * 0.03) + drift.y * (0.018 + signal * 0.006) - depth * 0.023,
    depth
  );

  vSignal = signal;
  vSeed = aSeed;
  vAlpha = mix(0.018, 0.68, signal) * (0.68 + 0.32 * smoothstep(-0.45, 0.75, depth));
  vec3 platformBg = vec3(0.035, 0.045, 0.075);
  vec3 platformMuted = vec3(0.12, 0.22, 0.24);
  vec3 platformPrimary = vec3(0.18, 0.9, 0.66);
  vec3 platformSecondary = vec3(0.2, 0.58, 0.72);
  vec3 themedVideo = mix(platformSecondary, platformPrimary, smoothstep(0.14, 0.82, luminance));
  vColor = mix(platformBg, themedVideo, smoothstep(0.06, 0.58, luminance));
  vColor = mix(vColor, platformMuted, 0.16 * (1.0 - signal));
  vColor = mix(vColor, platformPrimary, pow(signal, 2.6) * 0.3);

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  float perspective = 1.0 / max(0.58, 1.0 - depth * 0.28);
  gl_PointSize = aSize * uPixelRatio * perspective * (0.42 + signal * 2.18 + abs(turbulence) * 0.28);
}
`;

const fragmentShader = `
uniform float uTime;

varying vec3 vColor;
varying float vAlpha;
varying float vSignal;
varying float vSeed;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float radius = length(uv);
  float particle = smoothstep(0.5, 0.04, radius);
  float roughEdge = hash(gl_FragCoord.xy + vec2(vSeed, vSeed * 0.37));
  float slowPulse = 0.92 + 0.08 * sin(uTime * 0.58 + vSeed);
  float inner = smoothstep(0.24, 0.0, radius);
  vec3 color = vColor + (roughEdge - 0.5) * 0.12;
  color = mix(color, vec3(0.48, 1.0, 0.74), inner * pow(vSignal, 2.2) * 0.24);
  float alpha = particle * vAlpha * (0.54 + roughEdge * 0.42) * slowPulse;

  if (alpha < 0.01) {
    discard;
  }

  gl_FragColor = vec4(color, alpha);
}
`;

const filmGrainShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
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
    uniform float uTime;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(41.0, 289.0))) * 45758.5453);
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float grain = hash(gl_FragCoord.xy);
      float fine = hash(gl_FragCoord.xy * 2.7 + vec2(19.0, 7.0));
      float drift = 0.5 + 0.5 * sin(uTime * 0.35 + grain * 6.2831853);
      float vignette = smoothstep(0.95, 0.18, distance(vUv, vec2(0.5)));
      color.rgb += (grain - 0.5) * 0.045 + (fine - 0.5) * 0.025 + (drift - 0.5) * 0.006;
      color.rgb *= 0.78 + vignette * 0.34;
      gl_FragColor = color;
    }
  `,
};

const videoSmoothingShader = {
  uniforms: {
    uCurrent: { value: null },
    uPrevious: { value: null },
    uBlend: { value: 1 },
    uTexel: { value: new THREE.Vector2(1 / 960, 1 / 540) },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D uCurrent;
    uniform sampler2D uPrevious;
    uniform float uBlend;
    uniform vec2 uTexel;
    varying vec2 vUv;

    vec4 softSampleCurrent(vec2 uv) {
      vec2 texel = uTexel * 1.4;
      vec4 color = texture2D(uCurrent, uv) * 0.5;
      color += texture2D(uCurrent, clamp(uv + vec2(texel.x, 0.0), 0.001, 0.999)) * 0.125;
      color += texture2D(uCurrent, clamp(uv - vec2(texel.x, 0.0), 0.001, 0.999)) * 0.125;
      color += texture2D(uCurrent, clamp(uv + vec2(0.0, texel.y), 0.001, 0.999)) * 0.125;
      color += texture2D(uCurrent, clamp(uv - vec2(0.0, texel.y), 0.001, 0.999)) * 0.125;
      return color;
    }

    void main() {
      vec4 current = softSampleCurrent(vUv);
      vec4 previous = texture2D(uPrevious, vUv);
      gl_FragColor = mix(previous, current, uBlend);
    }
  `,
};

function createSmoothingTarget(width: number, height: number) {
  const target = new THREE.WebGLRenderTarget(width, height, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    depthBuffer: false,
    stencilBuffer: false,
  });
  target.texture.colorSpace = THREE.SRGBColorSpace;
  target.texture.generateMipmaps = false;
  return target;
}

function createVideoParticleGeometry(width: number, height: number) {
  const aspect = width / Math.max(height, 1);
  const columns = width < 640 ? 354 : 696;
  const rows = Math.min(600, Math.max(214, Math.round(columns / aspect)));
  const count = columns * rows;
  const positions = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  const jitter = new Float32Array(count * 2);
  const seed = new Float32Array(count);
  const depth = new Float32Array(count);
  const size = new Float32Array(count);

  let index = 0;

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const i3 = index * 3;
      const i2 = index * 2;
      const u = columns <= 1 ? 0.5 : x / (columns - 1);
      const v = rows <= 1 ? 0.5 : y / (rows - 1);
      const randomA = Math.random();
      const randomB = Math.random();

      positions[i3] = 0;
      positions[i3 + 1] = 0;
      positions[i3 + 2] = 0;
      uvs[i2] = u;
      uvs[i2 + 1] = v;
      jitter[i2] = randomA - 0.5;
      jitter[i2 + 1] = randomB - 0.5;
      seed[index] = Math.random() * 1000;
      depth[index] = (Math.random() - 0.5) * 2;
      size[index] = 0.7 + Math.random() * 1.6;
      index += 1;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aUv', new THREE.BufferAttribute(uvs, 2));
  geometry.setAttribute('aJitter', new THREE.BufferAttribute(jitter, 2));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geometry.setAttribute('aDepth', new THREE.BufferAttribute(depth, 1));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(size, 1));

  return geometry;
}

function createAuraVideo() {
  const video = document.createElement('video');
  video.src = auraVideoUrl;
  video.crossOrigin = 'anonymous';
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.preload = 'auto';
  video.playbackRate = 1;
  return video;
}

export function ParticleRibbonBackground() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;

    if (!mount) {
      return undefined;
    }

    let width = mount.clientWidth;
    let height = mount.clientHeight;
    let animationFrame = 0;
    let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const video = createAuraVideo();
    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.colorSpace = THREE.SRGBColorSpace;
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.generateMipmaps = false;

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setClearColor(0x000000, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -5, 5);
    camera.position.z = 2;

    const smoothingScene = new THREE.Scene();
    const smoothingCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const smoothingGeometry = new THREE.PlaneGeometry(2, 2);
    const smoothingMaterial = new THREE.ShaderMaterial({
      vertexShader: videoSmoothingShader.vertexShader,
      fragmentShader: videoSmoothingShader.fragmentShader,
      uniforms: THREE.UniformsUtils.clone(videoSmoothingShader.uniforms),
      depthWrite: false,
      depthTest: false,
    });
    const smoothingMesh = new THREE.Mesh(smoothingGeometry, smoothingMaterial);
    smoothingScene.add(smoothingMesh);

    const smoothingWidth = width < 640 ? 480 : 960;
    const smoothingHeight = Math.round((smoothingWidth * 9) / 16);
    let smoothingRead = createSmoothingTarget(smoothingWidth, smoothingHeight);
    let smoothingWrite = createSmoothingTarget(smoothingWidth, smoothingHeight);
    let smoothingReady = false;
    smoothingMaterial.uniforms.uCurrent.value = videoTexture;
    smoothingMaterial.uniforms.uPrevious.value = smoothingRead.texture;
    smoothingMaterial.uniforms.uTexel.value.set(1 / smoothingWidth, 1 / smoothingHeight);

    const geometry = createVideoParticleGeometry(width, height);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uVideo: { value: smoothingRead.texture },
        uTime: { value: 0 },
        uAspect: { value: width / height },
        uVideoAspect: { value: 16 / 9 },
        uVideoTexel: { value: new THREE.Vector2(1 / smoothingWidth, 1 / smoothingHeight) },
        uPixelRatio: { value: renderer.getPixelRatio() },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.48, 0.82, 0.12);
    const grainPass = new ShaderPass(filmGrainShader);
    composer.addPass(renderPass);
    composer.addPass(bloomPass);
    composer.addPass(grainPass);

    const updateVideoAspect = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        material.uniforms.uVideoAspect.value = video.videoWidth / video.videoHeight;
      }
    };

    const resize = () => {
      width = mount.clientWidth;
      height = mount.clientHeight;
      const aspect = width / Math.max(height, 1);

      camera.left = -aspect;
      camera.right = aspect;
      camera.top = 1;
      camera.bottom = -1;
      camera.updateProjectionMatrix();

      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
      renderer.setSize(width, height);
      composer.setSize(width, height);
      bloomPass.setSize(width, height);
      material.uniforms.uAspect.value = aspect;
      material.uniforms.uPixelRatio.value = renderer.getPixelRatio();
      grainPass.uniforms.uResolution.value.set(width, height);
      updateVideoAspect();
    };

    const render = (time: number) => {
      const seconds = reducedMotion ? 0 : time * 0.001;
      const videoIsReady = video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;

      if (videoIsReady) {
        smoothingMaterial.uniforms.uCurrent.value = videoTexture;
        smoothingMaterial.uniforms.uPrevious.value = smoothingRead.texture;
        smoothingMaterial.uniforms.uBlend.value = smoothingReady ? 0.13 : 1;
        renderer.setRenderTarget(smoothingWrite);
        renderer.render(smoothingScene, smoothingCamera);
        renderer.setRenderTarget(null);
        [smoothingRead, smoothingWrite] = [smoothingWrite, smoothingRead];
        smoothingReady = true;
        material.uniforms.uVideo.value = smoothingRead.texture;
      }

      material.uniforms.uTime.value = seconds;
      grainPass.uniforms.uTime.value = seconds;
      composer.render();

      if (!reducedMotion) {
        animationFrame = requestAnimationFrame(render);
      }
    };

    const motionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = () => {
      reducedMotion = motionMedia.matches;
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(render);
    };

    video.addEventListener('loadedmetadata', updateVideoAspect);
    video.play().catch(() => undefined);
    resize();
    window.addEventListener('resize', resize);
    motionMedia.addEventListener('change', handleMotionChange);
    animationFrame = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      motionMedia.removeEventListener('change', handleMotionChange);
      video.removeEventListener('loadedmetadata', updateVideoAspect);
      cancelAnimationFrame(animationFrame);
      video.pause();
      videoTexture.dispose();
      geometry.dispose();
      smoothingGeometry.dispose();
      smoothingMaterial.dispose();
      smoothingRead.dispose();
      smoothingWrite.dispose();
      material.dispose();
      composer.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={mountRef} className="fixed inset-0 z-0 pointer-events-none bg-black" aria-hidden="true" />;
}
