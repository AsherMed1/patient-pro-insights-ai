import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProjectAuth } from '@/hooks/useProjectAuth';
import { Loader2 } from 'lucide-react';

interface ProjectAuthGuardProps {
  children: React.ReactNode;
}

export const ProjectAuthGuard = ({ children }: ProjectAuthGuardProps) => {
  const { session, loading } = useProjectAuth();
  const navigate = useNavigate();
  const { projectName } = useParams();

  useEffect(() => {
    if (!loading && !session) {
      navigate(`/project/${projectName}/login`);
    }
  }, [loading, session, navigate, projectName]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // Verify session is for the correct project
  if (session.projectName !== projectName) {
    navigate(`/project/${projectName}/login`);
    return null;
  }

  return <>{children}</>;
};