import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAIFormatting } from '@/hooks/useAIFormatting';
import { Wand2, Loader2, Copy, Check } from 'lucide-react';

interface AIFormattingButtonProps {
  data: string | object;
  type: 'patient_intake_notes' | 'form_submission' | 'appointment_summary' | 'general';
  recordId?: string;
  tableName?: string;
  originalLabel?: string;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: boolean;
  onFormatComplete?: (formattedText: string) => void;
}

export const AIFormattingButton = ({
  data,
  type,
  recordId,
  tableName,
  originalLabel = "Format with AI",
  className,
  variant = "outline",
  size = "sm",
  disabled = false,
  onFormatComplete
}: AIFormattingButtonProps) => {
  const { loading, formatWithAI } = useAIFormatting();
  const [formattedText, setFormattedText] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleFormat = async () => {
    const result = await formatWithAI({
      type,
      data,
      recordId,
      tableName
    });

    if (result?.success) {
      setFormattedText(result.formattedText);
      onFormatComplete?.(result.formattedText);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(formattedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'patient_intake_notes':
        return 'Patient Intake Notes';
      case 'form_submission':
        return 'Form Submission';
      case 'appointment_summary':
        return 'Appointment Summary';
      default:
        return 'Data';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          className={className}
          disabled={loading || disabled}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Wand2 className="h-4 w-4 mr-2" />
          )}
          {originalLabel}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            AI Formatting - {getTypeLabel()}
          </DialogTitle>
          <DialogDescription>
            Clean up and format your {type.replace('_', ' ')} data using AI for better readability
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Original Data */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Original Data</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              <pre className="text-xs whitespace-pre-wrap break-words bg-muted p-3 rounded">
                {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
              </pre>
            </CardContent>
          </Card>

          {/* Formatted Data */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">AI Formatted</CardTitle>
                <div className="flex gap-2">
                  {!formattedText && (
                    <Button 
                      onClick={handleFormat} 
                      size="sm" 
                      disabled={loading || disabled}
                      className="h-8"
                    >
                      {loading ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Wand2 className="h-3 w-3 mr-1" />
                      )}
                      Format
                    </Button>
                  )}
                  {formattedText && (
                    <Button 
                      onClick={handleCopy} 
                      size="sm" 
                      variant="outline"
                      className="h-8"
                    >
                      {copied ? (
                        <Check className="h-3 w-3 mr-1" />
                      ) : (
                        <Copy className="h-3 w-3 mr-1" />
                      )}
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Formatting with AI...</p>
                  </div>
                </div>
              ) : formattedText ? (
                <div className="prose prose-sm max-w-none">
                  <div className="bg-background p-3 rounded border whitespace-pre-wrap">
                    {formattedText}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <p className="text-sm">Click "Format" to clean up this data with AI</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};