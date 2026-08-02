import { useEffect, useRef, useState } from 'react';
import { createPaletteEntry, createPaletteEntryFromHex } from '../domain/geometry';
import type { Material, PaletteEntry, Room } from '../domain/model';
import { extractAverageColor, rgbToHex, type RgbColor } from './color-extraction';
import { RegionSelector } from './RegionSelector';
import type { Region } from './regions';

export interface PalettePanelProps {
  palette: readonly PaletteEntry[];
  materials: readonly Material[];
  room: Room;
  selectedWallId: string | null;
  onAddPaletteEntry: (entry: PaletteEntry) => void;
  onRemovePaletteEntry: (entryId: string) => void;
  onApplyToWall: (wallId: string, materialId: string) => void;
  onApplyToAllWalls: (materialId: string) => void;
  onApplyToFloor: (materialId: string) => void;
  onRevertWall: (wallId: string) => void;
  onRevertAllWalls: () => void;
  onRevertFloor: () => void;
  onExtractPalette: (file: File, regions: readonly Region[]) => void | Promise<void>;
  onAiExtractPalette: (file: File, regions: readonly Region[]) => void | Promise<void>;
  paletteStatus: string;
  paletteProcessing?: boolean;
}

type AddMethod = 'image' | 'picker' | 'hex' | 'ai';

const HEX_PATTERN = /^#?[0-9a-fA-F]{6}$/;

const methodLabels: Record<AddMethod, string> = {
  image: 'Image',
  picker: 'Picker',
  hex: 'Hex',
  ai: 'AI',
};

const sourceLabels: Record<PaletteEntry['source'], string> = {
  image: 'Image',
  manual: 'Manual',
  ai: 'AI',
};

/** "ai-wall-0" -> "Ai Wall 0", "north" -> "North" */
const prettyWallName = (wallId: string): string =>
  wallId.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/** Normalizes user hex input to a "#rrggbb" CSS string. */
const normalizeHex = (raw: string): string => (raw.startsWith('#') ? raw : `#${raw}`);

