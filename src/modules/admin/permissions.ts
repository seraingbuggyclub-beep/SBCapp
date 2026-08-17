import { ModulePermissionsMap, UserRole } from '@/types/models';

/**
 * Vérifie si l'adresse e-mail correspond au Super-Administrateur de SBC (Stéphane).
 */
export function isSuperAdmin(email: string | undefined | null): boolean {
  return email === 'stefga1@gmail.com';
}

/**
 * Valide si un membre possède une permission granulaire spécifique pour un module.
 * 
 * @param role Le rôle actuel du membre ('visitor' | 'member' | 'daily_member' | 'admin')
 * @param permissions L'objet de permissions JSONB stocké en base de données
 * @param moduleId L'identifiant du module (ex: 'config')
 * @param actionId L'identifiant de l'action (ex: 'edit')
 * @param email L'adresse e-mail (pour le bypass Super-Admin)
 */
export function hasPermission(
  role: UserRole | string | undefined | null,
  permissions: ModulePermissionsMap | null | undefined,
  moduleId: string,
  actionId: string,
  email?: string | null
): boolean {
  // Le Super-Admin possède TOUS les droits par défaut
  if (email && isSuperAdmin(email)) {
    return true;
  }

  // Seul le rôle 'admin' (administrateurs secondaires) peut avoir des droits granulaires
  if (role !== 'admin') {
    return false;
  }

  if (!permissions) {
    return false;
  }

  const modulePermissions = permissions[moduleId];
  if (!modulePermissions) {
    return false;
  }

  // Supporte à la fois les structures JSONB sous forme de tableaux: { config: ['view', 'edit'] }
  if (Array.isArray(modulePermissions)) {
    return modulePermissions.includes(actionId);
  }

  // Et sous forme de records: { config: { view: true, edit: true } }
  if (typeof modulePermissions === 'object' && modulePermissions !== null) {
    return !!(modulePermissions as Record<string, boolean>)[actionId];
  }

  return false;
}
