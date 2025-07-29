import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useProjectAuth } from '@/hooks/useProjectAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Lock, ArrowLeft } from 'lucide-react';

interface Project {
  id: string;
  project_name: string;
  custom_logo_url?: string;
  brand_primary_color?: string;
  brand_secondary_color?: string;
}

const ProjectLogin = () => {
  const { projectName } = useParams<{ projectName: string }>();
  const navigate = useNavigate();
  const { signIn, loading: authLoading, isAuthenticated } = useProjectAuth();
  
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [projectLoading, setProjectLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && projectName) {
      navigate(`/project/${projectName}`);
    }
  }, [isAuthenticated, projectName, navigate]);

  useEffect(() => {
    const fetchProject = async () => {
      if (!projectName) return;
      
      setProjectLoading(true);
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('id, project_name, custom_logo_url, brand_primary_color, brand_secondary_color')
          .eq('project_name', decodeURIComponent(projectName))
          .eq('active', true)
          .single();

        if (error) {
          console.error('Error fetching project:', error);
        } else {
          setProject(data);
        }
      } catch (error) {
        console.error('Error fetching project:', error);
      } finally {
        setProjectLoading(false);
      }
    };

    fetchProject();
  }, [projectName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName || !password.trim()) return;

    setLoading(true);
    const result = await signIn(decodeURIComponent(projectName), password);
    
    if (result.success) {
      navigate(`/project/${projectName}`);
    }
    setLoading(false);
  };

  const handleBackToMain = () => {
    navigate('/');
  };

  if (projectLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Project Not Found</CardTitle>
            <CardDescription>
              The project "{projectName}" could not be found or is not active.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button onClick={handleBackToMain} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Main
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const primaryColor = project.brand_primary_color || 'hsl(var(--primary))';
  const secondaryColor = project.brand_secondary_color || 'hsl(var(--secondary))';

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-background"
      style={{
        background: `linear-gradient(135deg, ${primaryColor}20, ${secondaryColor}20)`
      }}
    >
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4">
          {project.custom_logo_url && (
            <div className="flex justify-center">
              <img 
                src={project.custom_logo_url} 
                alt={`${project.project_name} Logo`}
                className="h-16 w-auto object-contain"
              />
            </div>
          )}
          <div>
            <CardTitle className="text-2xl font-bold">
              {project.project_name}
            </CardTitle>
            <CardDescription className="mt-2">
              Enter your project password to access the portal
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Project Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter project password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading || authLoading}
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-3">
            <Button 
              type="submit" 
              className="w-full"
              disabled={loading || authLoading || !password.trim()}
              style={{ 
                backgroundColor: primaryColor,
                borderColor: primaryColor
              }}
            >
              {loading || authLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
            
            <Button 
              type="button" 
              variant="ghost" 
              onClick={handleBackToMain}
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Main App
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default ProjectLogin;