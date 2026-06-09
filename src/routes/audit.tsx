import { useState, useEffect, useRef } from "react";
import { AuditForm } from "@/components/AuditForm";
import { AuditReport } from "@/components/AuditReport";
import { runBusinessAudit } from "@/lib/auditApi";
import type { AuditInput, AuditResult } from "@/lib/auditApi";

/* ─────────────────────────────────────────────
   All styles scoped under .audit-page
   Designed with Lunavex brand tokens:
     --indigo:  #6366F1  (primary)
     --navy:    #0F172A
     --emerald: #10B981
     --amber:   #F59E0B
   ───────────────────────────────────────────── */
const styles = `
/* ── Reset & tokens ── */
.audit-page *, .audit-page *::before, .audit-page *::after { box-sizing: border-box; margin: 0; padding: 0; }
.audit-page {
  --indigo:      #6366F1;
  --indigo-dark: #4F46E5;
  --indigo-pale: #EEF2FF;
  --navy:        #0F172A;
  --navy-mid:    #1E293B;
  --emerald:     #10B981;
  --emerald-pale:#ECFDF5;
  --amber:       #F59E0B;
  --amber-pale:  #FFFBEB;
  --red:         #EF4444;
  --red-pale:    #FEF2F2;
  --surface:     #F8FAFC;
  --surface-2:   #F1F5F9;
  --border:      #E2E8F0;
  --border-light:#F1F5F9;
  --text-1:      #0F172A;
  --text-2:      #475569;
  --text-3:      #94A3B8;
  --white:       #FFFFFF;
  --radius-sm:   8px;
  --radius-md:   12px;
  --radius-lg:   16px;
  --radius-xl:   24px;
  --shadow-sm:   0 1px 3px rgba(0,0,0,.07),0 1px 2px rgba(0,0,0,.05);
  --shadow-md:   0 4px 16px rgba(0,0,0,.08),0 2px 6px rgba(0,0,0,.04);
  --shadow-lg:   0 12px 40px rgba(0,0,0,.10),0 4px 12px rgba(0,0,0,.05);
  --ar-ring-bg:  #E2E8F0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  -webkit-font-smoothing: antialiased;
  color: var(--text-1);
  background: var(--surface);
  min-height: 100vh;
}

/* ── Nav ── */
.audit-nav {
  background: rgba(255,255,255,.9);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-light);
  position: sticky; top: 0; z-index: 50;
}
.audit-nav-inner {
  max-width: 1120px; margin: 0 auto; padding: 0 24px;
  height: 60px; display: flex; align-items: center; gap: 12px;
}
.audit-nav-logo {
  display: flex; align-items: center; gap: 8px;
  font-size: 18px; font-weight: 800; letter-spacing: -.02em; color: var(--navy);
  text-decoration: none;
}
.audit-nav-logo-mark {
  width: 28px; height: 28px; border-radius: 7px;
  background: var(--indigo);
  display: flex; align-items: center; justify-content: center;
}
.audit-nav-logo-mark svg { display: block; }
.audit-nav-back {
  margin-left: auto; font-size: 13px; font-weight: 500; color: var(--text-2);
  text-decoration: none; display: flex; align-items: center; gap: 4px;
  padding: 6px 12px; border-radius: var(--radius-sm);
  border: 1px solid var(--border); background: var(--white);
  transition: border-color .15s, color .15s;
}
.audit-nav-back:hover { border-color: var(--indigo); color: var(--indigo); }

/* ── Hero strip ── */
.audit-hero {
  background: linear-gradient(180deg, #FAFBFF 0%, var(--surface) 100%);
  border-bottom: 1px solid var(--border);
  padding: 40px 0 36px;
  text-align: center;
  position: relative; overflow: hidden;
}
.audit-hero::before {
  content: ''; position: absolute;
  top: -80px; left: 50%; transform: translateX(-50%);
  width: 600px; height: 400px; border-radius: 50%;
  background: radial-gradient(circle, rgba(99,102,241,.06) 0%, transparent 70%);
  pointer-events: none;
}
.audit-hero-inner { max-width: 640px; margin: 0 auto; padding: 0 24px; position: relative; }
.audit-hero-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase;
  color: var(--indigo); background: var(--indigo-pale);
  padding: 4px 12px; border-radius: 20px;
  border: 1px solid rgba(99,102,241,.2);
  margin-bottom: 16px;
}
.audit-hero-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--indigo); animation: audit-pulse 2s ease-in-out infinite; }
@keyframes audit-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)} }
.audit-hero-title {
  font-size: clamp(26px, 5vw, 40px); font-weight: 800;
  letter-spacing: -.025em; line-height: 1.1; color: var(--navy);
  margin-bottom: 12px;
}
.audit-hero-title .accent { color: var(--indigo); }
.audit-hero-sub {
  font-size: 16px; color: var(--text-2); line-height: 1.6;
  max-width: 480px; margin: 0 auto 20px;
}
.audit-hero-proof {
  display: flex; flex-wrap: wrap; justify-content: center;
  gap: 12px 20px; font-size: 13px; color: var(--text-3);
}
.audit-hero-proof-item { display: flex; align-items: center; gap: 5px; }
.audit-hero-proof-check { color: var(--emerald); }

/* ── Main layout ── */
.audit-main {
  max-width: 720px; margin: 0 auto; padding: 40px 24px 80px;
}

/* ── Form card ── */
.audit-form-card {
  background: var(--white); border: 1.5px solid var(--border);
  border-radius: var(--radius-xl); overflow: hidden;
  box-shadow: var(--shadow-md);
}
.audit-form-card-header {
  padding: 20px 28px 16px;
  border-bottom: 1px solid var(--border-light);
  display: flex; align-items: center; gap: 12px;
}
.audit-form-card-icon {
  width: 40px; height: 40px; border-radius: var(--radius-sm);
  background: var(--indigo-pale); display: flex; align-items: center; justify-content: center;
  font-size: 20px; flex-shrink: 0;
}
.audit-form-card-title { font-size: 16px; font-weight: 700; color: var(--navy); }
.audit-form-card-sub { font-size: 13px; color: var(--text-2); margin-top: 2px; }
.audit-form-wrap { padding: 24px 28px 28px; }

/* ── Form fields ── */
.af-field { margin-bottom: 20px; }
.af-label {
  display: block; font-size: 13px; font-weight: 600; color: var(--text-1);
  margin-bottom: 7px;
}
.af-required { color: var(--indigo); margin-left: 2px; }
.af-optional { font-weight: 400; color: var(--text-3); font-size: 12px; }
.af-input {
  width: 100%; padding: 10px 14px;
  border: 1.5px solid var(--border); border-radius: var(--radius-md);
  font-size: 14px; font-family: inherit; color: var(--text-1);
  background: var(--white); transition: border-color .15s, box-shadow .15s;
  outline: none;
}
.af-input::placeholder { color: var(--text-3); }
.af-input:focus { border-color: var(--indigo); box-shadow: 0 0 0 3px rgba(99,102,241,.1); }
.af-input--error { border-color: var(--red); }
.af-input--error:focus { box-shadow: 0 0 0 3px rgba(239,68,68,.1); }
.af-input--disabled { opacity: .45; cursor: not-allowed; }
.af-error { font-size: 12px; color: var(--red); margin-top: 5px; }
.af-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.af-chip {
  padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 500;
  border: 1.5px solid var(--border); background: var(--white);
  color: var(--text-2); cursor: pointer; transition: all .15s;
  font-family: inherit; line-height: 1;
}
.af-chip:hover { border-color: var(--indigo); color: var(--indigo); background: var(--indigo-pale); }
.af-chip--active { border-color: var(--indigo); background: var(--indigo); color: var(--white); }
.af-checkbox-row {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; color: var(--text-2); cursor: pointer; margin-top: 8px;
}
.af-checkbox { width: 16px; height: 16px; cursor: pointer; accent-color: var(--indigo); }
.af-checkbox-label { user-select: none; }
.af-submit {
  width: 100%; padding: 14px 20px;
  background: var(--indigo); color: var(--white);
  border: none; border-radius: var(--radius-md);
  font-size: 15px; font-weight: 600; font-family: inherit;
  cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: background .15s, transform .15s, box-shadow .15s;
  box-shadow: 0 4px 14px rgba(99,102,241,.3);
}
.af-submit:hover { background: var(--indigo-dark); transform: translateY(-1px); box-shadow: 0 6px 20px rgba(99,102,241,.4); }
.af-submit:active { transform: translateY(0); }
.af-trust {
  text-align: center; font-size: 12px; color: var(--text-3);
  margin-top: 12px; display: flex; justify-content: center; gap: 6px; flex-wrap: wrap;
}
.af-trust-dot { opacity: .4; }

/* ── Loading state ── */
.af-loading { padding: 8px 0; }
.af-loading-eyebrow {
  font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase;
  color: var(--indigo); margin-bottom: 8px;
}
.af-loading-name { font-size: 20px; font-weight: 700; color: var(--navy); margin-bottom: 20px; }
.af-loading-name strong { color: var(--indigo); }
.af-progress-track {
  height: 6px; background: var(--border); border-radius: 6px; overflow: hidden;
}
.af-progress-fill {
  height: 100%; background: linear-gradient(90deg, var(--indigo) 0%, var(--indigo-dark) 100%);
  border-radius: 6px; transition: width .5s ease;
}
.af-progress-pct { font-size: 12px; color: var(--text-3); margin-top: 6px; text-align: right; }
.af-steps { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; }
.af-step {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; border-radius: var(--radius-md);
  background: var(--surface); border: 1.5px solid var(--border);
  transition: background .2s, border-color .2s;
}
.af-step--active { background: var(--indigo-pale); border-color: rgba(99,102,241,.3); }
.af-step--done { background: var(--emerald-pale); border-color: rgba(16,185,129,.2); }
.af-step-icon {
  width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: var(--border);
}
.af-step--done .af-step-icon { background: var(--emerald); color: white; }
.af-step--active .af-step-icon { background: var(--indigo); }
.af-step-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--text-3); }
.af-step-spinner {
  width: 10px; height: 10px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,.3); border-top-color: white;
  animation: af-spin .6s linear infinite; display: block;
}
@keyframes af-spin { to { transform: rotate(360deg); } }
.af-step-text { flex: 1; min-width: 0; }
.af-step-name { font-size: 13px; font-weight: 600; color: var(--text-1); margin-right: 6px; }
.af-step-task { font-size: 12px; color: var(--text-2); }
.af-step--done .af-step-name, .af-step--done .af-step-task { color: var(--emerald); }
.af-step-badge {
  font-size: 11px; padding: 2px 8px; border-radius: 4px; flex-shrink: 0; font-weight: 600;
}
.af-step-badge--done { background: rgba(16,185,129,.15); color: var(--emerald); }
.af-step-badge--running { background: rgba(99,102,241,.15); color: var(--indigo); }

/* ── Report wrap ── */
.ar-wrap { display: flex; flex-direction: column; gap: 0; }

/* ── Report header ── */
.ar-header {
  background: var(--navy); border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  padding: 28px 28px 24px; color: white;
}
.ar-header-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px; }
.ar-header-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.ar-header-tag { font-size: 12px; color: rgba(255,255,255,.45); }
.ar-header-dot { color: rgba(255,255,255,.2); font-size: 12px; }
.ar-restart {
  font-size: 13px; color: rgba(255,255,255,.5); background: none; border: none;
  cursor: pointer; padding: 4px 0; font-family: inherit;
  transition: color .15s;
}
.ar-restart:hover { color: white; }
.ar-title { font-size: clamp(22px, 4vw, 32px); font-weight: 800; letter-spacing: -.025em; margin-bottom: 10px; }
.ar-summary { font-size: 14px; color: rgba(255,255,255,.65); line-height: 1.6; max-width: 580px; }

/* ── Score overview ── */
.ar-scores {
  background: var(--white); border-left: 1.5px solid var(--border); border-right: 1.5px solid var(--border);
  padding: 24px 28px;
  display: grid; grid-template-columns: auto 1fr; gap: 24px; align-items: center;
}
.ar-overall { display: flex; align-items: center; gap: 16px; }
.ar-overall-ring { flex-shrink: 0; }
.ar-overall-label { font-size: 12px; color: var(--text-3); text-transform: uppercase; letter-spacing: .05em; font-weight: 600; margin-bottom: 2px; }
.ar-overall-grade { font-size: 20px; font-weight: 800; letter-spacing: -.01em; margin-bottom: 4px; }
.ar-overall-agents { font-size: 11px; color: var(--text-3); }
.ar-score-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.ar-score-card {
  display: flex; flex-direction: column; align-items: center; text-align: center;
  padding: 12px 8px; border-radius: var(--radius-md);
  background: var(--surface); border: 1.5px solid var(--border);
  text-decoration: none; color: inherit;
  transition: border-color .15s, box-shadow .15s;
}
.ar-score-card:hover { border-color: var(--indigo); box-shadow: 0 4px 12px rgba(99,102,241,.1); }
.ar-score-card-icon { font-size: 18px; margin-bottom: 4px; }
.ar-score-card-label { font-size: 11px; color: var(--text-3); margin-bottom: 4px; }
.ar-score-card-val { font-size: 22px; font-weight: 800; letter-spacing: -.02em; line-height: 1; }
.ar-score-card-grade { font-size: 11px; font-weight: 500; margin-top: 3px; }
.ar-grade--good { color: var(--emerald); }
.ar-grade--fair { color: var(--amber); }
.ar-grade--bad  { color: var(--red); }

/* ── Revenue strip ── */
.ar-revenue {
  background: var(--emerald-pale); border: 1.5px solid rgba(16,185,129,.25);
  border-top: none; padding: 16px 28px;
}
.ar-revenue-inner { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.ar-revenue-icon { font-size: 24px; flex-shrink: 0; }
.ar-revenue-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: rgba(5,150,105,.7); margin-bottom: 2px; }
.ar-revenue-amount { font-size: 18px; font-weight: 800; color: #065F46; letter-spacing: -.015em; }
.ar-revenue-detail { font-size: 13px; color: #047857; margin-top: 2px; }
.ar-topwin {
  font-size: 13px; color: #065F46;
  background: rgba(16,185,129,.12); border: 1px solid rgba(16,185,129,.2);
  border-radius: var(--radius-sm); padding: 8px 12px;
  display: flex; align-items: flex-start; gap: 6px;
}
.ar-topwin-label { font-weight: 700; flex-shrink: 0; }

/* ── Category sections ── */
.ar-categories { display: flex; flex-direction: column; gap: 0; }
.ar-cat {
  background: var(--white);
  border: 1.5px solid var(--border); border-top: none;
  padding: 24px 28px;
}
.ar-cat-header {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
  margin-bottom: 12px;
}
.ar-cat-left { display: flex; align-items: flex-start; gap: 12px; flex: 1; min-width: 0; }
.ar-cat-icon { font-size: 22px; flex-shrink: 0; margin-top: 2px; }
.ar-cat-title { font-size: 17px; font-weight: 700; color: var(--navy); margin-bottom: 2px; }
.ar-cat-desc { font-size: 13px; color: var(--text-2); }
.ar-cat-right { display: flex; flex-direction: column; align-items: center; gap: 4px; flex-shrink: 0; }
.ar-grade { font-size: 12px; font-weight: 600; }
.ar-cat-headline { font-size: 14px; color: var(--text-2); line-height: 1.6; margin-bottom: 16px; font-style: italic; }

/* ── Fixes ── */
.ar-fixes { display: flex; flex-direction: column; gap: 10px; }
.ar-fix {
  display: flex; gap: 12px; align-items: flex-start;
  padding: 14px 16px; border-radius: var(--radius-md);
  background: var(--surface); border: 1.5px solid var(--border);
  transition: border-color .2s;
}
.ar-fix:first-child { border-color: rgba(99,102,241,.3); background: var(--indigo-pale); }
.ar-fix--locked {
  filter: blur(4px); pointer-events: none; user-select: none;
  position: relative;
}
.ar-fix-num {
  width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700;
  background: var(--border); color: var(--text-2);
}
.ar-fix:first-child .ar-fix-num { background: var(--indigo); color: white; }
.ar-fix-body { flex: 1; min-width: 0; }
.ar-fix-text { font-size: 14px; color: var(--text-1); line-height: 1.6; margin-bottom: 8px; }
.ar-fix-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ar-badge {
  font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px;
}
.ar-badge--green { background: var(--emerald-pale); color: #065F46; }
.ar-badge--blue  { background: var(--indigo-pale);  color: #3730A3; }
.ar-badge--amber { background: var(--amber-pale);   color: #92400E; }
.ar-fix-impact { font-size: 12px; color: var(--text-3); }

/* ── Email gate ── */
.ar-gate {
  background: var(--white); border: 1.5px solid var(--border); border-top: none;
  padding: 0;
}
.ar-gate-inner {
  margin: 24px 28px;
  background: linear-gradient(135deg, var(--navy) 0%, #1a1f4e 100%);
  border-radius: var(--radius-lg); padding: 32px;
  text-align: center; color: white;
}
.ar-gate-lock { font-size: 32px; margin-bottom: 12px; }
.ar-gate-title { font-size: 20px; font-weight: 800; letter-spacing: -.02em; margin-bottom: 8px; }
.ar-gate-sub { font-size: 14px; color: rgba(255,255,255,.65); line-height: 1.6; max-width: 440px; margin: 0 auto 20px; }
.ar-gate-form { display: flex; gap: 8px; max-width: 400px; margin: 0 auto; }
.ar-gate-input {
  flex: 1; padding: 11px 14px;
  background: rgba(255,255,255,.1); border: 1.5px solid rgba(255,255,255,.2);
  border-radius: var(--radius-md); font-size: 14px; font-family: inherit;
  color: white; outline: none; transition: border-color .15s;
}
.ar-gate-input::placeholder { color: rgba(255,255,255,.35); }
.ar-gate-input:focus { border-color: rgba(255,255,255,.5); }
.ar-gate-input--error { border-color: #FCA5A5; }
.ar-gate-btn {
  padding: 11px 20px; background: var(--indigo); color: white;
  border: none; border-radius: var(--radius-md); font-size: 14px; font-weight: 600;
  font-family: inherit; cursor: pointer; display: flex; align-items: center; gap: 6px;
  white-space: nowrap; transition: background .15s;
}
.ar-gate-btn:hover:not(:disabled) { background: var(--indigo-dark); }
.ar-gate-btn:disabled { opacity: .6; cursor: not-allowed; }
.ar-gate-spinner {
  width: 14px; height: 14px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,.3); border-top-color: white;
  animation: af-spin .6s linear infinite; display: block;
}
.ar-gate-error { font-size: 12px; color: #FCA5A5; margin-top: 8px; }
.ar-gate-fine { font-size: 12px; color: rgba(255,255,255,.3); margin-top: 12px; }

/* ── Post-unlock CTA ── */
.ar-cta {
  background: var(--white); border: 1.5px solid var(--border);
  border-top: none; border-radius: 0 0 var(--radius-xl) var(--radius-xl);
  overflow: hidden;
}
.ar-cta-inner {
  margin: 0; padding: 36px 28px; text-align: center;
  border-top: 3px solid var(--indigo);
}
.ar-cta-icon { font-size: 36px; margin-bottom: 12px; }
.ar-cta-title { font-size: 22px; font-weight: 800; letter-spacing: -.02em; color: var(--navy); margin-bottom: 10px; }
.ar-cta-sub { font-size: 15px; color: var(--text-2); line-height: 1.6; max-width: 480px; margin: 0 auto 24px; }
.ar-cta-actions { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
.ar-cta-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 13px 24px; border-radius: var(--radius-md); font-size: 15px; font-weight: 600;
  text-decoration: none; transition: all .15s;
}
.ar-cta-btn--primary {
  background: var(--indigo); color: white;
  box-shadow: 0 4px 14px rgba(99,102,241,.3);
}
.ar-cta-btn--primary:hover { background: var(--indigo-dark); transform: translateY(-1px); }
.ar-cta-btn--secondary {
  background: var(--white); color: var(--text-1);
  border: 1.5px solid var(--border);
}
.ar-cta-btn--secondary:hover { border-color: var(--indigo); color: var(--indigo); }
.ar-cta-trust { font-size: 12px; color: var(--text-3); }

/* ── Error state ── */
.audit-error {
  background: var(--red-pale); border: 1.5px solid rgba(239,68,68,.25);
  border-radius: var(--radius-lg); padding: 20px 24px; text-align: center;
  margin-top: 12px;
}
.audit-error-title { font-size: 15px; font-weight: 700; color: var(--red); margin-bottom: 6px; }
.audit-error-msg { font-size: 13px; color: #B91C1C; margin-bottom: 12px; }
.audit-error-btn {
  padding: 8px 18px; background: var(--red); color: white;
  border: none; border-radius: var(--radius-sm); font-size: 13px; font-weight: 600;
  cursor: pointer; font-family: inherit;
}
.audit-error-btn:hover { opacity: .9; }

/* ── Social proof bar ── */
.audit-proof-bar {
  max-width: 720px; margin: 0 auto; padding: 0 24px;
}
.audit-proof-inner {
  display: flex; align-items: center; justify-content: center;
  flex-wrap: wrap; gap: 8px 24px; padding: 14px 0;
  border-bottom: 1px solid var(--border);
  font-size: 13px; color: var(--text-3);
  margin-bottom: 32px;
}
.audit-proof-item { display: flex; align-items: center; gap: 5px; }
.audit-proof-star { color: var(--amber); }

/* ── Responsive ── */
@media (max-width: 640px) {
  .audit-form-card-header, .audit-form-wrap { padding: 16px 20px; }
  .ar-header, .ar-scores, .ar-revenue, .ar-cat, .ar-gate-inner, .ar-cta-inner { padding-left: 20px; padding-right: 20px; }
  .ar-gate-inner { margin: 16px; }
  .ar-scores { grid-template-columns: 1fr; }
  .ar-score-grid { grid-template-columns: repeat(2, 1fr); }
  .ar-cat-header { flex-direction: column; }
  .ar-cat-right { flex-direction: row; align-items: center; gap: 8px; }
  .ar-gate-form { flex-direction: column; }
  .ar-gate-btn { justify-content: center; }
  .audit-hero-title { font-size: 26px; }
}
@media (prefers-reduced-motion: reduce) {
  .audit-hero-dot, .af-step-spinner, .ar-gate-spinner { animation: none; }
  .af-progress-fill, .ar-score-card { transition: none; }
}
`;

