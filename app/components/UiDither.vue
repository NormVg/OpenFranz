<script setup lang="ts">
/**
 * UiDither: the paper-design dithering shader, vendored from
 * .context/Dithering.vue so the landing page and the empty chat state share
 * one living-texture primitive. Takes colors, shape, and dither type as props
 * and renders a full-container WebGL canvas.
 *
 * The fragment shader and uniform plumbing stay byte-identical to the upstream
 * asset so a future upstream revision can be diffed in cleanly.
 */
import {
  ShaderMount,
  getShaderColorFromString,
  ShaderFitOptions,
  defaultObjectSizing,
  type ShaderMountUniforms,
} from "@paper-design/shaders";

const ditheringFragmentShader = `#version 300 es
precision mediump float;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_pixelRatio;
uniform float u_originX;
uniform float u_originY;
uniform float u_worldWidth;
uniform float u_worldHeight;
uniform float u_fit;
uniform float u_scale;
uniform float u_rotation;
uniform float u_offsetX;
uniform float u_offsetY;

uniform float u_pxSize;
uniform vec4 u_colorBack;
uniform vec4 u_colorFront;
uniform float u_shape;
uniform float u_type;
uniform vec2 u_mouse;
uniform vec4 u_ripple;

out vec4 fragColor;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m;
  m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

#define PI 3.14159265359
#define TWO_PI 6.28318530718

float hash11(float p) {
  p = fract(p * .1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
  p3 += dot(p3, p3.yzx+33.33);
  return fract((p3.xx+p3.yz)*p3.zy);
}

float hash21(vec2 p) {
  vec3 p3  = fract(vec3(p.xyx) * .1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float getSimplexNoise(vec2 uv, float t) {
  float noise = .5 * snoise(uv - vec2(0., .3 * t));
  noise += .5 * snoise(2. * uv + vec2(0., .32 * t));
  return noise;
}

const int bayer2x2[4] = int[4](0, 2, 3, 1);
const int bayer4x4[16] = int[16](
0, 8, 2, 10,
12, 4, 14, 6,
3, 11, 1, 9,
15, 7, 13, 5
);

const int bayer8x8[64] = int[64](
0, 32, 8, 40, 2, 34, 10, 42,
48, 16, 56, 24, 50, 18, 58, 26,
12, 44, 4, 36, 14, 46, 6, 38,
60, 28, 52, 20, 62, 30, 54, 22,
3, 35, 11, 43, 1, 33, 9, 41,
51, 19, 59, 27, 49, 17, 57, 25,
15, 47, 7, 39, 13, 45, 5, 37,
63, 31, 55, 23, 61, 29, 53, 21
);

float getBayerValue(vec2 uv, int size) {
  ivec2 pos = ivec2(fract(uv / float(size)) * float(size));
  int index = pos.y * size + pos.x;

  if (size == 2) {
    return float(bayer2x2[index]) / 4.0;
  } else if (size == 4) {
    return float(bayer4x4[index]) / 16.0;
  } else if (size == 8) {
    return float(bayer8x8[index]) / 64.0;
  }
  return 0.0;
}

void main() {
  float t = .5 * u_time;
  float pxSize = u_pxSize * u_pixelRatio;
  vec2 pxSizeUV = gl_FragCoord.xy - .5 * u_resolution;
  pxSizeUV /= pxSize;
  vec2 canvasPixelizedUV = (floor(pxSizeUV) + .5) * pxSize;
  vec2 normalizedUV = canvasPixelizedUV / u_resolution;
  vec2 ditheringNoiseUV = canvasPixelizedUV;
  vec2 shapeUV = normalizedUV;

  vec2 boxOrigin = vec2(.5 - u_originX, u_originY - .5);
  vec2 givenBoxSize = vec2(u_worldWidth, u_worldHeight);
  givenBoxSize = max(givenBoxSize, vec2(1.)) * u_pixelRatio;
  float r = u_rotation * PI / 180.;
  mat2 graphicRotation = mat2(cos(r), sin(r), -sin(r), cos(r));
  vec2 graphicOffset = vec2(-u_offsetX, u_offsetY);

  float patternBoxRatio = givenBoxSize.x / givenBoxSize.y;
  vec2 boxSize = vec2(
    (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
    (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );

  if (u_shape > 3.5) {
    vec2 objectBoxSize = vec2(0.);
    objectBoxSize.x = min(boxSize.x, boxSize.y);
    if (u_fit == 1.) {
      objectBoxSize.x = min(u_resolution.x, u_resolution.y);
    } else if (u_fit == 2.) {
      objectBoxSize.x = max(u_resolution.x, u_resolution.y);
    }
    objectBoxSize.y = objectBoxSize.x;
    vec2 objectWorldScale = u_resolution.xy / objectBoxSize;

    shapeUV *= objectWorldScale;
    shapeUV += boxOrigin * (objectWorldScale - 1.);
    shapeUV += vec2(-u_offsetX, u_offsetY);
    shapeUV /= u_scale;
    shapeUV = graphicRotation * shapeUV;
  } else {
    vec2 patternBoxSize = vec2(0.);
    patternBoxSize.x = patternBoxRatio * min(boxSize.x / patternBoxRatio, boxSize.y);
    float patternWorldNoFitBoxWidth = patternBoxSize.x;
    if (u_fit == 1.) {
      patternBoxSize.x = patternBoxRatio * min(u_resolution.x / patternBoxRatio, u_resolution.y);
    } else if (u_fit == 2.) {
      patternBoxSize.x = patternBoxRatio * max(u_resolution.x / patternBoxRatio, u_resolution.y);
    }
    patternBoxSize.y = patternBoxSize.x / patternBoxRatio;
    vec2 patternWorldScale = u_resolution.xy / patternBoxSize;

    shapeUV += vec2(-u_offsetX, u_offsetY) / patternWorldScale;
    shapeUV += boxOrigin;
    shapeUV -= boxOrigin / patternWorldScale;
    shapeUV *= u_resolution.xy;
    shapeUV /= u_pixelRatio;
    if (u_fit > 0.) {
      shapeUV *= (patternWorldNoFitBoxWidth / patternBoxSize.x);
    }
    shapeUV /= u_scale;
    shapeUV = graphicRotation * shapeUV;
    shapeUV += boxOrigin / patternWorldScale;
    shapeUV -= boxOrigin;
    shapeUV += .5;
  }

  float shape = 0.;
  if (u_shape < 1.5) {
    shapeUV *= .001;
    shape = 0.5 + 0.5 * getSimplexNoise(shapeUV, t);
    shape = smoothstep(0.3, 0.9, shape);
  } else if (u_shape < 2.5) {
    shapeUV *= .003;
    for (float i = 1.0; i < 6.0; i++) {
      shapeUV.x += 0.6 / i * cos(i * 2.5 * shapeUV.y + t);
      shapeUV.y += 0.6 / i * cos(i * 1.5 * shapeUV.x + t);
    }
    shape = .15 / max(0.001, abs(sin(t - shapeUV.y - shapeUV.x)));
    shape = smoothstep(0.02, 1., shape);
  } else if (u_shape < 3.5) {
    shapeUV *= .05;
    float stripeIdx = floor(2. * shapeUV.x / TWO_PI);
    float rand = hash11(stripeIdx * 10.);
    rand = sign(rand - .5) * pow(.1 + abs(rand), .4);
    shape = sin(shapeUV.x) * cos(shapeUV.y - 5. * rand * t);
    shape = pow(abs(shape), 6.);
  } else if (u_shape < 4.5) {
    shapeUV *= 4.;
    float wave = cos(.5 * shapeUV.x - 2. * t) * sin(1.5 * shapeUV.x + t) * (.75 + .25 * cos(3. * t));
    shape = 1. - smoothstep(-1., 1., shapeUV.y + wave);
  } else if (u_shape < 5.5) {
    float dist = length(shapeUV);
    float waves = sin(pow(dist, 1.7) * 7. - 3. * t) * .5 + .5;
    shape = waves;
  } else if (u_shape < 6.5) {
    float l = length(shapeUV);
    float angle = 6. * atan(shapeUV.y, shapeUV.x) + 4. * t;
    float twist = 1.2;
    float offset = 1. / pow(max(l, 1e-6), twist) + angle / TWO_PI;
    float mid = smoothstep(0., 1., pow(l, twist));
    shape = mix(0., fract(offset), mid);
  } else if (u_shape < 7.5) {
    shapeUV *= 2.;
    float d = 1. - pow(length(shapeUV), 2.);
    vec3 pos = vec3(shapeUV, sqrt(max(0., d)));
    vec3 lightPos = normalize(vec3(cos(1.5 * t), .8, sin(1.25 * t)));
    shape = .5 + .5 * dot(lightPos, pos);
    shape *= step(0., d);
  } else if (u_shape < 8.5) {
    vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.);
    vec2 p = normalizedUV * aspect;
    vec2 m = (u_mouse - .5) * aspect;
    float dist = length(p - m);
    vec2 direction = normalize(p - m + vec2(1e-5));
    float pull = .3 / (1. + dist * 7.);
    vec2 warped = p + direction * pull;
    vec2 quantized = floor(warped * 28.) / 28.;
    vec2 dithered = mix(warped, quantized, .7);
    float n = getSimplexNoise(dithered * 3. + vec2(0., t * .12), t);
    float glow = smoothstep(.55, 0., dist);
    shape = .5 + .5 * n + glow * .45;
    shape = smoothstep(.2, .9, shape);
  } else {
    vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.);
    vec2 q = normalizedUV * aspect;

    // Rings radiate from the bottom-right corner, not the cursor.
    vec2 anchor = vec2(.5, -.5) * aspect;
    float dist = length(q - anchor);
    float rings = sin(dist * 40. - t * 2.) * .5 + .5;
    float falloff = smoothstep(1.05, 0., dist);
    shape = mix(.5, rings, falloff);

    // Cursor-local stepped distortion: the field bends near the pointer
    // without the rings chasing it.
    vec2 m = (u_mouse - .5) * aspect;
    float mouseDist = length(q - m);
    vec2 direction = normalize(q - m + vec2(1e-5));
    vec2 warped = q + direction * (.14 / (1. + mouseDist * 9.));
    vec2 quantized = floor(warped * 36.) / 36.;
    float local = smoothstep(.38, 0., mouseDist);
    float warpedRings = sin(length(quantized - anchor) * 40. - t * 2.) * .5 + .5;
    shape = mix(shape, warpedRings, local * .45);

    // Tap ripple from the pointer-down origin.
    vec2 rippleOrigin = (u_ripple.xy - .5) * aspect;
    float rippleDist = length(q - rippleOrigin);
    float rippleAge = max(t - u_ripple.z, 0.);
    float rippleWave = sin(rippleDist * 34. - rippleAge * 9.)
      * exp(-rippleAge * 1.8)
      * exp(-rippleDist * 2.2)
      * step(0., t - u_ripple.z);
    shape += rippleWave * u_ripple.w * .55;

    shape = smoothstep(.2, .7, shape);
  }

  int type = int(floor(u_type));
  float dithering = 0.0;
  switch (type) {
    case 1: dithering = step(hash21(ditheringNoiseUV), shape); break;
    case 2: dithering = getBayerValue(pxSizeUV, 2); break;
    case 3: dithering = getBayerValue(pxSizeUV, 4); break;
    default: dithering = getBayerValue(pxSizeUV, 8); break;
  }

  dithering -= .5;
  float res = step(.5, shape + dithering);

  vec3 fgColor = u_colorFront.rgb * u_colorFront.a;
  float fgOpacity = u_colorFront.a;
  vec3 bgColor = u_colorBack.rgb * u_colorBack.a;
  float bgOpacity = u_colorBack.a;

  vec3 color = fgColor * res;
  float opacity = fgOpacity * res;
  color += bgColor * (1. - opacity);
  opacity += bgOpacity * (1. - opacity);

  fragColor = vec4(color, opacity);
}
`;

