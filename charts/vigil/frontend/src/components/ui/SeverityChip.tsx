import { Chip, alpha } from '@mui/material'
import { severityColors } from '../../theme'

interface SeverityChipProps {
  severity: 'critical' | 'high' | 'medium' | 'low' | string
  size?: 'small' | 'medium'
}

export default function SeverityChip({ severity, size = 'small' }: SeverityChipProps) {
  const color = severityColors[severity as keyof typeof severityColors] || severityColors.low
  
  return (
    <Chip
      label={severity.charAt(0).toUpperCase() + severity.slice(1)}
      size={size}
      sx={{
        bgcolor: alpha(color, 0.15),
        color: color,
        fontWeight: 600,
        fontSize: '0.7rem',
        height: size === 'small' ? 20 : 24,
        '& .MuiChip-label': {
          px: 1,
        },
      }}
    />
  )
}
