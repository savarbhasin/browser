import { API_BASE } from '../config';
import type { CheckResult, Report } from '../types';

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

  async batchCheckUrls(urls: string[]): Promise<{ results: CheckResult[]; total_checked: number; safe_count: number; unsafe_count: number }> {
    const response = await fetch(`${this.baseUrl}/api/check/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls })
    });

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

