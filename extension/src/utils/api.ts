import { API_BASE } from '../config';
import type { CheckResult, User, Report } from '../types';

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  async checkUrl(url: string): Promise<CheckResult> {
    const response = await fetch(`${this.baseUrl}/api/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  }

  async registerUser(user: { email: string; name: string; picture?: string }): Promise<User> {
    const response = await fetch(`${this.baseUrl}/api/users/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  }

  async getUser(email: string): Promise<User> {
    const response = await fetch(`${this.baseUrl}/api/users/${encodeURIComponent(email)}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  }

  async submitReport(report: Report): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(report)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  }

  async chat(message: string, conversationHistory: Array<{ role: string; content: string }> = []): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        message,
        conversation_history: conversationHistory
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  }
}

export const apiClient = new ApiClient();

