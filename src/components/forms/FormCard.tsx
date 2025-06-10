
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink } from 'lucide-react';
import type { ProjectForm } from './types';

interface FormCardProps {
  projectForm: ProjectForm;
  onCopyUrl: (url: string) => void;
}

const FormCard = ({ projectForm, onCopyUrl }: FormCardProps) => {
  const formUrl = `${window.location.origin}/form/${projectForm.public_url_slug}`;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {projectForm.form_templates?.title}
          </CardTitle>
          <Badge variant={projectForm.is_active ? "default" : "secondary"}>
            {projectForm.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {projectForm.projects?.project_name}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          {projectForm.form_templates?.description}
        </p>
        
        <div className="text-xs text-muted-foreground">
          Form Type: {projectForm.form_templates?.form_type}
        </div>

        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCopyUrl(formUrl)}
              className="flex-1"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy URL
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/form/${projectForm.public_url_slug}`, '_blank')}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground break-all">
            /form/{projectForm.public_url_slug}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FormCard;
