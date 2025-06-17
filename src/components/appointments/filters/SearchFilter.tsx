
import React from 'react';
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchFilterProps {
  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const SearchFilter = ({ searchTerm, onSearchChange }: SearchFilterProps) => {
  return (
    <div className="flex-1 min-w-[200px]">
      <label className="text-sm font-medium mb-2 block">Search by Name</label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          type="text"
          placeholder="Search appointments by lead name..."
          value={searchTerm}
          onChange={onSearchChange}
          className="pl-10"
        />
      </div>
    </div>
  );
};

export default SearchFilter;
