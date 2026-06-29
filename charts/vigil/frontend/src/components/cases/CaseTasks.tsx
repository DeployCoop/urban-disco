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
  List,
  ListItem,
  ListItemText,
  Checkbox,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  LinearProgress,
} from '@mui/material'
import {
  Add as AddIcon,
  CheckCircle as CompleteIcon,
  RadioButtonUnchecked as PendingIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material'
import { casesApi } from '../../services/api'

interface Task {
  id: string
  case_id: string
  title: string
  description?: string
  assignee?: string
  status: string
  priority: string
  due_date?: string
  created_at: string
  completed_at?: string
}

interface CaseTasksProps {
  caseId: string
}

export default function CaseTasks({ caseId }: CaseTasksProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignee: '',
    due_date: '',
    priority: 'medium',
  })

  useEffect(() => {
    loadTasks()
  }, [caseId])

  const loadTasks = async () => {
    try {
      const response = await casesApi.getTasks(caseId)
      setTasks(response.data.tasks || [])
    } catch (error) {
      console.error('Failed to load tasks:', error)
    }
  }

  const handleAddTask = async () => {
    try {
      await casesApi.addTask(caseId, newTask)
      setDialogOpen(false)
      setNewTask({
        title: '',
        description: '',
        assignee: '',
        due_date: '',
        priority: 'medium',
      })
      await loadTasks()
    } catch (error) {
      console.error('Failed to add task:', error)
    }
  }

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed'
    const updateData: any = { status: newStatus }
    
    if (newStatus === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }

    try {
      await casesApi.updateTask(caseId, taskId, updateData)
      await loadTasks()
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  }

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, any> = {
      critical: 'error',
      high: 'error',
      medium: 'warning',
      low: 'success',
    }
    return colors[priority] || 'default'
  }

  const completedTasks = tasks.filter((t) => t.status === 'completed').length
  const totalTasks = tasks.length
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h6">
            Tasks ({completedTasks}/{totalTasks} completed)
          </Typography>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ width: 200, mt: 1 }}
          />
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Add Task
        </Button>
      </Box>

      <Paper>
        <List>
          {tasks
            .sort((a, b) => {
              // Sort: incomplete first, then by priority, then by due date
              if (a.status !== b.status) {
                return a.status === 'completed' ? 1 : -1
              }
              const priorityOrder: Record<string, number> = {
                critical: 0,
                high: 1,
                medium: 2,
                low: 3,
              }
              return (
                priorityOrder[a.priority] - priorityOrder[b.priority] ||
                (a.due_date || '').localeCompare(b.due_date || '')
              )
            })
            .map((task, index) => (
              <Box key={task.id}>
                <ListItem
                  sx={{
                    opacity: task.status === 'completed' ? 0.6 : 1,
                    textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                  }}
                  secondaryAction={
                    <IconButton edge="end" aria-label="delete" color="error">
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <Checkbox
                    edge="start"
                    checked={task.status === 'completed'}
                    onChange={() => handleToggleTask(task.id, task.status)}
                    icon={<PendingIcon />}
                    checkedIcon={<CompleteIcon />}
                    sx={{ mr: 2 }}
                  />
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body1" fontWeight="medium">
                          {task.title}
                        </Typography>
                        <Chip
                          label={task.priority}
                          size="small"
                          color={getPriorityColor(task.priority)}
                        />
                      </Box>
                    }
                    secondary={
                      <Box mt={0.5}>
                        {task.description && (
                          <Typography variant="body2" color="text.secondary">
                            {task.description}
                          </Typography>
                        )}
                        <Box display="flex" gap={2} mt={0.5}>
                          {task.assignee && (
                            <Typography variant="caption">
                              Assigned to: {task.assignee}
                            </Typography>
                          )}
                          {task.due_date && (
                            <Typography
                              variant="caption"
                              color={
                                new Date(task.due_date) < new Date() &&
                                task.status !== 'completed'
                                  ? 'error'
                                  : 'text.secondary'
                              }
                            >
                              Due: {new Date(task.due_date).toLocaleDateString()}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
                {index < tasks.length - 1 && <Box sx={{ borderBottom: 1, borderColor: 'divider' }} />}
              </Box>
            ))}
        </List>
      </Paper>

      {tasks.length === 0 && (
        <Box textAlign="center" py={4}>
          <Typography color="text.secondary">
            No tasks yet. Add tasks to organize your investigation workflow.
          </Typography>
        </Box>
      )}

      {/* Add Task Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Task</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Task Title"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={newTask.priority}
                  label="Priority"
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Assignee"
                value={newTask.assignee}
                onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })}
                placeholder="SOC Analyst"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Due Date"
                type="datetime-local"
                value={newTask.due_date}
                onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddTask}
            disabled={!newTask.title.trim()}
          >
            Add Task
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

