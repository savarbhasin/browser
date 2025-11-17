import React from 'react';
import type { CheckResult } from '../types';
import { VERDICT_CONFIG } from '../config';
import '../styles/global.css';

interface ResultCardProps {
  result: CheckResult;
  showUrl?: boolean;
}

export const ResultCard: React.FC<ResultCardProps> = ({ result, showUrl = false }) => {
  const config = VERDICT_CONFIG[result.final_verdict as keyof typeof VERDICT_CONFIG];
  
  if (!config) {
    return null;
  }

  const getVerdictStyles = () => {
    switch(result.final_verdict) {
      case 'safe':
        return {
          container: 'verdict-safe-bg',
          badge: 'verdict-safe-badge',
          icon: 'verdict-safe-icon',
          textColor: 'text-green-100'
        };
      case 'suspicious':
        return {
          container: 'verdict-suspicious-bg',
          badge: 'verdict-suspicious-badge',
          icon: 'verdict-suspicious-icon',
          textColor: 'text-yellow-100'
        };
      case 'unsafe':
      case 'phishing':
        return {
          container: 'verdict-phishing-bg',
          badge: 'verdict-phishing-badge',
          icon: 'verdict-phishing-icon',
          textColor: 'text-red-100'
        };
      default:
        return {
          container: 'verdict-default-bg',
          badge: 'verdict-default-badge',
          icon: 'verdict-default-icon',
          textColor: 'text-gray-100'
        };
    }
  };

  const getVerdictIcon = () => {
    switch(result.final_verdict) {
      case 'safe':
        return (
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        );
      case 'suspicious':
        return (
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        );
      case 'unsafe':
      case 'phishing':
        return (
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const styles = getVerdictStyles();

  return (
    <div className="mt-4 animate-slide-up">
      {/* Main Status Card */}
      <div className={`relative p-6 border-2 rounded-2xl shadow-lg ${styles.container} overflow-hidden`}>
        {/* Animated background gradient */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent animate-pulse"></div>
        </div>
        
        {/* Content */}
        <div className="relative">
          {/* Status Badge */}
          <div className="flex items-center justify-center mb-4">
            <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border-2 ${styles.badge} backdrop-blur-sm`}>
              <div className={styles.icon}>
                {getVerdictIcon()}
              </div>
              <div className="text-left">
                <div className={`text-2xl font-bold tracking-tight ${styles.textColor}`}>
                  {config.text}
                </div>
                <div className={`text-xs opacity-80 font-medium mt-0.5 ${styles.textColor}`}>
                  Security Status
                </div>
              </div>
            </div>
          </div>

          {/* Risk Score Display */}
          <div className="mt-4 bg-dark-bg/50 backdrop-blur-sm rounded-xl p-4 border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-dark-text-muted font-medium">Risk Score</div>
              <div className={`text-2xl font-bold font-mono ${
                result.risk_score <= 30 ? 'text-green-400' :
                result.risk_score <= 60 ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {result.risk_score}/100
              </div>
            </div>
            
            {/* Risk Score Bar */}
            <div className="relative w-full h-3 bg-dark-surface/50 rounded-full overflow-hidden border border-white/10">
              <div 
                className={`absolute left-0 top-0 h-full transition-all duration-500 ${
                  result.risk_score <= 30 ? 'bg-gradient-to-r from-green-500 to-green-400' :
                  result.risk_score <= 60 ? 'bg-gradient-to-r from-yellow-500 to-orange-400' :
                  'bg-gradient-to-r from-red-500 to-rose-400'
                }`}
                style={{ width: `${result.risk_score}%` }}
              />
            </div>
            
            <div className="flex justify-between mt-1 text-[9px] text-dark-text-muted font-medium">
              <span>Safe</span>
              <span>Suspicious</span>
              <span>Dangerous</span>
            </div>
          </div>

          {/* Confidence Metric */}
          {/* <div className="mt-3 bg-dark-bg/50 backdrop-blur-sm rounded-xl p-3 border border-white/5">
            <div className="text-xs text-dark-text-muted mb-1 font-medium">Confidence</div>
            <div className="text-lg font-bold text-white">{result.confidence}</div>
          </div> */}

          {/* Suspicious Signals */}
          {result.suspicious_signals && result.suspicious_signals.length > 0 && (
            <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
              <div className="text-xs text-red-300 font-bold mb-2">⚠️ Suspicious Signals</div>
              <div className="flex flex-wrap gap-1.5">
                {result.suspicious_signals.map((signal, idx) => (
                  <span key={idx} className="text-[10px] px-2 py-1 bg-red-500/20 border border-red-500/40 text-red-200 rounded-md font-medium">
                    {signal.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Detection Results */}
      {result.enhanced_checks && (
        <div className="mt-3 space-y-2">
          <div className="text-xs text-dark-text-muted font-bold mb-2">🔍 Enhanced Detection Results</div>
          
          {/* ML Model Detection */}
          <div className="p-3 rounded-xl border bg-blue-500/10 border-blue-500/30">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-xs font-bold text-white mb-1">🤖 ML Model Detection</div>
                <div className="text-[10px] text-dark-text-muted space-y-0.5">
                  <div>ML Score: <span className="font-mono font-bold text-white">{Number(result.ml_score).toFixed(3)}</span></div>
                  <div>Classification: <span className={`font-bold px-2 py-0.5 rounded ${styles.badge}`}>{result.ml_label}</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Domain Age Check */}
          {result.enhanced_checks.domain_age && !result.enhanced_checks.domain_age.error && (
            <div className={`p-3 rounded-xl border ${result.enhanced_checks.domain_age.suspicious ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-xs font-bold text-white mb-1">📅 Domain Age</div>
                  {result.enhanced_checks.domain_age.age_days !== undefined && (
                    <div className="text-[10px] text-dark-text-muted">
                      {result.enhanced_checks.domain_age.age_days} days old
                      {result.enhanced_checks.domain_age.registrar && (
                        <span className="ml-1">• Registrar: {result.enhanced_checks.domain_age.registrar}</span>
                      )}
                    </div>
                  )}
                  {result.enhanced_checks.domain_age.reason && (
                    <div className="text-[10px] text-yellow-300 mt-1">{result.enhanced_checks.domain_age.reason}</div>
                  )}
                </div>
                <div className={`text-xs font-bold ${result.enhanced_checks.domain_age.suspicious ? 'text-yellow-300' : 'text-green-300'}`}>
                  {result.enhanced_checks.domain_age.suspicious ? '⚠️' : '✓'}
                </div>
              </div>
            </div>
          )}

          {/* SSL Certificate Check */}
          {result.enhanced_checks.ssl_certificate && !result.enhanced_checks.ssl_certificate.error && (
            <div className={`p-3 rounded-xl border ${result.enhanced_checks.ssl_certificate.suspicious ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-xs font-bold text-white mb-1">🔒 SSL Certificate</div>
                  {result.enhanced_checks.ssl_certificate.valid !== undefined && (
                    <div className="text-[10px] text-dark-text-muted">
                      {result.enhanced_checks.ssl_certificate.issuer && (
                        <span>Issuer: {result.enhanced_checks.ssl_certificate.issuer}</span>
                      )}
                      {result.enhanced_checks.ssl_certificate.days_until_expiry !== undefined && (
                        <span className="ml-1">• Expires in {result.enhanced_checks.ssl_certificate.days_until_expiry} days</span>
                      )}
                    </div>
                  )}
                  {result.enhanced_checks.ssl_certificate.reason && (
                    <div className="text-[10px] text-yellow-300 mt-1">{result.enhanced_checks.ssl_certificate.reason}</div>
                  )}
                </div>
                <div className={`text-xs font-bold ${result.enhanced_checks.ssl_certificate.suspicious ? 'text-yellow-300' : 'text-green-300'}`}>
                  {result.enhanced_checks.ssl_certificate.suspicious ? '⚠️' : '✓'}
                </div>
              </div>
            </div>
          )}

          {/* DNS Records Check */}
          {result.enhanced_checks.dns_records && !result.enhanced_checks.dns_records.error && (
            <div className={`p-3 rounded-xl border ${result.enhanced_checks.dns_records.suspicious ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-xs font-bold text-white mb-1">🌐 DNS Records</div>
                  <div className="text-[10px] text-dark-text-muted">
                    {result.enhanced_checks.dns_records.has_mx_records ? 'Has email' : 'No email'}
                    {' • '}
                    {result.enhanced_checks.dns_records.has_a_records ? 'Has A records' : 'No A records'}
                  </div>
                  {result.enhanced_checks.dns_records.reason && (
                    <div className="text-[10px] text-yellow-300 mt-1">{result.enhanced_checks.dns_records.reason}</div>
                  )}
                </div>
                <div className={`text-xs font-bold ${result.enhanced_checks.dns_records.suspicious ? 'text-yellow-300' : 'text-green-300'}`}>
                  {result.enhanced_checks.dns_records.suspicious ? '⚠️' : '✓'}
                </div>
              </div>
            </div>
          )}

          {/* Typosquatting Check */}
          {result.enhanced_checks.typosquatting && !result.enhanced_checks.typosquatting.error && (
            <div className={`p-3 rounded-xl border ${result.enhanced_checks.typosquatting.suspicious ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-xs font-bold text-white mb-1">🎭 Typosquatting Check</div>
                  {result.enhanced_checks.typosquatting.is_typosquatting && result.enhanced_checks.typosquatting.target_brand && (
                    <div className="text-[10px] text-red-300">
                      Similar to: {result.enhanced_checks.typosquatting.target_brand}
                      {result.enhanced_checks.typosquatting.similarity && (
                        <span> ({(result.enhanced_checks.typosquatting.similarity * 100).toFixed(0)}% similar)</span>
                      )}
                    </div>
                  )}
                  {result.enhanced_checks.typosquatting.has_unicode_chars && (
                    <div className="text-[10px] text-yellow-300">Contains unicode characters</div>
                  )}
                  {result.enhanced_checks.typosquatting.has_brand_in_subdomain && (
                    <div className="text-[10px] text-yellow-300">Brand name in subdomain</div>
                  )}
                  {result.enhanced_checks.typosquatting.reason && (
                    <div className="text-[10px] text-red-300 mt-1">{result.enhanced_checks.typosquatting.reason}</div>
                  )}
                  {!result.enhanced_checks.typosquatting.suspicious && (
                    <div className="text-[10px] text-green-300">No typosquatting detected</div>
                  )}
                </div>
                <div className={`text-xs font-bold ${result.enhanced_checks.typosquatting.suspicious ? 'text-red-300' : 'text-green-300'}`}>
                  {result.enhanced_checks.typosquatting.suspicious ? '⚠️' : '✓'}
                </div>
              </div>
            </div>
          )}

          {/* Enhanced URL Features */}
          {result.enhanced_checks.enhanced_features && !result.enhanced_checks.enhanced_features.error && (
            <div className={`p-3 rounded-xl border ${result.enhanced_checks.enhanced_features.suspicious ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-xs font-bold text-white mb-1">🔍 URL Features</div>
                  <div className="text-[10px] text-dark-text-muted space-y-0.5">
                    {result.enhanced_checks.enhanced_features.is_url_shortened && (
                      <div className="text-yellow-300">• URL shortener detected</div>
                    )}
                    {result.enhanced_checks.enhanced_features.has_at_symbol && (
                      <div className="text-yellow-300">• Contains @ symbol</div>
                    )}
                    {result.enhanced_checks.enhanced_features.has_ip_address && (
                      <div className="text-yellow-300">• Uses IP address</div>
                    )}
                    {result.enhanced_checks.enhanced_features.subdomain_count !== undefined && result.enhanced_checks.enhanced_features.subdomain_count > 2 && (
                      <div className="text-yellow-300">• {result.enhanced_checks.enhanced_features.subdomain_count} subdomains</div>
                    )}
                    {result.enhanced_checks.enhanced_features.domain_entropy !== undefined && (
                      <div>Entropy: {result.enhanced_checks.enhanced_features.domain_entropy.toFixed(2)}</div>
                    )}
                  </div>
                  {result.enhanced_checks.enhanced_features.reason && (
                    <div className="text-[10px] text-yellow-300 mt-1">{result.enhanced_checks.enhanced_features.reason}</div>
                  )}
                </div>
                <div className={`text-xs font-bold ${result.enhanced_checks.enhanced_features.suspicious ? 'text-yellow-300' : 'text-green-300'}`}>
                  {result.enhanced_checks.enhanced_features.suspicious ? '⚠️' : '✓'}
                </div>
              </div>
            </div>
          )}

          {/* Reputation Check */}
          {result.enhanced_checks.reputation && (
            <div className={`p-3 rounded-xl border ${result.enhanced_checks.reputation.overall_suspicious || (!result.safe_browsing.safe && result.safe_browsing.threats.length > 0) ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-xs font-bold text-white mb-1">🛡️ Reputation Check</div>
                  
                  {/* Priority Alert: Flagged by Security Services */}
                  {result.enhanced_checks.reputation.flagged_by_services && result.enhanced_checks.reputation.flagged_by_services.length > 0 && (
                    <div className="mb-2 p-2 bg-red-500/20 border border-red-500/50 rounded-md">
                      <div className="text-[10px] font-bold text-red-200 mb-1">⚠️ FLAGGED BY SECURITY SERVICES:</div>
                      <div className="text-[10px] text-red-100 font-semibold">
                        {result.enhanced_checks.reputation.flagged_by_services.join(', ')}
                      </div>
                    </div>
                  )}
                  
                  <div className="text-[10px] text-dark-text-muted space-y-0.5">
                    {/* Google Safe Browsing */}
                    {result.safe_browsing && (
                      <div className={!result.safe_browsing.safe && result.safe_browsing.threats.length > 0 ? 'text-red-300 font-bold' : ''}>
                        Google Safe Browsing: {!result.safe_browsing.safe && result.safe_browsing.threats.length > 0 ? 
                          `🚫 ${result.safe_browsing.threats.map(t => t.threatType).join(", ")}` : 
                          '✓ Clean'}
                      </div>
                    )}
                    {result.enhanced_checks.reputation.phishtank && (
                      <div className={result.enhanced_checks.reputation.phishtank.in_database ? 'text-red-300 font-bold' : ''}>
                        PhishTank: {result.enhanced_checks.reputation.phishtank.in_database ? '🚫 Listed' : '✓ Clean'}
                      </div>
                    )}
                    {result.enhanced_checks.reputation.urlhaus && (
                      <div className={result.enhanced_checks.reputation.urlhaus.in_database ? 'text-red-300 font-bold' : ''}>
                        URLhaus: {result.enhanced_checks.reputation.urlhaus.in_database ? '🚫 Listed' : '✓ Clean'}
                      </div>
                    )}
                    {result.enhanced_checks.reputation.virustotal && result.enhanced_checks.reputation.virustotal.malicious_count !== undefined && (
                      <div className={result.enhanced_checks.reputation.virustotal.malicious_count > 0 ? 'text-red-300 font-bold' : ''}>
                        VirusTotal: {result.enhanced_checks.reputation.virustotal.detection_ratio || `${result.enhanced_checks.reputation.virustotal.malicious_count}/0`}
                      </div>
                    )}
                  </div>
                  {result.enhanced_checks.reputation.reasons && result.enhanced_checks.reputation.reasons.length > 0 && (
                    <div className="text-[10px] text-red-300 mt-1">
                      {result.enhanced_checks.reputation.reasons.join(', ')}
                    </div>
                  )}
                </div>
                <div className={`text-xs font-bold ${result.enhanced_checks.reputation.overall_suspicious || (!result.safe_browsing.safe && result.safe_browsing.threats.length > 0) ? 'text-red-300' : 'text-green-300'}`}>
                  {result.enhanced_checks.reputation.overall_suspicious || (!result.safe_browsing.safe && result.safe_browsing.threats.length > 0) ? '🚫' : '✓'}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* URL Display */}
      {showUrl && (
        <div className="mt-3 p-3 bg-dark-surface/50 backdrop-blur-sm border border-dark-border rounded-xl">
          <div className="text-[10px] text-dark-text-muted break-all font-mono leading-relaxed">
            {result.url}
          </div>
        </div>
      )}
    </div>
  );
};

