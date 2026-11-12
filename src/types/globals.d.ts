// Globals injected by the MediaPipe Pose scripts loaded from the CDN at runtime,
// plus scratch values the video exporter keeps on window.
export {};
declare global {
  interface Window {
    Pose?: any;
    POSE_CONNECTIONS?: any;
    drawConnectors?: (...args: any[]) => void;
    drawLandmarks?: (...args: any[]) => void;
    tempOriginalUserTime?: number;
    tempOriginalMuted?: boolean;
    tempOriginalLoop?: boolean;
  }
  interface HTMLCanvasElement {
    webkitCaptureStream?: (fps?: number) => MediaStream;
  }
}
