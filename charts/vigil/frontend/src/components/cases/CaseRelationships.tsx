import { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Divider,
} from '@mui/material'
import {
  Add as AddIcon,
  Link as LinkIcon,
  Delete as DeleteIcon,
  OpenInNew as OpenIcon,
} from '@mui/icons-material'
import { casesApi } from '../../services/api'

interface LinkedCase {
  link_id: string
  related_case_id: string
  related_case_title: string
  related_case_status: string
  related_case_priority: string
  relationship_type: string
  created_at: string
}

interface CaseRelationshipsProps {
  caseId: string
  onNavigateToCase?: (caseId: string) => void
}

export default function CaseRelationships({
  caseId,
  onNavigateToCase,
}: CaseRelationshipsProps) {
  const [linkedCases, setLinkedCases] = useState<LinkedCase[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [allCases, setAllCases] = useState<any[]>([])
  const [newLink, setNewLink] = useState({
    related_case_id: '',
    relationship_type: 'related_to',
  })

  useEffect(() => {
    loadLinkedCases()
  }, [caseId])

  const loadLinkedCases = async () => {
    try {
      const response = await casesApi.getLinkedCases(caseId)
      setLinkedCases(response.data.linked_cases || [])
    } catch (error) {
      console.error('Failed to load linked cases:', error)
    }
  }

  const loadAllCases = async () => {
    try {
      const response = await casesApi.getAll()
      setAllCases(response.data.cases?.filter((c: any) => c.case_id !== caseId) || [])
    } catch (error) {
      console.error('Failed to load cases:', error)
    }
  }

  const handleOpenDialog = () => {
    loadAllCases()
    setDialogOpen(true)
  }

  const handleLinkCase = async () => {
    try {
      await casesApi.linkCase(caseId, newLink.related_case_id, newLink.relationship_type)
      setDialogOpen(false)
      setNewLink({ related_case_id: '', relationship_type: 'related_to' })
      await loadLinkedCases()
    } catch (error) {
      console.error('Failed to link case:', error)
    }
  }

  const getRelationshipColor = (type: string) => {
    const colors: Record<string, any> = {
      duplicate_of: 'error',
      related_to: 'info',
      caused_by: 'warning',
      follows: 'primary',
      blocks: 'secondary',
    }
    return colors[type] || 'default'
  }

  const getRelationshipLabel = (type: string) => {
    const labels: Record<string, string> = {
      duplicate_of: 'Duplicate Of',
      related_to: 'Related To',
      caused_by: 'Caused By',
      follows: 'Follows',
      blocks: 'Blocks',
    }
    return labels[type] || type
  }

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, any> = {
      critical: 'error',
      high: 'error',
      medium: 'warning',
      low: 'success',
    }
    return colors[priority?.toLowerCase()] || 'default'
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Related Cases ({linkedCases.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
        >
          Link Case
        </Button>
      </Box>

      {linkedCases.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <LinkIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography color="text.secondary">
            No related cases. Link cases to track relationships and dependencies.
          </Typography>
        </Paper>
      ) : (
        <Paper>
          <List>
            {linkedCases.map((linkedCase, index) => (
              <Box key={linkedCase.link_id}>
                <ListItem
                  secondaryAction={
                    <Box>
                      {onNavigateToCase && (
                        <IconButton
                          edge="end"
                          onClick={() => onNavigateToCase(linkedCase.related_case_id)}
                          sx={{ mr: 1 }}
                        >
                          <OpenIcon />
                        </IconButton>
                      )}
                      <IconButton edge="end" color="error">
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  }
                >
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip
                          label={getRelationshipLabel(linkedCase.relationship_type)}
                          color={getRelationshipColor(linkedCase.relationship_type)}
                          size="small"
                          sx={{ mr: 1 }}
                        />
                        <Typography variant="body1" fontWeight="medium">
                          {linkedCase.related_case_title}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box display="flex" gap={1} mt={1}>
                        <Chip
                          label={linkedCase.related_case_id}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={linkedCase.related_case_status}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                        <Chip
                          label={linkedCase.related_case_priority}
                          size="small"
                          color={getPriorityColor(linkedCase.related_case_priority)}
                        />
                        <Typography variant="caption" sx={{ ml: 'auto', alignSelf: 'center' }}>
                          Linked {new Date(linkedCase.created_at).toLocaleDateString()}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
                {index < linkedCases.length - 1 && <Divider component="li" />}
              </Box>
            ))}
          </List>
        </Paper>
      )}

      {/* Link Case Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Link Related Case</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Relationship Type</InputLabel>
                <Select
                  value={newLink.relationship_type}
                  label="Relationship Type"
                  onChange={(e) =>
                    setNewLink({ ...newLink, relationship_type: e.target.value })
                  }
                >
                  <MenuItem value="related_to">Related To</MenuItem>
                  <MenuItem value="duplicate_of">Duplicate Of</MenuItem>
                  <MenuItem value="caused_by">Caused By</MenuItem>
                  <MenuItem value="follows">Follows</MenuItem>
                  <MenuItem value="blocks">Blocks</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Select Case</InputLabel>
                <Select
                  value={newLink.related_case_id}
                  label="Select Case"
                  onChange={(e) =>
                    setNewLink({ ...newLink, related_case_id: e.target.value })
                  }
                >
                  {allCases.map((c) => (
                    <MenuItem key={c.case_id} value={c.case_id}>
                      {c.case_id} - {c.title} ({c.priority})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleLinkCase}
            disabled={!newLink.related_case_id}
          >
            Link Case
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

