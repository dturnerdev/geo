/// <reference lib="dom" />

import * as THREE from 'three';
import { Text } from 'troika-three-text';
import type { ItemId } from '../../domain/src/ids.ts';
import type { Result } from '../../domain/src/result.ts';
import { err, ok } from '../../domain/src/result.ts';
import {
  createEqualEarthView,
  EARTH_RADIUS_M,
  interpolateGreatCircle,
  normaliseLngLat,
} from '../../engine/src/geo/index.ts';
import type { EqualEarthView } from '../../engine/src/geo/index.ts';
import { encodeAtlasTexture } from './atlas-texture.ts';
import {
  cameraFlightDurationMs,
  cameraLookAtFor,
  cameraPositionFor,
  cameraState,
  clamp,
  globeScreenToLngLat,
  orbitCamera,
  projectToScreen,
  unitVector,
  zoomCamera,
} from './camera.ts';
import type { Vector3 } from './camera.ts';
import { MAX_LABELS_ON_SCREEN, layoutLabels } from './label-layout.ts';
import type { LabelCandidate } from './label-layout.ts';
import { createFrameScheduler } from './frame-scheduler.ts';
import type { FrameScheduler } from './frame-scheduler.ts';
import { createEarthBody } from './geometry.ts';
import { createLazyCutMeshLoader } from './cut-mesh-loader.ts';
import { createMorphPlan, morphComplete, morphOpacity, morphProgress } from './morph.ts';
import type { MorphPlan } from './morph.ts';
import { readGlobePalette } from './theme.ts';
import type { GlobePalette } from './theme.ts';
import type {
  AtlasSnapshot,
  CameraState,
  CameraTarget,
  CelestialBody,
  GlobeController,
  GlobeError,
  GlobeOptions,
  LabelData,
  Overlay,
  Unsubscribe,
  ViewMode,
} from './types.ts';

const DEFAULT_CENTRE = normaliseLngLat(0, 20);
const DEFAULT_TARGET: CameraTarget = {
  centre: DEFAULT_CENTRE,
  distanceM: EARTH_RADIUS_M * 1.6,
  azimuthDeg: 0,
  elevationDeg: 20,
};
const FLAT_CAMERA_DISTANCE_M = EARTH_RADIUS_M * 3.6;
const FIELD_OF_VIEW_DEG = 45;
const ORBIT_DEGREES_PER_PIXEL = 0.25;
const KEYBOARD_ORBIT_DEGREES = 6;
const KEYBOARD_ZOOM_FACTOR = 1.2;
const TAP_MOVE_TOLERANCE_PX = 6;
const LABEL_BASE_PX = 14;

interface Flight {
  readonly from: CameraTarget;
  readonly to: CameraTarget;
  readonly start: number;
  readonly duration: number;
  readonly resolve: () => void;
}

interface PointerRecord {
  readonly id: number;
  x: number;
  y: number;
}

interface LabelObject extends THREE.Object3D {
  text: string;
  fontSize: number;
  color: string;
  sync(callback?: () => void): void;
  dispose(): void;
}

export interface GlobeControllerDependencies {
  readonly now?: () => number;
  readonly loadCutMesh?: () => Promise<void>;
}

