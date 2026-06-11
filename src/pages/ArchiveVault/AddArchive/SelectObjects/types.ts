export type ArchivalCondition =
  | { type: 'AND' | 'OR' }
  | { type: 'CUSTOM'; expression: string }
  | { type: 'SOQL'; soqlQuery: string };

export interface BuiltChildNode {
  id: string;
  name: string;
  fieldApiName?: string;
  type: 'STANDARD';
  condition: { type: 'AND' };
  field: never[];
  children?: BuiltChildNode[];
}
