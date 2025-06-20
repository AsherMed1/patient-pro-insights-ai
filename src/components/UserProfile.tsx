
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogOut, User, Mail, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export const UserProfile: React.FC = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!user) return null;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <User className="h-5 w-5" />
          <span>User Profile</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Mail className="h-4 w-4 text-gray-500" />
          <span className="text-sm">{user.email}</span>
        </div>

        {user.user_metadata?.full_name && (
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-gray-500" />
            <span className="text-sm">{user.user_metadata.full_name}</span>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <span className="text-sm">
            Joined {new Date(user.created_at).toLocaleDateString()}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant={user.email_confirmed_at ? "default" : "secondary"}>
            {user.email_confirmed_at ? "Verified" : "Unverified"}
          </Badge>
        </div>

        <Button
          onClick={handleSignOut}
          variant="outline"
          className="w-full flex items-center space-x-2"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </Button>
      </CardContent>
    </Card>
  );
};
