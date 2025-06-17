
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProjectTag } from '@/components/projects/types/tagTypes';

interface TagFilterProps {
  selectedTag: string | null;
  availableTags: ProjectTag[];
  onTagChange: (tagId: string) => void;
}

const TagFilter = ({ selectedTag, availableTags, onTagChange }: TagFilterProps) => {
  if (availableTags.length === 0) return null;

  return (
    <div className="flex-1 min-w-[200px]">
      <label className="text-sm font-medium mb-2 block">Filter by Tag</label>
      <Select value={selectedTag || 'all'} onValueChange={onTagChange}>
        <SelectTrigger>
          <SelectValue placeholder="All tags" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Tags</SelectItem>
          {availableTags.map(tag => (
            <SelectItem key={tag.id} value={tag.id}>
              <div className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: tag.tag_color }}
                />
                <span>{tag.tag_name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default TagFilter;
