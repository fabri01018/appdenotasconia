import { getDb } from '../lib/database';

export const getSetting = async (key) => {
  const db = getDb();
  try {
    const result = await db.getFirstAsync('SELECT value FROM settings WHERE key = ?', [key]);
    return result ? result.value : null;
  } catch (error) {
    console.error(`Error getting setting ${key}:`, error);
    return null;
  }
};

export const saveSetting = async ({ key, value }) => {
  const db = getDb();
  try {
    if (value === null || value === undefined) {
      await db.runAsync('DELETE FROM settings WHERE key = ?', [key]);
    } else {
      await db.runAsync(
        `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
        [key, value.toString()]
      );
    }
    return value;
  } catch (error) {
    console.error(`Error saving setting ${key}:`, error);
    throw error;
  }
};

