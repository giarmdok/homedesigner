import { useState, useRef, useEffect } from 'react';
import {
  applyMaterialToWall,
  clearFloorMaterial,
  clearWallMaterial,
  createMasterBedroom,
  createPaletteEntry,
  id,
  meters,
  removePaletteEntry,
  resizeRoom,
} from '../domain/geometry';
import { validateRoom } from '../domain/room-validation';
import { createFurniture } from '../domain/furniture';
import { PersistenceControls } from './PersistenceControls';
import { PhotoCalibrationOverlay } from './PhotoCalibrationOverlay';
import { PalettePanel } from './PalettePanel';
import { cropImageToFile, extractAverageColor } from './color-extraction';
import type { Region } from './regions';
import { extractAiPalette, extractLocalPalette } from './palette-extraction';
import type { Id, Material, MeasuredPhoto, PaletteEntry, ProjectSnapshot } from '../domain/model';
import './app.css';
import { MockAiAdapter } from '../ai/mock';
import { createVisionAdapterIfConfigured } from '../ai/vision-adapter';
import type { FurnitureDimensionPort, InferenceResult, PaletteExtractionPort, RoomDetectionPort, RoomProposal, FurnitureProposal } from '../ai/types';
import { createLocalRepository } from '../services/persistence';
import { persistAcceptedProject, resetProject, restoreProject } from '../services/project-lifecycle';
import { createAsyncGeneration } from './async-generation';
import {
  DisplayUnit,
  feetInchesToMeters,
  formatDimensions,
  formatLength,
  formatLengthWithCanonical,
  metersToFeetInches,
} from './units';

const initial = {
  schemaVersion: 1,
  id: id('master-bedroom-project'),
  name: 'Master Bedroom',
  unit: 'm',
  rooms: [createMasterBedroom()],
  assets: [],
  materials: [],
  palette: [],
} as ProjectSnapshot;

/** Deterministic material id for a palette entry, so removal cleanup is exact. */
const materialIdForEntry = (entryId: string): Id => id(`material-from-${entryId}`);

/**
 * Returns the material that backs a palette entry, creating and appending it
 * to the project's materials on first use.
 */
const ensureMaterialForEntry = (
  materials: readonly Material[],
  entry: PaletteEntry,
): { materials: readonly Material[]; materialId: Id } => {
  const materialId = materialIdForEntry(entry.id);
  if (materials.some((m) => m.id === materialId)) {
    return { materials, materialId };
  }
  const material: Material = { id: materialId, name: entry.name, color: entry.color };
  return { materials: [...materials, material], materialId };
};

