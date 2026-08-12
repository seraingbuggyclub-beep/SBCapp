import React from 'react';
import { MODULES_REGISTRY } from '../permissions.config';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

interface PermissionsMatrixProps {
  permissions: Record<string, string[]>;
  onChange: (newPermissions: Record<string, string[]>) => void;
  disabled?: boolean;
}

export function PermissionsMatrix({ permissions = {}, onChange, disabled = false }: PermissionsMatrixProps) {
  
  const handleTogglePermission = (moduleId: string, actionId: string) => {
    if (disabled) return;

    // Normalisation des permissions actuelles du module pour gérer les formats tableau et objet
    const currentModulePermissions = permissions[moduleId] || [];
    let updatedModulePermissions: string[] = [];

    if (Array.isArray(currentModulePermissions)) {
      if (currentModulePermissions.includes(actionId)) {
        updatedModulePermissions = currentModulePermissions.filter((id) => id !== actionId);
      } else {
        updatedModulePermissions = [...currentModulePermissions, actionId];
      }
    } else if (typeof currentModulePermissions === 'object') {
      // Cas de conversion d'un ancien format objet en tableau
      const keys = Object.keys(currentModulePermissions).filter(
        (key) => !!(currentModulePermissions as any)[key]
      );
      if (keys.includes(actionId)) {
        updatedModulePermissions = keys.filter((id) => id !== actionId);
      } else {
        updatedModulePermissions = [...keys, actionId];
      }
    } else {
      updatedModulePermissions = [actionId];
    }

    const nextPermissions = {
      ...permissions,
      [moduleId]: updatedModulePermissions,
    };

    onChange(nextPermissions);
  };

  const isChecked = (moduleId: string, actionId: string): boolean => {
    const modulePermissions = permissions[moduleId];
    if (!modulePermissions) return false;

    if (Array.isArray(modulePermissions)) {
      return modulePermissions.includes(actionId);
    }
    
    if (typeof modulePermissions === 'object') {
      return !!(modulePermissions as any)[actionId];
    }

    return false;
  };

  return (
    <div className="premium-card p-4 rounded bg-[#101010]/80 border border-[#353535] space-y-4 text-xs font-mono">
      <div className="flex items-center gap-2 border-b border-[#353535]/60 pb-2">
        <ShieldCheck className="w-4 h-4 text-primary" />
        <span className="font-bold text-[11px] uppercase tracking-wider text-white">
          Configuration des droits d'accès
        </span>
      </div>

      <div className="space-y-4 divide-y divide-[#353535]/30">
        {MODULES_REGISTRY.map((module) => (
          <div key={module.id} className="pt-3 first:pt-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="max-w-md">
              <div className="text-white text-xs font-bold font-sans">
                {module.label}
              </div>
              <p className="text-[10px] text-foreground/45 leading-relaxed font-sans">
                {module.description}
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              {module.actions.map((action) => {
                const checked = isChecked(module.id, action.id);
                return (
                  <label
                    key={action.id}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-all select-none cursor-pointer ${
                      checked
                        ? 'bg-primary/5 border-primary/40 text-primary hover:bg-primary/10'
                        : 'bg-surface border-[#353535]/60 text-foreground/40 hover:border-foreground/20 hover:text-foreground/60'
                    } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => handleTogglePermission(module.id, action.id)}
                      className="hidden"
                    />
                    <div
                      className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-all ${
                        checked
                          ? 'border-primary bg-primary text-black'
                          : 'border-[#353535]/80 bg-background'
                      }`}
                    >
                      {checked && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-2.5 h-2.5"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      {action.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {disabled && (
        <div className="p-2 rounded bg-secondary/5 border border-secondary/15 text-secondary text-[10px] flex items-center gap-2 mt-2 leading-relaxed">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
          <span>Lecture seule. Seul le Super-Administrateur peut modifier ces autorisations.</span>
        </div>
      )}
    </div>
  );
}
