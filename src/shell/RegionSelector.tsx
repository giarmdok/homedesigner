import { useRef, useState } from 'react';
import { canAddRegion, normalizeRegion, type Region } from './regions';

export interface RegionSelectorProps {
  uri: string;
  regions: readonly Region[];
  onRegionsChange: (regions: readonly Region[]) => void;
  disabled?: boolean;
}

type Point = { x: number; y: number };

const nextRegionId = (regions: readonly Region[]): number =>
  regions.reduce((highest, region) => Math.max(highest, region.id), -1) + 1;

export function RegionSelector({ uri, regions, onRegionsChange, disabled = false }: RegionSelectorProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [zoom, setZoom] = useState(1);
  const [dragStart, setDragStart] = useState<Point>();
  const [dragCurrent, setDragCurrent] = useState<Point>();

  const pointFromEvent = (event: React.PointerEvent): Point | undefined => {
    const image = imageRef.current;
    if (!image) return undefined;
    const bounds = image.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return undefined;
    return {
      x: (event.clientX - bounds.left) / bounds.width,
      y: (event.clientY - bounds.top) / bounds.height,
    };
  };

  const finishDrag = (event: React.PointerEvent) => {
    if (!dragStart) return;
    const point = pointFromEvent(event);
    setDragStart(undefined);
    setDragCurrent(undefined);
    if (!point || !canAddRegion(regions)) return;
    const geometry = normalizeRegion(dragStart, point);
    if (geometry) onRegionsChange([...regions, { ...geometry, id: nextRegionId(regions) }]);
  };

  return (
    <section className="region-selector" aria-label="Select image regions">
      <div className="region-selector-toolbar">
        <span className="region-selector-count">Regions {regions.length}/8</span>
        <div className="region-selector-zoom" aria-label="Image zoom controls">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setZoom((current) => Math.max(1, current - 0.25))}
            disabled={disabled || zoom <= 1}
            aria-label="Zoom out"
          >
            −
          </button>
          <span aria-live="polite">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setZoom((current) => Math.min(4, current + 0.25))}
            disabled={disabled || zoom >= 4}
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setZoom(1)}
            disabled={disabled || zoom === 1}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="region-selector-viewport">
        <div
          className="region-selector-surface"
          style={{ transform: `scale(${zoom})` }}
          onPointerDown={(event) => {
            if (disabled || !canAddRegion(regions)) return;
            const point = pointFromEvent(event);
            if (!point) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            setDragStart(point);
            setDragCurrent(point);
          }}
          onPointerMove={(event) => {
            if (dragStart) setDragCurrent(pointFromEvent(event));
          }}
          onPointerUp={finishDrag}
          onPointerCancel={() => {
            setDragStart(undefined);
            setDragCurrent(undefined);
          }}
        >
          <img ref={imageRef} src={uri} alt="Select regions from source image" draggable={false} />
          <svg className="region-selector-overlay" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
            {regions.map((region, index) => (
              <g key={region.id}>
                <rect className="region-selector-region" x={region.x} y={region.y} width={region.width} height={region.height} />
                <text className="region-selector-label" x={region.x + 0.02} y={region.y + 0.06}>{index + 1}</text>
              </g>
            ))}
            {dragStart && dragCurrent && (() => {
              const geometry = normalizeRegion(dragStart, dragCurrent);
              if (!geometry) return null;
              return <rect className="region-selector-draft" x={geometry.x} y={geometry.y} width={geometry.width} height={geometry.height} />;
            })()}
          </svg>
        </div>
      </div>

      <div className="region-selector-actions">
        <span className="region-selector-hint">
          {disabled ? 'Selection is paused while extraction runs.' : canAddRegion(regions) ? 'Drag across the image to add a region.' : 'Maximum of 8 regions reached.'}
        </span>
        <button
          type="button"
          className="btn-secondary"
          disabled={disabled || regions.length === 0}
          onClick={() => onRegionsChange([])}
        >
          Clear regions
        </button>
      </div>

      {regions.length > 0 && (
        <ul className="region-selector-list" aria-label="Selected regions">
          {regions.map((region, index) => (
            <li key={region.id}>
              <span>Region {index + 1}</span>
              <button
                type="button"
                className="btn-secondary"
                disabled={disabled}
                onClick={() => onRegionsChange(regions.filter((candidate) => candidate.id !== region.id))}
                aria-label={`Remove region ${index + 1}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
