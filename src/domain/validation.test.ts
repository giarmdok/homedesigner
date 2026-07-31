import { describe, expect, it } from 'vitest';
import { isValidProject, validateProject } from './validation';
const project = { schemaVersion: 1, id: 'project-1', name: 'Demo', unit: 'm', rooms: [], assets: [], materials: [] } as const;
describe('project validation', () => {
  it('accepts a valid renderer-independent project', () => expect(isValidProject(project)).toBe(true));
  it('rejects invalid schema, units, IDs, and dimensions', () => {
    const errors = validateProject({...project, id: '', schemaVersion: 2, unit: 'cm', rooms: [{ dimensions: { width: -1, depth: 2, height: 3, unit: 'm' } }]});
    expect(errors.map(e => e.path)).toEqual(expect.arrayContaining(['id', 'schemaVersion', 'unit', 'rooms[0].dimensions.width']));
  });
  it('rejects non-finite dimensions', () => expect(validateProject({...project, rooms: [{ dimensions: { width: Infinity } }]}).some(e => e.message.includes('finite'))).toBe(true));
});
