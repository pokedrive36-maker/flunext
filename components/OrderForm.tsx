
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calculator } from 'lucide-react';
import { Order, Expense } from '../types';

interface OrderFormProps {
  initialData?: Order | null;
  availableStages: string[];
  onSave: (order: Order) => void;
  onCancel: () => void;
}

export const OrderForm: React.FC<OrderFormProps> = ({ initialData, availableStages, onSave, onCancel }) => {
  const [clientName, setClientName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<string>('');
  const [grossValue, setGrossValue] = useState<string>('0');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Form State for new expense
  const [newExpenseDesc, setNewExpenseDesc] = useState('');
  const [newExpenseVal, setNewExpenseVal] = useState('');

  useEffect(() => {
    if (initialData) {
      setClientName(initialData.clientName);
      setDescription(initialData.description);
      setStatus(initialData.status);
      setGrossValue(initialData.grossValue.toString());
      setExpenses(initialData.expenses);
      setDate(initialData.date.split('T')[0]);
    } else {
      // Reset defaults
      setClientName('');
      setDescription('');
      setStatus(availableStages[0] || 'Pendente');
      setGrossValue('');
      setExpenses([]);
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [initialData, availableStages]);

  const handleAddExpense = () => {
    if (!newExpenseDesc || !newExpenseVal) return;
    const expense: Expense = {
      id: crypto.randomUUID(),
      description: newExpenseDesc,
      value: parseFloat(newExpenseVal)
    };
    setExpenses([...expenses, expense]);
    setNewExpenseDesc('');
    setNewExpenseVal('');
  };

  const handleRemoveExpense = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  const totalExpenses = expenses.reduce((acc, curr) => acc + curr.value, 0);
  const grossNum = parseFloat(grossValue) || 0;
  const netValue = grossNum - totalExpenses;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const order: Order = {
      id: initialData?.id || crypto.randomUUID(),
      clientName,
      date: new Date(date).toISOString(),
      description,
      status: status || availableStages[0],
      grossValue: grossNum,
      expenses
    };
    onSave(order);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Cliente</label>
          <input
            required
            type="text"
            value={clientName}
            onChange={e => setClientName(e.target.value)}
            className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-brand-500 focus:outline-none"
            placeholder="Ex: Ana Maria"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Data do Pedido</label>
          <input
            required
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Descrição Detalhada</label>
        <textarea
          required
          rows={3}
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-brand-500 focus:outline-none"
          placeholder="Ex: 20 Copos Long Drink, cor Neon..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-brand-500 focus:outline-none"
          >
            {availableStages.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Valor Bruto (R$)</label>
          <input
            required
            type="number"
            step="0.01"
            min="0"
            value={grossValue}
            onChange={e => setGrossValue(e.target.value)}
            className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-brand-500 focus:outline-none"
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Expenses Section */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
        <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Calculator size={16} /> Custos e Despesas
        </h3>
        
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            type="text"
            value={newExpenseDesc}
            onChange={e => setNewExpenseDesc(e.target.value)}
            placeholder="Descrição da despesa (ex: Embalagem)"
            className="flex-1 rounded-lg border-slate-300 border p-2 text-sm"
          />
          <input
            type="number"
            value={newExpenseVal}
            onChange={e => setNewExpenseVal(e.target.value)}
            placeholder="Valor"
            step="0.01"
            className="w-full sm:w-28 rounded-lg border-slate-300 border p-2 text-sm"
          />
          <button
            type="button"
            onClick={handleAddExpense}
            className="bg-slate-800 text-white p-2 rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-center"
          >
            <Plus size={18} />
          </button>
        </div>

        {expenses.length > 0 ? (
          <ul className="space-y-2 mb-2">
            {expenses.map(expense => (
              <li key={expense.id} className="flex justify-between items-center text-sm bg-white p-2 rounded shadow-sm border border-slate-100">
                <span className="text-slate-700">{expense.description}</span>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-red-600">- R$ {expense.value.toFixed(2)}</span>
                  <button type="button" onClick={() => handleRemoveExpense(expense.id)} className="text-slate-400 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-400 text-center py-2">Nenhuma despesa registrada.</p>
        )}
      </div>

      {/* Summary Logic */}
      <div className="flex flex-col gap-2 p-4 bg-brand-50 rounded-xl border border-brand-100">
        <div className="flex justify-between text-sm text-slate-600">
          <span>Valor Bruto:</span>
          <span>R$ {grossNum.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-red-500">
          <span>Total Despesas:</span>
          <span>- R$ {totalExpenses.toFixed(2)}</span>
        </div>
        <div className="h-px bg-brand-200 my-1"></div>
        <div className="flex justify-between text-lg font-bold text-brand-800">
          <span>Lucro Líquido:</span>
          <span>R$ {netValue.toFixed(2)}</span>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 px-4 bg-white border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="flex-1 py-3 px-4 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 shadow-lg shadow-brand-200 transition-all active:scale-[0.98]"
        >
          Salvar Pedido
        </button>
      </div>
    </form>
  );
};
