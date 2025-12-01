
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Wallet, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  PackageCheck,
  AlertCircle,
  Scissors,
  Palette,
  Printer,
  Box,
  Hammer,
  MoreVertical,
  PlusCircle,
  Settings,
  GripVertical,
  XCircle,
  AlertTriangle,
  Check,
  X,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { Order, TabView, FixedExpense } from './types';
import { 
  initAndMigrateData,
  getAllOrders, 
  saveAllOrders, 
  deleteOrderById,
  getAllFixedExpenses, 
  saveFixedExpenseItem,
  deleteFixedExpenseById,
  getStages, 
  saveStages,
  getBankBalance,
  saveBankBalance
} from './services/storageService';
import { Modal } from './components/Modal';
import { OrderForm } from './components/OrderForm';
import { StatsCards } from './components/StatsCards';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BrandLogo } from './components/BrandLogo';

function App() {
  // App State
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabView>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [stages, setStages] = useState<string[]>([]);
  const [bankBalance, setBankBalance] = useState(0);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStagesModalOpen, setIsStagesModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Month Filter State
  const [monthFilter, setMonthFilter] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM

  // Dropdown menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Delete Confirmation State
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [stageToDelete, setStageToDelete] = useState<string | null>(null);
  const [fixedExpenseToDelete, setFixedExpenseToDelete] = useState<string | null>(null);

  // Bank Balance Edit State
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [tempBalanceStr, setTempBalanceStr] = useState('');

  // Drag and Drop State for Stages
  const [draggedStageIndex, setDraggedStageIndex] = useState<number | null>(null);

  // Forms state
  const [newFixedDesc, setNewFixedDesc] = useState('');
  const [newFixedVal, setNewFixedVal] = useState('');
  const [newStageName, setNewStageName] = useState('');

  // --- Initial Data Loading (Async for IndexedDB) ---
  useEffect(() => {
    const loadData = async () => {
      try {
        await initAndMigrateData(); // Migra dados se necessário
        
        const [loadedOrders, loadedFixed, loadedStages, loadedBalance] = await Promise.all([
          getAllOrders(),
          getAllFixedExpenses(),
          getStages(),
          getBankBalance()
        ]);

        setOrders(loadedOrders);
        setFixedExpenses(loadedFixed);
        setStages(loadedStages);
        setBankBalance(loadedBalance);
        
        // --- AUTO-SELECT LAST ACTIVE MONTH LOGIC ---
        // Se o mês atual não tiver pedidos, volta para o último mês que teve.
        const currentMonth = new Date().toISOString().slice(0, 7);
        const hasDataNow = loadedOrders.some(o => o.date.startsWith(currentMonth));
        
        if (!hasDataNow && loadedOrders.length > 0) {
           // Pega todas as datas, ordena e pega a mais recente
           const allDates = loadedOrders.map(o => o.date).sort().reverse();
           if (allDates.length > 0) {
             const lastActiveMonth = allDates[0].slice(0, 7);
             if (lastActiveMonth !== currentMonth) {
               setMonthFilter(lastActiveMonth);
             }
           }
        }
        // -------------------------------------------

      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // --- Save Triggers (Optimistic UI + Async Save) ---
  
  // Note: We create dedicated handlers for saving to DB to allow granular updates
  // instead of relying on useEffect which might trigger too often or unnecessarily.

  const persistOrder = async (order: Order) => {
    // Atualiza estado local
    let newOrders: Order[];
    if (orders.find(o => o.id === order.id)) {
      newOrders = orders.map(o => o.id === order.id ? order : o);
    } else {
      newOrders = [order, ...orders];
    }
    setOrders(newOrders);
    // Salva no DB
    await saveAllOrders(newOrders); // Ou criar saveOrder(order) no service
  };

  const removeOrder = async (id: string) => {
    setOrders(prev => prev.filter(o => o.id !== id));
    await deleteOrderById(id);
  };

  const persistFixedExpense = async (expense: FixedExpense) => {
    setFixedExpenses(prev => [...prev, expense]);
    await saveFixedExpenseItem(expense);
  };

  const removeFixedExpense = async (id: string) => {
    setFixedExpenses(prev => prev.filter(e => e.id !== id));
    await deleteFixedExpenseById(id);
  };

  const persistStages = async (newStages: string[]) => {
    setStages(newStages);
    await saveStages(newStages);
  };

  const persistBalance = async (val: number) => {
    setBankBalance(val);
    await saveBankBalance(val);
  };

  // --- Derived State for History ---
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    // Sempre adiciona o mês atual
    months.add(new Date().toISOString().slice(0, 7));
    
    // Adiciona meses dos pedidos
    orders.forEach(o => {
      if (o.date) months.add(o.date.slice(0, 7));
    });

    // Adiciona meses das despesas fixas
    fixedExpenses.forEach(f => {
      if (f.month) months.add(f.month);
    });

    // Retorna ordenado (Mais recente primeiro)
    return Array.from(months).sort().reverse();
  }, [orders, fixedExpenses]);

  // Global click handler for menus
  useEffect(() => {
    const handleGlobalClick = () => setOpenMenuId(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const filteredOrders = useMemo(() => {
    let filtered = orders;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(o => 
        o.clientName.toLowerCase().includes(lower) || 
        o.description.toLowerCase().includes(lower)
      );
    }
    if (activeTab === 'financial') {
      filtered = filtered.filter(o => o.date.startsWith(monthFilter));
    }
    return [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders, searchTerm, monthFilter, activeTab]);

  // Actions
  const handleSaveOrder = async (order: Order) => {
    await persistOrder(order);
    setIsModalOpen(false);
    setEditingOrder(null);
  };

  const handleRequestDelete = (order: Order, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setOpenMenuId(null);
    setOrderToDelete(order);
  };

  const handleConfirmDelete = async () => {
    if (orderToDelete) {
      await removeOrder(orderToDelete.id);
      setOrderToDelete(null);
    }
  };

  const handleEditClick = (order: Order, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setEditingOrder(order);
    setIsModalOpen(true);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const order = orders.find(o => o.id === id);
    if (order) {
      await persistOrder({ ...order, status: newStatus });
    }
  };

  const toggleMenu = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenuId(prev => prev === id ? null : id);
  };

  const calculateNet = (order: Order) => {
    const expenses = order.expenses.reduce((acc, curr) => acc + curr.value, 0);
    return order.grossValue - expenses;
  };

  const handleAddFixedExpense = async () => {
    if (!newFixedDesc || !newFixedVal) return;
    const newExpense: FixedExpense = {
      id: crypto.randomUUID(),
      description: newFixedDesc,
      value: parseFloat(newFixedVal),
      month: monthFilter
    };
    await persistFixedExpense(newExpense);
    setNewFixedDesc('');
    setNewFixedVal('');
  };

  const handleDeleteFixedExpense = (id: string) => {
    setFixedExpenseToDelete(id);
  };

  const handleConfirmDeleteFixedExpense = async () => {
    if (fixedExpenseToDelete) {
      await removeFixedExpense(fixedExpenseToDelete);
      setFixedExpenseToDelete(null);
    }
  };

  const handleAddStage = async () => {
    if (!newStageName.trim()) return;
    if (stages.includes(newStageName.trim())) {
      alert('Esta etapa já existe.');
      return;
    }
    await persistStages([...stages, newStageName.trim()]);
    setNewStageName('');
  };

  const handleRequestDeleteStage = (stageToRemove: string) => {
    if (stages.length <= 1) {
      alert('Você deve ter pelo menos uma etapa.');
      return;
    }
    setStageToDelete(stageToRemove);
  };

  const handleConfirmDeleteStage = async () => {
    if (stageToDelete) {
      await persistStages(stages.filter(s => s !== stageToDelete));
      setStageToDelete(null);
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (index: number) => {
    setDraggedStageIndex(index);
  };

  const handleDragEnter = (index: number) => {
    if (draggedStageIndex === null || draggedStageIndex === index) return;
    
    const newStages = [...stages];
    const draggedItem = newStages[draggedStageIndex];
    newStages.splice(draggedStageIndex, 1);
    newStages.splice(index, 0, draggedItem);
    
    setStages(newStages); // Optimistic
    setDraggedStageIndex(index);
  };

  const handleDragEnd = async () => {
    setDraggedStageIndex(null);
    await saveStages(stages); // Persist final order
  };

  const handleEditBalance = () => {
    setTempBalanceStr(bankBalance.toString());
    setIsEditingBalance(true);
  };

  const handleSaveBalance = async () => {
    const normalized = tempBalanceStr.replace(',', '.');
    const val = parseFloat(normalized);
    if (!isNaN(val)) {
      await persistBalance(val);
      setIsEditingBalance(false);
    }
  };

  // Helper for Month Format
  const formatMonth = (isoMonth: string) => {
    const [year, month] = isoMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '');
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const getBadgeStyle = (s: string) => {
      const lower = s.toLowerCase();
      if (lower.includes('pendente')) return { color: 'bg-slate-100 text-slate-600 border-slate-200', icon: <AlertCircle size={14} /> };
      if (lower.includes('cancelado')) return { color: 'bg-red-50 text-red-600 border-red-200', icon: <XCircle size={14} /> };
      if (lower.includes('arte') || lower.includes('design')) return { color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: <Palette size={14} /> };
      if (lower.includes('impressão')) return { color: 'bg-cyan-100 text-cyan-700 border-cyan-200', icon: <Printer size={14} /> };
      if (lower.includes('corte') || lower.includes('laser')) return { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: <Scissors size={14} /> };
      if (lower.includes('montagem')) return { color: 'bg-pink-100 text-pink-700 border-pink-200', icon: <Hammer size={14} /> };
      if (lower.includes('embalagem')) return { color: 'bg-purple-100 text-purple-700 border-purple-200', icon: <Box size={14} /> };
      if (lower.includes('aguardando') || lower.includes('retirada')) return { color: 'bg-teal-100 text-teal-700 border-teal-200', icon: <PackageCheck size={14} /> };
      if (lower.includes('entregue') || lower.includes('concluído')) return { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle2 size={14} /> };
      
      const colors = [
        'bg-blue-100 text-blue-700 border-blue-200',
        'bg-rose-100 text-rose-700 border-rose-200',
        'bg-amber-100 text-amber-700 border-amber-200',
        'bg-lime-100 text-lime-700 border-lime-200',
        'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200'
      ];
      let hash = 0;
      for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
      const colorClass = colors[Math.abs(hash) % colors.length];
      return { color: colorClass, icon: <CheckCircle2 size={14} /> };
    };

    const style = getBadgeStyle(status);

    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 w-fit whitespace-nowrap ${style.color}`}>
        {style.icon} {status}
      </span>
    );
  };

  // --- Render Sections ---

  const renderOrderList = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {filteredOrders.map(order => {
        const net = calculateNet(order);
        const totalExp = order.grossValue - net;
        return (
          <div key={order.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow relative group">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">{order.clientName}</h3>
                <p className="text-xs text-slate-500">{new Date(order.date).toLocaleDateString('pt-BR')}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={order.status} />
                <div className="relative">
                  <button onClick={(e) => toggleMenu(order.id, e)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                    <MoreVertical size={20} />
                  </button>
                  {openMenuId === order.id && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                         <button onClick={(e) => { setOpenMenuId(null); handleEditClick(order, e); }} className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-50">
                            <Edit size={16} className="text-slate-400" /> Editar
                         </button>
                         <button onClick={(e) => { setOpenMenuId(null); handleEditClick(order, e); }} className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-50">
                            <PlusCircle size={16} className="text-slate-400" /> Adicionar custo
                         </button>
                         <button onClick={(e) => handleRequestDelete(order, e)} className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 font-medium">
                            <Trash2 size={16} /> Excluir Pedido
                         </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-4 line-clamp-3 bg-slate-50 p-3 rounded-lg border border-slate-100">{order.description}</p>
            <div className="space-y-1 text-sm border-t border-slate-100 pt-3">
              <div className="flex justify-between"><span className="text-slate-500">Valor Bruto:</span><span className="font-medium text-slate-900">R$ {order.grossValue.toFixed(2)}</span></div>
              {order.expenses.length > 0 && (
                 <div className="flex justify-between text-red-500 text-xs"><span>Despesas ({order.expenses.length}):</span><span>- R$ {totalExp.toFixed(2)}</span></div>
              )}
              <div className="flex justify-between font-bold text-brand-700 pt-1"><span>Líquido:</span><span>R$ {net.toFixed(2)}</span></div>
            </div>
          </div>
        );
      })}
      {filteredOrders.length === 0 && (
        <div className="col-span-full text-center py-20 text-slate-400"><p>Nenhum pedido encontrado.</p></div>
      )}
    </div>
  );

  const renderProductionFlow = () => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-slate-700">Cliente / Descrição</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Etapa Atual</th>
              <th className="px-6 py-4 font-semibold text-slate-700 text-right">Financeiro</th>
              <th className="px-6 py-4 font-semibold text-slate-700 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredOrders.map(order => {
               const net = calculateNet(order);
               return (
                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 max-w-xs">
                    <div className="font-bold text-slate-900">{order.clientName}</div>
                    <div className="text-slate-500 text-xs mt-1 truncate">{order.description}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2">
                      <StatusBadge status={order.status} />
                      <select value={order.status} onChange={(e) => handleStatusChange(order.id, e.target.value)} className="text-xs border border-slate-300 rounded p-1.5 bg-white focus:ring-2 focus:ring-brand-500 w-full max-w-[180px]">
                         {stages.map(s => <option key={s} value={s}>{s}</option>)}
                         {!stages.includes(order.status) && <option value={order.status}>{order.status}</option>}
                      </select>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-slate-900 font-medium">Bruto: R$ {order.grossValue.toFixed(2)}</div>
                    <div className="text-brand-600 font-bold text-xs mt-1">Liq: R$ {net.toFixed(2)}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={(e) => handleEditClick(order, e)} className="text-brand-600 hover:text-brand-800 font-medium text-sm flex items-center gap-1 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg">
                        <Edit size={14} /> Editar
                      </button>
                      <button onClick={(e) => handleRequestDelete(order, e)} className="group text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all">
                        <Trash2 size={18} className="transition-transform group-hover:scale-110" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {filteredOrders.length === 0 && <div className="p-10 text-center text-slate-400">Nenhum pedido no fluxo.</div>}
    </div>
  );

  const renderFinancial = () => {
    const orderStats = filteredOrders.reduce((acc, curr) => {
      if (curr.status === 'Cancelado' ? false : true) {
        const exp = curr.expenses.reduce((eAcc, eCurr) => eAcc + eCurr.value, 0);
        acc.gross += curr.grossValue;
        acc.variableExpenses += exp;
        acc.count += 1;
      }
      return acc;
    }, { gross: 0, variableExpenses: 0, count: 0 });

    const monthlyFixedExpenses = fixedExpenses.filter(e => e.month === monthFilter);
    const totalFixed = monthlyFixedExpenses.reduce((acc, curr) => acc + curr.value, 0);
    const finalNet = orderStats.gross - orderStats.variableExpenses - totalFixed;

    const chartData = [
      { name: 'Bruto', value: orderStats.gross, color: '#3b82f6' },
      { name: 'C. Var.', value: orderStats.variableExpenses, color: '#f97316' },
      { name: 'D. Fixas', value: totalFixed, color: '#ef4444' },
      { name: 'Liq. Final', value: finalNet, color: finalNet >= 0 ? '#0d9488' : '#dc2626' },
      { name: 'Saldo', value: bankBalance, color: bankBalance >= 0 ? '#8b5cf6' : '#be123c' },
    ];

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* NEW: Month History Navigation */}
        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 overflow-x-auto no-scrollbar">
           <div className="flex items-center gap-2">
             <CalendarDays size={20} className="text-slate-400 shrink-0 ml-2" />
             <div className="flex gap-2">
                {availableMonths.length === 0 && (
                   <button className="px-4 py-1.5 rounded-lg bg-brand-600 text-white text-sm font-bold shadow-md">
                     {formatMonth(monthFilter)}
                   </button>
                )}
                {availableMonths.map(m => (
                  <button 
                    key={m}
                    onClick={() => setMonthFilter(m)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap border ${m === monthFilter ? 'bg-brand-600 text-white border-brand-600 shadow-md' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                  >
                    {formatMonth(m)}
                  </button>
                ))}
             </div>
           </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
           <div className="bg-slate-800 text-white p-4 rounded-xl shadow-sm flex items-center gap-4 w-full md:w-auto pr-8 min-w-[280px] relative group transition-all hover:shadow-md">
             <div className="p-3 bg-white/10 rounded-full shrink-0"><Wallet size={24} className="text-emerald-400" /></div>
             <div className="flex-1 min-w-0">
               <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Saldo em Conta</p>
               {isEditingBalance ? (
                 <div className="flex items-center gap-2 animate-in fade-in duration-200">
                   <input type="number" value={tempBalanceStr} onChange={(e) => setTempBalanceStr(e.target.value)} className="w-full text-slate-900 text-lg font-bold rounded px-2 py-1 outline-none border-2 border-brand-500" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') handleSaveBalance(); if (e.key === 'Escape') setIsEditingBalance(false); }} />
                   <button onClick={handleSaveBalance} className="bg-emerald-500 hover:bg-emerald-600 p-1.5 rounded text-white shrink-0"><Check size={16} /></button>
                   <button onClick={() => setIsEditingBalance(false)} className="bg-slate-600 hover:bg-slate-500 p-1.5 rounded text-white shrink-0"><X size={16} /></button>
                 </div>
               ) : (
                 <div className="flex items-center gap-3">
                   <p className={`text-2xl font-bold truncate ${bankBalance >= 0 ? 'text-white' : 'text-red-400'}`}>R$ {bankBalance.toFixed(2)}</p>
                   <button onClick={handleEditBalance} className="md:opacity-0 group-hover:opacity-100 transition-all p-1.5 hover:bg-white/10 rounded-full text-slate-400 hover:text-emerald-400" title="Editar Saldo em Conta"><Edit size={16} /></button>
                 </div>
               )}
               <p className="text-[10px] text-slate-500 mt-1">Total acumulado (Ex: Banco, Caixa 2)</p>
             </div>
           </div>

           <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-300 shadow-sm w-full md:w-auto justify-center">
             <span className="text-xs text-slate-500 font-medium uppercase">Mês de Referência:</span>
             <input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="text-sm outline-none text-slate-700 bg-transparent font-bold cursor-pointer" />
           </div>
        </div>

        <StatsCards gross={orderStats.gross} variableExpenses={orderStats.variableExpenses} fixedExpenses={totalFixed} net={finalNet} count={orderStats.count} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Wallet size={18} className="text-red-500" /> Despesas Fixas (Mensais)</h3>
            <div className="flex flex-col gap-2 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <input type="text" placeholder="Descrição (ex: Energia)" value={newFixedDesc} onChange={e => setNewFixedDesc(e.target.value)} className="text-sm p-2 rounded border border-slate-300 w-full" />
              <div className="flex gap-2">
                <input type="number" placeholder="Valor" step="0.01" value={newFixedVal} onChange={e => setNewFixedVal(e.target.value)} className="text-sm p-2 rounded border border-slate-300 flex-1" />
                <button onClick={handleAddFixedExpense} disabled={!newFixedDesc || !newFixedVal} className="bg-slate-800 text-white p-2 rounded hover:bg-slate-700 disabled:opacity-50"><Plus size={18} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto max-h-60 space-y-2">
              {monthlyFixedExpenses.length === 0 ? <p className="text-xs text-slate-400 text-center py-4">Nenhuma despesa fixa este mês.</p> : monthlyFixedExpenses.map(item => (
                <div key={item.id} className="flex justify-between items-center text-sm border-b border-slate-50 pb-2 last:border-0">
                  <span className="text-slate-700">{item.description}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-red-600">- R$ {item.value.toFixed(2)}</span>
                    <button onClick={() => handleDeleteFixedExpense(item.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between font-bold text-slate-800"><span>Total Fixo:</span><span className="text-red-600">- R$ {totalFixed.toFixed(2)}</span></div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-6">Visão Geral e Saldo</h3>
             <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={70} tick={{fontSize: 11}} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Valor']} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                    {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full max-h-[500px] overflow-y-auto">
            <h3 className="font-bold text-slate-800 mb-4 sticky top-0 bg-white pb-2 flex items-center gap-2"><CheckCircle2 size={18} className="text-brand-500" /> Pedidos no Cálculo</h3>
            <ul className="space-y-3">
              {filteredOrders.length === 0 ? <p className="text-xs text-slate-400">Sem pedidos neste mês.</p> : filteredOrders.map(order => (
                <li key={order.id} className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                  <div className="truncate pr-2">
                    <div className={`font-medium ${order.status === 'Cancelado' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{order.clientName}</div>
                    <div className="text-xs text-slate-400">{new Date(order.date).toLocaleDateString()}</div>
                  </div>
                  {order.status !== 'Cancelado' ? (
                    <div className="text-right whitespace-nowrap">
                      <div className="text-slate-900 font-medium">R$ {calculateNet(order).toFixed(2)}</div>
                      <div className="text-xs text-brand-600">Margem</div>
                    </div>
                  ) : <div className="text-xs text-red-400 font-medium">Cancelado</div>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  // --- Main Render ---

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 size={40} className="text-brand-600 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Carregando seus dados...</h2>
        <p className="text-slate-500 text-sm mt-2">Migrando para banco de dados seguro.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-0 md:pl-64">
      {/* Sidebar (Desktop) */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 hidden md:flex flex-col z-10">
        <div className="p-6">
          <BrandLogo className="h-10 w-auto" />
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <button onClick={() => setActiveTab('orders')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeTab === 'orders' ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
            <ClipboardList size={20} /> Pedidos
          </button>
          <button onClick={() => setActiveTab('production')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeTab === 'production' ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
            <LayoutDashboard size={20} /> Fluxo Produção
          </button>
          <button onClick={() => setActiveTab('financial')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeTab === 'financial' ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
            <Wallet size={20} /> Financeiro
          </button>
        </nav>
        <div className="p-4 border-t border-slate-100">
           <div className="bg-brand-600/5 p-4 rounded-xl">
             <p className="text-xs text-brand-700 font-semibold mb-1">Status do Sistema</p>
             <p className="text-xs text-slate-500">v2.0 (IndexedDB) &bull; Offline</p>
           </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-slate-200 p-4 sticky top-0 z-20 flex justify-between items-center shadow-sm">
        <BrandLogo className="h-8 w-auto" />
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-3 z-20 pb-safe">
        <button onClick={() => setActiveTab('orders')} className={`flex flex-col items-center gap-1 ${activeTab === 'orders' ? 'text-brand-600' : 'text-slate-400'}`}>
          <ClipboardList size={22} /><span className="text-[10px] font-medium">Pedidos</span>
        </button>
        <button onClick={() => setActiveTab('production')} className={`flex flex-col items-center gap-1 ${activeTab === 'production' ? 'text-brand-600' : 'text-slate-400'}`}>
          <LayoutDashboard size={22} /><span className="text-[10px] font-medium">Produção</span>
        </button>
        <button onClick={() => setActiveTab('financial')} className={`flex flex-col items-center gap-1 ${activeTab === 'financial' ? 'text-brand-600' : 'text-slate-400'}`}>
          <Wallet size={22} /><span className="text-[10px] font-medium">Financeiro</span>
        </button>
      </div>

      {/* Main Content */}
      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {activeTab === 'orders' && 'Lista de Pedidos'}
              {activeTab === 'production' && 'Fluxo de Produção'}
              {activeTab === 'financial' && 'Controle Financeiro'}
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              {activeTab === 'orders' && 'Gerencie seus pedidos, crie novos e acompanhe detalhes.'}
              {activeTab === 'production' && 'Visão técnica para organizar a linha de produção.'}
              {activeTab === 'financial' && 'Acompanhe a saúde financeira, custos e lucro real.'}
            </p>
          </div>

          {(activeTab === 'orders' || activeTab === 'production') && (
            <div className="flex gap-3">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder="Buscar cliente ou pedido..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              
              {activeTab === 'production' && (
                <button onClick={() => setIsStagesModalOpen(true)} className="hidden md:flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2.5 rounded-xl font-semibold transition-colors border border-slate-200" title="Configurar Etapas">
                  <Settings size={20} />
                </button>
              )}

              <button onClick={() => { setEditingOrder(null); setIsModalOpen(true); }} className="hidden md:flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-brand-200 transition-all active:scale-95 whitespace-nowrap">
                <Plus size={20} /> Novo Pedido
              </button>
            </div>
          )}
        </div>

        {activeTab === 'orders' && renderOrderList()}
        {activeTab === 'production' && renderProductionFlow()}
        {activeTab === 'financial' && renderFinancial()}
      </main>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingOrder ? "Editar Pedido" : "Novo Pedido"}>
        <OrderForm initialData={editingOrder} availableStages={stages} onSave={handleSaveOrder} onCancel={() => setIsModalOpen(false)} />
      </Modal>

      <Modal isOpen={isStagesModalOpen} onClose={() => setIsStagesModalOpen(false)} title="Gerenciar Etapas de Produção">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Defina as etapas do seu processo produtivo. Arraste para reordenar.</p>
          <div className="flex gap-2">
            <input type="text" value={newStageName} onChange={(e) => setNewStageName(e.target.value)} placeholder="Nova etapa" className="flex-1 rounded-lg border-slate-300 border p-2 text-sm" onKeyDown={(e) => { if(e.key === 'Enter') handleAddStage(); }} />
            <button onClick={handleAddStage} className="bg-brand-600 text-white p-2 rounded-lg hover:bg-brand-700"><Plus size={20} /></button>
          </div>
          <div className="border rounded-xl divide-y divide-slate-100 overflow-hidden bg-slate-50">
            {stages.map((stage, index) => (
              <div 
                key={stage} 
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragEnter={() => handleDragEnter(index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className={`flex items-center justify-between p-3 bg-white hover:bg-slate-50 transition-colors ${draggedStageIndex === index ? 'opacity-50 bg-slate-100' : ''}`}
              >
                <div className="flex items-center gap-3 cursor-move touch-none">
                  <GripVertical size={16} className="text-slate-300" />
                  <span className="text-sm font-medium text-slate-700">{stage}</span>
                </div>
                <button onClick={() => handleRequestDeleteStage(stage)} className="text-slate-400 hover:text-red-500 p-1"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!orderToDelete} onClose={() => setOrderToDelete(null)} title="Confirmar Exclusão">
         <div className="text-center p-4">
            <div className="bg-red-100 text-red-600 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4"><AlertTriangle size={32} /></div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Excluir este pedido?</h3>
            <p className="text-slate-500 text-sm mb-6">Esta ação removerá permanentemente o pedido de <strong>{orderToDelete?.clientName}</strong>.</p>
            <div className="flex gap-3">
               <button onClick={() => setOrderToDelete(null)} className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50">Cancelar</button>
               <button onClick={handleConfirmDelete} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200">Sim, Excluir</button>
            </div>
         </div>
      </Modal>

      <Modal isOpen={!!stageToDelete} onClose={() => setStageToDelete(null)} title="Excluir Etapa">
         <div className="text-center p-4">
            <div className="bg-red-100 text-red-600 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4"><AlertTriangle size={32} /></div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Excluir a etapa "{stageToDelete}"?</h3>
            <div className="flex gap-3">
               <button onClick={() => setStageToDelete(null)} className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50">Cancelar</button>
               <button onClick={handleConfirmDeleteStage} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200">Excluir Etapa</button>
            </div>
         </div>
      </Modal>

      <Modal isOpen={!!fixedExpenseToDelete} onClose={() => setFixedExpenseToDelete(null)} title="Confirmar Exclusão">
         <div className="text-center p-4">
            <div className="bg-red-100 text-red-600 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4"><AlertTriangle size={32} /></div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Excluir despesa fixa?</h3>
            <div className="flex gap-3">
               <button onClick={() => setFixedExpenseToDelete(null)} className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50">Cancelar</button>
               <button onClick={handleConfirmDeleteFixedExpense} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200">Sim, Excluir</button>
            </div>
         </div>
      </Modal>
    </div>
  );
}

export default App;
