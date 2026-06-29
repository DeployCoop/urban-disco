/**
 * Test utilities and helpers
 */

import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a custom render function with providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Mock data factories
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
  ...overrides,
});

export const mockFinding = (overrides = {}) => ({
  id: 'finding-123',
  title: 'Suspicious Login Activity',
  description: 'Multiple failed login attempts',
  severity: 'high',
  source: 'splunk',
  timestamp: '2024-01-01T10:00:00Z',
  raw_data: {},
  iocs: {
    ips: ['192.168.1.100'],
  },
  ...overrides,
});

export const mockUser = (overrides = {}) => ({
  id: 'user-123',
  username: 'analyst@company.com',
  email: 'analyst@company.com',
  role: 'analyst',
  ...overrides,
});

export const mockTimelineEvent = (overrides = {}) => ({
  id: 'event-123',
  event_type: 'case_created',
  timestamp: '2024-01-01T10:00:00Z',
  user: 'analyst@company.com',
  description: 'Case created',
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

