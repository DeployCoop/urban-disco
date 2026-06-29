import { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  TextField,
  Button,
  List,
  Avatar,
  Typography,
  IconButton,
  Chip,
} from '@mui/material'
import {
  Send as SendIcon,
  Reply as ReplyIcon,
  Person as PersonIcon,
} from '@mui/icons-material'
import { casesApi } from '../../services/api'

interface Comment {
  id: string
  case_id: string
  author: string
  content: string
  timestamp: string
  parent_comment_id?: string
  replies?: Comment[]
}

interface CaseCommentsProps {
  caseId: string
  currentUser?: string
}

export default function CaseComments({ caseId, currentUser = 'SOC Analyst' }: CaseCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')

  useEffect(() => {
    loadComments()
  }, [caseId])

  const loadComments = async () => {
    setLoading(true)
    try {
      const response = await casesApi.getComments(caseId)
      setComments(response.data.comments || [])
    } catch (error) {
      console.error('Failed to load comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    try {
      await casesApi.addComment(caseId, {
        content: newComment,
        author: currentUser,
      })
      setNewComment('')
      await loadComments()
    } catch (error) {
      console.error('Failed to add comment:', error)
    }
  }

  const handleAddReply = async (parentId: string) => {
    if (!replyContent.trim()) return

    try {
      await casesApi.addComment(caseId, {
        content: replyContent,
        author: currentUser,
        parent_comment_id: parentId,
      })
      setReplyContent('')
      setReplyingTo(null)
      await loadComments()
    } catch (error) {
      console.error('Failed to add reply:', error)
    }
  }

  const renderComment = (comment: Comment, isReply = false) => (
    <Box key={comment.id} sx={{ ml: isReply ? 4 : 0, mb: 2 }}>
      <Paper sx={{ p: 2 }}>
        <Box display="flex" gap={2}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
            <PersonIcon fontSize="small" />
          </Avatar>
          <Box flex={1}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Box display="flex" gap={1} alignItems="center">
                <Typography variant="subtitle2" fontWeight="bold">
                  {comment.author}
                </Typography>
                {isReply && <Chip label="Reply" size="small" color="primary" />}
              </Box>
              <Typography variant="caption" color="text.secondary">
                {new Date(comment.timestamp).toLocaleString()}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 1 }}>
              {comment.content}
            </Typography>
            {!isReply && (
              <IconButton
                size="small"
                onClick={() => setReplyingTo(comment.id)}
                sx={{ mt: 0.5 }}
              >
                <ReplyIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        </Box>
        
        {replyingTo === comment.id && (
          <Box mt={2} ml={5}>
            <TextField
              fullWidth
              multiline
              rows={2}
              size="small"
              placeholder="Write a reply..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              sx={{ mb: 1 }}
            />
            <Box display="flex" gap={1} justifyContent="flex-end">
              <Button size="small" onClick={() => setReplyingTo(null)}>
                Cancel
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={() => handleAddReply(comment.id)}
                disabled={!replyContent.trim()}
              >
                Reply
              </Button>
            </Box>
          </Box>
        )}
      </Paper>
      
      {comment.replies && comment.replies.length > 0 && (
        <Box mt={1}>
          {comment.replies.map((reply) => renderComment(reply, true))}
        </Box>
      )}
    </Box>
  )

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Add Comment
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={3}
          placeholder="Write a comment... Use @username to mention someone"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Button
          variant="contained"
          startIcon={<SendIcon />}
          onClick={handleAddComment}
          disabled={!newComment.trim() || loading}
        >
          Post Comment
        </Button>
      </Paper>

      <Typography variant="h6" gutterBottom>
        Comments ({comments.length})
      </Typography>
      
      {loading ? (
        <Typography>Loading comments...</Typography>
      ) : comments.length === 0 ? (
        <Typography color="text.secondary">No comments yet. Be the first to comment!</Typography>
      ) : (
        <List sx={{ p: 0 }}>
          {comments.map((comment) => renderComment(comment))}
        </List>
      )}
    </Box>
  )
}