export function createGlobeController(deps: GlobeControllerDependencies = {}): GlobeController {
  const now = deps.now ?? ((): number => globalThis.performance.now());

  let canvas: HTMLCanvasElement | null = null;
  let options: GlobeOptions | null = null;
  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;
  let overlayScene: THREE.Scene | null = null;
  let overlayCamera: THREE.OrthographicCamera | null = null;
  let mapMesh: THREE.Mesh | null = null;
  let material: THREE.ShaderMaterial | null = null;
  let stateTexture: THREE.DataTexture | null = null;
  let scheduler: FrameScheduler | null = null;
  let body: CelestialBody | null = null;
  let palette: GlobePalette | null = null;

  let target: CameraTarget = DEFAULT_TARGET;
  let mode: ViewMode = 'globe';
  let reduceMotion = false;
  let morph: MorphPlan | null = null;
  let morphResolve: (() => void) | null = null;
  let flight: Flight | null = null;
  let width = 1;
  let height = 1;
  let disposed = false;
  let contextLost = false;
  let mounted = false;
  let labelsDirty = true;
  let overlaysDirty = true;
  let overlayGroup: THREE.Group | null = null;
  let crosshairGroup: THREE.Group | null = null;
  let labelPool: LabelObject[] = [];
  let visibleLabels: ReadonlySet<ItemId> = new Set();
  let overlays: readonly Overlay[] = [];
  let atlas: AtlasSnapshot | null = null;
  let textScale = 1;
  const textMeasurements = new Map<string, { readonly width: number; readonly height: number }>();
  const cameraListeners = new Set<(camera: CameraState) => void>();
  const pointers = new Map<number, PointerRecord>();
  let pointerMoved = false;
  let pinchDistance: number | null = null;

  const cutMesh = createLazyCutMeshLoader<void>(async () => {
    await (deps.loadCutMesh?.() ?? Promise.resolve());
  });

  function emitCamera(): void {
    const snapshot = cameraState(target, mode);
    for (const listener of cameraListeners) {
      listener(snapshot);
    }
  }

  function requestFrame(animate = false): void {
    if (!disposed && !contextLost) {
      scheduler?.request(animate);
    }
  }

  function flatView(): EqualEarthView {
    return createEqualEarthView(width, height);
  }

  function updateSize(): void {
    if (canvas === null || renderer === null) {
      return;
    }
    const pixelRatio = Math.min(2, canvas.ownerDocument?.defaultView?.devicePixelRatio ?? 1);
    width = Math.max(1, canvas.clientWidth || canvas.width);
    height = Math.max(1, canvas.clientHeight || canvas.height);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    if (camera !== null) {
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    }
    if (overlayCamera !== null) {
      overlayCamera.left = 0;
      overlayCamera.right = width;
      overlayCamera.top = 0;
      overlayCamera.bottom = height;
      overlayCamera.updateProjectionMatrix();
    }
    labelsDirty = true;
    requestFrame();
  }

  function readTextScale(): number {
    if (canvas === null) {
      return 1;
    }
    const view = canvas.ownerDocument?.defaultView;
    if (view === null || view === undefined) {
      return 1;
    }
    const value = Number.parseFloat(view.getComputedStyle(canvas).fontSize);
    return Number.isFinite(value) ? clamp(value / 16, 1, 1.6) : 1;
  }

  function measureText(text: string, fontSize: number): { width: number; height: number } {
    const key = `${fontSize}:${text}`;
    const cached = textMeasurements.get(key);
    if (cached !== undefined) {
      return cached;
    }
    let measured = { width: Math.max(1, text.length * fontSize * 0.6), height: fontSize * 1.2 };
    const documentRef = canvas?.ownerDocument;
    if (documentRef !== undefined && documentRef !== null) {
      const measureCanvas = documentRef.createElement('canvas');
      const context = measureCanvas.getContext('2d');
      if (context !== null) {
        context.font = `${fontSize}px sans-serif`;
        measured = {
          width: Math.max(1, context.measureText(text).width),
          height: fontSize * 1.2,
        };
      }
    }
    textMeasurements.set(key, measured);
    return measured;
  }

  function labelCandidates(): readonly LabelCandidate[] {
    if (options === null || visibleLabels.size === 0) {
      return [];
    }
    const view = mode === 'flat' || morph !== null ? flatView() : null;
    const candidates: LabelCandidate[] = [];
    for (const item of visibleLabels) {
      const data: LabelData | undefined = options.labelFor(item);
      if (data === undefined) {
        continue;
      }
      const screen =
        mode === 'globe' && morph === null
          ? projectToScreen(data.anchor, target, width, height, FIELD_OF_VIEW_DEG)
          : (view?.project(data.anchor) ?? null);
      if (screen === null) {
        continue;
      }
      const x = 'visible' in screen ? (screen.visible ? screen.x : Number.NaN) : screen.x;
      const y = 'visible' in screen ? (screen.visible ? screen.y : Number.NaN) : screen.y;
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        continue;
      }
      if (x < 0 || x > width || y < 0 || y > height) {
        continue;
      }
      const fontSize = LABEL_BASE_PX * clamp(textScale, 1, 1.6);
      candidates.push({
        item,
        text: data.text,
        fame: data.fame,
        anchor: { x, y },
        size: measureText(data.text, fontSize),
      });
    }
    return candidates;
  }

  function updateLabels(): void {
    if (overlayScene === null) {
      return;
    }
    const placed = layoutLabels(labelCandidates(), MAX_LABELS_ON_SCREEN);
    const fontSize = LABEL_BASE_PX * clamp(textScale, 1, 1.6);
    for (let index = 0; index < placed.length; index += 1) {
      const entry = placed[index];
      if (entry === undefined) {
        continue;
      }
      let textObject = labelPool[index];
      if (textObject === undefined) {
        const troikaText = new Text();
        troikaText.anchorX = 'center';
        troikaText.anchorY = 'middle';
        textObject = troikaText as unknown as LabelObject;
        labelPool[index] = textObject;
        overlayScene.add(textObject);
      }
      const previous = textObject.text;
      textObject.text = entry.text;
      textObject.fontSize = fontSize;
      textObject.color = palette?.label ?? '#FFFFFF';
      textObject.position.set(entry.anchor.x, entry.anchor.y, 0);
      textObject.visible = true;
      if (previous !== entry.text) {
        textObject.sync(() => {
          requestFrame();
        });
      }
    }
    for (let index = placed.length; index < labelPool.length; index += 1) {
      const textObject = labelPool[index];
      if (textObject !== undefined) {
        textObject.visible = false;
      }
    }
  }

  function createMarker(at: Vector3, colour: string, radius: number): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(radius, 12, 8);
    const materialForMarker = new THREE.MeshBasicMaterial({ color: colour });
    const marker = new THREE.Mesh(geometry, materialForMarker);
    marker.position.set(at.x, at.y, at.z);
    return marker;
  }

  function createLine(points: readonly Vector3[], colour: string): THREE.Line {
    const positions = new Float32Array(points.length * 3);
    points.forEach((point, index) => {
      positions[index * 3] = point.x;
      positions[index * 3 + 1] = point.y;
      positions[index * 3 + 2] = point.z;
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: colour }));
  }

  function surfacePoint(point: { lng: number; lat: number }, radiusFactor = 1.002): Vector3 {
    const unit = unitVector(normaliseLngLat(point.lng, point.lat));
    const radius = (body?.radiusM ?? EARTH_RADIUS_M) * radiusFactor;
    return { x: unit.x * radius, y: unit.y * radius, z: unit.z * radius };
  }

  function rebuildOverlays(): void {
    if (overlayGroup === null || palette === null) {
      return;
    }
    const group = overlayGroup;
    for (const child of [...group.children]) {
      group.remove(child);
      if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    }

    const markerRadius = (body?.radiusM ?? EARTH_RADIUS_M) * 0.012;
    for (const overlay of overlays) {
      switch (overlay.kind) {
        case 'marker':
          group.add(
            createMarker(
              surfacePoint(overlay.at),
              overlay.style === 'answer' ? palette.answerMarker : palette.chosenMarker,
              markerRadius,
            ),
          );
          break;
        case 'arc': {
          const points: Vector3[] = [];
          for (let index = 0; index <= 64; index += 1) {
            points.push(
              surfacePoint(interpolateGreatCircle(overlay.from, overlay.to, index / 64), 1.003),
            );
          }
          group.add(createLine(points, palette.correct));
          break;
        }
        case 'beam': {
          const origin = surfacePoint(overlay.from, 1.004);
          const direction = unitVector(overlay.from);
          const points: Vector3[] = [origin];
          for (let step = 1; step <= 32; step += 1) {
            const angle = (overlay.bearingDeg * Math.PI) / 180;
            const tangent = {
              x: -direction.z * Math.sin(angle) + direction.x * Math.cos(angle),
              y: direction.y,
              z: direction.x * Math.sin(angle) + direction.z * Math.cos(angle),
            };
            const length = (body?.radiusM ?? EARTH_RADIUS_M) * (step / 32);
            points.push({
              x: origin.x + tangent.x * length,
              y: origin.y + tangent.y * length,
              z: origin.z + tangent.z * length,
            });
          }
          group.add(createLine(points, palette.beam));
          break;
        }
        case 'highlight': {
          const data = options?.labelFor(overlay.item);
          if (data !== undefined) {
            const colour =
              overlay.style === 'correct'
                ? palette.correct
                : overlay.style === 'close'
                  ? palette.close
                  : overlay.style === 'incorrect'
                    ? palette.incorrect
                    : palette.neutral;
            group.add(createMarker(surfacePoint(data.anchor), colour, markerRadius * 1.6));
          }
          break;
        }
        case 'crosshair':
          break;
      }
    }
    overlaysDirty = false;
  }

  function updateCrosshair(): void {
    if (crosshairGroup === null || palette === null) {
      return;
    }
    crosshairGroup.visible = overlays.some((overlay) => overlay.kind === 'crosshair');
    if (!crosshairGroup.visible || crosshairGroup.children.length > 0) {
      return;
    }
    const half = 10;
    const vertical = createLine(
      [
        { x: width / 2, y: height / 2 - half, z: 0 },
        { x: width / 2, y: height / 2 + half, z: 0 },
      ],
      palette.label,
    );
    const horizontal = createLine(
      [
        { x: width / 2 - half, y: height / 2, z: 0 },
        { x: width / 2 + half, y: height / 2, z: 0 },
      ],
      palette.label,
    );
    crosshairGroup.add(vertical, horizontal);
  }

  function globeCameraPosition(): Vector3 {
    return cameraPositionFor(target);
  }

  function applyCamera(morphProgressValue: number): void {
    if (camera === null) {
      return;
    }
    const radius = body?.radiusM ?? EARTH_RADIUS_M;
    const globePosition = globeCameraPosition();
    const globeLookAt = cameraLookAtFor(target);
    const flatPosition = { x: 0, y: 0, z: FLAT_CAMERA_DISTANCE_M / radius };
    const flatLookAt = { x: 0, y: 0, z: 0 };
    const flatMix =
      mode === 'flat' || morph !== null ? (morph === null ? 1 : morphProgressValue) : 0;
    const position = {
      x: (globePosition.x * (1 - flatMix) + flatPosition.x * flatMix) * radius,
      y: (globePosition.y * (1 - flatMix) + flatPosition.y * flatMix) * radius,
      z: (globePosition.z * (1 - flatMix) + flatPosition.z * flatMix) * radius,
    };
    const lookAt = {
      x: (globeLookAt.x * (1 - flatMix) + flatLookAt.x * flatMix) * radius,
      y: (globeLookAt.y * (1 - flatMix) + flatLookAt.y * flatMix) * radius,
      z: (globeLookAt.z * (1 - flatMix) + flatLookAt.z * flatMix) * radius,
    };
    camera.position.set(position.x, position.y, position.z);
    camera.up.set(0, 1, 0);
    camera.lookAt(lookAt.x, lookAt.y, lookAt.z);
    camera.near = radius * 0.01;
    camera.far = radius * 100;
    camera.updateProjectionMatrix();
  }

  function updateMorph(timestamp: number): boolean {
    if (morph === null) {
      return false;
    }
    const progress = morphProgress(morph, timestamp);
    const opacity = morphOpacity(morph, timestamp);
    if (material !== null) {
      material.uniforms['uMorph'] = {
        value: morph.crossfade ? (morph.to === 'flat' ? 1 : 0) : progress,
      };
      material.uniforms['uOpacity'] = { value: morph.crossfade ? opacity.to : 1 };
      material.transparent = morph.crossfade;
    }
    if (morphComplete(morph, timestamp)) {
      mode = morph.to;
      morph = null;
      if (material !== null) {
        material.uniforms['uMorph'] = { value: mode === 'flat' ? 1 : 0 };
        material.uniforms['uOpacity'] = { value: 1 };
        material.transparent = false;
      }
      labelsDirty = true;
      emitCamera();
      morphResolve?.();
      morphResolve = null;
      return false;
    }
    return true;
  }

  function updateFlight(timestamp: number): boolean {
    if (flight === null) {
      return false;
    }
    const elapsed = timestamp - flight.start;
    const progress = flight.duration <= 0 ? 1 : clamp(elapsed / flight.duration, 0, 1);
    target = {
      centre: normaliseLngLat(
        flight.from.centre.lng + (flight.to.centre.lng - flight.from.centre.lng) * progress,
        flight.from.centre.lat + (flight.to.centre.lat - flight.from.centre.lat) * progress,
      ),
      distanceM: flight.from.distanceM + (flight.to.distanceM - flight.from.distanceM) * progress,
      azimuthDeg:
        flight.from.azimuthDeg + (flight.to.azimuthDeg - flight.from.azimuthDeg) * progress,
      elevationDeg:
        flight.from.elevationDeg + (flight.to.elevationDeg - flight.from.elevationDeg) * progress,
    };
    labelsDirty = true;
    emitCamera();
    if (progress >= 1) {
      flight.resolve();
      flight = null;
      return false;
    }
    return true;
  }

  function draw(timestamp: number): boolean {
    if (
      disposed ||
      contextLost ||
      renderer === null ||
      scene === null ||
      camera === null ||
      overlayScene === null ||
      overlayCamera === null
    ) {
      return false;
    }
    const morphing = updateMorph(timestamp);
    const flying = updateFlight(timestamp);
    const progress = morph === null ? (mode === 'flat' ? 1 : 0) : morphProgress(morph, timestamp);
    applyCamera(progress);
    if (overlaysDirty) {
      rebuildOverlays();
    }
    updateCrosshair();
    if (labelsDirty) {
      updateLabels();
      labelsDirty = false;
    }
    renderer.autoClear = true;
    renderer.render(scene, camera);
    renderer.autoClear = false;
    renderer.render(overlayScene, overlayCamera);
    renderer.autoClear = true;
    return morphing || flying;
  }

  function initialiseResources(): void {
    if (canvas === null || palette === null || body === null) {
      return;
    }
    scene = new THREE.Scene();
    scene.background = new THREE.Color(palette.space);
    camera = new THREE.PerspectiveCamera(FIELD_OF_VIEW_DEG, width / Math.max(1, height), 1, 1e9);
    overlayScene = new THREE.Scene();
    overlayCamera = new THREE.OrthographicCamera(0, width, 0, height, -1, 1);
    overlayGroup = new THREE.Group();
    crosshairGroup = new THREE.Group();
    scene.add(overlayGroup);
    overlayScene.add(crosshairGroup);

    const mesh = body.meshes[0];
    if (mesh === undefined) {
      return;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(mesh.positions, 3));
    geometry.setAttribute('flatPosition', new THREE.BufferAttribute(mesh.flatPositions, 3));
    geometry.setAttribute('aFeatureSlot', new THREE.BufferAttribute(mesh.featureSlots, 1));
    geometry.setIndex(new THREE.BufferAttribute(mesh.indices, 1));

    const atlasTexture = new THREE.DataTexture(new Uint32Array([0]), 1, 1);
    atlasTexture.format = THREE.RedIntegerFormat;
    atlasTexture.type = THREE.UnsignedIntType;
    atlasTexture.internalFormat = 'R32UI';
    atlasTexture.minFilter = THREE.NearestFilter;
    atlasTexture.magFilter = THREE.NearestFilter;
    atlasTexture.needsUpdate = true;
    stateTexture = atlasTexture;

    material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      transparent: true,
      uniforms: {
        uMorph: { value: mode === 'flat' ? 1 : 0 },
        uOpacity: { value: 1 },
        uLand: { value: new THREE.Color(palette.land) },
        uOcean: { value: new THREE.Color(palette.ocean) },
        uLight: { value: new THREE.Vector3(0.6, 0.4, 0.8).normalize() },
        uStateTexture: { value: atlasTexture },
        uTextureWidth: { value: 1 },
        uAtlasEnabled: { value: 0 },
      },
      vertexShader: `
        in vec3 flatPosition;
        in uint aFeatureSlot;
        out vec3 vNormal;
        flat out uint vSlot;
        uniform float uMorph;
        void main() {
          vec3 mixedPosition = mix(position, flatPosition, uMorph);
          vNormal = normalize(normalMatrix * normalize(mixedPosition));
          vSlot = aFeatureSlot;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(mixedPosition, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        in vec3 vNormal;
        flat in uint vSlot;
        uniform vec3 uLand;
        uniform vec3 uOcean;
        uniform vec3 uLight;
        uniform usampler2D uStateTexture;
        uniform int uTextureWidth;
        uniform int uAtlasEnabled;
        uniform float uOpacity;
        out vec4 fragColor;
        void main() {
          float light = max(0.32, dot(normalize(vNormal), normalize(uLight)));
          vec3 base = uLand;
          if (uAtlasEnabled == 1) {
            ivec2 coord = ivec2(int(vSlot) % uTextureWidth, int(vSlot) / uTextureWidth);
            uint texel = texelFetch(uStateTexture, coord, 0).r;
            uint state = texel & 15u;
            if (state == 2u) {
              base = mix(uLand, vec3(0.78), 0.55);
            } else if (state == 3u) {
              base = mix(uLand, vec3(0.45), 0.45);
            } else if (state == 4u) {
              base = mix(uLand, vec3(0.88), 0.6);
            } else if (state == 1u) {
              base = mix(uLand, vec3(0.25), 0.2);
            }
          }
          if (uOpacity < 0.01) { discard; }
          fragColor = vec4(base * light, uOpacity);
        }
      `,
    });

    mapMesh = new THREE.Mesh(geometry, material);
    scene.add(mapMesh);
    if (material !== null) {
      material.uniforms['uOcean'] = { value: new THREE.Color(palette.ocean) };
    }
  }

  function rebuildAtlasTexture(snapshot: AtlasSnapshot): void {
    if (material === null) {
      return;
    }
    const encoded = encodeAtlasTexture(snapshot);
    const texture = new THREE.DataTexture(encoded.data, encoded.width, encoded.height);
    texture.format = THREE.RedIntegerFormat;
    texture.type = THREE.UnsignedIntType;
    texture.internalFormat = 'R32UI';
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    stateTexture?.dispose();
    stateTexture = texture;
    material.uniforms['uStateTexture'] = { value: texture };
    material.uniforms['uTextureWidth'] = { value: encoded.width };
    material.uniforms['uAtlasEnabled'] = { value: 1 };
  }

  function handlePointerDown(event: PointerEvent): void {
    if (canvas === null) {
      return;
    }
    canvas.setPointerCapture?.(event.pointerId);
    pointers.set(event.pointerId, { id: event.pointerId, x: event.clientX, y: event.clientY });
    pointerMoved = false;
    if (pointers.size === 2) {
      const [first, second] = [...pointers.values()];
      if (first !== undefined && second !== undefined) {
        pinchDistance = Math.hypot(first.x - second.x, first.y - second.y);
      }
    }
  }

  function handlePointerMove(event: PointerEvent): void {
    const pointer = pointers.get(event.pointerId);
    if (pointer === undefined) {
      return;
    }
    const deltaX = event.clientX - pointer.x;
    const deltaY = event.clientY - pointer.y;
    pointers.set(event.pointerId, { id: event.pointerId, x: event.clientX, y: event.clientY });

    if (pointers.size >= 2) {
      const [first, second] = [...pointers.values()];
      if (first !== undefined && second !== undefined) {
        const distance = Math.hypot(first.x - second.x, first.y - second.y);
        if (pinchDistance !== null && pinchDistance > 0) {
          target = zoomCamera(target, distance / pinchDistance);
          emitCamera();
          labelsDirty = true;
          requestFrame();
        }
        pinchDistance = distance;
      }
      pointerMoved = true;
      return;
    }

    if (Math.abs(deltaX) + Math.abs(deltaY) > 0) {
      if (Math.abs(deltaX) + Math.abs(deltaY) > TAP_MOVE_TOLERANCE_PX) {
        pointerMoved = true;
      }
      target = orbitCamera(
        target,
        deltaX * ORBIT_DEGREES_PER_PIXEL,
        -deltaY * ORBIT_DEGREES_PER_PIXEL,
      );
      emitCamera();
      labelsDirty = true;
      requestFrame();
    }
  }

  function handlePointerUp(event: PointerEvent): void {
    if (canvas === null) {
      return;
    }
    pointers.delete(event.pointerId);
    pinchDistance = pointers.size >= 2 ? pinchDistance : null;
    if (pointers.size === 0 && !pointerMoved) {
      const rect = canvas.getBoundingClientRect();
      const lngLat = screenToLngLat(event.clientX - rect.left, event.clientY - rect.top);
      if (lngLat !== null) {
        canvas.dispatchEvent(
          new CustomEvent('geo:globe-tap', { detail: { lngLat }, bubbles: true }),
        );
      }
    }
    canvas.releasePointerCapture?.(event.pointerId);
  }

  function handleWheel(event: WheelEvent): void {
    event.preventDefault();
    target = zoomCamera(target, Math.exp(-event.deltaY * 0.0015));
    emitCamera();
    labelsDirty = true;
    requestFrame();
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (canvas === null || event.target !== canvas) {
      return;
    }
    switch (event.key) {
      case 'ArrowLeft':
        target = orbitCamera(target, -KEYBOARD_ORBIT_DEGREES, 0);
        break;
      case 'ArrowRight':
        target = orbitCamera(target, KEYBOARD_ORBIT_DEGREES, 0);
        break;
      case 'ArrowUp':
        target = orbitCamera(target, 0, KEYBOARD_ORBIT_DEGREES);
        break;
      case 'ArrowDown':
        target = orbitCamera(target, 0, -KEYBOARD_ORBIT_DEGREES);
        break;
      case '+':
      case '=':
        target = zoomCamera(target, KEYBOARD_ZOOM_FACTOR);
        break;
      case '-':
      case '_':
        target = zoomCamera(target, 1 / KEYBOARD_ZOOM_FACTOR);
        break;
      case 'Enter': {
        const centre = screenToLngLat(width / 2, height / 2);
        if (centre !== null) {
          canvas.dispatchEvent(
            new CustomEvent('geo:globe-tap', { detail: { lngLat: centre }, bubbles: true }),
          );
        }
        break;
      }
      default:
        return;
    }
    event.preventDefault();
    emitCamera();
    labelsDirty = true;
    requestFrame();
  }

  function handleContextLost(event: Event): void {
    event.preventDefault();
    contextLost = true;
    scheduler?.dispose();
  }

  function handleContextRestored(): void {
    if (disposed) {
      return;
    }
    contextLost = false;
    for (const textObject of labelPool) {
      textObject.dispose();
    }
    labelPool = [];
    initialiseResources();
    if (atlas !== null) {
      rebuildAtlasTexture(atlas);
    }
    overlaysDirty = true;
    labelsDirty = true;
    scheduler = createFrameScheduler(draw);
    updateSize();
    requestFrame();
  }

  function bindEvents(canvasElement: HTMLCanvasElement, view: Window): void {
    canvasElement.setAttribute('aria-hidden', 'true');
    canvasElement.tabIndex = 0;
    canvasElement.addEventListener('pointerdown', handlePointerDown);
    canvasElement.addEventListener('pointermove', handlePointerMove);
    canvasElement.addEventListener('pointerup', handlePointerUp);
    canvasElement.addEventListener('pointercancel', handlePointerUp);
    canvasElement.addEventListener('wheel', handleWheel, { passive: false });
    canvasElement.addEventListener('keydown', handleKeyDown);
    canvasElement.addEventListener('webglcontextlost', handleContextLost);
    canvasElement.addEventListener('webglcontextrestored', handleContextRestored);
    view.addEventListener('resize', updateSize);
  }

  function screenToLngLat(x: number, y: number): ReturnType<GlobeController['screenToLngLat']> {
    if (morph !== null) {
      return null;
    }
    if (mode === 'flat') {
      return flatView().invert(x, y);
    }
    return globeScreenToLngLat(target, width, height, x, y, FIELD_OF_VIEW_DEG);
  }

  return {
    mount(canvasElement: HTMLCanvasElement, globeOptions: GlobeOptions): Result<void, GlobeError> {
      if (mounted) {
        return err({ kind: 'context-failed' });
      }
      canvas = canvasElement;
      options = globeOptions;
      try {
        const context = canvasElement.getContext('webgl2');
        if (context === null) {
          return err({ kind: 'no-webgl2' });
        }
        palette = readGlobePalette(canvasElement);
        renderer = new THREE.WebGLRenderer({
          canvas: canvasElement,
          context,
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        });
        body = createEarthBody();
        textScale = readTextScale();
        updateSize();
        initialiseResources();
        const view = canvasElement.ownerDocument?.defaultView;
        if (view !== null && view !== undefined) {
          bindEvents(canvasElement, view);
        }
        scheduler = createFrameScheduler(draw);
        mounted = true;
        if (atlas !== null) {
          rebuildAtlasTexture(atlas);
        }
        requestFrame();
        return ok(undefined);
      } catch {
        renderer?.dispose();
        renderer = null;
        return err({ kind: 'context-failed' });
      }
    },

    async setViewMode(nextMode: ViewMode): Promise<void> {
      if (nextMode === mode && morph === null) {
        return;
      }
      if (!mounted) {
        mode = nextMode;
        return;
      }
      await cutMesh.request();
      if (disposed) {
        return;
      }
      await new Promise<void>((resolve) => {
        morphResolve?.();
        morphResolve = resolve;
        morph = createMorphPlan(mode, nextMode, reduceMotion, now());
        requestFrame(true);
      });
    },

    flyTo(nextTarget: CameraTarget): Promise<void> {
      if (!mounted) {
        target = cameraState(nextTarget, mode);
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        const normalised = cameraState(nextTarget, mode);
        const from = target;
        const duration = cameraFlightDurationMs(from, normalised, reduceMotion);
        flight = { from, to: normalised, start: now(), duration, resolve };
        requestFrame(true);
      });
    },

    setAtlas(snapshot: AtlasSnapshot): void {
      atlas = snapshot;
      rebuildAtlasTexture(snapshot);
      requestFrame();
    },

    setVisibleLabels(items: ReadonlySet<ItemId>): void {
      visibleLabels = new Set(items);
      if (items.size > 0) {
        cutMesh.noteFirstQuestion();
      }
      labelsDirty = true;
      requestFrame();
    },

    setOverlays(nextOverlays: readonly Overlay[]): void {
      overlays = nextOverlays;
      if (nextOverlays.length > 0) {
        cutMesh.noteFirstQuestion();
      }
      overlaysDirty = true;
      requestFrame();
    },

    setReduceMotion(on: boolean): void {
      reduceMotion = on;
    },

    screenToLngLat,

    onCameraChange(listener: (camera: CameraState) => void): Unsubscribe {
      cameraListeners.add(listener);
      listener(cameraState(target, mode));
      return () => {
        cameraListeners.delete(listener);
      };
    },

    dispose(): void {
      disposed = true;
      morphResolve?.();
      morphResolve = null;
      flight?.resolve();
      flight = null;
      scheduler?.dispose();
      scheduler = null;
      canvas?.removeEventListener('pointerdown', handlePointerDown);
      canvas?.removeEventListener('pointermove', handlePointerMove);
      canvas?.removeEventListener('pointerup', handlePointerUp);
      canvas?.removeEventListener('pointercancel', handlePointerUp);
      canvas?.removeEventListener('wheel', handleWheel);
      canvas?.removeEventListener('keydown', handleKeyDown);
      canvas?.removeEventListener('webglcontextlost', handleContextLost);
      canvas?.removeEventListener('webglcontextrestored', handleContextRestored);
      const view = canvas?.ownerDocument?.defaultView;
      view?.removeEventListener('resize', updateSize);
      for (const textObject of labelPool) {
        textObject.dispose();
      }
      labelPool = [];
      textMeasurements.clear();
      stateTexture?.dispose();
      stateTexture = null;
      mapMesh?.geometry.dispose();
      if (material !== null) {
        material.dispose();
      }
      renderer?.dispose();
      renderer = null;
      cameraListeners.clear();
      pointers.clear();
      canvas = null;
      options = null;
      scene = null;
      camera = null;
      overlayScene = null;
      overlayCamera = null;
      overlayGroup = null;
      crosshairGroup = null;
      mapMesh = null;
      material = null;
      body = null;
      palette = null;
      mounted = false;
    },
  };
}
