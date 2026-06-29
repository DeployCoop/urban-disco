import { Box, Card, CardContent, Typography, alpha, useTheme } from '@mui/material'
import { ReactNode } from 'react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: ReactNode
  color?: string
  onClick?: () => void
}

export default function StatCard({ title, value, subtitle, icon, color, onClick }: StatCardProps) {
  const theme = useTheme()
  const accentColor = color || theme.palette.primary.main

  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        '&:hover': onClick ? {
          borderColor: alpha(accentColor, 0.3),
          transform: 'translateY(-1px)',
        } : {},
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, flex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontSize: '0.7rem',
              }}
            >
              {title}
            </Typography>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                mt: 0.5,
                color: accentColor,
                fontSize: '1.75rem',
              }}
            >
              {value}
            </Typography>
            <Typography
              variant="caption"
              sx={{ 
                color: 'text.secondary', 
                mt: 0.5, 
                display: 'block',
                minHeight: '2.5em',
                lineHeight: '1.25em',
              }}
            >
              {subtitle || '\u00A0'}
            </Typography>
          </Box>
          {icon && (
            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                bgcolor: alpha(accentColor, 0.1),
                color: accentColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {icon}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  )
}
