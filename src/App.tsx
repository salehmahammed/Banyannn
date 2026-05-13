/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { 
  Building2, 
  Plus, 
  Trash2, 
  TrendingDown, 
  TrendingUp, 
  Wallet,
  Calendar,
  Layers,
  ArrowUpCircle,
  ArrowDownCircle,
  LayoutDashboard,
  History,
  Info,
  Edit3,
  Settings,
  Briefcase,
  ChevronDown,
  AlertCircle,
  Bell,
  Wifi,
  WifiOff,
  RefreshCw,
  ShieldCheck,
  Home,
  HardHat,
  Construction,
  Factory,
  Warehouse,
  Hammer,
  Share2,
  Smartphone,
  Download,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { cn } from './lib/utils';
import { Transaction, TransactionType, MonthlyStats, Building, Category } from './types';

// Initial categories for expenses
const DEFAULT_EXPENSE_CATEGORIES = [
  'مواد بناء', 
  'حديد', 
  'أسمنت', 
  'كهرباء', 
  'سباكة', 
  'أيدي عاملة', 
  'أخرى'
];

const BUILDING_ICONS = [
  { id: 'building', icon: Building2 },
  { id: 'home', icon: Home },
  { id: 'hardhat', icon: HardHat },
  { id: 'construction', icon: Construction },
  { id: 'factory', icon: Factory },
  { id: 'warehouse', icon: Warehouse },
  { id: 'hammer', icon: Hammer },
  { id: 'briefcase', icon: Briefcase }
];

const BuildingIcon = ({ iconId, size = 16, className = "" }: { iconId?: string, size?: number, className?: string }) => {
  const iconObj = BUILDING_ICONS.find(i => i.id === iconId) || BUILDING_ICONS[0];
  const IconComponent = iconObj.icon;
  return <IconComponent size={size} className={className} />;
};

export default function App() {
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSlowLoading, setIsSlowLoading] = useState(false);
  const [mainError, setMainError] = useState<Error | null>(null);

  // Global error listener for catching unhandled errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setMainError(event.error);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  const buildingsData = useLiveQuery(async () => {
    try {
      return await db.buildings.toArray();
    } catch (e) {
      setLoadError("فشل في الوصول إلى قاعدة بيانات المتصفح (IndexedDB).");
      return [];
    }
  });

  const transactionsData = useLiveQuery(async () => {
    try {
      return await db.transactions.toArray();
    } catch (e) {
      return [];
    }
  });

  const dbCategoriesData = useLiveQuery(async () => {
    try {
      return await db.categories.toArray();
    } catch (e) {
      return [];
    }
  });

  const buildings = buildingsData || [];
  const transactions = transactionsData || [];
  const dbCategories = dbCategoriesData || [];

  const isInitialized = buildingsData !== undefined && transactionsData !== undefined && dbCategoriesData !== undefined;

  // Watchdog for slow loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isInitialized) {
        setIsSlowLoading(true);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [isInitialized]);

  const [activeBuildingId, setActiveBuildingId] = useState(() => {
    return localStorage.getItem('bunyan_active_building_id') || 'default';
  });

  const [dismissedAlerts, setDismissedAlerts] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('bunyan_dismissed_alerts');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('bunyan_dismissed_alerts', JSON.stringify(dismissedAlerts));
  }, [dismissedAlerts]);

  const [isBuildingMenuOpen, setIsBuildingMenuOpen] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState('');
  const [newBuildingIcon, setNewBuildingIcon] = useState('building');
  
  const [editingBuildingId, setEditingBuildingId] = useState<string | null>(null);
  const [editingBuildingName, setEditingBuildingName] = useState('');
  const [editingBuildingIcon, setEditingBuildingIcon] = useState('building');
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'income' | 'expenses' | 'history' | 'settings'>('dashboard');
  const [expandedMonths, setExpandedMonths] = useState<string[]>([]);
  
  // Theme Colors
  const [primaryColor, setPrimaryColor] = useState(() => localStorage.getItem('bunyan_primary_color') || '#A08C5B');
  const [secondaryColor, setSecondaryColor] = useState(() => localStorage.getItem('bunyan_secondary_color') || '#1A1A1A');

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Migration from localStorage to Dexie
  useEffect(() => {
    const migrate = async () => {
      const migrationFlag = localStorage.getItem('bunyan_migrated_to_indexeddb');
      if (migrationFlag) return;

      const savedBuildings = localStorage.getItem('bunyan_buildings');
      const savedTransactions = localStorage.getItem('bunyan_transactions');

      if (savedBuildings) {
        const buildingsData: Building[] = JSON.parse(savedBuildings);
        await db.buildings.bulkPut(buildingsData);
      } else {
        // Init default building if none exists
        await db.buildings.put({ id: 'default', name: 'المشروع الأساسي', createdAt: new Date().toISOString(), icon: 'building' });
      }

      // Initialize categories if empty
      const existingCats = await db.categories.count();
      if (existingCats === 0) {
        const catData: Category[] = DEFAULT_EXPENSE_CATEGORIES.map(name => ({
          id: `cat_${Math.random().toString(36).substr(2, 9)}`,
          name,
          type: 'EXPENSE'
        }));
        await db.categories.bulkAdd(catData);
      }

      if (savedTransactions) {
        const transactionsData: Transaction[] = JSON.parse(savedTransactions);
        await db.transactions.bulkPut(transactionsData);
      }

      localStorage.setItem('bunyan_migrated_to_indexeddb', 'true');
    };

    migrate();
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Form States
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [category, setCategory] = useState('مواد بناء');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [unitPrice, setUnitPrice] = useState<number | ''>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const exportToCSV = () => {
    const data = [...filteredHistoryTransactions].sort((a, b) => b.date.localeCompare(a.date));

    if (data.length === 0) return;

    const headers = ["التاريخ", "البيان", "النوع", "الفئة", "الكمية", "سعر الوحدة", "المبلغ الإجمالي", "المشروع"];
    
    const escapeCSV = (val: any) => {
      const stringVal = val === null || val === undefined ? '' : String(val);
      if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
        return `"${stringVal.replace(/"/g, '""')}"`;
      }
      return stringVal;
    };

    const rows = data.map(t => [
      t.date,
      escapeCSV(t.title),
      t.type === 'INCOME' ? 'دخل' : 'صرف',
      escapeCSV(t.category),
      t.quantity || '',
      t.unitPrice || '',
      t.amount,
      escapeCSV(buildings.find(b => b.id === t.buildingId)?.name || '')
    ]);

    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `سجل_بنيان_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // History Filter States
  const [searchTitle, setSearchTitle] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterBuildingId, setFilterBuildingId] = useState<string>('ALL');

  useEffect(() => {
    localStorage.setItem('bunyan_active_building_id', activeBuildingId);
  }, [activeBuildingId]);

  useEffect(() => {
    localStorage.setItem('bunyan_primary_color', primaryColor);
  }, [primaryColor]);

  useEffect(() => {
    localStorage.setItem('bunyan_secondary_color', secondaryColor);
  }, [secondaryColor]);

  const handleSync = () => {
    if (isSyncing) return;
    setIsSyncing(true);
    // Simulate a network check/sync delay
    setTimeout(() => {
      setIsSyncing(false);
    }, 1500);
  };

  const shareApp = async () => {
    const shareData = {
      title: 'بنيان - إدارة ميزانية البناء',
      text: 'تابع ميزانية مشروعك الإنشائي بسهولة مع تطبيق بنيان.',
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        triggerToast('تم نسخ رابط التطبيق بنجاح');
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Error sharing:', err);
      }
    }
  };

  const activeBuilding = useMemo(() => 
    buildings.find(b => b.id === activeBuildingId) || buildings[0],
  [buildings, activeBuildingId]);

  const activeTransactions = useMemo(() => 
    transactions.filter(t => t.buildingId === activeBuildingId),
  [transactions, activeBuildingId]);

  const stats = useMemo(() => {
    const totalIncome = activeTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = activeTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const balance = totalIncome - totalExpenses;
    const expensePercentage = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;

    // Alert logic: balance < 10% of income OR balance negative
    const isCritical = totalIncome > 0 && balance < (totalIncome * 0.1);
    const isNegative = balance < 0;
    
    return { 
      totalIncome, 
      totalExpenses, 
      balance, 
      expensePercentage,
      alert: (isCritical || isNegative) ? {
        id: `alert_${activeBuildingId}_${Math.floor(balance/1000)}`, // unique per balance state
        type: isNegative ? 'DANGER' : 'WARNING',
        message: isNegative ? 'عجز مالي: المصروفات تجاوزت الموردات' : 'تنبيه: ميزانية المشروع المتبقية منخفضة (أقل من 10%)'
      } : null
    };
  }, [activeTransactions, activeBuildingId]);

  const monthlyStats = useMemo((): MonthlyStats[] => {
    const months: Record<string, MonthlyStats> = {};
    
    // Sort all unique months
    const sortedTransactions = [...activeTransactions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    sortedTransactions.forEach(t => {
      const monthName = format(parseISO(t.date), 'MMMM yyyy', { locale: ar });
      if (!months[monthName]) {
        months[monthName] = { month: monthName, income: 0, expenses: 0 };
      }
      if (t.type === 'INCOME') months[monthName].income += t.amount;
      else months[monthName].expenses += t.amount;
    });

    return Object.values(months);
  }, [activeTransactions]);

  const ledgerTransactions = useMemo(() => {
    const sorted = [...activeTransactions].sort((a, b) => a.date.localeCompare(b.date));
    let currentBalance = 0;
    return sorted.map(t => {
      if (t.type === 'INCOME') currentBalance += t.amount;
      else currentBalance -= t.amount;
      return { ...t, runningBalance: currentBalance };
    });
  }, [activeTransactions]);

  const categoryStats = useMemo(() => {
    const cats: Record<string, { income: number; expense: number }> = {};
    activeTransactions.forEach(t => {
      const catName = t.category || 'غير مصنف';
      if (!cats[catName]) {
        cats[catName] = { income: 0, expense: 0 };
      }
      if (t.type === 'INCOME') {
        cats[catName].income += t.amount;
      } else {
        cats[catName].expense += t.amount;
      }
    });
    return Object.entries(cats).map(([name, values]) => ({ 
      name, 
      ...values, 
      value: values.expense // Keep compatibility with existing charts
    }));
  }, [activeTransactions]);

  // Memoized filtered transactions for History tab
  const filteredHistoryTransactions = useMemo(() => {
    return transactions
      .filter(t => t.buildingId === activeBuildingId || activeBuildingId === 'ALL')
      .filter(t => {
        const titleMatch = (t.title || '').toLowerCase().includes(searchTitle.toLowerCase());
        const typeMatch = filterType === 'ALL' || t.type === filterType;
        const startMatch = !startDate || t.date >= startDate;
        const endMatch = !endDate || t.date <= endDate;
        const categoryMatch = filterCategory === 'ALL' || t.category === filterCategory;
        return titleMatch && typeMatch && startMatch && endMatch && categoryMatch;
      }).sort((a,b) => b.date.localeCompare(a.date));
  }, [transactions, activeBuildingId, searchTitle, filterType, startDate, endDate, filterCategory]);

  const historyMonthlyData = useMemo(() => {
    const months: Record<string, { month: string; income: number; expenses: number; sortKey: string }> = {};
    
    filteredHistoryTransactions.forEach(t => {
      const dateObj = parseISO(t.date);
      const monthName = format(dateObj, 'MMM yyyy', { locale: ar });
      const sortKey = format(dateObj, 'yyyy-MM');
      
      if (!months[sortKey]) {
        months[sortKey] = { month: monthName, income: 0, expenses: 0, sortKey };
      }
      
      if (t.type === 'INCOME') {
        months[sortKey].income += t.amount;
      } else {
        months[sortKey].expenses += t.amount;
      }
    });

    return Object.values(months).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [filteredHistoryTransactions]);

  const groupedHistoryTransactions = useMemo(() => {
    const groups: Record<string, { month: string, sortKey: string, transactions: Transaction[] }> = {};
    
    filteredHistoryTransactions.forEach(t => {
      const dateObj = parseISO(t.date);
      const sortKey = format(dateObj, 'yyyy-MM');
      const monthLabel = format(dateObj, 'MMMM yyyy', { locale: ar });
      
      if (!groups[sortKey]) {
        groups[sortKey] = {
          month: monthLabel,
          sortKey,
          transactions: []
        };
      }
      groups[sortKey].transactions.push(t);
    });
    
    return Object.values(groups).sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  }, [filteredHistoryTransactions]);

  const PIE_COLORS = [secondaryColor, primaryColor, '#D1C7B7', '#403D39', '#E5E1D8', '#8C7A4B'];

  const addTransaction = async (type: TransactionType) => {
    if (!title || !amount || Number(amount) <= 0) return;

    let finalCategory = category;
    if (type === 'EXPENSE' && isAddingCategory && newCategoryName.trim()) {
      const existing = dbCategories.find(c => c.name === newCategoryName.trim());
      if (!existing) {
        const newCat: Category = {
          id: `cat_${Math.random().toString(36).substr(2, 9)}`,
          name: newCategoryName.trim(),
          type: 'EXPENSE'
        };
        await db.categories.add(newCat);
        finalCategory = newCat.name;
      } else {
        finalCategory = existing.name;
      }
    }

    if (editingId) {
      const originalTx = await db.transactions.get(editingId);
      await db.transactions.update(editingId, { 
        title, 
        amount: Number(amount), 
        category: (originalTx?.type || type) === 'INCOME' ? 'وارد' : finalCategory, 
        date,
        quantity: (originalTx?.type || type) === 'EXPENSE' ? (Number(quantity) || undefined) : undefined,
        unitPrice: (originalTx?.type || type) === 'EXPENSE' ? (Number(unitPrice) || undefined) : undefined,
      });
      setEditingId(null);
    } else {
      const newTransaction: Transaction = {
        id: crypto.randomUUID(),
        buildingId: activeBuildingId,
        type,
        title,
        amount: Number(amount),
        category: type === 'INCOME' ? 'وارد' : finalCategory,
        date,
        quantity: type === 'EXPENSE' ? (Number(quantity) || undefined) : undefined,
        unitPrice: type === 'EXPENSE' ? (Number(unitPrice) || undefined) : undefined,
      };
      await db.transactions.add(newTransaction);
    }
    
    // Reset form
    setTitle('');
    setAmount('');
    setQuantity('');
    setUnitPrice('');
    setIsAddingCategory(false);
    setNewCategoryName('');
    setDate(new Date().toISOString().split('T')[0]);
  };

  const startEdit = (t: Transaction) => {
    setEditingId(t.id);
    setTitle(t.title);
    setAmount(t.amount);
    setCategory(t.category);
    setQuantity(t.quantity || '');
    setUnitPrice(t.unitPrice || '');
    setDate(t.date);
    setActiveTab(t.type === 'INCOME' ? 'income' : 'expenses');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setTitle('');
    setAmount('');
    setQuantity('');
    setUnitPrice('');
    setDate(new Date().toISOString().split('T')[0]);
  };

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths(prev => 
      prev.includes(monthKey) 
        ? prev.filter(m => m !== monthKey) 
        : [...prev, monthKey]
    );
  };

  const exportData = async () => {
    try {
      const data = {
        buildings: await db.buildings.toArray(),
        transactions: await db.transactions.toArray(),
        categories: await db.categories.toArray(),
        exportDate: new Date().toISOString(),
        version: '1.0'
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bunyan_backup_${format(new Date(), 'yyyy-MM-dd')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setToastMessage('تم تصدير النسخة الاحتياطية بنجاح');
      setShowToast(true);
    } catch (e) {
      setToastMessage('فشل تصدير البيانات');
      setShowToast(true);
    }
  };

  const importData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('سيتم دمج البيانات المستوردة مع البيانات الحالية. هل أنت متأكد؟')) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = JSON.parse(event.target?.result as string);
        if (content.buildings) await db.buildings.bulkPut(content.buildings);
        if (content.transactions) await db.transactions.bulkPut(content.transactions);
        if (content.categories) await db.categories.bulkPut(content.categories);
        
        setToastMessage('تم استعادة البيانات بنجاح');
        setShowToast(true);
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        setToastMessage('الملف غير صالح أو تالف');
        setShowToast(true);
      }
    };
    reader.readAsText(file);
  };

  const deleteTransaction = async (id: string) => {
    await db.transactions.delete(id);
  };

  const addBuilding = async () => {
    if (!newBuildingName.trim()) return;
    const building: Building = {
      id: crypto.randomUUID(),
      name: newBuildingName,
      createdAt: new Date().toISOString(),
      icon: newBuildingIcon
    };
    await db.buildings.add(building);
    setActiveBuildingId(building.id);
    setNewBuildingName('');
    setNewBuildingIcon('building');
    setIsBuildingMenuOpen(false);
  };

  const deleteBuilding = async (id: string) => {
    if (buildings.length <= 1) return;
    if (confirm('هل أنت متأكد من حذف هذا المشروع؟ سيتم حذف جميع المصروفات المرتبطة به.')) {
      await db.buildings.delete(id);
      const toDelete = await db.transactions.where('buildingId').equals(id).primaryKeys();
      await db.transactions.bulkDelete(toDelete);
      if (activeBuildingId === id) {
        setActiveBuildingId(buildings.find(b => b.id !== id)?.id || 'default');
      }
    }
  };

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const generatePDFReport = async () => {
    if (!reportRef.current) return;
    
    setIsGeneratingPDF(true);
    triggerToast('جاري تحضير التقرير، يرجى الانتظار...');
    
    try {
      // Temporarily make the report visible to capture it
      const reportElement = reportRef.current;
      const originalDisplay = reportElement.style.display;
      const originalPosition = reportElement.style.position;
      const originalLeft = reportElement.style.left;
      const originalTop = reportElement.style.top;
      const originalWidth = reportElement.style.width;
      
      // Force render for capture
      reportElement.style.setProperty('display', 'block', 'important');
      reportElement.style.position = 'fixed';
      reportElement.style.left = '0';
      reportElement.style.top = '0';
      reportElement.style.width = '850px';
      reportElement.style.zIndex = '-9999';
      reportElement.style.backgroundColor = '#F9F7F2';

      // Small delay to ensure rendering and font loading
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(reportElement, {
        scale: 3, // High quality for text clarity
        useCORS: true,
        logging: false,
        backgroundColor: '#F9F7F2',
        windowWidth: 850,
        y: 0,
        x: 0,
        onclone: (clonedDoc) => {
          // Additional safety: ensure font is applied and remove any problematic modern colors
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap');
            * { 
              font-family: 'Tajawal', sans-serif !important;
              color-scheme: light !important;
              letter-spacing: 0 !important;
              word-spacing: 0 !important;
              font-variant-ligatures: common-ligatures !important;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
            h1, h2, h3, h4, h5, h6, b, strong {
              font-weight: 900 !important;
            }
            .print-only { display: block !important; }
          `;
          clonedDoc.head.appendChild(style);
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 850;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [imgWidth, imgHeight]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`تقرير_مشروع_${activeBuilding?.name || 'بنيان'}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      triggerToast('تم تحميل التقرير بنجاح');
    } catch (error) {
      console.error('PDF Generation Error:', error);
      triggerToast('فشل التصدير التلقائي، سيتم فتح نافذة الطباعة');
      // Fallback to standard print if browser blocks or fails
      window.print();
    } finally {
      // Restore element state
      if (reportRef.current) {
        const reportElement = reportRef.current;
        reportElement.style.display = '';
        reportElement.style.position = '';
        reportElement.style.left = '';
        reportElement.style.top = '';
        reportElement.style.width = '';
        reportElement.style.zIndex = '';
        reportElement.style.backgroundColor = '';
      }
      setIsGeneratingPDF(false);
    }
  };

  // Sync amount if quantity and unit price are provided
  useEffect(() => {
    if (activeTab === 'expenses' && quantity && unitPrice) {
      setAmount(Number(quantity) * Number(unitPrice));
    }
  }, [quantity, unitPrice, activeTab]);

  if (mainError) {
    return (
      <div className="min-h-screen bg-[#F9F7F2] flex items-center justify-center p-8 text-right" dir="rtl">
        <div className="max-w-md w-full bg-white border-2 border-rose-500 p-8 shadow-2xl">
          <h2 className="text-2xl font-black text-rose-600 mb-4">حدث خطأ مفاجئ</h2>
          <p className="text-sm font-bold opacity-60 mb-6 leading-relaxed">
            تعذر تشغيل بعض المكونات. قد تكون هذه مشكلة برمجية أو تتعلق بالتوافق مع متصفحك.
          </p>
          <div className="bg-rose-50 p-4 mb-6 border border-rose-100 overflow-auto max-h-40">
            <code className="text-[10px] text-rose-800 break-all">{mainError.toString()}</code>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-[#1A1A1A] text-white py-3 font-black uppercase tracking-widest text-xs"
          >
            إعادة تحميل البرنامج
          </button>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#F9F7F2] flex items-center justify-center p-8 text-right font-sansSelection" dir="rtl">
        <div className="max-w-md w-full bg-white border-2 border-[#1A1A1A] p-8 shadow-2xl">
          <AlertCircle className="text-[#A08C5B] mb-4" size={48} />
          <h2 className="text-2xl font-black mb-4">مشكلة في التشغيل</h2>
          <p className="text-sm font-bold opacity-60 mb-6 leading-relaxed">
            {loadError}
          </p>
          <div className="space-y-4">
            <div className="bg-[#F2F0EA] p-4 text-[11px] leading-relaxed">
              <p className="font-black mb-2 uppercase">حلول مقترحة لمستخدمي السودان:</p>
              <ul className="list-disc pr-4 space-y-1">
                <li>استخدم متصفح Google Chrome أو Microsoft Edge حديث.</li>
                <li>تأكد من عدم استخدام وضع "التصفح المتخفي" (Incognito).</li>
                <li>إذا كان الإنترنت ضعيفاً، انتظر قليلاً أو استخدم VPN.</li>
              </ul>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-[#1A1A1A] text-white py-3 font-black uppercase tracking-widest text-xs"
            >
              محاولة مرة أخرى
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isInitialized && isSlowLoading) {
    return (
      <div className="min-h-screen bg-[#F9F7F2] flex items-center justify-center p-8 text-right font-sansSelection" dir="rtl">
        <div className="max-w-md w-full bg-white border-2 border-[#1A1A1A] p-8 shadow-2xl">
          <RefreshCw className="animate-spin text-[#A08C5B] mb-4" size={32} />
          <h2 className="text-xl font-black mb-2">النظام يستغرق وقتاً طويلاً للتحميل</h2>
          <p className="text-xs font-bold opacity-60 mb-6 leading-relaxed">
            قد يكون هذا بسبب ضعف شبكة الإنترنت. النظام يحاول الآن تهيئة قاعدة البيانات المحلية للعمل بدون إنترنت لاحقاً.
          </p>
          <div className="space-y-4">
            <div className="text-[10px] bg-amber-50 p-3 border border-amber-100 text-amber-800">
              <b>تنبيه لمستخدمي السودان:</b> إذا استمرت هذه الرسالة، يرجى التأكد من أنك لا تستخدم متصفح Mini أو وضع توفير البيانات الشديد، حيث أنها تعطل التقنيات الحديثة المطلوبة.
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-[#1A1A1A] text-white py-2 font-black uppercase tracking-widest text-[10px]"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[#F9F7F2] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-[#1A1A1A] border-t-transparent animate-spin"></div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">BUNYAN / LOADING</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F7F2] text-[#1A1A1A] font-sansSelection" dir="rtl">
      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-[#1A1A1A] text-white text-xs font-black uppercase tracking-widest shadow-2xl border border-white/10"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
              <header className="no-print bg-[#F9F7F2] border-b-2 border-[#1A1A1A] sticky top-0 z-10 py-4">
                <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div className="flex justify-between items-center w-full md:w-auto">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] uppercase tracking-[0.2em] opacity-60 leading-none">نظام المتابعة الإنشائية</span>
                        <span className="text-[8px] bg-[#1A1A1A] text-white px-1.5 py-0.5 font-black uppercase rounded-sm">بواسطة صالح محمد</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="bg-[#1A1A1A] p-1.5 text-[#F9F7F2]">
                          <Building2 size={20} />
                        </div>
                        <h1 className="text-2xl md:text-4xl font-black tracking-tighter uppercase">بنيان</h1>
                      </div>
                    </div>

                    {/* Building Switcher (Mobile) */}
                    <div className="md:hidden relative">
                      <button 
                        onClick={() => setIsBuildingMenuOpen(!isBuildingMenuOpen)}
                        className="flex items-center gap-2 px-2 py-1 bg-[#F2F0EA] border border-[#E5E1D8]"
                      >
                        <BuildingIcon iconId={activeBuilding?.icon} size={12} className="opacity-40" />
                        <span className="text-[10px] font-bold truncate max-w-[80px]">{activeBuilding?.name}</span>
                        <ChevronDown size={12} className={cn("transition-transform", isBuildingMenuOpen && "rotate-180")} />
                      </button>
                    </div>
                  </div>

                  {/* Building Switcher (Desktop) */}
                  <div className="hidden md:block relative">
                    <button 
                      onClick={() => setIsBuildingMenuOpen(!isBuildingMenuOpen)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-[#F2F0EA] border border-[#E5E1D8] hover:border-[#1A1A1A] transition-all"
                    >
                      <BuildingIcon iconId={activeBuilding?.icon} size={14} className="opacity-40" />
                      <span className="text-[11px] font-bold uppercase tracking-wider">{activeBuilding?.name}</span>
                      <ChevronDown size={14} className={cn("transition-transform", isBuildingMenuOpen && "rotate-180")} />
                    </button>
                  </div>

              <AnimatePresence>
                {isBuildingMenuOpen && (
                  <>
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-20"
                      onClick={() => setIsBuildingMenuOpen(false)}
                    />
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full right-0 mt-2 w-64 bg-white border border-[#1A1A1A] shadow-[8px_8px_0px_rgba(0,0,0,0.1)] z-30 overflow-hidden"
                    >
                      <div className="p-2 space-y-1">
                        {buildings.map(b => (
                          <div key={b.id} className="flex group">
                            <button 
                              onClick={() => {
                                setActiveBuildingId(b.id);
                                setIsBuildingMenuOpen(false);
                                setActiveTab('dashboard');
                              }}
                              className={cn(
                                "flex-1 flex items-center gap-2 text-right px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors text-right",
                                activeBuildingId === b.id ? "bg-[#1A1A1A] text-white" : "hover:bg-[#F2F0EA]"
                              )}
                            >
                              <div className={cn(
                                "w-6 h-6 flex items-center justify-center rounded-sm",
                                activeBuildingId === b.id ? "bg-white/10" : "bg-[#1A1A1A]/5"
                              )}>
                                <BuildingIcon iconId={b.icon} size={12} className={cn(activeBuildingId === b.id ? "text-white" : "text-[#1A1A1A]")} />
                              </div>
                              <span>{b.name}</span>
                            </button>
                            {buildings.length > 1 && (
                              <button 
                                onClick={() => deleteBuilding(b.id)}
                                className="px-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="p-3 border-t border-[#F2F0EA] bg-[#F9F7F2]">
                        <div className="flex flex-wrap gap-1 mb-3">
                          {BUILDING_ICONS.map(i => {
                            const Icon = i.icon;
                            return (
                              <button
                                key={i.id}
                                onClick={() => setNewBuildingIcon(i.id)}
                                className={cn(
                                  "w-7 h-7 flex items-center justify-center border transition-all",
                                  newBuildingIcon === i.id 
                                    ? "border-[#1A1A1A] bg-[#1A1A1A] text-white" 
                                    : "border-[#E5E1D8] bg-white text-slate-400 hover:border-[#1A1A1A]"
                                )}
                                title={i.id}
                              >
                                <Icon size={12} />
                              </button>
                            );
                          })}
                        </div>
                        <input 
                          type="text" 
                          placeholder="اسم المشروع..."
                          value={newBuildingName}
                          onChange={(e) => setNewBuildingName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addBuilding()}
                          className="w-full bg-white border border-[#E5E1D8] px-2 py-1.5 text-[10px] font-bold outline-none focus:border-[#1A1A1A]"
                        />
                        <button 
                          onClick={addBuilding}
                          className="w-full mt-2 py-2 bg-[#1A1A1A] text-white text-[9px] font-black uppercase tracking-[0.2em] hover:bg-black transition-colors"
                        >
                          إنشاء المشروع
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-4 md:gap-8 overflow-x-auto pb-2 scrollbar-hide border-b border-[#E5E1D8] mb-6">
                {[
                  { id: 'dashboard', label: 'الرئيسية' },
                  { id: 'income', label: 'الوارد' },
                  { id: 'expenses', label: 'المصروفات' },
                  { id: 'history', label: 'السجل' },
                  { id: 'settings', label: 'الإعدادات' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "whitespace-nowrap pb-2 text-[11px] font-black uppercase tracking-widest transition-all cursor-pointer",
                      activeTab === tab.id 
                        ? "border-b-2 border-[#1A1A1A] text-[#1A1A1A]" 
                        : "border-transparent text-slate-400 hover:text-[#1A1A1A]"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 pb-6">
                <button 
                  onClick={handleSync}
                  disabled={!isOnline || isSyncing}
                  className={cn(
                    "p-1.5 md:p-2 rounded-full transition-all group relative",
                    isOnline ? "hover:bg-[#F2F0EA] text-[#1A1A1A]" : "opacity-20 cursor-not-allowed"
                  )}
                  title="تحديث البيانات محلياً"
                >
                  <div className={cn(isSyncing && "animate-spin")}>
                    <RefreshCw size={12} />
                  </div>
                </button>

                <button 
                  onClick={shareApp}
                  className="p-1.5 md:p-2 rounded-full hover:bg-[#F2F0EA] text-[#1A1A1A] transition-all"
                  title="مشاركة التطبيق"
                >
                  <Share2 size={12} />
                </button>
              </div>
            </div>
          </header>

      {/* Financial Health Alert Banner */}
      <AnimatePresence>
        {stats.alert && !dismissedAlerts[stats.alert.id] && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={cn(
              "no-print border-y-2 relative z-40 overflow-hidden",
              stats.alert.type === 'DANGER' ? "bg-rose-50 border-rose-200" : "bg-amber-50 border-amber-200"
            )}
          >
            <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-full",
                  stats.alert.type === 'DANGER' ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
                )}>
                  <AlertCircle size={18} />
                </div>
                <div className="text-right">
                  <h5 className={cn(
                    "text-[11px] font-black uppercase tracking-tight",
                    stats.alert.type === 'DANGER' ? "text-rose-900" : "text-amber-900"
                  )}>
                    {stats.alert.type === 'DANGER' ? 'تحذير مالي حرج' : 'تنبيه ميزانية قيد الانتهاء'}
                  </h5>
                  <p className={cn(
                    "text-[10px] font-bold opacity-70",
                    stats.alert.type === 'DANGER' ? "text-rose-800" : "text-amber-800"
                  )}>
                    {stats.alert.message}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => stats.alert && setDismissedAlerts(prev => ({ ...prev, [stats.alert!.id]: true }))}
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors"
              >
                تجاهل
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="no-print max-w-5xl mx-auto p-4 md:p-8 space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between border-b-2 border-slate-100 pb-4 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center bg-[#1A1A1A] text-white shadow-lg">
              <BuildingIcon iconId={activeBuilding?.icon} size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tighter uppercase">{activeBuilding?.name}</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#A08C5B]">متابعة الميزانية والتدفق المالي</p>
            </div>
          </div>
          <div className="text-[10px] font-bold opacity-40 uppercase tracking-widest">
            {format(new Date(), 'EEEE, dd MMMM yyyy', { locale: ar })}
          </div>
        </header>

        {/* Quick Stats */}
        <section className="no-print grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-4 md:p-6 border border-[#E5E1D8] shadow-sm">
            <div className="flex flex-col mb-4">
              <span className="text-[9px] md:text-[10px] uppercase tracking-widest text-[#A08C5B] font-bold mb-1">الرصيد المتبقي (الفرق)</span>
              <div className="h-0.5 w-8 bg-[#1A1A1A]"></div>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-2xl md:text-4xl font-black tracking-tighter tabular-nums">
                {stats.balance.toLocaleString()}
              </span>
              <span className="text-[9px] md:text-[10px] opacity-40 font-bold uppercase">جنيه سوداني</span>
            </div>
          </div>

          <div className="bg-white p-4 md:p-6 border border-[#E5E1D8] shadow-sm">
            <div className="flex flex-col mb-4">
              <span className="text-[9px] md:text-[10px] uppercase tracking-widest text-[#A08C5B] font-bold mb-1">إجمالي الميزانية المودعة</span>
              <div className="h-0.5 w-8 bg-[#A08C5B]/30"></div>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-2xl md:text-4xl font-light tracking-tight tabular-nums">
                {stats.totalIncome.toLocaleString()}
              </span>
              <span className="text-[9px] md:text-[10px] opacity-40 font-bold uppercase">جنيه سوداني</span>
            </div>
          </div>

          <div className="bg-[#1A1A1A] text-[#F9F7F2] p-4 md:p-6 shadow-xl">
            <div className="flex flex-col mb-4">
              <span className="text-[9px] md:text-[10px] uppercase tracking-widest text-[#A08C5B] font-bold mb-1">إجمالي المصروفات المنفذة</span>
              <div className="h-0.5 w-8 bg-[#A08C5B]"></div>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-2xl md:text-4xl font-light tracking-tight tabular-nums">
                {stats.totalExpenses.toLocaleString()}
              </span>
              <span className="text-[9px] md:text-[10px] opacity-40 font-bold uppercase">جنيه سوداني</span>
            </div>
          </div>
        </section>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Bar Chart */}
                <div className="bg-white p-8 border border-[#E5E1D8] shadow-sm lg:col-span-2">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-bold italic tracking-tight">المتابعة الشهرية للمشروع</h3>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] bg-[#F2F0EA] px-2 py-1 uppercase font-bold">إحصائيات التدفق</span>
                      <span className="text-[7px] font-bold opacity-30 mt-1 uppercase tracking-tighter">بواسطة صالح محمد</span>
                    </div>
                  </div>
                  <div className="h-[300px] w-full">
                    {monthlyStats.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyStats} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="0" vertical={false} stroke="#E5E1D8" />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#1A1A1A', fontWeight: 700 }} />
                          <YAxis axisLine={false} tickLine={false} hide />
                          <Tooltip 
                            contentStyle={{ borderRadius: '0', border: '1px solid #1A1A1A', background: '#FFFFFF', boxShadow: '10px 10px 0px rgba(0,0,0,0.05)' }}
                            labelStyle={{ fontWeight: 800, marginBottom: '4px' }}
                            formatter={(value: any) => [`${value.toLocaleString()} ج.س`]}
                          />
                          <Bar dataKey="income" name="وارد" fill={primaryColor} radius={0} />
                          <Bar dataKey="expenses" name="مصروف" fill={secondaryColor} radius={0} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 italic text-sm">
                        <p>لا توجد بيانات كافية للتحليل الإحصائي</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-8 pt-8 border-t border-[#E5E1D8] flex justify-end">
                    <button 
                      onClick={generatePDFReport}
                      disabled={isGeneratingPDF}
                      className={cn(
                        "flex items-center gap-2 bg-[#1A1A1A] text-[#F9F7F2] px-6 py-2.5 text-[10px] uppercase font-bold tracking-widest hover:opacity-90 transition-all border-b-4 border-[#A08C5B]",
                        isGeneratingPDF && "opacity-50 cursor-wait"
                      )}
                    >
                      {isGeneratingPDF ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <ArrowDownCircle size={14} />
                      )}
                      {isGeneratingPDF ? 'جاري التصدير...' : 'تصدير تقرير المشروع الشامل'}
                    </button>
                  </div>
                </div>

                {/* Progress Card */}
                <div className="bg-white p-8 border border-[#E5E1D8] shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs uppercase font-bold tracking-[0.2em] mb-8 text-[#A08C5B]">نسبة استهلاك السيولة</h3>
                    
                    <div className="relative pt-1">
                      <div className="relative h-4 w-full bg-[#F2F0EA] mb-6 shadow-inner">
                        <motion.div 
                          initial={{ width: 0, opacity: 0, filter: 'blur(4px)' }}
                          animate={{ width: `${Math.min(stats.expensePercentage, 100)}%`, opacity: 1, filter: 'blur(0px)' }}
                          transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
                          className={cn(
                            "absolute top-0 right-0 h-full bg-gradient-to-l border-l-2 border-white/20"
                          )}
                          style={{
                            backgroundImage: stats.expensePercentage > 95 
                              ? `linear-gradient(to left, ${secondaryColor}, ${secondaryColor}, #9f1239)`
                              : stats.expensePercentage > 75 
                                ? `linear-gradient(to left, ${secondaryColor}, ${secondaryColor}, ${primaryColor})`
                                : `linear-gradient(to left, ${secondaryColor}, ${primaryColor})`
                          }}
                        />
                      </div>
                      <div className="flex justify-between items-baseline mb-12">
                        <span className="text-5xl font-black tracking-tighter">
                          {Math.round(stats.expensePercentage)}%
                        </span>
                        <span className="text-[10px] font-bold uppercase opacity-40 text-left">من إجمالي الميزانية المعتمدة</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-[#F2F0EA]">
                    <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider">
                      <span className="opacity-50">إجمالي المنفذ</span>
                      <span>{stats.totalExpenses.toLocaleString()} ج.س</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider">
                      <span className="opacity-50">السيولة المتبقية</span>
                      <span className="text-[#A08C5B]">{stats.balance.toLocaleString()} ج.س</span>
                    </div>

                    {/* Budget Alerts (D4 Logic) */}
                    {(stats.balance < 0 || (stats.totalIncome > 0 && stats.balance / stats.totalIncome < 0.1)) && (
                      <div className={cn(
                        "p-4 border-l-4 flex items-center gap-3 animate-pulse",
                        stats.balance < 0 ? "bg-rose-50 border-rose-600 text-rose-600" : "bg-amber-50 border-amber-600 text-amber-600"
                      )}>
                        <div className="flex-1">
                          <p className="text-[10px] font-black uppercase tracking-widest leading-tight">تنبيه الميزانية الحرج</p>
                          <p className="text-[9px] font-bold opacity-80 mt-0.5">
                            {stats.balance < 0 
                              ? "عجز مالي: المصروفات تجاوزت الميزانية المودعة" 
                              : "تحذير: رصيد الميزانية المتبقي أقل من 10%"}
                          </p>
                        </div>
                        <Info size={16} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Pie Chart Card */}
                <div className="bg-white p-8 border border-[#E5E1D8] shadow-sm md:col-span-2 lg:col-span-3">
                  <div className="flex flex-col md:flex-row gap-12">
                    <div className="w-full md:w-1/3">
                      <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-bold italic tracking-tight">تحليل المصروفات حسب الفئة</h3>
                      </div>
                      <div className="h-[280px] w-full relative">
                        {categoryStats.length > 0 ? (
                          <>
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={categoryStats}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={70}
                                  outerRadius={90}
                                  paddingAngle={8}
                                  dataKey="value"
                                  stroke="none"
                                >
                                  {categoryStats.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip 
                                  contentStyle={{ borderRadius: '0', border: '1px solid #1A1A1A', background: '#FFFFFF', fontSize: '12px', fontWeight: 700 }}
                                  formatter={(value: any) => [`${value.toLocaleString()} ج.س`]}
                                />
                                <Legend 
                                  verticalAlign="bottom" 
                                  height={36} 
                                  iconType="square" 
                                  iconSize={10}
                                  content={(props) => {
                                    const { payload } = props;
                                    return (
                                      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-4">
                                        {payload?.map((entry: any, index: number) => (
                                          <div key={`item-${index}`} className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5" style={{ backgroundColor: entry.color }}></div>
                                            <span className="text-[9px] font-bold uppercase tracking-tighter opacity-60">{entry.value}</span>
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none mb-10 md:mb-14">
                              <div className="text-center">
                                <span className="block text-[8px] uppercase font-black opacity-30 tracking-widest">إجمالي</span>
                                <span className="block text-2xl font-black" style={{ color: secondaryColor }}>{stats.totalExpenses.toLocaleString()}</span>
                                <span className="block text-[8px] font-bold opacity-30 mt-0.5">ج.س</span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-slate-400 italic text-sm">
                            <p>لا توجد بيانات بانتظار الاعتماد</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 space-y-6">
                      <div className="flex items-center justify-between opacity-40">
                        <h4 className="text-[10px] font-black uppercase tracking-widest">تفاصيل البنود والنسب المئوية</h4>
                        <div className="h-px flex-1 bg-[#1A1A1A] mx-4 opacity-10"></div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        {categoryStats.length > 0 ? (
                          categoryStats.sort((a,b) => b.value - a.value).map((entry, index) => (
                            <div key={entry.name} className="flex flex-col space-y-2 p-4 bg-[#F9F7F2] border-r-2" style={{ borderColor: PIE_COLORS[index % PIE_COLORS.length] }}>
                              <div className="flex justify-between items-center">
                                <span className="text-[11px] font-black uppercase tracking-tight">{entry.name}</span>
                                <span className="text-[10px] font-bold opacity-40">{Math.round((entry.value / stats.totalExpenses) * 100)}%</span>
                              </div>
                              <div className="flex justify-between items-baseline">
                                <span className="text-lg font-black tabular-nums">{entry.value.toLocaleString()}</span>
                                <span className="text-[8px] font-bold opacity-30 uppercase">جنيه</span>
                              </div>
                              <div className="h-1 w-full bg-[#E5E1D8]">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.round((entry.value / stats.totalExpenses) * 100)}%` }}
                                  className="h-full"
                                  style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                                />
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="col-span-2 text-center py-12 text-[10px] uppercase font-bold opacity-20 tracking-widest">بانتظار توثيق المصروفات...</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {(activeTab === 'income' || activeTab === 'expenses') && (
            <motion.div 
              key="form"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-12"
            >
              <div className="max-w-xl mx-auto bg-white p-12 border border-[#E5E1D8] shadow-2xl relative">
                <div className="absolute top-0 right-0 w-1.5 h-full bg-[#1A1A1A]"></div>
                <p className="text-[10px] uppercase tracking-widest text-[#A08C5B] font-bold mb-2">
                  {editingId ? 'تعديل البيانات الموثقة' : 'نموذج التوثيق الرسمي'}
                </p>
                <div className="flex justify-between items-start mb-8 md:mb-10">
                  <h3 className="text-xl md:text-3xl font-black tracking-tighter">
                    {editingId ? 'تعديل السجل' : (activeTab === 'income' ? 'إيداع تمويل جديد' : 'اعتماد صرف مواد')}
                  </h3>
                  {editingId && (
                    <button 
                      onClick={cancelEdit}
                      className="text-[10px] font-bold uppercase tracking-widest text-rose-500 hover:underline"
                    >
                      إلغاء التعديل
                    </button>
                  )}
                </div>
                
                <div className="space-y-8">
                  <div className="border-b border-[#F2F0EA] pb-2">
                    <label className="block text-[10px] font-bold uppercase tracking-widest mb-1 opacity-50">البيان الرسمي</label>
                    <input 
                      type="text" 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={activeTab === 'income' ? "وصف المصدر..." : "نوع المادة والمواصفات..."}
                      className="w-full bg-transparent p-0 text-lg font-bold outline-none placeholder:text-slate-200 italic"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="border-b border-[#F2F0EA] pb-2">
                      <label className="block text-[10px] font-bold uppercase tracking-widest mb-1 opacity-50">تاريخ العملية</label>
                      <input 
                        type="date" 
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-transparent p-0 text-sm outline-none font-bold"
                      />
                    </div>
                    {activeTab === 'expenses' && (
                      <div className="border-b border-[#F2F0EA] pb-2 relative">
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-[10px] font-bold uppercase tracking-widest opacity-50">تصنيف المادة</label>
                          <button 
                            onClick={() => setIsAddingCategory(!isAddingCategory)}
                            className="text-[8px] font-bold text-[#A08C5B] uppercase tracking-widest hover:underline"
                          >
                            {isAddingCategory ? 'الغاء' : 'إضافة جديد +'}
                          </button>
                        </div>
                        
                        {isAddingCategory ? (
                          <input 
                            type="text"
                            autoFocus
                            placeholder="اسم التصنيف الجديد..."
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            className="w-full bg-transparent p-0 text-sm outline-none font-bold placeholder:text-slate-300"
                          />
                        ) : (
                          <select 
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full bg-transparent p-0 text-sm outline-none font-bold appearance-none cursor-pointer"
                          >
                            {dbCategories.map(cat => (
                              <option key={cat.id} value={cat.name}>{cat.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                  </div>

                  {activeTab === 'expenses' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="border-b border-[#F2F0EA] pb-2">
                        <label className="block text-[10px] font-bold uppercase tracking-widest mb-1 opacity-50">الكمية المسلمة</label>
                        <input 
                          type="number" 
                          value={quantity}
                          onChange={(e) => setQuantity(Number(e.target.value) || '')}
                          className="w-full bg-transparent p-0 text-sm outline-none font-bold"
                        />
                      </div>
                      <div className="border-b border-[#F2F0EA] pb-2">
                        <label className="block text-[10px] font-bold uppercase tracking-widest mb-1 opacity-50">سعر الوحدة</label>
                        <input 
                          type="number" 
                          value={unitPrice}
                          onChange={(e) => setUnitPrice(Number(e.target.value) || '')}
                          className="w-full bg-transparent p-0 text-sm outline-none font-bold"
                        />
                      </div>
                    </div>
                  )}

                  <div className="bg-[#F2F0EA] p-6 border-r-4 border-[#A08C5B]">
                    <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 opacity-60">إجمالي قيمة الاعتماد</label>
                    <div className="flex items-baseline justify-between">
                      <input 
                        type="number" 
                        value={amount}
                        readOnly={activeTab === 'expenses' && (!!quantity && !!unitPrice)}
                        onChange={(e) => setAmount(Number(e.target.value) || '')}
                        className="bg-transparent p-0 text-4xl font-black tracking-tighter outline-none w-full tabular-nums"
                      />
                      <span className="text-xs font-bold uppercase opacity-50">ج.س</span>
                    </div>
                  </div>

                    <button 
                      onClick={() => {
                        addTransaction(activeTab === 'income' ? 'INCOME' : 'EXPENSE');
                        setActiveTab('dashboard');
                      }}
                      className="w-full py-5 bg-[#1A1A1A] text-[#F9F7F2] font-bold uppercase tracking-[0.2em] text-xs hover:bg-[#333333] transition-all shadow-[10px_10px_0px_rgba(160,140,91,0.3)]"
                    >
                      {editingId ? 'حفظ التعديلات' : (activeTab === 'income' ? 'إتمام عملية الإيداع' : 'تأكيد اعتماد الصرف')}
                    </button>
                </div>
              </div>

              {/* Recent Transactions in entry tabs */}
              <div className="max-w-xl mx-auto space-y-4">
                <div className="flex items-center justify-between opacity-40 px-2">
                  <h4 className="text-[10px] font-black uppercase tracking-widest">
                    {activeTab === 'income' ? 'آخر عمليات الإيداع' : 'آخر عمليات الصرف المعتمده'}
                  </h4>
                  <div className="h-px flex-1 bg-[#1A1A1A] mx-4 opacity-10"></div>
                </div>

                <div className="space-y-2">
                  {activeTransactions
                    .filter(t => t.type === (activeTab === 'income' ? 'INCOME' : 'EXPENSE'))
                    .slice(0, 5)
                    .map(t => (
                      <div key={t.id} className="bg-white border border-[#E5E1D8] p-4 flex items-center justify-between group hover:border-[#1A1A1A] transition-all">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold tracking-tight">{t.title}</span>
                          <span className="text-[9px] opacity-40 font-bold uppercase tracking-wider">{format(parseISO(t.date), 'dd MMMM yyyy', { locale: ar })}</span>
                        </div>
                        <div className="flex items-center gap-6">
                          <span className={cn("text-xs font-black tabular-nums", t.type === 'INCOME' ? "text-emerald-600" : "text-[#1A1A1A]")}>
                            {t.type === 'INCOME' ? '+' : '-'} {t.amount.toLocaleString()}
                          </span>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => startEdit(t)}
                              className="p-1.5 text-slate-300 hover:text-[#A08C5B]"
                            >
                              <Edit3 size={12} />
                            </button>
                            <button 
                              onClick={() => deleteTransaction(t.id)}
                              className="p-1.5 text-slate-300 hover:text-rose-500"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-xl mx-auto bg-white p-12 border border-[#E5E1D8] shadow-2xl relative"
            >
              <div className="absolute top-0 right-0 w-1.5 h-full" style={{ backgroundColor: secondaryColor }}></div>
              <p className="text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: primaryColor }}>تخصيص الواجهة النظامية</p>
              <h3 className="text-3xl font-black tracking-tighter mb-10">إعدادات المظهر العام</h3>

              <div className="space-y-12">
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-[#F2F0EA] pb-4">
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-tight">اللون الأساسي (الوارد)</h4>
                      <p className="text-[10px] opacity-40 uppercase font-bold mt-1">يستخدم لتمثيل التدفقات المالية الداخلة والتمييز البصري</p>
                    </div>
                    <input 
                      type="color" 
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-12 h-12 cursor-pointer border-none bg-transparent"
                    />
                  </div>

                  <div className="flex items-center justify-between border-b border-[#F2F0EA] pb-4">
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-tight">اللون الثانوي (المصروف)</h4>
                      <p className="text-[10px] opacity-40 uppercase font-bold mt-1">اللون الرئيسي للنصوص، المصروفات، وعناصر التحكم</p>
                    </div>
                    <input 
                      type="color" 
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-12 h-12 cursor-pointer border-none bg-transparent"
                    />
                  </div>
                </div>

                <div className="bg-[#F9F7F2] p-6 border-r-4" style={{ borderColor: primaryColor }}>
                  <h5 className="text-[10px] font-bold uppercase tracking-widest mb-4 opacity-60">معاينة التغييرات</h5>
                  <div className="flex gap-4">
                    <div className="flex-1 h-8 shadow-sm" style={{ backgroundColor: primaryColor }}></div>
                    <div className="flex-1 h-8 shadow-sm" style={{ backgroundColor: secondaryColor }}></div>
                  </div>
                  <p className="text-[9px] mt-4 leading-relaxed opacity-40 italic">
                    * يتم حفظ التغييرات تلقائياً في ذاكرة المتصفح. ستنعكس هذه الألوان على الرسوم البيانية وشريط التقدم فوراً.
                  </p>
                </div>

                <button 
                  onClick={() => {
                    setPrimaryColor('#A08C5B');
                    setSecondaryColor('#1A1A1A');
                  }}
                  className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-colors"
                >
                  استعادة ألوان النظام الافتراضية
                </button>

                <div className="pt-6 border-t border-[#F2F0EA] space-y-4">
                  <h4 className="text-[11px] font-black uppercase tracking-tighter">إدارة مشاريع البناء</h4>
                  <div className="space-y-3">
                    {buildings.map(b => (
                      <div key={b.id} className="bg-[#F2F0EA] p-3 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 flex items-center justify-center bg-white border border-[#E5E1D8]">
                              <BuildingIcon iconId={b.icon} size={16} />
                            </div>
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-tight">{b.name}</p>
                              <p className="text-[8px] opacity-40 font-bold uppercase">أنشئ في: {format(parseISO(b.createdAt), 'dd/MM/yyyy')}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => {
                                setEditingBuildingId(b.id);
                                setEditingBuildingName(b.name);
                                setEditingBuildingIcon(b.icon || 'building');
                              }}
                              className="p-1.5 text-slate-400 hover:text-[#1A1A1A]"
                            >
                              <Edit3 size={14} />
                            </button>
                            {buildings.length > 1 && (
                              <button 
                                onClick={() => deleteBuilding(b.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-500"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>

                        {editingBuildingId === b.id && (
                          <div className="bg-white p-3 border border-[#E5E1D8] space-y-3">
                            <div className="flex flex-wrap gap-1">
                              {BUILDING_ICONS.map(i => {
                                const Icon = i.icon;
                                return (
                                  <button
                                    key={i.id}
                                    onClick={() => setEditingBuildingIcon(i.id)}
                                    className={cn(
                                      "w-7 h-7 flex items-center justify-center border transition-all",
                                      editingBuildingIcon === i.id 
                                        ? "border-[#1A1A1A] bg-[#1A1A1A] text-white" 
                                        : "border-[#E5E1D8] text-slate-300"
                                    )}
                                  >
                                    <Icon size={12} />
                                  </button>
                                );
                              })}
                            </div>
                            <input 
                              type="text"
                              value={editingBuildingName}
                              onChange={(e) => setEditingBuildingName(e.target.value)}
                              className="w-full bg-[#F2F0EA] px-2 py-1.5 text-[10px] font-bold outline-none"
                            />
                            <div className="flex gap-2">
                              <button 
                                onClick={async () => {
                                  await db.buildings.update(b.id, { 
                                    name: editingBuildingName.trim(), 
                                    icon: editingBuildingIcon 
                                  });
                                  setEditingBuildingId(null);
                                }}
                                className="flex-1 py-1.5 bg-[#1A1A1A] text-white text-[9px] font-black uppercase"
                              >
                                حفظ
                              </button>
                              <button 
                                onClick={() => setEditingBuildingId(null)}
                                className="flex-1 py-1.5 bg-[#E5E1D8] text-[#1A1A1A] text-[9px] font-black uppercase"
                              >
                                إلغاء
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-[#F2F0EA] space-y-4">
                  <h4 className="text-[11px] font-black uppercase tracking-tighter">إدارة تصنيفات المواد</h4>
                  <div className="flex flex-wrap gap-2">
                    {dbCategories.map(cat => (
                      <div key={cat.id} className="group relative flex items-center gap-2 bg-[#F2F0EA] px-3 py-1.5 text-[9px] font-bold uppercase tracking-tight">
                        <span>{cat.name}</span>
                        {!DEFAULT_EXPENSE_CATEGORIES.includes(cat.name) && (
                          <button 
                            onClick={async () => {
                              if (confirm(`هل أنت متأكد من حذف تصنيف "${cat.name}"؟`)) {
                                await db.categories.delete(cat.id);
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-rose-500 hover:scale-110"
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-[8px] opacity-40 italic font-bold leading-relaxed">
                    * التصنيفات الافتراضية محصنة ضد الحذف لضمان سلامة هيكلية النظام. يمكنك حذف التصنيفات التي قمت بإضافتها يدوياً فقط.
                  </p>
                </div>

                <div className="pt-6 border-t border-[#F2F0EA] space-y-4">
                  <h4 className="text-[11px] font-black uppercase tracking-tighter">النسخ الاحتياطي ونقل البيانات</h4>
                  <p className="text-[9px] opacity-60 leading-relaxed pr-1">
                    استخدم هذه الميزة لنقل بياناتك من المتصفح إلى هاتفك أو العكس يدوياً، خاصة إذا واجهت مشاكل في الاتصال.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={exportData}
                      className="flex flex-col items-center justify-center p-4 border border-[#E5E1D8] bg-white hover:bg-[#F2F0EA] transition-all gap-2"
                    >
                      <Download size={16} className="text-[#A08C5B]" />
                      <span className="text-[9px] font-black uppercase">تصدير (Backup)</span>
                    </button>
                    <label className="flex flex-col items-center justify-center p-4 border border-[#E5E1D8] bg-white hover:bg-[#F2F0EA] transition-all gap-2 cursor-pointer">
                      <Upload size={16} className="text-emerald-600" />
                      <span className="text-[9px] font-black uppercase">استيراد (Restore)</span>
                      <input type="file" accept=".json" onChange={importData} className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="pt-6 border-t border-[#F2F0EA] space-y-4">
                  <h4 className="text-[11px] font-black uppercase tracking-tighter">العمل المستقل ومشاركة النظام</h4>
                  <div className="bg-[#1A1A1A] p-5 text-white space-y-4 rounded-sm">
                    <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                      <div className="bg-[#A08C5B] p-2 rounded-sm text-white shadow-lg">
                        <Smartphone size={18} />
                      </div>
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-tight">التشغيل كتطبيق جوال مستقل</p>
                        <p className="text-[9px] opacity-60">بياناتك مخزنة محلياً بالكامل - يعمل بدون إنترنت</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <p className="text-[10px] font-bold text-[#A08C5B]">كيفية التثبيت على الهاتف:</p>
                      <ul className="text-[9px] space-y-2 opacity-80 leading-relaxed pr-4 list-disc">
                        <li><b>للأندرويد:</b> من متصفح Chrome، اضغط على النقاط الثلاث واختر "إضافة لشاشة الهاتف".</li>
                        <li><b>للآيفون:</b> من متصفح Safari، اضغط على زر المشاركة ثم "إضافة للشاشة الرئيسية".</li>
                      </ul>
                    </div>
                    <div className="pt-2">
                      <button 
                        onClick={shareApp}
                        className="w-full bg-[#A08C5B] py-3 text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-[#1A1A1A] transition-all flex items-center justify-center gap-2"
                      >
                        <Share2 size={14} />
                        مشاركة رابط النظام وتصديره
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-[#F2F0EA] space-y-4">
                  <h4 className="text-[11px] font-black uppercase tracking-tighter text-rose-600">منطقة الحظر والمسح</h4>
                  <button 
                    onClick={async () => {
                      if (confirm('سيتم حذف جميع البيانات والعودة للوضع الافتراضي. هل أنت متأكد من مسح الذاكرة المحلية؟')) {
                        await db.transactions.clear();
                        await db.buildings.clear();
                        await db.categories.clear();
                        localStorage.clear();
                        window.location.reload();
                      }
                    }}
                    className="w-full border border-rose-200 py-3 text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 size={12} />
                    مسح كافة بيانات النظام نهائياً
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between border-b-2 border-[#1A1A1A] pb-4 gap-4">
                <div>
                  <h3 className="text-3xl font-black tracking-tighter italic">سجل الاعتمادات المالية</h3>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">{transactions.length} سجلاً موثقاً</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button 
                    onClick={exportToCSV}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#A08C5B] text-[#F9F7F2] px-6 py-2.5 text-[10px] uppercase font-bold tracking-widest hover:opacity-90 transition-all border-b-4 border-[#1A1A1A]"
                  >
                    <ArrowDownCircle size={14} />
                    تصدير ملف CSV
                  </button>
                  <button 
                    onClick={generatePDFReport}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#1A1A1A] text-[#F9F7F2] px-6 py-2.5 text-[10px] uppercase font-bold tracking-widest hover:opacity-90 transition-all border-b-4 border-[#A08C5B]"
                  >
                    <History size={14} />
                    إصدار تقرير (PDF / طباعة)
                  </button>
                </div>
              </div>

              {/* Filters Section */}
              <div className="bg-white border border-[#E5E1D8] p-6 space-y-6">
                <div className="flex items-center gap-2 opacity-40">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">تصفية السجلات</span>
                  <div className="h-px flex-1 bg-[#1A1A1A] opacity-10"></div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase opacity-40">البحث بالبيان</label>
                    <input 
                      type="text"
                      className="w-full bg-[#F2F0EA] p-2 text-xs font-bold outline-none border-b-2 border-transparent focus:border-[#A08C5B]"
                      placeholder="كلمة البحث..."
                      value={searchTitle}
                      onChange={(e) => setSearchTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase opacity-40">نوع العملية</label>
                    <select 
                      className="w-full bg-[#F2F0EA] p-2 text-xs font-bold outline-none"
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value as any)}
                    >
                      <option value="ALL">الكل</option>
                      <option value="INCOME">الوارد (+)</option>
                      <option value="EXPENSE">المنصرف (-)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase opacity-40">تصنيف المادة</label>
                    <select 
                      className="w-full bg-[#F2F0EA] p-2 text-xs font-bold outline-none"
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                    >
                      <option value="ALL">الكل</option>
                      {Array.from(new Set([
                        ...DEFAULT_EXPENSE_CATEGORIES,
                        ...dbCategories.map(c => c.name),
                        ...transactions.map(t => t.category)
                      ])).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase opacity-40">تاريخ من</label>
                    <input 
                      type="date"
                      className="w-full bg-[#F2F0EA] p-2 text-xs font-bold outline-none"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase opacity-40">تاريخ إلى</label>
                    <input 
                      type="date"
                      className="w-full bg-[#F2F0EA] p-2 text-xs font-bold outline-none"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Monthly Visual Record */}
              <div className="no-print bg-white border border-[#E5E1D8] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 opacity-40">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">تحليل التدفق الشهري المفلتر</span>
                    <div className="h-px w-12 bg-[#1A1A1A] opacity-10"></div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-[#1A1A1A]"></div>
                      <span className="text-[8px] font-bold uppercase tracking-widest opacity-40">الوارد</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-[#A08C5B]"></div>
                      <span className="text-[8px] font-bold uppercase tracking-widest opacity-40">المصروف</span>
                    </div>
                  </div>
                </div>

                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={historyMonthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F2F0EA" />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 9, fontWeight: 700, fill: '#1A1A1A', opacity: 0.4 }} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 9, fontWeight: 700, fill: '#1A1A1A', opacity: 0.4 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1A1A1A', 
                          border: 'none', 
                          borderRadius: '0', 
                          color: '#F9F7F2',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          textAlign: 'right'
                        }}
                        itemStyle={{ color: '#F9F7F2' }}
                        cursor={{ fill: '#F2F0EA', opacity: 0.5 }}
                      />
                      <Bar dataKey="income" fill="#1A1A1A" radius={[2, 2, 0, 0]} barSize={25} />
                      <Bar dataKey="expenses" fill="#A08C5B" radius={[2, 2, 0, 0]} barSize={25} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white border border-[#E5E1D8] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="bg-[#F2F0EA] text-[#1A1A1A] text-[11px] uppercase tracking-widest font-black border-b border-[#E5E1D8]">
                        <th className="px-6 py-4">التاريخ</th>
                        <th className="px-6 py-4">البيان والمادة</th>
                        <th className="px-6 py-4">التصنيف</th>
                        <th className="px-6 py-4 text-center">الكمية</th>
                        <th className="px-6 py-4">القيمة الإجمالية</th>
                        <th className="px-6 py-4 text-center">التحكم</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F2F0EA] text-sm">
                      {groupedHistoryTransactions.length > 0 ? (
                        groupedHistoryTransactions.map((group) => (
                          <React.Fragment key={group.sortKey}>
                            {/* Monthly Header Row */}
                            <tr 
                              className="bg-[#F9F7F2]/80 cursor-pointer hover:bg-[#F2F0EA] transition-colors border-y border-[#E5E1D8]"
                              onClick={() => toggleMonth(group.sortKey)}
                            >
                              <td colSpan={6} className="px-6 py-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className={cn(
                                      "transition-transform duration-300",
                                      expandedMonths.includes(group.sortKey) ? "rotate-0" : "-rotate-90"
                                    )}>
                                      <ChevronDown size={14} className="opacity-40" />
                                    </div>
                                    <span className="text-sm font-black tracking-tight">{group.month}</span>
                                  </div>
                                  <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest opacity-40">
                                    <span className="bg-[#1A1A1A] text-[#F9F7F2] px-2 py-0.5">{group.transactions.length} سجلات</span>
                                    <span className="tabular-nums">
                                      صافي التدفق: {group.transactions.reduce((acc, curr) => acc + (curr.type === 'INCOME' ? curr.amount : -curr.amount), 0).toLocaleString()} ج.س
                                    </span>
                                  </div>
                                </div>
                              </td>
                            </tr>
                            
                            {/* Transaction Rows within this month */}
                            {expandedMonths.includes(group.sortKey) && group.transactions.map((t) => (
                              <tr key={t.id} className="hover:bg-[#F9F7F2] transition-colors group">
                                <td className="px-6 py-4 opacity-50 font-bold tabular-nums">
                                  {format(parseISO(t.date), 'dd/MM')}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col">
                                    <span className="font-bold tracking-tight">{t.title}</span>
                                    <span className="text-[8px] uppercase tracking-widest opacity-30 mt-0.5">
                                      {buildings.find(b => b.id === t.buildingId)?.name}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={cn(
                                    "px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter border",
                                    t.type === 'INCOME' ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-slate-200 text-slate-500 bg-slate-50"
                                  )}>
                                    {t.category}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center tabular-nums font-medium">
                                  {t.quantity || '-'}
                                </td>
                                <td className="px-6 py-4 font-black tabular-nums">
                                  <span className={t.type === 'INCOME' ? "text-emerald-700" : "text-[#1A1A1A]"}>
                                    {t.type === 'INCOME' ? '+' : ''} {t.amount.toLocaleString()}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <div className="flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                      onClick={() => startEdit(t)}
                                      className="text-slate-300 hover:text-[#A08C5B] transition-colors"
                                      title="تعديل"
                                    >
                                      <Edit3 size={16} />
                                    </button>
                                    <button 
                                      onClick={() => deleteTransaction(t.id)}
                                      className="text-slate-300 hover:text-rose-500 transition-colors"
                                      title="حذف"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                            بانتظار توثيق أول عملية مالية...
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Info */}
      <footer className="no-print max-w-5xl mx-auto p-8 flex flex-col md:flex-row justify-between items-center text-[10px] font-bold uppercase tracking-[0.2em] opacity-30 border-t border-[#E5E1D8] mt-12 gap-4">
        <div className="flex gap-4">
          <span>BUNYAN CONSTRUCTION v2.6</span>
          <span className="px-2 border-r border-[#1A1A1A]">بواسطة صالح محمد</span>
        </div>
        <span>CONFIDENTIAL PROPERTY RECORDS © {new Date().getFullYear()}</span>
      </footer>

      {/* Printable Report Template */}
      <div ref={reportRef} className="print-only p-8 text-right" dir="rtl">
        <div className="flex items-end justify-between border-b-4 border-[#1A1A1A] pb-8 mb-12">
          <div>
            <h1 className="text-5xl font-black mb-2">تقرير مشروع بنيان</h1>
            <p className="text-xs uppercase font-bold tracking-widest text-[#666666]">نظام المتابعة الإنشائية وإدارة الميزانية</p>
          </div>
          <div className="text-left">
            <p className="text-[10px] font-bold uppercase text-[#999999] mb-1">تاريخ الإصدار</p>
            <p className="text-lg font-black">{format(new Date(), 'dd/MM/yyyy')}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12 mb-12">
          <div className="bg-[#F9F7F2] p-8 border border-[#E5E1D8]">
            <p className="text-[10px] font-bold uppercase text-[#999999] mb-2">معلومات المشروع</p>
            <p className="text-2xl font-black">{activeBuilding?.name || 'مشروع جديد'}</p>
            <div className="flex justify-between items-end mt-4">
              <p className="text-[10px] text-[#666666] italic tracking-tight">إعداد: صالح محمد</p>
              <div className="text-left">
                <p className="text-[8px] font-bold uppercase text-[#999999] mb-0.5">نسبة استهلاك السيولة</p>
                <p className="text-lg font-black text-[#1A1A1A]">
                  {stats.totalIncome > 0 ? ((stats.totalExpenses / stats.totalIncome) * 100).toFixed(1) : '0'}%
                </p>
              </div>
            </div>
            {/* Simple Progress Bar */}
            <div className="w-full h-1.5 bg-[#E5E1D8] mt-2 rounded-full overflow-hidden">
               <div 
                 className="h-full bg-[#1A1A1A]" 
                 style={{ width: `${Math.min(100, stats.totalIncome > 0 ? (stats.totalExpenses / stats.totalIncome) * 100 : 0)}%` }}
               />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="border border-[#a7f3d0] bg-[#ecfdf5] p-4">
              <p className="text-[8px] font-bold uppercase text-[#065f46] mb-1 tracking-widest">إجمالي المودع</p>
              <p className="text-xl font-black text-[#064e3b]">{stats.totalIncome.toLocaleString()}</p>
            </div>
            <div className="border border-[#e2e8f0] bg-[#f8fafc] p-4">
              <p className="text-[8px] font-bold uppercase text-[#1e293b] mb-1 tracking-widest">إجمالي المنفذ</p>
              <p className="text-xl font-black text-[#0f172a]">{stats.totalExpenses.toLocaleString()}</p>
            </div>
            <div className={cn(
              "p-4 border",
              stats.balance >= 0 ? "border-[#a7f3d0] bg-[#ecfdf5]" : "border-[#fecdd3] bg-[#fff1f2]"
            )}>
              <p className="text-[8px] font-bold uppercase mb-1 tracking-widest">صافي الرصيد</p>
              <p className={cn("text-xl font-black", stats.balance >= 0 ? "text-[#064e3b]" : "text-[#881337]")}>
                {stats.balance >= 0 ? '+' : ''}{stats.balance.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        
        {/* Category Summary Table */}
        <div className="mb-12">
          <h3 className="text-lg font-black border-b-2 border-[#1A1A1A] pb-2 mb-4 uppercase">ملخص التكاليف والموردات حسب التصنيف</h3>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-[#1A1A1A] text-[#FFFFFF]">
                <th className="p-2 text-right">التصنيف</th>
                <th className="p-2 text-right">إجمالي الوارد (+)</th>
                <th className="p-2 text-right">إجمالي المنصرف (-)</th>
                <th className="p-2 text-right">الرصيد المخصص</th>
              </tr>
            </thead>
            <tbody>
              {categoryStats.map((item, idx) => (
                <tr key={idx} className="border-b border-[#F2F0EA]">
                  <td className="p-2 font-bold">{item.name}</td>
                  <td className="p-2 font-black text-[#047857]">{item.income > 0 ? item.income.toLocaleString() : '-'}</td>
                  <td className="p-2 font-black text-[#be123c]">{item.expense > 0 ? item.expense.toLocaleString() : '-'}</td>
                  <td className={cn(
                    "p-2 font-black tabular-nums",
                    (item.income - item.expense) >= 0 ? "text-[#064e3b]" : "text-[#881337]"
                   )}>
                    {(item.income - item.expense).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#F2F0EA] font-black">
                <td className="p-2">الإجمالي العام</td>
                <td className="p-2 text-[#047857]">{stats.totalIncome.toLocaleString()}</td>
                <td className="p-2 text-[#be123c]">{stats.totalExpenses.toLocaleString()}</td>
                <td className={cn(
                  "p-2 tabular-nums",
                  stats.balance >= 0 ? "text-[#064e3b]" : "text-[#881337]"
                )}>
                  {stats.balance.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Merged Transaction Ledger */}
        <div className="mb-12">
          <h3 className="text-lg font-black border-b-2 border-[#1A1A1A] pb-2 mb-4 uppercase flex justify-between items-center">
            <span>كشف الحساب التفصيلي (المنصرف والمقبوض)</span>
            <span className="text-xs font-bold text-[#888888]">{activeTransactions.length} عملية</span>
          </h3>
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-[#1A1A1A] text-[#FFFFFF]">
                <th className="p-2 text-right">التاريخ</th>
                <th className="p-2 text-right">البيان / الغرض</th>
                <th className="p-2 text-right">التصنيف</th>
                <th className="p-2 text-right">إيداع (+)</th>
                <th className="p-2 text-right">مصروف (-)</th>
                <th className="p-2 text-right">الرصيد المتبقي</th>
              </tr>
            </thead>
            <tbody>
              {ledgerTransactions.map((t, idx) => (
                <tr key={idx} className="border-b border-[#F2F0EA]">
                  <td className="p-2 font-bold text-[#666666] tabular-nums">{format(parseISO(t.date), 'dd/MM/yyyy')}</td>
                  <td className="p-2 font-black">{t.title}</td>
                  <td className="p-2 text-[#888888]">{t.category}</td>
                  <td className="p-2 font-black text-[#047857]">
                    {t.type === 'INCOME' ? t.amount.toLocaleString() : '-'}
                  </td>
                  <td className="p-2 font-black text-[#be123c]">
                    {t.type === 'EXPENSE' ? t.amount.toLocaleString() : '-'}
                  </td>
                  <td className={cn(
                    "p-2 font-black tabular-nums border-r border-[#E5E1D8]",
                    t.runningBalance >= 0 ? "text-[#064e3b] bg-[#ecfdf5]" : "text-[#881337] bg-[#fff1f2]"
                  )}>
                    {t.runningBalance.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#F2F0EA] font-black">
                <td colSpan={3} className="p-2">الإجمالي النهائي للرصيد</td>
                <td className="p-2 text-[#047857]">{stats.totalIncome.toLocaleString()}</td>
                <td className="p-2 text-[#be123c]">{stats.totalExpenses.toLocaleString()}</td>
                <td className={cn(
                  "p-2 tabular-nums border-r-2 border-[#1A1A1A]",
                  stats.balance >= 0 ? "text-[#064e3b] bg-[#d1fae5]" : "text-[#881337] bg-[#ffe4e6]"
                )}>
                  {stats.balance.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="pt-12 border-t-2 border-[#1A1A1A] flex justify-between items-center text-[#999999] text-[9px] font-bold uppercase tracking-[0.3em]">
          <span>نظام تصدير إطار عمل بنيان</span>
          <span>© {new Date().getFullYear()} سجلات المشروع السرية</span>
        </div>
      </div>
    </div>
  );
}
