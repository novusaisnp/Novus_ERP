
import * as React from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

// Export all components from their respective files
export { SidebarProvider, useSidebar } from "./sidebar/context"
export { Sidebar, SidebarInset } from "./sidebar/sidebar"
export { SidebarTrigger, SidebarRail } from "./sidebar/trigger"
export {
  SidebarInput,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
  SidebarContent,
} from "./sidebar/layout"
export { SidebarGroup, SidebarGroupLabel, SidebarGroupAction, SidebarGroupContent } from "./sidebar/group"
export {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuSkeleton,
} from "./sidebar/menu"
export { SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton } from "./sidebar/submenu"

// Re-export TooltipProvider for convenience
export { TooltipProvider }
