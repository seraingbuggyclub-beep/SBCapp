import React from 'react';
import { MODULES_REGISTRY } from '../permissions.config';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { ModulePermissionsMap } from '@/types/models';

interface PermissionsMatrixProps {
  permissions: ModulePermissionsMap;
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
    } else if (typeof currentModulePermissions === 'object' && currentModulePermissions !== null) {
      // Cas de conversion d'un ancien format objet en tableau
      const record = currentModulePermissions as Record<string, boolean>;
      const keys = Object.keys(record).filter((key) => !!record[key]);
      if (keys.includes(actionId)) {
        updatedModulePermissions = keys.filter((id) => id !== actionId);
      } else {
        updatedModulePermissions = [...keys, actionId];
      }
    } else {
      updatedModulePermissions = [actionId];
    }

    const nextPermissions: Record<string, string[]> = {};
    for (const [mod, acts] of Object.entries(permissions)) {
      if (Array.isArray(acts)) {
        nextPermissions[mod] = acts;
      } else if (typeof acts === 'object' && acts !== null) {
        nextPermissions[mod] = Object.keys(acts).filter((k) => !!(acts as Record<string, boolean>)[k]);
      }
    }
    nextPermissions[moduleId] = updatedModulePermissions;

    onChange(nextPermissions);
  };

  const isChecked = (moduleId: string, actionId: string): boolean => {
    const modulePermissions = permissions[moduleId];
    if (!modulePermissions) return false;

    if (Array.isArray(modulePermissions)) {
      return modulePermissions.includes(actionId);
    }
    
    if (typeof modulePermissions === 'object' && modulePermissions !== null) {
      return !!(modulePermissions as Record<string, boolean>)[actionId];
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
              <div className="flex items-center gap-2">
                <span className="font-bold text-white uppercase text-[12px]">{module.label}</span>
                <span className="text-[10px] text-[#A0A0A0] bg-[#202020] px-1.5 py-0.5 rounded border border-[#353535]">
                  {module.id}
                </span>
              </div>
              <p className="text-[11px] text-[#A0A0A0] mt-0.5">{module.description}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {module.actions.map((action) => {
                const active = isChecked(module.id, action.id);
                return (
                  <label
                    key={action.id}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded border text-[11px] cursor-pointer transition-colors ${
                      active
                        ? 'bg-primary/10 border-primary text-primary font-bold shadow-[0_0_8px_rgba(255,107,0,0.2)]'
                        : 'bg-[#151515] border-[#353535] text-[#A0A0A0] hover:text-white'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={active}
                      disabled={disabled}
                      onChange={() => handleTogglePermission(module.id, action.id)}
                    />
                    <div
                      className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-colors ${
                        active ? 'bg-primary border-primary text-black' : 'border-[#444]'
                      }`}
                    >
                      {active && <span className="text-[10px] leading-none font-bold">✓</span>}
                    </div>
                    <span>{action.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {disabled && (
        <div className="flex items-center gap-2 text-warning/80 bg-warning/10 p-2.5 rounded border border-warning/20 text-[11px] mt-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>
            Les droits sont gérés uniquement pour les administrateurs secondaires. Les membres ou visiteurs ne peuvent pas recevoir de permissions individuelles.
          </span>
        </div>
      )}
    </div>
  );
}
