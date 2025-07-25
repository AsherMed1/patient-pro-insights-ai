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
import { Plus, Edit, Trash2 } from 'lucide-react';
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
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'project_user' as UserRole
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
    fetchProjects();
  }, []);

  const fetchUsers = async () => {
    try {
      // Get profiles first
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at');

      if (profilesError) throw profilesError;

      // Get user roles separately
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Get project access for project users
      const { data: projectAccess, error: accessError } = await supabase
        .from('project_user_access')
        .select(`
          user_id,
          projects(project_name)
        `);

      if (accessError) {
        console.error('Error fetching project access:', accessError);
      }

      // Combine the data
      const formattedUsers = profiles?.map((profile: any) => {
        const userRole = userRoles?.find(role => role.user_id === profile.id);
        const userProjectAccess = projectAccess?.filter(access => access.user_id === profile.id) || [];
        const assignedProjects = userProjectAccess.map((access: any) => access.projects?.project_name).filter(Boolean);
        
        return {
          ...profile,
          role: userRole?.role as UserRole,
          assignedProjects
        };
      }) || [];

      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
    try {
      // Create the auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newUser.email,
        password: newUser.password,
        user_metadata: {
          full_name: newUser.fullName
        },
        email_confirm: true
      });

      if (authError) throw authError;

      // Assign role
      if (authData.user) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            role: newUser.role
          });

        if (roleError) throw roleError;
      }

      toast({
        title: "Success",
        description: "User created successfully",
      });

      setShowCreateDialog(false);
      setNewUser({
        email: '',
        password: '',
        fullName: '',
        role: 'project_user'
      });
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    }
  };

  const createDummyAccounts = async () => {
    const dummyUsers = [
      {
        email: 'admin@example.com',
        password: 'admin123',
        fullName: 'Admin User',
        role: 'admin' as UserRole
      },
      {
        email: 'agent@example.com',
        password: 'agent123',
        fullName: 'Agent User',
        role: 'agent' as UserRole
      },
      {
        email: 'projectuser@example.com',
        password: 'project123',
        fullName: 'Project User',
        role: 'project_user' as UserRole
      }
    ];

    for (const user of dummyUsers) {
      try {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          user_metadata: {
            full_name: user.fullName
          },
          email_confirm: true
        });

        if (authError) {
          console.error(`Error creating ${user.email}:`, authError);
          continue;
        }

        if (authData.user) {
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: authData.user.id,
              role: user.role
            });

          if (roleError) {
            console.error(`Error assigning role to ${user.email}:`, roleError);
          }

          // If project user, assign to first project
          if (user.role === 'project_user' && projects.length > 0) {
            const { error: accessError } = await supabase
              .from('project_user_access')
              .insert({
                user_id: authData.user.id,
                project_id: projects[0].id
              });

            if (accessError) {
              console.error(`Error assigning project access to ${user.email}:`, accessError);
            }
          }
        }
      } catch (error) {
        console.error(`Error creating dummy user ${user.email}:`, error);
      }
    }

    toast({
      title: "Success",
      description: "Dummy accounts created successfully",
    });

    fetchUsers();
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
            <CardTitle>User Management</CardTitle>
            <div className="space-x-2">
              <Button onClick={createDummyAccounts} variant="outline">
                Create Dummy Accounts
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
                        onValueChange={(value: UserRole) => setNewUser(prev => ({ ...prev, role: value }))}
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
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;