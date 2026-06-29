import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { notificationService } from '../services/notifications'
import { configApi } from '../services/api'

interface NotificationContextType {
  notificationsEnabled: boolean
  setNotificationsEnabled: (enabled: boolean) => Promise<void>
  permissionGranted: boolean
  requestPermission: () => Promise<boolean>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notificationsEnabled, setNotificationsEnabledState] = useState(true)
  const [permissionGranted, setPermissionGranted] = useState(false)

  useEffect(() => {
    // Load notification settings from backend
    loadNotificationSettings()
    
    // Check if browser supports notifications and get permission status
    if (notificationService.isSupported()) {
      setPermissionGranted(Notification.permission === 'granted')
    }
  }, [])

  const loadNotificationSettings = async () => {
    try {
      const response = await configApi.getGeneral()
      const enabled = response.data.show_notifications ?? true
      setNotificationsEnabledState(enabled)
      notificationService.setEnabled(enabled)
    } catch (error) {
      console.error('Failed to load notification settings:', error)
    }
  }

  const setNotificationsEnabled = async (enabled: boolean) => {
    try {
      // If enabling notifications, request permission first
      if (enabled && notificationService.isSupported()) {
        const granted = await notificationService.requestPermission()
        setPermissionGranted(granted)
        
        if (!granted) {
          // Don't enable if permission was denied
          return
        }
      }

      // Update state
      setNotificationsEnabledState(enabled)
      notificationService.setEnabled(enabled)

      // Save to backend (will be done by Settings component)
    } catch (error) {
      console.error('Failed to set notification settings:', error)
      throw error
    }
  }

  const requestPermission = async () => {
    const granted = await notificationService.requestPermission()
    setPermissionGranted(granted)
    return granted
  }

  return (
    <NotificationContext.Provider
      value={{
        notificationsEnabled,
        setNotificationsEnabled,
        permissionGranted,
        requestPermission,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

