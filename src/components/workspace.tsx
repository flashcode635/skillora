'use client';
import { useEffect, useState } from 'react';
import { Search, GitBranch, Star, Clock, Lock, ShieldCheck, Trash2, ArrowLeft, FileCode2, ScanLine, GitFork, Sparkles, Briefcase, MapPin, GraduationCap, ExternalLink } from 'lucide-react';
import type { Profile, Receipt } from '@/lib/types';
type JobMatch = {
  id: string; source: string; title: string; company: string; url: string;
  location: string; posted_at: string; matched: string[]; related?: string[]; gaps: string[];
  match_pct: number; fresher_friendly: boolean;
};

type Lang = 'en' | 'hi';
type View = 'home' | 'jobs' | 'activity' | 'help' | 'privacy';
type Status = 'idle' | 'loading' | 'done';

const T = {
  en: {
    tagline: 'Your code. Your next opportunity.',
    lead: 'Enter a GitHub username to see the skills your public repositories demonstrate — with evidence, not guesswork. No sign-up required.',
    kicker: 'Guided skill discovery',
    inputLabel: 'GitHub username',
    placeholder: 'e.g. torvalds',
    scan: 'Scan profile',
    scanning: 'Scanning public repositories…',
    scanningHint: 'Collecting up to 50 public repositories and computing language evidence. This usually takes a few seconds.',
    profile: 'Profile',
    activity: 'Activity',
    help: 'Help',
    privacy: 'Privacy',
    skillsEvidenced: (n: number) => `${n} skill${n === 1 ? '' : 's'} evidenced`,
    reposScanned: (n: number) => `${n} repositor${n === 1 ? 'y' : 'ies'} scanned`,
    skills: 'Language evidence',
    skillsSub: 'Languages shown appear in more than 5% of a repository\u2019s code. Share is your proportion of total measured bytes.',
    canonSkills: 'Canonical skills',
    canonSub: 'Normalized across repositories — languages are direct evidence; topics map only when they match the Skillora dictionary.',
    repos: 'Repositories',
    reposSub: 'Your 50 most recently pushed public, non-fork repositories.',
    jobs: 'Jobs',
    jobsTitle: 'Jobs matching your evidence',
    jobsSub: 'Real postings from Remotive, Arbeitnow, Jobicy and Google Jobs (India), ranked by a deterministic match against your canonical skills. Applying always opens the original posting.',
    jobsNeedScan: 'Scan a GitHub profile first — job matching works from your evidenced skills.',
    cityLabel: 'City (optional)',
    cityPlaceholder: 'e.g. Bengaluru',
    minMatchLabel: 'Minimum match',
    fresherOnly: 'Fresher-friendly only',
    findJobs: 'Find matches',
    jobsLoading: 'Matching your skills against stored postings…',
    matched: 'Matched',
    related: 'Related evidence',
    gaps: 'Gaps to build',
    apply: 'Apply',
    posted: 'Posted',
    fresherTag: 'Fresher-friendly',
    source: 'Source',
    jobCount: (n: number) => `${n} matching job${n === 1 ? '' : 's'}`,
    noJobsStored: 'No postings are stored right now. Ingestion runs on the server (bun scripts/ingest-jobs.ts).',
    noMatches: 'No stored posting matches this skill set yet. Lower the minimum match or scan another profile.',
    ingestNote: 'Postings come from public job-board APIs and link to the original advertisements.',
    stars: 'stars', lastPush: 'last push', topics: 'topics',
    limited: 'More repositories exist — the 50 most recent are shown.',
    receipts: 'Anonymous scan receipts',
    receiptsSub: 'Count-only records of your scans from the last hour, stored for this browser session. No username or repository content is saved.',
    noReceipts: 'No scans yet. Scan a username and your receipt will appear here.',
    receipt: (r: number, s: number) => `${r} repositor${r === 1 ? 'y' : 'ies'} · ${s} skill${s === 1 ? '' : 's'}`,
    deleteHistory: 'Delete history',
    deleted: 'History deleted.',
    scanAgain: 'Scan another username',
    helpTitle: 'How Skillora works',
    privacyTitle: 'Privacy',
    backHome: 'Back to discovery',
    err: {
      invalid: 'Please enter a valid GitHub username (letters, numbers and single hyphens).',
      not_found: 'No GitHub user with that username. Check the spelling and try again.',
      rate_limit: 'GitHub is limiting requests right now. Please wait a minute and try again.',
      timeout: 'The scan took too long. Please try again.',
      configuration: 'The scan service is not configured right now. Please try again later.',
      unavailable: 'GitHub could not be reached. Please try again shortly.',
      storage: 'Something went wrong on our side. Please try again.',
      origin: 'Blocked for safety. Please use the app directly.',
      network: 'You appear to be offline. Check your connection and try again.',
      unknown: 'Something went wrong. Please try again.',
    },
  },
  hi: {
    tagline: 'आपका कोड। आपका अगला अवसर।',
    lead: 'GitHub यूज़रनेम डालें और देखें कि आपके सार्वजनिक रिपॉज़िटरी कौन-से कौशल दिखाते हैं — अनुमान नहीं, सबूत के साथ। साइन-अप की ज़रूरत नहीं।',
    kicker: 'निर्देशित कौशल खोज',
    inputLabel: 'GitHub यूज़रनेम',
    placeholder: 'जैसे torvalds',
    scan: 'प्रोफ़ाइल स्कैन करें',
    scanning: 'सार्वजनिक रिपॉज़िटरी स्कैन हो रही हैं…',
    scanningHint: '50 तक सार्वजनिक रिपॉज़िटरी इकट्ठा कर भाषा के सबूत निकाले जा रहे हैं। इसमें कुछ सेकंड लगते हैं।',
    profile: 'प्रोफ़ाइल',
    activity: 'गतिविधि',
    help: 'सहायता',
    privacy: 'गोपनीयता',
    skillsEvidenced: (n: number) => `${n} कौशल साबित`,
    reposScanned: (n: number) => `${n} रिपॉज़िटरी स्कैन`,
    skills: 'भाषा के सबूत',
    skillsSub: 'दिखाई गई भाषाएँ किसी रिपॉज़िटरी के कोड का 5% से अधिक हिस्सा हैं। हिस्सा कुल मापे गए बाइट्स का अनुपात है।',
    canonSkills: 'प्रतिमान कौशल',
    canonSub: 'रिपॉज़िटरी में एकीकृत — भाषाएँ सीधे सबूत हैं; विषय केवल तब मैप होते हैं जब वे Skillora शब्दकोश से मेल खाते हों।',
    repos: 'रिपॉज़िटरी',
    reposSub: 'आपकी 50 सबसे हाल में पुश की गई सार्वजनिक, गैर-फोर्क रिपॉज़िटरी।',
    jobs: 'नौकरियाँ',
    jobsTitle: 'आपके सबूत से मेल खाती नौकरियाँ',
    jobsSub: 'Remotive, Arbeitnow, Jobicy और Google Jobs (भारत) की असली पोस्टिंग, आपके प्रतिमान कौशल से निश्चित सूत्र से मेल खाती हुई। आवेदन हमेशा मूल पोस्टिंग खोलता है।',
    jobsNeedScan: 'पहले कोई GitHub प्रोफ़ाइल स्कैन करें — नौकरी मिलान आपके साबित कौशल से चलता है।',
    cityLabel: 'शहर (वैकल्पिक)',
    cityPlaceholder: 'जैसे बेंगलुरु',
    minMatchLabel: 'न्यूनतम मेल',
    fresherOnly: 'केवल फ्रेशर-अनुकूल',
    findJobs: 'मेल खोजें',
    jobsLoading: 'आपके कौशल को संग्रहित पोस्टिंग से मिलाया जा रहा है…',
    matched: 'मेल खाए',
    related: 'संबंधित सबूत',
    gaps: 'सीखने योग्य कमी',
    apply: 'आवेदन',
    posted: 'प्रकाशित',
    fresherTag: 'फ्रेशर-अनुकूल',
    source: 'स्रोत',
    jobCount: (n: number) => `${n} मेल खाती नौकरी`,
    noJobsStored: 'अभी कोई पोस्टिंग संग्रहित नहीं। इनजेशन सर्वर पर चलता है (bun scripts/ingest-jobs.ts)।',
    noMatches: 'अभी इस कौशल-सेट से मेल खाती कोई पोस्टिंग नहीं। न्यूनतम मेल घटाएँ या दूसरा प्रोफ़ाइल स्कैन करें।',
    ingestNote: 'पोस्टिंग सार्वजनिक जॉब-बोर्ड API से आती हैं और मूल विज्ञापन से जोड़ती हैं।',
    stars: 'स्टार', lastPush: 'अंतिम पुश', topics: 'विषय',
    limited: 'और रिपॉज़िटरी मौजूद हैं — 50 हालिया दिखाई गई हैं।',
    receipts: 'अनाम स्कैन रसीदें',
    receiptsSub: 'पिछले एक घंटे की स्कैन गिनती, केवल इस ब्राउज़र सत्र के लिए। यूज़रनेम या रिपॉज़िटरी सामग्री सहेजी नहीं जाती।',
    noReceipts: 'अभी कोई स्कैन नहीं। कोई यूज़रनेम स्कैन करें, रसीद यहाँ दिखेगी।',
    receipt: (r: number, s: number) => `${r} रिपॉज़िटरी · ${s} कौशल`,
    deleteHistory: 'इतिहास मिटाएँ',
    deleted: 'इतिहास मिटा दिया गया।',
    scanAgain: 'दूसरा यूज़रनेम स्कैन करें',
    helpTitle: 'Skillora कैसे काम करता है',
    privacyTitle: 'गोपनीयता',
    backHome: 'खोज पर वापस',
    err: {
      invalid: 'कृपया मान्य GitHub यूज़रनेम डालें (अक्षर, अंक और सिंगल हाइफ़न)।',
      not_found: 'इस यूज़रनेम का कोई GitHub यूज़र नहीं मिला। वर्तनी जाँचें और फिर कोशिश करें।',
      rate_limit: 'GitHub अभी अनुरोध सीमित कर रहा है। एक मिनट बाद कोशिश करें।',
      timeout: 'स्कैन में बहुत समय लगा। कृपया फिर कोशिश करें।',
      configuration: 'स्कैन सेवा अभी कॉन्फ़िगर नहीं है। कृपया बाद में कोशिश करें।',
      unavailable: 'GitHub तक नहीं पहुँच पाए। कृपया थोड़ी देर बाद कोशिश करें।',
      storage: 'हमारी तरफ कुछ गड़बड़ हुई। कृपया फिर कोशिश करें।',
      origin: 'सुरक्षा हेतु रोका गया। कृपया ऐप सीधे उपयोग करें।',
      network: 'आप ऑफ़लाइन लग रहे हैं। कनेक्शन जाँचें और फिर कोशिश करें।',
      unknown: 'कुछ गड़बड़ हुई। कृपया फिर कोशिश करें।',
    },
  },
} as const;

