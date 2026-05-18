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
  ListFilter,
  Home,
  HardHat,
  Construction,
  Factory,
  Warehouse,
  Hammer,
  Share2,
  Smartphone,
  Download,
  Upload,
  Search,
  X,
  Tag,
  Eye,
  FileText,
  Printer,
  Store,
  School,
  Hotel,
  Church,
  Hospital,
  Gavel,
  Landmark,
  Truck,
  Ruler,
  Component,
  Boxes,
  Paintbrush,
  MapPin,
  Mountain,
  Palmtree,
  Trees,
  Sun,
  Moon,
  Star,
  Zap,
  Anchor,
  Compass,
  Map,
  Camera,
  Globe,
  Music,
  Heart,
  ShoppingCart,
  Package,
  Award,
  FlaskConical,
  GraduationCap,
  CreditCard,
  Coins,
  Network
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { cn } from './lib/utils';
import { Transaction, TransactionType, MonthlyStats, Building, Category, BuildingAccount, UserRole } from './types';
import { auth, db as fdb, handleFirestoreError, OperationType } from './lib/firebase';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc as fAddDoc,
  setDoc as fSetDoc,
  updateDoc as fUpdateDoc,
  deleteDoc as fDeleteDoc,
  doc as fDoc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { Login } from './components/Login';
import { UserManagement } from './components/UserManagement';
import { 
  LogIn, 
  LogOut, 
  User as UserIcon,
  Cloud,
  CloudOff
} from 'lucide-react';

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
  { id: 'briefcase', icon: Briefcase },
  { id: 'store', icon: Store },
  { id: 'school', icon: School },
  { id: 'hotel', icon: Hotel },
  { id: 'church', icon: Church },
  { id: 'hospital', icon: Hospital },
  { id: 'gavel', icon: Gavel },
  { id: 'landmark', icon: Landmark },
  { id: 'truck', icon: Truck },
  { id: 'ruler', icon: Ruler },
  { id: 'component', icon: Component },
  { id: 'boxes', icon: Boxes },
  { id: 'paintbrush', icon: Paintbrush },
  { id: 'mappin', icon: MapPin },
  { id: 'mountain', icon: Mountain },
  { id: 'palmtree', icon: Palmtree },
  { id: 'trees', icon: Trees },
  { id: 'sun', icon: Sun },
  { id: 'moon', icon: Moon },
  { id: 'star', icon: Star },
  { id: 'zap', icon: Zap },
  { id: 'anchor', icon: Anchor },
  { id: 'compass', icon: Compass },
  { id: 'map', icon: Map },
  { id: 'camera', icon: Camera },
  { id: 'globe', icon: Globe },
  { id: 'music', icon: Music },
  { id: 'heart', icon: Heart },
  { id: 'shopping-cart', icon: ShoppingCart },
  { id: 'package', icon: Package },
  { id: 'award', icon: Award },
  { id: 'flask', icon: FlaskConical },
  { id: 'graduation', icon: GraduationCap }
];

const CATEGORY_COLORS = [
  '#1A1A1A', // Black
  '#A08C5B', // Gold
  '#403D39', // Dark Gray
  '#8C7A4B', // Muted Gold
  '#065F46', // Emerald
  '#9F1239', // Rose
  '#1E3A8A', // Blue
  '#7C3AED', // Violet
  '#B45309', // Amber
  '#155E75', // Cyan
];

const BuildingIcon = ({ iconId, size = 16, className = "" }: { iconId?: string, size?: number, className?: string }) => {
  const iconObj = BUILDING_ICONS.find(i => i.id === iconId) || BUILDING_ICONS.find(i => i.id === 'building') || BUILDING_ICONS[0];
  const IconComponent = iconObj.icon;
  return <IconComponent size={size} className={className} />;
};