export function PalettePanel({
  palette,
  materials,
  room,
  selectedWallId,
  onAddPaletteEntry,
  onRemovePaletteEntry,
  onApplyToWall,
  onApplyToAllWalls,
  onApplyToFloor,
  onRevertWall,
  onRevertAllWalls,
  onRevertFloor,
  onExtractPalette,
  onAiExtractPalette,
  paletteStatus,
  paletteProcessing = false,
}: PalettePanelProps) {
  const [addMethod, setAddMethod] = useState<AddMethod>('image');
  // The palette entry currently chosen as the color to apply.
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);

  // --- Add method 1: image swatch (local extraction with preview) ---
  const [swatchFile, setSwatchFile] = useState<File>();
  const [swatchUri, setSwatchUri] = useState<string>();
  const [swatchColor, setSwatchColor] = useState<RgbColor>();
  const [swatchError, setSwatchError] = useState(false);
  const [swatchName, setSwatchName] = useState('');
  const [swatchRegions, setSwatchRegions] = useState<readonly Region[]>([]);

  // --- Add method 2: native color picker ---
  const [pickerColor, setPickerColor] = useState('#527260');
  const [pickerName, setPickerName] = useState('');

  // --- Add method 3: hex code input ---
  const [hexValue, setHexValue] = useState('');
  const [hexName, setHexName] = useState('');

  // --- Add method 4: AI palette extraction (handled by the parent) ---
  const [aiFile, setAiFile] = useState<File>();
  const [aiUri, setAiUri] = useState<string>();
  const [aiRegions, setAiRegions] = useState<readonly Region[]>([]);

  const swatchInputRef = useRef<HTMLInputElement>(null);
  const aiInputRef = useRef<HTMLInputElement>(null);
  // Guards against out-of-order extraction results when a new swatch is
  // chosen before the previous extraction finished.
  const swatchReqRef = useRef(0);

  useEffect(() => {
    return () => {
      if (swatchUri && swatchUri.startsWith('blob:')) {
        URL.revokeObjectURL(swatchUri);
      }
    };
  }, [swatchUri]);

  const resetSwatch = () => {
    if (swatchUri?.startsWith('blob:')) {
      URL.revokeObjectURL(swatchUri);
    }
    setSwatchFile(undefined);
    setSwatchUri(undefined);
    setSwatchColor(undefined);
    setSwatchError(false);
    setSwatchName('');
    setSwatchRegions([]);
  };

  const handleSwatchFile = async (file: File) => {
    if (swatchUri?.startsWith('blob:')) {
      URL.revokeObjectURL(swatchUri);
    }
    const req = ++swatchReqRef.current;
    const uri = URL.createObjectURL(file);
    setSwatchFile(file);
    setSwatchUri(uri);
    setSwatchColor(undefined);
    setSwatchError(false);
    setSwatchName(file.name.replace(/\.[^.]+$/, ''));
    setSwatchRegions([]);
    try {
      const color = await extractAverageColor(file);
      if (req === swatchReqRef.current) setSwatchColor(color);
    } catch {
      if (req === swatchReqRef.current) setSwatchError(true);
    }
  };

  const handleAiFile = (file: File) => {
    if (aiUri?.startsWith('blob:')) URL.revokeObjectURL(aiUri);
    setAiFile(file);
    setAiUri(URL.createObjectURL(file));
    setAiRegions([]);
  };

  useEffect(() => {
    return () => {
      if (aiUri?.startsWith('blob:')) URL.revokeObjectURL(aiUri);
    };
  }, [aiUri]);

  const addSwatchEntry = () => {
    if (!swatchColor || !swatchName.trim()) return;
    onAddPaletteEntry(
      createPaletteEntry(swatchName.trim(), swatchColor.r, swatchColor.g, swatchColor.b, 'image'),
    );
    resetSwatch();
  };

  const addPickerEntry = () => {
    if (!pickerName.trim()) return;
    onAddPaletteEntry(createPaletteEntryFromHex(pickerName.trim(), pickerColor, 'manual'));
    setPickerName('');
  };

  const trimmedHex = hexValue.trim();
  const hexValid = HEX_PATTERN.test(trimmedHex);

  const addHexEntry = () => {
    if (!hexValid || !hexName.trim()) return;
    onAddPaletteEntry(createPaletteEntryFromHex(hexName.trim(), normalizeHex(trimmedHex), 'manual'));
    setHexValue('');
    setHexName('');
  };

  const removeEntry = (entryId: string) => {
    if (entryId === activeEntryId) setActiveEntryId(null);
    onRemovePaletteEntry(entryId);
  };

  const toggleActive = (entryId: string) => {
    setActiveEntryId((current) => (current === entryId ? null : entryId));
  };

  // --- Derived state for the apply/revert section ---
  const activeEntry = palette.find((e) => e.id === activeEntryId);
  const selectedWall = selectedWallId
    ? room.walls.find((w) => String(w.id) === selectedWallId)
    : undefined;
  const materialById = new Map<string, Material>(
    materials.map((m) => [String(m.id), m] as [string, Material]),
  );
  const wallAssignments = room.walls.filter((w) => w.materialId !== undefined);
  const floorMaterial = room.floorMaterialId
    ? materialById.get(String(room.floorMaterialId))
    : undefined;

  const applyToSelectedWall = () => {
    if (activeEntry && selectedWallId) onApplyToWall(selectedWallId, activeEntry.id);
  };
  const applyToAllWalls = () => {
    if (activeEntry) onApplyToAllWalls(activeEntry.id);
  };
  const applyToFloor = () => {
    if (activeEntry) onApplyToFloor(activeEntry.id);
  };
  const revertSelectedWall = () => {
    if (selectedWallId) onRevertWall(selectedWallId);
  };

  return (
    <section className="palette-panel" aria-label="Color palette">
      <div className="palette-panel-header">
        <span className="palette-panel-title">Color Palette</span>
        <p className="palette-panel-desc">
          Build a reusable palette, then apply colors to walls &amp; floor.
        </p>
      </div>

      {/* A. Add Color */}
      <div className="palette-add-section">
        <div className="palette-add-tabs" role="tablist" aria-label="Add color method">
          {(Object.keys(methodLabels) as AddMethod[]).map((method) => (
            <button
              key={method}
              type="button"
              role="tab"
              aria-selected={addMethod === method}
              className={`palette-add-tab ${addMethod === method ? 'active' : ''}`}
              onClick={() => setAddMethod(method)}
            >
              {methodLabels[method]}
            </button>
          ))}
        </div>

        {addMethod === 'image' && (
          <div className="palette-add-body">
            <input
              ref={swatchInputRef}
              id="palette-swatch-input"
              type="file"
              accept="image/*"
               className="visually-hidden"
               aria-label="Upload swatch image for color extraction"
               disabled={paletteProcessing}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleSwatchFile(file);
                e.target.value = '';
              }}
            />
            {!swatchUri ? (
              <button
                type="button"
                className="btn-upload"
                onClick={() => swatchInputRef.current?.click()}
                aria-label="Choose swatch image file"
              >
                <svg className="upload-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>Select swatch image</span>
              </button>
            ) : (
              <div className="palette-swatch-preview">
                <div className="swatch-preview-row">
                  <img
                    src={swatchUri}
                    alt={`Swatch preview: ${swatchFile?.name ?? 'material'}`}
                    className="swatch-thumb"
                  />
                  {swatchColor ? (
                    <div className="swatch-color-info">
                      <span className="swatch-chip" style={{ background: rgbToHex(swatchColor) }} />
                      <span className="swatch-hex">{rgbToHex(swatchColor).toUpperCase()}</span>
                      {swatchFile && (
                        <span className="swatch-file-meta">
                          {Math.round(swatchFile.size / 1024)} KB
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className={swatchError ? 'swatch-error' : 'swatch-extracting'}>
                      {swatchError ? 'Could not read a color from this image.' : 'Reading color…'}
                    </span>
                  )}
                </div>

                <RegionSelector
                  uri={swatchUri}
                  regions={swatchRegions}
                  onRegionsChange={setSwatchRegions}
                  disabled={paletteProcessing}
                />

                <label className="palette-field-label" htmlFor="palette-swatch-name">
                  Color name
                </label>
                <input
                  id="palette-swatch-name"
                  type="text"
                  className="palette-text-input"
                  value={swatchName}
                  placeholder="e.g. Sage wall paint"
                  onChange={(e) => setSwatchName(e.target.value)}
                />

                <div className="palette-add-actions">
                  <button
                    type="button"
                    disabled={!swatchColor || !swatchName.trim()}
                    onClick={addSwatchEntry}
                  >
                    Add to palette
                  </button>
                  {swatchRegions.length > 0 && swatchFile && (
                    <button
                      type="button"
                      disabled={paletteProcessing}
                      onClick={() => void onExtractPalette(swatchFile, swatchRegions)}
                    >
                      Extract selected regions
                    </button>
                  )}
                  <button type="button" className="btn-secondary" onClick={resetSwatch}>
                    Discard
                  </button>
                </div>
              </div>
            )}
            <p className="palette-method-hint">
              Upload a paint, carpet, or flooring photo — we read its average color.
            </p>
          </div>
        )}

        {addMethod === 'picker' && (
          <div className="palette-add-body">
            <div className="palette-picker-row">
              <input
                type="color"
                className="palette-color-input"
                value={pickerColor}
                aria-label="Choose a color visually"
                onChange={(e) => setPickerColor(e.target.value)}
              />
              <span className="swatch-hex">{pickerColor.toUpperCase()}</span>
            </div>
            <label className="palette-field-label" htmlFor="palette-picker-name">
              Color name
            </label>
            <input
              id="palette-picker-name"
              type="text"
              className="palette-text-input"
              value={pickerName}
              placeholder="e.g. Deep forest"
              onChange={(e) => setPickerName(e.target.value)}
            />
            <div className="palette-add-actions">
              <button type="button" disabled={!pickerName.trim()} onClick={addPickerEntry}>
                Add to palette
              </button>
            </div>
            <p className="palette-method-hint">
              Pick any color visually with the system color picker.
            </p>
          </div>
        )}

        {addMethod === 'hex' && (
          <div className="palette-add-body">
            <label className="palette-field-label" htmlFor="palette-hex-input">
              Hex code
            </label>
            <div className="palette-hex-row">
              <input
                id="palette-hex-input"
                type="text"
                className="palette-text-input"
                value={hexValue}
                placeholder="#a1b2c3"
                spellCheck={false}
                onChange={(e) => setHexValue(e.target.value)}
              />
              <span
                className="palette-hex-preview"
                style={{ background: hexValid ? normalizeHex(trimmedHex) : 'transparent' }}
                aria-hidden="true"
              />
            </div>
            {trimmedHex !== '' && !hexValid && (
              <p className="palette-inline-error">Enter a 6-digit hex code, e.g. #A1B2C3.</p>
            )}
            <label className="palette-field-label" htmlFor="palette-hex-name">
              Color name
            </label>
            <input
              id="palette-hex-name"
              type="text"
              className="palette-text-input"
              value={hexName}
              placeholder="e.g. Misty blue"
              onChange={(e) => setHexName(e.target.value)}
            />
            <div className="palette-add-actions">
              <button type="button" disabled={!hexValid || !hexName.trim()} onClick={addHexEntry}>
                Add to palette
              </button>
            </div>
            <p className="palette-method-hint">
              Paste a hex code from a paint brand or design tool.
            </p>
          </div>
        )}

        {addMethod === 'ai' && (
          <div className="palette-add-body">
            <input
              ref={aiInputRef}
              id="palette-ai-input"
              type="file"
              accept="image/*"
              className="visually-hidden"
               aria-label="Upload inspiration image for AI palette extraction"
               disabled={paletteProcessing}
               onChange={(e) => {
                 const file = e.target.files?.[0];
                 if (file) handleAiFile(file);
                e.target.value = '';
              }}
            />
            {!aiFile || !aiUri ? (
              <button
                type="button"
                className="btn-upload"
                onClick={() => aiInputRef.current?.click()}
                aria-label="Choose inspiration image file"
              >
                <svg className="upload-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>Select inspiration image</span>
              </button>
            ) : (
              <>
                <div className="palette-ai-file">
                  <span className="palette-ai-file-name" title={aiFile.name}>
                    {aiFile.name}
                  </span>
                  <button
                    type="button"
                    className="btn-secondary palette-ai-change"
                    disabled={paletteProcessing}
                    onClick={() => aiInputRef.current?.click()}
                  >
                    Change
                  </button>
                </div>
                <RegionSelector
                  uri={aiUri}
                  regions={aiRegions}
                  onRegionsChange={setAiRegions}
                  disabled={paletteProcessing}
                />
              </>
            )}
            <div className="palette-add-actions">
              <button
                type="button"
                disabled={!aiFile || paletteProcessing}
                onClick={() => {
                  if (aiFile) void onAiExtractPalette(aiFile, aiRegions);
                }}
              >
                Extract palette with AI
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={!aiFile || paletteProcessing}
                onClick={() => {
                  if (aiFile) void onExtractPalette(aiFile, aiRegions);
                }}
              >
                Average color instead
              </button>
            </div>
            <p className="palette-method-hint">
              AI reads the mood of the photo and suggests a coordinated set of colors.
            </p>
          </div>
        )}
      </div>

      {/* B. Palette Grid */}
      <div className="palette-grid-section">
        <span className="palette-section-label">Palette ({palette.length})</span>
        {palette.length === 0 ? (
          <p className="palette-empty">No colors yet — add your first color above.</p>
        ) : (
          <div className="palette-grid" role="listbox" aria-label="Saved palette colors">
            {palette.map((entry) => {
              const isActive = entry.id === activeEntryId;
              return (
                <div
                  key={entry.id}
                  role="option"
                  aria-selected={isActive}
                  tabIndex={0}
                  className={`palette-swatch ${isActive ? 'selected' : ''}`}
                  title={`${entry.name} (${entry.color.value.toUpperCase()}) — click to ${isActive ? 'deselect' : 'select'}`}
                  onClick={() => toggleActive(entry.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleActive(entry.id);
                    }
                  }}
                >
                  <button
                    type="button"
                    className="palette-swatch-remove"
                    aria-label={`Remove ${entry.name} from palette`}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeEntry(entry.id);
                    }}
                  >
                    ×
                  </button>
                  <span className="palette-swatch-chip" style={{ background: entry.color.value }} />
                  <span className="palette-swatch-name">{entry.name}</span>
                  <span className="palette-swatch-hex">{entry.color.value.toUpperCase()}</span>
                  <span className={`source-badge source-${entry.source}`}>
                    {sourceLabels[entry.source]}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* C. Apply & Revert */}
      <div className="palette-apply-section">
        <span className="palette-section-label">Apply &amp; Revert</span>

        {!activeEntry && (
          <p className="palette-hint">Select a color from the palette to enable apply actions.</p>
        )}

        {selectedWallId ? (
          <div className="apply-group">
            <span className="apply-group-title">
              Selected wall: {prettyWallName(selectedWallId)}
            </span>
            <div className="apply-buttons">
              <button type="button" disabled={!activeEntry} onClick={applyToSelectedWall}>
                Apply {activeEntry ? `"${activeEntry.name}"` : 'color'} to this wall
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={!selectedWall || selectedWall.materialId === undefined}
                onClick={revertSelectedWall}
              >
                Revert this wall
              </button>
            </div>
          </div>
        ) : (
          <p className="palette-hint">
            Tip: click a wall segment in the 2D plan to target it individually.
          </p>
        )}

        <div className="apply-group">
          <span className="apply-group-title">Whole room</span>
          <div className="apply-buttons">
            <button type="button" disabled={!activeEntry} onClick={applyToAllWalls}>
              Apply {activeEntry ? `"${activeEntry.name}"` : 'color'} to all walls
            </button>
            <button type="button" disabled={!activeEntry} onClick={applyToFloor}>
              Apply {activeEntry ? `"${activeEntry.name}"` : 'color'} to floor
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={wallAssignments.length === 0}
              onClick={onRevertAllWalls}
            >
              Revert all walls
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={room.floorMaterialId === undefined}
              onClick={onRevertFloor}
            >
              Revert floor
            </button>
          </div>
        </div>

        {(wallAssignments.length > 0 || room.floorMaterialId !== undefined) && (
          <div className="palette-assignments">
            <span className="palette-section-label">Current finishes</span>
            {wallAssignments.map((w) => {
              const mat = w.materialId ? materialById.get(String(w.materialId)) : undefined;
              return (
                <div className="assignment-row" key={String(w.id)}>
                  <span
                    className="assignment-chip"
                    style={{ background: mat?.color.value ?? 'transparent' }}
                  />
                  <span className="assignment-target">{prettyWallName(String(w.id))} wall</span>
                  <span className="assignment-name">{mat?.name ?? 'Unknown material'}</span>
                </div>
              );
            })}
            {room.floorMaterialId !== undefined && (
              <div className="assignment-row">
                <span
                  className="assignment-chip"
                  style={{ background: floorMaterial?.color.value ?? 'transparent' }}
                />
                <span className="assignment-target">Floor</span>
                <span className="assignment-name">{floorMaterial?.name ?? 'Unknown material'}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {paletteStatus && (
        <p role="status" className="palette-status">
          {paletteStatus}
        </p>
      )}
    </section>
  );
}
