import React, { useState, useEffect, createElement, useRef, useMemo, useCallback } from 'react';
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
  ArrowRight,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Target,
  X,
  FileText,
  Calendar,
  ToggleLeft,
  ToggleRight,
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
  RefreshCcw,
  // Offer / category icons (replace user-facing emojis)
  Grape, Hamburger, Coffee, Pickaxe, Pizza, Cake, Fish, Footprints, Shirt,
  Gamepad2, Laptop, Smartphone, GraduationCap, Dumbbell, Palette, Plane, Coins,
  // Tag / task / sort icons
  Rocket, BarChart3, CheckCircle2, Star,
  Package,
  // New utilities (Cmd+K, mobile, toasts, etc.)
  Menu, ArrowDown, ArrowUp, Pin, GripVertical, Info,
  Download as DownloadIcon, ChevronRight, ChevronLeft
} from 'lucide-react';
import { supabase, supabaseUrl, supabaseKey } from './supabase';

// ==========================================
// FORMATTING HELPERS (BR)
// ==========================================
const R = (v) => 'R$ ' + Number(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const Pct = (v) => Number(v || 0).toFixed(1) + '%';
const Roas = (v) => Number(v || 0).toFixed(2);
const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2, 11) + Date.now().toString(36);

// Compute days since a YYYY-MM-DD date. Negative => future.
const daysSince = (dateStr) => {
  if (!dateStr) return null;
  const launchTime = new Date(dateStr + 'T00:00:00').getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - launchTime) / (1000 * 60 * 60 * 24));
};

const formatLaunchText = (dateStr) => {
  if (!dateStr) return 'Não lançada';
  const d = daysSince(dateStr);
  if (d === 0) return 'Lançada hoje';
  if (d > 0) return `Lançada há ${d} dia${d === 1 ? '' : 's'}`;
  const future = Math.abs(d);
  return `Lança em ${future} dia${future === 1 ? '' : 's'}`;
};

// ==========================================
// ICON SYSTEM (replaces emojis)
// ==========================================
const ICON_OPTIONS = [
  { key: 'grape',     label: 'Frutas',          Icon: Grape },
  { key: 'food',      label: 'Comida',          Icon: Hamburger },
  { key: 'coffee',    label: 'Café / Bebida',   Icon: Coffee },
  { key: 'mining',    label: 'Mineração',       Icon: Pickaxe },
  { key: 'pizza',     label: 'Pizza',           Icon: Pizza },
  { key: 'cake',      label: 'Doces',           Icon: Cake },
  { key: 'fish',      label: 'Peixe / Sushi',   Icon: Fish },
  { key: 'shoe',      label: 'Calçados',        Icon: Footprints },
  { key: 'apparel',   label: 'Vestuário',       Icon: Shirt },
  { key: 'game',      label: 'Games',           Icon: Gamepad2 },
  { key: 'tech',      label: 'Tecnologia',      Icon: Laptop },
  { key: 'mobile',    label: 'Mobile',          Icon: Smartphone },
  { key: 'education', label: 'Educação',        Icon: GraduationCap },
  { key: 'target',    label: 'Marketing',       Icon: Target },
  { key: 'fitness',   label: 'Fitness',         Icon: Dumbbell },
  { key: 'design',    label: 'Design',          Icon: Palette },
  { key: 'travel',    label: 'Viagem',          Icon: Plane },
  { key: 'money',     label: 'Finanças',        Icon: Coins },
  { key: 'idea',      label: 'Ideias',          Icon: Lightbulb },
  { key: 'hot',       label: 'Hot / Trend',     Icon: Flame },
];

const EMOJI_TO_ICON_KEY = {
  '🍇': 'grape', '🍔': 'food', '☕': 'coffee', '⛏️': 'mining', '⛏': 'mining',
  '🍕': 'pizza', '🍰': 'cake', '🍣': 'fish', '👟': 'shoe', '👕': 'apparel',
  '🎮': 'game', '💻': 'tech', '📱': 'mobile', '📚': 'education', '🎯': 'target',
  '🏋️': 'fitness', '🏋': 'fitness', '🎨': 'design', '✈️': 'travel', '✈': 'travel',
  '💰': 'money', '💡': 'idea', '🔥': 'hot',
};

// Resolve an offer's icon. Prefers offer.icon (new), falls back to mapping legacy emoji, else Package.
const resolveOfferIcon = (offer) => {
  const key = offer?.icon || EMOJI_TO_ICON_KEY[offer?.emoji];
  const match = ICON_OPTIONS.find(opt => opt.key === key);
  return match ? match.Icon : Package;
};

function OfferIcon({ offer, size = 16, color = 'currentColor', style }) {
  return createElement(resolveOfferIcon(offer), { size, color, style });
}

function OfferLabel({ offer, iconSize = 14, style }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', ...style }}>
      <OfferIcon offer={offer} size={iconSize} />
      <span>{offer?.name}</span>
    </span>
  );
}

// Diary / Task tag icon system (replaces emoji prefixes)
const DIARY_TAGS = [
  { key: 'lancamento', label: 'Lançamento', Icon: Rocket },
  { key: 'analise',    label: 'Análise',    Icon: BarChart3 },
  { key: 'insight',    label: 'Insight',    Icon: Lightbulb },
  { key: 'problema',   label: 'Problema',   Icon: AlertTriangle },
  { key: 'decisao',    label: 'Decisão',    Icon: CheckCircle2 },
  { key: 'resultado',  label: 'Resultado',  Icon: Flame },
];
const DIARY_TAG_MAP = Object.fromEntries(DIARY_TAGS.map(t => [t.key, t]));

const TASK_TYPES = [
  { key: 'criativo',   label: 'Criativo' },
  { key: 'pagina',     label: 'Página' },
  { key: 'setup',      label: 'Setup' },
  { key: 'analise',    label: 'Análise' },
  { key: 'lancamento', label: 'Lançamento' },
  { key: 'fix',        label: 'Fix' },
];


// User avatar: tries /profile.jpg, falls back to gradient + initials on error
function UserAvatar({ email }) {
  const [errored, setErrored] = useState(false);
  const initials = (email || '?').slice(0, 2).toUpperCase();
  const sharedStyle = {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    flex: '0 0 32px',
    objectFit: 'cover',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  };
  if (errored) {
    return (
      <div style={{
        ...sharedStyle,
        background: 'linear-gradient(135deg, var(--accent2) 0%, var(--accent) 100%)',
        fontSize: '12px',
        fontWeight: 'bold',
        color: '#fff'
      }}>
        {initials}
      </div>
    );
  }
  return (
    <img
      src="/profile.jpg"
      alt={email || 'Avatar'}
      onError={() => setErrored(true)}
      style={sharedStyle}
    />
  );
}

// ==========================================
// TOAST SYSTEM — global queue with hook
// ==========================================
const toastListeners = new Set();
let _toastId = 0;

export const toast = {
  show(message, opts = {}) {
    const id = ++_toastId;
    const item = {
      id,
      message,
      type: opts.type || 'info', // 'info' | 'success' | 'warning' | 'error'
      duration: opts.duration ?? 3500,
      action: opts.action || null // { label, onClick }
    };
    toastListeners.forEach(fn => fn({ type: 'add', item }));
    return id;
  },
  dismiss(id) {
    toastListeners.forEach(fn => fn({ type: 'remove', id }));
  },
  success(msg, opts) { return this.show(msg, { ...opts, type: 'success' }); },
  info(msg, opts) { return this.show(msg, { ...opts, type: 'info' }); },
  warn(msg, opts) { return this.show(msg, { ...opts, type: 'warning' }); },
  error(msg, opts) { return this.show(msg, { ...opts, type: 'error', duration: opts?.duration ?? 5500 }); }
};

// Promise-based confirm replacement
let _confirmResolver = null;
export const askConfirm = (opts) => new Promise(resolve => {
  _confirmResolver = resolve;
  toastListeners.forEach(fn => fn({ type: 'confirm', opts }));
});

