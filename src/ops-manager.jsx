import React, { useState, useEffect } from 'react';
import { 
  LayoutGrid, 
  KanbanSquare, 
  Lightbulb, 
  TrendingUp, 
  BookOpen, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  ExternalLink, 
  Clock, 
  Sparkles, 
  Filter, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  Settings, 
  DollarSign, 
  CheckCircle2, 
  Target, 
  X,
  FileText,
  Calendar,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  TrendingDown,
  Sun,
  Moon,
  Calculator,
  Link2,
  Copy,
  Check,
  AlertTriangle,
  Flame,
  ArrowUpRight,
  Activity,
  Layers,
  LogOut,
  RefreshCcw
} from 'lucide-react';
import { supabase, supabaseUrl, supabaseKey } from './supabase';

// ==========================================
// FORMATTING HELPERS (BR)
// ==========================================
const R = (v) => 'R$ ' + Number(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const Pct = (v) => Number(v || 0).toFixed(1) + '%';
const Roas = (v) => Number(v || 0).toFixed(2);
const uid = () => Math.random().toString(36).substr(2, 9);

// ==========================================
// INITIAL PRE-POPULATED DATA
// ==========================================
const INITIAL_OFFERS = [];

const INITIAL_DAILY_DATA = [];

const INITIAL_TASKS = [];

const INITIAL_IDEAS = [];

const INITIAL_DIARY = [];

// ==========================================
// CORE APP COMPONENT
// ==========================================
export default function App({ session, cloudState }) {
  // Navigation State
  const [activePage, setActivePage] = useState('dashboard'); // 'dashboard' | 'pipeline' | 'kanban' | 'ideas' | 'metrics' | 'diary' | 'utils'

  // Theme State
  const [theme, setTheme] = useState(() => {
    if (cloudState && cloudState.theme) return cloudState.theme;
    const saved = localStorage.getItem('ops_theme');
    return saved ? saved : 'light'; 
  });

  // Data States
  const [offers, setOffers] = useState(() => {
    if (cloudState && cloudState.offers) return cloudState.offers;
    const saved = localStorage.getItem('ops_offers');
    const parsed = saved ? JSON.parse(saved) : INITIAL_OFFERS;
    return parsed.filter(o => o.id !== '1' && o.id !== '2' && o.id !== '3' && o.id !== '4');
  });
  
  const [dailyData, setDailyData] = useState(() => {
    if (cloudState && cloudState.dailyData) return cloudState.dailyData;
    const saved = localStorage.getItem('ops_daily_data');
    const parsed = saved ? JSON.parse(saved) : INITIAL_DAILY_DATA;
    return parsed.filter(d => !['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'd10', 'd11'].includes(d.id));
  });
  
  const [tasks, setTasks] = useState(() => {
    if (cloudState && cloudState.tasks) return cloudState.tasks;
    const saved = localStorage.getItem('ops_tasks');
    const parsed = saved ? JSON.parse(saved) : INITIAL_TASKS;
    return parsed.filter(t => !['t1', 't2', 't3', 't4', 't5'].includes(t.id));
  });
  
  const [ideas, setIdeas] = useState(() => {
    if (cloudState && cloudState.ideas) return cloudState.ideas;
    const saved = localStorage.getItem('ops_ideas');
    const parsed = saved ? JSON.parse(saved) : INITIAL_IDEAS;
    return parsed.filter(i => !['i1', 'i2', 'i3'].includes(i.id));
  });
  
  const [diary, setDiary] = useState(() => {
    if (cloudState && cloudState.diary) return cloudState.diary;
    const saved = localStorage.getItem('ops_diary');
    const parsed = saved ? JSON.parse(saved) : INITIAL_DIARY;
    return parsed.filter(y => !['y1', 'y2', 'y3'].includes(y.id));
  });

  // UI Modals / Drawers States
  const [isNewOfferModalOpen, setIsNewOfferModalOpen] = useState(false);
  const [selectedOfferIdForDrawer, setSelectedOfferIdForDrawer] = useState(null);
  const [isDailyDataDrawerOpen, setIsDailyDataDrawerOpen] = useState(false);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isNewIdeaModalOpen, setIsNewIdeaModalOpen] = useState(false);
  const [isNewDiaryModalOpen, setIsNewDiaryModalOpen] = useState(false);

  // Edit States
  const [editingTask, setEditingTask] = useState(null);
  const [editingIdea, setEditingIdea] = useState(null);
  const [editingOffer, setEditingOffer] = useState(null);
  const [editingDiary, setEditingDiary] = useState(null);

  // Filter States
  const [pipelineFilter, setPipelineFilter] = useState('todos'); // 'todos' | 'ativas' | 'pausadas' | 'mortas'
  const [kanbanOfferFilter, setKanbanOfferFilter] = useState('all');
  const [diaryTagFilter, setDiaryTagFilter] = useState('all');
  const [diaryOfferFilter, setDiaryOfferFilter] = useState('all');
  const [diarySearchQuery, setDiarySearchQuery] = useState('');
  
  // Sorting State for Ideas
  const [ideasSortBy, setIdeasSortBy] = useState('potential'); // 'potential' | 'effort' | 'date'

  // Cloud Sync Status
  const [isSyncing, setIsSyncing] = useState(false);

  // Refs for tracking changes and triggering sync on window unload
  const payloadRef = React.useRef(null);
  const isDirtyRef = React.useRef(false);

  // Setup beforeunload listener for immediate sync on tab close/refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isDirtyRef.current && payloadRef.current && session?.user?.id) {
        const url = `${supabaseUrl}/rest/v1/user_app_state`;
        const body = JSON.stringify({
          user_id: session.user.id,
          app_state: payloadRef.current,
          updated_at: new Date().toISOString()
        });

        // Use native fetch with keepalive to ensure execution during page unload
        fetch(url, {
          method: 'POST',
          keepalive: true,
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: body
        }).catch(err => console.error('Unload sync failed:', err));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [session]);

  // Persistent Storage & Cloud Sync
  useEffect(() => {
    localStorage.setItem('ops_theme', theme);
    localStorage.setItem('ops_offers', JSON.stringify(offers));
    localStorage.setItem('ops_daily_data', JSON.stringify(dailyData));
    localStorage.setItem('ops_tasks', JSON.stringify(tasks));
    localStorage.setItem('ops_ideas', JSON.stringify(ideas));
    localStorage.setItem('ops_diary', JSON.stringify(diary));

    // Update payload ref for window unload sync
    const payload = {
      theme,
      offers,
      dailyData,
      tasks,
      ideas,
      diary
    };
    payloadRef.current = payload;
    isDirtyRef.current = true;

    // Supabase Cloud Sync (Debounced)
    const syncToCloud = async () => {
      setIsSyncing(true);
      
      const { error } = await supabase
        .from('user_app_state')
        .upsert({
          user_id: session.user.id,
          app_state: payload,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
        
      if (error) {
        console.error('Error syncing to cloud:', error);
      } else {
        isDirtyRef.current = false;
      }
      
      setTimeout(() => setIsSyncing(false), 500); // Visual delay for feedback
    };

    const debounceTimer = setTimeout(syncToCloud, 1000); // Wait 1s (reduced from 2s) after last change before syncing
    return () => clearTimeout(debounceTimer);
  }, [theme, offers, dailyData, tasks, ideas, diary, session]);

  // ==========================================
  // CALCULATIONS / METRICS
  // ==========================================
  const getOfferStats = (offerId) => {
    const records = dailyData.filter(d => d.offerId === offerId);
    const rev = records.reduce((s, r) => s + Number(r.revenue || 0), 0);
    const spend = records.reduce((s, r) => s + Number(r.adSpend || 0), 0);
    const sales = records.reduce((s, r) => s + Number(r.sales || 0), 0);
    const bumps = records.reduce((s, r) => s + Number(r.bumps || 0), 0);
    const profit = rev - spend;
    const roas = spend > 0 ? rev / spend : 0;
    const cpa = sales > 0 ? spend / sales : 0;
    const arpu = sales > 0 ? rev / sales : 0;
    const margin = rev > 0 ? (profit / rev) * 100 : 0;

    const sortedRecords = [...records]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-7);
    const roasTrend = sortedRecords.map(r => r.adSpend > 0 ? r.revenue / r.adSpend : 0);

    const last7DaysProfit = sortedRecords.reduce((s, r) => s + (Number(r.revenue || 0) - Number(r.adSpend || 0)), 0);
    const dailyAvgProfit = sortedRecords.length > 0 ? last7DaysProfit / sortedRecords.length : 0;

    return {
      revenue: rev,
      spend,
      sales,
      bumps,
      profit,
      roas,
      cpa,
      arpu,
      margin,
      roasTrend,
      dailyAvgProfit
    };
  };

  const totalRevenue = dailyData.reduce((s, d) => s + Number(d.revenue || 0), 0);
  const totalSpend = dailyData.reduce((s, d) => s + Number(d.adSpend || 0), 0);
  const totalProfit = totalRevenue - totalSpend;
  const averageRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const totalSales = dailyData.reduce((s, d) => s + Number(d.sales || 0), 0);

  // Best/Worst offer today
  let bestOffer = { name: 'Sem dados', profit: 0 };
  let worstOffer = { name: 'Sem dados', profit: 0 };
  
  if (offers.length > 0) {
    const activeStats = offers.map(o => ({
      name: `${o.emoji} ${o.name}`,
      profit: getOfferStats(o.id).profit
    }));
    
    const sorted = [...activeStats].sort((a, b) => b.profit - a.profit);
    if (sorted.length > 0) {
      bestOffer = sorted[0];
      if (sorted.length > 1) {
        worstOffer = sorted[sorted.length - 1];
      }
    }
  }

  // Get daily profit and spend trend of all offers combined over the last 7 active dates
  const uniqueDates = Array.from(new Set(dailyData.map(d => d.date))).sort().slice(-7);
  const last7DaysOverallList = [];
  const chartData = uniqueDates.map(date => {
    const dayRecords = dailyData.filter(d => d.date === date);
    const rev = dayRecords.reduce((s, r) => s + Number(r.revenue || 0), 0);
    const spend = dayRecords.reduce((s, r) => s + Number(r.adSpend || 0), 0);
    const profit = rev - spend;
    last7DaysOverallList.push(profit);
    return { date, revenue: rev, spend, profit };
  });

  const overallDailyAvg = last7DaysOverallList.length > 0 
    ? last7DaysOverallList.reduce((s, v) => s + v, 0) / last7DaysOverallList.length 
    : 0;

  // ==========================================
  // OPERATIONAL CRITICAL ALERTS LOGIC (UX Boost)
  // ==========================================
  const getCriticalAlerts = () => {
    const alerts = [];

    // 1. Low ROAS Alert on active offers
    offers.filter(o => o.status === 'ativa').forEach(o => {
      const stats = getOfferStats(o.id);
      // Only check if they actually have spend
      if (stats.spend > 0 && stats.roas < 1.3) {
        alerts.push({
          type: 'danger',
          message: `ROAS crítico na oferta "${o.emoji} ${o.name}": ROAS de ${Roas(stats.roas)}x está abaixo da linha de break-even (1.3x). Revise seus anúncios imediatamente!`
        });
      }
    });

    // 2. Active offers without creative validation
    offers.filter(o => o.status === 'ativa' && o.stage !== 'ideia').forEach(o => {
      const activeCreatives = o.creatives ? o.creatives.filter(c => c.status === 'ativo') : [];
      if (activeCreatives.length === 0) {
        alerts.push({
          type: 'warning',
          message: `Oferta ativa "${o.emoji} ${o.name}" está sem nenhum criativo ativado! Suba criativos para rodar tráfego.`
        });
      }
    });

    // 3. Checklist tasks not done on testing/scaling stages
    offers.filter(o => o.status === 'ativa' && (o.stage === 'testando' || o.stage === 'escalando')).forEach(o => {
      if (o.checklist) {
        const missingItems = [];
        if (!o.checklist.pixel) missingItems.push('Pixel de conversão');
        if (!o.checklist.checkout) missingItems.push('Checkout básico');
        
        if (missingItems.length > 0) {
          alerts.push({
            type: 'warning',
            message: `Checkout / Rastreamento pendente no produto "${o.emoji} ${o.name}": Falta configurar ${missingItems.join(' e ')}.`
          });
        }
      }
    });

    // 4. Overdue tasks in Kanban
    tasks.filter(t => t.column !== 'done' && t.deadline).forEach(t => {
      const todayStr = new Date().toISOString().split('T')[0];
      if (t.deadline < todayStr) {
        alerts.push({
          type: 'danger',
          message: `Tarefa atrasada: "${t.title}" venceu em ${new Date(t.deadline + 'T00:00:00').toLocaleDateString('pt-BR')}!`
        });
      }
    });

    return alerts;
  };

  const criticalAlertsList = getCriticalAlerts();

  // ==========================================
  // DRAG & DROP FOR KANBAN
  // ==========================================
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [draggedOverColumn, setDraggedOverColumn] = useState(null);

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('text/plain', taskId);
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e, columnName) => {
    e.preventDefault();
    setDraggedOverColumn(columnName);
  };

  const handleDragLeave = () => {
    setDraggedOverColumn(null);
  };

  const handleDrop = (e, targetColumn) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (taskId) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, column: targetColumn } : t));
    }
    setDraggedTaskId(null);
    setDraggedOverColumn(null);
  };

  // ==========================================
  // ACTIONS HANDLERS
  // ==========================================
  const handleCreateOffer = (formData) => {
    const newOffer = {
      id: uid(),
      name: formData.name,
      emoji: formData.emoji || '🍇',
      type: formData.type || 'outro',
      niche: formData.niche,
      stage: formData.stage || 'ideia',
      status: formData.stage === 'pausada' || formData.stage === 'morta' ? formData.stage : 'ativa',
      pageUrl: formData.pageUrl,
      checkoutBasicUrl: formData.checkoutBasicUrl,
      checkoutCompleteUrl: formData.checkoutCompleteUrl || '',
      dailyProfitGoal: Number(formData.dailyProfitGoal || 0),
      launchDate: formData.launchDate || null,
      notes: formData.notes,
      checklist: {
        entregavel: false,
        pagina: false,
        checkout: false,
        pixel: false,
        criativos: false,
        campanhas: false,
        bumps: false
      },
      creatives: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setOffers(prev => [newOffer, ...prev]);
    setIsNewOfferModalOpen(false);

    setDiary(prev => [{
      id: uid(),
      text: `Criada nova oferta "${newOffer.emoji} ${newOffer.name}" no estágio "${newOffer.stage.toUpperCase()}".`,
      tag: 'lancamento',
      offerId: newOffer.id,
      createdAt: new Date().toISOString()
    }, ...prev]);
  };

  const handleUpdateOffer = (updated) => {
    setOffers(prev => prev.map(o => o.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : o));
    setEditingOffer(null);
  };

  const handleDeleteOffer = (offerId) => {
    if (confirm('Tem certeza que deseja excluir esta oferta e todos os seus dados vinculados?')) {
      setOffers(prev => prev.filter(o => o.id !== offerId));
      setDailyData(prev => prev.filter(d => d.offerId !== offerId));
      setTasks(prev => prev.filter(t => t.offerId !== offerId));
      setDiary(prev => prev.filter(dy => dy.offerId !== offerId));
      setSelectedOfferIdForDrawer(null);
    }
  };

  const handleLogDailyData = (formData) => {
    const newRecord = {
      id: uid(),
      offerId: formData.offerId,
      date: formData.date || new Date().toISOString().split('T')[0],
      revenue: Number(formData.revenue || 0),
      adSpend: Number(formData.adSpend || 0),
      sales: Number(formData.sales || 0),
      bumps: Number(formData.bumps || 0),
      notes: formData.notes,
      createdAt: new Date().toISOString()
    };
    setDailyData(prev => [newRecord, ...prev]);
    setIsDailyDataDrawerOpen(false);

    const offerObj = offers.find(o => o.id === formData.offerId);
    const profit = newRecord.revenue - newRecord.adSpend;
    const roas = newRecord.adSpend > 0 ? (newRecord.revenue / newRecord.adSpend).toFixed(2) : 'N/A';

    setDiary(prev => [{
      id: uid(),
      text: `Dados diários registrados para ${offerObj ? offerObj.emoji + ' ' + offerObj.name : 'Oferta'}. Faturamento: ${R(newRecord.revenue)}, Gastos: ${R(newRecord.adSpend)}, Lucro: ${R(profit)}, ROAS: ${roas}. Observação: ${newRecord.notes || 'Sem observações.'}`,
      tag: 'analise',
      offerId: formData.offerId,
      createdAt: new Date().toISOString()
    }, ...prev]);
  };

  const handleDeleteDailyRecord = (recordId) => {
    if (confirm('Deletar este registro diário?')) {
      setDailyData(prev => prev.filter(d => d.id !== recordId));
    }
  };

  const handleAddCreative = (offerId, name, roas, notes) => {
    const newCreative = {
      id: uid(),
      name,
      status: 'ativo',
      roas: Number(roas || 0),
      notes
    };
    setOffers(prev => prev.map(o => {
      if (o.id === offerId) {
        return {
          ...o,
          creatives: [...(o.creatives || []), newCreative]
        };
      }
      return o;
    }));
  };

  const handleToggleCreative = (offerId, creativeId) => {
    setOffers(prev => prev.map(o => {
      if (o.id === offerId) {
        return {
          ...o,
          creatives: o.creatives.map(c => c.id === creativeId ? { ...c, status: c.status === 'ativo' ? 'pausado' : 'ativo' } : c)
        };
      }
      return o;
    }));
  };

  const handleDeleteCreative = (offerId, creativeId) => {
    if (confirm('Deletar este criativo?')) {
      setOffers(prev => prev.map(o => {
        if (o.id === offerId) {
          return {
            ...o,
            creatives: o.creatives.filter(c => c.id !== creativeId)
          };
        }
        return o;
      }));
    }
  };

  const handleCreateTask = (formData) => {
    const newTask = {
      id: uid(),
      title: formData.title,
      type: formData.type || 'setup',
      offerId: formData.offerId || null,
      priority: formData.priority || 'media',
      deadline: formData.deadline || null,
      column: 'todo',
      createdAt: new Date().toISOString()
    };
    setTasks(prev => [newTask, ...prev]);
    setIsNewTaskModalOpen(false);
  };

  const handleUpdateTask = (updated) => {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    setEditingTask(null);
  };

  const handleDeleteTask = (taskId) => {
    if (confirm('Deletar esta tarefa?')) {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      setEditingTask(null);
    }
  };

  const handleCreateIdea = (formData) => {
    const newIdea = {
      id: uid(),
      name: formData.name,
      description: formData.description,
      type: formData.type || 'outro',
      potential: Number(formData.potential || 3),
      effort: Number(formData.effort || 3),
      notes: formData.notes,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim().toLowerCase()) : [],
      createdAt: new Date().toISOString()
    };
    setIdeas(prev => [newIdea, ...prev]);
    setIsNewIdeaModalOpen(false);
  };

  const handleUpdateIdea = (updated) => {
    setIdeas(prev => prev.map(i => i.id === updated.id ? updated : i));
    setEditingIdea(null);
  };

  const handleDeleteIdea = (ideaId) => {
    if (confirm('Deletar esta ideia?')) {
      setIdeas(prev => prev.filter(i => i.id !== ideaId));
      setEditingIdea(null);
    }
  };

  const handleMoveIdeaToPipeline = (idea) => {
    const newOffer = {
      id: uid(),
      name: idea.name,
      emoji: '💡',
      type: idea.type || 'outro',
      niche: idea.description,
      stage: 'ideia',
      status: 'ativa',
      pageUrl: '',
      checkoutBasicUrl: '',
      checkoutCompleteUrl: '',
      dailyProfitGoal: 100,
      launchDate: null,
      notes: `Convertido a partir de ideia. Notas originais: ${idea.notes}`,
      checklist: {
        entregavel: false,
        pagina: false,
        checkout: false,
        pixel: false,
        criativos: false,
        campanhas: false,
        bumps: false
      },
      creatives: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setOffers(prev => [newOffer, ...prev]);
    setIdeas(prev => prev.filter(i => i.id !== idea.id));

    setDiary(prev => [{
      id: uid(),
      text: `Mapeou a ideia "${idea.name}" para o Pipeline no estágio IDEIA.`,
      tag: 'insight',
      offerId: newOffer.id,
      createdAt: new Date().toISOString()
    }, ...prev]);
    
    setActivePage('pipeline');
  };

  const handleCreateDiary = (formData) => {
    const newDiary = {
      id: uid(),
      text: formData.text,
      tag: formData.tag || 'insight',
      offerId: formData.offerId || null,
      createdAt: new Date().toISOString()
    };
    setDiary(prev => [newDiary, ...prev]);
    setIsNewDiaryModalOpen(false);
  };

  const handleUpdateDiary = (updated) => {
    setDiary(prev => prev.map(dy => dy.id === updated.id ? updated : dy));
    setEditingDiary(null);
  };

  const handleDeleteDiary = (diaryId) => {
    if (confirm('Deletar esta entrada do diário?')) {
      setDiary(prev => prev.filter(dy => dy.id !== diaryId));
      setEditingDiary(null);
    }
  };

  const handleExportDiary = () => {
    const content = diary.map(dy => {
      const offer = offers.find(o => o.id === dy.offerId);
      const dateStr = new Date(dy.createdAt).toLocaleString('pt-BR');
      return `[${dateStr}] [${dy.tag.toUpperCase()}] ${offer ? `(${offer.emoji} ${offer.name})` : ''}\n${dy.text}\n----------------------------------------\n`;
    }).join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `diario-operacional-${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const activeOfferForDrawer = offers.find(o => o.id === selectedOfferIdForDrawer);

  return (
    <div className={`app-container ${theme === 'dark' ? 'dark-theme' : ''}`}>
      
      {/* ────────────────── SIDEBAR ────────────────── */}
      <aside className="sidebar">
        <div>
          {/* Logo with indigo->purple gradient */}
          <div style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: '24px',
            background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '0.1em',
            padding: '8px 12px',
            marginBottom: '16px',
            borderBottom: '1px solid var(--border)'
          }}>
            OPS
          </div>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button 
              className="btn" 
              onClick={() => setActivePage('dashboard')}
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                padding: '8px 12px',
                backgroundColor: activePage === 'dashboard' ? 'var(--bg3)' : 'transparent',
                border: activePage === 'dashboard' ? '1px solid var(--border2)' : '1px solid transparent',
                color: activePage === 'dashboard' ? 'var(--text)' : 'var(--text2)',
                textAlign: 'left'
              }}
            >
              <LayoutGrid size={16} color={activePage === 'dashboard' ? 'var(--accent)' : 'currentColor'} />
              <span style={{ fontSize: '13px' }}>Dashboard</span>
            </button>

            <button 
              className="btn" 
              onClick={() => setActivePage('pipeline')}
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                padding: '8px 12px',
                backgroundColor: activePage === 'pipeline' ? 'var(--bg3)' : 'transparent',
                border: activePage === 'pipeline' ? '1px solid var(--border2)' : '1px solid transparent',
                color: activePage === 'pipeline' ? 'var(--text)' : 'var(--text2)',
                textAlign: 'left'
              }}
            >
              <Layers size={16} color={activePage === 'pipeline' ? 'var(--accent)' : 'currentColor'} />
              <span style={{ fontSize: '13px' }}>Pipeline</span>
            </button>

            <button 
              className="btn" 
              onClick={() => setActivePage('kanban')}
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                padding: '8px 12px',
                backgroundColor: activePage === 'kanban' ? 'var(--bg3)' : 'transparent',
                border: activePage === 'kanban' ? '1px solid var(--border2)' : '1px solid transparent',
                color: activePage === 'kanban' ? 'var(--text)' : 'var(--text2)',
                textAlign: 'left'
              }}
            >
              <KanbanSquare size={16} color={activePage === 'kanban' ? 'var(--accent)' : 'currentColor'} />
              <span style={{ fontSize: '13px' }}>Kanban</span>
            </button>

            <button 
              className="btn" 
              onClick={() => setActivePage('ideas')}
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                padding: '8px 12px',
                backgroundColor: activePage === 'ideas' ? 'var(--bg3)' : 'transparent',
                border: activePage === 'ideas' ? '1px solid var(--border2)' : '1px solid transparent',
                color: activePage === 'ideas' ? 'var(--text)' : 'var(--text2)',
                textAlign: 'left'
              }}
            >
              <Lightbulb size={16} color={activePage === 'ideas' ? 'var(--accent)' : 'currentColor'} />
              <span style={{ fontSize: '13px' }}>Ideias</span>
            </button>

            <button 
              className="btn" 
              onClick={() => setActivePage('metrics')}
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                padding: '8px 12px',
                backgroundColor: activePage === 'metrics' ? 'var(--bg3)' : 'transparent',
                border: activePage === 'metrics' ? '1px solid var(--border2)' : '1px solid transparent',
                color: activePage === 'metrics' ? 'var(--text)' : 'var(--text2)',
                textAlign: 'left'
              }}
            >
              <TrendingUp size={16} color={activePage === 'metrics' ? 'var(--accent)' : 'currentColor'} />
              <span style={{ fontSize: '13px' }}>Métricas</span>
            </button>

            <button 
              className="btn" 
              onClick={() => setActivePage('diary')}
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                padding: '8px 12px',
                backgroundColor: activePage === 'diary' ? 'var(--bg3)' : 'transparent',
                border: activePage === 'diary' ? '1px solid var(--border2)' : '1px solid transparent',
                color: activePage === 'diary' ? 'var(--text)' : 'var(--text2)',
                textAlign: 'left'
              }}
            >
              <BookOpen size={16} color={activePage === 'diary' ? 'var(--accent)' : 'currentColor'} />
              <span style={{ fontSize: '13px' }}>Diário</span>
            </button>

            <button 
              className="btn" 
              onClick={() => setActivePage('utils')}
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                padding: '8px 12px',
                backgroundColor: activePage === 'utils' ? 'var(--bg3)' : 'transparent',
                border: activePage === 'utils' ? '1px solid var(--border2)' : '1px solid transparent',
                color: activePage === 'utils' ? 'var(--text)' : 'var(--text2)',
                textAlign: 'left'
              }}
            >
              <Calculator size={16} color={activePage === 'utils' ? 'var(--accent)' : 'currentColor'} />
              <span style={{ fontSize: '13px' }}>Calculadora & UTM</span>
            </button>
          </nav>
        </div>

        {/* Theme Switcher and User Info at Base */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          {/* Theme switcher */}
          <button 
            className="btn btn-secondary" 
            onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
            style={{ width: '100%', padding: '6px', fontSize: '11px' }}
          >
            {theme === 'light' ? (
              <>
                <Moon size={12} />
                <span>Tema Escuro</span>
              </>
            ) : (
              <>
                <Sun size={12} />
                <span>Tema Claro</span>
              </>
            )}
          </button>

          {/* User info */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 6px',
            borderTop: '1px solid var(--border)'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent2) 0%, var(--accent) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#fff'
            }}>
              IS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Isac</span>
              <span style={{ fontSize: '10px', color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                {isSyncing ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent)' }}>
                    <RefreshCcw size={10} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                    Sincronizando
                  </span>
                ) : 'Nuvem Atualizada'}
              </span>
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              title="Sair"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text2)',
                cursor: 'pointer',
                marginLeft: 'auto',
                padding: '4px'
              }}
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ────────────────── MAIN PANELS ────────────────── */}
      <div className="main-content">
        
        {/* ── TOP HEADER ── */}
        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '16px', color: 'var(--text)' }}>
              {activePage === 'dashboard' && 'Dashboard Operacional'}
              {activePage === 'pipeline' && 'Pipeline de Ofertas'}
              {activePage === 'kanban' && 'Kanban de Tarefas'}
              {activePage === 'ideas' && 'Banco de Ideias'}
              {activePage === 'metrics' && 'Performance & Métricas'}
              {activePage === 'diary' && 'Diário de Operações'}
              {activePage === 'utils' && 'Calculadora de Tráfego & Gerador UTM'}
            </h2>
          </div>

          {/* Goal Progress bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
              <div style={{ display: 'flex', gap: '8px', fontSize: '11px', fontWeight: '500' }}>
                <span style={{ color: 'var(--text2)' }}>Meta R$1.000/dia:</span>
                <span style={{ color: overallDailyAvg >= 1000 ? 'var(--green)' : 'var(--yellow)' }}>
                  {R(overallDailyAvg)}/dia ({Pct((overallDailyAvg / 1000) * 100)})
                </span>
              </div>
              <div style={{ width: '120px', height: '4px', backgroundColor: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${Math.min(100, (overallDailyAvg / 1000) * 100)}%`, 
                  height: '100%', 
                  backgroundColor: overallDailyAvg >= 1000 ? 'var(--green)' : 'var(--accent)',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>

            {/* Main triggers */}
            {activePage === 'pipeline' && (
              <button className="btn btn-primary" onClick={() => setIsNewOfferModalOpen(true)}>
                <Plus size={14} /> Nova Oferta
              </button>
            )}
            {activePage === 'kanban' && (
              <button className="btn btn-primary" onClick={() => setIsNewTaskModalOpen(true)}>
                <Plus size={14} /> Nova Tarefa
              </button>
            )}
            {activePage === 'ideas' && (
              <button className="btn btn-primary" onClick={() => setIsNewIdeaModalOpen(true)}>
                <Plus size={14} /> Nova Ideia
              </button>
            )}
            {activePage === 'metrics' && (
              <button className="btn btn-primary" onClick={() => setIsDailyDataDrawerOpen(true)}>
                <Plus size={14} /> Registrar Dia
              </button>
            )}
            {activePage === 'diary' && (
              <button className="btn btn-primary" onClick={() => setIsNewDiaryModalOpen(true)}>
                <Plus size={14} /> Nova Entrada
              </button>
            )}
          </div>
        </header>

        {/* ── PAGE CONTENT ── */}
        <main className="page-container">

          {/* ========================================================
              PAGE 0: DASHBOARD (Novo Core Landing de UX Avançado)
              ======================================================== */}
          {activePage === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Critical alerts banner (if any) */}
              {criticalAlertsList.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {criticalAlertsList.map((alert, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        backgroundColor: alert.type === 'danger' ? 'var(--red-dim)' : 'var(--yellow-dim)',
                        border: `1px solid ${alert.type === 'danger' ? 'var(--red)' : 'var(--yellow)'}`,
                        color: alert.type === 'danger' ? 'var(--red)' : 'var(--yellow)',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        fontSize: '13px',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                    >
                      <AlertTriangle size={16} />
                      <span>{alert.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Top Widgets Summary */}
              <div className="dashboard-grid">
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text2)' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold' }}>FATURAMENTO ACUMULADO</span>
                    <DollarSign size={14} />
                  </div>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--accent)' }}>{R(totalRevenue)}</span>
                </div>

                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text2)' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold' }}>LUCRO LÍQUIDO</span>
                    <Flame size={14} color="var(--green)" />
                  </div>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--green)' }}>{R(totalProfit)}</span>
                </div>

                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text2)' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold' }}>INVESTIMENTO EM ADS</span>
                    <Activity size={14} color="var(--red)" />
                  </div>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text)' }}>{R(totalSpend)}</span>
                </div>

                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text2)' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold' }}>ROAS MÉDIO DA OPERAÇÃO</span>
                    <Target size={14} color="var(--accent2)" />
                  </div>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: averageRoas >= 1.5 ? 'var(--green)' : 'var(--text)' }}>
                    {Roas(averageRoas)}x
                  </span>
                </div>
              </div>

              {/* Main SVG Area Chart: Revenue vs Spend vs Profit (Past 7 dates) */}
              <div className="card" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={16} color="var(--accent)" />
                  <span>Histórico do Lucro vs. Investimento (Últimos 7 dias cadastrados)</span>
                </h3>
                {chartData.length > 1 ? (
                  <div style={{ width: '100%' }}>
                    <SvgDashboardChart data={chartData} />
                  </div>
                ) : (
                  <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text3)', border: '1px dashed var(--border)', borderRadius: '8px' }}>
                    Cadastre dados diários de faturamento e anúncios na aba "Métricas" para renderizar o gráfico histórico.
                  </div>
                )}
              </div>

              {/* Split Content: Quick Actions & Operational Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '20px' }}>
                
                {/* Left Side: Quick actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ fontSize: '13px', color: 'var(--text2)', fontFamily: 'Space Grotesk' }}>Atalhos Rápidos</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button className="btn btn-secondary" onClick={() => setIsNewOfferModalOpen(true)} style={{ padding: '12px', fontSize: '12px', flexDirection: 'column', gap: '6px' }}>
                      <Layers size={16} />
                      <span>Nova Oferta</span>
                    </button>
                    <button className="btn btn-secondary" onClick={() => setIsDailyDataDrawerOpen(true)} style={{ padding: '12px', fontSize: '12px', flexDirection: 'column', gap: '6px' }}>
                      <DollarSign size={16} />
                      <span>Registrar Dia</span>
                    </button>
                    <button className="btn btn-secondary" onClick={() => setIsNewTaskModalOpen(true)} style={{ padding: '12px', fontSize: '12px', flexDirection: 'column', gap: '6px' }}>
                      <KanbanSquare size={16} />
                      <span>Nova Tarefa</span>
                    </button>
                    <button className="btn btn-secondary" onClick={() => setIsNewIdeaModalOpen(true)} style={{ padding: '12px', fontSize: '12px', flexDirection: 'column', gap: '6px' }}>
                      <Lightbulb size={16} />
                      <span>Nova Ideia</span>
                    </button>
                    <button className="btn btn-secondary" onClick={() => { setActivePage('utils') }} style={{ padding: '12px', fontSize: '12px', flexDirection: 'column', gap: '6px', gridColumn: 'span 2' }}>
                      <Calculator size={16} />
                      <span>Calculadora de CPA/ROAS Alvo</span>
                    </button>
                  </div>

                  {/* Operational checklist summary */}
                  <div className="card" style={{ padding: '14px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 'bold' }}>DADOS DA OPERAÇÃO</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text2)' }}>Ofertas Ativas:</span>
                        <span style={{ fontWeight: 'bold' }}>{offers.filter(o => o.status === 'ativa').length}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text2)' }}>Ideias no Banco:</span>
                        <span style={{ fontWeight: 'bold' }}>{ideas.length}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text2)' }}>Tarefas Pendentes:</span>
                        <span style={{ fontWeight: 'bold' }}>{tasks.filter(t => t.column !== 'done').length}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: Diary & Kanban summary */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Recent tasks list */}
                  <div className="card" style={{ padding: '0' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ fontSize: '13px' }}>Tarefas Prioritárias Recentes</h4>
                      <button className="btn" onClick={() => setActivePage('kanban')} style={{ fontSize: '11px', padding: '0', color: 'var(--accent)', border: 'none', background: 'transparent' }}>
                        Ver Kanban <ArrowUpRight size={12} />
                      </button>
                    </div>
                    <div>
                      {tasks.filter(t => t.column !== 'done').slice(0, 3).map(task => {
                        const linkedOffer = offers.find(o => o.id === task.offerId);
                        return (
                          <div key={task.id} className="list-item-sub">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span>{task.title}</span>
                              <span style={{ fontSize: '10px', color: 'var(--text3)' }}>
                                {linkedOffer ? `${linkedOffer.emoji} ${linkedOffer.name}` : 'Geral'}
                              </span>
                            </div>
                            <span className={`badge ${task.priority === 'alta' ? 'badge-red' : 'badge-yellow'}`} style={{ scale: '0.8' }}>
                              {task.priority}
                            </span>
                          </div>
                        );
                      })}
                      {tasks.filter(t => t.column !== 'done').length === 0 && (
                        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text3)', fontSize: '12px' }}>
                          Nenhuma tarefa pendente.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recent Diary Logs */}
                  <div className="card" style={{ padding: '0' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ fontSize: '13px' }}>Últimas Observações do Diário</h4>
                      <button className="btn" onClick={() => setActivePage('diary')} style={{ fontSize: '11px', padding: '0', color: 'var(--accent)', border: 'none', background: 'transparent' }}>
                        Ver Diário <ArrowUpRight size={12} />
                      </button>
                    </div>
                    <div>
                      {diary.slice(0, 2).map(dy => (
                        <div key={dy.id} className="list-item-sub" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '11px', color: 'var(--text3)' }}>
                            <span>{new Date(dy.createdAt).toLocaleDateString('pt-BR')}</span>
                            <span>{dy.tag.toUpperCase()}</span>
                          </div>
                          <p style={{ color: 'var(--text)', fontSize: '12px', lineHeight: '1.4' }}>
                            {dy.text.substring(0, 100)}{dy.text.length > 100 ? '...' : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* ========================================================
              PAGE 1: PIPELINE
              ======================================================== */}
          {activePage === 'pipeline' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
              
              {/* Pipeline controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['todos', 'ativas', 'pausadas', 'mortas'].map(filter => (
                    <button
                      key={filter}
                      className="btn"
                      onClick={() => setPipelineFilter(filter)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        backgroundColor: pipelineFilter === filter ? 'var(--border)' : 'transparent',
                        border: '1px solid var(--border)',
                        color: pipelineFilter === filter ? 'var(--text)' : 'var(--text2)',
                      }}
                    >
                      {filter.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pipeline Columns - Scroll Horizontal container */}
              <div style={{ 
                display: 'flex', 
                gap: '16px', 
                flex: 1, 
                overflowX: 'auto', 
                paddingBottom: '16px',
                alignItems: 'stretch'
              }}>
                {[
                  { id: 'ideia', title: 'Ideia', bg: 'rgba(59, 130, 246, 0.03)' },
                  { id: 'construindo', title: 'Construindo', bg: 'rgba(245, 158, 11, 0.03)' },
                  { id: 'testando', title: 'Testando', bg: 'rgba(139, 92, 246, 0.03)' },
                  { id: 'escalando', title: 'Escalando', bg: 'rgba(16, 185, 129, 0.03)' },
                  { id: 'pausada', title: 'Pausada / Morta', bg: 'rgba(148, 163, 184, 0.03)' }
                ].map(col => {
                  const colOffers = offers.filter(o => {
                    if (col.id === 'pausada') {
                      if (o.stage !== 'pausada' && o.stage !== 'morta') return false;
                    } else {
                      if (o.stage !== col.id) return false;
                    }

                    if (pipelineFilter === 'ativas') return o.status === 'ativa';
                    if (pipelineFilter === 'pausadas') return o.status === 'pausada';
                    if (pipelineFilter === 'mortas') return o.status === 'morta';
                    return true;
                  });

                  return (
                    <div 
                      key={col.id} 
                      style={{ 
                        flex: '0 0 280px',
                        width: '280px',
                        backgroundColor: col.bg,
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: '400px'
                      }}
                    >
                      {/* Column Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontFamily: 'Space Grotesk', fontWeight: '600', fontSize: '14px', color: 'var(--text)' }}>
                          {col.title}
                        </span>
                        <span className="badge badge-gray" style={{ borderRadius: '4px', fontSize: '10px' }}>
                          {colOffers.length}
                        </span>
                      </div>

                      {/* Offer cards list */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto', marginBottom: '12px' }}>
                        {colOffers.map(offer => {
                          const stats = getOfferStats(offer.id);
                          const activeCreativesCount = offer.creatives ? offer.creatives.filter(c => c.status === 'ativo').length : 0;
                          
                          let leftBorderColor = 'var(--border2)';
                          if (stats.roas >= 2.5) leftBorderColor = 'var(--green)';
                          else if (stats.roas >= 1.5) leftBorderColor = 'var(--blue)';
                          else if (stats.roas >= 1.0) leftBorderColor = 'var(--yellow)';
                          else if (stats.roas > 0) leftBorderColor = 'var(--red)';

                          const profitGoal = offer.dailyProfitGoal || 1;
                          const progressPercentage = Math.min(100, Math.round((stats.dailyAvgProfit / profitGoal) * 100));

                          let launchDaysText = 'Não lançada';
                          if (offer.launchDate) {
                            const diffTime = Math.abs(new Date() - new Date(offer.launchDate));
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            launchDaysText = `Lançada há ${diffDays} dias`;
                          }

                          return (
                            <div 
                              key={offer.id} 
                              className="card"
                              onClick={() => setSelectedOfferIdForDrawer(offer.id)}
                              style={{ 
                                cursor: 'pointer',
                                padding: '12px',
                                borderLeft: `3px solid ${leftBorderColor}`
                              }}
                            >
                              {/* Title line */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                <h4 style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  <span>{offer.emoji}</span>
                                  <span>{offer.name}</span>
                                </h4>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <button 
                                    className="btn" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingOffer(offer);
                                    }}
                                    style={{ padding: '2px 4px', border: 'none', background: 'transparent', color: 'var(--text3)' }}
                                  >
                                    <Edit size={12} />
                                  </button>
                                </div>
                              </div>

                              {/* Details Type / Status */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text2)', marginBottom: '8px' }}>
                                <span>{offer.type === 'pack_artes' ? 'Pack Artes' : offer.type.toUpperCase()}</span>
                                <span className={`badge ${offer.status === 'ativa' ? 'badge-green' : offer.status === 'pausada' ? 'badge-yellow' : 'badge-red'}`} style={{ transform: 'scale(0.85)', transformOrigin: 'right center', padding: '0px 4px' }}>
                                  {offer.status}
                                </span>
                              </div>

                              <hr style={{ border: 'none', borderBottom: '1px solid var(--border)', margin: '8px 0' }} />

                              {/* Key Metrics grid */}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', marginBottom: '8px', textAlign: 'center' }}>
                                <div>
                                  <div style={{ fontSize: '9px', color: 'var(--text3)' }}>ROAS</div>
                                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: stats.roas >= 1.5 ? 'var(--green)' : stats.roas > 0 ? 'var(--red)' : 'var(--text)' }}>
                                    {stats.roas > 0 ? Roas(stats.roas) : '—'}
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '9px', color: 'var(--text3)' }}>CPA</div>
                                  <div style={{ fontSize: '11px', fontWeight: 'bold' }}>
                                    {stats.cpa > 0 ? R(stats.cpa) : '—'}
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '9px', color: 'var(--text3)' }}>Lucro/dia</div>
                                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: stats.dailyAvgProfit > 0 ? 'var(--green)' : 'var(--text)' }}>
                                    {R(stats.dailyAvgProfit)}
                                  </div>
                                </div>
                              </div>

                              <hr style={{ border: 'none', borderBottom: '1px solid var(--border)', margin: '8px 0' }} />

                              {/* Goal Progress bar */}
                              <div style={{ marginBottom: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text2)', marginBottom: '3px' }}>
                                  <span>Progresso Meta:</span>
                                  <span>{progressPercentage}%</span>
                                </div>
                                <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                                  <div style={{ 
                                    width: `${progressPercentage}%`, 
                                    height: '100%', 
                                    backgroundColor: progressPercentage >= 100 ? 'var(--green)' : 'var(--accent)' 
                                  }} />
                                </div>
                                <div style={{ fontSize: '8px', color: 'var(--text3)', textAlign: 'right', marginTop: '2px' }}>
                                  Meta: {R(offer.dailyProfitGoal)}/dia
                                </div>
                              </div>

                              <hr style={{ border: 'none', borderBottom: '1px solid var(--border)', margin: '8px 0' }} />

                              {/* Footer details */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '9px', color: 'var(--text2)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Calendar size={10} />
                                  <span>{launchDaysText}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Sparkles size={10} color="var(--yellow)" />
                                  <span>{activeCreativesCount} criativos ativos</span>
                                </div>
                              </div>

                            </div>
                          );
                        })}
                      </div>

                      {/* Column Footer trigger */}
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => {
                          setIsNewOfferModalOpen({ stage: col.id });
                        }}
                        style={{ width: '100%', padding: '6px', fontSize: '11px' }}
                      >
                        <Plus size={12} /> Adicionar Oferta
                      </button>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* ========================================================
              PAGE 2: KANBAN
              ======================================================== */}
          {activePage === 'kanban' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
              
              {/* Filters / Headers */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text2)', fontWeight: '500' }}>Filtrar por Oferta:</span>
                  <select 
                    value={kanbanOfferFilter} 
                    onChange={(e) => setKanbanOfferFilter(e.target.value)}
                    style={{ width: '180px', padding: '6px 12px' }}
                  >
                    <option value="all">Todas as Ofertas</option>
                    {offers.map(o => (
                      <option key={o.id} value={o.id}>{o.emoji} {o.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Kanban Columns */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', flex: 1, alignItems: 'stretch' }}>
                {[
                  { id: 'todo', title: 'A Fazer' },
                  { id: 'doing', title: 'Fazendo' },
                  { id: 'review', title: 'Revisão' },
                  { id: 'done', title: 'Feito' }
                ].map(col => {
                  const colTasks = tasks.filter(t => {
                    if (t.column !== col.id) return false;
                    if (kanbanOfferFilter !== 'all' && t.offerId !== kanbanOfferFilter) return false;
                    return true;
                  });

                  return (
                    <div 
                      key={col.id}
                      onDragOver={(e) => handleDragOver(e, col.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, col.id)}
                      className={draggedOverColumn === col.id ? 'drag-over' : ''}
                      style={{
                        backgroundColor: 'var(--bg2)',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'all 150ms ease',
                        minHeight: '350px'
                      }}
                    >
                      {/* Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <span style={{ fontFamily: 'Space Grotesk', fontWeight: '600', fontSize: '14px', color: 'var(--text)' }}>
                          {col.title}
                        </span>
                        <span className="badge badge-gray" style={{ borderRadius: '4px', fontSize: '10px' }}>
                          {colTasks.length}
                        </span>
                      </div>

                      {/* Tasks lists */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto' }}>
                        {colTasks.map(task => {
                          const linkedOffer = offers.find(o => o.id === task.offerId);
                          
                          let typeColor = 'var(--text2)';
                          let typeLabel = 'Setup';
                          if (task.type === 'criativo') { typeColor = '#f97316'; typeLabel = 'Criativo'; }
                          else if (task.type === 'pagina') { typeColor = '#3b82f6'; typeLabel = 'Página'; }
                          else if (task.type === 'setup') { typeColor = '#6b7280'; typeLabel = 'Setup'; }
                          else if (task.type === 'analise') { typeColor = '#10b981'; typeLabel = 'Análise'; }
                          else if (task.type === 'lancamento') { typeColor = '#8b5cf6'; typeLabel = 'Lançamento'; }
                          else if (task.type === 'fix') { typeColor = '#ef4444'; typeLabel = 'Fix'; }

                          let priorityBadgeColor = 'badge-gray';
                          if (task.priority === 'alta') priorityBadgeColor = 'badge-red';
                          else if (task.priority === 'media') priorityBadgeColor = 'badge-yellow';
                          else if (task.priority === 'baixa') priorityBadgeColor = 'badge-blue';

                          return (
                            <div
                              key={task.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, task.id)}
                              onClick={() => setEditingTask(task)}
                              style={{ 
                                cursor: 'grab', 
                                padding: '10px', 
                                borderLeft: `3px solid ${typeColor}`,
                                backgroundColor: 'var(--bg2)'
                              }}
                              className="card"
                            >
                              {/* Task Title */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px', marginBottom: '8px' }}>
                                <span style={{ fontSize: '12px', fontWeight: '500', lineHeight: '1.4' }}>
                                  {task.title}
                                </span>
                              </div>

                              <hr style={{ border: 'none', borderBottom: '1px solid var(--border)', margin: '6px 0' }} />

                              {/* Task Details */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ color: 'var(--text3)' }}>{typeLabel}</span>
                                  <span className={`badge ${priorityBadgeColor}`} style={{ scale: '0.85', transformOrigin: 'right center' }}>
                                    {task.priority}
                                  </span>
                                </div>
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                                  <span style={{ color: 'var(--text2)', fontWeight: 'bold' }}>
                                    {linkedOffer ? `${linkedOffer.emoji} ${linkedOffer.name}` : 'Geral'}
                                  </span>
                                  {task.deadline && (
                                    <span style={{ color: new Date(task.deadline) < new Date() ? 'var(--red)' : 'var(--text2)' }}>
                                      {new Date(task.deadline).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* ========================================================
              PAGE 3: IDEIAS
              ======================================================== */}
          {activePage === 'ideas' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Header and Sorting */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text2)', fontWeight: '500' }}>Ordenar por:</span>
                  <select 
                    value={ideasSortBy} 
                    onChange={(e) => setIdeasSortBy(e.target.value)}
                    style={{ width: '150px', padding: '6px 12px' }}
                  >
                    <option value="potential">Potencial ⭐</option>
                    <option value="effort">Menor Esforço ⚡</option>
                    <option value="date">Mais Recente 📅</option>
                  </select>
                </div>
              </div>

              {/* Ideas Grid */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                gap: '16px' 
              }}>
                {[...ideas]
                  .sort((a, b) => {
                    if (ideasSortBy === 'potential') return b.potential - a.potential;
                    if (ideasSortBy === 'effort') return a.effort - b.effort;
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                  })
                  .map(idea => {
                    return (
                      <div key={idea.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '220px' }}>
                        <div>
                          {/* Idea Title */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <h3 style={{ fontSize: '15px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>💡</span>
                              <span>{idea.name}</span>
                            </h3>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button 
                                className="btn" 
                                onClick={() => setEditingIdea(idea)}
                                style={{ padding: '2px 4px', border: 'none', background: 'transparent', color: 'var(--text3)' }}
                              >
                                <Edit size={12} />
                              </button>
                              <button 
                                className="btn" 
                                onClick={() => handleDeleteIdea(idea.id)}
                                style={{ padding: '2px 4px', border: 'none', background: 'transparent', color: 'var(--red)' }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          {/* Idea description */}
                          <p style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '12px', lineHeight: '1.4' }}>
                            {idea.description}
                          </p>

                          {/* Notes */}
                          {idea.notes && (
                            <div style={{ fontSize: '11px', color: 'var(--text3)', borderLeft: '2px solid var(--border2)', paddingLeft: '8px', marginBottom: '12px' }}>
                              {idea.notes}
                            </div>
                          )}

                          {/* Ratings for Potential & Effort */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: 'var(--text3)' }}>Potencial:</span>
                              <span style={{ color: 'var(--yellow)', letterSpacing: '2px' }}>
                                {'★'.repeat(idea.potential)}{'☆'.repeat(5 - idea.potential)}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: 'var(--text3)' }}>Esforço:</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ display: 'flex', gap: '2px' }}>
                                  {[1, 2, 3, 4, 5].map(v => (
                                    <div 
                                      key={v} 
                                      style={{ 
                                        width: '10px', 
                                        height: '6px', 
                                        backgroundColor: v <= idea.effort ? 'var(--accent)' : 'var(--border2)',
                                        borderRadius: '1px'
                                      }} 
                                    />
                                  ))}
                                </div>
                                <span style={{ color: 'var(--text2)', fontSize: '10px' }}>
                                  {idea.effort <= 2 ? 'Baixo' : idea.effort >= 4 ? 'Alto' : 'Médio'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Conversion & tags footer */}
                        <div>
                          {idea.tags && idea.tags.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                              {idea.tags.map(tag => (
                                <span key={tag} style={{ fontSize: '9px', backgroundColor: 'var(--bg3)', color: 'var(--text2)', padding: '1px 6px', borderRadius: '4px' }}>
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}

                          <button 
                            className="btn btn-primary" 
                            onClick={() => handleMoveIdeaToPipeline(idea)}
                            style={{ width: '100%', fontSize: '11px', padding: '6px' }}
                          >
                            Mover para Pipeline <ArrowRight size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>

            </div>
          )}

          {/* ========================================================
              PAGE 4: MÉTRICAS
              ======================================================== */}
          {activePage === 'metrics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* KPIs Gerais */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text2)', fontFamily: 'Space Grotesk' }}>FATURAMENTO TOTAL</span>
                  <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--accent)' }}>{R(totalRevenue)}</span>
                </div>
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text2)', fontFamily: 'Space Grotesk' }}>LUCRO TOTAL</span>
                  <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--green)' }}>{R(totalProfit)}</span>
                </div>
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text2)', fontFamily: 'Space Grotesk' }}>ROAS MÉDIO</span>
                  <span style={{ fontSize: '18px', fontWeight: 'bold', color: averageRoas >= 1.5 ? 'var(--green)' : 'var(--text)' }}>
                    {Roas(averageRoas)}x
                  </span>
                </div>
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text2)', fontFamily: 'Space Grotesk' }}>MELHOR OFERTA (Lucro)</span>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--green)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {bestOffer.name}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text3)' }}>{R(bestOffer.profit)}</span>
                </div>
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text2)', fontFamily: 'Space Grotesk' }}>PIOR OFERTA (Lucro)</span>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--red)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {worstOffer.name}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text3)' }}>{R(worstOffer.profit)}</span>
                </div>
              </div>

              {/* Performance Table */}
              <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '14px', color: 'var(--text)' }}>Performance Geral por Oferta</h3>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg3)', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '12px 16px', color: 'var(--text2)', fontWeight: '500' }}>Oferta</th>
                        <th style={{ padding: '12px 16px', color: 'var(--text2)', fontWeight: '500' }}>Estágio</th>
                        <th style={{ padding: '12px 16px', color: 'var(--text2)', fontWeight: '500' }}>Dias Ativa</th>
                        <th style={{ padding: '12px 16px', color: 'var(--text2)', fontWeight: '500' }}>Faturamento</th>
                        <th style={{ padding: '12px 16px', color: 'var(--text2)', fontWeight: '500' }}>Investido</th>
                        <th style={{ padding: '12px 16px', color: 'var(--text2)', fontWeight: '500' }}>Lucro</th>
                        <th style={{ padding: '12px 16px', color: 'var(--text2)', fontWeight: '500' }}>ROAS</th>
                        <th style={{ padding: '12px 16px', color: 'var(--text2)', fontWeight: '500' }}>CPA</th>
                        <th style={{ padding: '12px 16px', color: 'var(--text2)', fontWeight: '500' }}>Tendência (7d)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {offers.map(offer => {
                        const stats = getOfferStats(offer.id);
                        
                        let launchDays = '—';
                        if (offer.launchDate) {
                          const diffTime = Math.abs(new Date() - new Date(offer.launchDate));
                          launchDays = `${Math.ceil(diffTime / (1000 * 60 * 60 * 24))}d`;
                        }

                        const sparkWidth = 80;
                        const sparkHeight = 24;
                        let polylinePoints = '';
                        let sparkColor = 'var(--text3)';
                        
                        if (stats.roasTrend.length > 1) {
                          const maxRoas = Math.max(...stats.roasTrend);
                          const minRoas = Math.min(...stats.roasTrend);
                          const range = maxRoas - minRoas || 1;

                          polylinePoints = stats.roasTrend.map((val, idx) => {
                            const x = (idx / (stats.roasTrend.length - 1)) * sparkWidth;
                            const y = sparkHeight - 2 - ((val - minRoas) / range) * (sparkHeight - 4);
                            return `${x.toFixed(1)},${y.toFixed(1)}`;
                          }).join(' ');

                          const firstVal = stats.roasTrend[0];
                          const lastVal = stats.roasTrend[stats.roasTrend.length - 1];
                          sparkColor = lastVal >= firstVal ? 'var(--green)' : 'var(--red)';
                        }

                        return (
                          <tr key={offer.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 150ms' }} className="table-row-hover">
                            <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>
                              {offer.emoji} {offer.name}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span className="badge badge-gray">{offer.stage}</span>
                            </td>
                            <td style={{ padding: '12px 16px' }}>{launchDays}</td>
                            <td style={{ padding: '12px 16px' }}>{R(stats.revenue)}</td>
                            <td style={{ padding: '12px 16px' }}>{R(stats.spend)}</td>
                            <td style={{ padding: '12px 16px', color: stats.profit >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: '500' }}>
                              {R(stats.profit)}
                            </td>
                            <td style={{ padding: '12px 16px', fontWeight: 'bold', color: stats.roas >= 1.5 ? 'var(--green)' : stats.roas > 0 ? 'var(--red)' : 'var(--text)' }}>
                              {stats.roas > 0 ? Roas(stats.roas) + 'x' : '—'}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              {stats.cpa > 0 ? R(stats.cpa) : '—'}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              {polylinePoints ? (
                                <svg width={sparkWidth} height={sparkHeight} style={{ overflow: 'visible' }}>
                                  <polyline
                                    fill="none"
                                    stroke={sparkColor}
                                    strokeWidth="1.5"
                                    points={polylinePoints}
                                  />
                                </svg>
                              ) : (
                                <span style={{ color: 'var(--text3)', fontSize: '10px' }}>Sem dados</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Accordion Histórico das Ofertas */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 style={{ fontSize: '14px', color: 'var(--text)', fontFamily: 'Space Grotesk' }}>Histórico Detalhado por Oferta</h3>
                
                {offers.map(offer => {
                  const offerRecords = dailyData
                    .filter(d => d.offerId === offer.id)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                  const stats = getOfferStats(offer.id);

                  return (
                    <AccordionItem 
                      key={offer.id} 
                      title={`${offer.emoji} ${offer.name}`}
                      subtitle={`Faturamento: ${R(stats.revenue)} | Gastos: ${R(stats.spend)} | Lucro: ${R(stats.profit)}`}
                    >
                      {/* Detailed SVG Chart */}
                      <div style={{ marginBottom: '24px' }}>
                        <h4 style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '12px' }}>Histórico de ROAS (Últimos 7 registros)</h4>
                        {stats.roasTrend.length > 0 ? (
                          <div style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: '16px' }}>
                            <SvgLineChart 
                              data={
                                [...dailyData.filter(d => d.offerId === offer.id)]
                                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                  .slice(-7)
                              } 
                            />
                          </div>
                        ) : (
                          <div style={{ padding: '24px', textAlign: 'center', border: '1px dashed var(--border)', color: 'var(--text3)', fontSize: '12px' }}>
                            Sem dados de faturamento para gerar gráfico de tendência.
                          </div>
                        )}
                      </div>

                      {/* Records Table */}
                      <div style={{ marginBottom: '16px' }}>
                        <h4 style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '8px' }}>Registros Recentes</h4>
                        {offerRecords.length > 0 ? (
                          <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '6px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                              <thead>
                                <tr style={{ backgroundColor: 'var(--bg3)', borderBottom: '1px solid var(--border)' }}>
                                  <th style={{ padding: '8px 12px', color: 'var(--text2)' }}>Data</th>
                                  <th style={{ padding: '8px 12px', color: 'var(--text2)' }}>Faturamento</th>
                                  <th style={{ padding: '8px 12px', color: 'var(--text2)' }}>Gasto</th>
                                  <th style={{ padding: '8px 12px', color: 'var(--text2)' }}>Lucro</th>
                                  <th style={{ padding: '8px 12px', color: 'var(--text2)' }}>ROAS</th>
                                  <th style={{ padding: '8px 12px', color: 'var(--text2)' }}>Ações</th>
                                </tr>
                              </thead>
                              <tbody>
                                {offerRecords.map(record => {
                                  const profit = record.revenue - record.adSpend;
                                  const roas = record.adSpend > 0 ? record.revenue / record.adSpend : 0;
                                  return (
                                    <tr key={record.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                      <td style={{ padding: '8px 12px' }}>
                                        {new Date(record.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                                      </td>
                                      <td style={{ padding: '8px 12px' }}>{R(record.revenue)}</td>
                                      <td style={{ padding: '8px 12px' }}>{R(record.adSpend)}</td>
                                      <td style={{ padding: '8px 12px', color: profit >= 0 ? 'var(--green)' : 'var(--red)' }}>
                                        {R(profit)}
                                      </td>
                                      <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>{roas > 0 ? Roas(roas) + 'x' : '—'}</td>
                                      <td style={{ padding: '8px 12px' }}>
                                        <button 
                                          onClick={() => handleDeleteDailyRecord(record.id)}
                                          style={{ border: 'none', background: 'transparent', color: 'var(--red)', cursor: 'pointer' }}
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text3)', fontSize: '12px' }}>
                            Nenhum dia registrado ainda. Use "Registrar Dia".
                          </div>
                        )}
                      </div>
                    </AccordionItem>
                  );
                })}
              </div>

            </div>
          )}

          {/* ========================================================
              PAGE 5: DIÁRIO
              ======================================================== */}
          {activePage === 'diary' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Toolbar */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '2fr 1fr 1fr 120px', 
                gap: '12px',
                alignItems: 'center',
                backgroundColor: 'var(--bg2)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '12px'
              }}>
                {/* Search */}
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                  <input 
                    type="text" 
                    placeholder="Pesquisar notas..." 
                    value={diarySearchQuery}
                    onChange={(e) => setDiarySearchQuery(e.target.value)}
                    style={{ paddingLeft: '32px' }}
                  />
                </div>

                {/* Filter tags */}
                <select value={diaryTagFilter} onChange={(e) => setDiaryTagFilter(e.target.value)}>
                  <option value="all">Todas as Tags</option>
                  <option value="lancamento">🚀 Lançamento</option>
                  <option value="analise">📊 Análise</option>
                  <option value="insight">💡 Insight</option>
                  <option value="problema">⚠️ Problema</option>
                  <option value="decisao">✅ Decisão</option>
                  <option value="resultado">🔥 Resultado</option>
                </select>

                {/* Filter offer */}
                <select value={diaryOfferFilter} onChange={(e) => setDiaryOfferFilter(e.target.value)}>
                  <option value="all">Todas as Ofertas</option>
                  {offers.map(o => (
                    <option key={o.id} value={o.id}>{o.emoji} {o.name}</option>
                  ))}
                </select>

                {/* Export TXT */}
                <button className="btn btn-secondary" onClick={handleExportDiary} style={{ height: '38px', fontSize: '12px' }}>
                  <FileText size={14} /> Exportar
                </button>
              </div>

              {/* Timeline Container */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {diary
                  .filter(dy => {
                    if (diarySearchQuery && !dy.text.toLowerCase().includes(diarySearchQuery.toLowerCase())) return false;
                    if (diaryTagFilter !== 'all' && dy.tag !== diaryTagFilter) return false;
                    if (diaryOfferFilter !== 'all' && dy.offerId !== diaryOfferFilter) return false;
                    return true;
                  })
                  .map(dy => {
                    const linkedOffer = offers.find(o => o.id === dy.offerId);
                    
                    const tagDict = {
                      lancamento: '🚀 Lançamento',
                      analise: '📊 Análise',
                      insight: '💡 Insight',
                      problema: '⚠️ Problema',
                      decisao: '✅ Decisão',
                      resultado: '🔥 Resultado'
                    };

                    return (
                      <div key={dy.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} />
                            {new Date(dy.createdAt).toLocaleString('pt-BR')}
                          </span>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="badge badge-gray" style={{ fontSize: '10px' }}>
                              {tagDict[dy.tag] || dy.tag}
                            </span>
                            <button 
                              className="btn" 
                              onClick={() => setEditingDiary(dy)}
                              style={{ padding: '2px 4px', border: 'none', background: 'transparent', color: 'var(--text3)' }}
                            >
                              <Edit size={12} />
                            </button>
                            <button 
                              className="btn" 
                              onClick={() => handleDeleteDiary(dy.id)}
                              style={{ padding: '2px 4px', border: 'none', background: 'transparent', color: 'var(--red)' }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Text */}
                        <p style={{ fontSize: '13px', color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                          {dy.text}
                        </p>

                        {/* Linked Offer Footer */}
                        {linkedOffer && (
                          <div style={{ alignSelf: 'flex-start', fontSize: '10px', color: 'var(--accent)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>{linkedOffer.emoji}</span>
                            <span>{linkedOffer.name}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

            </div>
          )}

          {/* ========================================================
              PAGE 6: UTILIDADES (Calculadora de Viabilidade de Tráfego e Gerador de UTM)
              ======================================================== */}
          {activePage === 'utils' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '24px' }}>
              
              {/* Left Widget: Break-even Paid Traffic Calculator */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '15px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calculator size={18} color="var(--accent)" />
                  <span>Calculadora de CPA e ROAS Alvo (Tráfego Pago)</span>
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: '1.4' }}>
                  Use esta ferramenta para calcular seus limites operacionais em anúncios (Meta/Google Ads). Descubra seu custo de aquisição (CPA) limite e metas de conversão de acordo com seus custos.
                </p>

                <TrafficCalculator />
              </div>

              {/* Right Widget: UTM Parameters Builder */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: 'fit-content' }}>
                <h3 style={{ fontSize: '15px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Link2 size={18} color="var(--accent2)" />
                  <span>Gerador de Links UTM para Rastreamento</span>
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: '1.4' }}>
                  Construa links de checkout ou página de vendas parametrizados para identificar exatamente qual criativo gerou a venda dentro do seu gateway.
                </p>

                <UtmBuilder offers={offers} />
              </div>

            </div>
          )}

        </main>
      </div>

      {/* ========================================================
          SLIDE-OUT DRAWER: OFFER DETAILS (440px Right)
          ======================================================== */}
      {selectedOfferIdForDrawer && activeOfferForDrawer && (() => {
        const stats = getOfferStats(activeOfferForDrawer.id);
        const records = dailyData
          .filter(d => d.offerId === activeOfferForDrawer.id)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        return (
          <>
            <div className="drawer-overlay" onClick={() => setSelectedOfferIdForDrawer(null)} />
            <div className="drawer-content">
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span>{activeOfferForDrawer.emoji}</span>
                    <span>{activeOfferForDrawer.name}</span>
                  </h2>
                  <span className="badge badge-green">{activeOfferForDrawer.stage}</span>
                </div>
                <button 
                  onClick={() => setSelectedOfferIdForDrawer(null)} 
                  style={{ border: 'none', background: 'transparent', color: 'var(--text2)', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Drawer Toolbar Actions */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '24px' }}>
                <button className="btn btn-secondary" onClick={() => {
                  setEditingOffer(activeOfferForDrawer);
                }} style={{ fontSize: '11px', padding: '6px' }}>
                  <Edit size={12} /> Editar
                </button>
                
                <button 
                  className={`btn ${activeOfferForDrawer.status === 'pausada' ? 'btn-primary' : 'btn-secondary'}`} 
                  onClick={() => {
                    const nextStatus = activeOfferForDrawer.status === 'ativa' ? 'pausada' : 'ativa';
                    handleUpdateOffer({
                      ...activeOfferForDrawer,
                      status: nextStatus,
                      stage: nextStatus === 'pausada' ? 'pausada' : activeOfferForDrawer.stage
                    });
                  }} 
                  style={{ fontSize: '11px', padding: '6px' }}
                >
                  {activeOfferForDrawer.status === 'ativa' ? 'Pausar' : 'Ativar'}
                </button>

                <button 
                  className="btn btn-danger" 
                  onClick={() => handleDeleteOffer(activeOfferForDrawer.id)}
                  style={{ fontSize: '11px', padding: '6px' }}
                >
                  <Trash2 size={12} /> Deletar
                </button>
              </div>

              {/* Section: Metrics overview */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '12px', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>Métricas Acumuladas</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ backgroundColor: 'var(--bg3)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '9px', color: 'var(--text2)' }}>ROAS</div>
                    <div style={{ fontSize: '15px', fontWeight: 'bold' }}>{stats.roas > 0 ? Roas(stats.roas) + 'x' : '—'}</div>
                  </div>
                  <div style={{ backgroundColor: 'var(--bg3)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '9px', color: 'var(--text2)' }}>Lucro</div>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: stats.profit >= 0 ? 'var(--green)' : 'var(--red)' }}>{R(stats.profit)}</div>
                  </div>
                  <div style={{ backgroundColor: 'var(--bg3)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '9px', color: 'var(--text2)' }}>Fat. Total</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{R(stats.revenue)}</div>
                  </div>
                  <div style={{ backgroundColor: 'var(--bg3)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '9px', color: 'var(--text2)' }}>Gasto Total</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{R(stats.spend)}</div>
                  </div>
                  <div style={{ backgroundColor: 'var(--bg3)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '9px', color: 'var(--text2)' }}>CPA Médio</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{stats.cpa > 0 ? R(stats.cpa) : '—'}</div>
                  </div>
                  <div style={{ backgroundColor: 'var(--bg3)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '9px', color: 'var(--text2)' }}>Margem</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{Pct(stats.margin)}</div>
                  </div>
                </div>
              </div>

              {/* Section: Setup Checklist */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '12px', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>Checklist de Setup</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { id: 'entregavel', label: 'Entregável criado' },
                    { id: 'pagina', label: 'Página de vendas publicada' },
                    { id: 'checkout', label: 'Checkout configurado' },
                    { id: 'pixel', label: 'Pixel / API conversão instalado' },
                    { id: 'criativos', label: 'Criativos validados/prontos' },
                    { id: 'campanhas', label: 'Campanhas no ar' },
                    { id: 'bumps', label: 'Order bumps ativos' }
                  ].map(item => {
                    const isChecked = activeOfferForDrawer.checklist ? activeOfferForDrawer.checklist[item.id] : false;
                    return (
                      <label 
                        key={item.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '10px', 
                          cursor: 'pointer',
                          fontSize: '12px',
                          margin: '0',
                          color: isChecked ? 'var(--text)' : 'var(--text2)'
                        }}
                      >
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => {
                            const newChecklist = {
                              ...(activeOfferForDrawer.checklist || {}),
                              [item.id]: !isChecked
                            };
                            handleUpdateOffer({
                              ...activeOfferForDrawer,
                              checklist: newChecklist
                            });
                          }}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <span>{item.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Section: Creatives */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>
                  <h3 style={{ fontSize: '12px', color: 'var(--text3)', textTransform: 'uppercase', margin: '0' }}>Criativos</h3>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => {
                      const name = prompt('Nome do criativo:');
                      const roas = prompt('ROAS estimado (ex: 2.5):');
                      const notes = prompt('Observações do criativo:');
                      if (name) {
                        handleAddCreative(activeOfferForDrawer.id, name, roas, notes);
                      }
                    }}
                    style={{ fontSize: '9px', padding: '2px 6px' }}
                  >
                    + Criativo
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activeOfferForDrawer.creatives && activeOfferForDrawer.creatives.length > 0 ? (
                    activeOfferForDrawer.creatives.map(c => (
                      <div 
                        key={c.id} 
                        style={{ 
                          backgroundColor: 'var(--bg3)', 
                          padding: '8px 10px', 
                          borderRadius: '6px', 
                          border: '1px solid var(--border)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text)' }}>
                            {c.name}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: c.roas >= 1.5 ? 'var(--green)' : 'var(--text2)' }}>
                              ROAS: {Roas(c.roas)}
                            </span>
                            
                            <label className="toggle-switch" style={{ margin: '0' }}>
                              <input 
                                type="checkbox" 
                                checked={c.status === 'ativo'} 
                                onChange={() => handleToggleCreative(activeOfferForDrawer.id, c.id)}
                              />
                              <span className="slider"></span>
                            </label>

                            <button 
                              onClick={() => handleDeleteCreative(activeOfferForDrawer.id, c.id)}
                              style={{ border: 'none', background: 'transparent', color: 'var(--red)', cursor: 'pointer' }}
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        </div>
                        {c.notes && (
                          <div style={{ fontSize: '10px', color: 'var(--text3)' }}>
                            {c.notes}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <span style={{ fontSize: '11px', color: 'var(--text3)', textAlign: 'center', padding: '8px' }}>
                      Nenhum criativo cadastrado.
                    </span>
                  )}
                </div>
              </div>

              {/* Section: Links */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '12px', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>Links Rápidos</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
                  <div>
                    <span style={{ color: 'var(--text3)' }}>URL da Página:</span>
                    {activeOfferForDrawer.pageUrl ? (
                      <a href={`https://${activeOfferForDrawer.pageUrl}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        {activeOfferForDrawer.pageUrl} <ExternalLink size={10} />
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text2)', display: 'block', fontStyle: 'italic' }}>Não cadastrada</span>
                    )}
                  </div>

                  <div>
                    <span style={{ color: 'var(--text3)' }}>Checkout Básico:</span>
                    {activeOfferForDrawer.checkoutBasicUrl ? (
                      <a href={`https://${activeOfferForDrawer.checkoutBasicUrl}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        {activeOfferForDrawer.checkoutBasicUrl} <ExternalLink size={10} />
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text2)', display: 'block', fontStyle: 'italic' }}>Não cadastrado</span>
                    )}
                  </div>

                  <div>
                    <span style={{ color: 'var(--text3)' }}>Checkout Completo:</span>
                    {activeOfferForDrawer.checkoutCompleteUrl ? (
                      <a href={`https://${activeOfferForDrawer.checkoutCompleteUrl}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        {activeOfferForDrawer.checkoutCompleteUrl} <ExternalLink size={10} />
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text2)', display: 'block', fontStyle: 'italic' }}>Não cadastrado</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Section: Observações */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '12px', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>Anotações da Oferta</h3>
                <textarea 
                  value={activeOfferForDrawer.notes || ''}
                  onChange={(e) => handleUpdateOffer({ ...activeOfferForDrawer, notes: e.target.value })}
                  placeholder="Instruções, ideias de copies, anotações de criativos campeões..."
                  style={{ minHeight: '120px', resize: 'vertical', fontSize: '12px' }}
                />
              </div>

              {/* Section: Historico logs diários */}
              <div>
                <h3 style={{ fontSize: '12px', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>Últimos 10 Dias Registrados</h3>
                {records.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {records.slice(0, 10).map(r => {
                      const dayProfit = r.revenue - r.adSpend;
                      const dayRoas = r.adSpend > 0 ? r.revenue / r.adSpend : 0;
                      return (
                        <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', borderBottom: '1px solid var(--border)', fontSize: '11px' }}>
                          <span>{new Date(r.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                          <span style={{ color: 'var(--text2)' }}>Fat: {R(r.revenue)}</span>
                          <span style={{ color: dayProfit >= 0 ? 'var(--green)' : 'var(--red)' }}>Lucro: {R(dayProfit)}</span>
                          <span style={{ fontWeight: 'bold' }}>ROAS: {dayRoas > 0 ? Roas(dayRoas) : '—'}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <span style={{ fontSize: '11px', color: 'var(--text3)', display: 'block', textAlign: 'center', padding: '8px' }}>
                    Sem histórico de dias cadastrados.
                  </span>
                )}
              </div>

            </div>
          </>
        );
      })()}

      {/* ========================================================
          MODALS & DIALOGS
          ======================================================== */}
      {isNewOfferModalOpen && (
        <OfferModal 
          prefilledStage={isNewOfferModalOpen.stage}
          onClose={() => setIsNewOfferModalOpen(false)} 
          onSubmit={handleCreateOffer}
        />
      )}

      {editingOffer && (
        <OfferModal 
          offer={editingOffer}
          onClose={() => setEditingOffer(null)} 
          onSubmit={handleUpdateOffer}
        />
      )}

      {isDailyDataDrawerOpen && (
        <DailyDataModal 
          offers={offers}
          onClose={() => setIsDailyDataDrawerOpen(false)}
          onSubmit={handleLogDailyData}
        />
      )}

      {isNewTaskModalOpen && (
        <TaskModal 
          offers={offers}
          onClose={() => setIsNewTaskModalOpen(false)}
          onSubmit={handleCreateTask}
        />
      )}

      {editingTask && (
        <TaskModal 
          offers={offers}
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSubmit={handleUpdateTask}
          onDelete={handleDeleteTask}
        />
      )}

      {isNewIdeaModalOpen && (
        <IdeaModal 
          onClose={() => setIsNewIdeaModalOpen(false)}
          onSubmit={handleCreateIdea}
        />
      )}

      {editingIdea && (
        <IdeaModal 
          idea={editingIdea}
          onClose={() => setEditingIdea(null)}
          onSubmit={handleUpdateIdea}
        />
      )}

      {isNewDiaryModalOpen && (
        <DiaryModal 
          offers={offers}
          onClose={() => setIsNewDiaryModalOpen(false)}
          onSubmit={handleCreateDiary}
        />
      )}

      {editingDiary && (
        <DiaryModal 
          offers={offers}
          diary={editingDiary}
          onClose={() => setEditingDiary(null)}
          onSubmit={handleUpdateDiary}
          onDelete={handleDeleteDiary}
        />
      )}

    </div>
  );
}

// ==========================================
// SUBCOMPONENTS: MODALS & FORMS
// ==========================================
const EMOJI_OPTIONS = ['🍇', '🍔', '☕', '⛏️', '🍕', '🍰', '🍣', '👟', '👕', '🎮', '💻', '📱', '📚', '🎯', '🏋️', '🎨', '✈️', '💰', '💡', '🔥'];

function OfferModal({ offer, prefilledStage, onClose, onSubmit }) {
  const isEdit = !!offer;
  
  const [formData, setFormData] = useState({
    id: offer?.id || '',
    name: offer?.name || '',
    emoji: offer?.emoji || '🍇',
    type: offer?.type || 'pack_artes',
    niche: offer?.niche || '',
    stage: offer?.stage || prefilledStage || 'ideia',
    pageUrl: offer?.pageUrl || '',
    checkoutBasicUrl: offer?.checkoutBasicUrl || '',
    checkoutCompleteUrl: offer?.checkoutCompleteUrl || '',
    dailyProfitGoal: offer?.dailyProfitGoal || 100,
    launchDate: offer?.launchDate || '',
    notes: offer?.notes || '',
    status: offer?.status || 'ativa',
    checklist: offer?.checklist || {},
    creatives: offer?.creatives || []
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSubmit(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px' }}>{isEdit ? 'Editar Oferta' : 'Nova Oferta'}</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'var(--text2)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          <div className="form-group">
            <label>Nome da Oferta</label>
            <input 
              type="text" 
              required 
              value={formData.name} 
              onChange={e => setFormData({ ...formData, name: e.target.value })} 
              placeholder="Ex: Pack Açaí"
            />
          </div>

          <div className="form-group">
            <label>Emoji da Oferta</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', backgroundColor: 'var(--bg3)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
              {EMOJI_OPTIONS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setFormData({ ...formData, emoji })}
                  style={{
                    width: '32px',
                    height: '32px',
                    fontSize: '18px',
                    borderRadius: '4px',
                    border: formData.emoji === emoji ? '1px solid var(--accent)' : '1px solid transparent',
                    backgroundColor: formData.emoji === emoji ? 'var(--bg2)' : 'transparent',
                    cursor: 'pointer'
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Tipo de Produto</label>
            <select 
              value={formData.type} 
              onChange={e => setFormData({ ...formData, type: e.target.value })}
            >
              <option value="pack_artes">Pack de Artes (Canva)</option>
              <option value="curso">Curso / Infoproduto</option>
              <option value="software">Software / SaaS / Script</option>
              <option value="receitas">Ebook / Receitas / PLR</option>
              <option value="outro">Outro</option>
            </select>
          </div>

          <div className="form-group">
            <label>Nicho / Descrição</label>
            <textarea 
              value={formData.niche} 
              onChange={e => setFormData({ ...formData, niche: e.target.value })}
              placeholder="Do que se trata o produto? Qual público-alvo?"
              style={{ minHeight: '60px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>Estágio Inicial</label>
              <select 
                value={formData.stage} 
                onChange={e => setFormData({ ...formData, stage: e.target.value, status: (e.target.value === 'pausada' || e.target.value === 'morta') ? e.target.value : 'ativa' })}
              >
                <option value="ideia">Ideia</option>
                <option value="construindo">Construindo</option>
                <option value="testando">Testando</option>
                <option value="escalando">Escalando</option>
                <option value="pausada">Pausada</option>
                <option value="morta">Morta</option>
              </select>
            </div>

            <div className="form-group">
              <label>Meta Lucro/Dia (R$)</label>
              <input 
                type="number" 
                required
                value={formData.dailyProfitGoal} 
                onChange={e => setFormData({ ...formData, dailyProfitGoal: e.target.value })} 
                placeholder="Ex: 300"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Data de Lançamento (opcional)</label>
            <input 
              type="date" 
              value={formData.launchDate || ''} 
              onChange={e => setFormData({ ...formData, launchDate: e.target.value })} 
            />
          </div>

          <div className="form-group">
            <label>URL da Página (sem https://)</label>
            <input 
              type="text" 
              value={formData.pageUrl} 
              onChange={e => setFormData({ ...formData, pageUrl: e.target.value })} 
              placeholder="exemplo.com.br"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>Link Checkout Básico</label>
              <input 
                type="text" 
                value={formData.checkoutBasicUrl} 
                onChange={e => setFormData({ ...formData, checkoutBasicUrl: e.target.value })} 
                placeholder="checkout.com/basico"
              />
            </div>
            <div className="form-group">
              <label>Link Checkout Completo</label>
              <input 
                type="text" 
                value={formData.checkoutCompleteUrl} 
                onChange={e => setFormData({ ...formData, checkoutCompleteUrl: e.target.value })} 
                placeholder="checkout.com/completo"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Observações / Notas</label>
            <textarea 
              value={formData.notes} 
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Anotações gerais..."
              style={{ minHeight: '70px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              Salvar Oferta
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

function DailyDataModal({ offers, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    offerId: offers[0]?.id || '',
    date: new Date().toISOString().split('T')[0],
    revenue: '',
    adSpend: '',
    sales: '',
    bumps: '',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.offerId) return;
    onSubmit(formData);
  };

  const previewRevenue = Number(formData.revenue || 0);
  const previewAdSpend = Number(formData.adSpend || 0);
  const previewSales = Number(formData.sales || 0);
  const previewProfit = previewRevenue - previewAdSpend;
  const previewRoas = previewAdSpend > 0 ? (previewRevenue / previewAdSpend).toFixed(2) : '0.00';
  const previewCpa = previewSales > 0 ? (previewAdSpend / previewSales).toFixed(2) : '0.00';

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px' }}>Registrar Dados Diários</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'var(--text2)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          <div className="form-group">
            <label>Qual Oferta?</label>
            <select 
              required
              value={formData.offerId} 
              onChange={e => setFormData({ ...formData, offerId: e.target.value })}
            >
              <option value="">Selecione uma oferta...</option>
              {offers.map(o => (
                <option key={o.id} value={o.id}>{o.emoji} {o.name} ({o.status})</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Data de Registro</label>
            <input 
              type="date" 
              required
              value={formData.date} 
              onChange={e => setFormData({ ...formData, date: e.target.value })} 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>Faturamento Total (R$)</label>
              <input 
                type="number" 
                step="0.01"
                required
                value={formData.revenue} 
                onChange={e => setFormData({ ...formData, revenue: e.target.value })} 
                placeholder="Ex: 450.00"
              />
            </div>
            <div className="form-group">
              <label>Gasto com Ads (R$)</label>
              <input 
                type="number" 
                step="0.01"
                required
                value={formData.adSpend} 
                onChange={e => setFormData({ ...formData, adSpend: e.target.value })} 
                placeholder="Ex: 150.00"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>Número de Vendas</label>
              <input 
                type="number" 
                required
                value={formData.sales} 
                onChange={e => setFormData({ ...formData, sales: e.target.value })} 
                placeholder="Ex: 10"
              />
            </div>
            <div className="form-group">
              <label>Vendas com Order Bump</label>
              <input 
                type="number" 
                value={formData.bumps} 
                onChange={e => setFormData({ ...formData, bumps: e.target.value })} 
                placeholder="Ex: 3"
              />
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--bg3)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '12px' }}>
            <span style={{ fontWeight: 'bold', color: 'var(--text2)', display: 'block', marginBottom: '8px' }}>CÁLCULOS DO DIA (PRÉVIA):</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center' }}>
              <div>
                <span style={{ color: 'var(--text3)', fontSize: '10px' }}>Lucro do Dia:</span>
                <div style={{ fontWeight: 'bold', color: previewProfit >= 0 ? 'var(--green)' : 'var(--red)' }}>R$ {previewProfit.toFixed(2)}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text3)', fontSize: '10px' }}>ROAS:</span>
                <div style={{ fontWeight: 'bold' }}>{previewRoas}x</div>
              </div>
              <div>
                <span style={{ color: 'var(--text3)', fontSize: '10px' }}>CPA:</span>
                <div style={{ fontWeight: 'bold' }}>R$ {previewCpa}</div>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Notas do Dia / Análise rápida</label>
            <textarea 
              value={formData.notes} 
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Criativo campeão se destacou..."
              style={{ minHeight: '60px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              Registrar Dia
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

function TaskModal({ offers, task, onClose, onSubmit, onDelete }) {
  const isEdit = !!task;

  const [formData, setFormData] = useState({
    id: task?.id || '',
    title: task?.title || '',
    type: task?.type || 'setup',
    offerId: task?.offerId || '',
    priority: task?.priority || 'media',
    deadline: task?.deadline || '',
    column: task?.column || 'todo'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    onSubmit(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px' }}>{isEdit ? 'Editar Tarefa' : 'Nova Tarefa'}</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'var(--text2)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          <div className="form-group">
            <label>Título da Tarefa</label>
            <input 
              type="text" 
              required 
              value={formData.title} 
              onChange={e => setFormData({ ...formData, title: e.target.value })} 
              placeholder="O que precisa ser feito?"
            />
          </div>

          <div className="form-group">
            <label>Tipo de Tarefa</label>
            <select 
              value={formData.type} 
              onChange={e => setFormData({ ...formData, type: e.target.value })}
            >
              <option value="criativo">🎨 Criativo</option>
              <option value="pagina">📄 Página</option>
              <option value="setup">⚙️ Setup</option>
              <option value="analise">📊 Análise</option>
              <option value="lancamento">🚀 Lançamento</option>
              <option value="fix">🔧 Fix</option>
            </select>
          </div>

          <div className="form-group">
            <label>Vincular a uma Oferta (Opcional)</label>
            <select 
              value={formData.offerId} 
              onChange={e => setFormData({ ...formData, offerId: e.target.value })}
            >
              <option value="">Nenhuma (Geral)</option>
              {offers.map(o => (
                <option key={o.id} value={o.id}>{o.emoji} {o.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>Prioridade</label>
              <select 
                value={formData.priority} 
                onChange={e => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
              </select>
            </div>

            <div className="form-group">
              <label>Prazo Limite</label>
              <input 
                type="date" 
                value={formData.deadline || ''} 
                onChange={e => setFormData({ ...formData, deadline: e.target.value })} 
              />
            </div>
          </div>

          {isEdit && (
            <div className="form-group">
              <label>Status / Coluna</label>
              <select 
                value={formData.column} 
                onChange={e => setFormData({ ...formData, column: e.target.value })}
              >
                <option value="todo">A Fazer</option>
                <option value="doing">Fazendo</option>
                <option value="review">Revisão</option>
                <option value="done">Feito</option>
              </select>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            {isEdit && (
              <button 
                type="button" 
                className="btn btn-danger" 
                onClick={() => onDelete(task.id)}
                style={{ flex: 1 }}
              >
                Deletar
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              Salvar
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

function IdeaModal({ idea, onClose, onSubmit }) {
  const isEdit = !!idea;

  const [formData, setFormData] = useState({
    id: idea?.id || '',
    name: idea?.name || '',
    description: idea?.description || '',
    type: idea?.type || 'pack_artes',
    potential: idea?.potential || 3,
    effort: idea?.effort || 3,
    notes: idea?.notes || '',
    tags: idea?.tags ? idea.tags.join(', ') : ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSubmit(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px' }}>{isEdit ? 'Editar Ideia' : 'Nova Ideia'}</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'var(--text2)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          <div className="form-group">
            <label>Nome da Ideia</label>
            <input 
              type="text" 
              required 
              value={formData.name} 
              onChange={e => setFormData({ ...formData, name: e.target.value })} 
              placeholder="Ex: Pack Pizzaria"
            />
          </div>

          <div className="form-group">
            <label>Descrição / Público-Alvo</label>
            <textarea 
              required
              value={formData.description} 
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Templates Canva para pizzarias. Público..."
              style={{ minHeight: '60px' }}
            />
          </div>

          <div className="form-group">
            <label>Tipo de Produto Esperado</label>
            <select 
              value={formData.type} 
              onChange={e => setFormData({ ...formData, type: e.target.value })}
            >
              <option value="pack_artes">Pack de Artes (Canva)</option>
              <option value="curso">Curso / Infoproduto</option>
              <option value="software">Software / SaaS / Script</option>
              <option value="receitas">Ebook / Receitas / PLR</option>
              <option value="outro">Outro</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>Potencial da Ideia (1-5 Estrelas)</label>
              <select 
                value={formData.potential} 
                onChange={e => setFormData({ ...formData, potential: Number(e.target.value) })}
              >
                <option value="1">⭐ 1/5</option>
                <option value="2">⭐⭐ 2/5</option>
                <option value="3">⭐⭐⭐ 3/5</option>
                <option value="4">⭐⭐⭐⭐ 4/5</option>
                <option value="5">⭐⭐⭐⭐⭐ 5/5</option>
              </select>
            </div>

            <div className="form-group">
              <label>Esforço Estimado (1-5)</label>
              <select 
                value={formData.effort} 
                onChange={e => setFormData({ ...formData, effort: Number(e.target.value) })}
              >
                <option value="1">⚡ 1/5 (Muito Baixo)</option>
                <option value="2">⚡⚡ 2/5 (Baixo)</option>
                <option value="3">⚡⚡⚡ 3/5 (Médio)</option>
                <option value="4">⚡⚡⚡⚡ 4/5 (Alto)</option>
                <option value="5">⚡⚡⚡⚡⚡ 5/5 (Muito Alto)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Tags Livres (Separadas por vírgula)</label>
            <input 
              type="text" 
              value={formData.tags} 
              onChange={e => setFormData({ ...formData, tags: e.target.value })} 
              placeholder="canva, local, pizzaria"
            />
          </div>

          <div className="form-group">
            <label>Notas / Insights Extras</label>
            <textarea 
              value={formData.notes} 
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Ideias rápidas..."
              style={{ minHeight: '60px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              Salvar Ideia
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

function DiaryModal({ offers, diary, onClose, onSubmit, onDelete }) {
  const isEdit = !!diary;

  const [formData, setFormData] = useState({
    id: diary?.id || '',
    text: diary?.text || '',
    tag: diary?.tag || 'analise',
    offerId: diary?.offerId || '',
    createdAt: diary?.createdAt || new Date().toISOString()
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.text.trim()) return;
    onSubmit(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px' }}>{isEdit ? 'Editar Entrada Diário' : 'Nova Entrada Diário'}</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'var(--text2)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          <div className="form-group">
            <label>Tag Operacional</label>
            <select 
              value={formData.tag} 
              onChange={e => setFormData({ ...formData, tag: e.target.value })}
            >
              <option value="lancamento">🚀 Lançamento</option>
              <option value="analise">📊 Análise</option>
              <option value="insight">💡 Insight</option>
              <option value="problema">⚠️ Problema</option>
              <option value="decisao">✅ Decisão</option>
              <option value="resultado">🔥 Resultado</option>
            </select>
          </div>

          <div className="form-group">
            <label>Vincular a uma Oferta (Opcional)</label>
            <select 
              value={formData.offerId} 
              onChange={e => setFormData({ ...formData, offerId: e.target.value })}
            >
              <option value="">Nenhuma (Operação Geral)</option>
              {offers.map(o => (
                <option key={o.id} value={o.id}>{o.emoji} {o.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Texto da Anotação</label>
            <textarea 
              required
              value={formData.text} 
              onChange={e => setFormData({ ...formData, text: e.target.value })}
              placeholder="O que aconteceu hoje?"
              style={{ minHeight: '120px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            {isEdit && (
              <button 
                type="button" 
                className="btn btn-danger" 
                onClick={() => onDelete(diary.id)}
                style={{ flex: 1 }}
              >
                Deletar
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              Registrar
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

// ==========================================
// PAID TRAFFIC IDEAL CPA/ROAS CALCULATOR (UX Boost Helper)
// ==========================================
function TrafficCalculator() {
  const [price, setPrice] = useState(97);
  const [gatewayPercent, setGatewayPercent] = useState(8);
  const [gatewayFixed, setGatewayFixed] = useState(1.0);
  const [targetMargin, setTargetMargin] = useState(30);
  const [cogs, setCogs] = useState(0);

  // Computations
  const gatewayFee = (price * (gatewayPercent / 100)) + gatewayFixed;
  const netRevenue = price - gatewayFee - cogs;
  
  // Break-even (ROAS 1.0 margin)
  const breakevenCpa = netRevenue;
  const breakevenRoas = price / breakevenCpa;

  // Target metrics (at target profit margin)
  const targetProfitAmount = price * (targetMargin / 100);
  const targetCpa = netRevenue - targetProfitAmount;
  const targetRoas = price / (targetCpa > 0 ? targetCpa : 0.01);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Input controls */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div className="form-group" style={{ margin: '0' }}>
          <label>Preço do Produto (R$)</label>
          <input 
            type="number" 
            value={price} 
            onChange={e => setPrice(Math.max(0, Number(e.target.value)))} 
          />
        </div>
        <div className="form-group" style={{ margin: '0' }}>
          <label>Custo do Produto/COGS (R$)</label>
          <input 
            type="number" 
            value={cogs} 
            onChange={e => setCogs(Math.max(0, Number(e.target.value)))} 
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
        <div className="form-group" style={{ margin: '0' }}>
          <label>Taxa Gateway (%)</label>
          <input 
            type="number" 
            value={gatewayPercent} 
            onChange={e => setGatewayPercent(Math.max(0, Number(e.target.value)))} 
          />
        </div>
        <div className="form-group" style={{ margin: '0' }}>
          <label>Gateway Fixo (R$)</label>
          <input 
            type="number" 
            value={gatewayFixed} 
            onChange={e => setGatewayFixed(Math.max(0, Number(e.target.value)))} 
          />
        </div>
        <div className="form-group" style={{ margin: '0' }}>
          <label>Margem Alvo (%)</label>
          <input 
            type="number" 
            value={targetMargin} 
            onChange={e => setTargetMargin(Math.max(0, Number(e.target.value)))} 
          />
        </div>
      </div>

      {/* Results grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '12px', 
        marginTop: '12px',
        backgroundColor: 'var(--bg3)', 
        padding: '16px', 
        borderRadius: '8px',
        border: '1px solid var(--border)' 
      }}>
        
        {/* Break-even details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderRight: '1px solid var(--border)', paddingRight: '12px' }}>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text3)' }}>LIMITE DE VALIDAÇÃO (BREAK-EVEN)</span>
          
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text2)' }}>CPA Limite (Empate):</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--yellow)' }}>{R(breakevenCpa)}</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text2)' }}>ROAS Mínimo:</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{Roas(breakevenRoas)}x</div>
          </div>
        </div>

        {/* Target details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '12px' }}>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text3)' }}>META PARA LUCRO DE {targetMargin}%</span>
          
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text2)' }}>CPA Alvo (Anúncios):</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--green)' }}>{R(targetCpa)}</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text2)' }}>ROAS Alvo (Meta):</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--accent)' }}>{Roas(targetRoas)}x</div>
          </div>
        </div>

      </div>

      <div style={{ fontSize: '11px', color: 'var(--text3)', borderLeft: '3px solid var(--accent)', paddingLeft: '10px', lineHeight: '1.4' }}>
        <strong>Recomendação:</strong> Configure seu conjunto de anúncios no Meta Ads para otimizar com base em um CPA menor que <strong>{R(targetCpa)}</strong>. Caso seu CPA ultrapasse <strong>{R(breakevenCpa)}</strong>, você estará perdendo dinheiro.
      </div>

    </div>
  );
}

// ==========================================
// UTM URL BUILDER (UX Boost Helper)
// ==========================================
function UtmBuilder({ offers }) {
  const [baseUrl, setBaseUrl] = useState('');
  const [source, setSource] = useState('facebook');
  const [medium, setMedium] = useState('cpc');
  const [campaign, setCampaign] = useState('');
  const [content, setContent] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // Auto set campaign when offer is chosen
  const handleOfferSelect = (offerId) => {
    const offer = offers.find(o => o.id === offerId);
    if (offer) {
      setBaseUrl(offer.pageUrl || offer.checkoutBasicUrl || '');
      setCampaign(offer.name.toLowerCase().replace(/\s+/g, '_'));
    }
  };

  // Concatenate UTMs
  const generateUrl = () => {
    if (!baseUrl.trim()) return '';
    let finalUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
    
    const params = [];
    if (source) params.push(`utm_source=${encodeURIComponent(source)}`);
    if (medium) params.push(`utm_medium=${encodeURIComponent(medium)}`);
    if (campaign) params.push(`utm_campaign=${encodeURIComponent(campaign)}`);
    if (content) params.push(`utm_content=${encodeURIComponent(content)}`);

    if (params.length > 0) {
      finalUrl += (finalUrl.includes('?') ? '&' : '?') + params.join('&');
    }
    return finalUrl;
  };

  const finalGeneratedUrl = generateUrl();

  const handleCopy = () => {
    if (!finalGeneratedUrl) return;
    navigator.clipboard.writeText(finalGeneratedUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      
      <div className="form-group" style={{ margin: '0' }}>
        <label>Importar URL de Oferta Existente</label>
        <select onChange={e => handleOfferSelect(e.target.value)} style={{ padding: '8px' }}>
          <option value="">Selecione para importar...</option>
          {offers.map(o => (
            <option key={o.id} value={o.id}>{o.emoji} {o.name}</option>
          ))}
        </select>
      </div>

      <div className="form-group" style={{ margin: '0' }}>
        <label>URL Base (Página de Vendas / Checkout)</label>
        <input 
          type="text" 
          placeholder="exemplo.com.br/checkout" 
          value={baseUrl}
          onChange={e => setBaseUrl(e.target.value)}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div className="form-group" style={{ margin: '0' }}>
          <label>Origem (utm_source)</label>
          <input 
            type="text" 
            placeholder="facebook, google, tiktok" 
            value={source}
            onChange={e => setSource(e.target.value)}
          />
        </div>
        <div className="form-group" style={{ margin: '0' }}>
          <label>Mídia (utm_medium)</label>
          <input 
            type="text" 
            placeholder="cpc, organic, stories" 
            value={medium}
            onChange={e => setMedium(e.target.value)}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div className="form-group" style={{ margin: '0' }}>
          <label>Nome Campanha (utm_campaign)</label>
          <input 
            type="text" 
            placeholder="pack_acai_conversao" 
            value={campaign}
            onChange={e => setCampaign(e.target.value)}
          />
        </div>
        <div className="form-group" style={{ margin: '0' }}>
          <label>Conteúdo / Anúncio (utm_content)</label>
          <input 
            type="text" 
            placeholder="video_01_copo_recheado" 
            value={content}
            onChange={e => setContent(e.target.value)}
          />
        </div>
      </div>

      {finalGeneratedUrl && (
        <div style={{ marginTop: '12px' }}>
          <label>Link Parametrizado Gerado:</label>
          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            backgroundColor: 'var(--bg3)', 
            padding: '10px', 
            borderRadius: '6px',
            border: '1px solid var(--border)',
            wordBreak: 'break-all',
            fontSize: '11px',
            position: 'relative'
          }}>
            <span style={{ flex: 1, paddingRight: '36px' }}>{finalGeneratedUrl}</span>
            <button 
              type="button" 
              onClick={handleCopy}
              className="btn"
              style={{ 
                position: 'absolute', 
                right: '6px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                padding: '6px',
                backgroundColor: 'var(--bg2)',
                border: '1px solid var(--border2)' 
              }}
            >
              {isCopied ? <Check size={14} color="var(--green)" /> : <Copy size={14} />}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

// ==========================================
// ACCORDIONS & SVG GRAPHICAL ELEMENTS
// ==========================================
function AccordionItem({ title, subtitle, children }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          padding: '14px 16px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          cursor: 'pointer',
          backgroundColor: isOpen ? 'var(--bg3)' : 'transparent',
          borderBottom: isOpen ? '1px solid var(--border)' : 'none'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <h4 style={{ fontSize: '13px', color: 'var(--text)' }}>{title}</h4>
          <span style={{ fontSize: '11px', color: 'var(--text2)' }}>{subtitle}</span>
        </div>
        <div style={{ color: 'var(--text2)' }}>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>
      
      {isOpen && (
        <div style={{ padding: '16px', backgroundColor: 'var(--bg2)' }}>
          {children}
        </div>
      )}
    </div>
  );
}

// SVG Detailed Line Chart for metrics
function SvgLineChart({ data }) {
  if (!data || data.length === 0) return null;

  const width = 450;
  const height = 150;
  const paddingX = 40;
  const paddingY = 20;

  const records = data.map(d => ({
    date: d.date,
    roas: d.adSpend > 0 ? d.revenue / d.adSpend : 0
  }));

  const roasValues = records.map(r => r.roas);
  const maxRoas = Math.max(...roasValues, 3);
  const minRoas = Math.min(...roasValues, 0);

  const rangeY = maxRoas - minRoas || 1;

  const points = records.map((record, index) => {
    const x = paddingX + (index / (records.length - 1 || 1)) * (width - paddingX * 2);
    const y = height - paddingY - ((record.roas - minRoas) / rangeY) * (height - paddingY * 2);
    return { x, y, roas: record.roas, date: record.date };
  });

  const polylinePointsStr = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} style={{ display: 'block' }}>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const yVal = minRoas + ratio * rangeY;
          const yPos = height - paddingY - ratio * (height - paddingY * 2);
          return (
            <g key={idx}>
              <line x1={paddingX} y1={yPos} x2={width - paddingX} y2={yPos} stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
              <text x={paddingX - 10} y={yPos + 4} fill="var(--text3)" fontSize="9" textAnchor="end" fontFamily="Space Grotesk">
                {yVal.toFixed(1)}x
              </text>
            </g>
          );
        })}

        {points.map((p, idx) => (
          <text key={idx} x={p.x} y={height - 4} fill="var(--text2)" fontSize="8" textAnchor="middle" fontFamily="Space Grotesk">
            {p.date.split('-')[2]}/{p.date.split('-')[1]}
          </text>
        ))}

        <polyline fill="none" stroke="var(--accent)" strokeWidth="2" points={polylinePointsStr} />

        {points.map((p, idx) => (
          <g key={idx}>
            <circle cx={p.x} cy={p.y} r="4" fill="var(--accent2)" stroke="var(--bg2)" strokeWidth="1.5" />
            <text x={p.x} y={p.y - 8} fill="var(--text)" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="Space Grotesk">
              {p.roas.toFixed(2)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// Area Chart for Dashboard showing Profit vs Spend
function SvgDashboardChart({ data }) {
  const width = 500;
  const height = 180;
  const paddingX = 45;
  const paddingY = 25;

  // Max/min values for scaling
  const profitValues = data.map(d => d.profit);
  const spendValues = data.map(d => d.spend);
  const allValues = [...profitValues, ...spendValues];
  
  const maxValue = Math.max(...allValues, 100);
  const minValue = Math.min(...allValues, 0);
  const rangeY = maxValue - minValue || 1;

  // Compute points
  const points = data.map((d, index) => {
    const x = paddingX + (index / (data.length - 1 || 1)) * (width - paddingX * 2);
    const yProfit = height - paddingY - ((d.profit - minValue) / rangeY) * (height - paddingY * 2);
    const ySpend = height - paddingY - ((d.spend - minValue) / rangeY) * (height - paddingY * 2);
    return { x, yProfit, ySpend, profit: d.profit, spend: d.spend, date: d.date };
  });

  // Polyline coordinates
  const profitPointsStr = points.map(p => `${p.x},${p.yProfit}`).join(' ');
  const spendPointsStr = points.map(p => `${p.x},${p.ySpend}`).join(' ');

  // Area path coordinates (connecting profit line to bottom boundary)
  const yBottomZero = height - paddingY - ((0 - minValue) / rangeY) * (height - paddingY * 2);
  const areaPathStr = points.length > 0 
    ? `M ${points[0].x} ${yBottomZero} ` + points.map(p => `L ${p.x} ${p.yProfit}`).join(' ') + ` L ${points[points.length - 1].x} ${yBottomZero} Z`
    : '';

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} style={{ overflow: 'visible' }}>
      
      {/* Gradients */}
      <defs>
        <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--green)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--green)" stopOpacity="0.00" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
        const yVal = minValue + ratio * rangeY;
        const yPos = height - paddingY - ratio * (height - paddingY * 2);
        return (
          <g key={idx}>
            <line x1={paddingX} y1={yPos} x2={width - paddingX} y2={yPos} stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" />
            <text x={paddingX - 10} y={yPos + 3} fill="var(--text3)" fontSize="8" textAnchor="end" fontFamily="Space Grotesk">
              {R(yVal)}
            </text>
          </g>
        );
      })}

      {/* Date labels */}
      {points.map((p, idx) => (
        <text key={idx} x={p.x} y={height - 8} fill="var(--text2)" fontSize="8" textAnchor="middle" fontFamily="Space Grotesk">
          {p.date.split('-')[2]}/{p.date.split('-')[1]}
        </text>
      ))}

      {/* Area under profit line */}
      {areaPathStr && (
        <path d={areaPathStr} fill="url(#profitGrad)" />
      )}

      {/* Spend Line (Red) */}
      <polyline fill="none" stroke="var(--red)" strokeWidth="1.5" strokeDasharray="3 3" points={spendPointsStr} />

      {/* Profit Line (Green) */}
      <polyline fill="none" stroke="var(--green)" strokeWidth="2.5" points={profitPointsStr} />

      {/* Circles for interactive details */}
      {points.map((p, idx) => (
        <g key={idx}>
          {/* Spend dot */}
          <circle cx={p.x} cy={p.ySpend} r="3" fill="var(--red)" />
          {/* Profit dot */}
          <circle cx={p.x} cy={p.yProfit} r="4.5" fill="var(--green)" stroke="var(--bg2)" strokeWidth="2" />
          
          {/* Tooltips */}
          <text x={p.x} y={p.yProfit - 8} fill="var(--text)" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="Space Grotesk">
            {R(p.profit).replace(',00', '')}
          </text>
        </g>
      ))}

      {/* Legend */}
      <g transform={`translate(${width - 150}, 10)`} fontSize="9" fontFamily="Space Grotesk">
        <circle cx="0" cy="4" r="3.5" fill="var(--green)" />
        <text x="8" y="7" fill="var(--text2)">Lucro Líquido</text>

        <line x1="75" y1="4" x2="85" y2="4" stroke="var(--red)" strokeWidth="1.5" strokeDasharray="2 2" />
        <circle cx="80" cy="4" r="2" fill="var(--red)" />
        <text x="93" y="7" fill="var(--text2)">Investido Ads</text>
      </g>

    </svg>
  );
}
