import { useEffect, useState, useMemo } from 'react'
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Typography,
  IconButton,
  TablePagination,
  TableSortLabel,
  Tooltip,
} from '@mui/material'
import { Visibility as ViewIcon } from '@mui/icons-material'
import { casesApi } from '../../services/api'
import CaseDetailDialog from './CaseDetailDialog'
import { StatusBadge, SeverityChip } from '../ui'

interface CasesTableProps {
  filters?: any
  searchQuery?: string
  limit?: number
  refreshKey?: number
}

export default function CasesTable({ filters = {}, searchQuery = '', limit, refreshKey = 0 }: CasesTableProps) {
  const [cases, setCases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [orderBy, setOrderBy] = useState<string>('created_at')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  const stableFilters = useMemo(() => filters, [JSON.stringify(filters)])

  useEffect(() => {
    loadCases()
  }, [stableFilters, searchQuery, limit, refreshKey])

  const loadCases = async () => {
    try {
      setLoading(true)
      const params: any = { ...stableFilters }
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key]
      })
      
      const response = await casesApi.getAll(params)
      let casesList = response.data.cases || []
      
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        casesList = casesList.filter((c: any) =>
          c.case_id?.toLowerCase().includes(query) ||
          c.title?.toLowerCase().includes(query) ||
          c.description?.toLowerCase().includes(query)
        )
      }
      
      if (limit) casesList = casesList.slice(0, limit)
      setCases(casesList)
    } catch (error) {
      console.error('Failed to load cases:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewCase = (caseId: string) => {
    setSelectedCaseId(caseId)
    setDialogOpen(true)
  }

  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc'
    setOrder(isAsc ? 'desc' : 'asc')
    setOrderBy(property)
  }

  const sortCases = (items: any[]) => {
    return [...items].sort((a, b) => {
      let aVal = a[orderBy]
      let bVal = b[orderBy]

      if (orderBy === 'priority') {
        const priorityOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 }
        aVal = priorityOrder[a.priority?.toLowerCase()] || 0
        bVal = priorityOrder[b.priority?.toLowerCase()] || 0
      } else if (orderBy === 'created_at') {
        aVal = new Date(a.created_at || 0).getTime()
        bVal = new Date(b.created_at || 0).getTime()
      }

      return order === 'asc'
        ? (aVal < bVal ? -1 : aVal > bVal ? 1 : 0)
        : (aVal > bVal ? -1 : aVal < bVal ? 1 : 0)
    })
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress size={32} />
      </Box>
    )
  }

  if (cases.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">No cases found</Typography>
      </Box>
    )
  }

  const sortedCases = sortCases(cases)
  const paginatedCases = sortedCases.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  return (
    <>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'case_id'}
                  direction={orderBy === 'case_id' ? order : 'asc'}
                  onClick={() => handleRequestSort('case_id')}
                >
                  Case
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'title'}
                  direction={orderBy === 'title' ? order : 'asc'}
                  onClick={() => handleRequestSort('title')}
                >
                  Title
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'status'}
                  direction={orderBy === 'status' ? order : 'asc'}
                  onClick={() => handleRequestSort('status')}
                >
                  Status
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'priority'}
                  direction={orderBy === 'priority' ? order : 'asc'}
                  onClick={() => handleRequestSort('priority')}
                >
                  Priority
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'created_at'}
                  direction={orderBy === 'created_at' ? order : 'asc'}
                  onClick={() => handleRequestSort('created_at')}
                >
                  Created
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={{ width: 60 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedCases.map((caseItem) => (
              <TableRow
                key={caseItem.case_id}
                onClick={() => handleViewCase(caseItem.case_id)}
                onMouseEnter={() => setHoveredRow(caseItem.case_id)}
                onMouseLeave={() => setHoveredRow(null)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {caseItem.case_id?.substring(0, 8)}...
                </TableCell>
                <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {caseItem.title || 'Untitled'}
                </TableCell>
                <TableCell>
                  <StatusBadge status={caseItem.status || 'unknown'} />
                </TableCell>
                <TableCell>
                  <SeverityChip severity={caseItem.priority || 'medium'} />
                </TableCell>
                <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                  {caseItem.created_at ? new Date(caseItem.created_at).toLocaleDateString() : '-'}
                </TableCell>
                <TableCell align="right">
                  <Box
                    sx={{
                      opacity: hoveredRow === caseItem.case_id ? 1 : 0,
                      transition: 'opacity 0.15s',
                    }}
                  >
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewCase(caseItem.case_id)
                        }}
                      >
                        <ViewIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
          component="div"
          count={cases.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10))
            setPage(0)
          }}
          sx={{
            '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
              fontSize: '0.75rem',
            },
          }}
        />
      </TableContainer>

      <CaseDetailDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setSelectedCaseId(null) }}
        caseId={selectedCaseId}
        onUpdate={loadCases}
      />
    </>
  )
}
