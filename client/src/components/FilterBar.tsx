/*
 * FilterBar.tsx — Observatory Design
 * Collapsible filter bar with multi-select toggles for:
 *   Theme, Institution, Program Level, School, and text search.
 * Cyan accents, dark panels, pill-style active filters.
 */

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Filter,
  X,
  Search,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface FilterState {
  themes: string[];
  institutions: string[];
  programLevels: string[];
  schools: string[];
  searchQuery: string;
}

interface FilterBarProps {
  availableThemes: string[];
  availableInstitutions: string[];
  availableProgramLevels: string[];
  availableSchools: string[];
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

function FilterGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const allSelected = selected.length === 0;

  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
        {label}
        {!allSelected && (
          <span className="ml-1.5 text-primary font-mono">
            ({selected.length}/{options.length})
          </span>
        )}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => {
            if (!allSelected) {
              // Clear all selections (= show all)
              selected.forEach((s) => onToggle(s));
            }
          }}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 border ${
            allSelected
              ? "bg-primary/15 border-primary/40 text-primary"
              : "bg-secondary/30 border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
          }`}
        >
          All
        </button>
        {options.map((opt) => {
          const isActive = selected.includes(opt);
          return (
            <button
              key={opt}
              onClick={() => onToggle(opt)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 border ${
                isActive
                  ? "bg-primary/15 border-primary/40 text-primary"
                  : "bg-secondary/30 border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function FilterBar({
  availableThemes,
  availableInstitutions,
  availableProgramLevels,
  availableSchools,
  filters,
  onChange,
}: FilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.themes.length > 0) count++;
    if (filters.institutions.length > 0) count++;
    if (filters.programLevels.length > 0) count++;
    if (filters.schools.length > 0) count++;
    if (filters.searchQuery.trim()) count++;
    return count;
  }, [filters]);

  const toggleItem = (
    key: keyof Omit<FilterState, "searchQuery">,
    value: string
  ) => {
    const current = filters[key];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ ...filters, [key]: next });
  };

  const resetAll = () => {
    onChange({
      themes: [],
      institutions: [],
      programLevels: [],
      schools: [],
      searchQuery: "",
    });
  };

  return (
    <div className="mb-6">
      {/* Collapsed bar */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className={`gap-2 text-xs border-border/60 ${
            activeFilterCount > 0
              ? "border-primary/40 text-primary bg-primary/5"
              : "text-muted-foreground"
          }`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <Filter className="w-3.5 h-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-mono font-bold">
              {activeFilterCount}
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-3 h-3 ml-0.5" />
          ) : (
            <ChevronDown className="w-3 h-3 ml-0.5" />
          )}
        </Button>

        {/* Inline search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search themes..."
            value={filters.searchQuery}
            onChange={(e) =>
              onChange({ ...filters, searchQuery: e.target.value })
            }
            className="w-full h-8 pl-8 pr-8 rounded-md border border-border/60 bg-secondary/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
          />
          {filters.searchQuery && (
            <button
              onClick={() => onChange({ ...filters, searchQuery: "" })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Active filter pills (collapsed view) */}
        {!isExpanded && activeFilterCount > 0 && (
          <div className="hidden md:flex items-center gap-1.5 flex-wrap">
            {filters.themes.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/30 text-[10px] text-primary font-medium">
                {filters.themes.length} theme{filters.themes.length > 1 ? "s" : ""}
              </span>
            )}
            {filters.institutions.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-400 font-medium">
                {filters.institutions.length} institution{filters.institutions.length > 1 ? "s" : ""}
              </span>
            )}
            {filters.programLevels.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-400 font-medium">
                {filters.programLevels.length} level{filters.programLevels.length > 1 ? "s" : ""}
              </span>
            )}
            {filters.schools.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-[10px] text-rose-400 font-medium">
                {filters.schools.length} school{filters.schools.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={resetAll}
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
        )}
      </div>

      {/* Expanded filter panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-3 p-5 panel border border-border/60 space-y-5">
              <FilterGroup
                label="Themes"
                options={availableThemes}
                selected={filters.themes}
                onToggle={(v) => toggleItem("themes", v)}
              />
              <div className="grid sm:grid-cols-3 gap-5">
                <FilterGroup
                  label="Institution"
                  options={availableInstitutions}
                  selected={filters.institutions}
                  onToggle={(v) => toggleItem("institutions", v)}
                />
                <FilterGroup
                  label="Program Level"
                  options={availableProgramLevels}
                  selected={filters.programLevels}
                  onToggle={(v) => toggleItem("programLevels", v)}
                />
                <FilterGroup
                  label="School"
                  options={availableSchools}
                  selected={filters.schools}
                  onToggle={(v) => toggleItem("schools", v)}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
