import { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Chip,
} from '@mui/material'
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/lab'
import {
  Edit as EditIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Update as UpdateIcon,
  Person as PersonIcon,
  Comment as CommentIcon,
  AttachFile as AttachIcon,
  Task as TaskIcon,
  Link as LinkIcon,
} from '@mui/icons-material'
import { casesApi } from '../../services/api'

interface AuditEntry {
  id: string
  case_id: string
  user: string
  action: string
  field_name?: string
  old_value?: string
  new_value?: string
  details?: any
  timestamp: string
}

interface CaseAuditLogProps {
  caseId: string
}

export default function CaseAuditLog({ caseId }: CaseAuditLogProps) {
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadAuditLog()
  }, [caseId])

  const loadAuditLog = async () => {
    setLoading(true)
    try {
      const response = await casesApi.getAuditLog(caseId)
      setAuditLog(response.data.audit_log || [])
    } catch (error) {
      console.error('Failed to load audit log:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'created':
        return <AddIcon />
      case 'updated':
      case 'modified':
        return <EditIcon />
      case 'deleted':
        return <DeleteIcon />
      case 'commented':
        return <CommentIcon />
      case 'attached':
        return <AttachIcon />
      case 'task_added':
        return <TaskIcon />
      case 'linked':
        return <LinkIcon />
      default:
        return <UpdateIcon />
    }
  }

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'created':
        return 'success'
      case 'updated':
      case 'modified':
        return 'primary'
      case 'deleted':
        return 'error'
      case 'commented':
        return 'info'
      default:
        return 'grey'
    }
  }

  const formatActionDescription = (entry: AuditEntry) => {
    if (entry.field_name) {
      return (
        <>
          <strong>{entry.action}</strong> field <Chip label={entry.field_name} size="small" sx={{ mx: 0.5 }} />
          {entry.old_value && entry.new_value && (
            <>
              from <Chip label={entry.old_value} size="small" color="error" variant="outlined" sx={{ mx: 0.5 }} />
              to <Chip label={entry.new_value} size="small" color="success" variant="outlined" sx={{ mx: 0.5 }} />
            </>
          )}
        </>
      )
    }
    return <strong>{entry.action}</strong>
  }

  if (loading) {
    return (
      <Box>
        <Typography>Loading audit log...</Typography>
      </Box>
    )
  }

  if (auditLog.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">
          No audit log entries yet.
        </Typography>
      </Paper>
    )
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Audit Trail ({auditLog.length} entries)
      </Typography>
      
      <Timeline position="right">
        {auditLog.map((entry, index) => (
          <TimelineItem key={entry.id}>
            <TimelineOppositeContent color="text.secondary" sx={{ flex: 0.2 }}>
              <Typography variant="caption">
                {new Date(entry.timestamp).toLocaleDateString()}
              </Typography>
              <Typography variant="caption" display="block">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </Typography>
            </TimelineOppositeContent>
            <TimelineSeparator>
              <TimelineDot color={getActionColor(entry.action) as any}>
                {getActionIcon(entry.action)}
              </TimelineDot>
              {index < auditLog.length - 1 && <TimelineConnector />}
            </TimelineSeparator>
            <TimelineContent>
              <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main' }}>
                    <PersonIcon sx={{ fontSize: 16 }} />
                  </Avatar>
                  <Typography variant="body2" fontWeight="bold">
                    {entry.user}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {formatActionDescription(entry)}
                </Typography>
                {entry.details && (
                  <Box
                    sx={{
                      mt: 1,
                      p: 1,
                      bgcolor: 'grey.100',
                      borderRadius: 1,
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                    }}
                  >
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(entry.details, null, 2)}
                    </pre>
                  </Box>
                )}
              </Paper>
            </TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>
    </Box>
  )
}

