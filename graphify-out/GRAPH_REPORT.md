# Graph Report - .  (2026-08-02)

## Corpus Check
- Large corpus: 140 files ╖ ~738,370 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 365 nodes · 636 edges · 56 communities (17 shown, 39 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.84)
- Token cost: 91,865 input · 6,908 output

## Community Hubs (Navigation)
- AI Configuration
- Domain Model
- Package Dependencies
- Furniture Operations
- Application Shell
- Editor Adapter
- Materials and Color
- TypeScript Configuration
- Project Memory
- Build Configuration
- Reference Photos
- Farmhouse Catalog Assets
- OpenCode Configuration
- Graphify Plugin
- Room Editor UX
- Storage Furniture Photos
- Project References
- Existing Furniture Assets
- Furniture Documentation
- OpenSpec Commands
- Floor Plans
- Furniture Reference Image
- Agent Documentation
- Feature Work Guide
- Feature Template
- Farmhouse Asset 1
- Farmhouse Asset 2
- Farmhouse Asset 3
- Farmhouse Asset 4
- Farmhouse Asset 5
- Farmhouse Asset 6
- Farmhouse Asset 7
- Farmhouse Asset 8
- Farmhouse Asset 9
- Farmhouse Asset 10
- Farmhouse Asset 11
- Farmhouse Asset 12
- Farmhouse Asset 13
- Farmhouse Asset 14
- Farmhouse Asset 15
- Farmhouse Asset 16
- OpenSpec Archive
- OpenSpec Proposal
- AI Room Import
- Project Persistence
- Room Designer Core
- Furniture Placement
- Synchronized 3D View
- Ottoman Detail Photo
- Nightstand Photo
- Furniture Catalog
- Isometric Room View
- Top-Down Layout
- Home Designer Overview

## God Nodes (most connected - your core abstractions)
1. `App()` - 22 edges
2. `meters()` - 19 edges
3. `VisionAdapter` - 16 edges
4. `compilerOptions` - 15 edges
5. `replace()` - 14 edges
6. `MockAiAdapter` - 11 edges
7. `Id` - 11 edges
8. `ProjectSnapshot` - 11 edges
9. `ImageInput` - 10 edges
10. `id()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Existing Furniture Catalog` --semantically_similar_to--> `Farmhouse Armoire`  [INFERRED] [semantically similar]
  20260730/existing.png → farmhouse/farmhouse.md
- `2D Room Plan Diagram` --conceptually_related_to--> `Measured Room Editor Spec`  [INFERRED]
  raw_resources/035a3d2c-d267-4a03-bf53-97721211e197.png → openspec/specs/measured-room-editor/spec.md
- `Skill: opsx-apply` --references--> `OpenSpec Config`  [INFERRED]
  .opencode/commands/opsx-apply.md → openspec/config.yaml
- `UI Accessibility Tree Snapshot` --conceptually_related_to--> `Measured Room Editor Spec`  [INFERRED]
  .playwright-mcp/page-2026-07-31T15-45-07-886Z.yml → openspec/specs/measured-room-editor/spec.md
- `Farmhouse Bedroom Set Photo` --references--> `Farmhouse Nightstand (Large)`  [INFERRED]
  farmhouse/SWW-FarmhouseRHickory_RS_1-25.jpg → farmhouse/farmhouse.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **OpenSpec Core Capabilities** — openspec_specs_room_designer_foundation_spec, openspec_specs_measured_room_editor_spec, openspec_specs_scaled_furniture_placement_spec, openspec_specs_project_save_load_spec, openspec_specs_synchronized_3d_view_spec, openspec_specs_ai_room_and_furniture_import_spec [EXTRACTED 1.00]
- **OPSX Command Suite** — opencode_commands_opsx_apply, opencode_commands_opsx_archive, opencode_commands_opsx_propose [EXTRACTED 1.00]
- **Master Suite Furniture Inventory** — raw_resources_20260730_existing_exh_01, raw_resources_20260730_existing_exo_01, raw_resources_20260730_existing_exd_01, raw_resources_20260730_existing_left_chest, raw_resources_20260730_existing_armoire, raw_resources_20260730_existing_nightstand, raw_resources_20260730_existing_king_bed [EXTRACTED 1.00]
- **Farmhouse Furniture Collection** — farmhouse_farmhouse_fhgc, farmhouse_farmhouse_fhc5, farmhouse_farmhouse_fhlc, farmhouse_farmhouse_fhns20, farmhouse_farmhouse_fhns3, farmhouse_farmhouse_fhmec, farmhouse_farmhouse_fha, farmhouse_farmhouse_fhch, farmhouse_farmhouse_fhdoc, farmhouse_farmhouse_fhtns, farmhouse_farmhouse_fhdr8, farmhouse_farmhouse_fhdr6, farmhouse_farmhouse_fh6dr60, farmhouse_farmhouse_fhkb [EXTRACTED 1.00]
- **Farmhouse Mirror Options** — farmhouse_farmhouse_fhmrd, farmhouse_farmhouse_fhmr41, farmhouse_farmhouse_fhmr40, farmhouse_farmhouse_fhmr30, farmhouse_farmhouse_fhmra30_5, farmhouse_farmhouse_fhmra40_5 [EXTRACTED 1.00]

