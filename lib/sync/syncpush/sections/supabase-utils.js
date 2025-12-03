import { supabase } from '../../../supabase.js';
import { logSupabaseError } from '../shared/error-logger.js';

// Sections Supabase utility functions
export const supabaseUtils = {
  /**
   * Sync a single section to Supabase
   */
  async syncSection(section) {
    const { id, project_id, name, updated_at } = section;
    
    const { data, error } = await supabase
      .from('sections')
      .upsert({
        id,
        project_id,
        name,
        updated_at: updated_at || new Date().toISOString(),
      })
      .select();

    if (error) {
      logSupabaseError(error, 'pushing section', 'sections', {
        sectionId: id,
        sectionName: name,
        projectId: project_id,
        operation: 'upsert'
      });
      return { success: false, error };
    }

    return { success: true, data };
  }
};

