import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatFileStateLog } from '../types';
import { INITIAL_STATE_LOG } from '../data/seedState';

/**
 * Where the state currently on screen came from.
 *
 * The UI renders identically regardless of source, which is exactly the failure mode this type
 * exists to prevent: before this, a failed `/api/state` fetch left the bundled seed data on
 * screen with no indication it wasn't live — `INITIAL_STATE_LOG` looks exactly like a real
 * repository snapshot because it was built from the same schema.
 */
export type DataSource = 'live' | 'seed' | 'imported';

export interface IntelligenceState {
  stateLog: FlatFileStateLog;
  dataSource: DataSource;
  isRefreshing: boolean;
  isWorkflowRunning: boolean;
  toastNotification: string | null;
  refresh: () => Promise<void>;
  runWorkflow: () => Promise<void>;
  importStateLog: (imported: FlatFileStateLog) => void;
}

/**
 * Owns the app's single piece of server-derived state: the flat-file/Git snapshot, whether it
 * actually came from the server, and the two async actions (`refresh`, `runWorkflow`) that can
 * replace it. Split out of `App.tsx` so the component tree stays presentation-only.
 */
export function useIntelligenceState(): IntelligenceState {
  const [stateLog, setStateLog] = useState<FlatFileStateLog>(INITIAL_STATE_LOG);
  const [dataSource, setDataSource] = useState<DataSource>('seed');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isWorkflowRunning, setIsWorkflowRunning] = useState(false);
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastNotification(msg);
    toastTimer.current = setTimeout(() => setToastNotification(null), 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/state', { signal });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setStateLog(json.data);
          setDataSource('live');
          return;
        }
      }
      console.warn('Backend returned an unsuccessful /api/state response; keeping prior state.');
    } catch (err) {
      if ((err as { name?: string }).name === 'AbortError') return;
      console.warn('Could not load state from backend (server offline or unreachable):', err);
      // Deliberately not reverting dataSource here: a transient refresh failure should not
      // relabel already-live data as unverified seed data.
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    refresh(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runWorkflow = useCallback(async () => {
    setIsWorkflowRunning(true);
    try {
      const res = await fetch('/api/workflow/run', { method: 'POST' });
      const json = await res.json();

      if (json.success) {
        if (json.data) {
          setStateLog(json.data);
          setDataSource('live');
        }
        if (json.alreadyUpToDate) {
          showToast(json.message || 'All verified external sources already accessioned into Git.');
        } else {
          showToast(`Workflow completed: Created Git commit ${json.commitHash || ''} on branch main`);
        }
      } else {
        showToast(`Workflow notice: ${json.error || 'Execution finished'}`);
      }
    } catch (err) {
      console.error('Workflow error:', err);
      showToast('Workflow request failed — server unreachable.');
    } finally {
      setIsWorkflowRunning(false);
    }
  }, [showToast]);

  const importStateLog = useCallback(
    (imported: FlatFileStateLog) => {
      setStateLog(imported);
      setDataSource('imported');
      showToast('Imported and synchronized flat-file Git state log.');
    },
    [showToast]
  );

  return {
    stateLog,
    dataSource,
    isRefreshing,
    isWorkflowRunning,
    toastNotification,
    refresh: () => refresh(),
    runWorkflow,
    importStateLog,
  };
}