const fmtDate = (iso: string | null, lang: Lang) =>
  iso ? new Date(iso).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function Workspace() {
  const [lang, setLang] = useState<Lang>('en');
  const [view, setView] = useState<View>('home');
  const [status, setStatus] = useState<Status>('idle');
  const [username, setUsername] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [deletedNote, setDeletedNote] = useState(false);
  const [city, setCity] = useState('');
  const [minMatch, setMinMatch] = useState(30);
  const [fresherOnly, setFresherOnly] = useState(false);
  const [jobResults, setJobResults] = useState<{ total: number; unfiltered: number; results: JobMatch[] } | null>(null);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState(false);

  const t = T[lang];

  useEffect(() => {
    const saved = localStorage.getItem('skillora_lang');
    if (saved === 'en' || saved === 'hi') setLang(saved);
  }, []);
  const switchLang = (next: Lang) => { setLang(next); localStorage.setItem('skillora_lang', next); };

  const loadReceipts = async () => {
    try {
      const res = await fetch('/api/scans', { cache: 'no-store' });
      if (res.ok) setReceipts((await res.json()).receipts);
    } catch { /* receipts are supplementary; leave the list as is */ }
  };
  useEffect(() => { if (view === 'activity') loadReceipts(); }, [view]);

  const scan = async () => {
    const target = username.trim();
    if (!target) { setErrorCode('invalid'); return; }
    setStatus('loading'); setErrorCode(null); setProfile(null);
    try {
      const res = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });
      if (res.ok) { setProfile((await res.json()).profile); setStatus('done'); loadReceipts(); return; }
      const body = await res.json().catch(() => ({ error: 'unknown' }));
      setErrorCode(typeof body.error === 'string' ? body.error : 'unknown');
    } catch { setErrorCode('network'); }
    setStatus('idle');
  };

  const deleteHistory = async () => {
    try { const res = await fetch('/api/scans', { method: 'DELETE' }); if (res.ok) { setReceipts([]); setDeletedNote(true); } } catch { /* keep list */ }
  };

  const findJobs = async () => {
    if (!profile) { setJobsError(true); setJobResults(null); return; }
    setJobsLoading(true); setJobsError(false);
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skills: profile.normalized.map(skill => ({ name: skill.name, topicOnly: skill.topicOnly })),
          minMatch, city: city.trim(), fresher: fresherOnly,
        }),
      });
      if (res.ok) { setJobResults(await res.json()); setJobsLoading(false); return; }
      setJobsError(true);
    } catch { setJobsError(true); }
    setJobsLoading(false);
  };

  const errorText = errorCode ? t.err[errorCode as keyof typeof t.err] ?? t.err.unknown : null;
  const maxSkillBytes = profile ? Math.max(...profile.skills.map(s => s.bytes), 1) : 1;

  return (
    <div className="shell">
      <aside className="side-rail">
        <div className="rail-brand"><span className="dot" aria-hidden="true" />Skillora</div>
        <nav className="rail-nav" aria-label={lang === 'hi' ? 'मुख्य' : 'Main'}>
          <button onClick={() => setView('home')} aria-current={view === 'home'}><ScanLine size={18} aria-hidden />{t.kicker}</button>
          <button onClick={() => setView('jobs')} aria-current={view === 'jobs'}><Briefcase size={18} aria-hidden />{t.jobs}</button>
          <button onClick={() => setView('activity')} aria-current={view === 'activity'}><Clock size={18} aria-hidden />{t.activity}</button>
          <button onClick={() => setView('help')} aria-current={view === 'help'}><ShieldCheck size={18} aria-hidden />{t.help}</button>
          <button onClick={() => setView('privacy')} aria-current={view === 'privacy'}><Lock size={18} aria-hidden />{t.privacy}</button>
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="brand"><span className="dot" aria-hidden="true" />Skillora</div>
          <div className="lang-toggle" role="group" aria-label={lang === 'hi' ? 'भाषा' : 'Language'}>
            <button onClick={() => switchLang('en')} aria-pressed={lang === 'en'}>EN</button>
            <button onClick={() => switchLang('hi')} aria-pressed={lang === 'hi'}>हिं</button>
          </div>
        </header>

        <nav className="mobile-nav" aria-label={lang === 'hi' ? 'मुख्य' : 'Main'}>
          <button onClick={() => setView('home')} aria-current={view === 'home'}>{t.kicker}</button>
          <button onClick={() => setView('jobs')} aria-current={view === 'jobs'}>{t.jobs}</button>
          <button onClick={() => setView('activity')} aria-current={view === 'activity'}>{t.activity}</button>
          <button onClick={() => setView('help')} aria-current={view === 'help'}>{t.help}</button>
          <button onClick={() => setView('privacy')} aria-current={view === 'privacy'}>{t.privacy}</button>
        </nav>

        <main className="content">
          {view === 'home' && status === 'idle' && (
            <>
              <section className="hero" aria-labelledby="hero-title">
                <div className="hero-panel">
                  <p className="hero-kicker">{t.kicker}</p>
                  <h1 id="hero-title">{lang === 'en' ? <>Your code.<br /><em>Your next opportunity.</em></> : <>आपका कोड।<br /><em>आपका अगला अवसर।</em></>}</h1>
                  <p className="lead">{t.lead}</p>
                  <div className="hero-graph" aria-hidden="true">
                    <span className="node"><FileCode2 size={14} />repository</span>
                    <span className="node"><Sparkles size={14} />skill evidence</span>
                    <span className="node"><GitBranch size={14} />language bytes</span>
                  </div>
                </div>
              </section>
              <section className="discover-card" aria-labelledby="discover-label">
                <label htmlFor="username" id="discover-label">{t.inputLabel}</label>
                <div className="username-row">
                  <input
                    id="username" name="username" autoComplete="off" autoCapitalize="none" spellCheck={false}
                    placeholder={t.placeholder} value={username} inputMode="text"
                    onChange={e => setUsername(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') scan(); }}
                  />
                  <button className="btn" onClick={scan}>
                    <Search size={18} aria-hidden />{t.scan}
                  </button>
                </div>
                <p className="hint">{lang === 'hi' ? 'केवल सार्वजनिक डेटा। कोई लॉगिन नहीं।' : 'Public data only. No login.'}</p>
                {errorText && <div className="alert error" role="alert"><ShieldCheck size={16} aria-hidden />{errorText}</div>}
              </section>
            </>
          )}

          {status === 'loading' && (
            <div className="loading" role="status" aria-live="polite">
              <div className="spinner" aria-hidden="true" />
              <h2 style={{ fontSize: 'var(--step-2)', margin: '0 0 0.4rem' }}>{t.scanning}</h2>
              <p style={{ color: 'var(--charcoal-500)', margin: 0 }}>{t.scanningHint}</p>
            </div>
          )}

          {view === 'home' && status === 'done' && profile && (
            <>
              <div className="back-row">
                <button className="btn secondary" onClick={() => { setStatus('idle'); setProfile(null); setUsername(''); }}>
                  <ArrowLeft size={16} aria-hidden />{t.scanAgain}
                </button>
              </div>
              <section className="card" aria-labelledby="profile-title">
                <h2 id="profile-title"><GitBranch size={20} aria-hidden />@{profile.username}</h2>
                <p className="sub">{fmtDate(profile.scannedAt, lang)}</p>
                <div className="facts">
                  <span className="chip">{t.reposScanned(profile.repos.length)}</span>
                  <span className="chip">{t.skillsEvidenced(profile.skills.length)}</span>
                </div>
                {profile.limited && <div className="alert info" role="note"><GitFork size={16} aria-hidden />{t.limited}</div>}
              </section>

              <section className="card" aria-labelledby="skills-title">
                <h2 id="skills-title"><Sparkles size={20} aria-hidden />{t.skills}</h2>
                <p className="sub">{t.skillsSub}</p>
                {profile.skills.length === 0 ? (
                  <p className="empty">{lang === 'hi' ? 'इस प्रोफ़ाइल में कोई भाषा सबूत नहीं मिला।' : 'No language evidence was found in this profile.'}</p>
                ) : (
                  <ul className="skill-list">
                    {profile.skills.map(skill => (
                      <li className="skill-item" key={skill.name}>
                        <div className="skill-top">
                          <span className="skill-name">{skill.name}</span>
                          <span className="skill-meta">{t.reposScanned(skill.repos.length)}</span>
                        </div>
                        <div className="bar" role="img" aria-label={`${skill.name}: ${Math.round((skill.bytes / maxSkillBytes) * 100)}%`}>
                          <span style={{ width: `${Math.max(6, Math.round((skill.bytes / maxSkillBytes) * 100))}%` }} />
                        </div>
                        <p className="skill-repos">{skill.repos.slice(0, 6).join(', ')}{skill.repos.length > 6 ? ` +${skill.repos.length - 6}` : ''}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="card" aria-labelledby="canon-title">
                <h2 id="canon-title"><Sparkles size={20} aria-hidden />{t.canonSkills}</h2>
                <p className="sub">{t.canonSub}</p>
                {profile.normalized.length === 0 ? (
                  <p className="empty">{lang === 'hi' ? 'कोई प्रतिमान कौशल नहीं मिला।' : 'No canonical skills were found.'}</p>
                ) : (
                  <ul className="skill-list">
                    {profile.normalized.map(skill => (
                      <li className="skill-item" key={skill.name}>
                        <div className="skill-top">
                          <span className="skill-name">{skill.name}</span>
                          <span className="skill-meta">{skill.category}{skill.topicOnly ? ' · topics' : ''}</span>
                        </div>
                        <div className="bar" role="img" aria-label={`${skill.name}: ${skill.repos.length} repositories`}>
                          <span style={{ width: `${Math.max(8, Math.round((skill.repos.length / Math.max(profile.normalized[0].repos.length, 1)) * 100))}%` }} />
                        </div>
                        <p className="skill-repos">{skill.repos.slice(0, 6).join(', ')}{skill.repos.length > 6 ? ` +${skill.repos.length - 6}` : ''}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="card" aria-labelledby="repos-title">
                <h2 id="repos-title"><FileCode2 size={20} aria-hidden />{t.repos}</h2>
                <p className="sub">{t.reposSub}</p>
                {profile.repos.length === 0 ? (
                  <p className="empty">{lang === 'hi' ? 'कोई सार्वजनिक रिपॉज़िटरी नहीं मिली।' : 'No public repositories were found.'}</p>
                ) : (
                  <ul className="repo-list">
                    {profile.repos.map(repo => (
                      <li className="repo-item" key={repo.url}>
                        <a href={repo.url} target="_blank" rel="noopener noreferrer">{repo.name}</a>
                        <div className="repo-meta">
                          <span><Star size={13} aria-hidden />{repo.stars} {t.stars}</span>
                          <span><Clock size={13} aria-hidden />{t.lastPush}: {fmtDate(repo.pushedAt, lang)}</span>
                        </div>
                        {repo.topics.length > 0 && (
                          <div className="repo-topics">{repo.topics.map(topic => <span key={topic}>{topic}</span>)}</div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}

          {view === 'jobs' && (
            <section className="card" aria-labelledby="jobs-title">
              <h2 id="jobs-title"><Briefcase size={20} aria-hidden />{t.jobsTitle}</h2>
              <p className="sub">{t.jobsSub}</p>
              {!profile && <div className="alert info" role="note"><ShieldCheck size={16} aria-hidden />{t.jobsNeedScan}</div>}
              <div className="jobs-filters">
                <label>
                  <span>{t.cityLabel}</span>
                  <input value={city} onChange={e => setCity(e.target.value)} placeholder={t.cityPlaceholder} aria-label={t.cityLabel} />
                </label>
                <label>
                  <span>{t.minMatchLabel}: {minMatch}%</span>
                  <input type="range" min={0} max={100} step={10} value={minMatch} onChange={e => setMinMatch(Number(e.target.value))} aria-label={t.minMatchLabel} />
                </label>
                <label className="check">
                  <input type="checkbox" checked={fresherOnly} onChange={e => setFresherOnly(e.target.checked)} />
                  <span><GraduationCap size={15} aria-hidden /> {t.fresherOnly}</span>
                </label>
                <button className="btn" onClick={findJobs} disabled={jobsLoading || !profile}><Search size={17} aria-hidden />{t.findJobs}</button>
              </div>
              {jobsError && <div className="alert error" role="alert">{t.err.unknown}</div>}
              {jobsLoading && <p className="empty" role="status">{t.jobsLoading}</p>}
              {jobResults && !jobsLoading && (
                jobResults.results.length === 0 ? (
                  <p className="empty">{jobResults.total === 0 ? t.noJobsStored : t.noMatches}</p>
                ) : (
                  <>
                    <div className="facts" role="status">
                      <span className="chip">{t.jobCount(jobResults.results.length)}</span>
                      {city.trim() && <span className="chip"><MapPin size={13} aria-hidden />{city.trim()}</span>}
                      {fresherOnly && <span className="chip"><GraduationCap size={13} aria-hidden />{t.fresherTag}</span>}
                    </div>
                    <ul className="job-list">
                      {jobResults.results.map(job => (
                        <li className="job-item" key={job.id}>
                          <div className="job-top">
                            <strong>{job.title}</strong>
                            <span className={`match-pct ${job.match_pct >= 70 ? 'high' : job.match_pct >= 40 ? 'mid' : 'low'}`}>{job.match_pct}%</span>
                          </div>
                          <p className="job-meta">{job.company} · <MapPin size={12} aria-hidden style={{ verticalAlign: -2 }} /> {job.location} · {t.source}: {job.source} · {t.posted}: {fmtDate(job.posted_at, lang)}
                            {job.fresher_friendly && <> · <GraduationCap size={12} aria-hidden style={{ verticalAlign: -2 }} /> {t.fresherTag}</>}
                          </p>
                          {job.matched.length > 0 && (
                            <p className="job-skills"><span className="label">{t.matched}:</span>{job.matched.map(skill => <span className="hit" key={skill}>{skill}</span>)}</p>
                          )}
                          {job.related && job.related.length > 0 && (
                            <p className="job-skills"><span className="label">{t.related}:</span>{job.related.map(skill => <span className="hit" key={skill}>{skill}</span>)}</p>
                          )}
                          {job.gaps.length > 0 && (
                            <p className="job-skills"><span className="label">{t.gaps}:</span>{job.gaps.map(skill => <span className="miss" key={skill}>{skill}</span>)}</p>
                          )}
                          <a className="btn secondary apply" href={job.url} target="_blank" rel="noopener noreferrer">{t.apply}<ExternalLink size={14} aria-hidden /></a>
                        </li>
                      ))}
                    </ul>
                    <p className="hint">{t.ingestNote}</p>
                  </>
                )
              )}
            </section>
          )}

          {view === 'activity' && (
            <section className="card" aria-labelledby="activity-title">
              <div className="card-head">
                <div>
                  <h2 id="activity-title"><Clock size={20} aria-hidden />{t.receipts}</h2>
                  <p className="sub">{t.receiptsSub}</p>
                </div>
                {receipts.length > 0 && <button className="btn danger" onClick={deleteHistory}><Trash2 size={15} aria-hidden />{t.deleteHistory}</button>}
              </div>
              {deletedNote && <div className="alert info" role="status">{t.deleted}</div>}
              {receipts.length === 0 ? (
                <p className="empty">{t.noReceipts}</p>
              ) : (
                <ul className="receipt-list">
                  {receipts.map(receipt => (
                    <li key={receipt.id}>
                      <span className="receipt-facts">{t.receipt(receipt.repository_count, receipt.skill_count)}</span>
                      <span className="receipt-facts">{fmtDate(receipt.created_at, lang)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {view === 'help' && (
            <section className="card about-copy" aria-labelledby="help-heading">
              <h2 id="help-heading">{t.helpTitle}</h2>
              <ul>
                <li>{lang === 'hi' ? 'GitHub यूज़रनेम डालें — Skillora उसकी 50 सबसे हाल की सार्वजनिक, गैर-फोर्क रिपॉज़िटरी पढ़ता है।' : 'Enter a GitHub username — Skillora reads its 50 most recently pushed public, non-fork repositories.'}</li>
                <li>{lang === 'hi' ? 'भाषा सबूत तब दिखता है जब कोई भाषा किसी रिपॉज़िटरी के कोड का 5% से अधिक हो।' : 'Language evidence appears when a language makes up more than 5% of a repository\u2019s code.'}</li>
                <li>{lang === 'hi' ? 'स्टार, विषय और अंतिम पुश संदर्भ देते हैं — कोई बनाया हुआ कौशल नहीं।' : 'Stars, topics and last push give context — no invented skills.'}</li>
                <li>{lang === 'hi' ? 'नौकरी मिलान आपके साबित कौशल को सार्वजनिक जॉब-बोर्ड पोस्टिंग से निश्चित सूत्र से मिलाता है — कोई बनाया हुआ मेल नहीं।' : 'Job matching compares your evidenced skills against public job-board postings with a deterministic formula — no invented matches.'}</li>
              </ul>
              <button className="btn secondary" onClick={() => setView('home')}><ArrowLeft size={16} aria-hidden />{t.backHome}</button>
            </section>
          )}

          {view === 'privacy' && (
            <section className="card about-copy" aria-labelledby="privacy-heading">
              <h2 id="privacy-heading">{t.privacyTitle}</h2>
              <p>{lang === 'hi' ? 'Skillora केवल सार्वजनिक GitHub डेटा पढ़ता है। कोई लॉगिन नहीं, कोई निजी रिपॉज़िटरी नहीं।' : 'Skillora reads only public GitHub data. No login, no private repositories.'}</p>
              <ul>
                <li>{lang === 'hi' ? 'कोई खाता नहीं — यूज़रनेम या प्रोफ़ाइल सहेजा नहीं जाता।' : 'No account — no username or profile is stored.'}</li>
                <li>{lang === 'hi' ? 'केवल गिनती वाली अनाम स्कैन रसीदें एक घंटे तक रहती हैं; आप कभी भी इतिहास मिटा सकते हैं।' : 'Only count-based anonymous scan receipts persist for one hour; you can delete history anytime.'}</li>
                <li>{lang === 'hi' ? 'आपकी भाषा पसंद केवल इस ब्राउज़र में सहेजी जाती है।' : 'Your language preference is saved only in this browser.'}</li>
                <li>{lang === 'hi' ? 'अपलाई करने का मतलब मूल नौकरी पोस्ट खोलना है — कभी भी आवेदन संग्रहित नहीं होता।' : 'Applying means opening the original posting — applications are never collected.'}</li>
              </ul>
              <button className="btn secondary" onClick={() => setView('home')}><ArrowLeft size={16} aria-hidden />{t.backHome}</button>
            </section>
          )}
        </main>

        <footer className="site">
          <span>© {new Date().getFullYear()} Skillora</span>
          <button onClick={() => setView('help')}>{t.help}</button>
          <button onClick={() => setView('privacy')}>{t.privacy}</button>
        </footer>
      </div>
    </div>
  );
}
