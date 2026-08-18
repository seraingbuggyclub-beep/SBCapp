'use client';

import React from 'react';
import { X, Download, Users } from 'lucide-react';
import { ClubEvent, SelectedCategoryItem, SelectedMealItem } from '@/types/models';
import { formatCurrency } from '@/lib/utils/formatters';

export interface EventRegistrationAdminItem {
  id: string;
  race_category: string;
  food_options: string[] | null;
  selected_meals: SelectedMealItem[] | null;
  selected_categories: SelectedCategoryItem[] | null;
  transponder_id: string | null;
  total_paid: number;
  created_at: string | null;
  sbc_members: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    license_number: string | null;
  } | null;
}

interface EventRegistrationsDrawerProps {
  event: ClubEvent | null;
  registrations: EventRegistrationAdminItem[];
  loading: boolean;
  onClose: () => void;
}

export default function EventRegistrationsDrawer({
  event,
  registrations,
  loading,
  onClose,
}: EventRegistrationsDrawerProps) {
  if (!event) return null;

  const handleExportCsv = () => {
    if (registrations.length === 0) return;
    const headers = ['Nom', 'Prénom', 'Email', 'Téléphone', 'Licence FBA', 'Catégorie', 'Transpondeur', 'Repas', 'Total Payé'];
    const rows = registrations.map((r) => [
      r.sbc_members?.last_name || '',
      r.sbc_members?.first_name || '',
      r.sbc_members?.email || '',
      r.sbc_members?.phone || '',
      r.sbc_members?.license_number || '',
      r.race_category || '',
      r.transponder_id || 'Location club',
      (r.food_options || []).join(' + '),
      formatCurrency(r.total_paid),
    ]);

    const csvContent = [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `inscrits_${event.title.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="premium-card rounded-lg max-w-3xl w-full border border-primary/40 overflow-hidden max-h-[85vh] flex flex-col">
        <div className="p-5 bg-surface-dim border-b border-[#353535] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-primary uppercase font-bold tracking-wider">
              Registre des Engagés
            </span>
            <h3 className="font-anybody font-black text-lg text-white uppercase sport-skew">
              {event.title}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            {registrations.length > 0 && (
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary/10 hover:bg-primary/20 border border-primary/40 text-primary font-mono text-xs font-bold uppercase transition-all cursor-pointer"
                title="Exporter la liste au format CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded text-foreground/40 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          {loading ? (
            <div className="p-8 text-center font-mono text-xs text-foreground/50">
              Chargement des inscriptions...
            </div>
          ) : registrations.length === 0 ? (
            <div className="p-8 text-center font-mono text-xs text-foreground/50 border border-[#353535] rounded">
              <Users className="w-8 h-8 mx-auto text-foreground/20 mb-2" />
              <p>Aucun pilote inscrit pour le moment.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#353535] border border-[#353535] rounded overflow-hidden">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-surface-dim text-[10px] text-foreground/40 uppercase">
                  <tr>
                    <th className="p-3">Pilote</th>
                    <th className="p-3">Catégories</th>
                    <th className="p-3">Transpondeur</th>
                    <th className="p-3">Repas</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#353535]/50">
                  {registrations.map((reg) => (
                    <tr key={reg.id} className="hover:bg-surface-high/20">
                      <td className="p-3">
                        <div className="font-bold text-white font-sans">
                          {reg.sbc_members?.first_name} {reg.sbc_members?.last_name}
                        </div>
                        <div className="text-[10px] text-foreground/40">
                          {reg.sbc_members?.phone || reg.sbc_members?.email}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-primary font-bold">{reg.race_category}</span>
                      </td>
                      <td className="p-3 text-foreground/60">
                        {reg.transponder_id || 'Location club'}
                      </td>
                      <td className="p-3 text-[11px] text-foreground/80">
                        {Array.isArray(reg.food_options) && reg.food_options.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {reg.food_options.map((opt: string, idx: number) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-bold text-[10px]"
                              >
                                {opt}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-foreground/40 italic">Aucun repas</span>
                        )}
                      </td>
                      <td className="p-3 text-right font-bold text-success">
                        {formatCurrency(reg.total_paid)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
