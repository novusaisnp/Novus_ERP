
import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  console.log('[Theme] ThemeProvider inicializado');
  
  return (
    <NextThemesProvider 
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      storageKey="novus-erp-theme"
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
