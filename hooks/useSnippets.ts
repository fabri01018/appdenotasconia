import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { SNIPPETS_SETTING_KEY } from '@/constants/snippets';
import { useSetting } from '@/hooks/use-settings';
import { useDatabase } from './use-database';
import { 
  getAllSnippets, 
  upsertSnippet as dbUpsertSnippet, 
  deleteSnippet as dbDeleteSnippet 
} from '@/repositories/snippets';

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
  const { isInitialized } = useDatabase();
  const queryClient = useQueryClient();
  
  // For migration from old settings-based storage
  const { value: oldSettingValue, setValue: clearOldSetting } = useSetting(SNIPPETS_SETTING_KEY);

  const query = useQuery({
    queryKey: ['snippets'],
    queryFn: getAllSnippets,
    enabled: isInitialized,
  });

  const upsertMutation = useMutation({
    mutationFn: dbUpsertSnippet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snippets'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: dbDeleteSnippet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snippets'] });
    },
  });

  // Migration Effect
  useEffect(() => {
    if (isInitialized && oldSettingValue) {
      const oldSnippets = safeParseSnippets(oldSettingValue);
      if (oldSnippets.length > 0) {
        console.log(`🚀 Migrating ${oldSnippets.length} snippets to SQL table...`);
        // Migrate each snippet
        const migrateAll = async () => {
          for (const s of oldSnippets) {
            await dbUpsertSnippet(s);
          }
        };
        
        migrateAll()
          .then(() => {
            console.log('✅ Snippets migration complete. Clearing old setting.');
            clearOldSetting(null);
            queryClient.invalidateQueries({ queryKey: ['snippets'] });
          })
          .catch(err => console.error('❌ Snippets migration failed:', err));
      } else {
        // No snippets found, just clear the key
        clearOldSetting(null);
      }
    }
  }, [isInitialized, oldSettingValue, clearOldSetting, queryClient]);

  const snippets = query.data || [];

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

    upsertMutation.mutate(nextSnippet);
    return nextSnippet;
  };

  const deleteSnippet = (id: string) => {
    deleteMutation.mutate(id);
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
    isLoading: query.isLoading,
    isSetting: upsertMutation.isPending || deleteMutation.isPending,
  };
}