/* ─────────────────────────────────────────────
   Page component
   ───────────────────────────────────────────── */
type PageState = "form" | "loading" | "report" | "error";

const AGENT_STEP_DURATION_MS = 1800;

export default function AuditPage() {
  const [pageState, setPageState] = useState<PageState>("form");
  const [loadingStep, setLoadingStep] = useState(0); // 0–4
  const [result, setResult] = useState<AuditResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<AuditInput | null>(null);

  /* Advance loading steps while the API call runs */
  useEffect(() => {
    if (pageState !== "loading") return;
    if (loadingStep >= 4) return;

    const t = setTimeout(() => {
      setLoadingStep((s) => s + 1);
    }, AGENT_STEP_DURATION_MS);

    return () => clearTimeout(t);
  }, [pageState, loadingStep]);

  async function handleSubmit(input: AuditInput) {
    inputRef.current = input;
    setLoadingStep(0);
    setPageState("loading");

    try {
      const auditResult = await runBusinessAudit(input);
      setResult(auditResult);
      setLoadingStep(4); // ensure all steps marked done
      // Small delay so the last step visually completes
      setTimeout(() => setPageState("report"), 600);
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setPageState("error");
    }
  }

  function handleStartOver() {
    setPageState("form");
    setResult(null);
    setErrorMsg("");
    setLoadingStep(0);
  }

  const showForm = pageState === "form" || pageState === "loading" || pageState === "error";

  return (
    <>
      {/* Inject scoped styles */}
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      <div className="audit-page">
        {/* ── Nav ── */}
        <nav className="audit-nav" aria-label="Audit page navigation">
          <div className="audit-nav-inner">
            <a href="/" className="audit-nav-logo" aria-label="Lunavex home">
              <div className="audit-nav-logo-mark" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                  <path d="M9 2L15.5 5.5V12.5L9 16L2.5 12.5V5.5L9 2Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
                  <circle cx="9" cy="9" r="2.5" fill="white" />
                </svg>
              </div>
              Lunavex
            </a>
            <a href="/" className="audit-nav-back" aria-label="Back to homepage">
              ← Back to home
            </a>
          </div>
        </nav>

        {/* ── Hero strip ── */}
        <div className="audit-hero" role="banner">
          <div className="audit-hero-inner">
            <div className="audit-hero-eyebrow">
              <span className="audit-hero-dot" aria-hidden="true" />
              Free · Powered by 5 AI agents
            </div>
            <h1 className="audit-hero-title">
              Find out what's costing your business{" "}
              <span className="accent">customers</span>
            </h1>
            <p className="audit-hero-sub">
              Enter your business details and get a scored audit across 4 categories —
              with plain-English fixes you can act on today.
            </p>
            <div className="audit-hero-proof" aria-label="Trust indicators">
              <span className="audit-hero-proof-item">
                <span className="audit-hero-proof-check" aria-hidden="true">✓</span>
                Takes 60 seconds
              </span>
              <span className="audit-hero-proof-item">
                <span className="audit-hero-proof-check" aria-hidden="true">✓</span>
                No credit card
              </span>
              <span className="audit-hero-proof-item">
                <span className="audit-hero-proof-check" aria-hidden="true">✓</span>
                500+ businesses audited
              </span>
            </div>
          </div>
        </div>

        {/* ── Main ── */}
        <main className="audit-main" id="main-content">

          {/* Social proof bar */}
          <div className="audit-proof-bar" aria-hidden="true">
            <div className="audit-proof-inner">
              <span className="audit-proof-item">
                <span className="audit-proof-star">★★★★★</span>
                "Booked 6 jobs in week one" — Marcus T., HVAC
              </span>
              <span className="audit-proof-item">
                <span className="audit-proof-star">★★★★★</span>
                "Doubled reviews in 30 days" — Daniel R., Roofing
              </span>
            </div>
          </div>

          {/* Form state (also shown during loading and error) */}
          {showForm && (
            <div className="audit-form-card" role="region" aria-label="Business audit form">
              <div className="audit-form-card-header">
                <div className="audit-form-card-icon" aria-hidden="true">🔍</div>
                <div>
                  <div className="audit-form-card-title">Free Business Audit</div>
                  <div className="audit-form-card-sub">
                    Scored across Visibility · Reputation · Lead Capture · Conversion
                  </div>
                </div>
              </div>

              <AuditForm
                onSubmit={handleSubmit}
                loading={pageState === "loading"}
                loadingStep={loadingStep}
              />

              {pageState === "error" && (
                <div className="audit-error" role="alert">
                  <div className="audit-error-title">Audit failed</div>
                  <p className="audit-error-msg">{errorMsg}</p>
                  <button className="audit-error-btn" onClick={handleStartOver}>
                    Try again
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Report */}
          {pageState === "report" && result && (
            <div role="region" aria-label="Audit report">
              <AuditReport result={result} onStartOver={handleStartOver} />
            </div>
          )}
        </main>
      </div>
    </>
  );
}