const DitheringShapes = {
  simplex: 1,
  warp: 2,
  dots: 3,
  wave: 4,
  ripple: 5,
  swirl: 6,
  sphere: 7,
  field: 8,
  pulse: 9,
} as const;

const DitheringTypes = {
  random: 1,
  "2x2": 2,
  "4x4": 3,
  "8x8": 4,
} as const;

type DitherShape = keyof typeof DitheringShapes;
type DitherType = keyof typeof DitheringTypes;
type DitherFit = keyof typeof ShaderFitOptions;

interface UiDitherProps {
  colorBack?: string;
  colorFront?: string;
  shape?: DitherShape;
  type?: DitherType;
  size?: number;
  speed?: number;
  frame?: number;
  fit?: DitherFit;
  scale?: number;
  rotation?: number;
  originX?: number;
  originY?: number;
  offsetX?: number;
  offsetY?: number;
  worldWidth?: number;
  worldHeight?: number;
  minPixelRatio?: number;
  maxPixelCount?: number;
}

const props = withDefaults(defineProps<UiDitherProps>(), {
  colorBack: "#000000",
  colorFront: "#FFFFFF",
  shape: "simplex",
  type: "4x4",
  size: 2,
  speed: 1,
  frame: 0,
  fit: defaultObjectSizing.fit,
  scale: 1,
  rotation: defaultObjectSizing.rotation,
  originX: defaultObjectSizing.originX,
  originY: defaultObjectSizing.originY,
  offsetX: defaultObjectSizing.offsetX,
  offsetY: defaultObjectSizing.offsetY,
  worldWidth: defaultObjectSizing.worldWidth,
  worldHeight: defaultObjectSizing.worldHeight,
  minPixelRatio: 2,
  maxPixelCount: 1920 * 1080 * 4,
});

