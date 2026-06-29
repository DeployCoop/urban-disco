import { Chip, alpha } from '@mui/material'
import { statusColors } from '../../theme'

interface StatusBadgeProps {
  status: string
  size?: 'small' | 'medium'
}

const statusLabels: Record<string, string> = {
  open: 'Open',
  'in-progress': 'In Progress',
  'in_progress': 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  executed: 'Executed',
  new: 'New',
}

export default function StatusBadge({ status, size = 'small' }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase().replace(' ', '-')
  const color = statusColors[normalizedStatus as keyof typeof statusColors] || '#64748B'
  const label = statusLabels[normalizedStatus] || status

  return (
    <Chip
      label={label}
      size={size}
      sx={{
        bgcolor: alpha(color, 0.15),
        color: color,
        fontWeight: 500,
        fontSize: '0.7rem',
        height: size === 'small' ? 20 : 24,
        '& .MuiChip-label': {
          px: 1,
        },
      }}
    />
  )
}
