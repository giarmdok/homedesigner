import { Project, SCHEMA_VERSION } from './model';
export type ValidationError = { path: string; message: string };
const finite = (value: unknown) => typeof value === 'number' && Number.isFinite(value);
export function validateProject(project: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!project || typeof project !== 'object') return [{ path: '', message: 'Project must be an object' }];
  const p = project as Partial<Project>;
  if (p.schemaVersion !== SCHEMA_VERSION) errors.push({ path: 'schemaVersion', message: `Expected schema version ${SCHEMA_VERSION}` });
  if (typeof p.id !== 'string' || p.id.trim() === '') errors.push({ path: 'id', message: 'ID must be a non-empty stable string' });
  if (p.unit !== 'm') errors.push({ path: 'unit', message: 'Unit metadata must be meters (m)' });
  const visit = (value: unknown, path: string) => {
    if (typeof value === 'number' && !finite(value)) errors.push({ path, message: 'Dimension must be finite' });
    if (typeof value === 'number' && /(width|depth|height|thickness|length|offset|sillHeight)/i.test(path) && value <= 0) errors.push({ path, message: 'Length must be positive' });
    if (Array.isArray(value)) value.forEach((v, i) => visit(v, `${path}[${i}]`));
    else if (value && typeof value === 'object') Object.entries(value).forEach(([k, v]) => visit(v, path ? `${path}.${k}` : k));
  };
  visit(project, '');
  return errors;
}
export function isValidProject(project: unknown): project is Project { return validateProject(project).length === 0; }
