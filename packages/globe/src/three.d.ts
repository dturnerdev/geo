// The pinned three@0.187.0 build ships no type declarations and no @types
// package is allowed (07 §2). This minimal ambient surface covers only the
// renderer API that `globe` uses.
declare module 'three' {
  export class Vector3 {
    constructor(x?: number, y?: number, z?: number);
    x: number;
    y: number;
    z: number;
    set(x: number, y: number, z: number): this;
    normalize(): this;
    length(): number;
  }

  export class Color {
    constructor(value?: string | number);
  }

  export class Object3D {
    position: Vector3;
    visible: boolean;
    children: Object3D[];
    add(...objects: Object3D[]): this;
    remove(...objects: Object3D[]): this;
  }

  export class Group extends Object3D {}

  export class Scene extends Object3D {
    background: Color | null;
  }

  export class Camera extends Object3D {
    near: number;
    far: number;
    updateProjectionMatrix(): void;
    lookAt(x: number, y: number, z: number): void;
  }

  export class PerspectiveCamera extends Camera {
    constructor(fov?: number, aspect?: number, near?: number, far?: number);
    aspect: number;
    up: Vector3;
  }

  export class OrthographicCamera extends Camera {
    constructor(
      left?: number,
      right?: number,
      top?: number,
      bottom?: number,
      near?: number,
      far?: number,
    );
    left: number;
    right: number;
    top: number;
    bottom: number;
  }

  export class BufferAttribute {
    constructor(array: ArrayLike<number>, itemSize: number);
  }

  export class BufferGeometry {
    setAttribute(name: string, attribute: BufferAttribute): this;
    setIndex(attribute: BufferAttribute): this;
    dispose(): void;
  }

  export class SphereGeometry extends BufferGeometry {
    constructor(radius?: number, widthSegments?: number, heightSegments?: number);
  }

  export class Material {
    transparent: boolean;
    dispose(): void;
  }

  export class MeshBasicMaterial extends Material {
    constructor(parameters?: { color?: string | number });
  }

  export class LineBasicMaterial extends Material {
    constructor(parameters?: { color?: string | number });
  }

  export class ShaderMaterial extends Material {
    constructor(parameters?: {
      glslVersion?: string | null;
      transparent?: boolean;
      uniforms?: Record<string, { value: unknown }>;
      vertexShader?: string;
      fragmentShader?: string;
    });
    uniforms: Record<string, { value: unknown }>;
    vertexShader: string;
    fragmentShader: string;
    glslVersion: string | null;
  }

  export class Mesh extends Object3D {
    constructor(geometry?: BufferGeometry, material?: Material);
    geometry: BufferGeometry;
    material: Material;
  }

  export class Line extends Object3D {
    constructor(geometry?: BufferGeometry, material?: Material);
    geometry: BufferGeometry;
    material: Material | Material[];
  }

  export class Texture {
    format: unknown;
    type: unknown;
    internalFormat: string | null;
    minFilter: unknown;
    magFilter: unknown;
    wrapS: unknown;
    wrapT: unknown;
    needsUpdate: boolean;
    dispose(): void;
  }

  export class DataTexture extends Texture {
    constructor(data: ArrayLike<number>, width: number, height: number);
  }

  export class WebGLRenderer {
    constructor(parameters?: {
      canvas?: HTMLCanvasElement;
      context?: WebGL2RenderingContext;
      antialias?: boolean;
      alpha?: boolean;
      powerPreference?: 'default' | 'high-performance' | 'low-power';
    });
    autoClear: boolean;
    setPixelRatio(value: number): void;
    setSize(width: number, height: number, updateStyle?: boolean): void;
    render(scene: Scene, camera: Camera): void;
    dispose(): void;
  }

  export const GLSL3: string;
  export const RedIntegerFormat: unknown;
  export const UnsignedIntType: unknown;
  export const NearestFilter: unknown;
  export const ClampToEdgeWrapping: unknown;
}
