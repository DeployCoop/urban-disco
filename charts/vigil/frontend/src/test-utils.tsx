/**
 * Test utilities and helpers
 * Provides custom render function with all necessary providers
 */

import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Create a custom render function that includes all providers
interface AllProvidersProps {
  children: React.ReactNode;
}

const AllProviders = ({ children }: AllProvidersProps) => {
  return (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllProviders, ...options });

// Re-export everything from @testing-library/react
export * from '@testing-library/react';

// Override render method
export { customRender as render };

// Mock data factories for consistent test data
export const mockCase = (overrides = {}) => ({
  id: 'case-123',
  title: 'Test Security Incident',
  description: 'Test description',
  priority: 'high',
  status: 'open',
  severity: 'high',
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-01-01T10:00:00Z',
  findings_count: 3,
  assignee: null,
  ...overrides,
});

export const mockFinding = (overrides = {}) => ({
  id: 'finding-123',
  title: 'Suspicious Login Activity',
  description: 'Multiple failed login attempts detected',
  severity: 'high',
  source: 'splunk',
  timestamp: '2024-01-01T10:00:00Z',
  raw_data: {},
  iocs: {
    ips: ['192.168.1.100'],
    domains: [],
    hashes: [],
  },
  mitre_techniques: [],
  ...overrides,
});

export const mockUser = (overrides = {}) => ({
  id: 'user-123',
  username: 'analyst@company.com',
  email: 'analyst@company.com',
  role: 'analyst',
  created_at: '2024-01-01T10:00:00Z',
  ...overrides,
});

export const mockTimelineEvent = (overrides = {}) => ({
  id: 'event-123',
  event_type: 'case_created',
  timestamp: '2024-01-01T10:00:00Z',
  user: 'analyst@company.com',
  description: 'Case created',
  details: {},
  ...overrides,
});

export const mockApprovalAction = (overrides = {}) => ({
  id: 'action-123',
  action_type: 'isolate_host',
  target: 'workstation-042',
  confidence: 0.85,
  status: 'pending',
  reasoning: 'Suspicious behavior detected',
  created_at: '2024-01-01T10:00:00Z',
  ...overrides,
});

export const mockIntegration = (overrides = {}) => ({
  id: 'int-123',
  name: 'Splunk',
  type: 'siem',
  enabled: true,
  status: 'connected',
  config: {},
  ...overrides,
});

// Helper to wait for async operations
export const waitForLoadingToFinish = () => {
  return new Promise((resolve) => setTimeout(resolve, 0));
};

// Helper to find all buttons in a container
export const getAllButtons = (container: HTMLElement) => {
  return Array.from(container.querySelectorAll('button'));
};

// Helper to find all inputs in a container
export const getAllInputs = (container: HTMLElement) => {
  return Array.from(container.querySelectorAll('input, textarea, select'));
};

