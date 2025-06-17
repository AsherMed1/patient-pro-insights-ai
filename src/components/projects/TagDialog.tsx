
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ProjectTag } from './types/tagTypes';

interface TagDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tagData: { tag_name: string; tag_color: string; tag_description?: string }) => void;
  tag?: ProjectTag | null;
}

const DEFAULT_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6B7280', // Gray
];

export const TagDialog = ({ isOpen, onClose, onSave, tag }: TagDialogProps) => {
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState(DEFAULT_COLORS[0]);
  const [tagDescription, setTagDescription] = useState('');

  useEffect(() => {
    if (tag) {
      setTagName(tag.tag_name);
      setTagColor(tag.tag_color);
      setTagDescription(tag.tag_description || '');
    } else {
      setTagName('');
      setTagColor(DEFAULT_COLORS[0]);
      setTagDescription('');
    }
  }, [tag, isOpen]);

  const handleSave = () => {
    if (tagName.trim()) {
      onSave({
        tag_name: tagName.trim(),
        tag_color: tagColor,
        tag_description: tagDescription.trim() || undefined,
      });
    }
  };

  const handleClose = () => {
    setTagName('');
    setTagColor(DEFAULT_COLORS[0]);
    setTagDescription('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {tag ? 'Edit Tag' : 'Create New Tag'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tag-name">Tag Name</Label>
            <Input
              id="tag-name"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              placeholder="Enter tag name"
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label>Tag Color</Label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setTagColor(color)}
                  className={`w-8 h-8 rounded-full border-2 ${
                    tagColor === color ? 'border-gray-800' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="mt-2">
              <Label htmlFor="custom-color">Custom Color</Label>
              <Input
                id="custom-color"
                type="color"
                value={tagColor}
                onChange={(e) => setTagColor(e.target.value)}
                className="w-20 h-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tag-description">Description (Optional)</Label>
            <Textarea
              id="tag-description"
              value={tagDescription}
              onChange={(e) => setTagDescription(e.target.value)}
              placeholder="Enter tag description"
              rows={3}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label>Preview</Label>
            <div>
              <Badge
                variant="secondary"
                style={{ backgroundColor: tagColor, color: 'white' }}
                className="font-medium"
              >
                {tagName || 'Tag Name'}
              </Badge>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!tagName.trim()}
            >
              {tag ? 'Update Tag' : 'Create Tag'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
