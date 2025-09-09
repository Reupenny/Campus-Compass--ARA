declare module 'marzipano' {
  export interface ViewerOptions {
    controls?: {
      mouseViewMode?: 'drag' | 'qtvr';
    };
  }

  export interface ViewParameters {
    yaw?: number;
    pitch?: number;
    fov?: number;
  }

  export interface SceneOptions {
    source: any;
    geometry: any;
    view: any;
    pinFirstLevel?: boolean;
  }

  export interface SwitchOptions {
    transitionDuration?: number;
  }

  export interface LookToOptions {
    transitionDuration?: number;
  }

  export interface HotspotPosition {
    yaw: number;
    pitch: number;
  }

  export interface ScreenCoordinates {
    x: number;
    y: number;
  }

  export class Viewer {
    constructor(element: HTMLElement, options?: ViewerOptions);
    createScene(options: SceneOptions): Scene;
    scene(): Scene;
    setIdleMovement(timeout: number, movement?: any): void;
    startMovement(movement: any): void;
    stopMovement(): void;
  }

  export class Scene {
    switchTo(options?: SwitchOptions): void;
    lookTo(viewParameters: ViewParameters, options?: LookToOptions): void;
    view(): View;
    hotspotContainer(): HotspotContainer;
  }

  export class View {
    yaw(): number;
    pitch(): number;
    fov(): number;
    vfov(): number;
    hfov(): number;
    setYaw(yaw: number): void;
    setPitch(pitch: number): void;
    setFov(fov: number): void;
    setParameters(params: ViewParameters): void;
    offsetYaw(offset: number): void;
    offsetPitch(offset: number): void;
    offsetFov(offset: number): void;
    screenToCoordinates(screen: ScreenCoordinates): HotspotPosition;
  }

  export class HotspotContainer {
    createHotspot(element: HTMLElement, position: HotspotPosition): void;
  }

  export class EquirectGeometry {
    constructor(levels: Array<{ width: number }>);
  }

  export class CubeGeometry {
    constructor(levels: Array<{ tileSize: number; size: number; fallbackOnly?: boolean }>);
  }

  export class ImageUrlSource {
    static fromString(url: string, options?: { cubeMapPreviewUrl?: string }): ImageUrlSource;
  }

  export class RectilinearView {
    constructor(initialView?: ViewParameters, limiter?: any);
    static limit: {
      traditional(maxResolution: number, maxFov: number): any;
    };
  }

  export function autorotate(options: {
    yawSpeed: number;
    targetPitch?: number;
    targetFov?: number;
  }): any;

  const Marzipano: {
    Viewer: typeof Viewer;
    Scene: typeof Scene;
    View: typeof View;
    HotspotContainer: typeof HotspotContainer;
    EquirectGeometry: typeof EquirectGeometry;
    CubeGeometry: typeof CubeGeometry;
    ImageUrlSource: typeof ImageUrlSource;
    RectilinearView: typeof RectilinearView;
    autorotate: typeof autorotate;
  };

  export default Marzipano;
}
