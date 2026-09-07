import React from "react"
import {
  Globe,
  Link2,
  Star,
  Award,
  Heart,
  FileText,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ShoppingBag,
  CreditCard,
  Tag,
  Briefcase,
  Utensils,
  Coffee,
  Hotel,
  Plane,
  Camera,
  Video,
  Music,
  Mic,
  BookOpen,
  Gift,
} from "lucide-react"

export interface CustomIconOption {
  id: string
  label: string
  category: "general" | "commerce" | "hospitality" | "media"
}

export const POPULAR_ICONS: CustomIconOption[] = [
  { id: "globe", label: "Website", category: "general" },
  { id: "link", label: "General Link", category: "general" },
  { id: "star", label: "Reviews / Ratings", category: "general" },
  { id: "award", label: "Certificates / Awards", category: "general" },
  { id: "heart", label: "Favorites / Donations", category: "general" },
  { id: "file-text", label: "Brochure / PDF", category: "general" },
  { id: "mail", label: "Newsletter / Email", category: "general" },
  { id: "phone", label: "Support Hotline", category: "general" },
  { id: "map-pin", label: "Branch / Location", category: "general" },
  { id: "calendar", label: "Book Appointment", category: "commerce" },
  { id: "shopping-bag", label: "Store / Products", category: "commerce" },
  { id: "credit-card", label: "Payment / Checkout", category: "commerce" },
  { id: "tag", label: "Offers / Coupons", category: "commerce" },
  { id: "briefcase", label: "Services / Portfolio", category: "commerce" },
  { id: "utensils", label: "Food Menu", category: "hospitality" },
  { id: "coffee", label: "Cafe & Drinks", category: "hospitality" },
  { id: "hotel", label: "Hotel / Rooms", category: "hospitality" },
  { id: "plane", label: "Travel & Tours", category: "hospitality" },
  { id: "camera", label: "Photos / Instagram", category: "media" },
  { id: "video", label: "Video / Showreel", category: "media" },
  { id: "music", label: "Music / Spotify", category: "media" },
  { id: "mic", label: "Podcast / Audio", category: "media" },
  { id: "book-open", label: "Catalogue / Menu", category: "general" },
  { id: "gift", label: "Special Promotion", category: "commerce" },
]

export const SOCIAL_PLATFORMS = [
  { id: "instagram", name: "Instagram", color: "#e1306c", placeholder: "https://instagram.com/username" },
  { id: "facebook", name: "Facebook", color: "#1877f2", placeholder: "https://facebook.com/page" },
  { id: "linkedin", name: "LinkedIn", color: "#0a66c2", placeholder: "https://linkedin.com/in/profile" },
  { id: "twitter", name: "X (Twitter)", color: "#000000", placeholder: "https://x.com/username" },
  { id: "tiktok", name: "TikTok", color: "#000000", placeholder: "https://tiktok.com/@username" },
  { id: "youtube", name: "YouTube", color: "#ff0000", placeholder: "https://youtube.com/@channel" },
  { id: "snapchat", name: "Snapchat", color: "#fffc00", placeholder: "https://snapchat.com/add/username" },
  { id: "telegram", name: "Telegram", color: "#24a1de", placeholder: "https://t.me/username" },
  { id: "threads", name: "Threads", color: "#000000", placeholder: "https://threads.net/@username" },
  { id: "pinterest", name: "Pinterest", color: "#bd081c", placeholder: "https://pinterest.com/username" },
  { id: "discord", name: "Discord", color: "#5865f2", placeholder: "https://discord.gg/invite" },
  { id: "spotify", name: "Spotify", color: "#1db954", placeholder: "https://open.spotify.com/artist/..." },
  { id: "github", name: "GitHub", color: "#24292e", placeholder: "https://github.com/username" },
] as const

export function renderCustomIcon(iconName?: string | null, className: string = "w-4 h-4") {
  const props = { className }
  switch (iconName?.toLowerCase()) {
    case "globe": return React.createElement(Globe, props)
    case "link": return React.createElement(Link2, props)
    case "star": return React.createElement(Star, props)
    case "award": return React.createElement(Award, props)
    case "heart": return React.createElement(Heart, props)
    case "file-text": return React.createElement(FileText, props)
    case "mail": return React.createElement(Mail, props)
    case "phone": return React.createElement(Phone, props)
    case "map-pin": return React.createElement(MapPin, props)
    case "calendar": return React.createElement(Calendar, props)
    case "shopping-bag": return React.createElement(ShoppingBag, props)
    case "credit-card": return React.createElement(CreditCard, props)
    case "tag": return React.createElement(Tag, props)
    case "briefcase": return React.createElement(Briefcase, props)
    case "utensils": return React.createElement(Utensils, props)
    case "coffee": return React.createElement(Coffee, props)
    case "hotel": return React.createElement(Hotel, props)
    case "plane": return React.createElement(Plane, props)
    case "camera": return React.createElement(Camera, props)
    case "video": return React.createElement(Video, props)
    case "music": return React.createElement(Music, props)
    case "mic": return React.createElement(Mic, props)
    case "book-open": return React.createElement(BookOpen, props)
    case "gift": return React.createElement(Gift, props)
    default: return React.createElement(Link2, props)
  }
}
