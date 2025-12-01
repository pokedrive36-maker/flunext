import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, Package, Wallet } from 'lucide-react';

interface StatsProps {
  gross: number;
  variableExpenses: number;
  fixedExpenses: number;
  net: number;
  count: number;
}

export const StatsCards: React.FC<StatsProps> = ({ gross, variableExpenses, fixedExpenses, net, count }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-2">
           <div className="flex items-center gap-2 text-blue-600">
            <TrendingUp size={18} />
            <span className="text-xs font-semibold uppercase tracking-wider">Faturamento</span>
           </div>
           <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{count} peds</span>
        </div>
        <p className="text-2xl font-bold text-slate-800">R$ {gross.toFixed(2)}</p>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 text-orange-500 mb-2">
          <Package size={18} />
          <span className="text-xs font-semibold uppercase tracking-wider">Custos Variáveis</span>
        </div>
        <p className="text-2xl font-bold text-orange-600">R$ {variableExpenses.toFixed(2)}</p>
        <p className="text-xs text-slate-400 mt-1">Materiais de pedidos</p>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 text-red-500 mb-2">
          <Wallet size={18} />
          <span className="text-xs font-semibold uppercase tracking-wider">Despesas Fixas</span>
        </div>
        <p className="text-2xl font-bold text-red-600">R$ {fixedExpenses.toFixed(2)}</p>
        <p className="text-xs text-slate-400 mt-1">Mensais (Luz, Net...)</p>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-brand-200 bg-gradient-to-br from-white to-brand-50">
        <div className="flex items-center gap-2 text-brand-600 mb-2">
          <DollarSign size={18} />
          <span className="text-xs font-semibold uppercase tracking-wider">Resultado Líquido</span>
        </div>
        <p className={`text-2xl font-bold ${net >= 0 ? 'text-brand-700' : 'text-red-600'}`}>
          R$ {net.toFixed(2)}
        </p>
        <p className="text-xs text-slate-400 mt-1">Lucro Real do Período</p>
      </div>
    </div>
  );
};