function ToastHost() {
  const [items, setItems] = useState([]);
  const [confirmState, setConfirmState] = useState(null);

  useEffect(() => {
    const handler = (ev) => {
      if (ev.type === 'add') {
        setItems(prev => [...prev, ev.item]);
        if (ev.item.duration > 0) {
          setTimeout(() => {
            setItems(prev => prev.filter(t => t.id !== ev.item.id));
          }, ev.item.duration);
        }
      } else if (ev.type === 'remove') {
        setItems(prev => prev.filter(t => t.id !== ev.id));
      } else if (ev.type === 'confirm') {
        setConfirmState(ev.opts);
      }
    };
    toastListeners.add(handler);
    return () => toastListeners.delete(handler);
  }, []);

  const colorFor = (t) => ({
    success: { bg: 'var(--green-dim)', border: 'var(--green)', text: 'var(--green)' },
    info:    { bg: 'var(--blue-dim)',  border: 'var(--blue)',  text: 'var(--blue)' },
    warning: { bg: 'var(--yellow-dim)', border: 'var(--yellow)', text: 'var(--yellow)' },
    error:   { bg: 'var(--red-dim)',   border: 'var(--red)',   text: 'var(--red)' }
  })[t] || { bg: 'var(--bg3)', border: 'var(--border2)', text: 'var(--text)' };

  const IconFor = (type) => {
    if (type === 'success') return CheckCircle2;
    if (type === 'warning') return AlertTriangle;
    if (type === 'error') return AlertTriangle;
    return Info;
  };

  const closeConfirm = (result) => {
    const r = _confirmResolver;
    _confirmResolver = null;
    setConfirmState(null);
    if (r) r(result);
  };

  return (
    <>
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none'
      }}>
        {items.map(t => {
          const c = colorFor(t.type);
          const Ico = IconFor(t.type);
          return (
            <div key={t.id} style={{
              pointerEvents: 'auto',
              backgroundColor: c.bg,
              border: `1px solid ${c.border}`,
              color: c.text,
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              maxWidth: '420px',
              minWidth: '260px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              boxShadow: '0 6px 18px rgba(0,0,0,0.10)',
              animation: 'toastSlideIn 220ms cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
              <Ico size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
              <div style={{ flex: 1, lineHeight: 1.4, color: 'var(--text)' }}>{t.message}</div>
              {t.action && (
                <button
                  onClick={() => { t.action.onClick?.(); toast.dismiss(t.id); }}
                  style={{ background: 'transparent', border: 'none', color: c.text, fontWeight: 600, cursor: 'pointer', fontSize: '12px', padding: '0 4px' }}
                >
                  {t.action.label}
                </button>
              )}
              <button
                onClick={() => toast.dismiss(t.id)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 0, lineHeight: 0 }}
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
        <style>{`@keyframes toastSlideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
      </div>

      {confirmState && (
        <div className="modal-overlay" style={{ zIndex: 250 }} onClick={() => closeConfirm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: confirmState.danger ? 'var(--red-dim)' : 'var(--yellow-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={18} color={confirmState.danger ? 'var(--red)' : 'var(--yellow)'} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '15px', marginBottom: '6px' }}>{confirmState.title || 'Confirmar ação'}</h3>
                {confirmState.body && (
                  <p style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{confirmState.body}</p>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => closeConfirm(false)} style={{ minWidth: '100px' }}>
                {confirmState.cancelLabel || 'Cancelar'}
              </button>
              <button
                className={confirmState.danger ? 'btn btn-danger' : 'btn btn-primary'}
                onClick={() => closeConfirm(true)}
                style={{ minWidth: '100px' }}
              >
                {confirmState.confirmLabel || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

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

  // Data States — cloudState is loaded BEFORE this component mounts (see main.jsx).
  // localStorage is only a fallback for pre-cloud users or transient cloud nulls.
  const [offers, setOffers] = useState(() => {
    if (cloudState?.offers) return cloudState.offers;
    const saved = localStorage.getItem('ops_offers');
    return saved ? JSON.parse(saved) : [];
  });

  const [dailyData, setDailyData] = useState(() => {
    if (cloudState?.dailyData) return cloudState.dailyData;
    const saved = localStorage.getItem('ops_daily_data');
    return saved ? JSON.parse(saved) : [];
  });

  const [tasks, setTasks] = useState(() => {
    if (cloudState?.tasks) return cloudState.tasks;
    const saved = localStorage.getItem('ops_tasks');
    return saved ? JSON.parse(saved) : [];
  });

  const [ideas, setIdeas] = useState(() => {
    if (cloudState?.ideas) return cloudState.ideas;
    const saved = localStorage.getItem('ops_ideas');
    return saved ? JSON.parse(saved) : [];
  });

  const [diary, setDiary] = useState(() => {
    if (cloudState?.diary) return cloudState.diary;
    const saved = localStorage.getItem('ops_diary');
    return saved ? JSON.parse(saved) : [];
  });

  const [globalDailyGoal, setGlobalDailyGoal] = useState(() => {
    if (typeof cloudState?.globalDailyGoal === 'number') return cloudState.globalDailyGoal;
    const saved = localStorage.getItem('ops_global_goal');
    return saved ? Number(saved) : 1000;
  });

  // Session-only alert dismissals (key: alert content hash)
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());

  // Global period filter — affects Dashboard + Pipeline + Metrics
  const [periodFilter, setPeriodFilter] = useState(() => {
    return localStorage.getItem('ops_period') || 'all'; // 'today' | '7d' | '30d' | 'all'
  });
  useEffect(() => {
    localStorage.setItem('ops_period', periodFilter);
  }, [periodFilter]);

  // Cmd+K / Ctrl+K opens command palette
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      } else if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
        setIsSidebarOpenMobile(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // UI Modals / Drawers States
  const [isNewOfferModalOpen, setIsNewOfferModalOpen] = useState(false);
  const [offerModalPrefill, setOfferModalPrefill] = useState(null); // { fromIdea, ...prefilled fields }
  const [selectedOfferIdForDrawer, setSelectedOfferIdForDrawer] = useState(null);
  const [isDailyDataDrawerOpen, setIsDailyDataDrawerOpen] = useState(false);
  const [editingDailyRecord, setEditingDailyRecord] = useState(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isNewIdeaModalOpen, setIsNewIdeaModalOpen] = useState(false);
  const [isNewDiaryModalOpen, setIsNewDiaryModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [creativeModalState, setCreativeModalState] = useState(null); // { offerId, creative? }
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  // Edit States
  const [editingTask, setEditingTask] = useState(null);
  const [editingIdea, setEditingIdea] = useState(null);
  const [editingOffer, setEditingOffer] = useState(null);
  const [editingDiary, setEditingDiary] = useState(null);

  // Filter States
  const [pipelineFilter, setPipelineFilter] = useState('todos'); // 'todos' | 'ativas' | 'pausadas' | 'mortas'
  const [pipelineSearch, setPipelineSearch] = useState('');
  const [kanbanOfferFilter, setKanbanOfferFilter] = useState('all'); // 'all' | 'none' | offerId
  const [diaryTagFilter, setDiaryTagFilter] = useState('all');
  const [diaryOfferFilter, setDiaryOfferFilter] = useState('all');
  const [diarySearchQuery, setDiarySearchQuery] = useState('');
  const [diaryDateFrom, setDiaryDateFrom] = useState('');
  const [diaryDateTo, setDiaryDateTo] = useState('');
  const [showAutoDiary, setShowAutoDiary] = useState(true);
  const [ideasSearch, setIdeasSearch] = useState('');
  const [ideasView, setIdeasView] = useState('grid'); // 'grid' | 'matrix'
  const [ideasStatusFilter, setIdeasStatusFilter] = useState('active'); // 'active' | 'archived' | 'all'

  // Metrics sorting
  const [metricsSort, setMetricsSort] = useState({ key: 'profit', dir: 'desc' });
  
  // Sorting State for Ideas
  const [ideasSortBy, setIdeasSortBy] = useState('potential'); // 'potential' | 'effort' | 'date'

  // Cloud Sync Status
  const [isSyncing, setIsSyncing] = useState(false);

  // Refs for tracking changes and triggering sync on window unload
  const payloadRef = React.useRef(null);
  const isDirtyRef = React.useRef(false);
  const isFirstSyncRef = React.useRef(true);
  const userId = session?.user?.id;
  const accessToken = session?.access_token;

  // beforeunload: silently flush pending changes via keepalive fetch (no warning popup)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!isDirtyRef.current || !payloadRef.current || !userId) return;
      try {
        fetch(`${supabaseUrl}/rest/v1/user_app_state`, {
          method: 'POST',
          keepalive: true,
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({
            user_id: userId,
            app_state: payloadRef.current,
            updated_at: new Date().toISOString()
          })
        }).catch(() => {});
      } catch { /* swallow */ }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [userId, accessToken]);

  // Persistent Storage & Cloud Sync
  useEffect(() => {
    localStorage.setItem('ops_theme', theme);
    localStorage.setItem('ops_offers', JSON.stringify(offers));
    localStorage.setItem('ops_daily_data', JSON.stringify(dailyData));
    localStorage.setItem('ops_tasks', JSON.stringify(tasks));
    localStorage.setItem('ops_ideas', JSON.stringify(ideas));
    localStorage.setItem('ops_diary', JSON.stringify(diary));
    localStorage.setItem('ops_global_goal', String(globalDailyGoal));

    const payload = { theme, offers, dailyData, tasks, ideas, diary, globalDailyGoal };
    payloadRef.current = payload;

    // Skip cloud sync on first mount — data we just received from cloud doesn't need to be sent back
    if (isFirstSyncRef.current) {
      isFirstSyncRef.current = false;
      return;
    }

    isDirtyRef.current = true;

    const syncToCloud = async () => {
      setIsSyncing(true);
      const { error } = await supabase
        .from('user_app_state')
        .upsert({
          user_id: userId,
          app_state: payload,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
      if (error) {
        console.error('Error syncing to cloud:', error);
      } else {
        isDirtyRef.current = false;
      }
      setIsSyncing(false);
    };

    const debounceTimer = setTimeout(syncToCloud, 600);
    return () => clearTimeout(debounceTimer);
  }, [theme, offers, dailyData, tasks, ideas, diary, globalDailyGoal, userId]);

  // ==========================================
  // CALCULATIONS / METRICS
  // ==========================================
  const getOfferStats = (offerId, range = null) => {
    const allRecords = dailyData.filter(d => d.offerId === offerId);
    const records = range ? allRecords.filter(d => d.date >= range.from && d.date <= range.to) : allRecords;
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

  // Period filtering — returns the cutoff dates for current and previous periods
  const periodBounds = useMemo(() => {
    if (periodFilter === 'all') return { current: null, previous: null };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayMs = 24 * 60 * 60 * 1000;
    const fmt = (d) => d.toISOString().split('T')[0];

    // Helper: shift a date by days
    const shift = (d, days) => new Date(d.getTime() + days * dayMs);

    let curStart, curEnd, prevStart, prevEnd;

    if (periodFilter === 'week') {
      // This week starting Monday
      const dow = (today.getDay() + 6) % 7; // 0 = Monday
      curStart = shift(today, -dow);
      curEnd = shift(curStart, 6);
      prevEnd = shift(curStart, -1);
      prevStart = shift(prevEnd, -6);
    } else if (periodFilter === 'month') {
      curStart = new Date(today.getFullYear(), today.getMonth(), 1);
      curEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      prevStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      prevEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    } else if (periodFilter === 'lastMonth') {
      curStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      curEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      prevStart = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      prevEnd = new Date(today.getFullYear(), today.getMonth() - 1, 0);
    } else {
      const days = periodFilter === 'today' ? 1 : periodFilter === '7d' ? 7 : 30;
      curStart = shift(today, -(days - 1));
      curEnd = new Date(today.getTime() + dayMs - 1);
      prevStart = shift(curStart, -days);
      prevEnd = shift(curStart, -1);
    }

    return {
      current: { from: fmt(curStart), to: fmt(curEnd) },
      previous: { from: fmt(prevStart), to: fmt(prevEnd) }
    };
  }, [periodFilter]);

  const inPeriod = (dateStr, range) => {
    if (!range) return true;
    return dateStr >= range.from && dateStr <= range.to;
  };

  const dailyDataInPeriod = useMemo(() =>
    dailyData.filter(d => inPeriod(d.date, periodBounds.current)),
  [dailyData, periodBounds.current]);

  const dailyDataPrevPeriod = useMemo(() =>
    dailyData.filter(d => inPeriod(d.date, periodBounds.previous)),
  [dailyData, periodBounds.previous]);

  const aggregate = (records) => {
    const revenue = records.reduce((s, d) => s + Number(d.revenue || 0), 0);
    const spend = records.reduce((s, d) => s + Number(d.adSpend || 0), 0);
    const sales = records.reduce((s, d) => s + Number(d.sales || 0), 0);
    return { revenue, spend, profit: revenue - spend, sales, roas: spend > 0 ? revenue / spend : 0 };
  };

  const currentAgg = useMemo(() => aggregate(dailyDataInPeriod), [dailyDataInPeriod]);
  const previousAgg = useMemo(() => aggregate(dailyDataPrevPeriod), [dailyDataPrevPeriod]);

  const pctChange = (cur, prev) => {
    if (prev === 0) return cur > 0 ? 100 : 0;
    return ((cur - prev) / Math.abs(prev)) * 100;
  };

  const totalRevenue = currentAgg.revenue;
  const totalSpend = currentAgg.spend;
  const totalProfit = currentAgg.profit;
  const averageRoas = currentAgg.roas;

  // Per-offer ranking respecting the selected period
  const offerRanking = useMemo(() => {
    return offers
      .map(o => {
        const s = getOfferStats(o.id, periodBounds.current);
        return { id: o.id, offer: o, name: o.name, ...s };
      })
      .sort((a, b) => b.profit - a.profit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offers, dailyData, periodBounds.current]);

  let bestOffer = { name: 'Sem dados', profit: 0 };
  let worstOffer = { name: 'Sem dados', profit: 0 };
  if (offerRanking.length > 0) {
    bestOffer = offerRanking[0];
    if (offerRanking.length > 1) worstOffer = offerRanking[offerRanking.length - 1];
  }

  // Daily profit/spend trend, respecting period. 'all'/'today' fall back to last 14 active dates.
  const chartSource = (periodFilter === 'all' || periodFilter === 'today') ? dailyData : dailyDataInPeriod;
  const chartSliceCount = periodFilter === '30d' ? 30 : 14;
  const uniqueDates = Array.from(new Set(chartSource.map(d => d.date))).sort().slice(-chartSliceCount);
  const chartData = uniqueDates.map(date => {
    const dayRecords = chartSource.filter(d => d.date === date);
    const rev = dayRecords.reduce((s, r) => s + Number(r.revenue || 0), 0);
    const spend = dayRecords.reduce((s, r) => s + Number(r.adSpend || 0), 0);
    return { date, revenue: rev, spend, profit: rev - spend };
  });

  const overallDailyAvg = chartData.length > 0
    ? chartData.reduce((s, d) => s + d.profit, 0) / chartData.length
    : 0;

  // Forecast: projected month-end profit based on current daily average
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const dayOfMonth = today.getDate();
  const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  const monthRecords = dailyData.filter(d => d.date >= monthStart);
  const monthProfitSoFar = monthRecords.reduce((s, r) => s + (Number(r.revenue || 0) - Number(r.adSpend || 0)), 0);
  const monthRevenueSoFar = monthRecords.reduce((s, r) => s + Number(r.revenue || 0), 0);
  const projectedMonthProfit = dayOfMonth > 0 ? (monthProfitSoFar / dayOfMonth) * daysInMonth : 0;
  const projectedMonthRevenue = dayOfMonth > 0 ? (monthRevenueSoFar / dayOfMonth) * daysInMonth : 0;

  // ==========================================
  // OPERATIONAL CRITICAL ALERTS LOGIC (UX Boost)
  // ==========================================
  const getCriticalAlerts = () => {
    const alerts = [];

    offers.filter(o => o.status === 'ativa').forEach(o => {
      const stats = getOfferStats(o.id);
      if (stats.spend > 0 && stats.roas < 1.3) {
        alerts.push({
          id: `roas-${o.id}`,
          type: 'danger',
          message: `ROAS crítico na oferta "${o.name}": ROAS de ${Roas(stats.roas)}x está abaixo da linha de break-even (1.3x). Revise seus anúncios imediatamente!`
        });
      }
    });

    offers.filter(o => o.status === 'ativa' && o.stage !== 'ideia').forEach(o => {
      const activeCreatives = o.creatives ? o.creatives.filter(c => c.status === 'ativo') : [];
      if (activeCreatives.length === 0) {
        alerts.push({
          id: `no-creatives-${o.id}`,
          type: 'warning',
          message: `Oferta ativa "${o.name}" está sem nenhum criativo ativado! Suba criativos para rodar tráfego.`
        });
      }
    });

    offers.filter(o => o.status === 'ativa' && (o.stage === 'testando' || o.stage === 'escalando')).forEach(o => {
      if (o.checklist) {
        const missingItems = [];
        if (!o.checklist.pixel) missingItems.push('Pixel de conversão');
        if (!o.checklist.checkout) missingItems.push('Checkout básico');
        if (missingItems.length > 0) {
          alerts.push({
            id: `checklist-${o.id}`,
            type: 'warning',
            message: `Checkout / Rastreamento pendente no produto "${o.name}": Falta configurar ${missingItems.join(' e ')}.`
          });
        }
      }
    });

    tasks.filter(t => t.column !== 'done' && t.deadline).forEach(t => {
      const todayStr = new Date().toISOString().split('T')[0];
      if (t.deadline < todayStr) {
        alerts.push({
          id: `overdue-${t.id}`,
          type: 'danger',
          message: `Tarefa atrasada: "${t.title}" venceu em ${new Date(t.deadline + 'T00:00:00').toLocaleDateString('pt-BR')}!`
        });
      }
    });

    return alerts.filter(a => !dismissedAlerts.has(a.id));
  };

  const criticalAlertsList = getCriticalAlerts();

  const dismissAlert = (alertId) => {
    setDismissedAlerts(prev => {
      const next = new Set(prev);
      next.add(alertId);
      return next;
    });
  };

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

  // Pipeline offer drag & drop (move offer between stages)
  const [draggedOfferId, setDraggedOfferId] = useState(null);
  const [draggedOverStage, setDraggedOverStage] = useState(null);

  const handleOfferDrop = (targetStageId) => {
    const offerId = draggedOfferId;
    setDraggedOfferId(null);
    setDraggedOverStage(null);
    if (!offerId) return;
    const offer = offers.find(o => o.id === offerId);
    if (!offer) return;

    // Map the visual "pausada" column (which represents pausada/morta) — default to pausada
    const newStage = targetStageId === 'pausada' ? 'pausada' : targetStageId;
    if (offer.stage === newStage) return;

    let newStatus = offer.status;
    if (newStage === 'pausada') newStatus = 'pausada';
    else if (offer.status !== 'morta') newStatus = 'ativa';

    setOffers(prev => prev.map(o => o.id === offerId
      ? { ...o, stage: newStage, status: newStatus, previousStage: o.stage, updatedAt: new Date().toISOString() }
      : o
    ));
    toast.success(`"${offer.name}" movida para ${newStage.toUpperCase()}.`);
  };

  // ==========================================
  // ACTIONS HANDLERS
  // ==========================================
  const handleCreateOffer = (formData) => {
    const newOffer = {
      id: uid(),
      name: formData.name,
      emoji: formData.emoji,
      icon: formData.icon || 'grape',
      type: formData.type || 'outro',
      niche: formData.niche,
      stage: formData.stage || 'ideia',
      status: formData.stage === 'pausada' || formData.stage === 'morta' ? formData.stage : 'ativa',
      previousStage: null,
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
    setOfferModalPrefill(null);

    setDiary(prev => [{
      id: uid(),
      text: `Criada nova oferta "${newOffer.name}" no estágio "${newOffer.stage.toUpperCase()}".`,
      tag: 'lancamento',
      offerId: newOffer.id,
      isAuto: true,
      createdAt: new Date().toISOString()
    }, ...prev]);

    // If this offer was created from an idea, remove the idea now
    if (formData.fromIdeaId) {
      setIdeas(prev => prev.filter(i => i.id !== formData.fromIdeaId));
      toast.success(`Ideia convertida em oferta "${newOffer.name}".`);
    } else {
      toast.success(`Oferta "${newOffer.name}" criada.`);
    }
  };

  const handleUpdateOffer = (updated) => {
    setOffers(prev => prev.map(o => o.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : o));
    setEditingOffer(null);
  };

  const handleDeleteOffer = async (offerId) => {
    const offer = offers.find(o => o.id === offerId);
    if (!offer) return;
    const linkedDaily = dailyData.filter(d => d.offerId === offerId).length;
    const linkedTasks = tasks.filter(t => t.offerId === offerId).length;
    const linkedDiary = diary.filter(dy => dy.offerId === offerId).length;
    const ok = await askConfirm({
      title: `Deletar oferta "${offer.name}"?`,
      body: `Também serão removidos PERMANENTEMENTE:\n• ${linkedDaily} registro(s) diário(s)\n• ${linkedTasks} tarefa(s) vinculada(s)\n• ${linkedDiary} entrada(s) do diário\n\nEsta ação não pode ser desfeita.`,
      confirmLabel: 'Deletar tudo',
      danger: true
    });
    if (!ok) return;
    setOffers(prev => prev.filter(o => o.id !== offerId));
    setDailyData(prev => prev.filter(d => d.offerId !== offerId));
    setTasks(prev => prev.filter(t => t.offerId !== offerId));
    setDiary(prev => prev.filter(dy => dy.offerId !== offerId));
    setSelectedOfferIdForDrawer(null);
    toast.success(`Oferta "${offer.name}" e ${linkedDaily + linkedTasks + linkedDiary} item(s) vinculados removidos.`);
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
      text: `Dados diários registrados para ${offerObj ? offerObj.name : 'Oferta'}. Faturamento: ${R(newRecord.revenue)}, Gastos: ${R(newRecord.adSpend)}, Lucro: ${R(profit)}, ROAS: ${roas}. Observação: ${newRecord.notes || 'Sem observações.'}`,
      tag: 'analise',
      offerId: formData.offerId,
      isAuto: true,
      createdAt: new Date().toISOString()
    }, ...prev]);
    toast.success(`Dia registrado: ${R(newRecord.revenue)} fat / ${R(profit)} lucro${roas !== 'N/A' ? ` (ROAS ${roas}x)` : ''}.`);
  };

  const handleUpdateDailyRecord = (updated) => {
    setDailyData(prev => prev.map(d => d.id === updated.id ? {
      ...d,
      ...updated,
      revenue: Number(updated.revenue || 0),
      adSpend: Number(updated.adSpend || 0),
      sales: Number(updated.sales || 0),
      bumps: Number(updated.bumps || 0)
    } : d));
    setEditingDailyRecord(null);
    toast.success('Registro atualizado.');
  };

  const handleDeleteDailyRecord = async (recordId) => {
    const ok = await askConfirm({ title: 'Deletar registro diário?', confirmLabel: 'Deletar', danger: true });
    if (!ok) return;
    setDailyData(prev => prev.filter(d => d.id !== recordId));
    toast.success('Registro diário removido.');
  };

  const handleSaveCreative = (offerId, payload) => {
    const isEdit = !!payload.id;
    setOffers(prev => prev.map(o => {
      if (o.id !== offerId) return o;
      const existing = o.creatives || [];
      if (isEdit) {
        return {
          ...o,
          creatives: existing.map(c => c.id === payload.id ? {
            ...c,
            name: payload.name,
            roas: Number(payload.roas || 0),
            notes: payload.notes || ''
          } : c)
        };
      }
      return {
        ...o,
        creatives: [...existing, {
          id: uid(),
          name: payload.name,
          status: 'ativo',
          roas: Number(payload.roas || 0),
          notes: payload.notes || ''
        }]
      };
    }));
    setCreativeModalState(null);
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

  const handleDeleteCreative = async (offerId, creativeId) => {
    const ok = await askConfirm({ title: 'Deletar criativo?', confirmLabel: 'Deletar', danger: true });
    if (ok) {
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

  const handleDeleteTask = async (taskId) => {
    const ok = await askConfirm({ title: 'Deletar tarefa?', confirmLabel: 'Deletar', danger: true });
    if (!ok) return;
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setEditingTask(null);
    toast.success('Tarefa removida.');
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

  const handleDeleteIdea = async (ideaId) => {
    const ok = await askConfirm({ title: 'Deletar ideia?', confirmLabel: 'Deletar', danger: true });
    if (ok) {
      setIdeas(prev => prev.filter(i => i.id !== ideaId));
      setEditingIdea(null);
      toast.success('Ideia removida.');
    }
  };

  const handleMoveIdeaToPipeline = (idea) => {
    const tagText = idea.tags && idea.tags.length > 0 ? `\nTags da ideia: ${idea.tags.map(t => '#' + t).join(' ')}` : '';
    const notesText = idea.notes ? `\nNotas originais: ${idea.notes}` : '';
    setOfferModalPrefill({
      fromIdeaId: idea.id,
      name: idea.name,
      type: idea.type || 'pack_artes',
      niche: idea.description || '',
      stage: 'ideia',
      dailyProfitGoal: 100,
      notes: `Convertido a partir de ideia.${notesText}${tagText}`.trim()
    });
    setIsNewOfferModalOpen(true);
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

  const handleDeleteDiary = async (diaryId) => {
    const ok = await askConfirm({ title: 'Deletar entrada do diário?', confirmLabel: 'Deletar', danger: true });
    if (ok) {
      setDiary(prev => prev.filter(dy => dy.id !== diaryId));
      setEditingDiary(null);
      toast.success('Entrada removida.');
    }
  };

  const handleExportDiary = () => {
    const content = diary.map(dy => {
      const offer = offers.find(o => o.id === dy.offerId);
      const dateStr = new Date(dy.createdAt).toLocaleString('pt-BR');
      return `[${dateStr}] [${dy.tag.toUpperCase()}] ${offer ? `(${offer.name})` : ''}\n${dy.text}\n----------------------------------------\n`;
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
      <div
        className={`sidebar-backdrop ${isSidebarOpenMobile ? 'is-open' : ''}`}
        onClick={() => setIsSidebarOpenMobile(false)}
      />
      <aside className={`sidebar ${isSidebarOpenMobile ? 'is-open' : ''}`} onClick={() => setIsSidebarOpenMobile(false)}>
        <div>
          {/* Operai logo */}
          <div style={{
            padding: '10px 8px 16px 8px',
            marginBottom: '12px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <img src="/operai-logo.svg" alt="Operai" className="operai-logo" />
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
            <UserAvatar email={session?.user?.email} />
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }} title={session?.user?.email}>
                {(session?.user?.email || '').split('@')[0] || 'Usuário'}
              </span>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className="mobile-menu-btn"
              onClick={() => setIsSidebarOpenMobile(true)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', padding: 0, display: 'none' }}
              aria-label="Abrir menu"
            >
              <Menu size={20} />
            </button>
            <h2 style={{ fontSize: '16px', color: 'var(--text)' }}>
              {activePage === 'dashboard' && 'Dashboard Operacional'}
              {activePage === 'pipeline' && 'Pipeline de Ofertas'}
              {activePage === 'kanban' && 'Kanban de Tarefas'}
              {activePage === 'ideas' && 'Banco de Ideias'}
              {activePage === 'metrics' && 'Performance & Métricas'}
              {activePage === 'diary' && 'Diário de Operações'}
              {activePage === 'utils' && 'Calculadora de Tráfego & Gerador UTM'}
            </h2>
            {['dashboard', 'metrics', 'pipeline'].includes(activePage) && (
              <PeriodPicker value={periodFilter} onChange={setPeriodFilter} />
            )}
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              title="Buscar / Comandos (Ctrl+K)"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                fontSize: '11px', color: 'var(--text2)',
                backgroundColor: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: '6px', padding: '5px 10px', cursor: 'pointer'
              }}
            >
              <Search size={12} />
              <span style={{ marginRight: '4px' }}>Buscar...</span>
              <kbd style={kbdStyle}>Ctrl</kbd><kbd style={kbdStyle}>K</kbd>
            </button>
          </div>

          {/* Goal Progress bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', cursor: 'pointer' }}
              onClick={() => setIsGoalModalOpen(true)}
              title="Clique para editar a meta diária"
            >
              <div style={{ display: 'flex', gap: '8px', fontSize: '11px', fontWeight: '500' }}>
                <span style={{ color: 'var(--text2)' }}>Meta {R(globalDailyGoal)}/dia:</span>
                <span style={{ color: overallDailyAvg >= globalDailyGoal ? 'var(--green)' : 'var(--yellow)' }}>
                  {R(overallDailyAvg)}/dia ({Pct((overallDailyAvg / (globalDailyGoal || 1)) * 100)})
                </span>
              </div>
              <div style={{ width: '120px', height: '4px', backgroundColor: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(100, (overallDailyAvg / (globalDailyGoal || 1)) * 100)}%`,
                  height: '100%',
                  backgroundColor: overallDailyAvg >= globalDailyGoal ? 'var(--green)' : 'var(--accent)',
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              <PeriodBanner periodFilter={periodFilter} periodBounds={periodBounds} suffix="KPIs, gráfico e ranking refletem este período." />

              {/* Critical alerts banner (if any) */}
              {criticalAlertsList.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {criticalAlertsList.map((alert) => (
                    <div
                      key={alert.id}
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
                      <span style={{ flex: 1 }}>{alert.message}</span>
                      <button
                        onClick={() => dismissAlert(alert.id)}
                        title="Dispensar este alerta"
                        style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, opacity: 0.7 }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Top Widgets Summary */}
              <div className="dashboard-grid">
                <KpiCard
                  label="FATURAMENTO"
                  value={R(totalRevenue)}
                  delta={periodFilter !== 'all' ? pctChange(currentAgg.revenue, previousAgg.revenue) : null}
                  icon={DollarSign}
                  color="var(--accent)"
                  trend={chartData.map(d => d.revenue)}
                />
                <KpiCard
                  label="LUCRO LÍQUIDO"
                  value={R(totalProfit)}
                  delta={periodFilter !== 'all' ? pctChange(currentAgg.profit, previousAgg.profit) : null}
                  icon={Flame}
                  color={totalProfit >= 0 ? 'var(--green)' : 'var(--red)'}
                  trend={chartData.map(d => d.profit)}
                />
                <KpiCard
                  label="INVESTIMENTO EM ADS"
                  value={R(totalSpend)}
                  delta={periodFilter !== 'all' ? pctChange(currentAgg.spend, previousAgg.spend) : null}
                  deltaInverse
                  icon={Activity}
                  color="var(--red)"
                  trend={chartData.map(d => d.spend)}
                />
                <KpiCard
                  label="ROAS MÉDIO"
                  value={Roas(averageRoas) + 'x'}
                  delta={periodFilter !== 'all' && previousAgg.roas > 0 ? pctChange(currentAgg.roas, previousAgg.roas) : null}
                  icon={Target}
                  color={averageRoas >= 1.5 ? 'var(--green)' : 'var(--text)'}
                  trend={chartData.map(d => d.spend > 0 ? d.revenue / d.spend : 0)}
                />
              </div>

              {/* Projection / forecast strip */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text2)' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em' }}>LUCRO DO MÊS (ATÉ HOJE)</span>
                    <Calendar size={13} color="var(--accent)" />
                  </div>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: monthProfitSoFar >= 0 ? 'var(--green)' : 'var(--red)' }}>{R(monthProfitSoFar)}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text3)' }}>{dayOfMonth} de {daysInMonth} dias</span>
                </div>
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text2)' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em' }}>PROJEÇÃO FIM DO MÊS</span>
                    <TrendingUp size={13} color="var(--accent2)" />
                  </div>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--accent2)' }}>{R(projectedMonthProfit)}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text3)' }}>lucro · {R(projectedMonthRevenue)} faturamento</span>
                </div>
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text2)' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em' }}>META MENSAL ({R(globalDailyGoal * daysInMonth)})</span>
                    <Target size={13} color={projectedMonthProfit >= globalDailyGoal * daysInMonth ? 'var(--green)' : 'var(--yellow)'} />
                  </div>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: projectedMonthProfit >= globalDailyGoal * daysInMonth ? 'var(--green)' : 'var(--text)' }}>
                    {Pct(globalDailyGoal * daysInMonth > 0 ? (projectedMonthProfit / (globalDailyGoal * daysInMonth)) * 100 : 0)}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text3)' }}>da meta na projeção atual</span>
                </div>
              </div>

              {/* Main SVG Area Chart: Revenue vs Spend vs Profit */}
              <div className="card" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={16} color="var(--accent)" />
                  <span>Lucro vs. Investimento — {periodLabel(periodFilter, periodBounds)}</span>
                </h3>
                {chartData.length > 1 ? (
                  <div style={{ width: '100%' }}>
                    <SvgDashboardChart data={chartData} />
                  </div>
                ) : (
                  <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text3)', border: '1px dashed var(--border)', borderRadius: '8px' }}>
                    Sem dados suficientes neste período. Registre dias na aba "Métricas" ou amplie o período no topo.
                  </div>
                )}
              </div>

              {/* Per-offer ranking for the selected period */}
              {offerRanking.some(r => r.revenue > 0 || r.spend > 0) && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <BarChart3 size={15} color="var(--accent)" /> Ranking de Ofertas — {periodLabel(periodFilter, periodBounds)}
                    </h3>
                    <button className="btn" onClick={() => setActivePage('metrics')} style={{ fontSize: '11px', padding: 0, color: 'var(--accent)', border: 'none', background: 'transparent' }}>
                      Ver tudo <ArrowUpRight size={12} />
                    </button>
                  </div>
                  <div>
                    {offerRanking.filter(r => r.revenue > 0 || r.spend > 0).slice(0, 6).map((r, idx) => {
                      const maxProfit = Math.max(...offerRanking.map(x => Math.abs(x.profit)), 1);
                      const barPct = Math.min(100, (Math.abs(r.profit) / maxProfit) * 100);
                      return (
                        <div key={r.id} onClick={() => setSelectedOfferIdForDrawer(r.id)} style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }} className="table-row-hover">
                          <span style={{ fontSize: '11px', color: 'var(--text3)', width: '16px', fontWeight: 700 }}>{idx + 1}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><OfferLabel offer={r.offer} iconSize={12} /></span>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: r.profit >= 0 ? 'var(--green)' : 'var(--red)' }}>{R(r.profit)}</span>
                            </div>
                            <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ width: `${barPct}%`, height: '100%', backgroundColor: r.profit >= 0 ? 'var(--green)' : 'var(--red)' }} />
                            </div>
                          </div>
                          <span style={{ fontSize: '11px', color: r.roas >= 1.5 ? 'var(--green)' : r.roas > 0 ? 'var(--red)' : 'var(--text3)', fontWeight: 600, width: '52px', textAlign: 'right' }}>
                            {r.roas > 0 ? Roas(r.roas) + 'x' : '—'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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
                                {linkedOffer ? <OfferLabel offer={linkedOffer} iconSize={10} /> : 'Geral'}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['todos', 'ativas', 'pausadas', 'mortas'].map(filter => {
                    const count = offers.filter(o => {
                      if (filter === 'todos') return true;
                      return o.status === filter.replace(/s$/, '') || (filter === 'mortas' && o.status === 'morta') || (filter === 'pausadas' && o.status === 'pausada') || (filter === 'ativas' && o.status === 'ativa');
                    }).length;
                    return (
                      <button
                        key={filter}
                        className="btn"
                        onClick={() => setPipelineFilter(filter)}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          backgroundColor: pipelineFilter === filter ? 'var(--bg3)' : 'transparent',
                          border: '1px solid ' + (pipelineFilter === filter ? 'var(--border2)' : 'var(--border)'),
                          color: pipelineFilter === filter ? 'var(--text)' : 'var(--text2)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        {filter.toUpperCase()}
                        <span style={{ fontSize: '10px', backgroundColor: 'var(--border)', color: 'var(--text2)', padding: '1px 6px', borderRadius: '4px' }}>{count}</span>
                      </button>
                    );
                  })}
                </div>
                <div style={{ position: 'relative', width: '260px', maxWidth: '40vw' }}>
                  <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                  <input
                    type="text"
                    placeholder="Buscar oferta por nome..."
                    value={pipelineSearch}
                    onChange={(e) => setPipelineSearch(e.target.value)}
                    style={{ paddingLeft: '30px', fontSize: '12px', padding: '6px 10px 6px 30px' }}
                  />
                </div>
              </div>

              <PeriodBanner periodFilter={periodFilter} periodBounds={periodBounds} suffix="Métricas dos cards refletem este período." />

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

                    if (pipelineSearch && !o.name.toLowerCase().includes(pipelineSearch.toLowerCase())) return false;
                    if (pipelineFilter === 'ativas') return o.status === 'ativa';
                    if (pipelineFilter === 'pausadas') return o.status === 'pausada';
                    if (pipelineFilter === 'mortas') return o.status === 'morta';
                    return true;
                  });

                  const isDragOver = draggedOverStage === col.id;
                  return (
                    <div
                      key={col.id}
                      onDragOver={(e) => { if (draggedOfferId) { e.preventDefault(); setDraggedOverStage(col.id); } }}
                      onDragLeave={() => setDraggedOverStage(null)}
                      onDrop={(e) => { e.preventDefault(); handleOfferDrop(col.id); }}
                      style={{
                        flex: '0 0 280px',
                        width: '280px',
                        backgroundColor: isDragOver ? 'rgba(99, 102, 241, 0.08)' : col.bg,
                        border: '1px solid ' + (isDragOver ? 'var(--accent)' : 'var(--border)'),
                        borderRadius: '10px',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: '400px',
                        transition: 'background-color 120ms ease, border-color 120ms ease'
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
                          const stats = getOfferStats(offer.id, periodBounds.current);
                          const activeCreativesCount = offer.creatives ? offer.creatives.filter(c => c.status === 'ativo').length : 0;
                          
                          let leftBorderColor = 'var(--border2)';
                          if (stats.roas >= 2.5) leftBorderColor = 'var(--green)';
                          else if (stats.roas >= 1.5) leftBorderColor = 'var(--blue)';
                          else if (stats.roas >= 1.0) leftBorderColor = 'var(--yellow)';
                          else if (stats.roas > 0) leftBorderColor = 'var(--red)';

                          const profitGoal = offer.dailyProfitGoal || 1;
                          const progressPercentage = Math.min(100, Math.round((stats.dailyAvgProfit / profitGoal) * 100));

                          const launchDaysText = formatLaunchText(offer.launchDate);

                          return (
                            <div
                              key={offer.id}
                              className="card"
                              draggable
                              onDragStart={(e) => { setDraggedOfferId(offer.id); e.dataTransfer.effectAllowed = 'move'; }}
                              onDragEnd={() => { setDraggedOfferId(null); setDraggedOverStage(null); }}
                              onClick={() => setSelectedOfferIdForDrawer(offer.id)}
                              style={{
                                cursor: draggedOfferId === offer.id ? 'grabbing' : 'pointer',
                                padding: '12px',
                                borderLeft: `3px solid ${leftBorderColor}`,
                                opacity: draggedOfferId === offer.id ? 0.5 : 1
                              }}
                            >
                              {/* Title line + health dot */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                <h4 style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  <span title={
                                    stats.roas >= 2.5 ? 'Saúde excelente' :
                                    stats.roas >= 1.5 ? 'Saúde boa' :
                                    stats.roas >= 1.0 ? 'Atenção' :
                                    stats.roas > 0 ? 'Crítico' : 'Sem dados'
                                  } style={{
                                    width: '8px', height: '8px', borderRadius: '50%',
                                    backgroundColor: leftBorderColor,
                                    flexShrink: 0
                                  }} />
                                  <OfferIcon offer={offer} size={14} color="var(--accent)" />
                                  <span>{offer.name}</span>
                                </h4>
                                <div style={{ display: 'flex', gap: '2px' }}>
                                  <button
                                    className="btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedOfferIdForDrawer(offer.id);
                                      setIsDailyDataDrawerOpen(true);
                                    }}
                                    title="Registrar dia para esta oferta"
                                    style={{ padding: '2px 4px', border: 'none', background: 'transparent', color: 'var(--accent)' }}
                                  >
                                    <Plus size={12} />
                                  </button>
                                  <button
                                    className="btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingOffer(offer);
                                    }}
                                    title="Editar oferta"
                                    style={{ padding: '2px 4px', border: 'none', background: 'transparent', color: 'var(--text3)' }}
                                  >
                                    <Edit size={12} />
                                  </button>
                                </div>
                              </div>

                              {/* Details Type / Status */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text2)', marginBottom: '8px' }}>
                                <span>{offer.type === 'pack_artes' ? 'Pack Artes' : (offer.type || 'outro').toUpperCase()}</span>
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

                              {/* ROAS sparkline (last 7 days) */}
                              {stats.roasTrend.length > 1 && (
                                <div style={{ marginTop: '4px', marginBottom: '4px' }}>
                                  <KpiSparkline values={stats.roasTrend} color={leftBorderColor} />
                                </div>
                              )}

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
                              {(() => {
                                const checklist = offer.checklist || {};
                                const checklistTotal = 7; // entregavel, pagina, checkout, pixel, criativos, campanhas, bumps
                                const checklistDone = Object.values(checklist).filter(Boolean).length;
                                const checklistComplete = checklistDone === checklistTotal;
                                return (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '9px', color: 'var(--text2)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <Calendar size={10} />
                                      <span>{launchDaysText}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <Sparkles size={10} color="var(--yellow)" />
                                      <span>{activeCreativesCount} criativo(s) ativo(s)</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <CheckCircle2 size={10} color={checklistComplete ? 'var(--green)' : 'var(--text3)'} />
                                      <span style={{ color: checklistComplete ? 'var(--green)' : 'var(--text2)' }}>
                                        Setup {checklistDone}/{checklistTotal}{checklistComplete ? ' ✓' : ''}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })()}

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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text2)', fontWeight: '500' }}>Filtrar por Oferta:</span>
                  <select
                    value={kanbanOfferFilter}
                    onChange={(e) => setKanbanOfferFilter(e.target.value)}
                    style={{ width: '200px', padding: '6px 12px' }}
                  >
                    <option value="all">Todas as Ofertas</option>
                    <option value="none">Apenas Gerais (sem oferta)</option>
                    {offers.map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                  {(() => {
                    const overdue = tasks.filter(t => t.column !== 'done' && t.deadline && t.deadline < new Date().toISOString().split('T')[0]).length;
                    const total = tasks.filter(t => t.column !== 'done').length;
                    const high = tasks.filter(t => t.column !== 'done' && t.priority === 'alta').length;
                    return (
                      <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
                        <span className="badge badge-gray">{total} pendentes</span>
                        {high > 0 && <span className="badge badge-red">{high} alta prioridade</span>}
                        {overdue > 0 && <span className="badge badge-yellow">{overdue} atrasada(s)</span>}
                      </div>
                    );
                  })()}
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
                    if (kanbanOfferFilter === 'none') return !t.offerId;
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <select
                    value={ideasSortBy}
                    onChange={(e) => setIdeasSortBy(e.target.value)}
                    style={{ width: '160px', padding: '6px 12px' }}
                  >
                    <option value="ice">Melhor Score (ICE)</option>
                    <option value="potential">Maior Potencial</option>
                    <option value="effort">Menor Esforço</option>
                    <option value="date">Mais Recente</option>
                  </select>
                  <select
                    value={ideasStatusFilter}
                    onChange={(e) => setIdeasStatusFilter(e.target.value)}
                    style={{ width: '140px', padding: '6px 12px' }}
                  >
                    <option value="active">Ativas</option>
                    <option value="archived">Arquivadas</option>
                    <option value="all">Todas</option>
                  </select>
                  <div style={{ position: 'relative', width: '240px' }}>
                    <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                    <input
                      type="text"
                      placeholder="Buscar ideias..."
                      value={ideasSearch}
                      onChange={(e) => setIdeasSearch(e.target.value)}
                      style={{ paddingLeft: '30px', fontSize: '12px', padding: '6px 10px 6px 30px' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'inline-flex', backgroundColor: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '6px', padding: '2px' }}>
                  {[
                    { id: 'grid', label: 'Grade' },
                    { id: 'matrix', label: 'Matriz' }
                  ].map(v => (
                    <button
                      key={v.id}
                      onClick={() => setIdeasView(v.id)}
                      style={{
                        backgroundColor: ideasView === v.id ? 'var(--bg2)' : 'transparent',
                        color: ideasView === v.id ? 'var(--text)' : 'var(--text2)',
                        border: ideasView === v.id ? '1px solid var(--border2)' : '1px solid transparent',
                        borderRadius: '4px', padding: '3px 10px', fontSize: '11px', fontWeight: 500, cursor: 'pointer'
                      }}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {ideasView === 'matrix' ? (
                <IdeasMatrix
                  ideas={ideas.filter(i => {
                    if (ideasStatusFilter === 'active') return !i.archived;
                    if (ideasStatusFilter === 'archived') return !!i.archived;
                    return true;
                  }).filter(i => !ideasSearch.trim() || (i.name + ' ' + (i.description || '') + ' ' + (i.notes || '')).toLowerCase().includes(ideasSearch.toLowerCase()))}
                  onEdit={setEditingIdea}
                  onConvert={handleMoveIdeaToPipeline}
                />
              ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '16px'
              }}>
                {[...ideas]
                  .filter(i => {
                    if (ideasStatusFilter === 'active') return !i.archived;
                    if (ideasStatusFilter === 'archived') return !!i.archived;
                    return true;
                  })
                  .filter(i => !ideasSearch.trim() || (i.name + ' ' + (i.description || '') + ' ' + (i.notes || '')).toLowerCase().includes(ideasSearch.toLowerCase()))
                  .sort((a, b) => {
                    if (ideasSortBy === 'ice') {
                      const ice = (x) => (Number(x.potential || 0) * 2) / Math.max(Number(x.effort || 1), 1);
                      return ice(b) - ice(a);
                    }
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
                              <Lightbulb size={16} color="var(--yellow)" />
                              <span>{idea.name}</span>
                              {idea.archived && <span className="badge badge-gray" style={{ fontSize: '9px' }}>ARQ</span>}
                            </h3>
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                              {(() => {
                                const iceScore = (Number(idea.potential || 0) * 2) / Math.max(Number(idea.effort || 1), 1);
                                return (
                                  <span title="Score ICE: (Potencial × 2) ÷ Esforço" style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    backgroundColor: iceScore >= 3 ? 'var(--green-dim)' : iceScore >= 1.5 ? 'var(--yellow-dim)' : 'var(--red-dim)',
                                    color: iceScore >= 3 ? 'var(--green)' : iceScore >= 1.5 ? 'var(--yellow)' : 'var(--red)',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontFamily: 'monospace'
                                  }}>
                                    {iceScore.toFixed(1)}
                                  </span>
                                );
                              })()}
                              <button
                                className="btn"
                                onClick={() => setIdeas(prev => prev.map(i => i.id === idea.id ? { ...i, archived: !i.archived } : i))}
                                title={idea.archived ? 'Reativar ideia' : 'Arquivar ideia'}
                                style={{ padding: '2px 4px', border: 'none', background: 'transparent', color: 'var(--text3)' }}
                              >
                                <Package size={12} />
                              </button>
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
                              <span style={{ display: 'inline-flex', gap: '2px' }}>
                                {[1, 2, 3, 4, 5].map(v => (
                                  <Star
                                    key={v}
                                    size={12}
                                    color={v <= idea.potential ? 'var(--yellow)' : 'var(--border2)'}
                                    fill={v <= idea.potential ? 'var(--yellow)' : 'none'}
                                  />
                                ))}
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
                {ideas.length === 0 && (
                  <div style={{ gridColumn: '1 / -1', padding: '36px', textAlign: 'center', color: 'var(--text3)', border: '1px dashed var(--border)', borderRadius: '8px' }}>
                    Nenhuma ideia cadastrada. Clique em "Nova Ideia" para começar.
                  </div>
                )}
              </div>
              )}

            </div>
          )}

          {/* ========================================================
              PAGE 4: MÉTRICAS
              ======================================================== */}
          {activePage === 'metrics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              <PeriodBanner periodFilter={periodFilter} periodBounds={periodBounds} suffix="Todos os números abaixo refletem este período." />

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
                    {bestOffer.offer ? <OfferLabel offer={bestOffer.offer} iconSize={13} /> : bestOffer.name}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text3)' }}>{R(bestOffer.profit)}</span>
                </div>
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text2)', fontFamily: 'Space Grotesk' }}>PIOR OFERTA (Lucro)</span>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--red)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {worstOffer.offer ? <OfferLabel offer={worstOffer.offer} iconSize={13} /> : worstOffer.name}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text3)' }}>{R(worstOffer.profit)}</span>
                </div>
              </div>

              {/* Performance Table */}
              <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '14px', color: 'var(--text)' }}>Performance Geral por Oferta</h3>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      const rows = [['Oferta','Estagio','Status','DiasAtiva','Faturamento','Investido','Lucro','ROAS','CPA','Vendas']];
                      offers.forEach(o => {
                        const s = getOfferStats(o.id, periodBounds.current);
                        const d = o.launchDate ? daysSince(o.launchDate) : '';
                        rows.push([
                          o.name, o.stage, o.status, d ?? '',
                          s.revenue.toFixed(2), s.spend.toFixed(2), s.profit.toFixed(2),
                          s.roas.toFixed(2), s.cpa.toFixed(2), s.sales
                        ]);
                      });
                      const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
                      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
                      const link = document.createElement('a');
                      link.href = URL.createObjectURL(blob);
                      link.download = `metricas-${new Date().toISOString().split('T')[0]}.csv`;
                      link.click();
                      URL.revokeObjectURL(link.href);
                      toast.success('CSV de métricas exportado.');
                    }}
                    style={{ fontSize: '11px', padding: '6px 10px' }}
                  >
                    <DownloadIcon size={12} /> Exportar CSV
                  </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg3)', borderBottom: '1px solid var(--border)' }}>
                        {[
                          { key: 'name', label: 'Oferta' },
                          { key: 'stage', label: 'Estágio' },
                          { key: 'days', label: 'Dias Ativa' },
                          { key: 'revenue', label: 'Faturamento' },
                          { key: 'spend', label: 'Investido' },
                          { key: 'profit', label: 'Lucro' },
                          { key: 'roas', label: 'ROAS' },
                          { key: 'cpa', label: 'CPA' },
                          { key: 'trend', label: 'Tendência (7d)', noSort: true }
                        ].map(h => {
                          const isActive = metricsSort.key === h.key;
                          return (
                            <th
                              key={h.key}
                              onClick={() => !h.noSort && setMetricsSort(prev => ({
                                key: h.key,
                                dir: prev.key === h.key && prev.dir === 'desc' ? 'asc' : 'desc'
                              }))}
                              style={{
                                padding: '12px 16px', color: isActive ? 'var(--accent)' : 'var(--text2)', fontWeight: '500',
                                cursor: h.noSort ? 'default' : 'pointer', userSelect: 'none', whiteSpace: 'nowrap'
                              }}
                            >
                              {h.label}
                              {isActive && (metricsSort.dir === 'asc' ? <ArrowUp size={10} style={{ marginLeft: '4px', verticalAlign: 'middle' }} /> : <ArrowDown size={10} style={{ marginLeft: '4px', verticalAlign: 'middle' }} />)}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {[...offers].sort((a, b) => {
                        const sa = getOfferStats(a.id, periodBounds.current);
                        const sb = getOfferStats(b.id, periodBounds.current);
                        const valFor = (o, s) => {
                          switch (metricsSort.key) {
                            case 'name': return o.name.toLowerCase();
                            case 'stage': return o.stage;
                            case 'days': return daysSince(o.launchDate) ?? -1;
                            case 'revenue': return s.revenue;
                            case 'spend': return s.spend;
                            case 'profit': return s.profit;
                            case 'roas': return s.roas;
                            case 'cpa': return s.cpa;
                            default: return 0;
                          }
                        };
                        const va = valFor(a, sa);
                        const vb = valFor(b, sb);
                        const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
                        return metricsSort.dir === 'asc' ? cmp : -cmp;
                      }).map(offer => {
                        const stats = getOfferStats(offer.id, periodBounds.current);

                        let launchDays = '—';
                        if (offer.launchDate) {
                          const d = daysSince(offer.launchDate);
                          launchDays = d === null ? '—' : (d >= 0 ? `${d}d` : `+${Math.abs(d)}d`);
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
                              <OfferLabel offer={offer} iconSize={14} />
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
                      title={<OfferLabel offer={offer} iconSize={14} />}
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

              {/* Tag counters strip */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setDiaryTagFilter('all')}
                  className="btn"
                  style={{
                    padding: '4px 10px', fontSize: '11px',
                    backgroundColor: diaryTagFilter === 'all' ? 'var(--bg3)' : 'transparent',
                    border: '1px solid ' + (diaryTagFilter === 'all' ? 'var(--border2)' : 'var(--border)'),
                    color: 'var(--text2)'
                  }}
                >
                  Todas <span style={{ marginLeft: '4px', color: 'var(--text3)' }}>{diary.length}</span>
                </button>
                {DIARY_TAGS.map(t => {
                  const TagIcon = t.Icon;
                  const count = diary.filter(d => d.tag === t.key).length;
                  const active = diaryTagFilter === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setDiaryTagFilter(active ? 'all' : t.key)}
                      className="btn"
                      style={{
                        padding: '4px 10px', fontSize: '11px',
                        backgroundColor: active ? 'var(--bg3)' : 'transparent',
                        border: '1px solid ' + (active ? 'var(--border2)' : 'var(--border)'),
                        color: active ? 'var(--text)' : 'var(--text2)',
                        display: 'inline-flex', alignItems: 'center', gap: '5px'
                      }}
                    >
                      <TagIcon size={11} />
                      {t.label}
                      <span style={{ color: 'var(--text3)' }}>{count}</span>
                    </button>
                  );
                })}
              </div>

              {/* Toolbar */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr auto auto auto auto',
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

                {/* Filter offer */}
                <select value={diaryOfferFilter} onChange={(e) => setDiaryOfferFilter(e.target.value)}>
                  <option value="all">Todas as Ofertas</option>
                  {offers.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>

                {/* Date range */}
                <input
                  type="date"
                  value={diaryDateFrom}
                  onChange={(e) => setDiaryDateFrom(e.target.value)}
                  title="Data inicial"
                  style={{ width: '140px', fontSize: '12px' }}
                />
                <input
                  type="date"
                  value={diaryDateTo}
                  onChange={(e) => setDiaryDateTo(e.target.value)}
                  title="Data final"
                  style={{ width: '140px', fontSize: '12px' }}
                />

                {/* Auto entries toggle */}
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAutoDiary(v => !v)}
                  style={{ height: '38px', fontSize: '11px', whiteSpace: 'nowrap', padding: '0 10px' }}
                  title={showAutoDiary ? 'Esconder entradas geradas automaticamente' : 'Mostrar entradas automáticas'}
                >
                  {showAutoDiary ? <ToggleRight size={14} color="var(--green)" /> : <ToggleLeft size={14} color="var(--text3)" />}
                  Auto
                </button>

                {/* Export TXT */}
                <button className="btn btn-secondary" onClick={handleExportDiary} style={{ height: '38px', fontSize: '12px' }}>
                  <FileText size={14} /> Exportar
                </button>
              </div>

              {/* Timeline Container */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {diary
                  .filter(dy => {
                    if (!showAutoDiary && dy.isAuto) return false;
                    if (diarySearchQuery && !dy.text.toLowerCase().includes(diarySearchQuery.toLowerCase())) return false;
                    if (diaryTagFilter !== 'all' && dy.tag !== diaryTagFilter) return false;
                    if (diaryOfferFilter !== 'all' && dy.offerId !== diaryOfferFilter) return false;
                    if (diaryDateFrom) {
                      const d = new Date(dy.createdAt).toISOString().split('T')[0];
                      if (d < diaryDateFrom) return false;
                    }
                    if (diaryDateTo) {
                      const d = new Date(dy.createdAt).toISOString().split('T')[0];
                      if (d > diaryDateTo) return false;
                    }
                    return true;
                  })
                  .sort((a, b) => {
                    // Pinned first, then by createdAt desc
                    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                  })
                  .map(dy => {
                    const linkedOffer = offers.find(o => o.id === dy.offerId);
                    
                    const tagMeta = DIARY_TAG_MAP[dy.tag];
                    const TagIcon = tagMeta?.Icon;
                    const tagLabel = tagMeta?.label || dy.tag;

                    return (
                      <div key={dy.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderLeft: dy.pinned ? '3px solid var(--accent)' : undefined }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {dy.pinned && <Pin size={11} color="var(--accent)" />}
                            <Clock size={12} />
                            {new Date(dy.createdAt).toLocaleString('pt-BR')}
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {dy.isAuto && (
                              <span className="badge badge-blue" style={{ fontSize: '9px' }} title="Entrada criada automaticamente">
                                AUTO
                              </span>
                            )}
                            <span className="badge badge-gray" style={{ fontSize: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              {TagIcon && <TagIcon size={10} />}
                              {tagLabel}
                            </span>
                            <button
                              className="btn"
                              onClick={() => setDiary(prev => prev.map(d => d.id === dy.id ? { ...d, pinned: !d.pinned } : d))}
                              title={dy.pinned ? 'Desafixar' : 'Fixar no topo'}
                              style={{ padding: '2px 4px', border: 'none', background: 'transparent', color: dy.pinned ? 'var(--accent)' : 'var(--text3)' }}
                            >
                              <Pin size={12} />
                            </button>
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
                            <OfferIcon offer={linkedOffer} size={11} color="var(--accent)" />
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
        const stats = getOfferStats(activeOfferForDrawer.id, periodBounds.current);
        const statsAllTime = getOfferStats(activeOfferForDrawer.id);
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
                    <OfferIcon offer={activeOfferForDrawer} size={22} color="var(--accent)" />
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
                    const isPausingNow = activeOfferForDrawer.status === 'ativa';
                    if (isPausingNow) {
                      // remember where we were so we can come back to the same stage
                      handleUpdateOffer({
                        ...activeOfferForDrawer,
                        status: 'pausada',
                        previousStage: activeOfferForDrawer.stage !== 'pausada' && activeOfferForDrawer.stage !== 'morta'
                          ? activeOfferForDrawer.stage
                          : (activeOfferForDrawer.previousStage || 'testando'),
                        stage: 'pausada'
                      });
                    } else {
                      const restoreStage = activeOfferForDrawer.previousStage || 'testando';
                      handleUpdateOffer({
                        ...activeOfferForDrawer,
                        status: 'ativa',
                        stage: restoreStage,
                        previousStage: null
                      });
                    }
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>
                  <h3 style={{ fontSize: '12px', color: 'var(--text3)', textTransform: 'uppercase', margin: 0 }}>Métricas</h3>
                  <span style={{ fontSize: '10px', color: 'var(--accent)' }}>{periodLabel(periodFilter, periodBounds)}</span>
                </div>
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
                  <div style={{ backgroundColor: 'var(--bg3)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '9px', color: 'var(--text2)' }}>Vendas / Bumps</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{stats.sales} / {stats.bumps}</div>
                  </div>
                  <div style={{ backgroundColor: 'var(--bg3)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '9px', color: 'var(--text2)' }}>Ticket Médio</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{stats.arpu > 0 ? R(stats.arpu) : '—'}</div>
                  </div>
                </div>
                {periodFilter !== 'all' && (
                  <div style={{ marginTop: '8px', fontSize: '10px', color: 'var(--text3)', textAlign: 'right' }}>
                    Vida toda: {R(statsAllTime.revenue)} fat · {R(statsAllTime.profit)} lucro · {statsAllTime.roas > 0 ? Roas(statsAllTime.roas) + 'x ROAS' : 'sem ROAS'}
                  </div>
                )}
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
                    onClick={() => setCreativeModalState({ offerId: activeOfferForDrawer.id, creative: null })}
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
                              onClick={() => setCreativeModalState({ offerId: activeOfferForDrawer.id, creative: c })}
                              title="Editar"
                              style={{ border: 'none', background: 'transparent', color: 'var(--text3)', cursor: 'pointer' }}
                            >
                              <Edit size={10} />
                            </button>

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
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '12px', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>Últimos 10 Dias Registrados</h3>
                {records.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {records.slice(0, 10).map(r => {
                      const dayProfit = r.revenue - r.adSpend;
                      const dayRoas = r.adSpend > 0 ? r.revenue / r.adSpend : 0;
                      return (
                        <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderBottom: '1px solid var(--border)', fontSize: '11px', gap: '8px' }}>
                          <span style={{ minWidth: '70px' }}>{new Date(r.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                          <span style={{ color: 'var(--text2)' }}>Fat: {R(r.revenue)}</span>
                          <span style={{ color: dayProfit >= 0 ? 'var(--green)' : 'var(--red)' }}>Lucro: {R(dayProfit)}</span>
                          <span style={{ fontWeight: 'bold' }}>ROAS: {dayRoas > 0 ? Roas(dayRoas) : '—'}</span>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={() => setEditingDailyRecord(r)} title="Editar" style={{ border: 'none', background: 'transparent', color: 'var(--text3)', cursor: 'pointer', padding: 0 }}>
                              <Edit size={11} />
                            </button>
                            <button onClick={() => handleDeleteDailyRecord(r.id)} title="Deletar" style={{ border: 'none', background: 'transparent', color: 'var(--red)', cursor: 'pointer', padding: 0 }}>
                              <Trash2 size={11} />
                            </button>
                          </div>
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

              {/* Section: Tarefas vinculadas */}
              {(() => {
                const linkedTasks = tasks.filter(t => t.offerId === activeOfferForDrawer.id);
                return (
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>
                      <h3 style={{ fontSize: '12px', color: 'var(--text3)', textTransform: 'uppercase', margin: 0 }}>Tarefas vinculadas ({linkedTasks.length})</h3>
                      <button className="btn" onClick={() => { setSelectedOfferIdForDrawer(null); setKanbanOfferFilter(activeOfferForDrawer.id); setActivePage('kanban'); }} style={{ fontSize: '10px', padding: 0, border: 'none', background: 'transparent', color: 'var(--accent)' }}>
                        Ver no Kanban <ArrowUpRight size={11} />
                      </button>
                    </div>
                    {linkedTasks.length === 0 ? (
                      <span style={{ fontSize: '11px', color: 'var(--text3)', display: 'block', textAlign: 'center', padding: '8px' }}>Nenhuma tarefa para esta oferta.</span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {linkedTasks.slice(0, 6).map(t => (
                          <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderBottom: '1px solid var(--border)', fontSize: '11px', cursor: 'pointer' }} onClick={() => setEditingTask(t)}>
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '8px' }}>{t.title}</span>
                            <span className="badge badge-gray" style={{ fontSize: '9px' }}>{t.column}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Section: Diário vinculado */}
              {(() => {
                const linkedDiary = diary.filter(d => d.offerId === activeOfferForDrawer.id);
                return (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>
                      <h3 style={{ fontSize: '12px', color: 'var(--text3)', textTransform: 'uppercase', margin: 0 }}>Diário vinculado ({linkedDiary.length})</h3>
                      <button className="btn" onClick={() => { setSelectedOfferIdForDrawer(null); setDiaryOfferFilter(activeOfferForDrawer.id); setActivePage('diary'); }} style={{ fontSize: '10px', padding: 0, border: 'none', background: 'transparent', color: 'var(--accent)' }}>
                        Ver no Diário <ArrowUpRight size={11} />
                      </button>
                    </div>
                    {linkedDiary.length === 0 ? (
                      <span style={{ fontSize: '11px', color: 'var(--text3)', display: 'block', textAlign: 'center', padding: '8px' }}>Nenhuma entrada de diário para esta oferta.</span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {linkedDiary.slice(0, 4).map(d => (
                          <div key={d.id} style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)', fontSize: '11px', cursor: 'pointer' }} onClick={() => setEditingDiary(d)}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text3)', fontSize: '10px', marginBottom: '2px' }}>
                              <span>{new Date(d.createdAt).toLocaleDateString('pt-BR')}</span>
                              <span>{d.isAuto ? 'AUTO' : (d.tag || '').toUpperCase()}</span>
                            </div>
                            <span style={{ color: 'var(--text)' }}>{d.text.substring(0, 90)}{d.text.length > 90 ? '…' : ''}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

            </div>
          </>
        );
      })()}

      {/* ========================================================
          MODALS & DIALOGS
          ======================================================== */}
      {isNewOfferModalOpen && (
        <OfferModal
          prefill={offerModalPrefill}
          prefilledStage={typeof isNewOfferModalOpen === 'object' ? isNewOfferModalOpen.stage : undefined}
          onClose={() => { setIsNewOfferModalOpen(false); setOfferModalPrefill(null); }}
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
          initialOfferId={selectedOfferIdForDrawer}
          onClose={() => setIsDailyDataDrawerOpen(false)}
          onSubmit={handleLogDailyData}
        />
      )}

      {editingDailyRecord && (
        <DailyDataModal
          offers={offers}
          record={editingDailyRecord}
          onClose={() => setEditingDailyRecord(null)}
          onSubmit={handleUpdateDailyRecord}
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

      {creativeModalState && (
        <CreativeModal
          creative={creativeModalState.creative}
          onClose={() => setCreativeModalState(null)}
          onSubmit={(payload) => handleSaveCreative(creativeModalState.offerId, payload)}
        />
      )}

      {isGoalModalOpen && (
        <GoalModal
          initialValue={globalDailyGoal}
          onClose={() => setIsGoalModalOpen(false)}
          onSubmit={(v) => { setGlobalDailyGoal(Number(v) || 0); setIsGoalModalOpen(false); toast.success(`Meta diária atualizada para ${R(Number(v) || 0)}.`); }}
        />
      )}

      {isCommandPaletteOpen && (
        <CommandPalette
          offers={offers}
          tasks={tasks}
          ideas={ideas}
          onClose={() => setIsCommandPaletteOpen(false)}
          onSelectPage={(page) => { setActivePage(page); setIsCommandPaletteOpen(false); }}
          onSelectOffer={(id) => { setSelectedOfferIdForDrawer(id); setIsCommandPaletteOpen(false); }}
          onAction={(act) => {
            setIsCommandPaletteOpen(false);
            if (act === 'new-offer') setIsNewOfferModalOpen(true);
            else if (act === 'new-task') setIsNewTaskModalOpen(true);
            else if (act === 'new-idea') setIsNewIdeaModalOpen(true);
            else if (act === 'new-diary') setIsNewDiaryModalOpen(true);
            else if (act === 'log-day') setIsDailyDataDrawerOpen(true);
            else if (act === 'toggle-theme') setTheme(prev => prev === 'light' ? 'dark' : 'light');
          }}
        />
      )}

      <ToastHost />
    </div>
  );
}

// ==========================================
// SUBCOMPONENTS: MODALS & FORMS
// ==========================================
function OfferModal({ offer, prefill, prefilledStage, onClose, onSubmit }) {
  const isEdit = !!offer;

  const [formData, setFormData] = useState({
    id: offer?.id || '',
    name: offer?.name || prefill?.name || '',
    icon: offer?.icon || (offer?.emoji ? EMOJI_TO_ICON_KEY[offer.emoji] : null) || (prefill?.icon) || 'grape',
    emoji: offer?.emoji || null,
    type: offer?.type || prefill?.type || 'pack_artes',
    niche: offer?.niche || prefill?.niche || '',
    stage: offer?.stage || prefill?.stage || prefilledStage || 'ideia',
    pageUrl: offer?.pageUrl || '',
    checkoutBasicUrl: offer?.checkoutBasicUrl || '',
    checkoutCompleteUrl: offer?.checkoutCompleteUrl || '',
    dailyProfitGoal: offer?.dailyProfitGoal || prefill?.dailyProfitGoal || 100,
    launchDate: offer?.launchDate || '',
    notes: offer?.notes || prefill?.notes || '',
    status: offer?.status || 'ativa',
    previousStage: offer?.previousStage || null,
    checklist: offer?.checklist || {},
    creatives: offer?.creatives || [],
    fromIdeaId: prefill?.fromIdeaId
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSubmit(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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
            <label>Ícone da Oferta</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', backgroundColor: 'var(--bg3)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
              {ICON_OPTIONS.map(({ key, label, Icon }) => {
                const selected = formData.icon === key;
                return (
                  <button
                    key={key}
                    type="button"
                    title={label}
                    onClick={() => setFormData({ ...formData, icon: key })}
                    style={{
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '6px',
                      border: selected ? '1px solid var(--accent)' : '1px solid transparent',
                      backgroundColor: selected ? 'var(--bg2)' : 'transparent',
                      color: selected ? 'var(--accent)' : 'var(--text2)',
                      cursor: 'pointer',
                      transition: 'all 120ms ease'
                    }}
                  >
                    <Icon size={18} />
                  </button>
                );
              })}
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

function DailyDataModal({ offers, record, initialOfferId, onClose, onSubmit }) {
  const isEdit = !!record;
  const [formData, setFormData] = useState({
    id: record?.id || '',
    offerId: record?.offerId || initialOfferId || offers[0]?.id || '',
    date: record?.date || new Date().toISOString().split('T')[0],
    revenue: record?.revenue?.toString() ?? '',
    adSpend: record?.adSpend?.toString() ?? '',
    sales: record?.sales?.toString() ?? '',
    bumps: record?.bumps?.toString() ?? '',
    notes: record?.notes || ''
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px' }}>{isEdit ? 'Editar Registro Diário' : 'Registrar Dados Diários'}</h2>
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
                <option key={o.id} value={o.id}>{o.name} ({o.status})</option>
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
              {isEdit ? 'Salvar Alterações' : 'Registrar Dia'}
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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
              {TASK_TYPES.map(t => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
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
                <option key={o.id} value={o.id}>{o.name}</option>
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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
                <option value="1">1/5 — Muito Baixo</option>
                <option value="2">2/5 — Baixo</option>
                <option value="3">3/5 — Médio</option>
                <option value="4">4/5 — Alto</option>
                <option value="5">5/5 — Muito Alto</option>
              </select>
            </div>

            <div className="form-group">
              <label>Esforço Estimado (1-5)</label>
              <select 
                value={formData.effort} 
                onChange={e => setFormData({ ...formData, effort: Number(e.target.value) })}
              >
                <option value="1">1/5 — Muito Baixo</option>
                <option value="2">2/5 — Baixo</option>
                <option value="3">3/5 — Médio</option>
                <option value="4">4/5 — Alto</option>
                <option value="5">5/5 — Muito Alto</option>
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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
              {DIARY_TAGS.map(t => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
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
                <option key={o.id} value={o.id}>{o.name}</option>
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
// IDEAS MATRIX — Potencial x Esforço scatter
// ==========================================
function IdeasMatrix({ ideas, onEdit, onConvert }) {
  // Group ideas by exact (potential, effort) so overlapping dots stack
  const cellSize = 90;
  const grid = {};
  for (const i of ideas) {
    const key = `${i.potential || 3}-${i.effort || 3}`;
    if (!grid[key]) grid[key] = [];
    grid[key].push(i);
  }

  return (
    <div className="card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '14px' }}>Matriz Potencial × Esforço</h3>
        <span style={{ fontSize: '11px', color: 'var(--text3)' }}>{ideas.length} ideia(s)</span>
      </div>
      <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '24px repeat(5, 1fr) 24px', gridTemplateRows: '24px repeat(5, 1fr) 24px', gap: 0 }}>
        {/* Top axis label */}
        <div style={{ gridColumn: '2 / span 5', gridRow: '1', textAlign: 'center', fontSize: '10px', color: 'var(--text3)' }}>← Menor Esforço · Maior Esforço →</div>
        {/* Left axis label */}
        <div style={{ gridColumn: '1', gridRow: '2 / span 5', display: 'flex', alignItems: 'center', justifyContent: 'center', writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: '10px', color: 'var(--text3)' }}>← Menor Potencial · Maior Potencial →</div>

        {[5, 4, 3, 2, 1].map((potential, rowIdx) =>
          [1, 2, 3, 4, 5].map((effort, colIdx) => {
            const cellKey = `${potential}-${effort}`;
            const items = grid[cellKey] || [];
            const isHighValue = potential >= 4 && effort <= 2; // top-left = best
            const isLowValue = potential <= 2 && effort >= 4; // bottom-right = avoid
            return (
              <div key={cellKey}
                style={{
                  gridColumn: colIdx + 2,
                  gridRow: rowIdx + 2,
                  minHeight: cellSize,
                  border: '1px dashed var(--border)',
                  backgroundColor: isHighValue ? 'rgba(16,185,129,0.06)' : isLowValue ? 'rgba(239,68,68,0.04)' : 'transparent',
                  padding: '4px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px',
                  alignContent: 'flex-start'
                }}>
                {items.map(i => (
                  <button
                    key={i.id}
                    onClick={() => onEdit(i)}
                    title={`${i.name} — clique pra editar`}
                    style={{
                      backgroundColor: 'var(--accent)',
                      color: 'white',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '10px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {i.name}
                  </button>
                ))}
              </div>
            );
          })
        )}
      </div>
      <div style={{ marginTop: '12px', display: 'flex', gap: '16px', fontSize: '10px', color: 'var(--text3)' }}>
        <span><span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: 'rgba(16,185,129,0.4)', borderRadius: '2px', marginRight: '4px', verticalAlign: 'middle' }} />Zona de ouro (alto potencial, baixo esforço)</span>
        <span><span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: 'rgba(239,68,68,0.4)', borderRadius: '2px', marginRight: '4px', verticalAlign: 'middle' }} />Zona de evitar</span>
      </div>
    </div>
  );
}

// ==========================================
// KPI CARD — value + % delta + sparkline
// ==========================================
function KpiCard({ label, value, delta, deltaInverse, icon: Ico, color = 'var(--text)', trend }) {
  const hasTrend = Array.isArray(trend) && trend.length > 1;
  const hasDelta = delta !== null && delta !== undefined && Number.isFinite(delta);
  // For deltaInverse (e.g., spend), positive change is bad
  const goodChange = hasDelta ? (deltaInverse ? delta < 0 : delta > 0) : null;
  const deltaColor = !hasDelta ? 'var(--text3)' : (goodChange ? 'var(--green)' : delta === 0 ? 'var(--text3)' : 'var(--red)');
  const DeltaIcon = !hasDelta ? null : (delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : null);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text2)' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em' }}>{label}</span>
        {Ico && <Ico size={13} color={color} />}
      </div>
      <span style={{ fontSize: '22px', fontWeight: 'bold', color, fontFamily: "'Space Grotesk', sans-serif" }}>{value}</span>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '8px', minHeight: '20px' }}>
        {hasDelta ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '11px', fontWeight: 600, color: deltaColor }}>
            {DeltaIcon && <DeltaIcon size={10} />}
            {Math.abs(delta).toFixed(1)}%
            <span style={{ color: 'var(--text3)', fontWeight: 400, marginLeft: '4px' }}>vs anterior</span>
          </span>
        ) : <span />}
        {hasTrend && <KpiSparkline values={trend} color={color} />}
      </div>
    </div>
  );
}

function KpiSparkline({ values, color }) {
  const w = 70, h = 22;
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / Math.max(values.length - 1, 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={pts} opacity="0.7" />
    </svg>
  );
}

// Human label for the active period
const periodLabel = (periodFilter, periodBounds) => {
  if (periodFilter === 'today') return 'Hoje';
  if (periodFilter === 'all') return 'Todo o período';
  const fmt = (s) => s ? new Date(s + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '';
  const r = periodBounds.current;
  const labels = {
    '7d': 'Últimos 7 dias',
    '30d': 'Últimos 30 dias',
    week: 'Esta semana',
    month: 'Mês atual',
    lastMonth: 'Mês passado'
  };
  const label = labels[periodFilter] || 'Período';
  return r ? `${label} (${fmt(r.from)} – ${fmt(r.to)})` : label;
};

// Thin info banner showing which period is active
function PeriodBanner({ periodFilter, periodBounds, suffix }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      fontSize: '11px', color: 'var(--text3)',
      padding: '6px 10px', backgroundColor: 'var(--bg3)',
      borderRadius: '6px', border: '1px solid var(--border)'
    }}>
      <Calendar size={12} color="var(--accent)" />
      <span><strong style={{ color: 'var(--text2)' }}>{periodLabel(periodFilter, periodBounds)}</strong>{suffix ? ` · ${suffix}` : ''}</span>
    </div>
  );
}

// ==========================================
// PERIOD PICKER — segmented control for date filtering
// ==========================================
function PeriodPicker({ value, onChange }) {
  const options = [
    { id: 'today', label: 'Hoje', hint: 'apenas hoje' },
    { id: '7d', label: '7d', hint: 'últimos 7 dias' },
    { id: '30d', label: '30d', hint: 'últimos 30 dias' },
    { id: 'week', label: 'Semana', hint: 'esta semana (seg→dom)' },
    { id: 'month', label: 'Mês', hint: 'mês atual completo' },
    { id: 'lastMonth', label: 'Mês passado', hint: 'mês anterior completo' },
    { id: 'all', label: 'Tudo', hint: 'sem filtro' }
  ];
  return (
    <div style={{
      display: 'inline-flex',
      backgroundColor: 'var(--bg3)',
      border: '1px solid var(--border)',
      borderRadius: '6px',
      padding: '2px',
      flexWrap: 'wrap'
    }}>
      {options.map(opt => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            title={opt.hint}
            style={{
              backgroundColor: active ? 'var(--bg2)' : 'transparent',
              color: active ? 'var(--text)' : 'var(--text2)',
              border: active ? '1px solid var(--border2)' : '1px solid transparent',
              borderRadius: '4px',
              padding: '3px 10px',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 120ms ease',
              whiteSpace: 'nowrap'
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ==========================================
// COMMAND PALETTE (Cmd+K / Ctrl+K) — fast nav + actions
// ==========================================
function CommandPalette({ offers, tasks, ideas, onClose, onSelectPage, onSelectOffer, onAction }) {
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const allItems = useMemo(() => {
    const pages = [
      { kind: 'page', id: 'dashboard', label: 'Dashboard', hint: 'visão geral', Icon: LayoutGrid },
      { kind: 'page', id: 'pipeline', label: 'Pipeline', hint: 'ofertas', Icon: Layers },
      { kind: 'page', id: 'kanban', label: 'Kanban', hint: 'tarefas', Icon: KanbanSquare },
      { kind: 'page', id: 'ideas', label: 'Ideias', hint: 'banco de ideias', Icon: Lightbulb },
      { kind: 'page', id: 'metrics', label: 'Métricas', hint: 'performance', Icon: TrendingUp },
      { kind: 'page', id: 'diary', label: 'Diário', hint: 'log operacional', Icon: BookOpen },
      { kind: 'page', id: 'utils', label: 'Calculadora & UTM', hint: 'utilitários', Icon: Calculator },
    ];
    const actions = [
      { kind: 'action', id: 'new-offer', label: 'Nova oferta', hint: 'criar produto', Icon: Plus },
      { kind: 'action', id: 'log-day', label: 'Registrar dia', hint: 'lançar faturamento', Icon: DollarSign },
      { kind: 'action', id: 'new-task', label: 'Nova tarefa', hint: 'kanban', Icon: KanbanSquare },
      { kind: 'action', id: 'new-idea', label: 'Nova ideia', hint: 'banco', Icon: Lightbulb },
      { kind: 'action', id: 'new-diary', label: 'Nova entrada de diário', hint: 'anotar', Icon: BookOpen },
      { kind: 'action', id: 'toggle-theme', label: 'Trocar tema (claro/escuro)', hint: 'aparência', Icon: Sun },
    ];
    const offerItems = (offers || []).map(o => ({
      kind: 'offer', id: o.id, label: o.name, hint: `oferta · ${o.stage}`, Icon: null, offer: o
    }));
    return [...actions, ...pages, ...offerItems];
  }, [offers]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allItems;
    const q = query.toLowerCase();
    return allItems.filter(item =>
      item.label.toLowerCase().includes(q) || (item.hint || '').toLowerCase().includes(q)
    );
  }, [query, allItems]);

  useEffect(() => { setHighlight(0); }, [query]);

  const choose = (item) => {
    if (!item) return;
    if (item.kind === 'page') onSelectPage(item.id);
    else if (item.kind === 'action') onAction(item.id);
    else if (item.kind === 'offer') onSelectOffer(item.id);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight(h => Math.min(filtered.length - 1, h + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => Math.max(0, h - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(filtered[highlight]);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 220, alignItems: 'flex-start', paddingTop: '12vh' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        backgroundColor: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '560px',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <Search size={16} color="var(--text3)" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar páginas, ofertas, ou digite uma ação..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            style={{
              flex: 1, border: 'none', boxShadow: 'none', background: 'transparent',
              fontSize: '14px', padding: 0
            }}
            autoComplete="off"
            spellCheck={false}
          />
          <span style={{ fontSize: '10px', color: 'var(--text3)', backgroundColor: 'var(--bg3)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>ESC</span>
        </div>

        <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
          {filtered.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
              Nada encontrado para "{query}".
            </div>
          )}
          {filtered.map((item, idx) => {
            const Ico = item.Icon;
            const isHi = idx === highlight;
            return (
              <button
                key={`${item.kind}-${item.id}`}
                onMouseEnter={() => setHighlight(idx)}
                onClick={() => choose(item)}
                style={{
                  width: '100%',
                  border: 'none',
                  background: isHi ? 'var(--bg3)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderLeft: isHi ? '3px solid var(--accent)' : '3px solid transparent'
                }}
              >
                {item.kind === 'offer' && item.offer ? (
                  <OfferIcon offer={item.offer} size={15} color="var(--accent)" />
                ) : Ico ? (
                  <Ico size={15} color="var(--text2)" />
                ) : null}
                <span style={{ flex: 1, fontSize: '13px', color: 'var(--text)' }}>{item.label}</span>
                <span style={{ fontSize: '11px', color: 'var(--text3)' }}>{item.hint}</span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', borderTop: '1px solid var(--border)', fontSize: '10px', color: 'var(--text3)' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <span><kbd style={kbdStyle}>↑</kbd> <kbd style={kbdStyle}>↓</kbd> navegar</span>
            <span><kbd style={kbdStyle}>↵</kbd> selecionar</span>
          </div>
          <span>{filtered.length} resultado(s)</span>
        </div>
      </div>
    </div>
  );
}

const kbdStyle = {
  display: 'inline-block',
  backgroundColor: 'var(--bg3)',
  color: 'var(--text2)',
  fontFamily: 'monospace',
  padding: '1px 5px',
  borderRadius: '3px',
  border: '1px solid var(--border)',
  fontSize: '10px',
  marginRight: '2px'
};

// ==========================================
// CREATIVE MODAL (replaces window.prompt chain)
// ==========================================
function CreativeModal({ creative, onClose, onSubmit }) {
  const isEdit = !!creative;
  const [formData, setFormData] = useState({
    id: creative?.id || '',
    name: creative?.name || '',
    roas: creative?.roas?.toString() ?? '',
    notes: creative?.notes || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSubmit(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px' }}>{isEdit ? 'Editar Criativo' : 'Novo Criativo'}</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'var(--text2)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group">
            <label>Nome do Criativo</label>
            <input
              type="text"
              required
              autoFocus
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: video_01_copo_recheado"
            />
          </div>

          <div className="form-group">
            <label>ROAS Estimado</label>
            <input
              type="number"
              step="0.01"
              value={formData.roas}
              onChange={e => setFormData({ ...formData, roas: e.target.value })}
              placeholder="Ex: 2.5"
            />
          </div>

          <div className="form-group">
            <label>Observações</label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Hook, ângulo, copy..."
              style={{ minHeight: '60px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              Salvar Criativo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// GOAL MODAL (editable global daily goal)
// ==========================================
function GoalModal({ initialValue, onClose, onSubmit }) {
  const [value, setValue] = useState(initialValue?.toString() ?? '1000');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(value);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '380px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px' }}>Meta Diária Global</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'var(--text2)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '16px', lineHeight: '1.4' }}>
          Lucro diário desejado para toda a operação. Usado no medidor de progresso do cabeçalho.
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group">
            <label>Meta de Lucro / Dia (R$)</label>
            <input
              type="number"
              min="0"
              step="1"
              required
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              Salvar Meta
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
// Brazilian payment gateway presets (approx. — confirme com sua conta)
const GATEWAY_PRESETS = [
  { id: 'kiwify',      label: 'Kiwify',                percent: 9.9, fixed: 1.0 },
  { id: 'hotmart',     label: 'Hotmart',               percent: 9.9, fixed: 1.0 },
  { id: 'cakto',       label: 'Cakto',                 percent: 8.0, fixed: 0.95 },
  { id: 'eduzz',       label: 'Eduzz',                 percent: 8.9, fixed: 1.49 },
  { id: 'perfectpay',  label: 'PerfectPay',            percent: 6.99, fixed: 1.20 },
  { id: 'pepper',      label: 'Pepper',                percent: 7.99, fixed: 1.00 },
  { id: 'lowify',      label: 'Lowify',                percent: 7.0, fixed: 1.0 },
  { id: 'yampi',       label: 'Yampi',                 percent: 4.99, fixed: 0.50 },
  { id: 'vega',        label: 'Vega Checkout',         percent: 5.99, fixed: 0.79 },
  { id: 'pagarme',     label: 'Pagar.me',              percent: 4.99, fixed: 0.39 },
  { id: 'stripe',      label: 'Stripe',                percent: 3.99, fixed: 0.39 },
  { id: 'mp',          label: 'Mercado Pago',          percent: 4.99, fixed: 0.49 },
  { id: 'custom',      label: 'Personalizado',         percent: null, fixed: null }
];

function TrafficCalculator() {
  const loadSaved = () => {
    try {
      const raw = localStorage.getItem('ops_traffic_calc');
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return null;
  };
  const saved = loadSaved();

  const [price, setPrice] = useState(saved?.price ?? 97);
  const [gatewayPreset, setGatewayPreset] = useState(saved?.gatewayPreset ?? 'kiwify');
  const [gatewayPercent, setGatewayPercent] = useState(saved?.gatewayPercent ?? 9.9);
  const [gatewayFixed, setGatewayFixed] = useState(saved?.gatewayFixed ?? 1.0);
  const [targetMargin, setTargetMargin] = useState(saved?.targetMargin ?? 30);
  const [cogs, setCogs] = useState(saved?.cogs ?? 0);

  const applyPreset = (presetId) => {
    setGatewayPreset(presetId);
    const p = GATEWAY_PRESETS.find(g => g.id === presetId);
    if (p && p.percent !== null) {
      setGatewayPercent(p.percent);
      setGatewayFixed(p.fixed);
    }
  };

  useEffect(() => {
    localStorage.setItem('ops_traffic_calc', JSON.stringify({ price, gatewayPreset, gatewayPercent, gatewayFixed, targetMargin, cogs }));
  }, [price, gatewayPreset, gatewayPercent, gatewayFixed, targetMargin, cogs]);

  // Computations
  const gatewayFee = (price * (gatewayPercent / 100)) + gatewayFixed;
  const netRevenue = price - gatewayFee - cogs;

  const breakevenCpa = Math.max(0, netRevenue);
  const breakevenRoas = breakevenCpa > 0 ? price / breakevenCpa : 0;

  const targetProfitAmount = price * (targetMargin / 100);
  const targetCpaRaw = netRevenue - targetProfitAmount;
  const targetCpa = Math.max(0, targetCpaRaw);
  const targetRoas = targetCpa > 0 ? price / targetCpa : 0;
  const targetUnreachable = targetCpaRaw <= 0;

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

      <div className="form-group" style={{ margin: 0 }}>
        <label>Gateway de Pagamento</label>
        <select value={gatewayPreset} onChange={e => applyPreset(e.target.value)}>
          {GATEWAY_PRESETS.map(p => (
            <option key={p.id} value={p.id}>
              {p.label}{p.percent !== null ? ` — ${p.percent}% + R$${p.fixed?.toFixed(2)}` : ''}
            </option>
          ))}
        </select>
        <p style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '4px' }}>
          Selecione seu gateway pra aplicar as taxas oficiais (você ainda pode ajustar manualmente abaixo).
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
        <div className="form-group" style={{ margin: '0' }}>
          <label>Taxa Gateway (%)</label>
          <input
            type="number"
            step="0.01"
            value={gatewayPercent}
            onChange={e => { setGatewayPercent(Math.max(0, Number(e.target.value))); setGatewayPreset('custom'); }}
          />
        </div>
        <div className="form-group" style={{ margin: '0' }}>
          <label>Gateway Fixo (R$)</label>
          <input
            type="number"
            step="0.01"
            value={gatewayFixed}
            onChange={e => { setGatewayFixed(Math.max(0, Number(e.target.value))); setGatewayPreset('custom'); }}
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
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: targetUnreachable ? 'var(--red)' : 'var(--green)' }}>
              {targetUnreachable ? 'Inviável' : R(targetCpa)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text2)' }}>ROAS Alvo (Meta):</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: targetUnreachable ? 'var(--red)' : 'var(--accent)' }}>
              {targetUnreachable ? '—' : `${Roas(targetRoas)}x`}
            </div>
          </div>
        </div>

      </div>

      <div style={{ fontSize: '11px', color: 'var(--text3)', borderLeft: `3px solid ${targetUnreachable ? 'var(--red)' : 'var(--accent)'}`, paddingLeft: '10px', lineHeight: '1.4' }}>
        {targetUnreachable ? (
          <>
            <strong>Atenção:</strong> a margem alvo de {targetMargin}% é maior que a margem máxima possível ({Pct((netRevenue / price) * 100)}). Reduza a margem alvo, suba o preço ou reduza o COGS / taxa.
          </>
        ) : (
          <>
            <strong>Recomendação:</strong> Configure seu conjunto de anúncios para otimizar com CPA menor que <strong>{R(targetCpa)}</strong>. Caso seu CPA ultrapasse <strong>{R(breakevenCpa)}</strong>, você estará perdendo dinheiro.
          </>
        )}
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
  const [history, setHistory] = useState(() => {
    try {
      const raw = localStorage.getItem('ops_utm_history');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('ops_utm_history', JSON.stringify(history.slice(0, 30)));
  }, [history]);

  // Auto set campaign when offer is chosen
  const handleOfferSelect = (offerId) => {
    const offer = offers.find(o => o.id === offerId);
    if (offer) {
      setBaseUrl(offer.pageUrl || offer.checkoutBasicUrl || '');
      setCampaign(offer.name.toLowerCase().replace(/\s+/g, '_'));
    }
  };

  // Source presets — pra acelerar entrada
  const SOURCE_PRESETS = [
    { source: 'facebook', medium: 'cpc', label: 'Facebook Ads' },
    { source: 'instagram', medium: 'cpc', label: 'Instagram Ads' },
    { source: 'google', medium: 'cpc', label: 'Google Ads' },
    { source: 'tiktok', medium: 'cpc', label: 'TikTok Ads' },
    { source: 'kwai', medium: 'cpc', label: 'Kwai Ads' },
    { source: 'youtube', medium: 'cpc', label: 'YouTube Ads' },
    { source: 'whatsapp', medium: 'message', label: 'WhatsApp' },
    { source: 'organic', medium: 'social', label: 'Orgânico' },
    { source: 'email', medium: 'newsletter', label: 'Email' }
  ];

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
    // Save to history
    setHistory(prev => {
      const exists = prev.find(h => h.url === finalGeneratedUrl);
      if (exists) return prev;
      return [{ url: finalGeneratedUrl, source, medium, campaign, content, baseUrl, createdAt: new Date().toISOString() }, ...prev].slice(0, 30);
    });
    toast.success('Link copiado e salvo no histórico.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      
      <div className="form-group" style={{ margin: '0' }}>
        <label>Importar URL de Oferta Existente</label>
        <select onChange={e => handleOfferSelect(e.target.value)} style={{ padding: '8px' }}>
          <option value="">Selecione para importar...</option>
          {offers.map(o => (
            <option key={o.id} value={o.id}>{o.name}</option>
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

      <div className="form-group" style={{ margin: '0' }}>
        <label>Atalho de Origem</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {SOURCE_PRESETS.map(p => {
            const active = source === p.source && medium === p.medium;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => { setSource(p.source); setMedium(p.medium); }}
                style={{
                  fontSize: '11px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
                  backgroundColor: active ? 'var(--bg3)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--text2)',
                  cursor: 'pointer'
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
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

      {history.length > 0 && (
        <div style={{ marginTop: '8px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)' }}>HISTÓRICO ({history.length})</span>
            <button
              onClick={() => { setHistory([]); toast.info('Histórico de UTMs limpo.'); }}
              style={{ background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '11px' }}
            >
              Limpar
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
            {history.map((h, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', backgroundColor: 'var(--bg3)', borderRadius: '4px', fontSize: '10px' }}>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }} title={h.url}>{h.url}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(h.url); toast.success('Link copiado.'); }}
                  title="Copiar"
                  style={{ background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: '2px' }}
                >
                  <Copy size={11} />
                </button>
                <button
                  onClick={() => setHistory(prev => prev.filter((_, i) => i !== idx))}
                  title="Remover"
                  style={{ background: 'transparent', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: '2px' }}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
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
