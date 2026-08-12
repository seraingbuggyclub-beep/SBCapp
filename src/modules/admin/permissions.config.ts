export interface ModulePermission {
  id: string;          // Identifiant technique du module (ex: 'members')
  label: string;       // Nom convivial affiché dans l'interface (ex: 'Membres')
  description: string; // Description de ce que permet le module
  actions: {
    id: string;        // Identifiant de l'action (ex: 'view', 'edit')
    label: string;     // Nom convivial de l'action (ex: 'Consulter', 'Modifier')
  }[];
}

export const MODULES_REGISTRY: ModulePermission[] = [
  {
    id: 'members',
    label: 'Membres & Rôles',
    description: 'Gestion de la liste des pilotes, cotisations et rôles.',
    actions: [
      { id: 'view', label: 'Consulter' },
      { id: 'edit', label: 'Modifier' },
    ]
  },
  {
    id: 'events',
    label: 'Événements',
    description: 'Gestion des courses et des inscriptions pilotes.',
    actions: [
      { id: 'view', label: 'Consulter' },
      { id: 'edit', label: 'Gérer' },
    ]
  },
  {
    id: 'presence',
    label: 'Présences',
    description: 'Suivi de la piste et de la présence des pilotes.',
    actions: [
      { id: 'view', label: 'Consulter' },
      { id: 'edit', label: 'Gérer' },
    ]
  },
  {
    id: 'config',
    label: 'Configuration Club',
    description: 'Paramètres généraux du club (Code cadenas, géolocalisation).',
    actions: [
      { id: 'view', label: 'Consulter' },
      { id: 'edit', label: 'Modifier' },
    ]
  }
];
