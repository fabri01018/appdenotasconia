import { SNIPPETS_SETTING_KEY } from '@/constants/snippets';
import { useSetting } from '@/hooks/use-settings';

export type Snippet = {
  id: string;
  slash: string; // stored without leading "/"
  title: string;
  content: string; // newline-separated block-text
  updatedAt: number; // unix ms
};

function safeParseSnippets(raw: unknown): Snippet[] {
  if (typeof raw !== 'string' || raw.trim() === '') return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s) => s && typeof s === 'object')
      .map((s: any) => ({
        id: typeof s.id === 'string' ? s.id : '',
        slash: typeof s.slash === 'string' ? s.slash : '',
        title: typeof s.title === 'string' ? s.title : '',
        content: typeof s.content === 'string' ? s.content : '',
        updatedAt: typeof s.updatedAt === 'number' ? s.updatedAt : 0,
      }))
      .filter((s) => s.id && s.slash);
  } catch {
    return [];
  }
}

function normalizeSlash(slash: string) {
  return (slash || '').trim().replace(/^\//, '').toLowerCase();
}

function makeId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function useSnippets() {
  const { value, setValue, isLoading, isSetting } = useSetting(SNIPPETS_SETTING_KEY);
  const snippets = safeParseSnippets(value).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  const persist = (next: Snippet[]) => {
    setValue(JSON.stringify(next));
  };

  const upsertSnippet = (input: Omit<Snippet, 'id' | 'updatedAt'> & { id?: string }) => {
    const slash = normalizeSlash(input.slash);
    const id = input.id || makeId();
    const now = Date.now();

    const nextSnippet: Snippet = {
      id,
      slash,
      title: (input.title || '').trim(),
      content: input.content ?? '',
      updatedAt: now,
    };

    // enforce unique slash: replace existing with same slash (different id)
    const withoutConflicts = snippets.filter((s) => s.id !== id && s.slash !== slash);
    const withoutSelf = withoutConflicts.filter((s) => s.id !== id);
    persist([nextSnippet, ...withoutSelf]);
    return nextSnippet;
  };

  const deleteSnippet = (id: string) => {
    persist(snippets.filter((s) => s.id !== id));
  };

  const duplicateSnippet = (id: string) => {
    const src = snippets.find((s) => s.id === id);
    if (!src) return null;
    // Try to create a unique slash variant
    let base = `${src.slash}-copy`;
    let candidate = base;
    let n = 2;
    while (snippets.some((s) => s.slash === candidate)) {
      candidate = `${base}${n}`;
      n += 1;
    }
    return upsertSnippet({
      slash: candidate,
      title: `${src.title} (Copy)`.trim(),
      content: src.content,
    });
  };

  return {
    snippets,
    upsertSnippet,
    deleteSnippet,
    duplicateSnippet,
    isLoading,
    isSetting,
  };
}