export function App() {
  const [project, setProject] = useState(initial);
  const [repository] = useState(() => createLocalRepository());
  const [photo, setPhoto] = useState<MeasuredPhoto>();
  const [photoFile, setPhotoFile] = useState<File>();
  const [furniturePhoto, setFurniturePhoto] = useState<{
    name: string;
    sizeBytes: number;
    uri: string;
    file: File;
  }>();
  const [calibrated, setCalibrated] = useState(false);
  const [status, setStatus] = useState('');
  const [proposal, setProposal] = useState<InferenceResult<RoomProposal> | InferenceResult<FurnitureProposal>>();

  // UI display unit preference: defaults to feet/inches ('ft-in')
  const [displayUnit, setDisplayUnit] = useState<DisplayUnit>('ft-in');

  // Calibration input state (default 1 meter)
  const [calibMeters, setCalibMeters] = useState<number>(1);
  const [calibFeet, setCalibFeet] = useState<number>(3);
  const [calibInches, setCalibInches] = useState<number>(3.4);

  // Real pixel distance measured on the photo via the calibration overlay (0 = not measured)
  const [calibPixels, setCalibPixels] = useState<number>(0);

  // Palette panel state: wall targeted in the 2D plan, last-applied palette
  // entry, and status messages from palette operations.
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
  const [activePaletteEntryId, setActivePaletteEntryId] = useState<string | null>(null);
  const [paletteStatus, setPaletteStatus] = useState('');
  const [paletteProcessing, setPaletteProcessing] = useState(false);

  // Input refs for reliable file picker triggering
  const photoInputRef = useRef<HTMLInputElement>(null);
  const furnitureInputRef = useRef<HTMLInputElement>(null);
  const asyncGeneration = useRef(createAsyncGeneration());

  useEffect(() => {
    const token = asyncGeneration.current.capture();
    void restoreProject(repository, initial, () => {
      if (asyncGeneration.current.isCurrent(token)) {
        setStatus('Could not restore the saved project. Starting with a new project.');
      }
    }).then((restored) => {
      if (asyncGeneration.current.isCurrent(token)) setProject(restored);
    });
  }, [repository]);

  // Revoke object URLs safely on cleanup
  useEffect(() => {
    return () => {
      if (photo?.uri && photo.uri.startsWith('blob:')) {
        URL.revokeObjectURL(photo.uri);
      }
    };
  }, [photo?.uri]);

  useEffect(() => {
    return () => {
      if (furniturePhoto?.uri && furniturePhoto.uri.startsWith('blob:')) {
        URL.revokeObjectURL(furniturePhoto.uri);
      }
    };
  }, [furniturePhoto?.uri]);

  const room = project.rooms[0];

  // Clear the wall selection if the targeted wall no longer exists (e.g. the
  // room walls were replaced by an AI suggestion).
  useEffect(() => {
    if (selectedWallId && !room.walls.some((w) => String(w.id) === selectedWallId)) {
      setSelectedWallId(null);
    }
  }, [room.walls, selectedWallId]);

  const issues = validateRoom(room, {
    ...project,
    measuredPhoto: calibrated ? photo : { ...photo, calibration: undefined },
  });

  const photoState: 'no-photo' | 'uncalibrated' | 'calibrated' = !photo
    ? 'no-photo'
    : calibrated
    ? 'calibrated'
    : 'uncalibrated';

  const photoStateLabels = {
    'no-photo': 'No photo selected',
    'uncalibrated': 'Photo selected (not calibrated)',
    'calibrated': 'Calibrated & ready',
  };

  const upload = (file: File) => {
    if (photo?.uri && photo.uri.startsWith('blob:')) {
      URL.revokeObjectURL(photo.uri);
    }
    const uri = URL.createObjectURL(file);
    const next = {
      id: id('measured-photo'),
      name: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      uri,
    };
    setPhoto(next);
    setPhotoFile(file);
    setCalibPixels(0);
    setCalibrated(false);
    setProject((p) => ({ ...p, measuredPhoto: next }));
  };

  const removePhoto = () => {
    if (photo?.uri && photo.uri.startsWith('blob:')) {
      URL.revokeObjectURL(photo.uri);
    }
    setPhoto(undefined);
    setPhotoFile(undefined);
    setCalibrated(false);
    setCalibPixels(0);
    setProject((p) => ({ ...p, measuredPhoto: undefined }));
  };

  const handleFurnitureUpload = (file: File) => {
    if (furniturePhoto?.uri && furniturePhoto.uri.startsWith('blob:')) {
      URL.revokeObjectURL(furniturePhoto.uri);
    }
    const uri = URL.createObjectURL(file);
    setFurniturePhoto({
      name: file.name,
      sizeBytes: file.size,
      uri,
      file,
    });
    run('furniture', file);
  };

  const removeFurniturePhoto = () => {
    if (furniturePhoto?.uri && furniturePhoto.uri.startsWith('blob:')) {
      URL.revokeObjectURL(furniturePhoto.uri);
    }
    setFurniturePhoto(undefined);
  };

  // --- Palette panel handlers ---

  const handleAddPaletteEntry = (entry: PaletteEntry) => {
    setProject((p) => ({ ...p, palette: [...(p.palette ?? []), entry] }));
    setPaletteStatus(`Added "${entry.name}" to the palette.`);
  };

  const handleRemovePaletteEntry = (entryId: string) => {
    const derivedMaterialId = materialIdForEntry(entryId);
    setProject((p) => {
      const r = p.rooms[0];
      return {
        ...p,
        palette: removePaletteEntry(p.palette ?? [], id(entryId)),
        // Also remove any material created from this entry and clear its
        // wall/floor assignments so nothing references a missing color.
        materials: p.materials.filter((m) => m.id !== derivedMaterialId),
        rooms: [
          {
            ...r,
            floorMaterialId: r.floorMaterialId === derivedMaterialId ? undefined : r.floorMaterialId,
            walls: r.walls.map((w) =>
              w.materialId === derivedMaterialId ? { ...w, materialId: undefined } : w,
            ),
          },
        ],
      };
    });
    if (activePaletteEntryId === entryId) setActivePaletteEntryId(null);
    setPaletteStatus('Palette entry removed.');
  };

  const handleApplyToWall = (wallId: string, paletteEntryId: string) => {
    const entry = (project.palette ?? []).find((e) => e.id === paletteEntryId);
    if (!entry) return;
    setActivePaletteEntryId(paletteEntryId);
    setProject((p) => {
      const ensured = ensureMaterialForEntry(p.materials, entry);
      return {
        ...p,
        materials: ensured.materials,
        rooms: [applyMaterialToWall(p.rooms[0], id(wallId), ensured.materialId)],
      };
    });
    setPaletteStatus(`Applied "${entry.name}" to the ${wallId} wall.`);
  };

  const handleApplyToAllWalls = (paletteEntryId: string) => {
    const entry = (project.palette ?? []).find((e) => e.id === paletteEntryId);
    if (!entry) return;
    setActivePaletteEntryId(paletteEntryId);
    setProject((p) => {
      const ensured = ensureMaterialForEntry(p.materials, entry);
      const r = p.rooms[0];
      return {
        ...p,
        materials: ensured.materials,
        rooms: [{ ...r, walls: r.walls.map((w) => ({ ...w, materialId: ensured.materialId })) }],
      };
    });
    setPaletteStatus(`Applied "${entry.name}" to all walls.`);
  };

  const handleApplyToFloor = (paletteEntryId: string) => {
    const entry = (project.palette ?? []).find((e) => e.id === paletteEntryId);
    if (!entry) return;
    setActivePaletteEntryId(paletteEntryId);
    setProject((p) => {
      const ensured = ensureMaterialForEntry(p.materials, entry);
      return {
        ...p,
        materials: ensured.materials,
        rooms: [{ ...p.rooms[0], floorMaterialId: ensured.materialId }],
      };
    });
    setPaletteStatus(`Applied "${entry.name}" to the floor.`);
  };

  const handleRevertWall = (wallId: string) => {
    setProject((p) => ({ ...p, rooms: [clearWallMaterial(p.rooms[0], id(wallId))] }));
    setPaletteStatus(`Reverted the ${wallId} wall to its default finish.`);
  };

  const handleRevertAllWalls = () => {
    setProject((p) => ({
      ...p,
      rooms: [
        { ...p.rooms[0], walls: p.rooms[0].walls.map((w) => ({ ...w, materialId: undefined })) },
      ],
    }));
    setPaletteStatus('Reverted all walls to their default finish.');
  };

  const handleRevertFloor = () => {
    setProject((p) => ({ ...p, rooms: [clearFloorMaterial(p.rooms[0])] }));
    setPaletteStatus('Reverted the floor to its default finish.');
  };

  const handleExtractPalette = async (file: File, regions: readonly Region[] = []) => {
    if (paletteProcessing) return;
    const token = asyncGeneration.current.capture();
    setPaletteProcessing(true);
    setPaletteStatus('Extracting color from image…');
    try {
      const result = await extractLocalPalette({
        fileName: file.name,
        existingPalette: project.palette ?? [],
        regions,
        extractColor: (region) => extractAverageColor(file, region),
      });
      if (!asyncGeneration.current.isCurrent(token)) return;
      setProject((p) => ({ ...p, palette: result.palette }));
      setPaletteStatus(result.status);
    } catch {
      if (asyncGeneration.current.isCurrent(token)) {
        setPaletteStatus('Could not extract a color from that image.');
      }
    } finally {
      if (asyncGeneration.current.isCurrent(token)) setPaletteProcessing(false);
    }
  };

  const handleAiExtractPalette = async (file: File, regions: readonly Region[] = []) => {
    if (paletteProcessing) return;
    const token = asyncGeneration.current.capture();
    setPaletteProcessing(true);
    setPaletteStatus('Extracting palette with AI…');
    try {
      const vision = createVisionAdapterIfConfigured();
      // extractPalette is provided by PaletteExtractionPort; the local mock and
      // the vision adapter gain it independently, so feature-detect it.
      const adapter: RoomDetectionPort & FurnitureDimensionPort & Partial<PaletteExtractionPort> =
        vision ?? new MockAiAdapter();
      if (typeof adapter.extractPalette !== 'function') {
        setPaletteStatus('AI palette extraction is not available in this build yet.');
        return;
      }
      const extractPalette = adapter.extractPalette.bind(adapter);

      const result = await extractAiPalette({
        fileName: file.name,
        existingPalette: project.palette ?? [],
        regions,
        extractPalette: async (region) => {
          const inputFile = region ? await cropImageToFile(file, region) : file;
          const extracted = await extractPalette({
            name: inputFile.name,
            mimeType: inputFile.type,
            sizeBytes: inputFile.size,
            file: inputFile,
          });
          return {
            colors: extracted.proposal.colors,
            provider: extracted.provider,
            confidence: extracted.confidence.score,
          };
        },
      });
      if (!asyncGeneration.current.isCurrent(token)) return;
      setProject((p) => ({ ...p, palette: result.palette }));
      setPaletteStatus(result.status);
    } catch (e) {
      if (asyncGeneration.current.isCurrent(token)) {
        setPaletteStatus(e instanceof Error ? e.message : 'AI palette extraction failed.');
      }
    } finally {
      if (asyncGeneration.current.isCurrent(token)) setPaletteProcessing(false);
    }
  };

  const handleCalibrate = () => {
    const refMeters = displayUnit === 'ft-in' ? feetInchesToMeters(calibFeet, calibInches) : calibMeters;
    if (refMeters <= 0 || isNaN(refMeters) || calibPixels <= 0) return;

    setCalibrated(true);
    setPhoto((prev) =>
      prev
        ? {
            ...prev,
            calibration: { referencePixels: calibPixels, referenceMeters: meters(refMeters) },
          }
        : undefined
    );
  };

  const handleRoomResize = (wMeters: number, dMeters: number) => {
    if (wMeters <= 0 || dMeters <= 0 || isNaN(wMeters) || isNaN(dMeters)) return;
    setProject((p) => ({
      ...p,
      rooms: [
        resizeRoom(p.rooms[0], {
          ...p.rooms[0].dimensions,
          width: meters(wMeters),
          depth: meters(dMeters),
        }),
      ],
    }));
  };

  const run = async (kind: 'room' | 'furniture', file: File) => {
    const token = asyncGeneration.current.capture();
    setStatus('Processing selected image…');
    setProposal(undefined);
    try {
      // Pass calibration scale to the AI so it can compute accurate dimensions
      const calibration = kind === 'room' && photo?.calibration && photo.calibration.referencePixels > 0
        ? { pixelsPerMeter: photo.calibration.referencePixels / (photo.calibration.referenceMeters as number) }
        : undefined;
      const input = { name: file.name, mimeType: file.type, sizeBytes: file.size, file, calibration };
      const vision = createVisionAdapterIfConfigured();
      const adapter: RoomDetectionPort & FurnitureDimensionPort = vision ?? new MockAiAdapter();
      const value =
        kind === 'room'
          ? await adapter.detectRoom(input)
          : await adapter.estimateFurniture(input);
      if (!asyncGeneration.current.isCurrent(token)) return;
      setProposal(value);
      setStatus(vision ? 'AI vision analysis complete. Review suggestion before applying.' : 'Review suggestion before applying.');
    } catch (e) {
      if (asyncGeneration.current.isCurrent(token)) {
        setStatus(e instanceof Error ? e.message : 'Provider error. Manual editing remains available.');
      }
    }
  };

  const accept = () => {
    if (!proposal) return;
    const next = proposal.proposal.kind === 'room'
      ? {
          ...project,
          rooms: [
            resizeRoom(
              { ...project.rooms[0], walls: (proposal.proposal as RoomProposal).walls },
              proposal.proposal.dimensions
            ),
          ],
        }
      : {
          ...project,
          rooms: [
            {
              ...project.rooms[0],
              furniture: [
                ...project.rooms[0].furniture,
                createFurniture(
                  (proposal.proposal as FurnitureProposal).name,
                  proposal.proposal.dimensions.width,
                  proposal.proposal.dimensions.depth,
                  proposal.proposal.dimensions.height
                ),
              ],
            },
          ],
    };
    setProject(next);
    if (proposal.proposal.kind === 'room') {
      const token = asyncGeneration.current.capture();
      void persistAcceptedProject(repository, next, () => {
        setStatus('Could not auto-save the accepted room. Manual Save project is available.');
      }, () => asyncGeneration.current.isCurrent(token));
    }
    setProposal(undefined);
    setStatus('Suggestion applied. You can manually edit it.');
  };

  const handleReset = async () => {
    asyncGeneration.current.invalidate();
    if (photo?.uri && photo.uri.startsWith('blob:')) {
      URL.revokeObjectURL(photo.uri);
    }
    if (furniturePhoto?.uri && furniturePhoto.uri.startsWith('blob:')) {
      URL.revokeObjectURL(furniturePhoto.uri);
    }
    setProject(initial);
    setPhoto(undefined);
    setPhotoFile(undefined);
    setFurniturePhoto(undefined);
    setCalibrated(false);
    setCalibPixels(0);
    setCalibMeters(1);
    setCalibFeet(3);
    setCalibInches(3.4);
    setProposal(undefined);
    setSelectedWallId(null);
    setActivePaletteEntryId(null);
    setPaletteStatus('');
    setPaletteProcessing(false);
    let clearFailed = false;
    await resetProject(repository, initial, () => {
      clearFailed = true;
    });
    setStatus(clearFailed ? 'Room reset, but the saved project could not be cleared.' : 'Room reset.');
  };

  const confirmReset = () => {
    if (!window.confirm('Reset the room and discard the current design?')) return;
    void handleReset();
  };

  const currentRoomFtInWidth = metersToFeetInches(room.dimensions.width);
  const currentRoomFtInDepth = metersToFeetInches(room.dimensions.depth);

  // Calibration is only possible once the user has both measured a pixel span
  // on the photo and entered a positive known real-world length.
  const calibRefMeters = displayUnit === 'ft-in' ? feetInchesToMeters(calibFeet, calibInches) : calibMeters;
  const canCalibrate = calibPixels > 0 && calibRefMeters > 0 && !isNaN(calibRefMeters);
  const proposalPreviewUri = proposal?.proposal.kind === 'room'
    ? photo?.uri
    : proposal?.proposal.kind === 'furniture'
    ? furniturePhoto?.uri
    : undefined;

  return (
    <main>
      <header>
        <span className="eyebrow">HOME DESIGNER</span>
        <h1>Master Bedroom</h1>
        <p>
          Measured room editor · displaying {displayUnit === 'ft-in' ? 'feet & inches (ft/in)' : 'metric (m)'}
        </p>
      </header>

      <section className="workspace">
        <div className="editor-placeholder">
          {(() => {
            // Build the room outline from the wall geometry: chain walls into
            // an ordered, closed loop of corner vertices (in meters).
            const PAD = 40;
            const VW = 500;
            const VH = 400;
            const EPS = 1e-6;

            type MPoint = { x: number; z: number };
            const samePt = (a: MPoint, b: MPoint) => Math.abs(a.x - b.x) < EPS && Math.abs(a.z - b.z) < EPS;

            const solid = room.walls.filter(
              (wl) => Math.hypot(wl.end.x - wl.start.x, wl.end.z - wl.start.z) > EPS
            );

            let verts: MPoint[] | null = null;
            let segs: { a: MPoint; b: MPoint; wallId: string }[] = [];

            if (solid.length >= 3) {
              const used = new Array<boolean>(solid.length).fill(false);
              used[0] = true;
              const loop: MPoint[] = [{ x: solid[0].start.x, z: solid[0].start.z }];
              const orderedSegs: { a: MPoint; b: MPoint; wallId: string }[] = [
                { a: loop[0], b: { x: solid[0].end.x, z: solid[0].end.z }, wallId: solid[0].id },
              ];
              let cursor: MPoint = orderedSegs[0].b;
              let chained = true;

              for (let n = 1; n < solid.length; n++) {
                let found = -1;
                let next: MPoint | null = null;
                for (let i = 1; i < solid.length; i++) {
                  if (used[i]) continue;
                  if (samePt(solid[i].start, cursor)) {
                    found = i;
                    next = { x: solid[i].end.x, z: solid[i].end.z };
                    break;
                  }
                  if (samePt(solid[i].end, cursor)) {
                    found = i;
                    next = { x: solid[i].start.x, z: solid[i].start.z };
                    break;
                  }
                }
                if (found < 0 || !next) {
                  chained = false;
                  break;
                }
                used[found] = true;
                loop.push(cursor);
                orderedSegs.push({ a: cursor, b: next, wallId: solid[found].id });
                cursor = next;
              }

              if (chained && samePt(cursor, loop[0])) {
                verts = loop;
                segs = orderedSegs;
              }
            }

            // Fallback: no clean wall loop (empty, too few, or disconnected
            // walls) — draw a rectangle from the room dimensions instead.
            if (!verts) {
              const w = room.dimensions.width;
              const d = room.dimensions.depth;
              verts = [
                { x: 0, z: 0 },
                { x: w, z: 0 },
                { x: w, z: d },
                { x: 0, z: d },
              ];
              segs = [];
            }

            // Uniform scale into the padded viewBox, preserving aspect ratio.
            const xs = verts.map((v) => v.x);
            const zs = verts.map((v) => v.z);
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minZ = Math.min(...zs);
            const maxZ = Math.max(...zs);
            const spanX = Math.max(maxX - minX, EPS);
            const spanZ = Math.max(maxZ - minZ, EPS);
            const scale = Math.min((VW - 2 * PAD) / spanX, (VH - 2 * PAD) / spanZ);
            const offX = PAD + (VW - 2 * PAD - spanX * scale) / 2;
            const offY = PAD + (VH - 2 * PAD - spanZ * scale) / 2;
            const toSvg = (p: MPoint) => ({ x: offX + (p.x - minX) * scale, y: offY + (p.z - minZ) * scale });

            const svgVerts = verts.map(toSvg);
            const pointsAttr = svgVerts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
            const cx = svgVerts.reduce((sum, p) => sum + p.x, 0) / svgVerts.length;
            const cy = svgVerts.reduce((sum, p) => sum + p.y, 0) / svgVerts.length;

            return (
              <>
                <svg
                  viewBox="0 0 500 400"
                  aria-label="2D room plan"
                  onClick={() => setSelectedWallId(null)}
                >
                  <polygon
                    points={pointsAttr}
                    fill="#f5f8f4"
                    stroke="#527260"
                    strokeWidth="6"
                    strokeLinejoin="round"
                  />
                  {segs.map((s) => {
                    const a = toSvg(s.a);
                    const b = toSvg(s.b);
                    const isSelected = selectedWallId === s.wallId;
                    return (
                      <g key={`wall-hit-${s.wallId}`}>
                        {isSelected && (
                          <line
                            x1={a.x}
                            y1={a.y}
                            x2={b.x}
                            y2={b.y}
                            className="wall-selection-highlight"
                          />
                        )}
                        <line
                          x1={a.x}
                          y1={a.y}
                          x2={b.x}
                          y2={b.y}
                          className="wall-hit-area"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedWallId(isSelected ? null : s.wallId);
                          }}
                        >
                          <title>{`${isSelected ? 'Deselect' : 'Select'} ${s.wallId} wall`}</title>
                        </line>
                      </g>
                    );
                  })}
                  {segs.map((s, i) => {
                  const a = toSvg(s.a);
                  const b = toSvg(s.b);
                  const mx = (a.x + b.x) / 2;
                  const my = (a.y + b.y) / 2;
                  // Unit normal to the segment, flipped to point away from the
                  // centroid so the label sits just outside the outline.
                  let nx = -(b.y - a.y);
                  let ny = b.x - a.x;
                  const nl = Math.hypot(nx, ny) || 1;
                  nx /= nl;
                  ny /= nl;
                  if ((mx - cx) * nx + (my - cy) * ny < 0) {
                    nx = -nx;
                    ny = -ny;
                  }
                  const len = Math.hypot(s.b.x - s.a.x, s.b.z - s.a.z);
                  return (
                    <text
                      key={i}
                      className="wall-label"
                      x={mx + nx * 14}
                      y={my + ny * 14}
                      dominantBaseline="middle"
                    >
                      {formatLength(len, displayUnit)}
                    </text>
                  );
                })}
                <text x={cx} y={cy - 10} fill="#527260" textAnchor="middle" fontSize="18" fontWeight="bold">
                  {room.name}
                </text>
                <text x={cx} y={cy + 15} fill="#6a806f" textAnchor="middle" fontSize="14">
                  {formatDimensions(room.dimensions, displayUnit)}
                </text>
              </svg>
              {segs.length > 0 &&
                (selectedWallId ? (
                  <div className="wall-selection-caption">
                    <span>
                      Selected wall: <strong>{selectedWallId}</strong>
                    </span>
                    <button
                      type="button"
                      className="wall-deselect-btn"
                      onClick={() => setSelectedWallId(null)}
                    >
                      Deselect
                    </button>
                  </div>
                ) : (
                  <p className="wall-selection-hint">
                    Click a wall segment to select it for color application.
                  </p>
                ))}
              </>
            );
          })()}
        </div>

        <aside>
          <h2>Measured plan</h2>

          <div className="unit-preference-card">
            <div className="unit-preference-header">
              <span className="unit-title">Display Units</span>
              <div className="unit-toggle-group" role="radiogroup" aria-label="Display unit preference">
                <button
                  type="button"
                  className={`unit-toggle-btn ${displayUnit === 'ft-in' ? 'active' : ''}`}
                  onClick={() => setDisplayUnit('ft-in')}
                >
                  Feet & Inches (ft/in)
                </button>
                <button
                  type="button"
                  className={`unit-toggle-btn ${displayUnit === 'm' ? 'active' : ''}`}
                  onClick={() => setDisplayUnit('m')}
                >
                  Meters (m)
                </button>
              </div>
            </div>
            <p className="unit-note">
              UI displays measurements in {displayUnit === 'ft-in' ? 'feet & inches' : 'meters'}. Storage and domain calculations remain canonical in meters (m).
            </p>
          </div>

          <div className="instruction-panel">
            <div className="status-header">
              <span className="status-label">Current State:</span>
              <span className={`status-badge status-${photoState}`}>
                {photoStateLabels[photoState]}
              </span>
            </div>

            <ol className="steps-list">
              <li className={`step-item ${photoState === 'no-photo' ? 'step-active' : 'step-done'}`}>
                <span className="step-num">1</span>
                <span className="step-text">Choose a measured room photo</span>
              </li>
              <li
                className={`step-item ${
                  photoState === 'uncalibrated' ? 'step-active' : photoState === 'calibrated' ? 'step-done' : ''
                }`}
              >
                <span className="step-num">2</span>
                <span className="step-text">Review the reference</span>
              </li>
              <li
                className={`step-item ${
                  photoState === 'uncalibrated' ? 'step-active' : photoState === 'calibrated' ? 'step-done' : ''
                }`}
              >
                <span className="step-num">3</span>
                <span className="step-text">
                  Calibrate using a known measurement
                  {photo?.calibration && (
                    <small className="step-subtext">
                      Ref: {formatLengthWithCanonical(photo.calibration.referenceMeters, displayUnit)}
                    </small>
                  )}
                </span>
              </li>
              <li className={`step-item ${calibrated && issues.length ? 'step-active' : calibrated ? 'step-done' : ''}`}>
                <span className="step-num">4</span>
                <span className="step-text">Review validation</span>
              </li>
              <li className={`step-item ${calibrated && !issues.length ? 'step-active step-done' : ''}`}>
                <span className="step-num">5</span>
                <span className="step-text">Finalize the plan</span>
              </li>
            </ol>
          </div>

          <div className="room-dimensions-card">
            <h3>Room Dimensions</h3>
            <p className="room-dims-summary">
              Current: <strong>{formatDimensions(room.dimensions, displayUnit)}</strong>
            </p>

            {displayUnit === 'ft-in' ? (
              <div className="dimension-inputs-grid">
                <div className="dim-group">
                  <label htmlFor="room-width-ft">Width</label>
                  <div className="ft-in-inputs">
                    <input
                      id="room-width-ft"
                      type="number"
                      min="0"
                      aria-label="Room width feet"
                      value={currentRoomFtInWidth.feet}
                      onChange={(e) => {
                        const ft = parseInt(e.target.value, 10) || 0;
                        const m = feetInchesToMeters(ft, currentRoomFtInWidth.inches);
                        handleRoomResize(m, room.dimensions.depth);
                      }}
                    />
                    <span>ft</span>
                    <input
                      type="number"
                      min="0"
                      max="11.9"
                      step="0.1"
                      aria-label="Room width inches"
                      value={currentRoomFtInWidth.inches}
                      onChange={(e) => {
                        const inch = parseFloat(e.target.value) || 0;
                        const m = feetInchesToMeters(currentRoomFtInWidth.feet, inch);
                        handleRoomResize(m, room.dimensions.depth);
                      }}
                    />
                    <span>in</span>
                  </div>
                </div>

                <div className="dim-group">
                  <label htmlFor="room-depth-ft">Depth</label>
                  <div className="ft-in-inputs">
                    <input
                      id="room-depth-ft"
                      type="number"
                      min="0"
                      aria-label="Room depth feet"
                      value={currentRoomFtInDepth.feet}
                      onChange={(e) => {
                        const ft = parseInt(e.target.value, 10) || 0;
                        const m = feetInchesToMeters(ft, currentRoomFtInDepth.inches);
                        handleRoomResize(room.dimensions.width, m);
                      }}
                    />
                    <span>ft</span>
                    <input
                      type="number"
                      min="0"
                      max="11.9"
                      step="0.1"
                      aria-label="Room depth inches"
                      value={currentRoomFtInDepth.inches}
                      onChange={(e) => {
                        const inch = parseFloat(e.target.value) || 0;
                        const m = feetInchesToMeters(currentRoomFtInDepth.feet, inch);
                        handleRoomResize(room.dimensions.width, m);
                      }}
                    />
                    <span>in</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="dimension-inputs-grid">
                <div className="dim-group">
                  <label htmlFor="room-width-m">Width (m)</label>
                  <input
                    id="room-width-m"
                    type="number"
                    min="0.1"
                    step="0.1"
                    aria-label="Room width meters"
                    value={room.dimensions.width}
                    onChange={(e) => {
                      const m = parseFloat(e.target.value) || 0;
                      handleRoomResize(m, room.dimensions.depth);
                    }}
                  />
                </div>
                <div className="dim-group">
                  <label htmlFor="room-depth-m">Depth (m)</label>
                  <input
                    id="room-depth-m"
                    type="number"
                    min="0.1"
                    step="0.1"
                    aria-label="Room depth meters"
                    value={room.dimensions.depth}
                    onChange={(e) => {
                      const m = parseFloat(e.target.value) || 0;
                      handleRoomResize(room.dimensions.width, m);
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Photo Reference Upload Section */}
          <div className="upload-section">
            <input
              ref={photoInputRef}
              id="photo-reference-input"
              type="file"
              accept="image/*"
              className="visually-hidden"
              aria-label="Upload photo reference image"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) upload(file);
                e.target.value = '';
              }}
            />

            {!photo ? (
              <div className="upload-card">
                <div className="upload-card-header">
                  <span className="upload-card-title">Photo Reference</span>
                  <p className="upload-card-desc">Upload a room photo to calibrate & measure</p>
                </div>
                <label
                  htmlFor="photo-reference-input"
                  className="btn-upload"
                >
                  <svg className="upload-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span>Select room photo</span>
                </label>
              </div>
            ) : (
              <div className="photo-card">
                <div className="preview-container preview-container-calib">
                  <PhotoCalibrationOverlay
                    key={photo.uri}
                    uri={photo.uri}
                    displayUnit={displayUnit}
                    onCalibrate={setCalibPixels}
                  />
                </div>

                <div className="photo-header">
                  <p className="photo-info">
                    <strong>{photo.name}</strong>
                    <span>({Math.round(photo.sizeBytes / 1024)} KB)</span>
                  </p>
                  <span className={`photo-badge ${calibrated ? 'calibrated' : 'uncalibrated'}`}>
                    {calibrated ? 'Calibrated' : 'Uncalibrated'}
                  </span>
                </div>

                <div className="calibration-controls">
                   <label className="calib-label" htmlFor="calib-ref-input">Optional Scale Calibration</label>
                  {displayUnit === 'ft-in' ? (
                    <div className="ft-in-inputs" id="calib-ref-input">
                      <input
                        type="number"
                        min="0"
                        aria-label="Calibration reference feet"
                        value={calibFeet}
                        onChange={(e) => {
                          const ft = parseInt(e.target.value, 10) || 0;
                          setCalibFeet(ft);
                          setCalibMeters(feetInchesToMeters(ft, calibInches));
                        }}
                      />
                      <span>ft</span>
                      <input
                        type="number"
                        min="0"
                        max="11.9"
                        step="0.1"
                        aria-label="Calibration reference inches"
                        value={calibInches}
                        onChange={(e) => {
                          const inch = parseFloat(e.target.value) || 0;
                          setCalibInches(inch);
                          setCalibMeters(feetInchesToMeters(calibFeet, inch));
                        }}
                      />
                      <span>in</span>
                    </div>
                  ) : (
                    <div className="metric-input" id="calib-ref-input">
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        aria-label="Calibration reference meters"
                        value={calibMeters}
                        onChange={(e) => {
                          const m = parseFloat(e.target.value) || 0;
                          setCalibMeters(m);
                          const { feet, inches } = metersToFeetInches(m);
                          setCalibFeet(feet);
                          setCalibInches(inches);
                        }}
                      />
                      <span>m</span>
                    </div>
                  )}

                  {calibPixels > 0 ? (
                    <p className="calib-measured">
                      Measured on photo: <strong>{Math.round(calibPixels)} px</strong>
                    </p>
                  ) : (
                    <p className="calib-measured calib-measured-empty">
                      No points measured yet — click the photo above to set two points.
                    </p>
                  )}

                  <button type="button" onClick={handleCalibrate} disabled={!canCalibrate}>
                    Calibrate scale ({formatLengthWithCanonical(calibRefMeters, displayUnit)})
                  </button>
                </div>

                <div className="photo-actions">
                  <button
                    type="button"
                    onClick={() => {
                      const fileToDetect = photoFile || new File([], photo.name, { type: photo.mimeType });
                      run('room', fileToDetect);
                    }}
                  >
                    Detect room
                  </button>
                  <label
                    htmlFor="photo-reference-input"
                    className="btn-secondary"
                  >
                    Change photo
                  </label>
                  <button type="button" className="btn-secondary btn-danger" onClick={removePhoto}>
                    Remove photo
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Furniture Image Upload Section */}
          <div className="upload-section">
            <input
              ref={furnitureInputRef}
              id="furniture-image-input"
              type="file"
              accept="image/*"
              className="visually-hidden"
              aria-label="Upload furniture item image"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFurnitureUpload(file);
                e.target.value = '';
              }}
            />

            {!furniturePhoto ? (
              <div className="upload-card">
                <div className="upload-card-header">
                  <span className="upload-card-title">Furniture Image</span>
                  <p className="upload-card-desc">Upload a photo to estimate furniture dimensions</p>
                </div>
                <button
                  type="button"
                  className="btn-upload"
                  onClick={() => furnitureInputRef.current?.click()}
                  aria-label="Choose furniture image file"
                >
                  <svg className="upload-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span>Select furniture image</span>
                </button>
              </div>
            ) : (
              <div className="furniture-card">
                <div className="preview-container">
                  <img
                    src={furniturePhoto.uri}
                    alt={`Furniture preview: ${furniturePhoto.name}`}
                    className="photo-preview-image"
                  />
                </div>

                <div className="photo-header">
                  <p className="photo-info">
                    <strong>{furniturePhoto.name}</strong>
                    <span>({Math.round(furniturePhoto.sizeBytes / 1024)} KB)</span>
                  </p>
                </div>

                <div className="photo-actions">
                  <button
                    type="button"
                    onClick={() => run('furniture', furniturePhoto.file)}
                  >
                    Re-analyze image
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => furnitureInputRef.current?.click()}
                  >
                    Change image
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-danger"
                    onClick={removeFurniturePhoto}
                  >
                    Remove image
                  </button>
                </div>
              </div>
            )}
          </div>

          {status && <p role="status" className="status-msg">{status}</p>}

          {proposal && (
            <section aria-label="AI suggestion" className="proposal-card">
              {proposalPreviewUri && (
                <div className="proposal-preview">
                  <img
                    src={proposalPreviewUri}
                    alt={proposal.proposal.kind === 'room' ? 'Room image used for detection' : 'Furniture image used for detection'}
                    className="proposal-preview-image"
                  />
                </div>
              )}
              <strong>
                Confidence: {Math.round(proposal.confidence.score * 100)}% ({proposal.confidence.level})
              </strong>
              <p className="proposal-dims">
                Dimensions: {formatDimensions(proposal.proposal.dimensions, displayUnit)}
              </p>
              <div className="proposal-actions">
                <button type="button" onClick={accept}>Accept</button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setProposal(undefined);
                    setStatus('Suggestion rejected; manual workflow unchanged.');
                  }}
                >
                  Reject
                </button>
              </div>
            </section>
          )}

          {room.furniture.length > 0 && (
            <div className="furniture-list-card">
              <h3>Placed Furniture</h3>
              <ul>
                {room.furniture.map((f) => (
                  <li key={f.id}>
                    <span>{f.name}</span>
                    <small>{formatDimensions(f.dimensions, displayUnit)}</small>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Color Palette Section */}
          <PalettePanel
            palette={project.palette ?? []}
            materials={project.materials}
            room={room}
            selectedWallId={selectedWallId}
            onAddPaletteEntry={handleAddPaletteEntry}
            onRemovePaletteEntry={handleRemovePaletteEntry}
            onApplyToWall={handleApplyToWall}
            onApplyToAllWalls={handleApplyToAllWalls}
            onApplyToFloor={handleApplyToFloor}
            onRevertWall={handleRevertWall}
            onRevertAllWalls={handleRevertAllWalls}
            onRevertFloor={handleRevertFloor}
             onExtractPalette={(file, regions) => handleExtractPalette(file, regions)}
             onAiExtractPalette={(file, regions) => handleAiExtractPalette(file, regions)}
             paletteStatus={paletteStatus}
             paletteProcessing={paletteProcessing}
          />

          <h3>Validation</h3>
          {issues.length ? (
            <ul className="issues-list">
              {issues.map((x) => (
                <li key={x.path}>{x.message}</li>
              ))}
            </ul>
          ) : (
            <p className="ok">Ready to finalize</p>
          )}

          <PersistenceControls project={project} onLoaded={setProject} />
          <button
            type="button"
            className="btn-secondary btn-danger"
            onClick={confirmReset}
            aria-label="Reset the room and discard the current design"
          >
            Reset room
          </button>

          <button type="button" className="btn-finalize" disabled={!!issues.length}>
            Finalize plan
          </button>
        </aside>
      </section>
    </main>
  );
}
