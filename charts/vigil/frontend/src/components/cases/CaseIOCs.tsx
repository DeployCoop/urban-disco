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
  Tooltip,
} from '@mui/material'
import {
  Add as AddIcon,
  Security as IpIcon,
  Language as DomainIcon,
  Fingerprint as HashIcon,
  Link as UrlIcon,
  ContentCopy as CopyIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material'
import { casesApi } from '../../services/api'

interface IOC {
  id: string
  case_id: string
  ioc_type: string
  value: string
  description?: string
  source?: string
  tags: string[]
  first_seen: string
  last_seen?: string
  is_whitelisted: boolean
  enrichment_data?: any
}

interface CaseIOCsProps {
  caseId: string
}

export default function CaseIOCs({ caseId }: CaseIOCsProps) {
  const [iocs, setIOCs] = useState<IOC[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newIOC, setNewIOC] = useState({
    ioc_type: 'ip',
    value: '',
    description: '',
    source: '',
    tags: [] as string[],
  })

  useEffect(() => {
    loadIOCs()
  }, [caseId])

  const loadIOCs = async () => {
    try {
      const response = await casesApi.getIOCs(caseId)
      setIOCs(response.data.iocs || [])
    } catch (error) {
      console.error('Failed to load IOCs:', error)
    }
  }

  const handleAddIOC = async () => {
    try {
      await casesApi.addIOC(caseId, newIOC)
      setDialogOpen(false)
      setNewIOC({
        ioc_type: 'ip',
        value: '',
        description: '',
        source: '',
        tags: [],
      })
      await loadIOCs()
    } catch (error) {
      console.error('Failed to add IOC:', error)
    }
  }

  const handleCopyIOC = (value: string) => {
    navigator.clipboard.writeText(value)
  }

  const getIOCIcon = (type: string) => {
    switch (type) {
      case 'ip':
        return <IpIcon />
      case 'domain':
        return <DomainIcon />
      case 'hash':
        return <HashIcon />
      case 'url':
        return <UrlIcon />
      default:
        return <IpIcon />
    }
  }

  const getIOCColor = (type: string) => {
    const colors: Record<string, any> = {
      ip: 'error',
      domain: 'warning',
      hash: 'info',
      url: 'secondary',
      email: 'primary',
    }
    return colors[type] || 'default'
  }

  const getThreatLevel = (ioc: IOC) => {
    if (ioc.is_whitelisted) return { label: 'Whitelisted', color: 'success' }
    if (ioc.enrichment_data?.threat_score > 7) return { label: 'High Risk', color: 'error' }
    if (ioc.enrichment_data?.threat_score > 4) return { label: 'Medium Risk', color: 'warning' }
    return { label: 'Low Risk', color: 'info' }
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Indicators of Compromise ({iocs.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Add IOC
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Value</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Source</TableCell>
              <TableCell>Threat Level</TableCell>
              <TableCell>First Seen</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {iocs.map((ioc) => {
              const threatLevel = getThreatLevel(ioc)
              return (
                <TableRow key={ioc.id}>
                  <TableCell>
                    <Chip
                      icon={getIOCIcon(ioc.ioc_type)}
                      label={ioc.ioc_type.toUpperCase()}
                      color={getIOCColor(ioc.ioc_type)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                      >
                        {ioc.value.length > 40 ? ioc.value.substring(0, 40) + '...' : ioc.value}
                      </Typography>
                      <Tooltip title="Copy">
                        <IconButton
                          size="small"
                          onClick={() => handleCopyIOC(ioc.value)}
                        >
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {ioc.description || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={ioc.source || 'Manual'} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={threatLevel.label}
                      color={threatLevel.color as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {new Date(ioc.first_seen).toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Search IOC">
                      <IconButton size="small" color="primary">
                        <SearchIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <IconButton size="small" color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {iocs.length === 0 && (
        <Box textAlign="center" py={4}>
          <Typography color="text.secondary">
            No IOCs identified yet. Add indicators to track malicious entities.
          </Typography>
        </Box>
      )}

      {/* Add IOC Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Indicator of Compromise</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>IOC Type</InputLabel>
                <Select
                  value={newIOC.ioc_type}
                  label="IOC Type"
                  onChange={(e) => setNewIOC({ ...newIOC, ioc_type: e.target.value })}
                >
                  <MenuItem value="ip">IP Address</MenuItem>
                  <MenuItem value="domain">Domain</MenuItem>
                  <MenuItem value="hash">File Hash</MenuItem>
                  <MenuItem value="url">URL</MenuItem>
                  <MenuItem value="email">Email</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Value"
                value={newIOC.value}
                onChange={(e) => setNewIOC({ ...newIOC, value: e.target.value })}
                placeholder="e.g., 192.168.1.1, malicious.com, abc123..."
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={2}
                value={newIOC.description}
                onChange={(e) => setNewIOC({ ...newIOC, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Source"
                value={newIOC.source}
                onChange={(e) => setNewIOC({ ...newIOC, source: e.target.value })}
                placeholder="e.g., VirusTotal, Internal Analysis"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddIOC}
            disabled={!newIOC.value.trim()}
          >
            Add IOC
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

