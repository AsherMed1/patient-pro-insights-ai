import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/hooks/useRole';
import { Plus, Edit, Trash2, RefreshCw } from 'lucide-react';
import ProjectUserManager from './ProjectUserManager';


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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
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

  useEffect(() => {
    fetchUsers();
    fetchProjects();
  }, []);

  const fetchUsers = async (showRefreshIndicator = false) => {
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
      
      toast({
        title: "Users Refreshed",
        description: `Loaded ${formattedUsers.length} users`,
      });
      
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
    if (!newUser.email || !newUser.password) {
      toast({
        title: "Error",
        description: "Email and password are required",
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

    setLoading(true);
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
        toast({
          title: "Success",
          description: "User created successfully",
        });

        setShowCreateDialog(false);
        setNewUser({
          email: '',
          password: '',
          fullName: '',
          role: 'project_user',
          selectedProjectId: ''
        });
        fetchUsers(true);
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
      setLoading(false);
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

    try {
      setLoading(true);

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
      setLoading(false);
    }
  };

  const startDelete = (user: User) => {
    setDeletingUser(user);
    setShowDeleteDialog(true);
  };

  const deleteUser = async () => {
    if (!deletingUser) return;

    try {
      setLoading(true);

      // Delete from project_user_access first (foreign key constraints)
      await supabase
        .from('project_user_access')
        .delete()
        .eq('user_id', deletingUser.id);

      // Delete from user_roles
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', deletingUser.id);

      // Delete from profiles
      await supabase
        .from('profiles')
        .delete()
        .eq('id', deletingUser.id);

      // Delete from auth.users using admin client
      const { error: authError } = await supabase.auth.admin.deleteUser(deletingUser.id);
      if (authError) {
        console.error('Error deleting auth user:', authError);
        // Continue anyway as the user might already be deleted from auth
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
      setLoading(false);
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

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>User Management ({users.length} users)</CardTitle>
            <div className="space-x-2">
              <Button 
                onClick={() => fetchUsers(true)} 
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
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
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
                    <Button onClick={createUser} className="w-full">
                      Create User
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
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
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.full_name}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role!)}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.role === 'project_user' ? (
                      <div className="space-y-1">
                        {user.assignedProjects && user.assignedProjects.length > 0 ? (
                          user.assignedProjects.map((project, index) => (
                            <Badge key={index} variant="outline" className="mr-1">
                              {project}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">No projects assigned</span>
                        )}
                      </div>
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
                      <Button variant="outline" size="sm" onClick={() => startEdit(user)}>
                        <Edit className="h-4 w-4" />
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
              <Button onClick={updateUser} className="flex-1">
                Update User
              </Button>
              <Button variant="outline" onClick={() => setShowEditDialog(false)} className="flex-1">
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
          </DialogHeader>
          <div className="space-y-4">
            <p>Are you sure you want to delete <strong>{deletingUser?.email}</strong>?</p>
            <p className="text-sm text-muted-foreground">
              This action cannot be undone. This will permanently delete the user account and all associated data.
            </p>
            <div className="flex space-x-2">
              <Button variant="destructive" onClick={deleteUser} className="flex-1">
                Delete User
              </Button>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      
    </div>
  );
};

export default UserManagement;