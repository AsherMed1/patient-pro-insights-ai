import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/hooks/useRole';
import { Plus, Edit, Trash2, RefreshCw, Mail, Search, Loader2, KeyRound, Copy, Check, Eye, EyeOff } from 'lucide-react';
import ProjectUserManager from './ProjectUserManager';
import { useSendWelcomeEmail } from '@/hooks/useWelcomeEmail';


interface User {
  id: string;
  email: string;
  full_name: string;
  role?: UserRole;
  created_at: string;
  assignedProjects?: string[];
}

interface Project {
  id: string;
  project_name: string;
}

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [showGeneratedPasswordDialog, setShowGeneratedPasswordDialog] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date-desc');
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'project_user' as UserRole,
    selectedProjectId: ''
  });
  const [editUser, setEditUser] = useState({
    email: '',
    fullName: '',
    role: 'project_user' as UserRole,
    selectedProjectId: ''
  });
  const { toast } = useToast();
  const { sendWelcomeEmail } = useSendWelcomeEmail();

  useEffect(() => {
    fetchUsers();
    fetchProjects();
  }, []);

  const fetchUsers = async (showRefreshIndicator = false, showToast = false) => {
    if (showRefreshIndicator) {
      setRefreshing(true);
    }
    
    try {
      console.log('🔍 Fetching users...');
      console.log('🕐 Timestamp:', new Date().toISOString());
      
      // Get profiles first
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at');

      console.log('📋 Raw profiles data:', profiles);
      console.log('📋 Profiles count:', profiles?.length || 0);
      
      if (profilesError) {
        console.error('❌ Profiles error:', profilesError);
        throw profilesError;
      }

      if (!profiles || profiles.length === 0) {
        console.warn('⚠️ No profiles found in database');
      }

      // Get user roles separately
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      console.log('👤 Raw user roles data:', userRoles);
      console.log('👤 User roles count:', userRoles?.length || 0);
      
      if (rolesError) {
        console.error('❌ Roles error:', rolesError);
        throw rolesError;
      }

      // Get project access for project users
      const { data: projectAccess, error: accessError } = await supabase
        .from('project_user_access')
        .select(`
          user_id,
          projects(project_name)
        `);

      console.log('🔗 Raw project access data:', projectAccess);
      console.log('🔗 Project access count:', projectAccess?.length || 0);
      
      if (accessError) {
        console.error('❌ Project access error:', accessError);
      }

      // Combine the data with detailed logging
      const formattedUsers = profiles?.map((profile: any) => {
        console.log(`🔄 Processing profile: ${profile.email} (ID: ${profile.id})`);
        
        const userRole = userRoles?.find(role => role.user_id === profile.id);
        console.log(`👤 Found role for ${profile.email}:`, userRole);
        
        const userProjectAccess = projectAccess?.filter(access => access.user_id === profile.id) || [];
        const assignedProjects = userProjectAccess.map((access: any) => access.projects?.project_name).filter(Boolean);
        
        console.log(`🔗 Project access for ${profile.email}:`, assignedProjects);
        
        const formattedUser = {
          ...profile,
          full_name: profile.full_name || profile.email || '',
          role: userRole?.role as UserRole,
          assignedProjects
        };
        
        console.log(`✅ Formatted user ${profile.email}:`, formattedUser);
        return formattedUser;
      }) || [];

      console.log('🎯 Final formatted users array:', formattedUsers);
      console.log('🎯 Total users to display:', formattedUsers.length);
      
      // Check specifically for Justin
      const justinUser = formattedUsers.find(user => user.email === 'justin@patientpromarketing.com');
      if (justinUser) {
        console.log('🎉 FOUND JUSTIN:', justinUser);
      } else {
        console.error('❌ JUSTIN NOT FOUND in formatted users');
        // Check if Justin exists in raw data
        const justinProfile = profiles?.find(p => p.email === 'justin@patientpromarketing.com');
        const justinRole = userRoles?.find(r => r.user_id === justinProfile?.id);
        console.log('🔍 Justin in profiles:', justinProfile);
        console.log('🔍 Justin role:', justinRole);
      }

      setUsers(formattedUsers);
      
      if (showToast) {
        toast({
          title: "Users Refreshed",
          description: `Loaded ${formattedUsers.length} users`,
        });
      }
      
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setInitialLoading(false);
      if (showRefreshIndicator) {
        setRefreshing(false);
      }
    }
  };


  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_name')
        .eq('active', true);

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const createUser = async () => {
    if (!newUser.email) {
      toast({
        title: "Error",
        description: "Email is required",
        variant: "destructive",
      });
      return;
    }

    if (newUser.role === 'project_user' && !newUser.selectedProjectId) {
      toast({
        title: "Error",
        description: "Please select a project for the project user",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      // Call the secure edge function to create user
      const { data, error } = await supabase.functions.invoke('create-user-with-role', {
        body: {
          email: newUser.email,
          password: newUser.password,
          fullName: newUser.fullName,
          role: newUser.role,
          projectId: newUser.role === 'project_user' ? newUser.selectedProjectId : null,
        },
      });

      if (error) {
        // Handle edge function errors (network, etc.)
        throw new Error(error.message || "Failed to create user");
      }

      if (data?.success) {
        // Send welcome email in the background (don't block on it)
        if (data.user?.id) {
          const passwordToSend = data.generatedPassword || newUser.password;
          sendWelcomeEmail(data.user.id, newUser.email, newUser.fullName, passwordToSend)
            .then(() => {
              console.log('Welcome email sent successfully');
            })
            .catch((emailError) => {
              console.error('Failed to send welcome email:', emailError);
              // Don't show error to user - email is non-critical
            });
        }

        toast({
          title: "Success",
          description: "User created successfully. Welcome email will be sent shortly.",
        });

        setShowCreateDialog(false);
        setNewUser({
          email: '',
          password: '',
          fullName: '',
          role: 'project_user',
          selectedProjectId: ''
        });
        setTimeout(() => fetchUsers(true), 500);
      } else {
        // Handle application-level errors returned from the edge function
        const errorMessage = data?.error || "Failed to create user";
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      
      // Provide user-friendly error messages
      let userMessage = error.message || "Failed to create user";
      
      // Check for specific error patterns
      if (userMessage.includes('already exists in the system')) {
        // This is already a user-friendly message from the edge function
      } else if (userMessage.includes('Edge Function returned a non-2xx status code')) {
        userMessage = "Unable to create user. Please check that the email is not already in use and try again.";
      }
      
      toast({
        title: "Error",
        description: userMessage,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };


  const startEdit = (user: User) => {
    setEditingUser(user);
    setEditUser({
      email: user.email,
      fullName: user.full_name,
      role: user.role || 'project_user',
      selectedProjectId: ''
    });
    setShowEditDialog(true);
  };

  const updateUser = async () => {
    if (!editingUser) return;

    setUpdating(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          email: editUser.email,
          full_name: editUser.fullName,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingUser.id);

      if (profileError) throw profileError;

      // Update role if changed
      if (editUser.role !== editingUser.role) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role: editUser.role })
          .eq('user_id', editingUser.id);

        if (roleError) throw roleError;
      }

      toast({
        title: "Success",
        description: "User updated successfully",
      });

      setShowEditDialog(false);
      setEditingUser(null);
      fetchUsers(true);
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const startDelete = (user: User) => {
    setDeletingUser(user);
    setShowDeleteDialog(true);
  };

  const deleteUser = async () => {
    if (!deletingUser) return;

    setDeleting(true);
    try {
      // Call edge function to delete user (requires service role permissions)
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('No authentication token found');
      }

      const supabaseUrl = 'https://bhabbokbhnqioykjimix.supabase.co';
      const response = await fetch(
        `${supabaseUrl}/functions/v1/delete-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: deletingUser.id }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user');
      }

      toast({
        title: "Success",
        description: "User deleted successfully",
      });

      setShowDeleteDialog(false);
      setDeletingUser(null);
      fetchUsers(true);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const resendWelcomeEmail = async (user: User) => {
    setResending(true);
    try {
      // Reset the welcome email flag
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          welcome_email_sent: false,
          welcome_email_sent_at: null,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Send the welcome email
      await sendWelcomeEmail(user.id, user.email, user.full_name);

      toast({
        title: "Success",
        description: `Welcome email sent to ${user.email}`,
      });

    } catch (error: any) {
      console.error('Error resending welcome email:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to resend welcome email",
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  const [showResetPasswordText, setShowResetPasswordText] = useState(false);

  const startResetPassword = (user: User) => {
    setResetPasswordUser(user);
    setResetPasswordValue('');
    setShowResetPasswordText(false);
    setShowResetDialog(true);
  };

  const handleResetPassword = async (useCustom: boolean) => {
    if (!resetPasswordUser) return;
    setResetLoading(true);
    try {
      const body: any = { userId: resetPasswordUser.id };
      if (useCustom && resetPasswordValue) {
        body.newPassword = resetPasswordValue;
      }

      const { data, error } = await supabase.functions.invoke('admin-reset-password', { body });

      if (error) throw new Error(error.message || 'Failed to reset password');
      if (data?.error) throw new Error(data.error);

      setShowResetDialog(false);

      if (data?.generatedPassword) {
        setGeneratedPassword(data.generatedPassword);
        setCopiedPassword(false);
        setShowGeneratedPasswordDialog(true);
      } else {
        toast({
          title: "Password Reset",
          description: `Password updated for ${resetPasswordUser.email}`,
        });
      }
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setResetLoading(false);
    }
  };

  const copyGeneratedPassword = async () => {
    try {
      await navigator.clipboard.writeText(generatedPassword);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    } catch {
      toast({ title: "Error", description: "Failed to copy to clipboard", variant: "destructive" });
    }
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'agent':
        return 'default';
      case 'project_user':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading users...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <CardTitle>User Management ({users.length} users)</CardTitle>
              <div className="space-x-2">
              <Button 
                onClick={() => fetchUsers(true, true)} 
                variant="outline"
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                    <DialogDescription>Fill in the details below to create a new user account.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password (Optional)</Label>
                      <Input
                        id="password"
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Leave blank to auto-generate"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        value={newUser.fullName}
                        onChange={(e) => setNewUser(prev => ({ ...prev, fullName: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select 
                        value={newUser.role} 
                        onValueChange={(value: UserRole) => setNewUser(prev => ({ ...prev, role: value, selectedProjectId: '' }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="agent">Agent</SelectItem>
                          <SelectItem value="project_user">Project User</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {newUser.role === 'project_user' && (
                      <div className="space-y-2">
                        <Label htmlFor="project">Assign to Project</Label>
                        <Select 
                          value={newUser.selectedProjectId} 
                          onValueChange={(value: string) => setNewUser(prev => ({ ...prev, selectedProjectId: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a project" />
                          </SelectTrigger>
                          <SelectContent>
                            {projects.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.project_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <Button onClick={createUser} className="w-full" disabled={creating}>
                      {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {creating ? 'Creating...' : 'Create User'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name, email, or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="project_user">Project User</SelectItem>
                </SelectContent>
              </Select>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.project_name}>
                      {project.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Newest First</SelectItem>
                  <SelectItem value="date-asc">Oldest First</SelectItem>
                  <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Projects</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users
                .filter(user => {
                  // Search filter
                  if (searchTerm) {
                    const search = searchTerm.toLowerCase();
                    const matchesSearch = 
                      user.email.toLowerCase().includes(search) ||
                      (user.full_name || '').toLowerCase().includes(search) ||
                      (user.role || '').toLowerCase().includes(search);
                    if (!matchesSearch) return false;
                  }
                  
                  // Role filter
                  if (roleFilter !== 'all' && user.role !== roleFilter) {
                    return false;
                  }
                  
                  // Project filter
                  if (projectFilter !== 'all') {
                    if (user.role === 'project_user') {
                      if (!user.assignedProjects?.includes(projectFilter)) {
                        return false;
                      }
                    } else {
                      // Non-project users have access to all projects
                      // Only show them if "All Projects" is selected
                      return false;
                    }
                  }
                  
                  return true;
                })
                .sort((a, b) => {
                  switch (sortBy) {
                    case 'date-desc':
                      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                    case 'date-asc':
                      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                    case 'name-asc':
                      return (a.full_name || '').localeCompare(b.full_name || '');
                    case 'name-desc':
                      return (b.full_name || '').localeCompare(a.full_name || '');
                    default:
                      return 0;
                  }
                })
                .map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.full_name}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role || 'project_user')}>
                      {user.role || 'project_user'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.role === 'project_user' ? (
                      user.assignedProjects && user.assignedProjects.length > 0 ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8">
                              {user.assignedProjects.length} project{user.assignedProjects.length !== 1 ? 's' : ''}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80">
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm">Assigned Projects</h4>
                              <ScrollArea className="h-[200px]">
                                <div className="space-y-1">
                                  {user.assignedProjects.map((project, index) => (
                                    <div key={index} className="text-sm py-1 px-2 rounded bg-muted">
                                      {project}
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <span className="text-sm text-muted-foreground">No projects assigned</span>
                      )
                    ) : (
                      <span className="text-sm text-muted-foreground">All projects</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      {user.role === 'project_user' && (
                        <ProjectUserManager 
                          userId={user.id} 
                          userEmail={user.email} 
                        />
                      )}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => resendWelcomeEmail(user)}
                        title="Resend Welcome Email"
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => startEdit(user)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => startResetPassword(user)}
                        title="Reset Password"
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => startDelete(user)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update the user's information below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editEmail">Email</Label>
              <Input
                id="editEmail"
                value={editUser.email}
                onChange={(e) => setEditUser(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editFullName">Full Name</Label>
              <Input
                id="editFullName"
                value={editUser.fullName}
                onChange={(e) => setEditUser(prev => ({ ...prev, fullName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editRole">Role</Label>
              <Select 
                value={editUser.role} 
                onValueChange={(value: UserRole) => setEditUser(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="project_user">Project User</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex space-x-2">
              <Button onClick={updateUser} className="flex-1" disabled={updating}>
                {updating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {updating ? 'Saving...' : 'Update User'}
              </Button>
              <Button variant="outline" onClick={() => setShowEditDialog(false)} className="flex-1" disabled={updating}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>This action is permanent and cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p>Are you sure you want to delete <strong>{deletingUser?.email}</strong>?</p>
            <p className="text-sm text-muted-foreground">
              This action cannot be undone. This will permanently delete the user account and all associated data.
            </p>
            <div className="flex space-x-2">
              <Button variant="destructive" onClick={deleteUser} className="flex-1" disabled={deleting}>
                {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {deleting ? 'Deleting...' : 'Delete User'}
              </Button>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="flex-1" disabled={deleting}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Set a new password for this user.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Reset password for <strong>{resetPasswordUser?.email}</strong>
            </p>
            <div className="space-y-2">
              <Label htmlFor="resetPassword">Custom Password (Optional)</Label>
              <div className="relative">
                <Input
                  id="resetPassword"
                  type={showResetPasswordText ? "text" : "password"}
                  value={resetPasswordValue}
                  onChange={(e) => setResetPasswordValue(e.target.value)}
                  placeholder="Leave blank to auto-generate"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowResetPasswordText(!showResetPasswordText)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showResetPasswordText ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button 
                onClick={() => handleResetPassword(true)} 
                className="flex-1" 
                disabled={resetLoading || !resetPasswordValue}
              >
                {resetLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Reset with Custom
              </Button>
              <Button 
                variant="secondary"
                onClick={() => handleResetPassword(false)} 
                className="flex-1" 
                disabled={resetLoading}
              >
                {resetLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Generate & Reset
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">All password resets are audit-logged.</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generated Password Dialog */}
      <Dialog open={showGeneratedPasswordDialog} onOpenChange={setShowGeneratedPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Password Generated</DialogTitle>
            <DialogDescription>Copy the generated password below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              A new password has been generated for <strong>{resetPasswordUser?.email}</strong>. Copy it now — it won't be shown again.
            </p>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={generatedPassword}
                className="font-mono"
              />
              <Button variant="outline" size="icon" onClick={copyGeneratedPassword}>
                {copiedPassword ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <Button className="w-full" onClick={() => setShowGeneratedPasswordDialog(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      
    </div>
  );
};

export default UserManagement;