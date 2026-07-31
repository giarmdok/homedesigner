import { useEffect, useRef } from 'react';
import { createNoopEditorAdapter } from '../editor-adapter';
import type { ProjectSnapshot } from '../domain/model';
import './app.css';
const snapshot = { schemaVersion: 1, id: 'master-bedroom-foundation' as ProjectSnapshot['id'], name: 'Master Bedroom', unit: 'm', rooms: [], assets: [], materials: [] } as ProjectSnapshot;
export function App() { const canvas = useRef<HTMLDivElement>(null); useEffect(() => { const adapter = createNoopEditorAdapter(); if (canvas.current) adapter.mount(canvas.current); adapter.render(snapshot); return () => adapter.dispose(); }, []); return <main><header><span className="eyebrow">HOME DESIGNER</span><h1>Master Bedroom</h1><p>Room designer foundation</p></header><section className="workspace"><div ref={canvas} className="editor-placeholder"><strong>Editor surface</strong><span>Ready for room geometry</span></div><aside><h2>Foundation</h2><p>Canonical metric model initialized.</p><dl><dt>Schema</dt><dd>v{snapshot.schemaVersion}</dd><dt>Units</dt><dd>{snapshot.unit}</dd><dt>Mode</dt><dd>PC browser</dd></dl></aside></section></main>; }
