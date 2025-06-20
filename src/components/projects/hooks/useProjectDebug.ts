
import { supabase } from '@/integrations/supabase/client';

export const debugSupabaseConnection = async () => {
  console.log('=== Comprehensive Supabase Connection Test ===');
  
  try {
    // 1. Check Supabase client initialization
    console.log('1. Supabase client URL:', supabase.supabaseUrl);
    console.log('1. Supabase client key (first 20 chars):', supabase.supabaseKey.substring(0, 20) + '...');

    // 2. Check session and authentication
    console.log('\n2. Testing Authentication...');
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    console.log('   Session status:', session?.session ? 'Authenticated' : 'Anonymous');
    console.log('   User ID:', session?.session?.user?.id || 'None');
    if (sessionError) {
      console.error('   Session error:', sessionError);
    } else {
      console.log('   ✓ Auth connection working');
    }

    // 3. Test basic database connectivity
    console.log('\n3. Testing Database Connectivity...');
    const startTime = Date.now();
    const { data: dbTest, error: dbError } = await supabase
      .from('projects')
      .select('count', { count: 'exact', head: true });
    
    const responseTime = Date.now() - startTime;
    
    if (dbError) {
      console.error('   ❌ Database connection failed:', dbError);
      console.error('   Error code:', dbError.code);
      console.error('   Error message:', dbError.message);
      if (dbError.details) console.error('   Error details:', dbError.details);
    } else {
      console.log(`   ✓ Database connection successful (${responseTime}ms)`);
      console.log('   Projects table accessible, total records:', dbTest || 'Unknown');
    }

    // 4. Test multiple table access
    console.log('\n4. Testing Table Access...');
    const tableTests = [
      { name: 'projects', table: 'projects' },
      { name: 'all_appointments', table: 'all_appointments' },
      { name: 'new_leads', table: 'new_leads' },
      { name: 'all_calls', table: 'all_calls' },
      { name: 'agents', table: 'agents' }
    ];

    const testResults = await Promise.allSettled(
      tableTests.map(async ({ name, table }) => {
        const startTime = Date.now();
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        const responseTime = Date.now() - startTime;
        
        if (error) {
          throw new Error(`${name}: ${error.message} (${error.code})`);
        }
        
        return { name, count: count || 0, responseTime };
      })
    );

    testResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const { name, count, responseTime } = result.value;
        console.log(`   ✓ ${name}: ${count} records (${responseTime}ms)`);
      } else {
        console.error(`   ❌ ${result.reason.message}`);
      }
    });

    // 5. Test RLS policies
    console.log('\n5. Testing Row Level Security...');
    const { data: rlsTest, error: rlsError } = await supabase
      .from('projects')
      .select('id, project_name')
      .limit(5);
    
    if (rlsError) {
      console.error('   ❌ RLS test failed:', rlsError.message);
      if (rlsError.code === 'PGRST301') {
        console.log('   Note: This might be due to RLS policies requiring authentication');
      }
    } else {
      console.log(`   ✓ RLS policies working, accessible projects: ${rlsTest?.length || 0}`);
      if (rlsTest && rlsTest.length > 0) {
        console.log('   Sample projects:', rlsTest.map(p => p.project_name).join(', '));
      }
    }

    // 6. Test database functions
    console.log('\n6. Testing Database Functions...');
    try {
      const { data: functionTest, error: functionError } = await supabase
        .rpc('get_dashboard_data', { p_project_name: 'ALL', p_limit: 1 });
      
      if (functionError) {
        console.error('   ❌ Database function test failed:', functionError.message);
      } else {
        console.log('   ✓ Database functions working');
        console.log('   Sample data:', functionTest?.[0] || 'No data returned');
      }
    } catch (funcError) {
      console.error('   ❌ Database function error:', funcError);
    }

    // 7. Test materialized views
    console.log('\n7. Testing Materialized Views...');
    try {
      const { data: viewTest, error: viewError } = await supabase
        .from('project_stats_view')
        .select('*')
        .limit(1);
      
      if (viewError) {
        console.error('   ❌ Materialized view test failed:', viewError.message);
      } else {
        console.log('   ✓ Materialized views accessible');
        console.log('   Sample view data available:', viewTest?.length || 0, 'records');
      }
    } catch (viewError) {
      console.error('   ❌ Materialized view error:', viewError);
    }

    // 8. Performance summary
    console.log('\n8. Connection Performance Summary:');
    const overallEndTime = Date.now();
    console.log(`   Total test duration: ${overallEndTime - startTime}ms`);
    console.log('   Connection status: Testing completed');

  } catch (error) {
    console.error('\n❌ Critical connection error:', error);
    console.error('Stack trace:', error.stack);
  }
  
  console.log('\n=== Connection Test Complete ===');
  
  // Return summary for UI display
  return {
    timestamp: new Date().toISOString(),
    status: 'completed',
    message: 'Check console for detailed results'
  };
};
