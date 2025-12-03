import { supabase } from '../../../supabase.js';
import { logSupabaseError } from '../shared/error-logger.js';

// Tasks Supabase utility functions
export const supabaseUtils = {
  /**
   * Sync a single task to Supabase
   */
  async syncTask(task) {
    const { id, title, description, completed, project_id, section_id, parent_id, is_expanded, created_at, updated_at, tags } = task;
    
    // Build the data object with only the fields that exist
    const taskData = {
      id,
      title,
      description: description || null,
      project_id,
      section_id: section_id || null,
      parent_id: parent_id || null,
      is_expanded: is_expanded ? true : false,
      created_at: created_at || new Date().toISOString(),
      updated_at: updated_at || new Date().toISOString(),
    };

    // Only include completed field if it exists and is not null/undefined
    if (completed !== null && completed !== undefined) {
      taskData.completed = completed ? true : false;
    }
    
    const { data, error } = await supabase
      .from('tasks')
      .upsert(taskData)
      .select();

    if (error) {
      logSupabaseError(error, 'pushing task', 'tasks', {
        taskId: id,
        taskTitle: title,
        projectId: project_id,
        operation: 'upsert'
      });
      return { success: false, error };
    }

    // Sync Tags if present
    if (tags && Array.isArray(tags)) {
      console.log(`🏷️ Syncing ${tags.length} tags for task ${id}:`, tags.map(t => t.name));
      try {
        // 1. Upsert all tags to ensure they exist and get their IDs
        const tagNames = tags.map(t => t.name).filter(Boolean);
        
        if (tagNames.length > 0) {
          console.log('🏷️ Upserting tags:', tagNames);
          // We upsert tags by name to get their IDs (creating if missing)
          const { data: upsertedTags, error: tagUpsertError } = await supabase
            .from('tags')
            .upsert(
              tagNames.map(name => ({ name })), 
              { onConflict: 'name' }
            )
            .select('id, name'); // Select name too for debugging

          if (tagUpsertError) {
            console.error('❌ Error upserting tags:', tagUpsertError);
            throw tagUpsertError;
          }

          console.log('✅ Tags upserted/found:', upsertedTags);

          const supabaseTagIds = upsertedTags.map(t => t.id);

          // 2. Update task_tags relationship
          // First, remove all existing relationships for this task
          console.log(`🏷️ Clearing existing task_tags for task ${id}`);
          const { error: deleteError } = await supabase
            .from('task_tags')
            .delete()
            .eq('task_id', id);

          if (deleteError) {
            console.error('❌ Error clearing task_tags:', deleteError);
            throw deleteError;
          }

          // Then insert new relationships
          if (supabaseTagIds.length > 0) {
            const taskTagsData = supabaseTagIds.map(tagId => ({
              task_id: id,
              tag_id: tagId
            }));

            console.log('🏷️ Inserting new task_tags:', taskTagsData);
            const { error: insertError } = await supabase
              .from('task_tags')
              .insert(taskTagsData);

            if (insertError) {
              console.error('❌ Error inserting task_tags:', insertError);
              throw insertError;
            }
            console.log('✅ Task tags successfully synced');
          }
        } else {
          // If no tags, just clear existing relationships
          console.log(`🏷️ No tags to sync, clearing existing task_tags for task ${id}`);
          const { error: deleteError } = await supabase
            .from('task_tags')
            .delete()
            .eq('task_id', id);
            
          if (deleteError) throw deleteError;
        }

      } catch (tagError) {
        console.error('❌ Exception syncing tags:', tagError);
        logSupabaseError(tagError, 'syncing task tags', 'task_tags', {
          taskId: id,
          tags: tags.map(t => t.name)
        });
      }
    } else {
      console.log(`ℹ️ No tags array found for task ${id}`);
    }

    return { success: true, data };
  }
};
