
import { supabase } from '@/integrations/supabase/client';

export const fetchAllRecords = async (baseQuery: any, tableName: string) => {
  let allRecords: any[] = [];
  let from = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await baseQuery
      .range(from, from + batchSize - 1);
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      allRecords = [...allRecords, ...data];
      from += batchSize;
      hasMore = data.length === batchSize;
      console.log(`Fetched ${tableName} batch: ${data.length} records, total so far: ${allRecords.length}`);
    } else {
      hasMore = false;
    }
  }

  console.log(`Total ${tableName} fetched: ${allRecords.length}`);
  return allRecords;
};
