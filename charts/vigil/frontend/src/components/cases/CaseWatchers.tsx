import { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Person as PersonIcon,
  Notifications as NotificationIcon,
} from '@mui/icons-material'
import { casesApi } from '../../services/api'

interface Watcher {
  user_id: string
  added_at: string
  notification_preferences?: any
}

interface CaseWatchersProps {
  caseId: string
  currentUser?: string
}

export default function CaseWatchers({ caseId, currentUser }: CaseWatchersProps) {
  const [watchers, setWatchers] = useState<Watcher[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newUserId, setNewUserId] = useState('')

  useEffect(() => {
    loadWatchers()
  }, [caseId])

  const loadWatchers = async () => {
    try {
      const response = await casesApi.getWatchers(caseId)
      setWatchers(response.data.watchers || [])
    } catch (error) {
      console.error('Failed to load watchers:', error)
    }
  }

  const handleAddWatcher = async () => {
    if (!newUserId.trim()) return

    try {
      await casesApi.addWatcher(caseId, newUserId.trim())
      setDialogOpen(false)
      setNewUserId('')
      await loadWatchers()
    } catch (error) {
      console.error('Failed to add watcher:', error)
    }
  }

  const handleRemoveWatcher = async (userId: string) => {
    try {
      await casesApi.removeWatcher(caseId, userId)
      await loadWatchers()
    } catch (error) {
      console.error('Failed to remove watcher:', error)
    }
  }

  const isCurrentUserWatching = currentUser && watchers.some((w) => w.user_id === currentUser)

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <VisibilityIcon color="primary" />
          <Typography variant="h6">
            Watchers ({watchers.length})
          </Typography>
        </Box>
        <Button
          size="small"
          variant={isCurrentUserWatching ? 'outlined' : 'contained'}
          startIcon={isCurrentUserWatching ? <NotificationIcon /> : <AddIcon />}
          onClick={() => {
            if (isCurrentUserWatching) {
              handleRemoveWatcher(currentUser!)
            } else {
              setDialogOpen(true)
            }
          }}
        >
          {isCurrentUserWatching ? 'Watching' : 'Watch'}
        </Button>
      </Box>

      <Paper sx={{ p: 2 }}>
        {watchers.length === 0 ? (
          <Box textAlign="center" py={3}>
            <Typography variant="body2" color="text.secondary">
              No watchers yet. Watch this case to receive notifications.
            </Typography>
          </Box>
        ) : (
          <List dense>
            {watchers.map((watcher) => (
              <ListItem
                key={watcher.user_id}
                secondaryAction={
                  <IconButton
                    edge="end"
                    size="small"
                    color="error"
                    onClick={() => handleRemoveWatcher(watcher.user_id)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                    <PersonIcon fontSize="small" />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={watcher.user_id}
                  secondary={`Watching since ${new Date(watcher.added_at).toLocaleDateString()}`}
                />
                <Chip
                  icon={<NotificationIcon />}
                  label="Active"
                  size="small"
                  color="success"
                  variant="outlined"
                  sx={{ mr: 1 }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      {/* Add Watcher Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Watcher</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="User ID or Email"
            value={newUserId}
            onChange={(e) => setNewUserId(e.target.value)}
            placeholder="analyst@example.com"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddWatcher} disabled={!newUserId.trim()}>
            Add Watcher
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

