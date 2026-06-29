import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Chip,
  Rating,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Slider,
  Divider,
  Alert,
  CircularProgress,
  Stack,
  Paper,
} from '@mui/material'
import {
  ThumbUp as AgreeIcon,
  ThumbDown as DisagreeIcon,
  ThumbsUpDown as PartialIcon,
  Send as SendIcon,
} from '@mui/icons-material'
import { aiDecisionsApi } from '../../services/api'

interface AIDecision {
  id: number
  decision_id: string
  agent_id: string
  decision_type: string
  confidence_score: number
  reasoning: string
  recommended_action: string
  finding_id?: string
  case_id?: string
  timestamp: string
  human_decision?: string
  feedback_timestamp?: string
}

interface AIDecisionFeedbackProps {
  open: boolean
  onClose: () => void
  decision: AIDecision | null
  onFeedbackSubmitted?: () => void
}

export default function AIDecisionFeedback({
  open,
  onClose,
  decision,
  onFeedbackSubmitted,
}: AIDecisionFeedbackProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [humanReviewer, setHumanReviewer] = useState('')
  const [humanDecision, setHumanDecision] = useState<string>('agree')
  const [feedbackComment, setFeedbackComment] = useState('')
  const [accuracyGrade, setAccuracyGrade] = useState<number>(3)
  const [reasoningGrade, setReasoningGrade] = useState<number>(3)
  const [actionAppropriatenessGrade, setActionAppropriatenessGrade] = useState<number>(3)
  const [actualOutcome, setActualOutcome] = useState<string>('unknown')
  const [timeSavedMinutes, setTimeSavedMinutes] = useState<number>(0)

  const handleSubmit = async () => {
    if (!decision || !humanReviewer.trim()) {
      setError('Please provide your name/ID')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await aiDecisionsApi.submitFeedback(decision.decision_id, {
        human_reviewer: humanReviewer,
        human_decision: humanDecision,
        feedback_comment: feedbackComment || undefined,
        accuracy_grade: accuracyGrade / 5, // Convert 1-5 to 0-1 scale
        reasoning_grade: reasoningGrade / 5,
        action_appropriateness: actionAppropriatenessGrade / 5,
        actual_outcome: actualOutcome !== 'unknown' ? actualOutcome : undefined,
        time_saved_minutes: timeSavedMinutes > 0 ? timeSavedMinutes : undefined,
      })

      // Reset form
      setHumanReviewer('')
      setHumanDecision('agree')
      setFeedbackComment('')
      setAccuracyGrade(3)
      setReasoningGrade(3)
      setActionAppropriatenessGrade(3)
      setActualOutcome('unknown')
      setTimeSavedMinutes(0)

      if (onFeedbackSubmitted) {
        onFeedbackSubmitted()
      }
      
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit feedback')
    } finally {
      setSubmitting(false)
    }
  }

  const getAgentDisplayName = (agentId: string) => {
    const agentNames: { [key: string]: string } = {
      triage: '🎯 Triage Agent',
      investigation: '🔍 Investigation Agent',
      threat_hunter: '🎣 Threat Hunter',
      correlation: '🔗 Correlation Agent',
      auto_responder: '🤖 Auto-Response Agent',
      reporting: '📊 Reporting Agent',
      mitre_analyst: '🎭 MITRE Analyst',
      forensics: '🔬 Forensics Agent',
      threat_intel: '🌐 Threat Intel Agent',
      compliance: '📋 Compliance Agent',
      malware_analyst: '🦠 Malware Analyst',
      network_analyst: '🌐 Network Analyst',
    }
    return agentNames[agentId] || agentId
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.85) return 'success'
    if (confidence >= 0.7) return 'warning'
    return 'error'
  }

  if (!decision) {
    return null
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">AI Decision Feedback</Typography>
          <Chip 
            label={getAgentDisplayName(decision.agent_id)}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* AI Decision Summary */}
        <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50', mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            AI's Decision
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              <Chip 
                label={decision.decision_type.toUpperCase()} 
                size="small" 
                color="primary"
              />
              <Chip 
                label={`${(decision.confidence_score * 100).toFixed(0)}% Confidence`}
                size="small"
                color={getConfidenceColor(decision.confidence_score)}
              />
            </Stack>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              Recommended Action:
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {decision.recommended_action}
            </Typography>
          </Box>

          <Box>
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              Reasoning:
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {decision.reasoning}
            </Typography>
          </Box>
        </Paper>

        <Divider sx={{ my: 3 }} />

        {/* Feedback Form */}
        <Typography variant="h6" gutterBottom>
          Your Feedback
        </Typography>

        <Stack spacing={3}>
          {/* Reviewer Name */}
          <TextField
            label="Your Name / Analyst ID"
            fullWidth
            required
            value={humanReviewer}
            onChange={(e) => setHumanReviewer(e.target.value)}
            placeholder="e.g., analyst_jones"
          />

          {/* Overall Assessment */}
          <FormControl component="fieldset">
            <FormLabel component="legend">
              Do you agree with this assessment?
            </FormLabel>
            <RadioGroup
              row
              value={humanDecision}
              onChange={(e) => setHumanDecision(e.target.value)}
            >
              <FormControlLabel 
                value="agree" 
                control={<Radio />} 
                label={
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <AgreeIcon fontSize="small" color="success" />
                    <span>Agree</span>
                  </Box>
                }
              />
              <FormControlLabel 
                value="partial" 
                control={<Radio />} 
                label={
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <PartialIcon fontSize="small" color="warning" />
                    <span>Partially Agree</span>
                  </Box>
                }
              />
              <FormControlLabel 
                value="disagree" 
                control={<Radio />} 
                label={
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <DisagreeIcon fontSize="small" color="error" />
                    <span>Disagree</span>
                  </Box>
                }
              />
            </RadioGroup>
          </FormControl>

          {/* Detailed Grading */}
          <Box>
            <Typography variant="body2" gutterBottom>
              Grade the AI's accuracy (1-5 stars)
            </Typography>
            <Rating
              value={accuracyGrade}
              onChange={(_, value) => setAccuracyGrade(value || 3)}
              size="large"
            />
          </Box>

          <Box>
            <Typography variant="body2" gutterBottom>
              Grade the AI's reasoning quality (1-5 stars)
            </Typography>
            <Rating
              value={reasoningGrade}
              onChange={(_, value) => setReasoningGrade(value || 3)}
              size="large"
            />
          </Box>

          <Box>
            <Typography variant="body2" gutterBottom>
              Grade the appropriateness of the action (1-5 stars)
            </Typography>
            <Rating
              value={actionAppropriatenessGrade}
              onChange={(_, value) => setActionAppropriatenessGrade(value || 3)}
              size="large"
            />
          </Box>

          {/* Actual Outcome */}
          <FormControl fullWidth>
            <FormLabel>What was the actual outcome?</FormLabel>
            <RadioGroup
              value={actualOutcome}
              onChange={(e) => setActualOutcome(e.target.value)}
            >
              <FormControlLabel 
                value="true_positive" 
                control={<Radio />} 
                label="True Positive - Real threat, correctly identified"
              />
              <FormControlLabel 
                value="false_positive" 
                control={<Radio />} 
                label="False Positive - Not a threat, incorrectly flagged"
              />
              <FormControlLabel 
                value="true_negative" 
                control={<Radio />} 
                label="True Negative - Correctly dismissed"
              />
              <FormControlLabel 
                value="false_negative" 
                control={<Radio />} 
                label="False Negative - Missed a real threat"
              />
              <FormControlLabel 
                value="unknown" 
                control={<Radio />} 
                label="Unknown - Unable to determine yet"
              />
            </RadioGroup>
          </FormControl>

          {/* Time Saved */}
          <Box>
            <Typography variant="body2" gutterBottom>
              How much time did the AI save? (minutes)
            </Typography>
            <Slider
              value={timeSavedMinutes}
              onChange={(_, value) => setTimeSavedMinutes(value as number)}
              min={0}
              max={120}
              step={5}
              marks={[
                { value: 0, label: '0' },
                { value: 30, label: '30' },
                { value: 60, label: '60' },
                { value: 90, label: '90' },
                { value: 120, label: '120' },
              ]}
              valueLabelDisplay="auto"
            />
            <Typography variant="caption" color="text.secondary">
              {timeSavedMinutes} minutes ({(timeSavedMinutes / 60).toFixed(1)} hours)
            </Typography>
          </Box>

          {/* Additional Comments */}
          <TextField
            label="Additional Comments (optional)"
            multiline
            rows={4}
            fullWidth
            value={feedbackComment}
            onChange={(e) => setFeedbackComment(e.target.value)}
            placeholder="Any additional feedback to help the AI learn..."
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          startIcon={submitting ? <CircularProgress size={20} /> : <SendIcon />}
          disabled={submitting || !humanReviewer.trim()}
        >
          Submit Feedback
        </Button>
      </DialogActions>
    </Dialog>
  )
}

