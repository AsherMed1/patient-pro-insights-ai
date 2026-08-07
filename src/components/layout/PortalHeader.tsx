import { LogOut, Settings, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import MentionsBell from '@/components/notifications/MentionsBell';
import patientProLogo from '@/assets/patient-pro-logo.png';

interface PortalHeaderProps {
  /** Small line under the portal title, e.g. "QA Operations Queue". */
  subtitle: string;
  email?: string | null;
  role?: string | null;
  onSignOut: () => void;
}

/**
 * Shared portal header. Sticks to the top of the viewport so the notification
 * bell stays reachable while long queues are scrolled. Uses a higher z-index
 * than the sticky table columns in the QA queue so nothing overlaps it.
 */
export default function PortalHeader({ subtitle, email, role, onSignOut }: PortalHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="sticky top-0 z-40 -mx-4 -mt-4 mb-0 flex items-center justify-between border-b bg-gray-50/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-gray-50/80 md:-mx-6 md:-mt-6 md:px-6">
      <div className="flex items-center gap-3">
        <img src={patientProLogo} alt="Patient Pro Logo" className="h-8 w-auto" />
        <div>
          <h1 className="text-lg font-semibold leading-none">Patient Pro Client Portal</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground">
          <User className="h-3.5 w-3.5" />
          {email}
          {role ? ` (${role})` : ''}
        </span>
        <MentionsBell />
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 border-none"
          onClick={() => navigate('/settings')}
        >
          <Settings className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 border-none" onClick={onSignOut}>
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
