/**
 * User Management Tab - Component for managing users within settings.
 * 
 * Allows admins to create, edit, delete users and assign roles.
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Paper,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  PersonAdd,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface User {
  user_id: string;
  username: string;
  email: string;
  full_name: string;
  role_id: string;
  is_active: boolean;
  is_verified: boolean;
  mfa_enabled: boolean;
  last_login: string | null;
  login_count: number;
}

interface Role {
  role_id: string;
  name: string;
  description: string;
  permissions: Record<string, boolean>;
  is_system_role: boolean;
}

export default function UserManagementTab() {
  const theme = useTheme();
  const { hasPermission } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Dialog state
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [dialogError, setDialogError] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    role_id: '',
  });

  // Check permissions
  const canWrite = hasPermission('users.write');
  const canDelete = hasPermission('users.delete');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, rolesRes] = await Promise.all([
        api.get('/users/'),
        api.get('/users/roles/list'),
      ]);
      
      // Ensure we have valid data
      if (!usersRes.data?.users || !Array.isArray(usersRes.data.users)) {
        throw new Error('Invalid users data received from API');
      }
      if (!rolesRes.data?.roles || !Array.isArray(rolesRes.data.roles)) {
        throw new Error('Invalid roles data received from API');
      }
      
      setUsers(usersRes.data.users);
      setRoles(rolesRes.data.roles);
      setError('');
    } catch (err: any) {
      console.error('Failed to load data:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (user?: User) => {
    // Ensure roles are loaded before opening dialog
    if (roles.length === 0) {
      setError('Roles not loaded yet. Please wait and try again.');
      return;
    }

    // Clear any previous dialog errors
    setDialogError('');

    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        email: user.email,
        password: '',
        full_name: user.full_name,
        role_id: user.role_id,
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        email: '',
        password: '',
        full_name: '',
        role_id: roles.length > 0 ? roles[0].role_id : '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
    setDialogError('');
    setFormData({
      username: '',
      email: '',
      password: '',
      full_name: '',
      role_id: '',
    });
  };

  const handleSaveUser = async () => {
    // Clear previous error
    setDialogError('');
    
    // Validate form data
    if (!editingUser) {
      // Validation for new user
      if (!formData.username || !formData.username.trim()) {
        setDialogError('Username is required');
        return;
      }
      if (!formData.email || !formData.email.trim()) {
        setDialogError('Email is required');
        return;
      }
      if (!formData.password || formData.password.length < 8) {
        setDialogError('Password must be at least 8 characters');
        return;
      }
      if (!formData.full_name || !formData.full_name.trim()) {
        setDialogError('Full name is required');
        return;
      }
      if (!formData.role_id) {
        setDialogError('Role is required');
        return;
      }
    } else {
      // Validation for updating user
      if (!formData.full_name || !formData.full_name.trim()) {
        setDialogError('Full name is required');
        return;
      }
      if (!formData.email || !formData.email.trim()) {
        setDialogError('Email is required');
        return;
      }
      if (!formData.role_id) {
        setDialogError('Role is required');
        return;
      }
    }
    
    try {
      if (editingUser) {
        // Update existing user
        await api.put(`/users/${editingUser.user_id}`, {
          full_name: formData.full_name,
          email: formData.email,
          role_id: formData.role_id,
        });
      } else {
        // Create new user
        await api.post('/users/', formData);
      }
      handleCloseDialog();
      loadData();
    } catch (err: any) {
      // Handle validation errors from Pydantic (FastAPI)
      const detail = err.response?.data?.detail;
      let errorMsg = 'Failed to save user';
      
      if (typeof detail === 'string') {
        errorMsg = detail;
      } else if (Array.isArray(detail)) {
        // Pydantic validation errors are arrays of objects
        errorMsg = detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
      } else if (typeof detail === 'object' && detail !== null) {
        errorMsg = detail.msg || JSON.stringify(detail);
      }
      
      setDialogError(errorMsg);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await api.delete(`/users/${userId}`);
      loadData();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      let errorMsg = 'Failed to delete user';
      
      if (typeof detail === 'string') {
        errorMsg = detail;
      } else if (Array.isArray(detail)) {
        errorMsg = detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
      }
      
      setError(errorMsg);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await api.put(`/users/${user.user_id}`, {
        is_active: !user.is_active,
      });
      loadData();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      let errorMsg = 'Failed to update user';
      
      if (typeof detail === 'string') {
        errorMsg = detail;
      } else if (Array.isArray(detail)) {
        errorMsg = detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
      }
      
      setError(errorMsg);
    }
  };

  const getRoleName = (roleId: string) => {
    const role = roles.find(r => r.role_id === roleId);
    return role?.name || roleId;
  };

  const getRoleColor = (roleId: string) => {
    if (roleId.includes('admin')) return 'error';
    if (roleId.includes('manager')) return 'warning';
    if (roleId.includes('senior')) return 'info';
    return 'default';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!hasPermission('users.read')) {
    return (
      <Alert severity="error">
        You don't have permission to view user management.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>User Management</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage system users and their roles
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={loadData}
            variant="outlined"
          >
            Refresh
          </Button>
          {canWrite && (
            <Button
              variant="contained"
              startIcon={<PersonAdd />}
              onClick={() => handleOpenDialog()}
              size="small"
            >
              Add User
            </Button>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Users Table */}
      <TableContainer 
        component={Paper} 
        sx={{ 
          bgcolor: alpha(theme.palette.background.default, 0.5),
          border: 1,
          borderColor: 'divider',
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Username</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Full Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>MFA</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Last Login</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.user_id} hover>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.full_name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Chip
                    label={getRoleName(user.role_id)}
                    color={getRoleColor(user.role_id)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={user.is_active}
                        onChange={() => handleToggleActive(user)}
                        disabled={!canWrite}
                        size="small"
                      />
                    }
                    label={user.is_active ? 'Active' : 'Inactive'}
                  />
                </TableCell>
                <TableCell>
                  {user.mfa_enabled ? (
                    <Chip label="Enabled" color="success" size="small" />
                  ) : (
                    <Chip label="Disabled" size="small" />
                  )}
                </TableCell>
                <TableCell>
                  {user.last_login
                    ? new Date(user.last_login).toLocaleDateString()
                    : 'Never'}
                </TableCell>
                <TableCell align="right">
                  {canWrite && (
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(user)}
                      color="primary"
                    >
                      <EditIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  )}
                  {canDelete && (
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteUser(user.user_id)}
                      color="error"
                    >
                      <DeleteIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit User Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingUser ? 'Edit User' : 'Create New User'}
        </DialogTitle>
        <DialogContent>
          {dialogError && (
            <Alert severity="error" sx={{ mt: 2 }} onClose={() => setDialogError('')}>
              {dialogError}
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              disabled={!!editingUser}
              required
              fullWidth
              size="small"
            />
            <TextField
              label="Full Name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
              fullWidth
              size="small"
            />
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              fullWidth
              size="small"
            />
            {!editingUser && (
              <TextField
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                fullWidth
                size="small"
                helperText="Minimum 8 characters"
              />
            )}
            <FormControl fullWidth size="small">
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role_id}
                onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                label="Role"
                disabled={roles.length === 0}
              >
                {roles.length === 0 ? (
                  <MenuItem value="" disabled>
                    Loading roles...
                  </MenuItem>
                ) : (
                  roles.map((role) => {
                    const roleName = typeof role.name === 'string' ? role.name : String(role.name || 'Unknown');
                    const roleDesc = typeof role.description === 'string' ? role.description : '';
                    
                    return (
                      <MenuItem key={role.role_id} value={role.role_id}>
                        {roleName}{roleDesc ? ` - ${roleDesc}` : ''}
                      </MenuItem>
                    );
                  })
                )}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveUser} variant="contained">
            {editingUser ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

