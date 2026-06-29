/**
 * JIRA Export Dialog - Export cases and remediation to JIRA.
 * 
 * Allows users to export case reports and remediation steps to JIRA.
 */

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Alert,
  CircularProgress,
  Box,
  Typography,
  Link,
  Tabs,
  Tab,
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import api from '../../services/api';

interface JiraExportDialogProps {
  open: boolean;
  onClose: () => void;
  caseId: string;
  caseTitle: string;
}

export default function JiraExportDialog({
  open,
  onClose,
  caseId,
  caseTitle,
}: JiraExportDialogProps) {
  const [tabValue, setTabValue] = useState(0);
  const [projectKey, setProjectKey] = useState('');
  const [includeFindings, setIncludeFindings] = useState(true);
  const [includeTimeline, setIncludeTimeline] = useState(true);
  const [parentIssueKey, setParentIssueKey] = useState('');
  const [assignTo, setAssignTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleExportCase = async () => {
    if (!projectKey) {
      setError('Project key is required');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await api.post(`/cases/${caseId}/export/jira`, {
        project_key: projectKey,
        include_findings: includeFindings,
        include_timeline: includeTimeline,
      });

      if (response.data.success) {
        setResult(response.data);
      } else {
        setError(response.data.error || 'Export failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to export case to JIRA');
    } finally {
      setLoading(false);
    }
  };

  const handleExportRemediation = async () => {
    if (!parentIssueKey) {
      setError('Parent issue key is required');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await api.post(`/cases/${caseId}/remediation/jira`, {
        parent_issue_key: parentIssueKey,
        assign_to: assignTo || undefined,
      });

      if (response.data.success) {
        setResult(response.data);
      } else {
        setError(response.data.error || 'Export failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to export remediation to JIRA');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setProjectKey('');
    setParentIssueKey('');
    setAssignTo('');
    setResult(null);
    setError('');
    setTabValue(0);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Export to JIRA</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Case: <strong>{caseTitle}</strong>
          </Typography>
        </Box>

        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
          <Tab label="Export Case" />
          <Tab label="Export Remediation" />
        </Tabs>

        {/* Export Case Tab */}
        {tabValue === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="JIRA Project Key"
              value={projectKey}
              onChange={(e) => setProjectKey(e.target.value.toUpperCase())}
              placeholder="e.g., SEC"
              required
              fullWidth
              helperText="The JIRA project where the issue will be created"
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={includeFindings}
                  onChange={(e) => setIncludeFindings(e.target.checked)}
                />
              }
              label="Include findings as subtasks (max 5)"
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={includeTimeline}
                  onChange={(e) => setIncludeTimeline(e.target.checked)}
                />
              }
              label="Include timeline in description"
            />

            {error && (
              <Alert severity="error" icon={<ErrorIcon />}>
                {error}
              </Alert>
            )}

            {result && (
              <Alert severity="success" icon={<SuccessIcon />}>
                <Typography variant="body2">
                  Successfully exported to JIRA!
                </Typography>
                <Typography variant="body2">
                  Issue: <strong>{result.issue_key}</strong>
                </Typography>
                {result.subtasks_created > 0 && (
                  <Typography variant="body2">
                    Created {result.subtasks_created} subtasks
                  </Typography>
                )}
                {result.url && (
                  <Link href={result.url} target="_blank" rel="noopener">
                    View in JIRA →
                  </Link>
                )}
              </Alert>
            )}
          </Box>
        )}

        {/* Export Remediation Tab */}
        {tabValue === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Parent JIRA Issue Key"
              value={parentIssueKey}
              onChange={(e) => setParentIssueKey(e.target.value.toUpperCase())}
              placeholder="e.g., SEC-123"
              required
              fullWidth
              helperText="The parent issue to attach remediation subtasks to"
            />

            <TextField
              label="Assign To (optional)"
              value={assignTo}
              onChange={(e) => setAssignTo(e.target.value)}
              placeholder="username or email"
              fullWidth
              helperText="JIRA username or email to assign subtasks to"
            />

            {error && (
              <Alert severity="error" icon={<ErrorIcon />}>
                {error}
              </Alert>
            )}

            {result && (
              <Alert severity="success" icon={<SuccessIcon />}>
                <Typography variant="body2">
                  Successfully exported remediation steps!
                </Typography>
                <Typography variant="body2">
                  Created {result.subtasks_created} subtasks
                </Typography>
                {result.url && (
                  <Link href={result.url} target="_blank" rel="noopener">
                    View in JIRA →
                  </Link>
                )}
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {result ? 'Close' : 'Cancel'}
        </Button>
        {!result && (
          <Button
            onClick={tabValue === 0 ? handleExportCase : handleExportRemediation}
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Exporting...' : 'Export to JIRA'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

