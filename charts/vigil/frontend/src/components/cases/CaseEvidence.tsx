import { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from '@mui/material'
import {
  Add as AddIcon,
  AttachFile as FileIcon,
  Link as LinkIcon,
  Screenshot as ScreenshotIcon,
  Description as LogIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material'
import { casesApi } from '../../services/api'

interface Evidence {
  id: string
  case_id: string
  name: string
  description?: string
  file_path?: string
  url?: string
  evidence_type: string
  collected_at: string
  collected_by?: string
  hash?: string
}

interface CaseEvidenceProps {
  caseId: string
}

export default function CaseEvidence({ caseId }: CaseEvidenceProps) {
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newEvidence, setNewEvidence] = useState({
    name: '',
    description: '',
    file_path: '',
    url: '',
    evidence_type: 'file',
  })

  useEffect(() => {
    loadEvidence()
  }, [caseId])

  const loadEvidence = async () => {
    try {
      const response = await casesApi.getEvidence(caseId)
      setEvidence(response.data.evidence || [])
    } catch (error) {
      console.error('Failed to load evidence:', error)
    }
  }

  const handleAddEvidence = async () => {
    try {
      await casesApi.addEvidence(caseId, newEvidence)
      setDialogOpen(false)
      setNewEvidence({
        name: '',
        description: '',
        file_path: '',
        url: '',
        evidence_type: 'file',
      })
      await loadEvidence()
    } catch (error) {
      console.error('Failed to add evidence:', error)
    }
  }

  const getEvidenceIcon = (type: string) => {
    switch (type) {
      case 'file':
        return <FileIcon />
      case 'url':
        return <LinkIcon />
      case 'screenshot':
        return <ScreenshotIcon />
      case 'log':
        return <LogIcon />
      default:
        return <FileIcon />
    }
  }

  const getEvidenceColor = (type: string) => {
    const colors: Record<string, any> = {
      file: 'primary',
      url: 'info',
      screenshot: 'warning',
      log: 'success',
    }
    return colors[type] || 'default'
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Evidence Collection ({evidence.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Add Evidence
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Collected At</TableCell>
              <TableCell>Collected By</TableCell>
              <TableCell>Hash</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {evidence.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Chip
                    icon={getEvidenceIcon(item.evidence_type)}
                    label={item.evidence_type}
                    color={getEvidenceColor(item.evidence_type)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {item.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {item.description || 'N/A'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption">
                    {new Date(item.collected_at).toLocaleString()}
                  </Typography>
                </TableCell>
                <TableCell>{item.collected_by || 'Unknown'}</TableCell>
                <TableCell>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                    {item.hash ? item.hash.substring(0, 12) + '...' : 'N/A'}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" color="primary">
                    <ViewIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {evidence.length === 0 && (
        <Box textAlign="center" py={4}>
          <Typography color="text.secondary">
            No evidence collected yet. Add evidence to strengthen your investigation.
          </Typography>
        </Box>
      )}

      {/* Add Evidence Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Evidence</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                value={newEvidence.name}
                onChange={(e) => setNewEvidence({ ...newEvidence, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Evidence Type</InputLabel>
                <Select
                  value={newEvidence.evidence_type}
                  label="Evidence Type"
                  onChange={(e) =>
                    setNewEvidence({ ...newEvidence, evidence_type: e.target.value })
                  }
                >
                  <MenuItem value="file">File</MenuItem>
                  <MenuItem value="screenshot">Screenshot</MenuItem>
                  <MenuItem value="log">Log</MenuItem>
                  <MenuItem value="url">URL</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={newEvidence.description}
                onChange={(e) =>
                  setNewEvidence({ ...newEvidence, description: e.target.value })
                }
              />
            </Grid>
            {newEvidence.evidence_type !== 'url' ? (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="File Path"
                  value={newEvidence.file_path}
                  onChange={(e) =>
                    setNewEvidence({ ...newEvidence, file_path: e.target.value })
                  }
                  placeholder="/path/to/evidence/file"
                />
              </Grid>
            ) : (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="URL"
                  value={newEvidence.url}
                  onChange={(e) => setNewEvidence({ ...newEvidence, url: e.target.value })}
                  placeholder="https://example.com/evidence"
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddEvidence}
            disabled={!newEvidence.name.trim()}
          >
            Add Evidence
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

