import { Audit, CreateAuditRequest } from '../types';

export const api = {
  createAudit: async (data: CreateAuditRequest): Promise<Audit> => {
    try {
      const response = await fetch('/api/audits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Failed to create audit: ${response.status} ${err}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('API Error (createAudit):', error);
      throw error;
    }
  },

  getAudit: async (id: string): Promise<Audit | null> => {
    try {
      const response = await fetch(`/api/audits/${id}`);
      if (response.status === 404) return null;
      if (!response.ok) {
        throw new Error(`Failed to fetch audit: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error(`API Error (getAudit ${id}):`, error);
      throw error;
    }
  },

  listAudits: async (): Promise<Audit[]> => {
    try {
      const response = await fetch('/api/audits');
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to list audits: ${response.status} ${text}`);
      }
      return response.json();
    } catch (error) {
      console.error('API Error (listAudits):', error);
      // Return empty array on error to prevent UI crash, but log it
      return [];
    }
  }
};