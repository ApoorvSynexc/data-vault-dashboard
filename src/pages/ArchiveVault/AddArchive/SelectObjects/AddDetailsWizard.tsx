import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useArchivalService } from '../../../../services/archival/archival.service';
import { useCrmMetadataService } from '../../../../services/crm-metadata/crm-metadata.service';
import { ChildRows, MAX_CHILD_DEPTH } from './ChildRows';
import type { ArchivalCondition, BuiltChildNode, FilterCondition, ScheduleConfig } from './types';
import { TIMEZONES, getDefaultTimezone } from '../../../../utils/timezones';
import dayjs from 'dayjs';

// ─── types ────────────────────────────────────────────────────────────────────

type FrequencyType = 'One Time' | 'Hourly' | 'Daily' | 'Weekly' | 'Monthly' | 'Custom';
type FieldDataType = 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'id' | 'picklist';
type FilterOperator = '>' | '<' | '>=' | '<=' | '=' | '!=' | 'IN' | 'LIKE';

export interface ObjectConfig {
  conditions: FilterCondition[];
  matchMode: ArchivalCondition;
  soqlQuery?: string;
  builtChildren: BuiltChildNode[];
  schedule?: ScheduleConfig;
}

interface AddDetailsWizardProps {
  objectId: string;
  objectName: string;
  objectLabel?: string;
  recordCount?: number;
  crmId?: string | null;
  isParent?: boolean;
  initialConfig?: ObjectConfig;
  onSave: (config: ObjectConfig) => void;
  onClose: () => void;
  allowedObjectNames?: Set<string>;
  selectedObjectApiNames?: Set<string>;
  onMasterDetailWarning?: (childObject: string, parentObject: string, parentLabel: string) => void;
}

// ─── constants ────────────────────────────────────────────────────────────────

const OP_LABELS: Record<FilterOperator, string> = {
  '=': 'equals', '!=': 'not equals', '>': 'greater than', '<': 'less than',
  '>=': 'greater than or equal', '<=': 'less than or equal', 'IN': 'in', 'LIKE': 'contains',
};

