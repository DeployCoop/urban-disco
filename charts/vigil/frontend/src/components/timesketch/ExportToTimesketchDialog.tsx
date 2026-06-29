import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Box,
  Typography,
} from '@mui/material'
import { timesketchApi } from '../../services/api'
import { notificationService } from '../../services/notifications'

interface ExportToTimesketchDialogProps {
  open: boolean
  onClose: () => void
  findingIds?: string[]
  caseId?: string
  defaultTimelineName?: string
}

interface Sketch {
  id: number
  name: string
  description: string
}

export default function ExportToTimesketchDialog({
  open,
  onClose,
  findingIds,
  caseId,
  defaultTimelineName,
}: ExportToTimesketchDialogProps) {
  const [loading, setLoading] = useState(false)
  const [sketches, setSketches] = useState<Sketch[]>([])
  const [sketchesLoading, setSketchesLoading] = useState(false)
  const [exportMode, setExportMode] = useState<'existing' | 'new'>('existing')
  const [selectedSketchId, setSelectedSketchId] = useState<string>('')
  const [newSketchName, setNewSketchName] = useState('')
  const [newSketchDescription, setNewSketchDescription] = useState('')
  const [timelineName, setTimelineName] = useState(defaultTimelineName || '')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [timesketchConfigured, setTimesketchConfigured] = useState(false)

  useEffect(() => {
    if (open) {
      checkTimesketchStatus()
      setTimelineName(defaultTimelineName || '')
    }
  }, [open, defaultTimelineName])

  const checkTimesketchStatus = async () => {
    try {
      const statusRes = await timesketchApi.getStatus()
      setTimesketchConfigured(statusRes.data.configured && statusRes.data.connected)
      
      if (statusRes.data.configured && statusRes.data.connected) {
        loadSketches()
      }
    } catch (error) {
      console.error('Failed to check Timesketch status:', error)
      setTimesketchConfigured(false)
    }
  }

  const loadSketches = async () => {
    setSketchesLoading(true)
    try {
      const res = await timesketchApi.listSketches()
      setSketches(res.data.sketches || [])
      if (res.data.sketches && res.data.sketches.length > 0) {
        setSelectedSketchId(String(res.data.sketches[0].id))
      }
    } catch (error) {
      console.error('Failed to load sketches:', error)
      setMessage({ type: 'error', text: 'Failed to load sketches' })
    } finally {
      setSketchesLoading(false)
    }
  }

  const handleExport = async () => {
    if (!timelineName.trim()) {
      setMessage({ type: 'error', text: 'Timeline name is required' })
      return
    }

    if (exportMode === 'existing' && !selectedSketchId) {
      setMessage({ type: 'error', text: 'Please select a sketch' })
      return
    }

    if (exportMode === 'new' && !newSketchName.trim()) {
      setMessage({ type: 'error', text: 'Sketch name is required' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const exportData: any = {
        timeline_name: timelineName,
      }

      if (exportMode === 'existing') {
        exportData.sketch_id = selectedSketchId
      } else {
        exportData.sketch_name = newSketchName
        exportData.sketch_description = newSketchDescription
      }

      if (caseId) {
        exportData.case_id = caseId
      } else if (findingIds) {
        exportData.finding_ids = findingIds
      }

      const res = await timesketchApi.exportToTimesketch(exportData)
      
      setMessage({
        type: 'success',
        text: `Successfully exported ${res.data.event_count} events to Timesketch`,
      })
      
      // Send desktop notification for successful export
      notificationService.notifyGeneric(
        'Timesketch Export Complete',
        `Successfully exported ${res.data.event_count} events to timeline "${timelineName}"`,
        { severity: 'success', requireInteraction: false }
      )

      // Close dialog after a short delay
      setTimeout(() => {
        onClose()
        setMessage(null)
      }, 2000)
    } catch (error: any) {
      console.error('Failed to export to Timesketch:', error)
      const errorMessage = error.response?.data?.detail || 'Failed to export to Timesketch'
      setMessage({ type: 'error', text: errorMessage })
      
      // Send error notification
      notificationService.notifyGeneric(
        'Timesketch Export Failed',
        errorMessage,
        { severity: 'error', requireInteraction: false }
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Export to Timesketch</DialogTitle>
      <DialogContent>
        {!timesketchConfigured ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Timesketch is not configured or not connected. Please configure Timesketch in Settings first.
          </Alert>
        ) : (
          <>
            {message && (
              <Alert severity={message.type} onClose={() => setMessage(null)} sx={{ mb: 2 }}>
                {message.text}
              </Alert>
            )}

            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              {caseId
                ? 'Export this case and its findings as a timeline to Timesketch'
                : `Export ${findingIds?.length || 0} finding(s) as a timeline to Timesketch`}
            </Typography>

            <TextField
              fullWidth
              label="Timeline Name"
              value={timelineName}
              onChange={(e) => setTimelineName(e.target.value)}
              margin="normal"
              required
            />

            <FormControl component="fieldset" sx={{ mt: 2, mb: 2 }}>
              <FormLabel component="legend">Sketch Selection</FormLabel>
              <RadioGroup
                value={exportMode}
                onChange={(e) => setExportMode(e.target.value as 'existing' | 'new')}
              >
                <FormControlLabel
                  value="existing"
                  control={<Radio />}
                  label="Add to existing sketch"
                />
                <FormControlLabel value="new" control={<Radio />} label="Create new sketch" />
              </RadioGroup>
            </FormControl>

            {exportMode === 'existing' ? (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <Typography variant="caption" color="textSecondary" sx={{ mb: 1 }}>
                  Select Sketch
                </Typography>
                {sketchesLoading ? (
                  <Box display="flex" justifyContent="center" p={2}>
                    <CircularProgress size={24} />
                  </Box>
                ) : sketches.length === 0 ? (
                  <Alert severity="info">
                    No sketches found. Create a new sketch or create one in Timesketch first.
                  </Alert>
                ) : (
                  <Select
                    value={selectedSketchId}
                    onChange={(e) => setSelectedSketchId(e.target.value)}
                  >
                    {sketches.map((sketch) => (
                      <MenuItem key={sketch.id} value={String(sketch.id)}>
                        {sketch.name}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              </FormControl>
            ) : (
              <>
                <TextField
                  fullWidth
                  label="New Sketch Name"
                  value={newSketchName}
                  onChange={(e) => setNewSketchName(e.target.value)}
                  margin="normal"
                  required
                />
                <TextField
                  fullWidth
                  label="Sketch Description"
                  value={newSketchDescription}
                  onChange={(e) => setNewSketchDescription(e.target.value)}
                  margin="normal"
                  multiline
                  rows={2}
                />
              </>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleExport}
          variant="contained"
          color="error"
          disabled={loading || !timesketchConfigured}
        >
          {loading ? <CircularProgress size={24} /> : 'Export'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

