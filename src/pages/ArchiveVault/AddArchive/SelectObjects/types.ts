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

export type FieldDataType = 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'id' | 'picklist';

export type FilterCondition = {
  id: string;
  field: string;
  dataType: FieldDataType | null;
  operator: string;
  value: string;
  picklistValues?: { value: string; label: string }[];
};

export type ScheduleConfig = {
  timeZone: string;
  type: string;
  scheduling: {
    frequency: string;
    interval: number;
    weekDays?: string[];
    monthDate?: number;
    selectedMonths?: string[];
    startDate?: string;
    endDate?: string;
    startTime?: string;
  };
};
