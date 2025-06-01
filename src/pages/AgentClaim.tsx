
import React from 'react';
import AgentAppointmentClaimForm from '@/components/AgentAppointmentClaimForm';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AgentClaim = () => {
  const { toast } = useToast();

  const clearCache = () => {
    // Clear localStorage
    localStorage.clear();
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Clear browser cache (best effort)
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    
    toast({
      title: "Cache Cleared",
      description: "Browser cache has been cleared successfully.",
    });
    
    // Reload the page to ensure fresh data
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">Agent Portal</h1>
          <p className="text-xl text-gray-600">Claim credit for appointments you've booked</p>
        </div>
        
        <div className="flex justify-center">
          <Button 
            onClick={clearCache}
            variant="outline" 
            className="flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Clear Cache</span>
          </Button>
        </div>

        <AgentAppointmentClaimForm />
      </div>
    </div>
  );
};

export default AgentClaim;