## Communities (56 total, 39 thin omitted)

### Community 0 - "AI Configuration"
Cohesion: 0.07
Nodes (37): AiRuntimeConfig, getAiRuntimeConfig(), redactSecrets(), Window, MockAiAdapter, result(), image, Confidence (+29 more)

### Community 1 - "Domain Model"
Cohesion: 0.08
Nodes (27): Asset, Color, Dimensions, Door, Furniture, Id, MeasuredPhoto, Meters (+19 more)

### Community 2 - "Package Dependencies"
Cohesion: 0.06
Nodes (35): jsdom, dependencies, react, react-dom, three, typescript, vite, @vitejs/plugin-react (+27 more)

### Community 3 - "Furniture Operations"
Cohesion: 0.13
Nodes (30): createFurniture(), diagnoseFurniture(), FurnitureDiagnostic, moveFurniture(), overlap(), resizeFurniture(), rotateFurniture(), addDoor() (+22 more)

### Community 4 - "Application Shell"
Cohesion: 0.20
Nodes (17): removePaletteEntry(), RoomIssue, validateRoom(), App(), ensureMaterialForEntry(), initial, materialIdForEntry(), PhotoCalibrationOverlay() (+9 more)

### Community 5 - "Editor Adapter"
Cohesion: 0.13
Nodes (9): ProjectSnapshot, EditorAdapter, createThreeRendererAdapter(), findMaterial(), projectToScene(), SceneNode, ThreeRendererAdapter, ProjectRepository (+1 more)

### Community 6 - "Materials and Color"
Cohesion: 0.16
Nodes (19): Material, PaletteEntry, Room, averagePixels(), CanvasContext, clampChannel(), drawToCanvas(), extractAverageColor() (+11 more)

### Community 7 - "TypeScript Configuration"
Cohesion: 0.10
Nodes (20): DOM, DOM.Iterable, ES2022, src, compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop (+12 more)

### Community 8 - "Project Memory"
Cohesion: 0.24
Nodes (10): Feature: Project memory status check, createLocalRepository(), configure(), NoteDetail, notePaths(), PMState, resetForTests(), status() (+2 more)

### Community 9 - "Build Configuration"
Cohesion: 0.18
Nodes (10): node, vite.config.ts, compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck (+2 more)

### Community 10 - "Reference Photos"
Cohesion: 0.25
Nodes (8): Photo: Raised Dog Bed in Corner, Photo: Tower Humidifier, Photo: Bedroom Overview with Bed and Ottoman, Combined Product Reference Image, EXD-01 Raised Dog Bed, EXH-01 Tower Humidifier, EXO-01 Storage Ottoman, E. King Bed

### Community 11 - "Farmhouse Catalog Assets"
Cohesion: 0.40
Nodes (5): Farmhouse Collection Catalog Sheet, Farmhouse Grand Chest, Farmhouse King Bed, Farmhouse Nightstand (Large), Farmhouse Bedroom Set Photo

### Community 12 - "OpenCode Configuration"
Cohesion: 0.40
Nodes (4): plugin, $schema, .opencode/plugins/graphify.js, superpowers@git+https://github.com/obra/superpowers.git

### Community 14 - "Room Editor UX"
Cohesion: 0.67
Nodes (3): Measured Room Editor Spec, UI Accessibility Tree Snapshot, 2D Room Plan Diagram

### Community 15 - "Storage Furniture Photos"
Cohesion: 0.67
Nodes (3): Photo: Chests and Armoire against wall, B. Armoire, A. Left Chest

## Knowledge Gaps
- **134 isolated node(s):** `$schema`, `.opencode/plugins/graphify.js`, `superpowers@git+https://github.com/obra/superpowers.git`, `name`, `private` (+129 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **39 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ProjectSnapshot` connect `Editor Adapter` to `Project Memory`, `Domain Model`, `Application Shell`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `Id` connect `Domain Model` to `AI Configuration`, `Furniture Operations`, `Application Shell`, `Editor Adapter`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `meters()` connect `Furniture Operations` to `AI Configuration`, `Application Shell`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `$schema`, `.opencode/plugins/graphify.js`, `superpowers@git+https://github.com/obra/superpowers.git` to the rest of the system?**
  _134 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AI Configuration` be split into smaller, more focused modules?**
  _Cohesion score 0.06634615384615385 - nodes in this community are weakly interconnected._
- **Should `Domain Model` be split into smaller, more focused modules?**
  _Cohesion score 0.08097165991902834 - nodes in this community are weakly interconnected._
- **Should `Package Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05555555555555555 - nodes in this community are weakly interconnected._