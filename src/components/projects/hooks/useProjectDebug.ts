
import { supabase } from '@/integrations/supabase/client';

export const debugSupabaseConnection = async () => {
  console.log('=== Supabase Debug Information ===');
  
  try {
    // Check session
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    console.log('Session status:', session?.session ? 'Authenticated' : 'Anonymous');
    console.log('User ID:', session?.session?.user?.id || 'None');
    if (sessionError) {
      console.error('Session error:', sessionError);
    }

    // Test basic connection
    console.log('Testing basic connection...');
    const { data: testData, error: testError } = await supabase
      .from('projects')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('Connection test failed:', testError);
      console.error('Error code:', testError.code);
      console.error('Error message:', testError.message);
      console.error('Error details:', testError.details);
    } else {
      console.log('Connection test successful:', testData);
    }

    // Test RLS policies
    console.log('Testing RLS policies...');
    const { data: rlsTest, error: rlsError } = await supabase
      .from('projects')
      .select('id, project_name')
      .limit(1);
    
    if (rlsError) {
      console.error('RLS test failed:', rlsError);
    } else {
      console.log('RLS test successful, found projects:', rlsTest?.length || 0);
    }

  } catch (error) {
    console.error('Debug error:', error);
  }
  console.log('=== End Debug Information ===');
};
