
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import type { ProjectTag } from './types/tagTypes';

interface TagDialogProps {
  projectId: string;
  tag?: ProjectTag;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const TagDialog = ({ projectId, tag, open, onOpenChange, onSuccess }: TagDialogProps) => {
  const [tagName, setTagName] = useState(tag?.tag_name || '');
  const [tagColor, setTagColor] = useState(tag?.tag_color || '#3B82F6');
  const [tagDescription, setTagDescription] = useState(tag?.tag_description || '');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagName.trim()) return;

    setLoading(true);
    try {
      const tagData = {
        project_id: projectId,
        tag_name: tagName.trim(),
        tag_color: tagColor,
        tag_description: tagDescription.trim() || null,
      };

      if (tag) {
        const { error } = await supabase
          .from('project_tags')
          .update(tagData)
          .eq('id', tag.id);
        
        if (error) throw error;
        toast({ title: 'Tag updated successfully' });
      } else {
        const { error } = await supabase
          .from('project_tags')
          .insert(tagData);
        
        if (error) throw error;
        toast({ title: 'Tag created successfully' });
      }

      onSuccess();
      onOpenChange(false);
      setTagName('');
      setTagColor('#3B82F6');
      setTagDescription('');
    } catch (error) {
      console.error('Error saving tag:', error);
      toast({
        title: 'Error',
        description: 'Failed to save tag. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{tag ? 'Edit Tag' : 'Create New Tag'}</DialogTitle>
          <DialogDescription>
            {tag ? 'Update the tag details below.' : 'Create a new tag to organize your appointments and data.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tagName">Tag Name</Label>
            <Input
              id="tagName"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              placeholder="Enter tag name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tagColor">Color</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="tagColor"
                type="color"
                value={tagColor}
                onChange={(e) => setTagColor(e.target.value)}
                className="w-16 h-10"
              />
              <Input
                value={tagColor}
                onChange={(e) => setTagColor(e.target.value)}
                placeholder="#3B82F6"
                className="flex-1"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tagDescription">Description (Optional)</Label>
            <Input
              id="tagDescription"
              value={tagDescription}
              onChange={(e) => setTagDescription(e.target.value)}
              placeholder="Enter tag description"
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (tag ? 'Update Tag' : 'Create Tag')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
