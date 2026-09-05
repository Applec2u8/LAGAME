import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { AdSettings } from '../lib/supabase'

type AdSettingsContextType = {
  adSettings: AdSettings | null
  loading: boolean
  refresh: () => void
}

const AdSettingsContext = createContext<AdSettingsContextType>({
  adSettings: null,
  loading: true,
  refresh: () => {},
})

export const AdSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adSettings, setAdSettings] = useState<AdSettings | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('ad_settings')
      .select('*')
      .limit(1)
      .single()
    setAdSettings(data)
    setLoading(false)
  }

  useEffect(() => { fetchSettings() }, [])

  return (
    <AdSettingsContext.Provider value={{ adSettings, loading, refresh: fetchSettings }}>
      {children}
    </AdSettingsContext.Provider>
  )
}

export const useAdSettings = () => useContext(AdSettingsContext)
