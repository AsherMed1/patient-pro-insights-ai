
# Add Search Box to Projects

## Change

Add a search input field to `src/components/ProjectsManager.tsx` that filters project cards by name in real-time.

### Details

1. **Add state**: `const [searchQuery, setSearchQuery] = useState('');`

2. **Add search input** between the header and the card grid (inside `CardContent`, before the grid). It will be a simple `Input` with a search icon, placeholder "Search projects...", and a clear button when text is present.

3. **Filter the projects list**: Add a `.filter()` step in the existing chain (line 309) that checks `project.project_name.toLowerCase().includes(searchQuery.toLowerCase())`.

4. **Update empty state**: If the search returns no results but projects exist, show "No projects match your search" instead of the generic empty message.

### File: `src/components/ProjectsManager.tsx`

- Import `Input` from `@/components/ui/input` and `Search, X` from `lucide-react`
- Add `searchQuery` state variable
- Add a search bar with icon before the grid at ~line 300
- Add `.filter(project => project.project_name.toLowerCase().includes(searchQuery.toLowerCase()))` to the existing filter chain at line 309
- Show a "no matches" message when filtered list is empty but `projects.length > 0`