const containerRef = ref<HTMLElement | null>(null);
let shaderMount: ShaderMount | null = null;
let isDestroyed = false;
let pointerFrame = 0;
let mountedAt = performance.now();

const pointer = { x: 0.5, y: 0.5 };

function getUniforms(): ShaderMountUniforms {
  return {
    u_colorBack: getShaderColorFromString(props.colorBack),
    u_colorFront: getShaderColorFromString(props.colorFront),
    u_shape: DitheringShapes[props.shape] ?? 1,
    u_type: DitheringTypes[props.type] ?? 3,
    u_pxSize: props.size,
    u_fit: ShaderFitOptions[props.fit],
    u_scale: props.scale,
    u_rotation: props.rotation,
    u_offsetX: props.offsetX,
    u_offsetY: props.offsetY,
    u_originX: props.originX,
    u_originY: props.originY,
    u_worldWidth: props.worldWidth,
    u_worldHeight: props.worldHeight,
    u_mouse: [pointer.x, pointer.y],
    u_ripple: [0.5, 0.5, -100, 0],
  };
}

function updateShader() {
  if (!import.meta.client || isDestroyed) return;

  try {
    const uniforms = getUniforms();

    if (shaderMount) {
      shaderMount.setUniforms(uniforms);
    } else if (containerRef.value) {
      shaderMount = new ShaderMount(
        containerRef.value,
        ditheringFragmentShader,
        uniforms,
        { alpha: true, premultipliedAlpha: true, antialias: false },
        props.speed,
        props.frame,
        props.minPixelRatio,
        props.maxPixelCount,
      );
      mountedAt = performance.now();
    }
  } catch (error) {
    console.error("Failed to mount the dithering shader.", error);
  }
}