const CategoryIcon = ({ iconId, size = 16, className = "", color, type }: { iconId?: string, size?: number, className?: string, color?: string, type?: TransactionType }) => {
  const iconObj = BUILDING_ICONS.find(i => i.id === iconId);
  let IconComponent = iconObj ? iconObj.icon : Tag;
  
  if (!iconId && type) {
    IconComponent = type === 'INCOME' ? TrendingUp : TrendingDown;
  }
  
  if (color) {
    return (
      <div 
        className={cn("flex items-center justify-center rounded-sm text-white shadow-sm", className)}
        style={{ backgroundColor: color }}
      >
        <IconComponent size={size} />
      </div>
    );
  }
  
  return <IconComponent size={size} className={className} />;
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserRole | null>(() => {
    const saved = localStorage.getItem('bunyan_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSlowLoading, setIsSlowLoading] = useState(false);
  const [mainError, setMainError] = useState<Error | null>(null);

  // Firestore sync states
  const [fBuildings, setFBuildings] = useState<Building[]>([]);
  const [fTransactions, setFTransactions] = useState<Transaction[]>([]);
  const [fAccounts, setFAccounts] = useState<BuildingAccount[]>([]);
  const [fCategories, setFCategories] = useState<Category[]>([]);
  const [isFSyncing, setIsFSyncing] = useState(false);

  // Firebase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Find or create profile logic is handled in Login.tsx, but here we just listen for state
        // To be safe, we should fetch the user doc here too if not in state
        if (!currentUser) {
          const userRef = fDoc(fdb, 'users', user.uid);
          const { getDoc } = await import('firebase/firestore');
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data() as UserRole;
            setCurrentUser(userData);
            localStorage.setItem('bunyan_user', JSON.stringify(userData));
          }
        }
      } else {
        setCurrentUser(null);
        localStorage.removeItem('bunyan_user');
      }
    });
    return () => unsubscribe();
  }, []);

  // Firestore Synchronization
  useEffect(() => {
    if (!currentUser) return;

    setIsFSyncing(true);

    const qBuildings = query(collection(fdb, 'buildings'), where('firmId', '==', currentUser.firmId));
    const unsubBuildings = onSnapshot(qBuildings, (snap) => {
      setFBuildings(snap.docs.map(d => ({ ...d.data(), id: d.id }) as Building));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'buildings'));

    const qTransactions = query(collection(fdb, 'transactions'), where('firmId', '==', currentUser.firmId));
    const unsubTransactions = onSnapshot(qTransactions, (snap) => {
      setFTransactions(snap.docs.map(d => ({ ...d.data(), id: d.id }) as Transaction));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'transactions'));

    const qAccounts = query(collection(fdb, 'accounts'), where('firmId', '==', currentUser.firmId));
    const unsubAccounts = onSnapshot(qAccounts, (snap) => {
      setFAccounts(snap.docs.map(d => ({ ...d.data(), id: d.id }) as BuildingAccount));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'accounts'));

    const qCategories = query(collection(fdb, 'categories'), where('firmId', '==', currentUser.firmId));
    const unsubCategories = onSnapshot(qCategories, (snap) => {
      setFCategories(snap.docs.map(d => ({ ...d.data(), id: d.id }) as Category));
      setIsFSyncing(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'categories'));

    return () => {
      unsubBuildings();
      unsubTransactions();
      unsubAccounts();
      unsubCategories();
    };
  }, [currentUser?.firmId]);

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

  const accountsData = useLiveQuery(async () => {
    try {
      return await db.accounts.toArray();
    } catch (e) {
      return [];
    }
  });

  const buildings = currentUser ? fBuildings : (buildingsData || []);
  const transactions = currentUser ? fTransactions : (transactionsData || []);
  const dbCategories = currentUser ? fCategories : (dbCategoriesData || []);
  const accounts = currentUser ? fAccounts : (accountsData || []);

  const isInitialized = buildingsData !== undefined && transactionsData !== undefined && dbCategoriesData !== undefined && accountsData !== undefined;

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

  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  const [currencySymbol, setCurrencySymbol] = useState(() => {
    return localStorage.getItem('bunyan_currency_symbol') || 'ج.س';
  });

  const [currencyPosition, setCurrencyPosition] = useState<'BEFORE' | 'AFTER'>(() => {
    return (localStorage.getItem('bunyan_currency_position') as 'BEFORE' | 'AFTER') || 'AFTER';
  });

  useEffect(() => {
    localStorage.setItem('bunyan_currency_symbol', currencySymbol);
  }, [currencySymbol]);

  useEffect(() => {
    localStorage.setItem('bunyan_currency_position', currencyPosition);
  }, [currencyPosition]);

  const formatCurrency = (amount: number) => {
    const cleanAmount = isNaN(amount) ? 0 : amount;
    const formattedAmount = cleanAmount.toLocaleString();
    return currencyPosition === 'BEFORE' 
      ? `${currencySymbol} ${formattedAmount}` 
      : `${formattedAmount} ${currencySymbol}`;
  };

  const [dismissedAlerts, setDismissedAlerts] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('bunyan_dismissed_alerts');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('bunyan_dismissed_alerts', JSON.stringify(dismissedAlerts));
  }, [dismissedAlerts]);

  const [isBuildingMenuOpen, setIsBuildingMenuOpen] = useState(false);
  const [viewingBuildingDetails, setViewingBuildingDetails] = useState<Building | null>(null);
  const [newBuildingName, setNewBuildingName] = useState('');
  const [newBuildingIcon, setNewBuildingIcon] = useState('building');
  
  const [editingBuildingId, setEditingBuildingId] = useState<string | null>(null);
  const [editingBuildingName, setEditingBuildingName] = useState('');
  const [editingBuildingIcon, setEditingBuildingIcon] = useState('building');
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'income' | 'expenses' | 'chart' | 'history' | 'settings'>('dashboard');
  const [expandedAccounts, setExpandedAccounts] = useState<string[]>([]);
  const [expandedMonths, setExpandedMonths] = useState<string[]>([]);
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [chartProjectSearch, setChartProjectSearch] = useState('');

  const [isMigrating, setIsMigrating] = useState(false);

  const migrateLocalDataToCloud = async () => {
    if (!currentUser || isMigrating) return;
    
    const count = (buildingsData?.length || 0) + (transactionsData?.length || 0) + (accountsData?.length || 0) + (dbCategoriesData?.length || 0);
    if (count === 0) {
      triggerToast('لا يوجد بيانات محلية لنقلها');
      return;
    }

    if (!confirm(`هل أنت متأكد من رغبتك في نقل ${count} سجل من البيانات المحلية إلى حسابك السحابي؟ القيمة الحالية في السحابة قد تتأثر.`)) {
      return;
    }

    setIsMigrating(true);
    try {
      const batch = writeBatch(fdb);
      let ops = 0;

      // Migrate Buildings
      if (buildingsData) {
        for (const b of buildingsData) {
          if (ops >= 480) break;
          if (!fBuildings.find(fb => fb.id === b.id)) {
            const docRef = fDoc(fdb, 'buildings', b.id);
            batch.set(docRef, { 
              ...b, 
              ownerId: currentUser.uid, 
              firmId: currentUser.firmId 
            });
            ops++;
          }
        }
      }

      // Migrate Categories
      if (dbCategoriesData && ops < 480) {
        for (const c of dbCategoriesData) {
          if (ops >= 480) break;
          if (!fCategories.find(fc => fc.id === c.id)) {
            const docRef = fDoc(fdb, 'categories', c.id);
            batch.set(docRef, { 
              ...c, 
              ownerId: currentUser.uid, 
              firmId: currentUser.firmId 
            });
            ops++;
          }
        }
      }

      // Migrate Accounts
      if (accountsData && ops < 480) {
        for (const a of accountsData) {
          if (ops >= 480) break;
          if (!fAccounts.find(fa => fa.id === a.id)) {
            const docRef = fDoc(fdb, 'accounts', a.id);
            batch.set(docRef, { 
              ...a, 
              ownerId: currentUser.uid, 
              firmId: currentUser.firmId 
            });
            ops++;
          }
        }
      }

      // Migrate Transactions
      if (transactionsData && ops < 480) {
        for (const t of transactionsData) {
          if (ops >= 480) break;
          if (!fTransactions.find(ft => ft.id === t.id)) {
            const docRef = fDoc(fdb, 'transactions', t.id);
            batch.set(docRef, { 
              ...t, 
              ownerId: currentUser.uid, 
              firmId: currentUser.firmId 
            });
            ops++;
          }
        }
      }

      if (ops > 0) {
        await batch.commit();
        triggerToast(`تم بنجاح نقل ${ops} سجل إلى السحابة`);
      } else {
        triggerToast('جميع البيانات المحلية موجودة بالفعل في السحابة');
      }
    } catch (e) {
      console.error('Migration error:', e);
      handleFirestoreError(e, OperationType.WRITE, 'migration');
    } finally {
      setIsMigrating(false);
    }
  };

  const normalizeArabic = (text: string) => {
    if (!text) return '';
    return text
      .trim()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/[ًٌٍَُِّْ]/g, '') // Remove Tashkeel (Diacritics)
      .toLowerCase();
  };
  
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

      // Only show migration toast if there is actually something to migrate
      const hasDataToMigrate = savedBuildings || savedTransactions;
      
      try {
        if (hasDataToMigrate) {
          triggerToast('جاري استعادة البيانات والتهجئة للنظام الجديد...');
        }

        if (savedBuildings) {
          try {
            const buildingsData: Building[] = JSON.parse(savedBuildings);
            if (Array.isArray(buildingsData) && buildingsData.length > 0) {
              await db.buildings.bulkPut(buildingsData);
            }
          } catch (e) {
            console.error('Error parsing buildings for migration:', e);
          }
        }

        // Ensure at least one building exists
        const buildingsCount = await db.buildings.count();
        if (buildingsCount === 0) {
          await db.buildings.put({ 
            id: 'default', 
            name: 'المشروع الأساسي', 
            createdAt: new Date().toISOString(), 
            icon: 'building' 
          });
        }

        // Initialize categories if empty
        const existingCats = await db.categories.count();
        if (existingCats === 0) {
          const incomeCat: Category = {
            id: 'cat_income',
            name: 'وارد',
            type: 'INCOME',
            color: CATEGORY_COLORS[4] // Emerald
          };
          const catData: Category[] = [
            incomeCat,
            ...DEFAULT_EXPENSE_CATEGORIES.map((name, index) => ({
              id: `cat_${Math.random().toString(36).substr(2, 9)}`,
              name,
              type: 'EXPENSE' as TransactionType,
              color: CATEGORY_COLORS[index % CATEGORY_COLORS.length]
            }))
          ];
          await db.categories.bulkAdd(catData);
        }

        if (savedTransactions) {
          try {
            const transactionsData: Transaction[] = JSON.parse(savedTransactions);
            if (Array.isArray(transactionsData) && transactionsData.length > 0) {
              await db.transactions.bulkPut(transactionsData);
            }
          } catch (e) {
            console.error('Error parsing transactions for migration:', e);
          }
        }

        // Mark as migrated successfully
        localStorage.setItem('bunyan_migrated_to_indexeddb', 'true');
        
        if (hasDataToMigrate) {
          triggerToast('تمت تهجئة البيانات بنجاح إلى قاعدة البيانات المحلية');
        }
      } catch (error) {
        console.error('Data migration fatal error:', error);
        triggerToast('حدث خطأ أثناء تهجئة البيانات. يرجى المحاولة لاحقاً');
      }
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
  const [newCategoryColor, setNewCategoryColor] = useState(CATEGORY_COLORS[0]);
  const [newCategoryIcon, setNewCategoryIcon] = useState('tag');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingCategoryColor, setEditingCategoryColor] = useState('');
  const [editingCategoryIcon, setEditingCategoryIcon] = useState('tag');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [unitPrice, setUnitPrice] = useState<number | ''>('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Account Management States
  const [addingAccountToBuildingId, setAddingAccountToBuildingId] = useState<string | null>(null);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState<'CASH' | 'BANK' | 'CREDIT' | 'OTHER'>('CASH');
  const [newAccountInitialBalance, setNewAccountInitialBalance] = useState<number | ''>('');
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editingAccountName, setEditingAccountName] = useState('');
  const [editingAccountType, setEditingAccountType] = useState<'CASH' | 'BANK' | 'CREDIT' | 'OTHER'>('CASH');
  const [editingAccountInitialBalance, setEditingAccountInitialBalance] = useState<number | ''>('');

  const updateAccount = async () => {
    if (!editingAccountId || !editingAccountName.trim()) return;
    
    if (currentUser) {
      try {
        const accRef = fDoc(fdb, 'accounts', editingAccountId);
        await fUpdateDoc(accRef, {
          name: editingAccountName.trim(),
          type: editingAccountType,
          initialBalance: Number(editingAccountInitialBalance) || 0
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `accounts/${editingAccountId}`);
      }
    } else {
      await db.accounts.update(editingAccountId, {
        name: editingAccountName.trim(),
        type: editingAccountType,
        initialBalance: Number(editingAccountInitialBalance) || 0
      });
    }

    setEditingAccountId(null);
    triggerToast('تم تحديث الحساب');
  };

  const resetFilters = () => {
    setSearchTitle('');
    setFilterCategory('ALL');
    setFilterType('ALL');
    setFilterAccountId('ALL');
    setStartDate('');
    setEndDate('');
    // For building, we reset to the first building if 'default' isn't available
    if (buildings.length > 0) {
      setActiveBuildingId(buildings[0].id);
    } else {
      setActiveBuildingId('default');
    }
    setSearchTerm(''); // Clear global search too
  };

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
  const [filterAccountId, setFilterAccountId] = useState<string>('ALL');
  const [selectedTransactionDetail, setSelectedTransactionDetail] = useState<Transaction | null>(null);

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

  const activeBuilding = useMemo(() => {
    if (activeBuildingId === 'ALL') {
      return { id: 'ALL', name: 'كل المشاريع', icon: 'building' } as Building;
    }
    return buildings.find(b => b.id === activeBuildingId) || buildings[0];
  }, [buildings, activeBuildingId]);

  const activeTransactions = useMemo(() => 
    transactions.filter(t => t.buildingId === activeBuildingId || activeBuildingId === 'ALL'),
  [transactions, activeBuildingId]);

  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const lowerSearch = searchTerm.toLowerCase();
    return activeTransactions.filter(t => 
      t.title.toLowerCase().includes(lowerSearch) ||
      t.category.toLowerCase().includes(lowerSearch) ||
      (t.note && t.note.toLowerCase().includes(lowerSearch))
    );
  }, [activeTransactions, searchTerm]);

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

  const PIE_COLORS = [secondaryColor, primaryColor, '#D1C7B7', '#403D39', '#E5E1D8', '#8C7A4B'];

  const categoryStats = useMemo(() => {
    const cats: Record<string, { income: number; expense: number; color: string }> = {};
    activeTransactions.forEach(t => {
      const catName = t.category || 'غير مصنف';
      if (!cats[catName]) {
        const dbCat = dbCategories.find(c => c.name === catName);
        cats[catName] = { 
          income: 0, 
          expense: 0, 
          color: dbCat?.color || PIE_COLORS[Object.keys(cats).length % PIE_COLORS.length] 
        };
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
      value: values.expense,
      color: values.color
    }));
  }, [activeTransactions, dbCategories, PIE_COLORS]);

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
        const accountMatch = filterAccountId === 'ALL' || t.accountId === filterAccountId;
        return titleMatch && typeMatch && startMatch && endMatch && categoryMatch && accountMatch;
      }).sort((a,b) => b.date.localeCompare(a.date));
  }, [transactions, activeBuildingId, searchTitle, filterType, startDate, endDate, filterCategory, filterAccountId]);

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

  const addTransaction = async (type: TransactionType) => {
    if (!title || !amount || Number(amount) <= 0) return;

    // Validation: if accounts exist for this building, one must be selected
    const buildingAccounts = accounts.filter(a => a.buildingId === activeBuildingId || activeBuildingId === 'ALL');
    if (buildingAccounts.length > 0 && !accountId) {
      triggerToast('يرجى تحديد الحساب المالي لإتمام العملية');
      return;
    }

    // Determine target buildingId
    let targetBuildingId = activeBuildingId;
    if (accountId) {
      const selectedAcc = accounts.find(a => a.id === accountId);
      if (selectedAcc) {
        targetBuildingId = selectedAcc.buildingId;
      }
    }

    if (targetBuildingId === 'ALL') {
      triggerToast('يرجى اختيار حساب مالي محدد لتحديد المشروع التابع له');
      return;
    }

    if (currentUser) {
      try {
        let finalCategory = category;
        if (type === 'EXPENSE' && isAddingCategory && newCategoryName.trim()) {
           const newCat: Category = {
            id: `cat_${Math.random().toString(36).substr(2, 9)}`,
            name: newCategoryName.trim(),
            type: 'EXPENSE',
            color: newCategoryColor,
            icon: newCategoryIcon,
            ownerId: currentUser.uid,
            firmId: currentUser.firmId
          };
          await fSetDoc(fDoc(fdb, 'categories', newCat.id), newCat);
          finalCategory = newCat.name;
        }

        if (editingId) {
          const originalTx = fTransactions.find(t => t.id === editingId);
          const txRef = fDoc(fdb, 'transactions', editingId);
          await fUpdateDoc(txRef, {
            title,
            amount: Number(amount),
            category: (originalTx?.type || type) === 'INCOME' ? 'وارد' : finalCategory,
            date,
            note,
            accountId: accountId || null,
            quantity: (originalTx?.type || type) === 'EXPENSE' ? (Number(quantity) || null) : null,
            unitPrice: (originalTx?.type || type) === 'EXPENSE' ? (Number(unitPrice) || null) : null,
          });
          setEditingId(null);
        } else {
          const id = crypto.randomUUID();
          const newTransaction: Transaction = {
            id,
            buildingId: targetBuildingId,
            accountId: accountId || undefined,
            type,
            title,
            amount: Number(amount),
            category: type === 'INCOME' ? 'وارد' : finalCategory,
            date,
            note,
            quantity: type === 'EXPENSE' ? (Number(quantity) || undefined) : undefined,
            unitPrice: type === 'EXPENSE' ? (Number(unitPrice) || undefined) : undefined,
            ownerId: currentUser.uid,
            firmId: currentUser.firmId
          };
          await fSetDoc(fDoc(fdb, 'transactions', id), newTransaction);
        }
        resetForm();
        return;
      } catch (e) {
        handleFirestoreError(e, editingId ? OperationType.UPDATE : OperationType.CREATE, 'transactions');
      }
    }

    let finalCategory = category;
  };

  const addAccount = async () => {
    const targetBuildingId = addingAccountToBuildingId || activeBuildingId;
    if (!newAccountName.trim() || !targetBuildingId) return;

    if (currentUser) {
      try {
        const id = crypto.randomUUID();
        const account: BuildingAccount = {
          id,
          buildingId: targetBuildingId,
          name: newAccountName.trim(),
          type: newAccountType,
          initialBalance: Number(newAccountInitialBalance) || 0,
          ownerId: currentUser.uid,
          firmId: currentUser.firmId
        };
        await fSetDoc(fDoc(fdb, 'accounts', id), account);
        setNewAccountName('');
        setNewAccountInitialBalance('');
        setAddingAccountToBuildingId(null);
        triggerToast('تم إضافة الحساب بنجاح');
        return;
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, 'accounts');
      }
    }

    const account: BuildingAccount = {
      id: crypto.randomUUID(),
      buildingId: targetBuildingId,
      name: newAccountName.trim(),
      type: newAccountType,
      initialBalance: Number(newAccountInitialBalance) || 0
    };
    await db.accounts.add(account);
    setNewAccountName('');
    setNewAccountInitialBalance('');
    setAddingAccountToBuildingId(null);
    triggerToast('تم إضافة الحساب بنجاح');
  };

  const deleteAccount = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الحساب؟ ستفقد المعاملات ارتباطها بهذا الحساب.')) {
      if (currentUser) {
        try {
          await fDeleteDoc(fDoc(fdb, 'accounts', id));
          // Note: Bulk update in firestore for transactions associated with this account
          // is omitted for brevity but recommended.
          triggerToast('تم حذف الحساب');
          return;
        } catch (e) {
          handleFirestoreError(e, OperationType.DELETE, `accounts/${id}`);
        }
      }
      await db.accounts.delete(id);
      // Remove accountId from transactions but keep the transactions
      const txs = await db.transactions.where('accountId').equals(id).toArray();
      for (const tx of txs) {
        await db.transactions.update(tx.id, { accountId: undefined });
      }
      triggerToast('تم حذف الحساب');
    }
  };

  const resetForm = () => {
    setTitle('');
    setAmount('');
    setQuantity('');
    setUnitPrice('');
    setNote('');
    setAccountId('');
    setIsAddingCategory(false);
    setNewCategoryName('');
    setNewCategoryIcon('tag');
    setDate(new Date().toISOString().split('T')[0]);
  };

  const startEdit = (t: Transaction) => {
    setEditingId(t.id);
    setTitle(t.title);
    setAmount(t.amount);
    setCategory(t.category);
    setAccountId(t.accountId || '');
    setQuantity(t.quantity || '');
    setUnitPrice(t.unitPrice || '');
    setDate(t.date);
    setNote(t.note || '');
    setActiveTab(t.type === 'INCOME' ? 'income' : 'expenses');
  };

  const cancelEdit = () => {
    setEditingId(null);
    resetForm();
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
    if (currentUser) {
      try {
        await fDeleteDoc(fDoc(fdb, 'transactions', id));
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `transactions/${id}`);
      }
    } else {
      await db.transactions.delete(id);
    }
  };

  const addBuilding = async () => {
    if (!newBuildingName.trim()) return;

    if (currentUser) {
      try {
        const id = crypto.randomUUID();
        const building: Building = {
          id,
          name: newBuildingName,
          createdAt: new Date().toISOString(),
          icon: newBuildingIcon,
          ownerId: currentUser.uid,
          firmId: currentUser.firmId
        };
        await fSetDoc(fDoc(fdb, 'buildings', id), building);
        setActiveBuildingId(building.id);
        setNewBuildingName('');
        setNewBuildingIcon('building');
        setIsBuildingMenuOpen(false);
        return;
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, 'buildings');
      }
    }

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
      if (currentUser) {
        try {
          await fDeleteDoc(fDoc(fdb, 'buildings', id));
          // Transactions deletion is handled by batch or logic omitted here for brevity
          if (activeBuildingId === id) {
            setActiveBuildingId(buildings.find(b => b.id !== id)?.id || 'ALL');
          }
          return;
        } catch (e) {
          handleFirestoreError(e, OperationType.DELETE, `buildings/${id}`);
        }
      }
      await db.buildings.delete(id);
      const toDelete = await db.transactions.where('buildingId').equals(id).primaryKeys();
      await db.transactions.bulkDelete(toDelete);
      if (activeBuildingId === id) {
        setActiveBuildingId(buildings.find(b => b.id !== id)?.id || 'default');
      }
    }
  };

  const handleUpdateBuilding = async (id: string, name: string, icon: string) => {
    if (!name.trim()) return;
    if (currentUser) {
      try {
        await fUpdateDoc(fDoc(fdb, 'buildings', id), { 
          name: name.trim(), 
          icon: icon 
        });
        setEditingBuildingId(null);
        triggerToast('تم تحديث بيانات المشروع بنجاح');
        return;
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `buildings/${id}`);
      }
    }
    try {
      await db.buildings.update(id, { 
        name: name.trim(), 
        icon: icon 
      });
      setEditingBuildingId(null);
      triggerToast('تم تحديث بيانات المشروع بنجاح');
    } catch (e) {
      triggerToast('فشل تحديث بيانات المشروع');
    }
  };

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingAccountPDF, setIsGeneratingAccountPDF] = useState(false);
  const [accountReportRange, setAccountReportRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [reportAccount, setReportAccount] = useState<BuildingAccount | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const accountReportRef = useRef<HTMLDivElement>(null);
  const singleTransactionRef = useRef<HTMLDivElement>(null);

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

  const generateAccountPDFReport = async () => {
    if (!accountReportRef.current || !reportAccount) return;
    
    setIsGeneratingAccountPDF(true);
    triggerToast('جاري تحضير كشف الحساب...');
    
    try {
      const reportElement = accountReportRef.current;
      const originalDisplay = reportElement.style.display;
      const originalPosition = reportElement.style.position;
      const originalLeft = reportElement.style.left;
      const originalTop = reportElement.style.top;
      const originalWidth = reportElement.style.width;
      
      reportElement.style.setProperty('display', 'block', 'important');
      reportElement.style.position = 'fixed';
      reportElement.style.left = '0';
      reportElement.style.top = '0';
      reportElement.style.width = '850px';
      reportElement.style.zIndex = '-9999';
      reportElement.style.backgroundColor = '#F9F7F2';

      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(reportElement, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: '#F9F7F2',
        windowWidth: 850,
        y: 0,
        x: 0,
        onclone: (clonedDoc) => {
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
      pdf.save(`كشف_حساب_${reportAccount.name}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      triggerToast('تم تحميل كشف الحساب بنجاح');
      setReportAccount(null);
    } catch (error) {
      console.error('Account PDF Generation Error:', error);
      triggerToast('فشل تصدير الكشف');
    } finally {
      if (accountReportRef.current) {
        const reportElement = accountReportRef.current;
        reportElement.style.display = '';
        reportElement.style.position = '';
        reportElement.style.left = '';
        reportElement.style.top = '';
        reportElement.style.width = '';
        reportElement.style.zIndex = '';
        reportElement.style.backgroundColor = '';
      }
      setIsGeneratingAccountPDF(false);
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
      <div className="min-h-screen bg-[#F9F7F2] flex items-center justify-center p-8 text-right font-sans" dir="rtl">
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
      <div className="min-h-screen bg-[#F9F7F2] flex items-center justify-center p-8 text-right font-sans" dir="rtl">
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
    <div className="min-h-screen bg-[#F9F7F2] text-[#1A1A1A] font-sans" dir="rtl">
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
      <header className="no-print bg-[#F9F7F2] border-b-2 border-[#1A1A1A] sticky top-0 z-[60] py-4 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex justify-between items-center w-full md:w-auto">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#A08C5B]">مؤسسة بنيان للمقاولات</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-[#1A1A1A] p-2 text-[#F9F7F2] shadow-brutal-sm">
                  <Building2 size={24} />
                </div>
                <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase mb-[-4px]">بنيان</h1>
              </div>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-sm mx-8 hidden md:block">
              <div className="relative group">
                <input 
                  type="text" 
                  placeholder="بحث في السجلات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border-2 border-[#1A1A1A] px-10 py-2.5 text-xs font-bold outline-none shadow-brutal-sm focus:translate-x-[-2px] focus:translate-y-[-2px] focus:shadow-brutal transition-all"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1A1A1A] opacity-40 group-focus-within:opacity-100" size={16} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Mobile Search Toggle */}
              <button 
                onClick={() => setIsSearchVisible(!isSearchVisible)}
                className="md:hidden p-3 bg-white border-2 border-[#1A1A1A] shadow-brutal-sm"
              >
                <Search size={18} />
              </button>

              {/* User Menu */}
              {currentUser ? (
                <div className="flex items-center gap-2">
                  <div className="hidden lg:flex flex-col items-end">
                    <span className="text-[10px] font-black">{currentUser.displayName}</span>
                    <span className="text-[8px] font-bold opacity-40">{currentUser.role === 'ADMIN' ? 'مدير' : 'موظف'}</span>
                  </div>
                  <button 
                    onClick={async () => {
                      await firebaseSignOut(auth);
                      setCurrentUser(null);
                      triggerToast('تم تسجيل الخروج بنجاح');
                    }}
                    className="p-3 bg-white border-2 border-[#1A1A1A] shadow-brutal-sm hover:text-rose-500 transition-all"
                    title="تسجيل الخروج"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setActiveTab('settings')}
                  className="px-4 py-2.5 bg-[#A08C5B] text-white border-2 border-[#1A1A1A] shadow-brutal-sm text-[11px] font-black uppercase tracking-widest flex items-center gap-2 hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                >
                  <LogIn size={16} />
                  دخول
                </button>
              )}

              {/* Building Switcher (Desktop/Mobile) */}
              <div className="relative flex items-center gap-2">
                <button 
                  onClick={() => setIsBuildingMenuOpen(!isBuildingMenuOpen)}
                  className="flex items-center gap-3 px-4 py-2.5 bg-[#1A1A1A] text-white border-2 border-[#1A1A1A] shadow-brutal hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
                >
                  <BuildingIcon iconId={activeBuilding?.icon} size={16} />
                  <span className="text-[11px] font-black uppercase tracking-widest">{activeBuilding?.name}</span>
                  <ChevronDown size={14} className={cn("transition-transform", isBuildingMenuOpen && "rotate-180")} />
                </button>
                {activeBuildingId !== 'ALL' && (
                  <button
                    onClick={() => setViewingBuildingDetails(activeBuilding)}
                    className="p-2.5 bg-white border-2 border-[#1A1A1A] shadow-brutal-sm hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all hidden md:flex"
                    title="بيانات المشروع"
                  >
                    <Info size={18} className="text-[#A08C5B]" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

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
                      className="absolute top-full right-0 mt-2 w-72 bg-white border border-[#1A1A1A] shadow-[8px_8px_0px_rgba(0,0,0,0.1)] z-30 overflow-hidden"
                    >
                      <div className="p-3 border-b border-[#F2F0EA] bg-[#F9F7F2]">
                        <div className="relative group">
                          <input 
                            type="text" 
                            placeholder="بحث عن مشروع..."
                            value={projectSearchTerm}
                            onChange={(e) => setProjectSearchTerm(e.target.value)}
                            className="w-full bg-white border border-[#E5E1D8] px-8 py-2 text-[10px] font-bold outline-none focus:border-[#1A1A1A] transition-colors"
                            autoFocus
                          />
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1A1A1A]" size={12} />
                        </div>
                      </div>
                      <div className="max-h-80 overflow-y-auto scrollbar-thin">
                        <div className="p-2 space-y-1">
                          <button 
                            onClick={() => {
                              setActiveBuildingId('ALL');
                              setIsBuildingMenuOpen(false);
                              setActiveTab('dashboard');
                              setProjectSearchTerm('');
                            }}
                            className={cn(
                              "w-full flex items-center gap-2 text-right px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors border-b border-[#F2F0EA]",
                              activeBuildingId === 'ALL' ? "bg-[#1A1A1A] text-white" : "hover:bg-[#F2F0EA]/50"
                            )}
                          >
                            <div className={cn(
                              "w-6 h-6 flex items-center justify-center rounded-sm",
                              activeBuildingId === 'ALL' ? "bg-white/10" : "bg-[#1A1A1A]/5"
                            )}>
                              <Layers size={12} className={cn(activeBuildingId === 'ALL' ? "text-white" : "text-[#1A1A1A]")} />
                            </div>
                            <span>كل المشاريع</span>
                          </button>
                          {buildings
                            .filter(b => normalizeArabic(b.name).includes(normalizeArabic(projectSearchTerm)))
                            .map(b => (
                          <div key={b.id} className="flex flex-col border-b border-[#F2F0EA] last:border-0 group hover:bg-[#F2F0EA]/50">
                            {editingBuildingId === b.id ? (
                              <div className="p-2 space-y-2 bg-[#F9F7F2]">
                                <div className="max-h-32 overflow-y-auto border border-[#E5E1D8] p-1 bg-white mb-2 scrollbar-thin">
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
                                              : "border-transparent bg-white text-slate-300 hover:bg-[#F2F0EA]"
                                          )}
                                        >
                                          <Icon size={12} />
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                                <input 
                                  type="text"
                                  value={editingBuildingName}
                                  onChange={(e) => setEditingBuildingName(e.target.value)}
                                  className="w-full bg-white border border-[#E5E1D8] px-2 py-1 text-[10px] font-bold outline-none focus:border-[#1A1A1A]"
                                  autoFocus
                                />
                                <div className="flex gap-1">
                                  <button 
                                    onClick={() => handleUpdateBuilding(b.id, editingBuildingName, editingBuildingIcon)}
                                    className="flex-1 py-1 bg-[#1A1A1A] text-white text-[9px] font-black uppercase"
                                  >
                                    حفظ
                                  </button>
                                  <button 
                                    onClick={() => setEditingBuildingId(null)}
                                    className="flex-1 py-1 bg-[#E5E1D8] text-[#1A1A1A] text-[9px] font-black uppercase"
                                  >
                                    إلغاء
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex group">
                                <button 
                                  onClick={() => {
                                    setActiveBuildingId(b.id);
                                    setIsBuildingMenuOpen(false);
                                    setActiveTab('dashboard');
                                  }}
                                  className={cn(
                                    "flex-1 flex items-center gap-2 text-right px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors",
                                    activeBuildingId === b.id ? "bg-[#1A1A1A] text-white" : ""
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
                                <div className="flex items-center">
                                  <button 
                                    onClick={() => {
                                      setViewingBuildingDetails(b);
                                      setIsBuildingMenuOpen(false);
                                    }}
                                    className="px-2 py-2 text-slate-300 hover:text-blue-500 transition-colors"
                                    title="عرض التفاصيل"
                                  >
                                    <Eye size={11} />
                                  </button>
                                  {(!currentUser || currentUser.role === 'ADMIN') && (
                                    <button 
                                      onClick={() => {
                                        setEditingBuildingId(b.id);
                                        setEditingBuildingName(b.name);
                                        setEditingBuildingIcon(b.icon || 'building');
                                      }}
                                      className="px-2 py-2 text-slate-300 hover:text-[#A08C5B] transition-colors"
                                    >
                                      <Edit3 size={11} />
                                    </button>
                                  )}
                                  {(!currentUser || currentUser.role === 'ADMIN') && buildings.length > 1 && (
                                    <button 
                                      onClick={() => deleteBuilding(b.id)}
                                      className="px-2 py-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                      {(!currentUser || currentUser.role === 'ADMIN') && (
                        <div className="p-3 border-t border-[#F2F0EA] bg-[#F9F7F2]">
                          <div className="max-h-32 overflow-y-auto border border-[#E5E1D8] p-1 bg-white mb-3 scrollbar-thin">
                            <div className="flex flex-wrap gap-1">
                              {BUILDING_ICONS.map(i => {
                                const Icon = i.icon;
                                return (
                                  <button
                                    key={i.id}
                                    onClick={() => setNewBuildingIcon(i.id)}
                                    className={cn(
                                      "w-8 h-8 flex items-center justify-center border transition-all",
                                      newBuildingIcon === i.id 
                                        ? "border-[#1A1A1A] bg-[#1A1A1A] text-white" 
                                        : "border-transparent bg-white text-slate-400 hover:bg-[#F2F0EA]"
                                    )}
                                    title={i.id}
                                  >
                                    <Icon size={14} />
                                  </button>
                                );
                              })}
                            </div>
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
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

        {/* Navigation Bar */}
        <nav className="no-print bg-white border-b-2 border-[#1A1A1A] sticky top-[108px] z-50">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-3 md:py-4">
              {[
                { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
                { id: 'income', label: 'الوارد / التمويل', icon: TrendingUp },
                { id: 'expenses', label: 'المصروفات / المواد', icon: TrendingDown },
                { id: 'chart', label: 'شجرة الحسابات', icon: Network },
                { id: 'history', label: 'سجل العمليات', icon: History },
                { id: 'settings', label: 'إعدادات النظام', icon: Settings }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-3 px-5 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                    activeTab === tab.id 
                      ? "bg-[#1A1A1A] text-white shadow-brutal-sm translate-x-[-2px] translate-y-[-2px]" 
                      : "text-slate-400 hover:text-[#1A1A1A] hover:bg-[#F2F0EA]/50"
                  )}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>
            
            <div className="hidden md:flex items-center gap-4">
              <button 
                onClick={handleSync}
                className={cn(
                  "p-2 border-2 border-[#1A1A1A] bg-white shadow-brutal-sm hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all",
                  isSyncing && "animate-spin"
                )}
              >
                <RefreshCw size={16} />
              </button>
              <button 
                onClick={shareApp}
                className="p-2 border-2 border-[#1A1A1A] bg-[#A08C5B] text-white shadow-brutal-sm hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
              >
                <Share2 size={16} />
              </button>
            </div>
          </div>
        </nav>

        <main className="no-print max-w-7xl mx-auto p-6 md:p-10 space-y-12">
          {/* Active Work Section Header */}
          <header className="flex flex-col md:flex-row md:items-end justify-between border-b-4 border-[#1A1A1A] pb-8 gap-6">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 flex items-center justify-center bg-[#1A1A1A] text-white shadow-brutal rotate-[-2deg]">
                <BuildingIcon iconId={activeBuilding?.icon} size={32} />
              </div>
              <div className="space-y-1">
                <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase leading-none">{activeBuilding?.name}</h2>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#A08C5B]">الحالة الإنشائية: موثق</span>
                  <span className="w-1 h-1 rounded-full bg-[#A08C5B]"></span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">آخر تحديث: {format(new Date(), 'HH:mm')}</span>
                </div>
              </div>
            </div>
            <div className="text-[11px] font-black uppercase tracking-[0.2em] bg-white border-2 border-[#1A1A1A] px-4 py-2 shadow-brutal-sm">
              {format(new Date(), 'EEEE, dd MMMM yyyy', { locale: ar })}
            </div>
          </header>

          {/* Core Analytics Grid */}
          {activeBuildingId === 'ALL' && (
            <section className="no-print space-y-6">
              <div className="flex items-center justify-between border-b-2 border-[#1A1A1A] pb-4">
                <div className="flex items-center gap-3">
                  <Layers size={18} className="text-[#A08C5B]" />
                  <h3 className="text-xl font-black uppercase tracking-tighter">استكشاف كافة المشاريع ({buildings.length})</h3>
                </div>
                <div className="relative group">
                  <input 
                    type="text" 
                    placeholder="بحث سريع عن مشروع..."
                    value={projectSearchTerm}
                    onChange={(e) => setProjectSearchTerm(e.target.value)}
                    className="w-full bg-[#F2F0EA] border border-[#E5E1D8] px-8 py-1.5 text-[10px] font-bold outline-none focus:border-[#1A1A1A] transition-colors"
                  />
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {(!currentUser || currentUser.role === 'ADMIN') && (
                  <button 
                    onClick={() => {
                      setIsBuildingMenuOpen(true);
                      setTimeout(() => {
                         const input = document.querySelector('input[placeholder="اسم المشروع..."]') as HTMLInputElement;
                         if (input) input.focus();
                      }, 100);
                    }}
                    className="bg-white border-2 border-dashed border-[#A08C5B] p-6 shadow-brutal hover:translate-x-[-4px] hover:translate-y-[-4px] transition-all group flex flex-col items-center justify-center gap-4 text-center"
                  >
                    <div className="w-12 h-12 flex items-center justify-center bg-[#A08C5B]/10 text-[#A08C5B] rounded-full group-hover:scale-110 transition-transform">
                      <Plus size={24} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-widest text-[#A08C5B]">مشروع جديد</h4>
                      <p className="text-[9px] font-bold opacity-40 uppercase mt-1">أضف مشروع بناء جديد للنظام</p>
                    </div>
                  </button>
                )}
                        {buildings
                          .filter(b => normalizeArabic(b.name).includes(normalizeArabic(projectSearchTerm)))
                          .map(b => (
                          <button 
                            key={b.id}
                            onClick={() => {
                              setActiveBuildingId(b.id);
                              setActiveTab('dashboard');
                              window.scrollTo(0, 0);
                            }}
                            className="bg-white border-2 border-[#1A1A1A] p-6 shadow-brutal hover:translate-x-[-4px] hover:translate-y-[-4px] transition-all group relative text-right overflow-hidden"
                          >
                            <div className="absolute top-0 right-0 w-12 h-12 bg-[#F2F0EA] flex items-center justify-center opacity-40 group-hover:bg-[#A08C5B] group-hover:opacity-10 transition-colors">
                              <BuildingIcon iconId={b.icon} size={48} />
                            </div>
                            <div className="relative z-10 flex flex-col items-start gap-4">
                              <div className="w-12 h-12 flex items-center justify-center bg-[#1A1A1A] text-white shadow-brutal-sm group-hover:bg-[#A08C5B] transition-colors">
                                <BuildingIcon iconId={b.icon} size={24} />
                              </div>
                              <div className="space-y-1">
                                <h4 className="text-lg font-black tracking-tighter text-[#1A1A1A]">{b.name}</h4>
                                <p className="text-[9px] font-bold uppercase tracking-widest opacity-40">
                                  {transactions.filter(t => t.buildingId === b.id).length} معاملة مسجلة
                                </p>
                              </div>
                              <div className="pt-4 border-t border-[#F2F0EA] w-full flex items-center justify-between">
                                 <span className="text-[10px] font-black uppercase text-[#A08C5B]">فتح السجل</span>
                                 <Plus size={14} className="text-[#A08C5B]" />
                              </div>
                            </div>
                          </button>
                        ))}
                        {buildings.filter(b => normalizeArabic(b.name).includes(normalizeArabic(projectSearchTerm))).length === 0 && (
                          <div className="col-span-full py-20 text-center border-4 border-dashed border-[#E5E1D8]">
                            <Search size={48} className="mx-auto mb-4 text-[#E5E1D8] opacity-20" />
                            <h4 className="text-lg font-black opacity-20">لم يتم العثور على أي مشاريع تطابق بحثك</h4>
                            <p className="text-[10px] font-bold opacity-20 uppercase tracking-widest mt-2">تأكد من كتابة الاسم بشكل صحيح أو تحقق من اتصالك</p>
                          </div>
                        )}
              </div>
            </section>
          )}

          {/* Data Synchronization & Migration */}
          {currentUser && buildingsData && buildingsData.length > 0 && (
            <section className="no-print mb-8">
              <div className="bg-[#F9F7F2] border-4 border-[#1A1A1A] p-6 shadow-brutal-sm">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="bg-[#A08C5B] text-white p-4 shadow-brutal-sm rounded-sm">
                    <RefreshCw size={32} className={isMigrating ? "animate-spin" : ""} />
                  </div>
                  <div className="flex-1 text-right">
                    <h4 className="text-xl font-black uppercase tracking-tight">مزامنة البيانات المحلية</h4>
                    <p className="text-[10px] font-bold opacity-60 leading-relaxed max-w-2xl mt-1">
                      تم العثور على بيانات قديمة محفوظة في متصفحك. هل تود نقلها إلى السحابة للتأكد من وجودها بجانب مشروع "بيت صالح محمد" وكافة سجلاتك؟
                    </p>
                  </div>
                  <button 
                    onClick={migrateLocalDataToCloud}
                    disabled={isMigrating}
                    className="w-full md:w-auto bg-[#1A1A1A] text-white px-8 py-4 text-[12px] font-black uppercase tracking-widest shadow-brutal hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all disabled:opacity-50"
                  >
                    {isMigrating ? 'جاري النقل...' : 'بدء المزامنة السحابية'}
                  </button>
                </div>
              </div>
            </section>
          )}

          <section className="no-print grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="ledger-container p-8 group hover:translate-x-[-4px] hover:translate-y-[-4px] transition-all">
              <div className="flex flex-col mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] uppercase font-black tracking-[0.2em] text-[#A08C5B]">السيولة المتبقية</span>
                  <Wallet size={16} className="text-[#A08C5B]" />
                </div>
                <div className="h-1 w-12 bg-[#1A1A1A] group-hover:w-full transition-all duration-500"></div>
              </div>
              <p className="text-4xl md:text-5xl font-black tracking-tighter tabular-nums mb-2">
                {formatCurrency(stats.balance)}
              </p>
              <p className="text-[9px] font-bold uppercase opacity-40">رصيد متاح للاحتياجات الفورية</p>
            </div>

            <div className="ledger-container p-8 group transition-all">
              <div className="flex flex-col mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] uppercase font-black tracking-[0.2em] text-emerald-600">إجمالي الميزانية</span>
                  <TrendingUp size={16} className="text-emerald-600" />
                </div>
                <div className="h-1 w-12 bg-emerald-600 group-hover:w-full transition-all duration-500"></div>
              </div>
              <p className="text-4xl md:text-5xl font-black tracking-tighter tabular-nums mb-2 opacity-80">
                {formatCurrency(stats.totalIncome)}
              </p>
              <p className="text-[9px] font-bold uppercase opacity-40">المبالغ المودعة مسبقاً</p>
            </div>

            <div className="ledger-container bg-[#1A1A1A] text-[#F9F7F2] p-8 group shadow-brutal transition-all">
              <div className="flex flex-col mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] uppercase font-black tracking-[0.2em] text-[#A08C5B]">إجمالي المصاريف</span>
                  <TrendingDown size={16} className="text-[#A08C5B]" />
                </div>
                <div className="h-1 w-12 bg-[#A08C5B] group-hover:w-full transition-all duration-500"></div>
              </div>
              <p className="text-4xl md:text-5xl font-black tracking-tighter tabular-nums mb-2">
                {formatCurrency(stats.totalExpenses)}
              </p>
              <p className="text-[9px] font-bold uppercase text-[#A08C5B]">استهلاك المواد والخدمات</p>
            </div>
          </section>

          {/* Allocation Breakdown */}
          {(activeBuildingId === 'ALL' || accounts.filter(a => a.buildingId === activeBuildingId).length > 0) && (
            <section className="ledger-container">
              <div className="ledger-header p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Boxes size={18} />
                    <h4 className="text-[12px] font-black uppercase tracking-widest">
                      {activeBuildingId === 'ALL' ? 'السيولة في كافة المشاريع' : 'توزيع الضمانات المالية والعهد'}
                    </h4>
                  </div>
                  <button 
                    onClick={() => setActiveTab('chart')}
                    className="text-[10px] font-black text-[#A08C5B] uppercase underline underline-offset-4 hover:text-[#1A1A1A]"
                  >
                    عرض الدليل المحاسبي
                  </button>
                </div>
              </div>
              <div className="p-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8">
                {accounts
                  .filter(a => activeBuildingId === 'ALL' || a.buildingId === activeBuildingId)
                  .map(acc => {
                    const accTxs = transactions.filter(t => t.accountId === acc.id);
                    const balance = acc.initialBalance + 
                      accTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0) -
                      accTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
                    
                    return (
                      <div key={acc.id} className="space-y-2 border-r-2 border-[#F2F0EA] pr-6">
                        <span className="block text-[9px] font-black uppercase opacity-40 tracking-tight truncate" title={acc.name}>
                          {activeBuildingId === 'ALL' && (
                            <span className="text-[#A08C5B] block truncate">[{buildings.find(b => b.id === acc.buildingId)?.name}]</span>
                          )}
                          {acc.name}
                        </span>
                        <p className={cn("text-lg font-black tabular-nums leading-none", balance >= 0 ? "text-emerald-700" : "text-rose-600")}>
                          {formatCurrency(balance)}
                        </p>
                        <div className="h-0.5 w-full bg-[#F2F0EA]">
                          <div className={cn("h-full", balance >= 0 ? "bg-emerald-600" : "bg-rose-600")} style={{ width: '40%' }}></div>
                        </div>
                      </div>
                    );
                  })}
                {activeBuildingId === 'ALL' && accounts.length === 0 && (
                   <p className="col-span-full text-center text-[10px] opacity-40 font-bold uppercase py-4">لا توجد حسابات مالية مضافة للمشاريع</p>
                )}
              </div>
            </section>
          )}

        {searchTerm ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black tracking-tight">نتائج البحث ({searchResults.length + buildings.filter(b => normalizeArabic(b.name).includes(normalizeArabic(searchTerm))).length})</h2>
              <button 
                onClick={() => setSearchTerm('')}
                className="text-xs font-bold uppercase tracking-widest opacity-40 hover:opacity-100"
              >
                إغلاق البحث
              </button>
            </div>

            {/* Projects in Search Results */}
            {buildings.filter(b => normalizeArabic(b.name).includes(normalizeArabic(searchTerm))).length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {buildings.filter(b => normalizeArabic(b.name).includes(normalizeArabic(searchTerm))).map(b => (
                  <button 
                    key={b.id}
                    onClick={() => {
                      setActiveBuildingId(b.id);
                      setSearchTerm('');
                      setActiveTab('dashboard');
                    }}
                    className="flex items-center gap-4 bg-white border-2 border-[#A08C5B] p-4 shadow-brutal-sm hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all text-right"
                  >
                    <div className="w-10 h-10 bg-[#A08C5B]/10 flex items-center justify-center text-[#A08C5B]">
                      <BuildingIcon iconId={b.icon} size={20} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase text-[#A08C5B]">مشروع</p>
                      <h4 className="text-sm font-black tracking-tighter">{b.name}</h4>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchResults.map(t => (
                  <div key={t.id} className="bg-white border-2 border-[#1A1A1A] p-6 shadow-[8px_8px_0px_rgba(0,0,0,0.1)] group hover:shadow-[12px_12px_0px_rgba(160,140,91,0.2)] transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#A08C5B] mb-1">{t.category}</span>
                        <h3 className="text-sm font-bold tracking-tight">{t.title}</h3>
                        <span className="text-[9px] opacity-40 font-bold uppercase tracking-widest mt-1">{format(parseISO(t.date), 'dd MMMM yyyy', { locale: ar })}</span>
                      </div>
                      <div className="text-right">
                        <span className={cn("text-lg font-black tabular-nums", t.type === 'INCOME' ? "text-emerald-600" : "text-[#1A1A1A]")}>
                          {t.type === 'INCOME' ? '+' : '-'} {formatCurrency(t.amount)}
                        </span>
                      </div>
                    </div>
                    {t.note && (
                      <p className="text-[10px] opacity-60 leading-relaxed border-t border-[#F2F0EA] pt-4 mb-4">
                        {t.note}
                      </p>
                    )}
                    <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#F2F0EA] opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setSelectedTransactionDetail(t)}
                        className="text-[10px] font-black uppercase tracking-widest text-emerald-600"
                      >
                        عرض التفاصيل
                      </button>
                      {(!currentUser || currentUser.role === 'ADMIN') && (
                        <button 
                          onClick={() => {
                            startEdit(t);
                            setSearchTerm('');
                          }}
                          className="text-[10px] font-black uppercase tracking-widest text-[#A08C5B]"
                        >
                          تعديل
                        </button>
                      )}
                      {(!currentUser || currentUser.role === 'ADMIN') && (
                        <button 
                          onClick={() => deleteTransaction(t.id)}
                          className="text-[10px] font-black uppercase tracking-widest text-rose-500"
                        >
                          حذف
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border-2 border-[#1A1A1A] p-12 text-center shadow-inner">
                <Search size={48} className="mx-auto mb-4 text-[#E5E1D8]" />
                <p className="text-sm font-bold opacity-40 italic">لا توجد نتائج تطابق "{searchTerm}"</p>
              </div>
            )}
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-center no-print">
                <h2 className="text-2xl font-black tracking-tight uppercase border-r-8 border-[#1A1A1A] pr-6">لوحة معلومات المشروع</h2>
                <button 
                  onClick={generatePDFReport}
                  disabled={isGeneratingPDF}
                  className={cn(
                    "flex items-center gap-3 bg-[#A08C5B] text-white px-8 py-3 text-[11px] font-black uppercase tracking-[0.2em] shadow-brutal hover:translate-y-[-2px] transition-all disabled:opacity-50 disabled:cursor-wait",
                    isGeneratingPDF && "opacity-50"
                  )}
                >
                  <Printer size={16} />
                  {isGeneratingPDF ? 'جاري تحضير التقرير...' : 'طباعة التقرير الشامل'}
                </button>
              </div>

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
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-white border-2 border-[#1A1A1A] p-4 shadow-brutal text-right" dir="rtl">
                                    <p className="text-[11px] font-black uppercase tracking-widest border-b-2 border-[#1A1A1A] pb-2 mb-3">
                                      {label}
                                    </p>
                                    <div className="space-y-2">
                                      {payload.map((entry: any, index: number) => (
                                        <div key={index} className="flex items-center justify-between gap-6">
                                          <div className="flex items-center gap-2">
                                            <div className="w-2 h-2" style={{ backgroundColor: entry.fill }}></div>
                                            <span className="text-[10px] font-bold opacity-60 uppercase">{entry.name}</span>
                                          </div>
                                          <span className={cn(
                                            "text-xs font-black tabular-nums",
                                            entry.dataKey === 'income' ? "text-emerald-700" : "text-rose-600"
                                          )}>
                                            {formatCurrency(entry.value)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
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
                      <span>{formatCurrency(stats.totalExpenses)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider">
                      <span className="opacity-50">السيولة المتبقية</span>
                      <span className="text-[#A08C5B]">{formatCurrency(stats.balance)}</span>
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
                                  {categoryStats.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip 
                                  contentStyle={{ borderRadius: '0', border: '1px solid #1A1A1A', background: '#FFFFFF', fontSize: '12px', fontWeight: 700 }}
                                  formatter={(value: any) => [formatCurrency(value)]}
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
                                <span className="block text-2xl font-black" style={{ color: secondaryColor }}>{formatCurrency(stats.totalExpenses)}</span>
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
                          categoryStats.sort((a,b) => b.value - a.value).map((entry) => (
                            <div key={entry.name} className="flex flex-col space-y-2 p-4 bg-[#F9F7F2] border-r-2" style={{ borderColor: entry.color }}>
                              <div className="flex justify-between items-center">
                                <span className="text-[11px] font-black uppercase tracking-tight">{entry.name}</span>
                                <span className="text-[10px] font-bold opacity-40">{Math.round((entry.value / stats.totalExpenses) * 100)}%</span>
                              </div>
                              <div className="flex justify-between items-baseline">
                                <span className="text-lg font-black tabular-nums">{formatCurrency(entry.value)}</span>
                              </div>
                              <div className="h-1 w-full bg-[#E5E1D8]">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.round((entry.value / stats.totalExpenses) * 100)}%` }}
                                  className="h-full"
                                  style={{ backgroundColor: entry.color }}
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
                    <div className="border-b border-[#F2F0EA] pb-2">
                      <label className="block text-[10px] font-bold uppercase tracking-widest mb-1 opacity-50">الحساب المالي</label>
                      <select 
                        value={accountId}
                        onChange={(e) => setAccountId(e.target.value)}
                        className="w-full bg-transparent p-0 text-sm outline-none font-bold appearance-none cursor-pointer"
                      >
                        <option value="">-- اختر الحساب --</option>
                        {accounts.filter(a => a.buildingId === activeBuildingId || activeBuildingId === 'ALL').map(acc => (
                          <option key={acc.id} value={acc.id}>
                            {activeBuildingId === 'ALL' ? `${buildings.find(b => b.id === acc.buildingId)?.name} - ` : ''}
                            {acc.name} ({acc.type})
                          </option>
                        ))}
                      </select>
                      {accountId && (
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-[8px] font-bold uppercase opacity-30">الرصيد المتاح:</span>
                          <span className={cn(
                            "text-[9px] font-black tabular-nums",
                            (() => {
                              const acc = accounts.find(a => a.id === accountId);
                              if (!acc) return "";
                              const accTxs = transactions.filter(t => t.accountId === acc.id);
                              const balance = (acc.initialBalance || 0) + 
                                accTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0) -
                                accTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
                              return balance >= 0 ? "text-emerald-600" : "text-rose-600";
                            })()
                          )}>
                            {(() => {
                              const acc = accounts.find(a => a.id === accountId);
                              if (!acc) return "0";
                              const accTxs = transactions.filter(t => t.accountId === acc.id);
                              const balance = (acc.initialBalance || 0) + 
                                accTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0) -
                                accTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
                              return formatCurrency(balance);
                            })()}
                          </span>
                        </div>
                      )}
                      {accounts.filter(a => a.buildingId === activeBuildingId || activeBuildingId === 'ALL').length === 0 && (
                        <p className="text-[8px] text-[#A08C5B] mt-1 italic">لا توجد حسابات مسجلة. انتقل إلى شجرة الحسابات لإضافتها.</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
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
                          <div className="space-y-4">
                            <input 
                              type="text"
                              autoFocus
                              placeholder="اسم التصنيف الجديد..."
                              value={newCategoryName}
                              onChange={(e) => setNewCategoryName(e.target.value)}
                              className="w-full bg-transparent p-0 text-sm outline-none font-bold placeholder:text-slate-300 border-b border-[#F2F0EA]"
                            />
                            <div className="flex flex-wrap gap-1.5 py-1">
                              {CATEGORY_COLORS.map(c => (
                                <button
                                  key={c}
                                  onClick={() => setNewCategoryColor(c)}
                                  className={cn(
                                    "w-5 h-5 rounded-full border-2 transition-transform",
                                    newCategoryColor === c ? "scale-125 border-[#1A1A1A]" : "border-transparent hover:scale-110"
                                  )}
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                            <div className="max-h-24 overflow-y-auto border border-[#F2F0EA] p-1 bg-white scrollbar-thin">
                              <div className="flex flex-wrap gap-1">
                                {BUILDING_ICONS.map(i => {
                                  const Icon = i.icon;
                                  return (
                                    <button
                                      key={i.id}
                                      onClick={() => setNewCategoryIcon(i.id)}
                                      className={cn(
                                        "w-7 h-7 flex items-center justify-center border transition-all",
                                        newCategoryIcon === i.id 
                                          ? "border-[#1A1A1A] bg-[#1A1A1A] text-white" 
                                          : "border-transparent text-slate-300 hover:bg-[#F2F0EA]"
                                      )}
                                    >
                                      <Icon size={12} />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
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

                  <div className="border-b border-[#F2F0EA] pb-2">
                    <label className="block text-[10px] font-bold uppercase tracking-widest mb-1 opacity-50">ملاحظات إضافية (اختياري)</label>
                    <textarea 
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="أضف أي تفاصيل أو ملاحظات فنية حول هذه العملية..."
                      className="w-full bg-transparent p-0 text-[11px] font-bold outline-none placeholder:text-slate-200 italic resize-none min-h-[60px]"
                      rows={2}
                    />
                  </div>

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
                      <span className="text-xs font-bold uppercase opacity-50">{currencySymbol}</span>
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
                            {t.type === 'INCOME' ? '+' : '-'} {formatCurrency(t.amount)}
                          </span>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => setSelectedTransactionDetail(t)}
                              className="p-1.5 text-slate-300 hover:text-emerald-500"
                              title="التفاصيل"
                            >
                              <Eye size={12} />
                            </button>
                            {(!currentUser || currentUser.role === 'ADMIN') && (
                              <>
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
                              </>
                            )}
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
              className="max-w-4xl mx-auto space-y-12"
            >
              {!currentUser && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Login onLoginSuccess={(user) => {
                    setCurrentUser(user);
                    triggerToast(`مرحباً بك، ${user.displayName}`);
                    setActiveTab('dashboard');
                  }} />
                </div>
              )}

              {currentUser && currentUser.role === 'ADMIN' && (
                <div className="bg-white p-12 border border-[#E5E1D8] shadow-2xl relative">
                   <div className="absolute top-0 right-0 w-1.5 h-full bg-[#A08C5B]"></div>
                   <UserManagement currentUser={currentUser} onToast={triggerToast} />
                </div>
              )}

              <div className="max-w-xl mx-auto bg-white p-12 border border-[#E5E1D8] shadow-2xl relative">
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

                {(!currentUser || currentUser.role === 'ADMIN') && (
                  <>
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
                                <div className="max-h-32 overflow-y-auto border border-[#E5E1D8] p-1 bg-white mb-2 scrollbar-thin">
                                  <div className="flex flex-wrap gap-1">
                                    {BUILDING_ICONS.map(i => {
                                      const Icon = i.icon;
                                      return (
                                        <button
                                          key={i.id}
                                          onClick={() => setEditingBuildingIcon(i.id)}
                                          className={cn(
                                            "w-8 h-8 flex items-center justify-center border transition-all",
                                            editingBuildingIcon === i.id 
                                              ? "border-[#1A1A1A] bg-[#1A1A1A] text-white" 
                                              : "border-transparent bg-white text-slate-300 hover:bg-[#F2F0EA]"
                                          )}
                                        >
                                          <Icon size={14} />
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                                <input 
                                  type="text"
                                  value={editingBuildingName}
                                  onChange={(e) => setEditingBuildingName(e.target.value)}
                                  className="w-full bg-[#F2F0EA] px-2 py-1.5 text-[10px] font-bold outline-none"
                                />
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={() => handleUpdateBuilding(b.id, editingBuildingName, editingBuildingIcon)}
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
                      <div key={cat.id} className="flex flex-col gap-2">
                        {editingCategoryId === cat.id ? (
                          <div className="bg-[#F9F7F2] p-3 border border-[#E5E1D8] space-y-3 min-w-[200px]">
                            <input 
                              type="text"
                              value={editingCategoryName}
                              onChange={(e) => setEditingCategoryName(e.target.value)}
                              className="w-full bg-white border border-[#E5E1D8] px-2 py-1 text-[10px] font-bold outline-none"
                              autoFocus
                            />
                            <div className="flex flex-wrap gap-1">
                              {CATEGORY_COLORS.map(c => (
                                <button
                                  key={c}
                                  onClick={() => setEditingCategoryColor(c)}
                                  className={cn(
                                    "w-4 h-4 rounded-full border transition-transform",
                                    editingCategoryColor === c ? "scale-125 border-[#1A1A1A]" : "border-transparent hover:scale-110"
                                  )}
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                            {/* Icon Picker */}
                            <div className="max-h-24 overflow-y-auto border border-[#E5E1D8] p-1 bg-white scrollbar-thin">
                              <div className="flex flex-wrap gap-1">
                                {BUILDING_ICONS.map(i => {
                                  const Icon = i.icon;
                                  return (
                                    <button
                                      key={i.id}
                                      onClick={() => setEditingCategoryIcon(i.id)}
                                      className={cn(
                                        "w-6 h-6 flex items-center justify-center border transition-all",
                                        editingCategoryIcon === i.id 
                                          ? "border-[#1A1A1A] bg-[#1A1A1A] text-white" 
                                          : "border-transparent text-slate-300 hover:bg-[#F2F0EA]"
                                      )}
                                    >
                                      <Icon size={10} />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <button 
                                onClick={async () => {
                                  if (!editingCategoryName.trim()) return;
                                  await db.categories.update(cat.id, { 
                                    name: editingCategoryName.trim(), 
                                    color: editingCategoryColor,
                                    icon: editingCategoryIcon
                                  });
                                  setEditingCategoryId(null);
                                  triggerToast('تم تحديث التصنيف بنجاح');
                                }}
                                className="flex-1 py-1 bg-[#1A1A1A] text-white text-[8px] font-black uppercase"
                              >
                                حفظ
                              </button>
                              <button 
                                onClick={() => setEditingCategoryId(null)}
                                className="flex-1 py-1 bg-[#E5E1D8] text-[#1A1A1A] text-[8px] font-black uppercase"
                              >
                                إلغاء
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="group relative flex items-center gap-2 bg-[#F2F0EA] px-3 py-1.5 text-[9px] font-bold uppercase tracking-tight border-r-2" style={{ borderRightColor: cat.color }}>
                            <CategoryIcon iconId={cat.icon} size={10} color={cat.color} className="w-4 h-4" />
                            <span>{cat.name}</span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => {
                                  setEditingCategoryId(cat.id);
                                  setEditingCategoryName(cat.name);
                                  setEditingCategoryColor(cat.color || CATEGORY_COLORS[0]);
                                  setEditingCategoryIcon(cat.icon || 'tag');
                                }}
                                className="text-[#A08C5B] hover:scale-110"
                              >
                                <Edit3 size={10} />
                              </button>
                              {(!currentUser || currentUser.role === 'ADMIN') && (!DEFAULT_EXPENSE_CATEGORIES.includes(cat.name) && cat.name !== 'وارد') && (
                                <button 
                                  onClick={async () => {
                                    if (confirm(`هل أنت متأكد من حذف تصنيف "${cat.name}"؟`)) {
                                      await db.categories.delete(cat.id);
                                    }
                                  }}
                                  className="text-rose-500 hover:scale-110"
                                >
                                  <Trash2 size={10} />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-[8px] opacity-40 italic font-bold leading-relaxed">
                    * التصنيفات الافتراضية محصنة ضد الحذف لضمان سلامة هيكلية النظام. يمكنك حذف التصنيفات التي قمت بإضافتها يدوياً فقط.
                  </p>
                </div>

                <div className="pt-6 border-t border-[#F2F0EA] space-y-6">
                  <h4 className="text-[11px] font-black uppercase tracking-tighter">إعدادات العملة والتنسيق المالي</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">رمز العملة الخاص بك</label>
                        <input 
                          type="text"
                          value={currencySymbol}
                          onChange={(e) => setCurrencySymbol(e.target.value)}
                          placeholder="ج.س، $، ريال..."
                          className="w-full bg-[#F2F0EA] border border-[#E5E1D8] px-4 py-3 text-sm font-bold outline-none focus:border-[#1A1A1A]"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {['ج.س', '$', '€', '£', 'ريال', 'درهم', 'د.ك'].map(sym => (
                          <button
                            key={sym}
                            onClick={() => setCurrencySymbol(sym)}
                            className={cn(
                              "px-3 py-1.5 text-[10px] font-bold border transition-all",
                              currencySymbol === sym 
                                ? "bg-[#1A1A1A] text-white border-[#1A1A1A]" 
                                : "bg-white text-slate-500 border-[#E5E1D8] hover:border-slate-400"
                            )}
                          >
                            {sym}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">تموضع رمز العملة</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCurrencyPosition('BEFORE')}
                          className={cn(
                            "flex-1 py-3 text-[10px] font-black uppercase tracking-tighter border transition-all",
                            currencyPosition === 'BEFORE' 
                              ? "bg-[#1A1A1A] text-white border-[#1A1A1A]" 
                              : "bg-white text-slate-500 border-[#E5E1D8] hover:border-slate-400"
                          )}
                        >
                          قبل المبلغ ({currencySymbol} 100)
                        </button>
                        <button
                          onClick={() => setCurrencyPosition('AFTER')}
                          className={cn(
                            "flex-1 py-3 text-[10px] font-black uppercase tracking-tighter border transition-all",
                            currencyPosition === 'AFTER' 
                              ? "bg-[#1A1A1A] text-white border-[#1A1A1A]" 
                              : "bg-white text-slate-500 border-[#E5E1D8] hover:border-slate-400"
                          )}
                        >
                          بعد المبلغ (100 {currencySymbol})
                        </button>
                      </div>
                      <div className="bg-[#F9F7F2] p-4 border-r-2 border-[#A08C5B]">
                        <span className="block text-[8px] opacity-40 font-bold uppercase mb-1">معاينة التنسيق</span>
                        <span className="text-xl font-black tabular-nums">{formatCurrency(125000)}</span>
                      </div>
                    </div>
                  </div>
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
              </>
            )}
          </div>
        </div>
      </motion.div>
    )}

          {activeTab === 'chart' && (
            <motion.div 
              key="chart"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8 pb-20"
            >
              <div className="flex items-center justify-between border-b-2 border-[#1A1A1A] pb-4">
                <div>
                  <h3 className="text-3xl font-black tracking-tighter italic">شجرة الحسابات العامة</h3>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">هيكلية الحسابات المالية للمشاريع</span>
                </div>
                <div className="w-12 h-12 bg-[#1A1A1A] flex items-center justify-center text-white">
                  <Boxes size={24} />
                </div>
              </div>

              <div className="bg-white border border-[#E5E1D8] shadow-sm overflow-hidden">
                <div className="p-4 bg-[#F2F0EA] border-b border-[#E5E1D8] flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Landmark size={14} className="text-[#A08C5B]" />
                    <span className="text-[10px] font-black uppercase tracking-widest">دليل الحسابات (المشاريع والبنود)</span>
                  </div>
                  <div className="relative group min-w-[240px]">
                    <input 
                      type="text" 
                      placeholder="بحث في المشاريع..."
                      value={chartProjectSearch}
                      onChange={(e) => setChartProjectSearch(e.target.value)}
                      className="w-full bg-white border border-[#E5E1D8] px-8 py-2 text-[10px] font-bold outline-none focus:border-[#1A1A1A] transition-colors"
                    />
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1A1A1A]" size={12} />
                  </div>
                </div>

                <div className="divide-y divide-[#F2F0EA]">
                  {buildings
                    .filter(b => normalizeArabic(b.name).includes(normalizeArabic(chartProjectSearch)))
                    .map(building => {
                    const isExpanded = expandedAccounts.includes(building.id);
                    const buildingTransactions = transactions.filter(t => t.buildingId === building.id);
                    const buildingIncome = buildingTransactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
                    const buildingExpense = buildingTransactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
                    
                    const cats: Record<string, { income: number; expense: number; count: number }> = {};
                    buildingTransactions.forEach(t => {
                      const catName = t.category || 'غير مصنف';
                      if (!cats[catName]) cats[catName] = { income: 0, expense: 0, count: 0 };
                      if (t.type === 'INCOME') cats[catName].income += t.amount;
                      else cats[catName].expense += t.amount;
                      cats[catName].count++;
                    });

                    return (
                      <div key={building.id} className="bg-white">
                        <button 
                          onClick={() => setExpandedAccounts(prev => 
                            prev.includes(building.id) ? prev.filter(id => id !== building.id) : [...prev, building.id]
                          )}
                          className="w-full flex items-center justify-between p-5 hover:bg-[#F9F7F2] transition-colors text-right"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-[#F2F0EA] border border-[#E5E1D8] flex items-center justify-center">
                              <BuildingIcon iconId={building.icon} size={18} />
                            </div>
                            <div className="text-right">
                              <h4 className="text-sm font-black tracking-tight">{building.name}</h4>
                              <p className="text-[9px] opacity-40 font-bold uppercase">{buildingTransactions.length} عملية موثقة</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="hidden md:flex flex-col items-end">
                              <span className="text-[9px] font-bold opacity-30 uppercase">صافي الرصيد</span>
                              <span className={cn("text-xs font-black tabular-nums", (buildingIncome - buildingExpense) >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                {formatCurrency(buildingIncome - buildingExpense)}
                              </span>
                            </div>
                            <div className={cn("transition-transform duration-300", isExpanded ? "rotate-180" : "")}>
                              <ChevronDown size={16} />
                            </div>
                          </div>
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden border-t border-[#F2F0EA] bg-[#F9F7F2]/30"
                            >
                              <div className="p-4 pr-16 space-y-8">
                                {/* حسابات المبنى */}
                                <div>
                                  <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                      <Wallet size={14} className="text-[#A08C5B]" />
                                      <span className="text-[10px] font-black uppercase tracking-widest">الحسابات المالية للمشروع</span>
                                    </div>
                                    {(!currentUser || currentUser.role === 'ADMIN') && (
                                      <button 
                                        onClick={() => setAddingAccountToBuildingId(addingAccountToBuildingId === building.id ? null : building.id)}
                                        className="text-[9px] font-black text-[#A08C5B] uppercase hover:underline"
                                      >
                                        + إضافة حساب مالي
                                      </button>
                                    )}
                                  </div>
                                  
                                  {addingAccountToBuildingId === building.id && (!currentUser || currentUser.role === 'ADMIN') && (
                                    <div className="bg-white border-2 border-[#1A1A1A] p-6 mb-8 space-y-6 shadow-brutal-sm relative animate-in fade-in slide-in-from-top-2">
                                      {/* Header indicating the building */}
                                      <div className="flex items-center gap-3 pb-4 border-b-2 border-[#1A1A1A]/5">
                                        <div className="w-8 h-8 bg-[#1A1A1A] text-white flex items-center justify-center">
                                          <Plus size={14} />
                                        </div>
                                        <div>
                                          <p className="text-[10px] font-black uppercase tracking-widest text-[#A08C5B]">إضافة حساب مالي جديد</p>
                                          <p className="text-[11px] font-black uppercase">التابع لمشروع: <span className="underline decoration-[#A08C5B] decoration-2">{building.name}</span></p>
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                          <label className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest opacity-60">
                                            <span>اسم الحساب</span>
                                            <span className="text-rose-500">*</span>
                                          </label>
                                          <input 
                                            type="text"
                                            value={newAccountName}
                                            onChange={(e) => setNewAccountName(e.target.value)}
                                            placeholder="مثل: عهدة الموقع، بنك البلاد..."
                                            className="w-full bg-[#F2F0EA] p-3 text-xs font-bold border-2 border-transparent focus:border-[#1A1A1A] transition-all outline-none"
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <label className="text-[9px] font-black uppercase tracking-widest opacity-60">نوع الحساب</label>
                                          <select 
                                            value={newAccountType}
                                            onChange={(e) => setNewAccountType(e.target.value as any)}
                                            className="w-full bg-[#F2F0EA] p-3 text-xs font-bold border-2 border-transparent focus:border-[#1A1A1A] transition-all outline-none"
                                          >
                                            <option value="CASH">نقدي (كاش)</option>
                                            <option value="BANK">تحويل بنكي</option>
                                            <option value="CREDIT">ائتمان / عهدة</option>
                                            <option value="OTHER">أخرى</option>
                                          </select>
                                        </div>
                                        <div className="space-y-2">
                                          <div className="flex items-center justify-between">
                                            <label className="text-[9px] font-black uppercase tracking-widest opacity-60">الرصيد الافتتاحي</label>
                                            <div className="group relative">
                                              <Info size={12} className="text-[#A08C5B] cursor-help" />
                                              <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-[#1A1A1A] text-white text-[8px] font-bold leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-brutal-sm">
                                                المبلغ المتوفر حالياً في هذا الحساب قبل تسجيل أي عمليات جديدة في النظام.
                                              </div>
                                            </div>
                                          </div>
                                          <input 
                                            type="number"
                                            value={newAccountInitialBalance}
                                            onChange={(e) => setNewAccountInitialBalance(Number(e.target.value) || '')}
                                            className="w-full bg-[#F2F0EA] p-3 text-xs font-bold border-2 border-transparent focus:border-[#1A1A1A] transition-all outline-none tabular-nums"
                                            placeholder="0.00"
                                          />
                                          <p className="text-[8px] font-bold opacity-40 italic mt-1 leading-tight">سيتم اعتبار هذا المبلغ كنقطة بداية لجميع العمليات الحسابية اللاحقة.</p>
                                        </div>
                                      </div>
                                      <div className="flex justify-end gap-3 pt-4">
                                        <button 
                                          onClick={() => setAddingAccountToBuildingId(null)}
                                          className="px-6 py-3 text-[10px] font-black uppercase tracking-wider hover:bg-slate-100 transition-all"
                                        >
                                          إلغاء
                                        </button>
                                        <button 
                                          onClick={addAccount}
                                          className="px-8 py-3 bg-[#1A1A1A] text-white text-[10px] font-black uppercase tracking-widest shadow-brutal hover:translate-y-[-2px] transition-all"
                                        >
                                          تأكيد إضافة الحساب
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    {accounts.filter(a => a.buildingId === building.id).map(acc => {
                                      const accTxs = transactions.filter(t => t.accountId === acc.id);
                                      const accBalance = acc.initialBalance + 
                                        accTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0) -
                                        accTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
                                      
                                      return (
                                        <div key={acc.id} className="bg-white border-2 border-[#F2F0EA] p-3 hover:border-[#A08C5B] transition-colors group relative">
                                          {editingAccountId === acc.id ? (
                                            <div className="space-y-3 bg-[#F9F7F2] p-2 -m-2 mb-0">
                                              <input 
                                                type="text"
                                                value={editingAccountName}
                                                onChange={(e) => setEditingAccountName(e.target.value)}
                                                className="w-full bg-white border border-[#E5E1D8] p-1.5 text-xs font-bold outline-none"
                                                autoFocus
                                              />
                                              <div className="grid grid-cols-2 gap-2">
                                                <select 
                                                  value={editingAccountType}
                                                  onChange={(e) => setEditingAccountType(e.target.value as any)}
                                                  className="bg-white border border-[#E5E1D8] p-1.5 text-[10px] font-bold outline-none"
                                                >
                                                  <option value="CASH">نقدي</option>
                                                  <option value="BANK">بنكي</option>
                                                  <option value="CREDIT">ائتمان</option>
                                                  <option value="OTHER">أخرى</option>
                                                </select>
                                                <input 
                                                  type="number"
                                                  value={editingAccountInitialBalance}
                                                  onChange={(e) => setEditingAccountInitialBalance(Number(e.target.value) || 0)}
                                                  className="bg-white border border-[#E5E1D8] p-1.5 text-[10px] font-bold outline-none"
                                                />
                                              </div>
                                              <div className="flex gap-1">
                                                <button 
                                                  onClick={updateAccount}
                                                  className="flex-1 bg-[#1A1A1A] text-white text-[9px] font-bold py-1 uppercase"
                                                >
                                                  حفظ
                                                </button>
                                                <button 
                                                  onClick={() => setEditingAccountId(null)}
                                                  className="flex-1 bg-white border border-[#E5E1D8] text-[9px] font-bold py-1 uppercase"
                                                >
                                                  إلغاء
                                                </button>
                                              </div>
                                            </div>
                                          ) : (
                                            <>
                                              <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                  <div className="w-6 h-6 bg-[#F2F0EA] flex items-center justify-center rounded-sm">
                                                    {acc.type === 'BANK' ? <CreditCard size={12} /> : acc.type === 'CREDIT' ? <Zap size={12} /> : <Coins size={12} />}
                                                  </div>
                                                  <span className="text-[10px] font-black uppercase tracking-tight">{acc.name}</span>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                  {(!currentUser || currentUser.role === 'ADMIN') && (
                                                    <button 
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingAccountId(acc.id);
                                                        setEditingAccountName(acc.name);
                                                        setEditingAccountType(acc.type);
                                                        setEditingAccountInitialBalance(acc.initialBalance);
                                                      }}
                                                      className="text-[#A08C5B] hover:text-[#8C7A4B] p-1"
                                                    >
                                                      <Edit3 size={10} />
                                                    </button>
                                                  )}
                                                  <button 
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setReportAccount(acc);
                                                    }}
                                                    className="text-indigo-500 hover:text-indigo-700 p-1"
                                                    title="كشف حساب"
                                                  >
                                                    <FileText size={10} />
                                                  </button>
                                                  {(!currentUser || currentUser.role === 'ADMIN') && (
                                                    <button 
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteAccount(acc.id);
                                                      }}
                                                      className="text-rose-500 hover:text-rose-700 p-1"
                                                    >
                                                      <Trash2 size={10} />
                                                    </button>
                                                  )}
                                                </div>
                                              </div>
                                              <div className="flex flex-col">
                                                <span className="text-[8px] opacity-30 font-bold uppercase">الرصيد المتوفر</span>
                                                <span className={cn("text-sm font-black tabular-nums", accBalance >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                                  {formatCurrency(accBalance)}
                                                </span>
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      );
                                    })}
                                    {accounts.filter(a => a.buildingId === building.id).length === 0 && (
                                      <div className="col-span-full py-6 flex flex-col items-center justify-center border-2 border-dashed border-[#F2F0EA] opacity-40">
                                        <p className="text-[9px] font-bold uppercase italic">لا توجد حسابات فرعية مضافة</p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="h-px bg-[#F2F0EA]"></div>

                                {/* البنود المحاسبية */}
                                <div>
                                  <div className="flex items-center gap-2 mb-4">
                                    <Tag size={14} className="text-[#A08C5B]" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">تفكيك المصاريف حسب البنود</span>
                                  </div>
                                  <div className="space-y-4 px-4 border-r-2 border-[#F2F0EA]">
                                    {Object.keys(cats).length > 0 ? (
                                      Object.entries(cats).sort((a,b) => b[1].expense - a[1].expense).map(([catName, stat]) => (
                                        <div key={catName} className="flex items-center justify-between py-2.5 border-b border-[#F2F0EA] last:border-0">
                                          <div className="flex items-center gap-3">
                                            <CategoryIcon 
                                              iconId={dbCategories.find(c => c.name === catName)?.icon} 
                                              size={10} 
                                              color={dbCategories.find(c => c.name === catName)?.color || '#1A1A1A'}
                                              className="w-5 h-5 flex-shrink-0"
                                              type={stat.expense > stat.income ? 'EXPENSE' : 'INCOME'}
                                            />
                                            <div className="text-right">
                                              <span className="text-[10px] font-black uppercase tracking-tight">{catName}</span>
                                              <span className="mr-2 text-[8px] font-bold opacity-30">({stat.count} قيود)</span>
                                            </div>
                                          </div>
                                          <div className="flex gap-6 text-left">
                                            {stat.income > 0 && (
                                              <div className="flex flex-col items-end">
                                                <span className="text-[7px] opacity-40 font-bold uppercase">وارد (+)</span>
                                                <span className="text-[9px] font-bold text-emerald-600 tabular-nums font-mono">{formatCurrency(stat.income)}</span>
                                              </div>
                                            )}
                                            {stat.expense > 0 && (
                                              <div className="flex flex-col items-end">
                                                <span className="text-[7px] opacity-40 font-bold uppercase">مصروف (-)</span>
                                                <span className="text-[9px] font-bold text-[#1A1A1A] tabular-nums font-mono">{formatCurrency(stat.expense)}</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-[9px] font-bold opacity-30 italic py-4">لا توجد بنود محاسبية مسجلة</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
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
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 flex-1 opacity-40">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">تصفية السجلات</span>
                    <div className="h-px flex-1 bg-[#1A1A1A] opacity-10"></div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => {
                        const allKeys = groupedHistoryTransactions.map(g => g.sortKey);
                        setExpandedMonths(expandedMonths.length === allKeys.length ? [] : allKeys);
                      }}
                      className="text-[10px] font-black uppercase tracking-widest hover:text-[#1A1A1A] transition-colors flex items-center gap-1 opacity-60 hover:opacity-100"
                    >
                      <ListFilter size={12} />
                      {expandedMonths.length === groupedHistoryTransactions.length ? 'طي الكل' : 'توسيع الكل'}
                    </button>
                    <button 
                      onClick={resetFilters}
                      className="text-[10px] font-black uppercase tracking-widest hover:text-[#1A1A1A] transition-colors flex items-center gap-1 opacity-60 hover:opacity-100"
                    >
                      <X size={12} />
                      إعادة ضبط الفلاتر
                    </button>
                  </div>
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
                    <label className="text-[9px] font-bold uppercase opacity-40">الحساب المالي</label>
                    <select 
                      className="w-full bg-[#F2F0EA] p-2 text-xs font-bold outline-none"
                      value={filterAccountId}
                      onChange={(e) => setFilterAccountId(e.target.value)}
                    >
                      <option value="ALL">الكل</option>
                      {accounts.filter(a => a.buildingId === activeBuildingId || activeBuildingId === 'ALL').map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
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
                        <th className="px-6 py-4 text-center">الكمية والتسعير</th>
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
                                      صافي التدفق: {formatCurrency(group.transactions.reduce((acc, curr) => acc + (curr.type === 'INCOME' ? curr.amount : -curr.amount), 0))}
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
                                      {t.accountId && ` | ${accounts.find(a => a.id === t.accountId)?.name || 'حساب محذوف'}`}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <CategoryIcon 
                                      iconId={dbCategories.find(c => c.name === t.category)?.icon} 
                                      size={10} 
                                      color={dbCategories.find(c => c.name === t.category)?.color || (t.type === 'INCOME' ? '#065F46' : '#A08C5B')}
                                      className="w-5 h-5 shadow-sm"
                                      type={t.type}
                                    />
                                    <span className={cn(
                                      "px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter border",
                                      t.type === 'INCOME' ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-slate-200 text-slate-500 bg-slate-50"
                                    )}>
                                      {t.category}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-center tabular-nums font-medium text-[10px]">
                                  {t.quantity ? (
                                    <div className="flex flex-col">
                                      <span>{t.quantity}</span>
                                      {t.unitPrice && (
                                        <span className="text-[8px] opacity-40 font-bold">
                                          {formatCurrency(t.unitPrice)}
                                        </span>
                                      )}
                                    </div>
                                  ) : '-'}
                                </td>
                                <td className="px-6 py-4 font-black tabular-nums">
                                  <div className="flex flex-col">
                                    <span className={t.type === 'INCOME' ? "text-emerald-700" : "text-[#1A1A1A]"}>
                                      {t.type === 'INCOME' ? '+' : ''} {formatCurrency(t.amount)}
                                    </span>
                                    {t.quantity && t.unitPrice && (
                                      <span className="text-[8px] opacity-40 font-bold uppercase flex items-center gap-0.5">
                                        <span>{t.quantity}</span>
                                        <span className="text-[6px] opacity-60">×</span>
                                        <span>{formatCurrency(t.unitPrice)}</span>
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <div className="flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                      onClick={() => setSelectedTransactionDetail(t)}
                                      className="text-slate-300 hover:text-emerald-500 transition-colors"
                                      title="عرض التفاصيل"
                                    >
                                      <Eye size={16} />
                                    </button>
                                    {(!currentUser || currentUser.role === 'ADMIN') && (
                                      <button 
                                        onClick={() => startEdit(t)}
                                        className="text-slate-300 hover:text-[#A08C5B] transition-colors"
                                        title="تعديل"
                                      >
                                        <Edit3 size={16} />
                                      </button>
                                    )}
                                    {(!currentUser || currentUser.role === 'ADMIN') && (
                                      <button 
                                        onClick={() => deleteTransaction(t.id)}
                                        className="text-slate-300 hover:text-rose-500 transition-colors"
                                        title="حذف"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    )}
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
        )}
      </main>

      {/* Transaction Detail Modal */}
      <AnimatePresence>
        {reportAccount && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
            dir="rtl"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white border-4 border-[#1A1A1A] shadow-brutal w-full max-w-lg overflow-hidden flex flex-col"
            >
              <div className="bg-[#1A1A1A] p-6 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <FileText className="text-indigo-400" size={24} />
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">تصدير كشف حساب</h3>
                    <p className="text-[10px] font-bold opacity-60 uppercase">{reportAccount.name}</p>
                  </div>
                </div>
                <button onClick={() => setReportAccount(null)}>
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-8 space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase opacity-40">من تاريخ</label>
                    <input 
                      type="date"
                      value={accountReportRange.start}
                      onChange={(e) => setAccountReportRange(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full bg-[#F2F0EA] border-2 border-[#1A1A1A] p-3 text-xs font-bold outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase opacity-40">إلى تاريخ</label>
                    <input 
                      type="date"
                      value={accountReportRange.end}
                      onChange={(e) => setAccountReportRange(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full bg-[#F2F0EA] border-2 border-[#1A1A1A] p-3 text-xs font-bold outline-none"
                    />
                  </div>
                </div>

                <div className="bg-indigo-50 border-2 border-indigo-100 p-4 flex gap-4 items-start">
                  <Info className="text-indigo-500 shrink-0" size={16} />
                  <p className="text-[10px] font-bold text-indigo-900 leading-relaxed">
                    سيتم توليد ملف PDF يحتوي على جميع العمليات المالية الصادرة والواردة لهذا الحساب ضمن النطاق الزمني المحدد، مع حساب الرصيد الختامي.
                  </p>
                </div>
              </div>

              <div className="bg-[#F2F0EA] p-6 border-t-4 border-[#1A1A1A] flex gap-3">
                <button 
                  onClick={() => setReportAccount(null)}
                  className="flex-1 py-3 border-2 border-[#1A1A1A] text-[11px] font-black uppercase tracking-widest hover:bg-white transition-all"
                >
                  إلغاء
                </button>
                <button 
                  onClick={generateAccountPDFReport}
                  disabled={isGeneratingAccountPDF}
                  className="flex-3 py-3 bg-[#1A1A1A] text-white text-[11px] font-black uppercase tracking-widest shadow-brutal hover:translate-y-[-2px] transition-all disabled:opacity-50"
                >
                  {isGeneratingAccountPDF ? 'جاري التحميل...' : 'تحميل الكشف بصيغة PDF'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {viewingBuildingDetails && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 md:p-8"
            dir="rtl"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white border-4 border-[#1A1A1A] shadow-brutal w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative"
            >
              <div className="bg-[#1A1A1A] p-6 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#A08C5B] flex items-center justify-center shadow-brutal-sm">
                    <BuildingIcon iconId={viewingBuildingDetails.icon} size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tighter uppercase">{viewingBuildingDetails.name}</h2>
                    <p className="text-[10px] font-bold opacity-60 tracking-widest uppercase">سجل بيانات المنشأة الرسمي</p>
                  </div>
                </div>
                <button 
                  onClick={() => setViewingBuildingDetails(null)}
                  className="w-10 h-10 border-2 border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto space-y-12">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="p-6 bg-[#ecfdf5] border-4 border-[#1A1A1A] shadow-brutal-sm rotate-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-emerald-600 text-white rounded-full">
                        <TrendingUp size={16} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800">إجمالي الوارد</span>
                    </div>
                    <p className="text-3xl font-black text-emerald-900 tabular-nums">
                      {formatCurrency(transactions.filter(t => t.buildingId === viewingBuildingDetails.id && t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0))}
                    </p>
                  </div>

                  <div className="p-6 bg-rose-50 border-4 border-[#1A1A1A] shadow-brutal-sm -rotate-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-rose-600 text-white rounded-full">
                        <TrendingDown size={16} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-rose-800">إجمالي المصروف</span>
                    </div>
                    <p className="text-3xl font-black text-rose-900 tabular-nums">
                      {formatCurrency(transactions.filter(t => t.buildingId === viewingBuildingDetails.id && t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0))}
                    </p>
                  </div>

                  <div className="p-6 bg-[#F9F7F2] border-4 border-[#1A1A1A] shadow-brutal-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-[#1A1A1A] text-white rounded-full">
                        <Wallet size={16} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-40 text-[#1A1A1A]">الرصيد الحالي</span>
                    </div>
                    <p className={cn(
                      "text-3xl font-black tabular-nums",
                      (transactions.filter(t => t.buildingId === viewingBuildingDetails.id && t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0) - transactions.filter(t => t.buildingId === viewingBuildingDetails.id && t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0)) >= 0 ? "text-emerald-900" : "text-rose-900"
                    )}>
                      {formatCurrency(transactions.filter(t => t.buildingId === viewingBuildingDetails.id && t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0) - transactions.filter(t => t.buildingId === viewingBuildingDetails.id && t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0))}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b-4 border-[#1A1A1A] pb-4">
                    <h3 className="text-xl font-black uppercase">آخر العمليات المسجلة</h3>
                    <span className="text-[10px] font-black text-white bg-[#1A1A1A] px-3 py-1 uppercase tracking-widest shadow-brutal-sm">السجل الإنشائي</span>
                  </div>

                  <div className="space-y-4">
                    {transactions
                      .filter(t => t.buildingId === viewingBuildingDetails.id)
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .slice(0, 5)
                      .map((t, idx) => (
                        <div key={t.id} className="flex items-center justify-between p-4 bg-white border-2 border-[#1A1A1A] hover:bg-[#F9F7F2] transition-colors group">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-10 h-10 flex items-center justify-center border-2 border-[#1A1A1A] shadow-brutal-sm transition-transform group-hover:scale-110",
                              t.type === 'INCOME' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                            )}>
                              {t.type === 'INCOME' ? <Plus size={16} /> : <Trash2 size={16} />}
                            </div>
                            <div>
                              <p className="text-sm font-black tracking-tight">{t.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold opacity-40 uppercase tabular-nums">{format(parseISO(t.date), 'dd/MM/yyyy')}</span>
                                <span className="w-1 h-1 bg-[#1A1A1A]/20 rounded-full"></span>
                                <span className="text-[10px] font-black uppercase text-[#A08C5B]">{t.category}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-left">
                            <p className={cn(
                              "text-lg font-black tabular-nums",
                              t.type === 'INCOME' ? "text-emerald-700" : "text-[#1A1A1A]"
                            )}>
                              {t.type === 'INCOME' ? '+' : '-'} {formatCurrency(t.amount)}
                            </p>
                          </div>
                        </div>
                      ))}
                    
                    {transactions.filter(t => t.buildingId === viewingBuildingDetails.id).length === 0 && (
                      <div className="p-12 text-center border-4 border-dashed border-[#F2F0EA] bg-[#F9F7F2]">
                        <p className="text-sm font-bold opacity-40">لا توجد عمليات مسجلة لهذا المشروع بعد.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-[#F2F0EA] p-6 border-t-4 border-[#1A1A1A] flex justify-end shrink-0">
                <button 
                  onClick={() => setViewingBuildingDetails(null)}
                  className="px-10 py-3 bg-[#1A1A1A] text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-brutal hover:translate-y-[-2px] transition-all"
                >
                  إغلاق السجل
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {selectedTransactionDetail && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="no-print fixed inset-0 bg-[#F9F7F2]/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 md:p-8"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white border-2 border-[#1A1A1A] shadow-[32px_32px_0px_rgba(0,0,0,0.1)] w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="bg-[#1A1A1A] p-6 flex justify-between items-center text-white">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 flex items-center justify-center bg-white text-[#1A1A1A]">
                    <Info size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight">تفاصيل العملية</h2>
                    <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">TRANSACTION ARCHIVE #{selectedTransactionDetail.id.slice(0,8).toUpperCase()}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedTransactionDetail(null)}
                  className="hover:rotate-90 transition-transform p-2"
                >
                  <X size={24} />
                </button>
              </div>

                <div className="p-8 md:p-12 space-y-12 overflow-y-auto max-h-[70vh] scrollbar-thin text-right" dir="rtl">
                  <div className="flex flex-col md:flex-row justify-between gap-8">
                    <div className="space-y-6 flex-1">
                      <div>
                        <span className="text-[10px] font-black uppercase text-[#A08C5B] tracking-widest block mb-2">البيان الرسمي للعملية</span>
                        <h3 className="text-3xl md:text-5xl font-black tracking-tighter leading-tight">
                          {selectedTransactionDetail.title}
                        </h3>
                      </div>
                      <div className="flex flex-wrap gap-4">
                        <div className="bg-[#1A1A1A] text-white px-4 py-2 flex items-center gap-3 shadow-brutal-sm">
                          <Calendar size={14} className="text-[#A08C5B]" />
                          <span className="text-[11px] font-black uppercase tabular-nums">
                            {format(new Date(selectedTransactionDetail.date), 'EEEE, dd MMMM yyyy', { locale: ar })}
                          </span>
                        </div>
                        <div className="border-2 border-[#1A1A1A] px-4 py-2 flex items-center gap-3 font-black text-[11px] uppercase tracking-widest">
                          <Tag size={14} className="text-[#A08C5B]" />
                          {selectedTransactionDetail.category}
                        </div>
                      </div>
                    </div>

                    <div className="ledger-container bg-[#1A1A1A] text-[#F9F7F2] p-8 min-w-[280px] shadow-brutal flex flex-col justify-center text-center rotate-2 scale-105">
                       <span className="text-[10px] font-black uppercase tracking-[0.4em] mb-4 text-[#A08C5B]">المبلغ المعتمد</span>
                       <p className="text-4xl md:text-5xl font-black tracking-tighter tabular-nums mb-2">
                        {formatCurrency(selectedTransactionDetail.amount)}
                      </p>
                      <div className="h-1.5 w-12 bg-[#A08C5B] mx-auto mt-4"></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-12 border-t-4 border-[#1A1A1A]">
                    <div className="space-y-8">
                      <div>
                        <span className="text-[10px] font-black uppercase text-[#A08C5B] tracking-widest block mb-4">التفاصيل المالية واللوجستية</span>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center py-3 border-b border-[#F2F0EA]">
                            <span className="text-[11px] font-black uppercase opacity-40">الحساب المالي</span>
                            <span className="text-sm font-black underline underline-offset-4 decoration-2 decoration-[#A08C5B]">
                              {accounts.find(a => a.id === selectedTransactionDetail.accountId)?.name || 'الخزينة العامة'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-3 border-b border-[#F2F0EA]">
                            <span className="text-[11px] font-black uppercase opacity-40">الحالة الإنشائية</span>
                            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-emerald-100 text-emerald-800">موثق ومؤكد</span>
                          </div>
                        </div>
                      </div>

                      {selectedTransactionDetail.tags && selectedTransactionDetail.tags.length > 0 && (
                        <div>
                          <span className="text-[10px] font-black uppercase text-[#A08C5B] tracking-widest block mb-4">الوسوم المرجعية</span>
                          <div className="flex flex-wrap gap-2">
                            {selectedTransactionDetail.tags.map(tag => (
                              <span key={tag} className="text-[10px] font-black border-2 border-[#1A1A1A] px-3 py-1 uppercase tracking-wider shadow-brutal-sm bg-white">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-8">
                      {(selectedTransactionDetail.quantity || selectedTransactionDetail.unitPrice) && (
                        <div className="bg-[#1A1A1A] text-[#F9F7F2] p-8 shadow-brutal border-r-4 border-[#A08C5B]">
                          <span className="text-[10px] font-black uppercase text-[#A08C5B] tracking-widest block mb-6">تفاصيل التوريد</span>
                          <div className="space-y-4">
                            <div className="flex justify-between items-baseline border-b border-white/10 pb-3">
                              <span className="text-[11px] font-black uppercase opacity-40">الكمية المقدرة</span>
                              <span className="text-xl font-black tabular-nums">{selectedTransactionDetail.quantity || '-'}</span>
                            </div>
                            <div className="flex justify-between items-baseline border-b border-white/10 pb-3">
                              <span className="text-[11px] font-black uppercase opacity-40">سعر الوحدة</span>
                              <span className="text-xl font-black tabular-nums">{selectedTransactionDetail.unitPrice ? formatCurrency(selectedTransactionDetail.unitPrice) : '-'}</span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {selectedTransactionDetail.note && (
                        <div className="space-y-4">
                          <span className="text-[10px] font-black uppercase text-[#A08C5B] tracking-widest block">ملاحظات المكتب الفني</span>
                          <div className="relative p-6 bg-[#F9F7F2] border-2 border-dashed border-[#1A1A1A] text-sm font-bold opacity-70 leading-relaxed italic pr-10">
                            <div className="absolute top-4 right-4 w-6 h-6 bg-[#A08C5B] flex items-center justify-center text-white text-[10px]">!</div>
                            {selectedTransactionDetail.note}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="ledger-header bg-[#F2F0EA] p-6 flex flex-col md:flex-row gap-4 border-t-4 border-[#1A1A1A]">
                  <button 
                    onClick={() => setSelectedTransactionDetail(null)}
                    className="flex-1 bg-white border-2 border-[#1A1A1A] py-4 text-[11px] font-black uppercase tracking-[0.2em] shadow-brutal-sm hover:translate-y-[-2px] transition-all"
                  >
                    إغلاق المجلد
                  </button>
                  <button 
                    onClick={() => {
                      setTimeout(() => window.print(), 100);
                    }}
                    className="flex-1 bg-[#1A1A1A] text-white py-4 text-[11px] font-black uppercase tracking-[0.2em] shadow-brutal flex items-center justify-center gap-3 hover:translate-y-[-2px] transition-all"
                  >
                    <Printer size={16} className="text-[#A08C5B]" />
                    طباعة المستند الرسمي
                  </button>
                </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Info */}
      <footer className="no-print max-w-7xl mx-auto p-8 flex flex-col md:flex-row justify-between items-center text-[10px] font-bold uppercase tracking-[0.2em] opacity-30 border-t border-[#E5E1D8] mt-12 gap-4">
        <div className="flex gap-4">
          <span>BUNYAN CONSTRUCTION v2.6</span>
          <span className="px-2 border-r border-[#1A1A1A]">بواسطة صالح محمد</span>
        </div>
        <span>CONFIDENTIAL PROPERTY RECORDS © {new Date().getFullYear()}</span>
      </footer>

      {/* Individual Transaction Printing Template */}
      {selectedTransactionDetail && (
        <div ref={singleTransactionRef} className="print-only text-right w-full min-h-screen bg-white p-0 m-0 box-border" dir="rtl">
          <div className="max-w-[21cm] mx-auto p-[2cm]">
            <div className="flex items-start justify-between border-b-8 border-[#1A1A1A] pb-10 mb-12">
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#A08C5B]">المملكة العربية السعودية</span>
                  <h1 className="text-5xl font-black tracking-tighter uppercase leading-none">بنيان</h1>
                </div>
                <div className="text-[11px] font-bold opacity-60 max-w-[300px] leading-relaxed">
                  مؤسسة بنيان للمقاولات العامة والتوريدات الإنشائية. سجل تجاري معتمد.
                  الرياض، المملكة العربية السعودية.
                </div>
              </div>
              <div className="text-left space-y-6">
                <div className="bg-[#1A1A1A] text-white p-6 shadow-brutal rotate-3">
                  <span className="text-[10px] font-black uppercase tracking-widest block mb-1 opacity-60">رقم السند</span>
                  <span className="text-xl font-mono font-black">{selectedTransactionDetail.id.slice(0,12).toUpperCase()}</span>
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest leading-loose">
                  تاريخ الطباعة: {format(new Date(), 'dd/MM/yyyy HH:mm')}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center bg-[#F9F7F2] border-2 border-[#1A1A1A] p-10 mb-12 shadow-brutal-sm">
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#A08C5B]">نوع السند</span>
                <h2 className="text-4xl font-black tracking-tighter uppercase">
                  {selectedTransactionDetail.type === 'INCOME' ? 'سند قبض مالي' : 'إذن صرف مواد'}
                </h2>
              </div>
              <div className="text-left space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">تاريخ الاستحقاق</span>
                <p className="text-lg font-black tabular-nums">{format(new Date(selectedTransactionDetail.date), 'dd/MM/yyyy')}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-8 mb-12">
              <div className="col-span-2 border-4 border-[#1A1A1A] bg-white p-10 relative">
                <div className="absolute top-0 right-0 w-3 h-full bg-[#A08C5B]"></div>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40 block mb-4">البيان والتفاصيل</span>
                <p className="text-2xl font-black mb-6 leading-tight">
                  {selectedTransactionDetail.title}
                </p>
                <div className="flex gap-4">
                  <span className="text-[10px] font-black border-2 border-[#1A1A1A] px-3 py-1 bg-[#F2F0EA]">#{selectedTransactionDetail.category}</span>
                  <span className="text-[10px] font-black border-2 border-[#1A1A1A] px-3 py-1 bg-[#F2F0EA]">#{accounts.find(a => a.id === selectedTransactionDetail.accountId)?.name || 'خزينة'}</span>
                </div>
              </div>
              <div className="bg-[#1A1A1A] text-white p-10 flex flex-col justify-center text-center shadow-brutal rotate-[-2deg]">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#A08C5B] mb-4">القيمة الصافية</span>
                <span className="text-4xl font-black tracking-tighter tabular-nums mb-2">
                  {formatCurrency(selectedTransactionDetail.amount)}
                </span>
                <div className="h-1 w-12 bg-[#A08C5B] mx-auto mt-2"></div>
              </div>
            </div>

            {(selectedTransactionDetail.quantity || selectedTransactionDetail.unitPrice || selectedTransactionDetail.note) && (
              <div className="grid grid-cols-2 gap-12 mb-16">
                <div className="space-y-8">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] border-b-4 border-[#1A1A1A] pb-3">المواصفات الفنية المعتمدة</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between border-b-2 border-[#F2F0EA] pb-3">
                      <span className="text-[11px] font-black uppercase opacity-40">الكمية المسجلة</span>
                      <span className="text-sm font-black tabular-nums">{selectedTransactionDetail.quantity || 'حسب الكشف المرفق'}</span>
                    </div>
                    <div className="flex justify-between border-b-2 border-[#F2F0EA] pb-3">
                      <span className="text-[11px] font-black uppercase opacity-40">سعر الوحدة</span>
                      <span className="text-sm font-black tabular-nums">{selectedTransactionDetail.unitPrice ? formatCurrency(selectedTransactionDetail.unitPrice) : '-'}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-8">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] border-b-4 border-[#1A1A1A] pb-3">توصيات المكتب والمهندس</h3>
                  <p className="text-sm font-bold opacity-60 leading-relaxed italic border-r-4 border-[#A08C5B] pr-6">
                    {selectedTransactionDetail.note || 'تمت المراجعة والاعتماد الفني في الموقع وفق الشروط والمواصفات.'}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-12 pt-20 border-t-2 border-[#1A1A1A]/10">
              <div className="text-center space-y-12">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">توقيع المحاسب</span>
                <div className="h-px w-3/4 mx-auto bg-[#1A1A1A] opacity-20"></div>
              </div>
              <div className="text-center space-y-12">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">توقيع المهندس المسؤول</span>
                <div className="h-px w-3/4 mx-auto bg-[#1A1A1A] opacity-20"></div>
              </div>
              <div className="text-center space-y-12">
                <div className="w-24 h-24 border-4 border-dashed border-[#1A1A1A] rounded-full mx-auto flex items-center justify-center opacity-10 rotate-12">
                  <span className="text-[8px] font-black uppercase text-center leading-tight">ختم المؤسسة<br/>الرسمي</span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">ختم الاعتماد الفني</span>
              </div>
            </div>

            <div className="mt-24 pt-8 border-t border-[#F2F0EA] flex justify-between items-center text-[8px] font-black uppercase tracking-[0.5em] text-[#999999]">
              <span>نظام بنيان لإدارة الأصول الإنشائية</span>
              <span>نهاية كشف السند</span>
            </div>
          </div>
        </div>
      )}

      {/* Printable Report Template */}
      {!selectedTransactionDetail && (
        <div ref={reportRef} className="print-only text-right w-full p-0 m-0 box-border bg-white" dir="rtl">
          <div className="max-w-[21cm] mx-auto p-[1cm] md:p-[2cm]">
            <div className="flex items-end justify-between border-b-8 border-[#1A1A1A] pb-8 mb-12">
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#A08C5B]">المملكة العربية السعودية</span>
                  <h1 className="text-6xl font-black tracking-tighter uppercase leading-none">بنيان</h1>
                </div>
                <div className="text-[12px] font-bold opacity-60 max-w-[400px] leading-relaxed">
                  تقرير الموقف المالي والميزانية المعتمدة للمشروع. 
                  نظام المتابعة الإنشائية وإدارة الموارد.
                </div>
              </div>
              <div className="text-left space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#999999]">تاريخ التقرير</p>
                <p className="text-2xl font-black tabular-nums">{format(new Date(), 'dd/MM/yyyy')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-12">
              <div className="bg-[#F9F7F2] p-10 border-4 border-[#1A1A1A] flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#A08C5B] block mb-4">بيانات الملف</span>
                  <p className="text-3xl font-black tracking-tight leading-tight uppercase">{activeBuilding?.name || 'سجل مجمع'}</p>
                </div>
                <div className="mt-8 pt-8 border-t border-[#1A1A1A]/10">
                  <p className="text-xs font-bold opacity-40 leading-relaxed italic">تقرير صادر عن المكتب الفني بمؤسسة بنيان للمقاولات.</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-[#1A1A1A] text-[#F9F7F2] p-8 flex justify-between items-center shadow-brutal rotate-1">
                   <span className="text-[10px] font-black uppercase tracking-widest text-[#A08C5B]">الحالة الإنشائية</span>
                   <span className="text-lg font-black uppercase italic tracking-tighter">نشط / معتمد</span>
                </div>
                <div className="bg-white border-4 border-[#1A1A1A] p-8 flex justify-between items-center">
                   <span className="text-[10px] font-black uppercase tracking-widest opacity-40">نسبة الإنجاز المالي</span>
                   <span className="text-3xl font-black tabular-nums">
                    {stats.totalIncome > 0 ? ((stats.totalExpenses / stats.totalIncome) * 100).toFixed(1) : '0'}%
                   </span>
                </div>
              </div>
            </div>

            {/* Print Metrics */}
            <div className="grid grid-cols-3 gap-8 mb-16">
              <div className="ledger-container p-8 space-y-4 bg-[#ecfdf5] border-[#a7f3d0] border-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800">إجمالي المودع (+)</span>
                <p className="text-2xl font-black text-emerald-900 tabular-nums">{formatCurrency(stats.totalIncome)}</p>
              </div>
              <div className="ledger-container p-8 space-y-4 bg-white border-2 border-[#F2F0EA]">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">إجمالي المنفذ (-)</span>
                <p className="text-2xl font-black tabular-nums">{formatCurrency(stats.totalExpenses)}</p>
              </div>
              <div className={cn(
                "ledger-container p-8 space-y-4 shadow-brutal border-2",
                stats.balance >= 0 ? "bg-[#ecfdf5] border-emerald-600" : "bg-rose-50 border-rose-600"
              )}>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">الرصيد الختامي</span>
                <p className={cn("text-2xl font-black tabular-nums", stats.balance >= 0 ? "text-emerald-900" : "text-rose-900")}>
                  {formatCurrency(stats.balance)}
                </p>
              </div>
            </div>

            <div className="space-y-16">
              <div>
                <h3 className="text-xl font-black border-r-8 border-[#1A1A1A] pr-6 py-2 mb-8 bg-[#F2F0EA] uppercase">1. ملخص التكاليف والمخصصات</h3>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#1A1A1A] text-white">
                      <th className="p-4 text-right text-[11px] font-black uppercase tracking-widest border-l border-white/10">التصنيف المحاسبي</th>
                      <th className="p-4 text-right text-[11px] font-black uppercase tracking-widest border-l border-white/10">الوارد</th>
                      <th className="p-4 text-right text-[11px] font-black uppercase tracking-widest border-l border-white/10">المنصرف</th>
                      <th className="p-4 text-right text-[11px] font-black uppercase tracking-widest">الرصيد المتاح</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryStats.map((item, idx) => (
                      <tr key={idx} className="border-b-2 border-[#1A1A1A]/10">
                        <td className="p-4 font-black">{item.name}</td>
                        <td className="p-4 font-bold tabular-nums text-emerald-700">{item.income > 0 ? formatCurrency(item.income) : '-'}</td>
                        <td className="p-4 font-bold tabular-nums text-rose-700">{item.expense > 0 ? formatCurrency(item.expense) : '-'}</td>
                        <td className="p-4 font-black tabular-nums bg-[#F9F7F2]">{formatCurrency(item.income - item.expense)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <h3 className="text-xl font-black border-r-8 border-[#1A1A1A] pr-6 py-2 mb-8 bg-[#F2F0EA] uppercase">2. المتابعة الشهرية والإحصائيات</h3>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#1A1A1A] text-white">
                      <th className="p-4 text-right text-[11px] font-black uppercase tracking-widest border-l border-white/10">الشهر</th>
                      <th className="p-4 text-right text-[11px] font-black uppercase tracking-widest border-l border-white/10">إجمالي الوارد</th>
                      <th className="p-4 text-right text-[11px] font-black uppercase tracking-widest border-l border-white/10">إجمالي المصروف</th>
                      <th className="p-4 text-right text-[11px] font-black uppercase tracking-widest">فائض / عجز</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyStats.map((stat, idx) => (
                      <tr key={idx} className="border-b-2 border-[#1A1A1A]/10">
                        <td className="p-4 font-black">{stat.month}</td>
                        <td className="p-4 font-bold tabular-nums text-emerald-700">{formatCurrency(stat.income)}</td>
                        <td className="p-4 font-bold tabular-nums text-rose-700">{formatCurrency(stat.expenses)}</td>
                        <td className={cn(
                          "p-4 font-black tabular-nums",
                          (stat.income - stat.expenses) >= 0 ? "text-emerald-900 bg-emerald-50" : "text-rose-900 bg-rose-50"
                        )}>
                          {formatCurrency(stat.income - stat.expenses)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <h3 className="text-xl font-black border-r-8 border-[#1A1A1A] pr-6 py-2 mb-8 bg-[#F2F0EA] uppercase">3. كشف العمليات التفصيلي</h3>
                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-[#1A1A1A] text-white">
                      <th className="p-3 text-right font-black uppercase tracking-widest border-l border-white/10">التاريخ</th>
                      <th className="p-3 text-right font-black uppercase tracking-widest border-l border-white/10">البيان الرسمي</th>
                      <th className="p-3 text-right font-black uppercase tracking-widest border-l border-white/10">التصنيف</th>
                      <th className="p-3 text-right font-black uppercase tracking-widest border-l border-white/10">إيداع (+)</th>
                      <th className="p-3 text-right font-black uppercase tracking-widest border-l border-white/10">صرف (-)</th>
                      <th className="p-3 text-right font-black uppercase tracking-widest">الرصيد الجاري</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerTransactions.map((t, idx) => (
                      <tr key={idx} className="border-b border-[#1A1A1A]/5 hover:bg-[#F9F7F2]">
                        <td className="p-3 font-bold opacity-60 tabular-nums">{format(parseISO(t.date), 'dd/MM/yyyy')}</td>
                        <td className="p-3 font-black text-[11px]">{t.title}</td>
                        <td className="p-3 font-bold opacity-60">{t.category}</td>
                        <td className="p-3 font-black text-emerald-700">{t.type === 'INCOME' ? formatCurrency(t.amount) : '-'}</td>
                        <td className="p-3 font-black text-rose-700">{t.type === 'EXPENSE' ? formatCurrency(t.amount) : '-'}</td>
                        <td className={cn(
                          "p-3 font-black tabular-nums border-r-2",
                          t.runningBalance >= 0 ? "border-emerald-600 bg-emerald-100/30" : "border-rose-600 bg-rose-100/30"
                        )}>
                          {formatCurrency(t.runningBalance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-20 mt-32">
              <div className="text-center pt-8 border-t-4 border-[#1A1A1A]">
                <span className="text-[12px] font-black uppercase tracking-[0.3em] opacity-40">توقيع المراجعة المالية</span>
              </div>
              <div className="text-center pt-8 border-t-4 border-[#1A1A1A]">
                <span className="text-[12px] font-black uppercase tracking-[0.3em] opacity-40">اعتماد المهندس المسؤول</span>
              </div>
            </div>

            <div className="mt-40 pt-10 border-t-2 border-[#F2F0EA] flex justify-between items-center text-[10px] font-black uppercase tracking-[0.5em] text-[#999999]">
              <span>نظام بنيان لإدارة الأصول</span>
              <span>CONFIDENTIAL - PROJECT EYES ONLY</span>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Account printable component */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div ref={accountReportRef} className="p-16 bg-[#F9F7F2] w-[850px] min-h-[1100px] text-right" dir="rtl">
          {reportAccount && (
            <div className="space-y-12">
              {/* Header */}
              <div className="flex justify-between items-start border-b-8 border-[#1A1A1A] pb-8">
                <div>
                  <h1 className="text-4xl font-black tracking-tighter uppercase mb-2">كشف حساب مالي تفصيلي</h1>
                  <div className="flex items-center gap-3">
                    <span className="text-[12px] font-black bg-[#1A1A1A] text-white px-3 py-1 uppercase tracking-widest">{reportAccount.name}</span>
                    <span className="text-[12px] font-bold opacity-60">نظام إدارة البنيان الرقمي - النسخة الهندسية</span>
                  </div>
                </div>
                <div className="text-left font-black tabular-nums">
                  <p className="text-lg">#{reportAccount.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-[10px] opacity-40 uppercase">{format(new Date(), 'EEEE, dd MMMM yyyy', { locale: ar })}</p>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-12">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase opacity-40 tracking-widest">معلومات الحساب</h3>
                  <div className="space-y-2">
                    <p className="text-xl font-black">{reportAccount.name}</p>
                    <p className="text-sm font-bold opacity-60">نوع الحساب: {reportAccount.type === 'BANK' ? 'بنكي' : reportAccount.type === 'CREDIT' ? 'ائتمان' : 'نقدي'}</p>
                    <p className="text-sm font-bold opacity-60">مشروع التبعية: {buildings.find(b => b.id === reportAccount.buildingId)?.name || 'عام'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase opacity-40 tracking-widest">نطاق التقرير</h3>
                  <div className="space-y-2">
                    <p className="text-xl font-black tabular-nums">{format(parseISO(accountReportRange.start), 'dd/MM/yyyy')} ⮕ {format(parseISO(accountReportRange.end), 'dd/MM/yyyy')}</p>
                    <p className="text-sm font-bold opacity-60">تاريخ الإصدار: {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
                  </div>
                </div>
              </div>

              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-8">
                <div className="p-6 bg-emerald-50 border-4 border-[#1A1A1A] shadow-brutal-sm">
                  <h4 className="text-[10px] font-black uppercase opacity-40 mb-2">إجمالي الإيداعات</h4>
                  <p className="text-2xl font-black tabular-nums text-emerald-700">
                    {formatCurrency(transactions
                      .filter(t => t.accountId === reportAccount.id && t.type === 'INCOME' && t.date >= accountReportRange.start && t.date <= accountReportRange.end)
                      .reduce((sum, t) => sum + t.amount, 0))}
                  </p>
                </div>
                <div className="p-6 bg-rose-50 border-4 border-[#1A1A1A] shadow-brutal-sm">
                  <h4 className="text-[10px] font-black uppercase opacity-40 mb-2">إجمالي المسحوبات</h4>
                  <p className="text-2xl font-black tabular-nums text-rose-700">
                    {formatCurrency(transactions
                      .filter(t => t.accountId === reportAccount.id && t.type === 'EXPENSE' && t.date >= accountReportRange.start && t.date <= accountReportRange.end)
                      .reduce((sum, t) => sum + t.amount, 0))}
                  </p>
                </div>
                <div className="p-6 bg-white border-4 border-[#1A1A1A] shadow-brutal-sm">
                  <h4 className="text-[10px] font-black uppercase opacity-40 mb-2">صافي الحركة</h4>
                  <p className="text-2xl font-black tabular-nums">
                    {formatCurrency(
                      transactions.filter(t => t.accountId === reportAccount.id && t.type === 'INCOME' && t.date >= accountReportRange.start && t.date <= accountReportRange.end).reduce((sum, t) => sum + t.amount, 0) -
                      transactions.filter(t => t.accountId === reportAccount.id && t.type === 'EXPENSE' && t.date >= accountReportRange.start && t.date <= accountReportRange.end).reduce((sum, t) => sum + t.amount, 0)
                    )}
                  </p>
                </div>
              </div>

              {/* Transaction List */}
              <div className="space-y-6">
                <h3 className="text-xl font-black border-r-8 border-[#1A1A1A] pr-6 py-2 bg-[#F2F0EA] uppercase">بيان العمليات التفصيلي</h3>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#1A1A1A] text-white">
                      <th className="p-4 text-right text-[11px] font-black uppercase tracking-widest border-l border-white/10">التاريخ</th>
                      <th className="p-4 text-right text-[11px] font-black uppercase tracking-widest border-l border-white/10">البيان</th>
                      <th className="p-4 text-right text-[11px] font-black uppercase tracking-widest border-l border-white/10">التصنيف</th>
                      <th className="p-4 text-right text-[11px] font-black uppercase tracking-widest border-l border-white/10">وارد (+)</th>
                      <th className="p-4 text-right text-[11px] font-black uppercase tracking-widest border-l border-white/10">منصرف (-)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions
                      .filter(t => t.accountId === reportAccount.id && t.date >= accountReportRange.start && t.date <= accountReportRange.end)
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((t) => (
                        <tr key={t.id} className="border-b-2 border-[#1A1A1A]/10">
                          <td className="p-4 font-bold tabular-nums text-[12px]">{format(parseISO(t.date), 'dd/MM/yyyy')}</td>
                          <td className="p-4 font-black">{t.title}</td>
                          <td className="p-4 font-bold text-[10px] uppercase opacity-60 tracking-wider">{t.category}</td>
                          <td className="p-4 font-black tabular-nums text-emerald-700">{t.type === 'INCOME' ? formatCurrency(t.amount) : '-'}</td>
                          <td className="p-4 font-black tabular-nums text-rose-700">{t.type === 'EXPENSE' ? formatCurrency(t.amount) : '-'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="pt-12 border-t-2 border-[#1A1A1A]/10 flex justify-between items-center">
                <p className="text-[10px] font-bold opacity-40 uppercase">تم توليد هذا التقرير آلياً - نظام المساعدة الرقمي</p>
                <div className="flex gap-8">
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase mb-4 opacity-60">المحاسب المسؤول</p>
                    <div className="w-32 h-1 border-b-2 border-dotted border-[#1A1A1A]"></div>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase mb-4 opacity-60">ختم الاعتماد</p>
                    <div className="w-32 h-16 border-2 border-dashed border-[#1A1A1A]/20"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
