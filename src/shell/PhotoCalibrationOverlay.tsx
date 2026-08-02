import { useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import type { DisplayUnit } from './units';

interface Point {
  x: number;
  y: number;
}

interface PhotoCalibrationOverlayProps {
  uri: string; // the photo's blob URL
  onCalibrate: (referencePixels: number) => void; // called with real pixel distance
  displayUnit: DisplayUnit;
  // known-length input state is managed by parent; overlay just captures pixel distance
}

/**
 * Interactive photo overlay for scale calibration. The user clicks two points
 * on the rendered photo; the Euclidean distance between them (in CSS pixels
 * relative to the image element) is reported to the parent via onCalibrate.
 * Clicking a third time restarts the measurement.
 */
export function PhotoCalibrationOverlay({ uri, onCalibrate, displayUnit }: PhotoCalibrationOverlayProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [imgWidth, setImgWidth] = useState<number>(0);

  const distance =
    points.length === 2 ? Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y) : 0;

  const handleImageClick = (e: MouseEvent<HTMLDivElement>) => {
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const x = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
    const y = Math.min(Math.max(e.clientY - rect.top, 0), rect.height);
    setImgWidth(rect.width);

    if (points.length >= 2) {
      // A third click starts a fresh measurement.
      setPoints([{ x, y }]);
      onCalibrate(0);
      return;
    }

    const next = [...points, { x, y }];
    setPoints(next);
    if (next.length === 2) {
      onCalibrate(Math.hypot(next[1].x - next[0].x, next[1].y - next[0].y));
    }
  };

  const clearPoints = () => {
    setPoints([]);
    onCalibrate(0);
  };

  const midX = points.length === 2 ? (points[0].x + points[1].x) / 2 : 0;
  const midY = points.length === 2 ? (points[0].y + points[1].y) / 2 : 0;
  // Keep the distance pill inside the image bounds (pill is ~34px from center).
  const labelLeft = Math.min(Math.max(midX, 36), Math.max(imgWidth - 36, 36));

  return (
    <>
    <div className="calib-overlay">
      <img
        ref={imgRef}
        src={uri}
        alt="Room photo — click to place calibration points"
        className="calib-overlay-image"
        draggable={false}
      />

      <div
        className="calib-click-layer"
        onClick={handleImageClick}
        aria-label="Calibration overlay: click two points on the photo to measure a known distance"
      />

      <svg className="calib-svg" aria-hidden="true">
        {points.length === 2 && (
          <g className="calib-line-group">
            <line
              x1={points[0].x}
              y1={points[0].y}
              x2={points[1].x}
              y2={points[1].y}
              className="calib-line-halo"
            />
            <line
              x1={points[0].x}
              y1={points[0].y}
              x2={points[1].x}
              y2={points[1].y}
              className="calib-line"
            />
          </g>
        )}
        {points.map((p, i) => (
          <g key={i} className="calib-marker-group">
            <circle cx={p.x} cy={p.y} r="9" className="calib-marker-halo" />
            <circle cx={p.x} cy={p.y} r="6" className="calib-marker" />
            <circle cx={p.x} cy={p.y} r="1.8" className="calib-marker-dot" />
          </g>
        ))}
      </svg>

      {points.length === 2 && (
        <span className="calib-distance-label" style={{ left: labelLeft, top: midY }}>
          {Math.round(distance)} px
        </span>
      )}

      {points.length === 0 && (
        <span className="calib-hint">Optional: click two points only if the image has no usable measurement</span>
      )}
      {points.length === 1 && <span className="calib-hint">Click the second point, or skip calibration if dimensions are printed</span>}
      {points.length > 0 && (
        <button type="button" className="calib-clear-btn" onClick={clearPoints}>
          Clear points
        </button>
      )}
    </div>

    {points.length === 2 && (
      <p className="calib-hint calib-hint-below">
        Optional calibration: enter this span&rsquo;s real length in {displayUnit === 'ft-in' ? 'feet &amp; inches' : 'meters'}
        below, then press Calibrate scale. If the image already shows dimensions, you can skip this.
      </p>
    )}
    </>
  );
}
