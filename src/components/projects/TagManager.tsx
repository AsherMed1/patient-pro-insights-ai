
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tag, Plus, Edit, Trash2 } from 'lucide-react';
import { useProjectTags } from './hooks/useProjectTags';
import { TagDialog } from './TagDialog';
import { ProjectTag } from './types/tagTypes';

interface TagManagerProps {
  projectId: string;
  projectName: string;
}

const TagManager = ({ projectId, projectName }: TagManagerProps) => {
  const { tags, loading, createTag, updateTag, deleteTag } = useProjectTags(projectId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<ProjectTag | null>(null);

  const handleCreateTag = async (tagData: { tag_name: string; tag_color: string; tag_description?: string }) => {
    await createTag({
      project_id: projectId,
      ...tagData
    });
    setIsDialogOpen(false);
  };

  const handleEditTag = async (tagData: { tag_name: string; tag_color: string; tag_description?: string }) => {
    if (editingTag) {
      await updateTag(editingTag.id, tagData);
      setEditingTag(null);
      setIsDialogOpen(false);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (confirm('Are you sure you want to delete this tag? This will remove it from all appointments.')) {
      await deleteTag(tagId);
    }
  };

  const openEditDialog = (tag: ProjectTag) => {
    setEditingTag(tag);
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingTag(null);
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <span>Loading tags...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Tag className="h-5 w-5" />
                <span>Tag Manager</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage custom tags for {projectName} appointments
              </p>
            </div>
            <Button onClick={openCreateDialog} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Tag
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {tags.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Tag className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No tags created yet</p>
              <p className="text-sm mb-4">Create your first tag to start organizing appointments</p>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-1" />
                Create First Tag
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <Badge
                      variant="secondary"
                      style={{ backgroundColor: tag.tag_color, color: 'white' }}
                      className="font-medium"
                    >
                      {tag.tag_name}
                    </Badge>
                    <div className="flex-1">
                      {tag.tag_description && (
                        <p className="text-sm text-gray-600">{tag.tag_description}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        Used on {tag.appointment_count || 0} appointment{tag.appointment_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(tag)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTag(tag.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TagDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingTag(null);
        }}
        onSave={editingTag ? handleEditTag : handleCreateTag}
        tag={editingTag}
      />
    </>
  );
};

export default TagManager;
