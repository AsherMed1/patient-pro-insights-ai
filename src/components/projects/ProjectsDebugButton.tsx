
import React from 'react';
import { Button } from '@/components/ui/button';
import { debugSupabaseConnection } from './hooks/useProjectDebug';

const ProjectsDebugButton = () => {
  const handleDebug = async () => {
    await debugSupabaseConnection();
  };

  return (
    <Button 
      variant="outline" 
      size="sm"
      onClick={handleDebug}
      className="mb-4"
    >
      Debug Connection
    </Button>
  );
};

export default ProjectsDebugButton;
