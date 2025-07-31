import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, User } from 'lucide-react';

import { formatDateTimeForTable } from '@/utils/dateTimeUtils';

interface FormSubmission {
  id: string;
  project_form_id: string;
  submission_data: any;
  contact_info?: any;
  tags?: any[];
  submitted_at: string;
  ai_summary?: string;
  user_id?: string;
}

interface FormSubmissionCardProps {
  submission: FormSubmission;
  projectName?: string;
}

export const FormSubmissionCard = ({ submission, projectName }: FormSubmissionCardProps) => {
  const getContactInfo = () => {
    if (submission.contact_info) {
      const contact = submission.contact_info;
      return {
        name: contact.name || contact.full_name || contact.firstName + ' ' + contact.lastName || 'Unknown',
        email: contact.email || '',
        phone: contact.phone || contact.phoneNumber || ''
      };
    }
    
    // Fallback to submission_data
    const data = submission.submission_data || {};
    return {
      name: data.name || data.full_name || data.firstName + ' ' + data.lastName || 'Unknown',
      email: data.email || '',
      phone: data.phone || data.phoneNumber || ''
    };
  };

  const contact = getContactInfo();
  const tags = submission.tags || [];

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Form Submission
            {projectName && (
              <Badge variant="secondary" className="text-xs">
                {projectName}
              </Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Contact Information */}
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{contact.name}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {formatDateTimeForTable(submission.submitted_at)}
          </div>
        </div>

        {/* Contact Details */}
        {(contact.email || contact.phone) && (
          <div className="text-sm space-y-1">
            {contact.email && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground min-w-[60px]">Email:</span>
                <span>{contact.email}</span>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground min-w-[60px]">Phone:</span>
                <span>{contact.phone}</span>
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {typeof tag === 'string' ? tag : tag.name || 'Tag'}
              </Badge>
            ))}
          </div>
        )}

        {/* Raw Submission Data */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Raw Form Data:</h4>
          <div className="bg-muted/50 p-3 rounded-lg text-xs">
            <pre className="whitespace-pre-wrap break-words">
              {JSON.stringify(submission.submission_data, null, 2)}
            </pre>
          </div>
        </div>

        {/* AI Summary */}
        {submission.ai_summary && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">AI Formatted Summary:</h4>
            <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-sm text-gray-800">
                  {submission.ai_summary}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};