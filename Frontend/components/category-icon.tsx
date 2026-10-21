import {
  Blocks,
  ChartLine,
  GraduationCap,
  HandHeart,
  HeartPulse,
  Landmark,
  LifeBuoy,
  Megaphone,
  MessagesSquare,
  Palette,
  PenLine,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Terminal,
  Timer,
  Users,
  Utensils,
} from "lucide-react";

const ICONS: Record<string, typeof Tag> = {
  productivity: Timer,
  marketing: Megaphone,
  "finance-and-bookkeeping": Receipt,
  "e-commerce": ShoppingBag,
  education: GraduationCap,
  health: HeartPulse,
  communication: MessagesSquare,
  "developer-tools": Terminal,
  design: Palette,
  analytics: ChartLine,
  "hr-and-hiring": Users,
  "customer-support": LifeBuoy,
  "no-code": Blocks,
  security: ShieldCheck,
  content: PenLine,
  "islamic-finance": Landmark,
  "halal-food-and-lifestyle": Utensils,
  community: HandHeart,
};

export function CategoryIcon({ slug, size = 18 }: { slug: string; size?: number }) {
  const Icon = ICONS[slug] ?? Tag;
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" />;
}
