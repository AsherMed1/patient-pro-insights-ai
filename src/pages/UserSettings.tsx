import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, User, Lock, Shield, FileText, Copy, AlertCircle, Upload, Camera } from 'lucide-react';
import { AuditLogDashboard } from '@/components/audit/AuditLogDashboard';
import { useRole } from '@/hooks/useRole';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

const UserSettings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { role } = useRole();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Profile form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Admin password reset state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [customPassword, setCustomPassword] = useState('');
  const [confirmCustomPassword, setConfirmCustomPassword] = useState('');
  const [showCustomPasswordDialog, setShowCustomPasswordDialog] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
        } else {
          setProfile(data);
          setFullName(data.full_name || '');
          setEmail(data.email || user.email || '');
          setAvatarUrl(data.avatar_url || '');
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  // Fetch all users for admin password reset
  useEffect(() => {
    const fetchUsers = async () => {
      if (role !== 'admin') return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .order('email');

        if (error) {
          console.error('Error fetching users:', error);
        } else {
          setUsers(data || []);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    if (role === 'admin') {
      fetchUsers();
    }
  }, [role]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    
    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Avatar image must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    setUploadingAvatar(true);
    try {
      // Delete old avatar if exists
      if (avatarUrl) {
        const oldPath = avatarUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('avatars')
            .remove([`${user.id}/${oldPath}`]);
        }
      }

      // Upload new avatar
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast({
        title: "Avatar Updated",
        description: "Your profile picture has been updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload avatar",
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: email,
          full_name: fullName || null,
          avatar_url: avatarUrl || null
        });

      if (error) {
        toast({
          title: "Update Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Profile Updated",
          description: "Your profile has been updated successfully",
        });
        setProfile(prev => prev ? { ...prev, full_name: fullName, email, avatar_url: avatarUrl } : null);
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "An error occurred while updating your profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        data: {
          must_change_password: false
        }
      });

      if (error) {
        toast({
          title: "Password Update Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Password Updated",
          description: "Your password has been updated successfully",
        });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        
        // Remove query parameter if present
        const url = new URL(window.location.href);
        if (url.searchParams.has('forcePasswordChange')) {
          url.searchParams.delete('forcePasswordChange');
          window.history.replaceState({}, '', url);
        }
      }
    } catch (error) {
      toast({
        title: "Password Update Failed",
        description: "An error occurred while updating your password",
        variant: "destructive",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSignOutAllDevices = async () => {
    try {
      await signOut();
      navigate('/auth');
      toast({
        title: "Signed Out",
        description: "You have been signed out of all devices",
      });
    } catch (error) {
      toast({
        title: "Sign Out Failed",
        description: "An error occurred while signing out",
        variant: "destructive",
      });
    }
  };

  const handleResetPassword = async (useCustomPassword: boolean) => {
    if (!selectedUserId) {
      toast({
        title: "No User Selected",
        description: "Please select a user to reset their password",
        variant: "destructive",
      });
      return;
    }

    if (selectedUserId === user?.id) {
      toast({
        title: "Cannot Reset Own Password",
        description: "Use the regular password change form above to change your own password",
        variant: "destructive",
      });
      return;
    }

    if (useCustomPassword) {
      if (customPassword.length < 6) {
        toast({
          title: "Password Too Short",
          description: "Password must be at least 6 characters long",
          variant: "destructive",
        });
        return;
      }

      if (customPassword !== confirmCustomPassword) {
        toast({
          title: "Passwords Don't Match",
          description: "Please make sure both passwords match",
          variant: "destructive",
        });
        return;
      }
    }

    setResetLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: {
          userId: selectedUserId,
          newPassword: useCustomPassword ? customPassword : undefined
        }
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "Password Reset Failed",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Password Reset Successful",
        description: data.message,
      });

      if (data.generatedPassword) {
        setGeneratedPassword(data.generatedPassword);
        setShowResultDialog(true);
      }

      // Reset form
      setSelectedUserId('');
      setCustomPassword('');
      setConfirmCustomPassword('');
      setShowCustomPasswordDialog(false);
    } catch (error: any) {
      toast({
        title: "Password Reset Failed",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setResetLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Password copied to clipboard",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        <div>
          <h1 className="heading-2">Account Settings</h1>
          <p className="body-base">Manage your account preferences and security settings</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className={`grid w-full ${role === 'admin' ? 'grid-cols-4' : 'grid-cols-3'}`}>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            {role === 'admin' && <TabsTrigger value="audit">Audit Logs</TabsTrigger>}
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Update your personal information and contact details
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleUpdateProfile}>
                <CardContent className="space-y-6">
                  {/* Avatar Upload Section */}
                  <div className="flex flex-col items-center gap-4">
                    <Avatar className="h-32 w-32">
                      <AvatarImage src={avatarUrl} alt={fullName || email} />
                      <AvatarFallback className="text-3xl">
                        {fullName ? fullName.charAt(0).toUpperCase() : email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                    >
                      {uploadingAvatar ? (
                        <>
                          <Upload className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Camera className="mr-2 h-4 w-4" />
                          Change Photo
                        </>
                      )}
                    </Button>
                    
                    <p className="text-xs text-muted-foreground">
                      JPG, PNG, WEBP or GIF. Max 5MB.
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-end">
                    <Button type="submit" disabled={saving}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </CardContent>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Password & Security
                </CardTitle>
                <CardDescription>
                  Update your password and manage security settings
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleChangePassword}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      minLength={6}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      minLength={6}
                      required
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={passwordLoading || !newPassword || !confirmPassword}
                    >
                      {passwordLoading ? 'Updating...' : 'Update Password'}
                    </Button>
                  </div>
                </CardContent>
              </form>
            </Card>

            {role === 'admin' && (
              <>
                <Separator className="my-6" />
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Admin: Reset User Passwords
                    </CardTitle>
                    <CardDescription>
                      Reset passwords for other users (admin only)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Use this tool to reset passwords for other users. All actions are logged in the audit log.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label htmlFor="userSelect">Select User</Label>
                      <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                        <SelectTrigger id="userSelect">
                          <SelectValue placeholder="Choose a user to reset password" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.full_name || u.email} ({u.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowCustomPasswordDialog(true)}
                        disabled={!selectedUserId || resetLoading}
                      >
                        Set Custom Password
                      </Button>
                      <Button
                        onClick={() => handleResetPassword(false)}
                        disabled={!selectedUserId || resetLoading}
                      >
                        {resetLoading ? 'Resetting...' : 'Generate & Reset Password'}
                      </Button>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      Generate & Reset will create a secure random password and display it to you.
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="sessions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Active Sessions
                </CardTitle>
                <CardDescription>
                  Manage your active sessions and sign out of all devices
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">Current Session</h4>
                      <p className="text-sm text-muted-foreground">
                        {user?.email} • Active now
                      </p>
                    </div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h4 className="font-medium">Security Actions</h4>
                  <Button 
                    variant="destructive" 
                    onClick={handleSignOutAllDevices}
                  >
                    Sign Out of All Devices
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    This will sign you out of all devices and you'll need to sign in again.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {role === 'admin' && (
            <TabsContent value="audit">
              <AuditLogDashboard />
            </TabsContent>
          )}
        </Tabs>

        {/* Custom Password Dialog */}
        <Dialog open={showCustomPasswordDialog} onOpenChange={setShowCustomPasswordDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Custom Password</DialogTitle>
              <DialogDescription>
                Enter a custom password for the selected user
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="customPassword">New Password</Label>
                <Input
                  id="customPassword"
                  type="password"
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  placeholder="Enter new password"
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmCustomPassword">Confirm Password</Label>
                <Input
                  id="confirmCustomPassword"
                  type="password"
                  value={confirmCustomPassword}
                  onChange={(e) => setConfirmCustomPassword(e.target.value)}
                  placeholder="Confirm new password"
                  minLength={6}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCustomPasswordDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => handleResetPassword(true)} disabled={resetLoading}>
                {resetLoading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Result Dialog with Generated Password */}
        <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Password Reset Successful</DialogTitle>
              <DialogDescription>
                The user's password has been reset. Share this password securely.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This password will only be shown once. Make sure to copy it before closing this dialog.
                </AlertDescription>
              </Alert>
              
              <div className="p-4 bg-muted rounded-md">
                <div className="flex items-center justify-between gap-2">
                  <code className="text-lg font-mono">{generatedPassword}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(generatedPassword)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => {
                setShowResultDialog(false);
                setGeneratedPassword('');
              }}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default UserSettings;