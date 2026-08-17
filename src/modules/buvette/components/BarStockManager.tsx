'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarItem,
  ShoppingListItem,
} from '@/types/models';
import {
  getAllBarItemsWithStats,
  addBarStockEntry,
  adjustBarInventory,
  getBarShoppingList,
  upsertBarItem,
} from '../actions';
import {
  Package,
  ShoppingCart,
  ClipboardCheck,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Boxes,
  Euro,
  RefreshCw,
  Edit2,
  Save,
  X,
  Tag,
  CheckSquare,
  Square,
  Layers,
  ArrowDownCircle,
} from 'lucide-react';

export default function BarStockManager() {
  const [activeTab, setActiveTab] = useState<'stocks' | 'entry' | 'inventory' | 'shopping'>('stocks');
  const [items, setItems] = useState<BarItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Notifications
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Formulaire Entrée de stock
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [entryQty, setEntryQty] = useState<string>('24');
  const [entryCostPrice, setEntryCostPrice] = useState<string>('0.65');
  const [entryReason, setEntryReason] = useState<string>('Achat Makro / Grossiste');
  const [entryLoading, setEntryLoading] = useState(false);

  // Formulaire Inventaire
  const [inventoryCounts, setInventoryCounts] = useState<{ [itemId: string]: number }>({});
  const [inventoryReason, setInventoryReason] = useState('Inventaire périodique');
  const [inventoryLoading, setInventoryLoading] = useState(false);

  // Modal Édition / Nouvel article
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<BarItem> | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  // Checklist courses
  const [checkedItems, setCheckedItems] = useState<{ [itemId: string]: boolean }>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    const [itemsRes, shopRes] = await Promise.all([
      getAllBarItemsWithStats(),
      getBarShoppingList(),
    ]);

    setItems(itemsRes.data || []);
    setCategories(itemsRes.categories || []);
    setShoppingList(shopRes.data || []);

    // Initialiser les comptages d'inventaire
    const counts: { [id: string]: number } = {};
    (itemsRes.data || []).forEach((item) => {
      counts[item.id] = item.stock_quantity;
    });
    setInventoryCounts(counts);

    if (itemsRes.data && itemsRes.data.length > 0 && !selectedItemId) {
      setSelectedItemId(itemsRes.data[0].id);
    }

    setLoading(false);
  }, [selectedItemId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // KPIs de Stock
  const metrics = useMemo(() => {
    const totalSellingValue = items.reduce(
      (sum, i) => sum + i.selling_price * i.stock_quantity,
      0
    );
    const totalCostValue = items.reduce(
      (sum, i) => sum + i.cost_price * i.stock_quantity,
      0
    );
    const potentialMargin = totalSellingValue - totalCostValue;
    const alertCount = items.filter((i) => i.stock_quantity <= i.alert_threshold).length;

    return { totalSellingValue, totalCostValue, potentialMargin, alertCount, totalItems: items.length };
  }, [items]);

  // Filtrage des articles
  const filteredItems = useMemo(() => {
    return items.filter((i) =>
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.category?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [items, searchQuery]);

  // Soumission Entrée de stock
  const handleStockEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || Number(entryQty) <= 0) return;

    setEntryLoading(true);
    setMsg(null);

    const res = await addBarStockEntry(
      selectedItemId,
      Number(entryQty),
      Number(entryCostPrice),
      entryReason
    );
    setEntryLoading(false);

    if (res.success) {
      setMsg({ text: 'Entrée de stock enregistrée avec succès !', type: 'success' });
      loadData();
    } else {
      setMsg({ text: res.error || "Erreur lors de l'entrée de stock", type: 'error' });
    }
  };

  // Soumission Inventaire
  const handleSaveInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    setInventoryLoading(true);
    setMsg(null);

    const adjustments = items.map((item) => ({
      itemId: item.id,
      countedQuantity: inventoryCounts[item.id] ?? item.stock_quantity,
      reason: inventoryReason,
    }));

    const res = await adjustBarInventory(adjustments);
    setInventoryLoading(false);

    if (res.success) {
      setMsg({ text: 'Inventaire physique validé et stocks ajustés !', type: 'success' });
      loadData();
    } else {
      setMsg({ text: res.error || "Erreur lors de l'inventaire", type: 'error' });
    }
  };

  // Soumission Nouvel / Édition article
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.name || !editingItem.category_id) return;

    setEditLoading(true);
    const res = await upsertBarItem(editingItem);
    setEditLoading(false);

    if (res.success) {
      setMsg({ text: 'Article enregistré avec succès !', type: 'success' });
      setEditModalOpen(false);
      setEditingItem(null);
      loadData();
    } else {
      setMsg({ text: res.error || "Erreur d'enregistrement", type: 'error' });
    }
  };

  const toggleCheck = (itemId: string) => {
    setCheckedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  return (
    <div className="space-y-6">
      {/* Navigation Sous-onglets */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface border border-[#353535] p-3.5 rounded-2xl">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('stocks')}
            className={`px-3 py-2 rounded-lg font-anybody font-bold text-xs uppercase tracking-wider transition-all sport-skew flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'stocks'
                ? 'bg-primary text-black shadow-[2px_2px_0px_#000]'
                : 'bg-surface-high border border-[#353535] text-foreground/70 hover:text-white'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span className="transform skew-x-8">État des Stocks</span>
          </button>

          <button
            onClick={() => setActiveTab('entry')}
            className={`px-3 py-2 rounded-lg font-anybody font-bold text-xs uppercase tracking-wider transition-all sport-skew flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'entry'
                ? 'bg-primary text-black shadow-[2px_2px_0px_#000]'
                : 'bg-surface-high border border-[#353535] text-foreground/70 hover:text-white'
            }`}
          >
            <ArrowDownCircle className="w-3.5 h-3.5" />
            <span className="transform skew-x-8">Entrée / Achat</span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-2 rounded-lg font-anybody font-bold text-xs uppercase tracking-wider transition-all sport-skew flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'inventory'
                ? 'bg-primary text-black shadow-[2px_2px_0px_#000]'
                : 'bg-surface-high border border-[#353535] text-foreground/70 hover:text-white'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span className="transform skew-x-8">Inventaire Physique</span>
          </button>

          <button
            onClick={() => setActiveTab('shopping')}
            className={`px-3 py-2 rounded-lg font-anybody font-bold text-xs uppercase tracking-wider transition-all sport-skew flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'shopping'
                ? 'bg-primary text-black shadow-[2px_2px_0px_#000]'
                : 'bg-surface-high border border-[#353535] text-foreground/70 hover:text-white'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span className="transform skew-x-8">
              Liste de Courses ({shoppingList.length})
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingItem({
                category_id: categories[0]?.id || '',
                name: '',
                selling_price: 2.0,
                cost_price: 0.65,
                stock_quantity: 24,
                alert_threshold: 10,
                is_active: true,
              });
              setEditModalOpen(true);
            }}
            className="px-3 py-2 rounded-lg bg-surface hover:bg-surface-high border border-primary/40 text-primary text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouvel Article</span>
          </button>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-lg bg-surface hover:bg-surface-high border border-[#353535] text-foreground/60 hover:text-white transition-colors cursor-pointer"
            title="Actualiser"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {msg && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-mono flex items-center justify-between animate-fade-in ${
            msg.type === 'success'
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'bg-secondary/15 border-secondary/40 text-secondary'
          }`}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="text-foreground/40 hover:text-white">
            ×
          </button>
        </div>
      )}

      {/* SOUS-ONGLET 1 : ÉTAT DES STOCKS & KPIS */}
      {activeTab === 'stocks' && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-surface border border-[#353535] shadow-[3px_3px_0px_#000]">
              <span className="text-[10px] font-mono text-foreground/50 uppercase block">Valeur Vente Totale</span>
              <span className="font-anybody font-black text-2xl text-primary">
                {metrics.totalSellingValue.toFixed(2)} €
              </span>
            </div>

            <div className="p-4 rounded-xl bg-surface border border-[#353535] shadow-[3px_3px_0px_#000]">
              <span className="text-[10px] font-mono text-foreground/50 uppercase block">Valeur Achat / Coût</span>
              <span className="font-anybody font-black text-2xl text-white">
                {metrics.totalCostValue.toFixed(2)} €
              </span>
            </div>

            <div className="p-4 rounded-xl bg-surface border border-[#353535] shadow-[3px_3px_0px_#000]">
              <span className="text-[10px] font-mono text-foreground/50 uppercase block">Marge Potentielle</span>
              <span className="font-anybody font-black text-2xl text-green-400">
                +{metrics.potentialMargin.toFixed(2)} €
              </span>
            </div>

            <div className="p-4 rounded-xl bg-surface border border-secondary/30 shadow-[3px_3px_0px_#000]">
              <span className="text-[10px] font-mono text-secondary uppercase block font-bold">Sous Seuil d'Alerte</span>
              <span className="font-anybody font-black text-2xl text-secondary">
                {metrics.alertCount} <span className="text-xs font-normal text-foreground/50">articles</span>
              </span>
            </div>
          </div>

          {/* Recherche */}
          <div className="relative">
            <Search className="w-4 h-4 text-foreground/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par article ou catégorie..."
              className="w-full bg-surface border border-[#353535] rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-primary"
            />
          </div>

          {/* Tableau des stocks */}
          <div className="bg-surface rounded-xl border border-[#353535] overflow-hidden shadow-[4px_4px_0px_#000]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="border-b border-[#353535] bg-surface-dim text-[10px] font-anybody font-bold text-foreground/50 uppercase tracking-wider">
                    <th className="px-4 py-3">Article</th>
                    <th className="px-4 py-3">Catégorie</th>
                    <th className="px-4 py-3 text-right">Prix Vente</th>
                    <th className="px-4 py-3 text-right">Prix Achat</th>
                    <th className="px-4 py-3 text-center">Stock Actuel</th>
                    <th className="px-4 py-3 text-center">Seuil Alerte</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#353535]/50">
                  {filteredItems.map((item) => {
                    const isAlert = item.stock_quantity <= item.alert_threshold;

                    return (
                      <tr key={item.id} className="hover:bg-surface-high/30 transition-colors">
                        <td className="px-4 py-3 font-bold text-white font-sans text-sm">
                          {item.name}
                        </td>
                        <td className="px-4 py-3 text-foreground/60 text-[11px]">
                          {item.category?.name || 'Général'}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-primary">
                          {item.selling_price.toFixed(2)} €
                        </td>
                        <td className="px-4 py-3 text-right text-foreground/60">
                          {item.cost_price.toFixed(2)} €
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              isAlert
                                ? 'bg-secondary/15 text-secondary border border-secondary/30 animate-pulse'
                                : 'bg-green-500/15 text-green-400 border border-green-500/30'
                            }`}
                          >
                            {item.stock_quantity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-foreground/50 text-[11px]">
                          {item.alert_threshold}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => {
                              setEditingItem(item);
                              setEditModalOpen(true);
                            }}
                            className="p-1.5 rounded bg-surface hover:bg-surface-high border border-[#353535] text-foreground/60 hover:text-white cursor-pointer"
                            title="Modifier"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SOUS-ONGLET 2 : ENTRÉE DE STOCK */}
      {activeTab === 'entry' && (
        <form onSubmit={handleStockEntry} className="max-w-xl mx-auto p-5 bg-surface border border-[#353535] rounded-2xl space-y-4 font-mono text-xs shadow-[4px_4px_0px_#000]">
          <div className="flex items-center gap-2 border-b border-[#353535] pb-3">
            <ArrowDownCircle className="w-5 h-5 text-primary" />
            <h3 className="font-anybody font-bold text-sm uppercase text-white tracking-wider">
              Enregistrer une Entrée de Stock / Achat
            </h3>
          </div>

          <div className="space-y-1.5">
            <label className="text-foreground/70 block">Sélectionner l'article * :</label>
            <select
              value={selectedItemId}
              onChange={(e) => {
                setSelectedItemId(e.target.value);
                const item = items.find((i) => i.id === e.target.value);
                if (item) setEntryCostPrice(item.cost_price.toString());
              }}
              className="w-full bg-background border border-[#353535] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary cursor-pointer font-sans"
              required
            >
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} (Stock actuel: {i.stock_quantity})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-foreground/70 block">Quantité reçue * :</label>
              <input
                type="number"
                min="1"
                value={entryQty}
                onChange={(e) => setEntryQty(e.target.value)}
                className="w-full bg-background border border-[#353535] rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:border-primary"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-foreground/70 block">Prix d'achat unitaire (€) :</label>
              <input
                type="number"
                step="0.01"
                value={entryCostPrice}
                onChange={(e) => setEntryCostPrice(e.target.value)}
                className="w-full bg-background border border-[#353535] rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:border-primary"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-foreground/70 block">Fournisseur / Motif :</label>
            <input
              type="text"
              value={entryReason}
              onChange={(e) => setEntryReason(e.target.value)}
              placeholder="Ex: Achat Makro, Metro, Colruyt..."
              className="w-full bg-background border border-[#353535] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={entryLoading}
            className="w-full premium-btn text-xs py-2.5 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            <Save className="w-4 h-4" />
            <span className="transform skew-x-8">
              {entryLoading ? 'Enregistrement...' : 'Valider l\'Entrée en Stock'}
            </span>
          </button>
        </form>
      )}

      {/* SOUS-ONGLET 3 : INVENTAIRE PHYSIQUE */}
      {activeTab === 'inventory' && (
        <form onSubmit={handleSaveInventory} className="space-y-4">
          <div className="p-4 rounded-xl bg-surface border border-[#353535] flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs">
            <div className="space-y-0.5">
              <h3 className="font-anybody font-bold text-sm uppercase text-white">
                Saisie de l'Inventaire Physique
              </h3>
              <p className="text-foreground/50 text-[11px]">
                Indiquez les quantités réelles comptées dans les frigos et la réserve. Les écarts et pertes seront calculés automatiquement.
              </p>
            </div>

            <button
              type="submit"
              disabled={inventoryLoading}
              className="px-6 py-2.5 rounded-lg bg-primary text-black font-anybody font-black uppercase text-xs tracking-wider hover:bg-secondary hover:text-white transition-all sport-skew cursor-pointer disabled:opacity-50 shrink-0"
            >
              <span className="transform skew-x-8">
                {inventoryLoading ? 'Calcul...' : 'Valider & Ajuster les Stocks'}
              </span>
            </button>
          </div>

          <div className="bg-surface rounded-xl border border-[#353535] overflow-hidden shadow-[4px_4px_0px_#000]">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b border-[#353535] bg-surface-dim text-[10px] font-anybody font-bold text-foreground/50 uppercase tracking-wider">
                  <th className="px-4 py-3">Article</th>
                  <th className="px-4 py-3 text-center">Stock Théorique</th>
                  <th className="px-4 py-3 text-center w-36">Comptage Physique</th>
                  <th className="px-4 py-3 text-center">Écart</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#353535]/50">
                {items.map((item) => {
                  const counted = inventoryCounts[item.id] ?? item.stock_quantity;
                  const diff = counted - item.stock_quantity;

                  return (
                    <tr key={item.id} className="hover:bg-surface-high/30">
                      <td className="px-4 py-3 font-bold text-white font-sans text-sm">
                        {item.name}
                      </td>
                      <td className="px-4 py-3 text-center text-foreground/70">
                        {item.stock_quantity}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min="0"
                          value={counted}
                          onChange={(e) =>
                            setInventoryCounts({
                              ...inventoryCounts,
                              [item.id]: Number(e.target.value),
                            })
                          }
                          className="w-20 bg-background border border-[#353535] rounded px-2 py-1 text-center font-bold text-white focus:outline-none focus:border-primary mx-auto block"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        {diff === 0 ? (
                          <span className="text-foreground/40 font-mono">0</span>
                        ) : diff > 0 ? (
                          <span className="text-green-400 font-bold">+{diff} (Gain)</span>
                        ) : (
                          <span className="text-secondary font-bold">{diff} (Perte)</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </form>
      )}

      {/* SOUS-ONGLET 4 : LISTE DE COURSES MOBILE */}
      {activeTab === 'shopping' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-surface border border-[#353535] flex items-center justify-between">
            <div>
              <h3 className="font-anybody font-bold text-sm uppercase text-white">
                Liste de Courses Rayon Magasin
              </h3>
              <p className="text-xs font-mono text-foreground/50 mt-0.5">
                Articles sous seuil d'alerte avec proposition de réapprovisionnement.
              </p>
            </div>

            <span className="px-3 py-1 rounded-full bg-secondary/15 border border-secondary/30 text-secondary text-xs font-mono font-bold">
              {shoppingList.length} articles à acheter
            </span>
          </div>

          {shoppingList.length === 0 ? (
            <div className="py-12 text-center text-foreground/40 font-mono text-xs bg-surface rounded-xl border border-[#353535]">
              <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
              Tous les stocks sont au-dessus des seuils d'alerte. Aucun achat requis.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {shoppingList.map((item) => {
                const isChecked = checkedItems[item.item.id] || false;

                return (
                  <div
                    key={item.item.id}
                    onClick={() => toggleCheck(item.item.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isChecked
                        ? 'bg-surface/30 border-[#353535] opacity-50 line-through'
                        : 'bg-surface hover:bg-surface-high border-[#353535] hover:border-primary shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isChecked ? (
                        <CheckSquare className="w-5 h-5 text-green-400 shrink-0" />
                      ) : (
                        <Square className="w-5 h-5 text-foreground/40 shrink-0" />
                      )}

                      <div>
                        <span className="font-anybody font-bold text-sm uppercase text-white block">
                          {item.item.name}
                        </span>
                        <div className="text-[11px] font-mono text-foreground/50 flex gap-2">
                          <span>Stock restant : <strong className="text-secondary">{item.currentStock}</strong></span>
                          <span>•</span>
                          <span>Seuil : {item.threshold}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <span className="text-[10px] text-foreground/45 uppercase block">À Acheter</span>
                      <span className="font-anybody font-black text-lg text-primary">
                        +{item.suggestedBuyQty}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL NOUVEL / ÉDITION ARTICLE */}
      {editModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="absolute inset-0" onClick={() => setEditModalOpen(false)} />
          <form
            onSubmit={handleSaveItem}
            className="relative z-10 w-full max-w-md bg-[#0f0f0f] border border-[#353535] rounded-2xl p-5 space-y-4 shadow-[0_0_50px_rgba(0,0,0,0.9)] font-mono text-xs"
          >
            <div className="flex items-center justify-between border-b border-[#292929] pb-3">
              <h3 className="font-anybody font-bold text-sm uppercase text-white">
                {editingItem.id ? "Modifier l'Article" : 'Ajouter un Article'}
              </h3>
              <button onClick={() => setEditModalOpen(false)} className="text-foreground/40 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-foreground/70 block">Nom de l'article * :</label>
              <input
                type="text"
                value={editingItem.name || ''}
                onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                placeholder="Ex: Red Bull 25cl"
                className="w-full bg-surface border border-[#353535] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary font-bold"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-foreground/70 block">Catégorie * :</label>
              <select
                value={editingItem.category_id || ''}
                onChange={(e) => setEditingItem({ ...editingItem, category_id: e.target.value })}
                className="w-full bg-surface border border-[#353535] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary cursor-pointer font-sans"
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-foreground/70 block">Prix Vente TTC (€) :</label>
                <input
                  type="number"
                  step="0.10"
                  value={editingItem.selling_price || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, selling_price: Number(e.target.value) })}
                  className="w-full bg-surface border border-[#353535] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary font-bold"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-foreground/70 block">Prix Achat (€) :</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingItem.cost_price || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, cost_price: Number(e.target.value) })}
                  className="w-full bg-surface border border-[#353535] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-foreground/70 block">Stock initial :</label>
                <input
                  type="number"
                  value={editingItem.stock_quantity || 0}
                  onChange={(e) => setEditingItem({ ...editingItem, stock_quantity: Number(e.target.value) })}
                  className="w-full bg-surface border border-[#353535] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-foreground/70 block">Seuil d'alerte :</label>
                <input
                  type="number"
                  value={editingItem.alert_threshold || 10}
                  onChange={(e) => setEditingItem({ ...editingItem, alert_threshold: Number(e.target.value) })}
                  className="w-full bg-surface border border-[#353535] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-3 py-2 rounded-lg bg-surface border border-[#353535] text-foreground/70 hover:text-white"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={editLoading}
                className="px-5 py-2 rounded-lg bg-primary text-black font-anybody font-black uppercase text-xs tracking-wider hover:bg-secondary hover:text-white transition-colors cursor-pointer"
              >
                {editLoading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
