import { Navigate, Route, Routes } from 'react-router'
import { SettingsView } from '@/routes/settings-view'
import { WeekView } from '@/routes/week-view'
import { useApplyTheme, usePrintTheme } from '@/store/theme'

export default function App() {
  useApplyTheme()
  usePrintTheme()

  return (
    <Routes>
      <Route path="/" element={<WeekView />} />
      <Route path="/settings" element={<SettingsView />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
