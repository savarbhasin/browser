// Shared types for the extension

export interface DomainAgeCheck {
  age_days?: number;
  is_newly_registered?: boolean;
  creation_date?: string;
  registrar?: string;
  suspicious: boolean;
  reason?: string;
  error?: string;
}

export interface SSLCertificateCheck {
  valid?: boolean;
  days_until_expiry?: number;
  cert_age_days?: number;
  issuer?: string;
  is_self_signed?: boolean;
  subject?: string;
  suspicious: boolean;
  reason?: string;
  error?: string;
}

export interface DNSCheck {
  has_mx_records?: boolean;
  has_a_records?: boolean;
  has_aaaa_records?: boolean;
  nameserver_count?: number;
  nameservers?: string[];
  suspicious: boolean;
  reason?: string;
  error?: string;
}

export interface TyposquattingCheck {
  is_typosquatting?: boolean;
  target_brand?: string;
  similarity?: number;
  has_unicode_chars?: boolean;
  has_brand_in_subdomain?: boolean;
  is_known_brand?: boolean;
  suspicious: boolean;
  reason?: string;
  error?: string;
}

export interface EnhancedFeatures {
  is_url_shortened?: boolean;
  has_at_symbol?: boolean;
  subdomain_count?: number;
  has_unusual_port?: boolean;
  port?: number;
  domain_entropy?: number;
  digit_letter_ratio?: number;
  has_ip_address?: boolean;
  special_char_count?: number;
  has_suspicious_path?: boolean;
  suspicious: boolean;
  reason?: string;
  error?: string;
}

export interface ReputationCheck {
  phishtank?: {
    in_database: boolean;
    verified?: boolean;
    suspicious?: boolean;
    error?: string;
  };
  urlhaus?: {
    in_database: boolean;
    threat?: string;
    tags?: string[];
    suspicious?: boolean;
    error?: string;
  };
  virustotal?: {
    malicious_count?: number;
    suspicious_count?: number;
    total_engines?: number;
    detection_ratio?: string;
    suspicious?: boolean;
    submitted?: boolean;
    message?: string;
    note?: string;
    error?: string;
  };
  overall_suspicious: boolean;
  detection_count?: number;
  reasons?: string[];
  flagged_by_services?: string[];  // List of security services that flagged this URL
  error?: string;
}

export interface EnhancedChecks {
  domain_age: DomainAgeCheck;
  ssl_certificate: SSLCertificateCheck;
  dns_records: DNSCheck;
  typosquatting: TyposquattingCheck;
  enhanced_features: EnhancedFeatures;
  reputation: ReputationCheck;
}

export interface CheckResult {
  url: string;
  safe: boolean;
  ml_score: number;
  ml_label: string;
  safe_browsing: {
    safe: boolean;
    threats: Array<{
      threatType: string;
      platformType: string;
      threatEntryType: string;
    }>;
    error: string | null;
  };
  features: Record<string, any>;
  enhanced_checks?: EnhancedChecks;
  final_verdict: string;
  confidence: string;
  suspicious_signals?: string[];
  risk_score: number; // 0-100, higher = more dangerous
}

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  created_at: string;
}

export interface Report {
  id?: string;
  url: string;
  type: 'true_positive' | 'true_negative' | 'false_positive' | 'false_negative';
  description: string;
  user_id: string;
  created_at?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  created_at: number;
  updated_at: number;
}