function onPointerMove(event: PointerEvent) {
  if (!containerRef.value) return;

  const rect = containerRef.value.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  pointer.x = (event.clientX - rect.left) / rect.width;
  pointer.y = 1 - (event.clientY - rect.top) / rect.height;

  if (pointerFrame) return;
  pointerFrame = requestAnimationFrame(() => {
    pointerFrame = 0;
    shaderMount?.setUniforms({ u_mouse: [pointer.x, pointer.y] });
  });
}

function onPointerLeave() {
  pointer.x = 0.5;
  pointer.y = 0.5;
  shaderMount?.setUniforms({ u_mouse: [0.5, 0.5] });
}

function onPointerDown(event: PointerEvent) {
  if (!containerRef.value) return;

  const rect = containerRef.value.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  const x = (event.clientX - rect.left) / rect.width;
  const y = 1 - (event.clientY - rect.top) / rect.height;
  const elapsed = ((performance.now() - mountedAt) / 1000) * props.speed * 0.5;

  shaderMount?.setUniforms({ u_ripple: [x, y, elapsed, 1] });
}

onMounted(() => {
  updateShader();
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerleave", onPointerLeave);
  window.addEventListener("pointerdown", onPointerDown, { passive: true });
});

watch(
  [
    () => props.colorBack,
    () => props.colorFront,
    () => props.shape,
    () => props.type,
    () => props.size,
    () => props.fit,
    () => props.scale,
    () => props.rotation,
    () => props.originX,
    () => props.originY,
    () => props.offsetX,
    () => props.offsetY,
    () => props.worldWidth,
    () => props.worldHeight,
  ],
  () => updateShader(),
  { deep: true },
);

watch(
  () => props.speed,
  (speed) => {
    shaderMount?.setSpeed(speed);
  },
);

watch(
  () => props.frame,
  (frame) => {
    shaderMount?.setFrame(frame);
  },
);

onBeforeUnmount(() => {
  isDestroyed = true;
  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("pointerleave", onPointerLeave);
  window.removeEventListener("pointerdown", onPointerDown);
  if (pointerFrame) cancelAnimationFrame(pointerFrame);
  shaderMount?.dispose();
  shaderMount = null;
});
</script>

<template>
  <div ref="containerRef" class="dither" aria-hidden="true" />
</template>

<style scoped>
.dither {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
}

.dither :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