const OPERATORS_BY_TYPE: Record<FieldDataType, FilterOperator[]> = {
  string:   ['=', '!=', 'LIKE', 'IN'],
  number:   ['=', '!=', '>', '<', '>=', '<='],
  boolean:  ['=', '!='],
  date:     ['=', '!=', '>', '<', '>=', '<='],
  datetime: ['=', '!=', '>', '<', '>=', '<='],
  id:       ['=', '!=', 'IN'],
  picklist: ['=', '!='],
};

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ALL_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_MAP: Record<string, string> = { Mon: 'MON', Tue: 'TUE', Wed: 'WED', Thu: 'THU', Fri: 'FRI', Sat: 'SAT', Sun: 'SUN' };
const MONTH_MAP: Record<string, string> = { Jan: 'JAN', Feb: 'FEB', Mar: 'MAR', Apr: 'APR', May: 'MAY', Jun: 'JUN', Jul: 'JUL', Aug: 'AUG', Sep: 'SEP', Oct: 'OCT', Nov: 'NOV', Dec: 'DEC' };
const DAY_REVERSE: Record<string, string> = Object.fromEntries(Object.entries(DAY_MAP).map(([k, v]) => [v, k]));
const MONTH_REVERSE: Record<string, string> = Object.fromEntries(Object.entries(MONTH_MAP).map(([k, v]) => [v, k]));
const FREQ_REVERSE: Record<string, FrequencyType> = { ONCE: 'One Time', HOURLY: 'Hourly', DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly', CUSTOM: 'Custom' };

// ─── schedule initialiser ─────────────────────────────────────────────────────

function initSchedule(s?: ScheduleConfig) {
  const sc = s?.scheduling;
  return {
    overrideEnabled: !!s,
    frequency: (sc ? FREQ_REVERSE[sc.frequency] : undefined) ?? ('Daily' as FrequencyType),
    timeZone: s?.timeZone ?? getDefaultTimezone().value,
    startDate: sc?.startDate ?? dayjs().format('YYYY-MM-DD'),
    endDate: sc?.endDate ?? dayjs().add(7, 'days').format('YYYY-MM-DD'),
    startTime: sc?.startTime ?? '12:00',
    selectedDays: sc?.weekDays?.map((d) => DAY_REVERSE[d] ?? d) ?? ['Mon'],
    selectedMonths: sc?.selectedMonths?.map((m) => MONTH_REVERSE[m] ?? m) ?? ['Jan'],
    dayOfMonth: sc?.monthDate !== undefined ? String(sc.monthDate).padStart(2, '0') : '01',
    backupIn: sc?.interval !== undefined ? `${sc.interval} Hour${sc.interval !== 1 ? 's' : ''}` : '1 Hour',
  };
}

// ─── stepper ──────────────────────────────────────────────────────────────────

const STEPS = ['Add Filter', 'Add Childs', 'Add Schedule'] as const;

function Stepper({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className='flex items-center justify-center gap-0 px-6 py-4' style={{ borderBottom: '1px solid #F1F5F9' }}>
      {STEPS.map((label, idx) => {
        const step = (idx + 1) as 1 | 2 | 3;
        const done = step < current;
        const active = step === current;
        const color = active ? '#155DFC' : done ? '#22C55E' : '#CBD5E1';
        return (
          <React.Fragment key={label}>
            <div className='flex flex-col items-center gap-1.5'>
              <div className='flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-colors'
                style={{ background: active ? '#155DFC' : done ? '#DCFCE7' : '#F1F5F9', color: active ? 'white' : done ? '#16A34A' : '#94A3B8', border: `2px solid ${color}` }}>
                {done
                  ? <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='3' strokeLinecap='round' strokeLinejoin='round'><polyline points='20 6 9 17 4 12' /></svg>
                  : step}
              </div>
              <span className='text-xs font-medium whitespace-nowrap' style={{ color: active ? '#155DFC' : done ? '#16A34A' : '#94A3B8' }}>
                {label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className='flex-1 h-0.5 mx-3 mb-5 rounded-full' style={{ minWidth: 40, background: done ? '#86EFAC' : '#E2E8F0' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── custom field dropdown (stays inside modal bounds) ───────────────────────

function FieldDropdown({ value, options, onChange }: {
  value: string;
  options: { apiName: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const selected = options.find((o) => o.apiName === value);
  const DROPDOWN_HEIGHT = 220;
  const DROPDOWN_WIDTH = 220;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpen = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const goUp = spaceBelow < DROPDOWN_HEIGHT + 8;
      setDropdownStyle({
        position: 'fixed',
        left: rect.left,
        width: DROPDOWN_WIDTH,
        maxHeight: DROPDOWN_HEIGHT,
        zIndex: 9999,
        ...(goUp
          ? { bottom: window.innerHeight - rect.top + 4 }
          : { top: rect.bottom + 4 }),
      });
    }
    setOpen((v) => !v);
  };

  return (
    <div ref={ref} className='relative w-full'>
      <button
        ref={buttonRef}
        type='button'
        onClick={handleOpen}
        className='w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500/20'
        style={{ border: '1px solid #E2E8F0', color: selected ? '#33363F' : '#94a3b8' }}
      >
        <span className='truncate'>{selected?.label || 'Field Name'}</span>
        <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round' className='flex-shrink-0 ml-1'>
          <polyline points='6 9 12 15 18 9' />
        </svg>
      </button>
      {open && (
        <div
          className='bg-white rounded-lg shadow-lg overflow-y-auto'
          style={{
            border: '1px solid #E2E8F0',
            ...dropdownStyle,
          }}
        >
          <div
            className='px-3 py-2 text-sm cursor-pointer hover:bg-gray-50'
            style={{ color: '#94a3b8' }}
            onClick={() => { onChange(''); setOpen(false); }}
          >
            Field Name
          </div>
          {options.map((o) => (
            <div
              key={o.apiName}
              onClick={() => { onChange(o.apiName); setOpen(false); }}
              className='px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 truncate'
              style={{ color: o.apiName === value ? '#155DFC' : '#33363F', background: o.apiName === value ? 'rgba(21,93,252,0.06)' : undefined }}
            >
              {o.label || o.apiName}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── main wizard component ────────────────────────────────────────────────────

export default function AddDetailsWizard({
  objectId, objectName, objectLabel, recordCount, crmId,
  isParent = true, initialConfig, onSave, onClose, allowedObjectNames, selectedObjectApiNames, onMasterDetailWarning,
}: AddDetailsWizardProps) {
  const archivalService = useArchivalService();
  const crmMetadataService = useCrmMetadataService();

  // ── MD warning toast (auto-dismisses after 5s) ────────────────────────────
  const [mdToast, setMdToast] = useState<{ child: string; parentField: string; parentLabel: string } | null>(null);

  const wrappedMdWarning = useCallback((child: string, parent: string, label: string) => {
    onMasterDetailWarning?.(child, parent, label);
    if (selectedObjectApiNames?.has(parent)) return;
    setMdToast({ child, parentField: parent, parentLabel: label });
  }, [onMasterDetailWarning, selectedObjectApiNames]);

  // ── wizard step ────────────────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // ── step 1: filter ─────────────────────────────────────────────────────────
  const [filterTab, setFilterTab] = useState<'Field Level' | 'SOQL'>(
    initialConfig?.soqlQuery ? 'SOQL' : 'Field Level'
  );
  const [matchModeVal, setMatchModeVal] = useState<'ALL conditions' | 'ANY condition' | 'Custom'>(() => {
    const m = initialConfig?.matchMode;
    if (!m) return 'ALL conditions';
    if (m.type === 'OR') return 'ANY condition';
    if (m.type === 'CUSTOM') return 'Custom';
    return 'ALL conditions';
  });
  const [conditions, setConditions] = useState<FilterCondition[]>(() =>
    initialConfig?.conditions?.length ? initialConfig.conditions
      : [{ id: crypto.randomUUID(), field: '', dataType: null, operator: '=', value: '' }]
  );
  const [customLogic, setCustomLogic] = useState(() => {
    const m = initialConfig?.matchMode;
    return m?.type === 'CUSTOM' ? (m as any).expression : '1 AND 2';
  });
  const [customLogicTouched, setCustomLogicTouched] = useState(false);
  const [soqlUserClause, setSoqlUserClause] = useState(initialConfig?.soqlQuery ?? '');
  const [soqlValidated, setSoqlValidated] = useState(!!initialConfig?.soqlQuery);
  const [validateStatus, setValidateStatus] = useState<'idle' | 'loading' | 'valid' | 'invalid'>(
    initialConfig?.soqlQuery ? 'valid' : 'idle'
  );
  const [validateMessage, setValidateMessage] = useState(initialConfig?.soqlQuery ? 'Query validated successfully.' : '');
  const [relationshipDepth, setRelationshipDepth] = useState<number | null>(null);
  const [step1Error, setStep1Error] = useState<string | null>(null);

  const soqlPrefix = `SELECT FIELDS(ALL) FROM ${objectName} WHERE `;

  const { data: fieldsData, isLoading: isLoadingFields } = useQuery({
    queryKey: ['archival-fields', objectName],
    queryFn: async () => {
      const result = await crmMetadataService.getObjectFields(objectName, true);
      const payload = (result as any)?.data ?? result;
      return Array.isArray(payload) ? payload : [];
    },
    enabled: !!objectName,
  });
  const fields: any[] = Array.isArray(fieldsData) ? fieldsData : [];

  // Re-hydrate restored conditions when fields load: fix null dataType and populate
  // picklist values from the inline picklistValues already in the fields response.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!fields.length || hydratedRef.current) return;
    hydratedRef.current = true;
    setConditions((prev) => prev.map((cond) => {
      if (!cond.field) return cond;
      const matched = fields.find((f: any) => f.name === cond.field);
      if (!matched) return cond;
      const rawType = (matched.type as string | undefined)?.toLowerCase();
      const dataType: FieldDataType = rawType && rawType in OPERATORS_BY_TYPE ? (rawType as FieldDataType) : 'string';
      const picklistValues = dataType === 'picklist'
        ? (matched.picklistValues ?? []).filter((pv: any) => pv.active !== false).map((pv: any) => ({ value: pv.value, label: pv.label }))
        : cond.picklistValues;
      return { ...cond, dataType, picklistValues };
    }));
  }, [fields]);

  const validateMutation = useMutation({
    mutationFn: ({ soqlClause }: { soqlClause: string }) =>
      archivalService.validateSoql({
        object: { name: objectName, condition: { type: 'SOQL', soqlQuery: soqlClause.trim() }, field: [] },
        isParent,
        crmId: crmId ?? '',
      }),
    onSuccess: (data: any) => {
      const payload = data?.data ?? data;
      const ok = payload?.isValid !== false;
      // Always reset child selections on every validate so the children table
      // refreshes and restores saved state against the new depth constraint.
      setSelectedChildObjects(new Set());
      setIncludeChild({});
      restoredUuidsRef.current.clear();
      setResetTick((t) => t + 1);

      if (ok) {
        setValidateStatus('valid');
        setValidateMessage('Query validated successfully.');
        setSoqlValidated(true);
        const newDepth = typeof payload?.relationshipDepth === 'number' ? payload.relationshipDepth : null;
        setRelationshipDepth(newDepth);
      } else {
        const msg = payload?.error ?? payload?.message ?? 'Invalid SOQL query.';
        setValidateStatus('invalid');
        setValidateMessage(msg);
        setSoqlValidated(false);
        setRelationshipDepth(null);
      }
    },
    onError: (err: any) => {
      setValidateStatus('invalid');
      setValidateMessage(err?.response?.data?.message ?? err?.message ?? 'Invalid SOQL query.');
      setSoqlValidated(false);
    },
  });

  const addCondition = () =>
    setConditions((prev) => [...prev, { id: crypto.randomUUID(), field: '', dataType: null, operator: '=', value: '' }]);

  const removeCondition = (id: string) =>
    setConditions((prev) => prev.filter((c) => c.id !== id));

  const updateCondition = (id: string, patch: Partial<FilterCondition>) =>
    setConditions((prev) => prev.map((c) => c.id === id ? { ...c, ...patch } : c));

  const handleFieldChange = (id: string, apiName: string) => {
    const matched = fields.find((f: any) => f.name === apiName);
    const rawType = (matched?.type as string | undefined)?.toLowerCase();
    const dataType: FieldDataType = rawType && rawType in OPERATORS_BY_TYPE ? (rawType as FieldDataType) : 'string';
    const operator = OPERATORS_BY_TYPE[dataType][0];
    const picklistValues = dataType === 'picklist'
      ? (matched?.picklistValues ?? []).filter((pv: any) => pv.active !== false).map((pv: any) => ({ value: pv.value, label: pv.label }))
      : [];
    updateCondition(id, { field: apiName, dataType, operator, value: '', picklistValues });
  };

  const getConditionLabel = (idx: number) => {
    if (idx === 0) return 'WHERE';
    if (matchModeVal === 'ALL conditions') return 'AND';
    if (matchModeVal === 'ANY condition') return 'OR';
    const before = new RegExp(`(?:^|[\\s(])(AND|OR)\\s+${idx + 1}(?:[\\s)]|$)`, 'i');
    const match = before.exec(customLogic);
    return match ? match[1].toUpperCase() : 'AND';
  };

  const validateCustomLogic = (expr: string, count: number): string | null => {
    const t = expr.trim();
    if (!t) return 'Expression cannot be empty.';
    if (/[^0-9\sAaNnDdOoRr()]/i.test(t)) return 'Only numbers, AND, OR, NOT and parentheses are allowed.';
    const nums = t.match(/\d+/g)?.map(Number) ?? [];
    if (nums.length === 0) return 'Expression must reference at least one condition number.';
    const bad = nums.find((n) => n < 1 || n > count);
    if (bad) return `Condition ${bad} doesn't exist (you have ${count}).`;
    const missing = Array.from({ length: count }, (_, i) => i + 1).filter((n) => !nums.includes(n));
    if (missing.length > 0) return `Condition${missing.length > 1 ? 's' : ''} ${missing.join(', ')} ${missing.length > 1 ? 'are' : 'is'} not referenced in the expression.`;
    let depth = 0;
    for (const ch of t) {
      if (ch === '(') depth++;
      else if (ch === ')') { depth--; if (depth < 0) return 'Unmatched closing parenthesis ).'; }
    }
    if (depth !== 0) return 'Unmatched opening parenthesis (.';
    if (/^(AND|OR)\b/i.test(t)) return 'Expression cannot start with AND or OR.';
    if (/\b(AND|OR)$/i.test(t)) return 'Expression cannot end with AND or OR.';
    if (/\b(AND|OR)\s+(AND|OR)\b/i.test(t)) return 'Two consecutive operators not allowed.';
    return null;
  };

  const customLogicError = matchModeVal === 'Custom' ? validateCustomLogic(customLogic, conditions.length) : null;

  const canProceedFromStep1 =
    filterTab === 'SOQL'
      ? soqlUserClause.trim().length > 0 && soqlValidated
      : conditions.some((c) => c.field) &&
        conditions.every((c) => c.field.trim() !== '' && c.value.trim() !== '') &&
        !customLogicError;

  // ── step 2: children ───────────────────────────────────────────────────────
  const [childLoadingCount, setChildLoadingCount] = useState(0);
  const handleChildLoadingChange = useCallback((loading: boolean) => {
    setChildLoadingCount((n) => Math.max(0, n + (loading ? 1 : -1)));
  }, []);

  const [selectedChildObjects, setSelectedChildObjects] = useState<Set<string>>(new Set());
  const [childApiNames, setChildApiNames] = useState<Record<string, string>>({});
  const [childFieldApiNames, setChildFieldApiNames] = useState<Record<string, string>>({});
  const [childParents, setChildParents] = useState<Record<string, string>>({});
  const [includeChild, setIncludeChild] = useState<Record<string, boolean>>({});
  const [resetTick, setResetTick] = useState(0);

  // Restore child selections after ChildRows registers fresh UUIDs.
  // Runs on every childApiNames/childParents change so deeper tiers (which only
  // mount after their parent's includeChild is set) also get restored incrementally.
  // restoredUuidsRef tracks already-processed UUIDs to avoid double-toggling.
  //
  // Key invariant: match by (parentApiName, childApiName) pair — not just childApiName
  // alone — so the same object name appearing under different parents doesn't get
  // incorrectly selected.
  const restoredUuidsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const saved = initialConfig?.builtChildren ?? [];
    if (saved.length === 0 || Object.keys(childApiNames).length === 0) return;

    // Build a set of "parentApiName|childApiName" keys from the saved tree.
    // Root-level children use objectName as their parent key.
    // Also track which child API names had includeChild on (had nested children).
    const savedPairs = new Set<string>();
    const savedPairsWithChildren = new Set<string>();
    const collectPairs = (nodes: BuiltChildNode[], parentApiName: string) => {
      nodes.forEach((n) => {
        const pair = `${parentApiName}|${n.name}`;
        savedPairs.add(pair);
        if (n.children?.length) {
          savedPairsWithChildren.add(pair);
          collectPairs(n.children, n.name);
        }
      });
    };
    collectPairs(saved, objectName);

    // Find newly registered UUIDs not yet restored, matched by (parent, child) pair
    const newToSelect: string[] = [];
    const newWithIncludeChild: string[] = [];
    Object.entries(childApiNames).forEach(([uuid, apiName]) => {
      if (restoredUuidsRef.current.has(uuid)) return;
      const parentUuid = childParents[uuid];
      if (!parentUuid) return;
      // Resolve parent's API name: if parent is the root object, use objectName
      const parentApiName = parentUuid === objectId ? objectName : (childApiNames[parentUuid] ?? '');
      if (!parentApiName) return;
      const pair = `${parentApiName}|${apiName}`;
      if (savedPairs.has(pair)) {
        newToSelect.push(uuid);
        restoredUuidsRef.current.add(uuid);
        if (savedPairsWithChildren.has(pair)) newWithIncludeChild.push(uuid);
      }
    });

    if (newToSelect.length === 0) return;

    setSelectedChildObjects((prev) => {
      const next = new Set(prev);
      newToSelect.forEach((uuid) => next.add(uuid));
      return next;
    });
    if (newWithIncludeChild.length > 0) {
      setIncludeChild((prev) => {
        const next = { ...prev };
        newWithIncludeChild.forEach((uuid) => { next[uuid] = true; });
        return next;
      });
    }
  }, [childApiNames, childParents, initialConfig]);

  const toggleChildObject = useCallback((key: string) => {
    setSelectedChildObjects((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const registerChildApiName = useCallback((uuid: string, apiName: string) => {
    setChildApiNames((prev) => prev[uuid] === apiName ? prev : { ...prev, [uuid]: apiName });
  }, []);

  const registerChildFieldApiName = useCallback((uuid: string, fieldApiName: string) => {
    setChildFieldApiNames((prev) => prev[uuid] === fieldApiName ? prev : { ...prev, [uuid]: fieldApiName });
  }, []);

  const registerChildParent = useCallback((childUuid: string, parentUuid: string) => {
    setChildParents((prev) => prev[childUuid] === parentUuid ? prev : { ...prev, [childUuid]: parentUuid });
  }, []);

  // Recursively builds the nested children array for the archival payload.
  // Only includes children that are checked (in selectedChildObjects) AND
  // whose registered parent matches the given parentUuid.
  //
  // visited guards against circular references (e.g. A → B → A).
  // seenNames deduplicates siblings with the same API name, which can happen
  // when the same child object is registered under multiple parent contexts.
  const buildChildTree = (parentUuid: string, visited = new Set<string>()): BuiltChildNode[] => {
    if (visited.has(parentUuid)) return [];
    visited.add(parentUuid);
    const seenNames = new Set<string>();
    return Array.from(selectedChildObjects)
      .filter((uuid) => childParents[uuid] === parentUuid)
      .filter((uuid) => {
        const name = childApiNames[uuid] ?? uuid;
        if (seenNames.has(name)) return false;
        seenNames.add(name);
        return true;
      })
      .map((uuid) => {
        const nested = buildChildTree(uuid, visited);
        return {
          id: uuid,
          name: childApiNames[uuid] ?? uuid,
          fieldApiName: childFieldApiNames[uuid],
          type: 'STANDARD' as const,
          condition: { type: 'AND' as const },
          field: [] as never[],
          ...(nested.length > 0 ? { children: nested } : {}),
        };
      });
  };

  // ── step 3: schedule ───────────────────────────────────────────────────────
  const schedInit = initSchedule(initialConfig?.schedule);
  const [overrideEnabled, setOverrideEnabled] = useState(schedInit.overrideEnabled);
  const [frequency, setFrequency] = useState<FrequencyType>(schedInit.frequency);
  const [runMode, setRunMode] = useState<'runNow' | 'scheduleRun'>('runNow');
  const [selectedDays, setSelectedDays] = useState<string[]>(schedInit.selectedDays);
  const [selectedMonths, setSelectedMonths] = useState<string[]>(schedInit.selectedMonths);
  const [dayOfMonth, setDayOfMonth] = useState(schedInit.dayOfMonth);
  const [startTime, setStartTime] = useState(schedInit.startTime);
  const [timeZone, setTimeZone] = useState(schedInit.timeZone);
  const [startDate, setStartDate] = useState(schedInit.startDate);
  const [endDate, setEndDate] = useState(schedInit.endDate);
  const [backupIn, setBackupIn] = useState(schedInit.backupIn);
  const [backupFrequency, setBackupFrequency] = useState('Daily');

  const computeScheduleConfig = (): ScheduleConfig => {
    const scheduling: any = {
      frequency: frequency === 'One Time' ? 'ONCE' : frequency.toUpperCase(),
      interval: 1,
    };
    if (frequency === 'One Time') {
      if (runMode === 'scheduleRun') { scheduling.startDate = startDate; scheduling.startTime = startTime; }
    } else if (frequency === 'Hourly') {
      scheduling.interval = parseInt(backupIn.split(' ')[0]) || 1;
      scheduling.startDate = startDate; scheduling.startTime = startTime;
    } else if (frequency === 'Daily') {
      scheduling.startDate = startDate; scheduling.startTime = startTime;
    } else if (frequency === 'Weekly') {
      scheduling.weekDays = selectedDays.map((d) => DAY_MAP[d] || d);
      scheduling.startDate = startDate; scheduling.startTime = startTime;
    } else if (frequency === 'Monthly') {
      scheduling.monthDate = parseInt(dayOfMonth);
      scheduling.selectedMonths = selectedMonths.map((m) => MONTH_MAP[m] || m);
      scheduling.startDate = startDate; scheduling.startTime = startTime;
    } else if (frequency === 'Custom') {
      scheduling.startDate = startDate; scheduling.endDate = endDate; scheduling.startTime = startTime;
    }
    return { timeZone, type: frequency === 'One Time' ? 'ONE_TIME' : 'INCREMENTAL', scheduling };
  };

  // ── navigation ─────────────────────────────────────────────────────────────
  const handleNextStep1 = () => {
    if (!canProceedFromStep1) {
      setStep1Error(
        filterTab === 'SOQL'
          ? 'Please enter and validate a SOQL query before proceeding.'
          : customLogicError
          ? customLogicError
          : conditions.some((c) => !c.field.trim())
          ? 'All condition rows must have a Field Name selected. Remove any empty rows before proceeding.'
          : conditions.some((c) => c.field && !c.value.trim())
          ? 'All conditions must have a value filled in before proceeding.'
          : 'Please add at least one filter condition before proceeding.'
      );
      return;
    }
    setStep1Error(null);
    setStep(2);
  };

  const handleSave = () => {
    let matchMode: ArchivalCondition;
    if (filterTab === 'SOQL') {
      matchMode = { type: 'SOQL', soqlQuery: soqlUserClause.trim() };
    } else if (matchModeVal === 'ANY condition') {
      matchMode = { type: 'OR' };
    } else if (matchModeVal === 'Custom') {
      matchMode = { type: 'CUSTOM', expression: customLogic };
    } else {
      matchMode = { type: 'AND' };
    }

    onSave({
      conditions: filterTab === 'SOQL' ? [] : conditions,
      matchMode,
      soqlQuery: filterTab === 'SOQL' ? soqlUserClause.trim() : undefined,
      builtChildren: buildChildTree(objectId),
      schedule: overrideEnabled ? computeScheduleConfig() : undefined,
    });
  };

  // ── shared input style ─────────────────────────────────────────────────────
  const inputCls = 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm';

  // ── render ─────────────────────────────────────────────────────────────────
  const displayName = objectLabel ?? objectName;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/30'>
      <div
        className='bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden'
        style={{ width: 920, maxHeight: '92vh', border: '1px solid #E2E8F0' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── modal header ── */}
        <div className='flex items-center justify-between px-6 pt-5 pb-3 flex-shrink-0'>
          <div>
            <h2 className='text-base font-bold text-gray-900'>{displayName}</h2>
            <p className='text-xs text-gray-400 mt-0.5'>Configure filters, child relationships, and schedule for this object</p>
          </div>
          <button onClick={onClose}
            className='p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors'>
            <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
              <line x1='18' y1='6' x2='6' y2='18' /><line x1='6' y1='6' x2='18' y2='18' />
            </svg>
          </button>
        </div>

        {/* ── MD warning toast ── */}
        {mdToast && (
          <div className='mx-6 mb-2 flex items-start gap-2 px-4 py-2.5 rounded-lg text-sm'
            style={{ background: 'rgba(245,158,11,0.08)', color: '#b45309', border: '1px solid rgba(245,158,11,0.3)' }}>
            <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='flex-shrink-0 mt-0.5'>
              <path d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'/><line x1='12' y1='9' x2='12' y2='13'/><line x1='12' y1='17' x2='12.01' y2='17'/>
            </svg>
            <span>
              <strong>{mdToast.child}</strong> is in a MasterDetail relationship with <strong>{mdToast.parentLabel}</strong> — please select <strong>{mdToast.parentLabel}</strong> from the objects list.
            </span>
            <button onClick={() => setMdToast(null)} className='ml-auto flex-shrink-0'>
              <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/></svg>
            </button>
          </div>
        )}

        {/* ── stepper ── */}
        <Stepper current={step} />

        {/* ── step content ── */}
        <div className='flex-1 min-h-0 overflow-y-auto'>

          {/* ════ STEP 1: ADD FILTER ════ */}
          {step === 1 && (
            <>
              {/* Filter By tabs */}
              {(() => {
                const hasFilters = conditions.some((c) => c.field);
                const hasSoql = soqlUserClause.trim().length > 0;
                return (
                  <div className='flex items-center justify-between px-6 py-3 border-b border-gray-100'>
                    <div className='flex items-center gap-3'>
                      <span className='text-sm text-gray-500'>Filter By</span>
                      <div className='flex rounded-lg overflow-hidden' style={{ border: '1px solid #E2E8F0' }}>
                        {(['Field Level', 'SOQL'] as const).map((tab) => {
                          const locked = tab === 'Field Level' ? hasSoql : hasFilters;
                          const active = filterTab === tab;
                          return (
                            <button key={tab}
                              onClick={() => { if (!locked) setFilterTab(tab); }}
                              title={locked ? `Clear ${tab === 'Field Level' ? 'the SOQL query' : 'all field filters'} to switch` : undefined}
                              className={`px-4 py-1.5 text-sm font-medium transition-colors ${active ? 'bg-blue-600 text-white' : locked ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                              {tab}
                            </button>
                          );
                        })}
                      </div>
                      {(hasFilters || hasSoql) && (
                        <span className='text-xs text-amber-600 font-medium'>
                          {hasSoql ? 'SOQL mode active — field filters disabled' : 'Field filter mode active — SOQL disabled'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {filterTab === 'SOQL' ? (
                <div className='px-6 py-4 flex flex-col gap-3'>
                  <p className='text-xs text-gray-400'>Write the WHERE clause condition after the fixed prefix.</p>
                  <div className='relative'>
                    <div className='flex flex-col rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20'
                      style={{ border: `1px solid ${conditions.some((c) => c.field) ? '#FCA5A5' : '#E2E8F0'}`, background: '#FAFBFC', opacity: conditions.some((c) => c.field) ? 0.4 : 1 }}>
                      <div className='px-4 pt-3 pb-1 text-sm font-mono select-none text-blue-700 bg-blue-50 border-b border-blue-100'
                        style={{ userSelect: 'none', pointerEvents: 'none' }}>
                        {soqlPrefix}
                      </div>
                      <textarea
                        value={soqlUserClause}
                        onChange={(e) => { setSoqlUserClause(e.target.value); setSoqlValidated(false); setValidateStatus('idle'); setValidateMessage(''); setRelationshipDepth(null); }}
                        disabled={conditions.some((c) => c.field)}
                        placeholder="e.g. CreatedDate > 2023-01-01T00:00:00Z AND Status = 'Active'"
                        className='w-full resize-none px-4 py-3 text-sm font-mono outline-none bg-transparent text-gray-800 placeholder-gray-400 disabled:cursor-not-allowed'
                        style={{ minHeight: 120 }}
                      />
                    </div>
                  </div>
                  <div className='flex flex-col gap-2'>
                    <div className='flex items-center gap-3'>
                        <button
                          disabled={!soqlUserClause.trim() || validateMutation.isPending}
                          onClick={() => { setValidateStatus('loading'); setValidateMessage(''); setRelationshipDepth(null); validateMutation.mutate({ soqlClause: soqlUserClause }); }}
                          className='flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'>
                          {validateMutation.isPending
                            ? <><span className='h-3.5 w-3.5 rounded-full border-2 border-gray-400 border-t-blue-600 animate-spin' />Validating…</>
                            : 'Validate Query →'}
                        </button>
                      {validateStatus === 'valid' && (
                        <span className='flex items-center gap-1.5 text-xs font-medium text-green-600'>
                          <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='20 6 9 17 4 12' /></svg>
                          {validateMessage}
                        </span>
                      )}
                      {validateStatus === 'invalid' && (
                        <span className='flex items-center gap-1.5 text-xs font-medium text-red-600'>
                          <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><circle cx='12' cy='12' r='10' /><line x1='15' y1='9' x2='9' y2='15' /><line x1='9' y1='9' x2='15' y2='15' /></svg>
                          {validateMessage}
                        </span>
                      )}
                    </div>
                    {validateStatus === 'valid' && relationshipDepth !== null && relationshipDepth > 0 && (
                      <div className='flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs'
                        style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#92400E' }}>
                        <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='flex-shrink-0 mt-0.5' style={{ color: '#D97706' }}>
                          <path d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' />
                          <line x1='12' y1='9' x2='12' y2='13' /><line x1='12' y1='17' x2='12.01' y2='17' />
                        </svg>
                        <span>
                          <span className='font-semibold' style={{ color: '#B45309' }}>Relationship depth used: {relationshipDepth}</span>
                          {' '}— this query traverses object relationships and may affect the child object selection in Step 2.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {/* Match mode tabs */}
                  <div className='flex items-center gap-3 px-6 py-3 border-b border-gray-100'>
                    <span className='text-sm text-gray-500'>Match</span>
                    <div className='flex rounded-lg overflow-hidden' style={{ border: '1px solid #E2E8F0' }}>
                      {(['ALL conditions', 'ANY condition', 'Custom'] as const).map((tab) => (
                        <button key={tab} onClick={() => { setMatchModeVal(tab); setCustomLogicTouched(false); }}
                          className={`px-4 py-1.5 text-sm font-medium transition-colors ${matchModeVal === tab ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                          {tab}
                        </button>
                      ))}
                    </div>
                    {matchModeVal === 'Custom' && (
                      <div className='flex-1 relative'>
                        <input
                          type='text'
                          value={customLogic}
                          onChange={(e) => { setCustomLogic(e.target.value); setCustomLogicTouched(true); }}
                          onBlur={() => setCustomLogicTouched(true)}
                          placeholder='e.g. 1 AND ((2 AND 3) OR 4)'
                          className='w-full px-3 py-1.5 text-sm rounded-lg outline-none focus:ring-2 font-mono'
                          style={{ border: `1px solid ${customLogicTouched && customLogicError ? '#EF4444' : '#E2E8F0'}`, color: '#33363F' }}
                        />
                        {customLogicTouched && (
                          <span className='absolute right-2.5 top-1/2 -translate-y-1/2'>
                            {customLogicError
                              ? <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#EF4444' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><circle cx='12' cy='12' r='10' /><line x1='15' y1='9' x2='9' y2='15' /><line x1='9' y1='9' x2='15' y2='15' /></svg>
                              : <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#22C55E' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='20 6 9 17 4 12' /></svg>}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Conditions list */}
                  <div className='px-6 py-4 flex flex-col gap-3 relative' style={{ minHeight: 180 }}>
                    {conditions.length === 0 ? (
                      <div className='flex items-center gap-2 py-4 text-sm text-gray-400'>
                        <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
                          <polygon points='22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3' />
                        </svg>
                        No filter conditions — all{' '}
                        <span className='font-bold text-gray-800'>{recordCount !== undefined ? recordCount.toLocaleString() : '—'}</span>{' '}
                        {displayName} records will be archived.
                      </div>
                    ) : (
                      conditions.map((cond, idx) => (
                        <div key={cond.id} className='flex items-center gap-2'>
                          <span className='text-xs font-medium text-gray-500 w-5 flex-shrink-0 text-right'>{idx + 1}.</span>
                          <span className='text-xs font-semibold w-12 flex-shrink-0' style={{ color: '#155DFC' }}>{getConditionLabel(idx)}</span>

                          {/* Field */}
                          <div className='flex-1 min-w-0 max-w-[220px]'>
                            {isLoadingFields ? (
                              <div className='w-full px-3 py-2 text-sm rounded-lg flex items-center gap-2 text-gray-400' style={{ border: '1px solid #E2E8F0' }}>
                                <div className='animate-spin w-3 h-3 border border-gray-400 border-t-transparent rounded-full' />Loading fields...
                              </div>
                            ) : (
                              <FieldDropdown
                                value={cond.field}
                                options={fields.map((f: any) => ({ apiName: f.name, label: f.label || f.name }))}
                                onChange={(v) => handleFieldChange(cond.id, v)}
                              />
                            )}
                          </div>

                          {/* Operator */}
                          <div className='relative' style={{ width: 140 }}>
                            <select value={cond.operator} onChange={(e) => updateCondition(cond.id, { operator: e.target.value })}
                              className='w-full appearance-none px-3 py-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 bg-white pr-8'
                              style={{ border: '1px solid #E2E8F0', color: '#33363F' }}>
                              {OPERATORS_BY_TYPE[(cond.dataType?.toLowerCase() as FieldDataType) ?? 'string'].map((op) => (
                                <option key={op} value={op}>{OP_LABELS[op]}</option>
                              ))}
                            </select>
                            <span className='pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400'>
                              <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='6 9 12 15 18 9' /></svg>
                            </span>
                          </div>

                          {/* Value */}
                          {cond.dataType === 'boolean' ? (
                            <div className='relative flex-1'>
                              <select value={cond.value} onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
                                className='w-full appearance-none px-3 py-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 bg-white pr-8'
                                style={{ border: '1px solid #E2E8F0', color: cond.value ? '#33363F' : '#94a3b8' }}>
                                <option value=''>Select</option>
                                <option value='true'>True</option>
                                <option value='false'>False</option>
                              </select>
                              <span className='pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400'>
                                <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='6 9 12 15 18 9' /></svg>
                              </span>
                            </div>
                          ) : cond.dataType === 'picklist' ? (
                            <div className='relative flex-1'>
                              <select value={cond.value} onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
                                className='w-full appearance-none px-3 py-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 bg-white pr-8'
                                style={{ border: '1px solid #E2E8F0', color: cond.value ? '#33363F' : '#94a3b8' }}>
                                <option value=''>Select value</option>
                                {(cond.picklistValues ?? []).map((pv) => <option key={pv.value} value={pv.value}>{pv.label}</option>)}
                              </select>
                              <span className='pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400'>
                                <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='6 9 12 15 18 9' /></svg>
                              </span>
                            </div>
                          ) : (
                            <input
                              type={cond.dataType === 'date' ? 'date' : cond.dataType === 'datetime' ? 'datetime-local' : cond.dataType === 'number' ? 'number' : 'text'}
                              value={cond.value}
                              onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
                              placeholder='Value'
                              className='flex-1 px-3 py-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20'
                              style={{ border: '1px solid #E2E8F0', color: '#33363F' }}
                            />
                          )}

                          <button onClick={() => removeCondition(cond.id)}
                            className='p-1.5 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0'>
                            <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                              <line x1='18' y1='6' x2='6' y2='18' /><line x1='6' y1='6' x2='18' y2='18' />
                            </svg>
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add condition + clear */}
                  <div className='flex items-center px-6 py-3 border-t border-gray-100 gap-3'>
                    <button onClick={addCondition}
                      className='flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:border-blue-300 transition-colors'>
                      <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                        <line x1='12' y1='5' x2='12' y2='19' /><line x1='5' y1='12' x2='19' y2='12' />
                      </svg>
                      Add Condition
                    </button>
                    {conditions.length > 0 && (
                      <button onClick={() => setConditions([])}
                        className='flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-300 transition-colors'>
                        <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                          <line x1='18' y1='6' x2='6' y2='18' /><line x1='6' y1='6' x2='18' y2='18' />
                        </svg>
                        Clear All
                      </button>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {/* ════ STEP 2: ADD CHILDS ════ */}
          {step === 2 && (
            <div className='px-6 py-4 flex flex-col gap-3'>
              <p className='text-sm text-gray-500'>
                Select child relationships to include in the archive. Check a child to include it, then toggle to expand nested relationships.
              </p>
              <div className='flex items-start gap-2.5 rounded-lg px-3.5 py-2.5 bg-blue-50 border border-blue-200'>
                <svg className='flex-shrink-0 mt-0.5' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#1d4ed8' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                  <circle cx='12' cy='12' r='10'/><line x1='12' y1='8' x2='12' y2='12'/><line x1='12' y1='16' x2='12.01' y2='16'/>
                </svg>
                <p className='text-xs text-blue-800 leading-relaxed'>
                  Only the first level of Master-Detail relationships is automatically included. To archive deeper levels of a relationship hierarchy, enable the <span className='font-semibold'>Include Child</span> toggle on the relevant child object and configure its nested relationships.
                </p>
              </div>
              <div className='rounded-xl overflow-hidden' style={{ border: '1px solid #E2E8F0' }}>
                <table className='w-full border-collapse table-fixed'>
                  <colgroup>
                    <col style={{ width: 6 }} />
                    <col style={{ width: 44 }} />
                    <col />
                    <col style={{ width: 110 }} />
                    <col style={{ width: 80 }} />
                    <col style={{ width: 90 }} />
                    <col style={{ width: 0 }} />
                  </colgroup>
                  <thead className='bg-gray-50'>
                    <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <th className='py-2.5' />
                      <th className='py-2.5' />
                      <th className='px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider'>Object</th>
                      <th className='px-3 py-2.5 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider'>Include Child</th>
                      <th className='px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider'>Depth</th>
                      <th className='px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider'>Type</th>
                      <th className='py-2.5' />
                    </tr>
                  </thead>
                  <tbody>
                    {crmId && (
                      <ChildRows
                        crmId={crmId}
                        objectName={objectName}
                        parentUuid={objectId}
                        depth={1}
                        selectedChildObjects={selectedChildObjects}
                        toggleChildObject={toggleChildObject}
                        registerChildApiName={registerChildApiName}
                        registerChildFieldApiName={registerChildFieldApiName}
                        registerChildParent={registerChildParent}
                        includeChild={includeChild}
                        setIncludeChild={setIncludeChild}
                        maxDepth={Math.max(0, MAX_CHILD_DEPTH - (relationshipDepth ?? 0))}
                        resetTick={resetTick}
                        relationshipDepth={relationshipDepth}
                        allowedObjectNames={allowedObjectNames}
                        onMasterDetailWarning={wrappedMdWarning}
                        onLoadingChange={handleChildLoadingChange}
                      />
                    )}
                  </tbody>
                </table>
              </div>
              {selectedChildObjects.size > 0 && (
                <p className='text-xs text-gray-400'>
                  {selectedChildObjects.size} child relationship{selectedChildObjects.size !== 1 ? 's' : ''} selected.
                </p>
              )}
            </div>
          )}

          {/* ════ STEP 3: ADD SCHEDULE ════ */}
          {step === 3 && (
            <div className='px-8 py-6'>
              {/* Override toggle */}
              <div className='flex items-center justify-between gap-4 mb-6 p-4 rounded-xl'
                style={{ background: overrideEnabled ? 'rgba(21,93,252,0.04)' : '#F8FAFC', border: `1px solid ${overrideEnabled ? 'rgba(21,93,252,0.18)' : '#E2E8F0'}`, transition: 'all 0.2s' }}>
                <div className='flex items-start gap-3'>
                  <div className='w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5'
                    style={{ background: overrideEnabled ? 'rgba(21,93,252,0.1)' : '#EEF2F7' }}>
                    <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke={overrideEnabled ? '#155DFC' : '#94A3B8'} strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                      <circle cx='12' cy='12' r='3' /><path d='M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14' />
                    </svg>
                  </div>
                  <div>
                    <p className='text-sm font-semibold' style={{ color: overrideEnabled ? '#155DFC' : '#374151' }}>
                      Use a custom schedule for this object
                    </p>
                    <p className='text-xs mt-0.5' style={{ color: '#64748B' }}>
                      Override the global archive schedule for <span className='font-medium text-gray-700'>{displayName}</span>.
                    </p>
                  </div>
                </div>
                <button type='button' onClick={() => setOverrideEnabled((v) => !v)}
                  className='flex-shrink-0 relative inline-flex items-center rounded-full transition-colors duration-200 focus:outline-none'
                  style={{ width: 44, height: 24, background: overrideEnabled ? '#155DFC' : '#CBD5E1' }}
                  aria-checked={overrideEnabled} role='switch'>
                  <span className='inline-block rounded-full bg-white shadow transition-transform duration-200'
                    style={{ width: 18, height: 18, transform: overrideEnabled ? 'translateX(22px)' : 'translateX(3px)' }} />
                </button>
              </div>

              <div className={`transition-opacity ${!overrideEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
                {/* Frequency buttons */}
                <div className='flex gap-2 flex-wrap mb-6'>
                  {(['One Time', 'Hourly', 'Daily', 'Weekly', 'Monthly', 'Custom'] as FrequencyType[]).map((freq) => (
                    <button key={freq} onClick={() => setFrequency(freq)} disabled={!overrideEnabled}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${frequency === freq ? 'bg-blue-600 text-white' : 'border border-blue-600 text-blue-600 hover:bg-blue-50'}`}>
                      {freq}
                    </button>
                  ))}
                </div>

                {/* One Time */}
                {frequency === 'One Time' && (
                  <div className='space-y-4'>
                    <div className='bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3'>
                      <svg className='w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5' fill='currentColor' viewBox='0 0 20 20'>
                        <path fillRule='evenodd' d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z' clipRule='evenodd' />
                      </svg>
                      <p className='text-sm text-blue-700'>One-time archival run — best for non-recurring backups.</p>
                    </div>
                    <div className='space-y-3'>
                      {(['runNow', 'scheduleRun'] as const).map((mode) => (
                        <label key={mode} className='flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors'
                          style={{ borderColor: runMode === mode ? '#3b82f6' : '#d1d5db', background: runMode === mode ? '#eff6ff' : 'transparent' }}>
                          <input type='radio' name='runMode' value={mode} checked={runMode === mode} onChange={() => setRunMode(mode)} className='mt-1' />
                          <div>
                            <p className='font-medium text-gray-900 text-sm'>{mode === 'runNow' ? 'Run Now' : 'Schedule Backup Run'}</p>
                            <p className='text-sm text-gray-600'>{mode === 'runNow' ? 'Runs once immediately' : 'Runs at the scheduled time'}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                    {runMode === 'scheduleRun' && (
                      <div className='space-y-4 pt-4 border-t border-gray-200'>
                        <div className='grid grid-cols-2 gap-4'>
                          <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Date</label>
                            <input type='date' value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} /></div>
                          <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Time</label>
                            <input type='time' value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputCls} /></div>
                        </div>
                        <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Time Zone</label>
                          <select value={timeZone} onChange={(e) => setTimeZone(e.target.value)} className={inputCls}>
                            {TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                          </select></div>
                      </div>
                    )}
                  </div>
                )}

                {/* Hourly */}
                {frequency === 'Hourly' && (
                  <div className='space-y-4'>
                    <div className='grid grid-cols-2 gap-4'>
                      <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Every</label>
                        <select value={backupIn} onChange={(e) => setBackupIn(e.target.value)} className={inputCls}>
                          <option>1 Hour</option><option>2 Hours</option><option>6 Hours</option><option>12 Hours</option>
                        </select></div>
                      <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Time Zone</label>
                        <select value={timeZone} onChange={(e) => setTimeZone(e.target.value)} className={inputCls}>
                          {TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                        </select></div>
                    </div>
                    <div className='grid grid-cols-2 gap-4'>
                      <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Starts From</label>
                        <input type='date' value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} /></div>
                      <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Starting Time</label>
                        <input type='time' value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputCls} /></div>
                    </div>
                  </div>
                )}

                {/* Daily */}
                {frequency === 'Daily' && (
                  <div className='space-y-4'>
                    <div className='grid grid-cols-2 gap-4'>
                      <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Run At</label>
                        <input type='time' value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputCls} /></div>
                      <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Time Zone</label>
                        <select value={timeZone} onChange={(e) => setTimeZone(e.target.value)} className={inputCls}>
                          {TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                        </select></div>
                    </div>
                    <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Starts From</label>
                      <input type='date' value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} /></div>
                  </div>
                )}

                {/* Weekly */}
                {frequency === 'Weekly' && (
                  <div className='space-y-4'>
                    <div>
                      <label className='block text-sm font-semibold text-gray-900 mb-3'>Select Days</label>
                      <div className='flex gap-2 flex-wrap'>
                        {ALL_DAYS.map((day) => (
                          <button key={day} onClick={() => setSelectedDays((p) => p.includes(day) ? p.filter((d) => d !== day) : [...p, day])}
                            className={`px-3 py-2 rounded-lg font-medium transition-colors text-sm ${selectedDays.includes(day) ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className='grid grid-cols-2 gap-4'>
                      <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Time</label>
                        <input type='time' value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputCls} /></div>
                      <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Time Zone</label>
                        <select value={timeZone} onChange={(e) => setTimeZone(e.target.value)} className={inputCls}>
                          {TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                        </select></div>
                    </div>
                    <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Starts From</label>
                      <input type='date' value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} /></div>
                  </div>
                )}

                {/* Monthly */}
                {frequency === 'Monthly' && (
                  <div className='space-y-4'>
                    <div>
                      <label className='block text-sm font-semibold text-gray-900 mb-3'>Select Months</label>
                      <div className='flex gap-2 flex-wrap'>
                        {ALL_MONTHS.map((month) => (
                          <button key={month} onClick={() => setSelectedMonths((p) => p.includes(month) ? p.filter((m) => m !== month) : [...p, month])}
                            className={`px-3 py-2 rounded-lg font-medium transition-colors text-sm ${selectedMonths.includes(month) ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                            {month}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className='grid grid-cols-2 gap-4'>
                      <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Day of Month</label>
                        <select value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} className={inputCls}>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                            <option key={d} value={String(d).padStart(2, '0')}>{String(d).padStart(2, '0')}</option>
                          ))}
                        </select></div>
                      <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Time</label>
                        <input type='time' value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputCls} /></div>
                    </div>
                    <div className='grid grid-cols-2 gap-4'>
                      <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Time Zone</label>
                        <select value={timeZone} onChange={(e) => setTimeZone(e.target.value)} className={inputCls}>
                          {TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                        </select></div>
                      <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Starts From</label>
                        <input type='date' value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} /></div>
                    </div>
                  </div>
                )}

                {/* Custom */}
                {frequency === 'Custom' && (
                  <div className='space-y-4'>
                    <div className='grid grid-cols-2 gap-4'>
                      <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Starts On</label>
                        <input type='date' value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} /></div>
                      <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Ends On</label>
                        <input type='date' value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} /></div>
                    </div>
                    <div className='grid grid-cols-2 gap-4'>
                      <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Backup Frequency</label>
                        <select value={backupFrequency} onChange={(e) => setBackupFrequency(e.target.value)} className={inputCls}>
                          <option>Daily</option><option>Weekly</option><option>Monthly</option>
                        </select></div>
                      <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Starting Time</label>
                        <input type='time' value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputCls} /></div>
                    </div>
                    <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Time Zone</label>
                      <select value={timeZone} onChange={(e) => setTimeZone(e.target.value)} className={inputCls}>
                        {TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                      </select></div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── footer navigation ── */}
        <div className='flex-shrink-0 px-6 py-4 border-t border-gray-100'>
          {step1Error && step === 1 && (
            <div className='flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium mb-3'
              style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)' }}>
              <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='flex-shrink-0'>
                <circle cx='12' cy='12' r='10' /><line x1='12' y1='8' x2='12' y2='12' /><line x1='12' y1='16' x2='12.01' y2='16' />
              </svg>
              {step1Error}
            </div>
          )}
          <div className='flex items-center justify-between'>
            <button onClick={onClose}
              className='px-5 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'>
              Cancel
            </button>
            <div className='flex items-center gap-3'>
              {/* Prev */}
              <button
                onClick={() => { setMdToast(null); setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3); }}
                disabled={step === 1}
                className='px-5 py-2 text-sm font-medium border border-gray-300 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 text-gray-700'>
                ← Prev
              </button>
              {/* Next */}
              {step < 3 && (
                <button
                  onClick={step === 1 ? handleNextStep1 : () => { setMdToast(null); setStep((s) => (s + 1) as 2 | 3); }}
                  disabled={(step === 1 && !canProceedFromStep1) || (step === 2 && childLoadingCount > 0)}
                  className='px-6 py-2 text-sm font-semibold rounded-lg transition-colors bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed'>
                  {step === 2 && childLoadingCount > 0 ? 'Loading…' : 'Next →'}
                </button>
              )}
              {/* Save */}
              {step === 3 && (
                <button
                  onClick={handleSave}
                  className='px-6 py-2 text-sm font-semibold rounded-lg transition-colors bg-blue-600 text-white hover:bg-blue-700'>
                  Save & Close
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
