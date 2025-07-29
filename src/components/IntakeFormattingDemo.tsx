import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AIFormattingButton } from '@/components/AIFormattingButton';
import { Wand2, FileText, User, Calendar } from 'lucide-react';

const SAMPLE_INTAKE_DATA = {
  patientNotes: `patient says they have been having knee pain for about 6 months now. pain is usually around 7/10 in the morning and gets worse throughout the day. they tried ibuprofen but it doesn't help much. they work in construction so they're on their feet all day. they said their mom had similar issues. no surgeries before. wants to know about non-surgical options first. insurance is blue cross blue shield.`,
  
  formData: {
    firstName: "john",
    lastName: "smith", 
    dateOfBirth: "1975-03-15",
    phoneNumber: "555-123-4567",
    email: "jsmith@email.com",
    primaryConcern: "knee pain getting worse",
    painLevel: "7",
    symptomDuration: "6 months",
    previousTreatments: "ibuprofen, rest",
    workStatus: "construction worker",
    insuranceProvider: "blue cross blue shield",
    emergencyContact: "wife - mary smith - 555-123-4568",
    medicalHistory: "no major surgeries, family history of arthritis",
    currentMedications: "ibuprofen as needed",
    allergies: "none known"
  },

  appointmentData: {
    patientName: "john smith",
    appointmentDate: "2024-02-15",
    appointmentTime: "10:00 AM",
    reasonForVisit: "knee pain evaluation",
    preferredLocation: "main clinic",
    specialRequests: "needs parking close to entrance due to mobility issues",
    insuranceVerified: true,
    remindersSent: true,
    notes: "patient called to confirm, mentioned pain has been getting worse lately"
  }
};

export const IntakeFormattingDemo = () => {
  const [activeDemo, setActiveDemo] = useState<'notes' | 'form' | 'appointment'>('notes');
  const [customText, setCustomText] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const demoCards = [
    {
      key: 'notes' as const,
      title: 'Patient Intake Notes',
      description: 'Transform raw patient notes into professional medical summaries',
      icon: FileText,
      data: SAMPLE_INTAKE_DATA.patientNotes,
      type: 'patient_intake_notes' as const,
      badge: 'Medical Notes'
    },
    {
      key: 'form' as const,
      title: 'Form Submissions',
      description: 'Convert form data into organized patient reports',
      icon: User,
      data: SAMPLE_INTAKE_DATA.formData,
      type: 'form_submission' as const,
      badge: 'Form Data'
    },
    {
      key: 'appointment' as const,
      title: 'Appointment Summaries',
      description: 'Create clean appointment overviews for staff preparation',
      icon: Calendar,
      data: SAMPLE_INTAKE_DATA.appointmentData,
      type: 'appointment_summary' as const,
      badge: 'Appointments'
    }
  ];

  const activeCard = demoCards.find(card => card.key === activeDemo)!;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-6 w-6" />
            AI Intake Formatting Demo
          </CardTitle>
          <CardDescription>
            See how AI can transform messy intake data into clean, professional summaries that are easy to read and understand.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Demo Type Selector */}
          <div className="flex flex-wrap gap-2">
            {demoCards.map((card) => (
              <Button
                key={card.key}
                variant={activeDemo === card.key ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveDemo(card.key)}
                className="flex items-center gap-2"
              >
                <card.icon className="h-4 w-4" />
                {card.title}
              </Button>
            ))}
            <Button
              variant={showCustom ? "default" : "outline"}
              size="sm"
              onClick={() => setShowCustom(!showCustom)}
            >
              Custom Text
            </Button>
          </div>

          {/* Custom Text Input */}
          {showCustom && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Try Your Own Text</h3>
                <Badge variant="secondary">Custom</Badge>
              </div>
              <Textarea
                placeholder="Paste your own patient notes, form data, or any text that needs formatting..."
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                rows={6}
                className="min-h-[120px]"
              />
              <div className="flex justify-end">
                <AIFormattingButton
                  data={customText}
                  type="patient_intake_notes"
                  originalLabel="Format Custom Text"
                  disabled={!customText.trim()}
                />
              </div>
            </div>
          )}

          {/* Demo Content */}
          {!showCustom && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <activeCard.icon className="h-5 w-5" />
                  {activeCard.title}
                </h3>
                <Badge variant="secondary">{activeCard.badge}</Badge>
              </div>
              
              <p className="text-sm text-muted-foreground">
                {activeCard.description}
              </p>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Sample {activeCard.title}:</h4>
                <pre className="text-xs whitespace-pre-wrap break-words">
                  {typeof activeCard.data === 'string' 
                    ? activeCard.data 
                    : JSON.stringify(activeCard.data, null, 2)
                  }
                </pre>
              </div>

              <div className="flex justify-end">
                <AIFormattingButton
                  data={activeCard.data}
                  type={activeCard.type}
                  originalLabel={`Format ${activeCard.title}`}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Benefits Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Benefits of AI Formatting</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium text-green-600">✓ Improved Readability</h4>
              <p className="text-muted-foreground">Transform messy notes into organized, professional summaries</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-green-600">✓ Consistent Formatting</h4>
              <p className="text-muted-foreground">Standardize all intake data with consistent medical terminology</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-green-600">✓ Time Savings</h4>
              <p className="text-muted-foreground">Automatically format data instead of manual cleanup</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-green-600">✓ Better Patient Care</h4>
              <p className="text-muted-foreground">Clear summaries help staff quickly understand patient needs</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};