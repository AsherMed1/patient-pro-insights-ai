
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { debugSupabaseConnection } from './hooks/useProjectDebug';
import { Loader2, Database, CheckCircle, AlertCircle } from 'lucide-react';

const ProjectsDebugButton = () => {
  const [testing, setTesting] = useState(false);
  const [lastTest, setLastTest] = useState<{
    timestamp: string;
    status: string;
    message: string;
  } | null>(null);

  const handleDebug = async () => {
    setTesting(true);
    try {
      const result = await debugSupabaseConnection();
      setLastTest(result);
    } catch (error) {
      console.error('Debug test failed:', error);
      setLastTest({
        timestamp: new Date().toISOString(),
        status: 'error',
        message: 'Connection test failed - check console for details'
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-3">
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleDebug}
          disabled={testing}
          className="flex items-center space-x-2"
        >
          {testing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Database className="h-4 w-4" />
          )}
          <span>{testing ? 'Testing Connection...' : 'Test Database Connection'}</span>
        </Button>
        
        {lastTest && (
          <Badge 
            variant={lastTest.status === 'completed' ? 'default' : 'destructive'}
            className="flex items-center space-x-1"
          >
            {lastTest.status === 'completed' ? (
              <CheckCircle className="h-3 w-3" />
            ) : (
              <AlertCircle className="h-3 w-3" />
            )}
            <span>
              {lastTest.status === 'completed' ? 'Connected' : 'Error'}
            </span>
          </Badge>
        )}
      </div>
      
      {lastTest && (
        <div className="text-xs text-gray-600">
          <div>Last tested: {new Date(lastTest.timestamp).toLocaleString()}</div>
          <div className="mt-1 font-medium">{lastTest.message}</div>
          <div className="mt-1 text-blue-600">
            💡 Open browser console (F12) to see detailed connection test results
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsDebugButton;
