import {
  Bed, BellRing, BookmarkCheck, BookOpen, Bot, CalendarCheck, CalendarClock, CalendarSync,
  Circle, ClipboardList, Clock, CloudSun, Coffee, CreditCard, Crown, Eye, FileCheck2, FileText,
  GitBranch, GraduationCap, Hand, Landmark, ListChecks, ListPlus, MessageCircleQuestion, Megaphone,
  Package, PackageCheck, PackageSearch, Plus, Presentation, QrCode, RefreshCcw, RefreshCw, Repeat,
  Ruler, Share2, Ship, ShieldCheck, ShoppingBag, ShoppingBasket, ShoppingCart, Soup, Sparkles,
  Stamp, Stethoscope, StickyNote, Timer, Truck, UserCheck, UserRound, Users, Zap,
  Utensils, ChefHat, ScanLine, MonitorPlay, SlidersHorizontal, Layers,
  type LucideIcon,
} from "lucide-react"

/**
 * Use-case cards in products.ts / industries.ts name their icon as a string.
 * This is the whitelist that resolves those names — anything unrecognised
 * falls back to a neutral mark rather than breaking the build.
 */
const ICONS: Record<string, LucideIcon> = {
  Bed, BellRing, BookmarkCheck, BookOpen, Bot, CalendarCheck, CalendarClock, CalendarSync,
  ClipboardList, Clock, CloudSun, Coffee, CreditCard, Crown, Eye, FileCheck2, FileText,
  GitBranch, GraduationCap, Hand, Landmark, ListChecks, ListPlus, MessageCircleQuestion, Megaphone,
  Package, PackageCheck, PackageSearch, Plus, Presentation, QrCode, RefreshCcw, RefreshCw, Repeat,
  Ruler, Share2, Ship, ShieldCheck, ShoppingBag, ShoppingBasket, ShoppingCart, Soup, Sparkles,
  Stamp, Stethoscope, StickyNote, Timer, Truck, UserCheck, UserRound, Users, Zap,
  Utensils, ChefHat, ScanLine, MonitorPlay, SlidersHorizontal, Layers,
}

export function UseCaseIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Circle
  return <Icon className={className} aria-hidden="true" />
}
