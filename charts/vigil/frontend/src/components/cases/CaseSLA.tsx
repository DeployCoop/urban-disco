import { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  Chip,
  LinearProgress,
  Grid,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material'
import {
  AccessTime as TimeIcon,
  Pause as PauseIcon,
  PlayArrow as ResumeIcon,
  Warning as WarningIcon,
  CheckCircle as MetIcon,
} from '@mui/icons-material'
import { casesApi } from '../../services/api'

interface SLA {
  id: string
  case_id: string
  policy_name: string
  due_date: string
  status: string
  breached_at?: string
  paused_at?: string
  paused_duration_seconds: number
  created_at: string
  updated_at: string
}

interface CaseSLAProps {
  caseId: string
}

export default function CaseSLA({ caseId }: CaseSLAProps) {
  const [sla, setSLA] = useState<SLA | null>(null)
  const [loading, setLoading] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState('')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    loadSLA()
    const interval = setInterval(updateTimeRemaining, 1000)
    return () => clearInterval(interval)
  }, [caseId])

  useEffect(() => {
    updateTimeRemaining()
  }, [sla])

  const loadSLA = async () => {
    setLoading(true)
    try {
      const response = await casesApi.getSLA(caseId)
      setSLA(response.data.sla || null)
    } catch (error) {
      console.error('Failed to load SLA:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePauseSLA = async () => {
    try {
      await casesApi.pauseSLA(caseId)
      await loadSLA()
    } catch (error) {
      console.error('Failed to pause SLA:', error)
    }
  }

  const handleResumeSLA = async () => {
    try {
      await casesApi.resumeSLA(caseId)
      await loadSLA()
    } catch (error) {
      console.error('Failed to resume SLA:', error)
    }
  }

  const updateTimeRemaining = () => {
    if (!sla) return

    const now = new Date()
    const dueDate = new Date(sla.due_date)
    const createdAt = new Date(sla.created_at)
    const totalTime = dueDate.getTime() - createdAt.getTime()
    const remaining = dueDate.getTime() - now.getTime()

    // Calculate progress percentage
    const elapsed = totalTime - remaining
    const progressPercent = Math.max(0, Math.min(100, (elapsed / totalTime) * 100))
    setProgress(progressPercent)

    if (sla.status === 'paused') {
      setTimeRemaining('SLA Paused')
      return
    }

    if (remaining <= 0 || sla.status === 'breached') {
      setTimeRemaining('SLA Breached')
      return
    }

    if (sla.status === 'met') {
      setTimeRemaining('SLA Met')
      return
    }

    // Format time remaining
    const days = Math.floor(remaining / (1000 * 60 * 60 * 24))
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000)

    let timeStr = ''
    if (days > 0) timeStr += `${days}d `
    if (hours > 0 || days > 0) timeStr += `${hours}h `
    if (minutes > 0 || hours > 0 || days > 0) timeStr += `${minutes}m `
    timeStr += `${seconds}s`

    setTimeRemaining(timeStr)
  }

  const getSLAStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'primary'
      case 'breached':
        return 'error'
      case 'met':
        return 'success'
      case 'paused':
        return 'warning'
      default:
        return 'default'
    }
  }

  const getSLAStatusIcon = (status: string) => {
    switch (status) {
      case 'breached':
        return <WarningIcon />
      case 'met':
        return <MetIcon />
      case 'paused':
        return <PauseIcon />
      default:
        return <TimeIcon />
    }
  }

  const getProgressColor = () => {
    if (!sla) return 'primary'
    if (sla.status === 'breached') return 'error'
    if (sla.status === 'met') return 'success'
    if (sla.status === 'paused') return 'warning'
    if (progress > 80) return 'error'
    if (progress > 60) return 'warning'
    return 'primary'
  }

  if (loading) {
    return (
      <Box>
        <Typography>Loading SLA...</Typography>
      </Box>
    )
  }

  if (!sla) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="info">No SLA policy assigned to this case.</Alert>
      </Paper>
    )
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography variant="h6" gutterBottom>
            SLA Tracking
          </Typography>
          <Chip
            icon={getSLAStatusIcon(sla.status)}
            label={sla.policy_name}
            color={getSLAStatusColor(sla.status) as any}
            sx={{ mr: 1 }}
          />
          <Chip label={sla.status.toUpperCase()} color={getSLAStatusColor(sla.status) as any} />
        </Box>
        <Box>
          {sla.status === 'active' && (
            <Tooltip title="Pause SLA Timer">
              <IconButton color="warning" onClick={handlePauseSLA}>
                <PauseIcon />
              </IconButton>
            </Tooltip>
          )}
          {sla.status === 'paused' && (
            <Tooltip title="Resume SLA Timer">
              <IconButton color="primary" onClick={handleResumeSLA}>
                <ResumeIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Box mb={1}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="body2" color="text.secondary">
                Time Remaining
              </Typography>
              <Typography
                variant="h6"
                color={
                  sla.status === 'breached'
                    ? 'error'
                    : sla.status === 'met'
                    ? 'success.main'
                    : 'text.primary'
                }
              >
                {timeRemaining}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              color={getProgressColor() as any}
              sx={{ height: 8, borderRadius: 1 }}
            />
          </Box>
        </Grid>

        <Grid item xs={6}>
          <Typography variant="body2" color="text.secondary">
            Due Date
          </Typography>
          <Typography variant="body1">
            {new Date(sla.due_date).toLocaleString()}
          </Typography>
        </Grid>

        <Grid item xs={6}>
          <Typography variant="body2" color="text.secondary">
            Created
          </Typography>
          <Typography variant="body1">
            {new Date(sla.created_at).toLocaleString()}
          </Typography>
        </Grid>

        {sla.breached_at && (
          <Grid item xs={12}>
            <Alert severity="error">
              SLA breached at {new Date(sla.breached_at).toLocaleString()}
            </Alert>
          </Grid>
        )}

        {sla.paused_at && sla.status === 'paused' && (
          <Grid item xs={12}>
            <Alert severity="warning">
              SLA timer paused at {new Date(sla.paused_at).toLocaleString()}
              <br />
              Total paused time: {Math.floor(sla.paused_duration_seconds / 60)} minutes
            </Alert>
          </Grid>
        )}
      </Grid>
    </Paper>
  )
}

