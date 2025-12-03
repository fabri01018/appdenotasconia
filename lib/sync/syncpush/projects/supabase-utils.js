import { supabase } from '../../../supabase.js';
import { logSupabaseError } from '../shared/error-logger.js';

// Projects Supabase utility functions
export const supabaseUtils = {
  /**
   * Sync a single project to Supabase
   */
  async syncProject(project) {
    const { id, name, updated_at } = project;
    
    const { data, error } = await supabase
      .from('projects')
      .upsert({
        id,
        name,
        updated_at: updated_at || new Date().toISOString(),
      })
      .select();

    if (error) {
      logSupabaseError(error, 'pushing project', 'projects', {
        projectId: id,
        projectName: name,
        operation: 'upsert'
      });
      return { success: false, error };
    }

    return { success: true, data };
  }
};
