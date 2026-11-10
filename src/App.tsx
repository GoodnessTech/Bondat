import React, { useEffect, useState } from 'react';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  Code2,
  ExternalLink,
  FileCheck2,
  Fingerprint,
  Info,
  Link2,
  Lock,
  Menu,
  Network,
  Plus,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import {
  BOT_CHAIN_MAINNET,
  CONTRACT_CONFIG,
  getExplorerAddressUrl,
} from './config/chain';
import { BlockchainService } from './services/web3';
import type { Page, ServiceCategory } from './types';

const LIFECYCLE_STEPS = [
  { num: '01', title: 'Register', body: 'Define the agent, its service commitments, and performance benchmarks.', target: 'agents' as Page },
  { num: '02', title: 'Collateralize', body: 'Deposit BOT on BOT Chain as a verifiable, slashable performance bond.', target: 'agents' as Page },
  { num: '03', title: 'Cover', body: 'Customers purchase certainty for a specific service, deadline, and outcome.', target: 'marketplace' as Page },
  { num: '04', title: 'Resolve', body: 'Cryptographic evidence turns disputed outcomes into transparent settlement.', target: 'claims' as Page },
];

export default function App() {
  const [page, setPage] = useState<Page>(() => parseRoute());
  const [mobileMenu, setMobileMenu] = useState(false);
  const [wallet, setWallet] = useState<string>('');
  const [chainId, setChainId] = useState<number | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'error' | 'success' } | null>(null);

  function parseRoute(): Page {
    const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0].split('/')[0];
    const validPages: Page[] = [
      'home',
      'dashboard',
      'agents',
      'agent-details',
      'marketplace',
      'coverage-details',
      'claims',
      'docs',
    ];
    return validPages.includes(raw as Page) ? (raw as Page) : 'home';
  }

  useEffect(() => {
    const onHash = () => {
      setPage(parseRoute());
      setMobileMenu(false);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Check wallet connection on startup if provider is already authorized
  useEffect(() => {
    if (BlockchainService.hasProvider()) {
      BlockchainService.getChainId().then(setChainId);
      window.ethereum?.request({ method: 'eth_accounts' }).then((accounts) => {
        const accs = accounts as string[];
        if (accs && accs.length > 0) {
          setWallet(accs[0]);
          BlockchainService.getBotBalance(accs[0]).then(setBalance);
        }
      }).catch(() => { });

      const handleAccountsChanged = (accounts: unknown) => {
        const accs = accounts as string[];
        if (accs && accs.length > 0) {
          setWallet(accs[0]);
          BlockchainService.getBotBalance(accs[0]).then(setBalance);
        } else {
          setWallet('');
          setBalance(null);
        }
      };

      const handleChainChanged = (chainIdHex: unknown) => {
        if (typeof chainIdHex === 'string') {
          setChainId(parseInt(chainIdHex, 16));
        }
      };

      window.ethereum?.on?.('accountsChanged', handleAccountsChanged);
      window.ethereum?.on?.('chainChanged', handleChainChanged);

      return () => {
        window.ethereum?.removeListener?.('accountsChanged', handleAccountsChanged);
        window.ethereum?.removeListener?.('chainChanged', handleChainChanged);
      };
    }
  }, []);

  const go = (next: Page) => {
    window.location.hash = `/${next}`;
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showToast = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const handleConnectWallet = async () => {
    if (!BlockchainService.hasProvider()) {
      showToast('No Web3 wallet detected. Please install MetaMask or another EVM wallet.', 'error');
      return;
    }
    try {
      const accounts = await BlockchainService.requestAccounts();
      if (accounts && accounts[0]) {
        setWallet(accounts[0]);
        const cid = await BlockchainService.getChainId();
        setChainId(cid);

        if (cid !== BOT_CHAIN_MAINNET.chainId) {
          showToast(`Wallet connected. Please switch to ${BOT_CHAIN_MAINNET.chainName} (Chain ID 677).`, 'info');
          try {
            await BlockchainService.switchToBotChain();
            setChainId(BOT_CHAIN_MAINNET.chainId);
          } catch {
            // User cancelled network switch
          }
        }

        const bal = await BlockchainService.getBotBalance(accounts[0]);
        setBalance(bal);
        showToast('Wallet connected to BOT Chain Mainnet.', 'success');
      }
    } catch {
      showToast('Wallet connection was cancelled or rejected.', 'error');
    }
  };

  const handleSwitchNetwork = async () => {
    try {
      await BlockchainService.switchToBotChain();
      setChainId(BOT_CHAIN_MAINNET.chainId);
      showToast(`Switched to ${BOT_CHAIN_MAINNET.chainName}.`, 'success');
    } catch {
      showToast(`Could not switch to BOT Chain Mainnet (Chain ID 677).`, 'error');
    }
  };

  const isWrongNetwork = wallet && chainId !== null && chainId !== BOT_CHAIN_MAINNET.chainId;

  return (
    <div className="app-shell">
      <header className="site-header">
        <button className="brand" onClick={() => go('home')} aria-label="Bondat home">
          <span className="brand-mark"><span /></span>
          <span>BONDAT</span>
        </button>

        <nav className={`main-nav ${mobileMenu ? 'is-open' : ''}`}>
          <button className={page === 'home' ? 'is-active' : ''} onClick={() => go('home')}>
            Protocol
          </button>
          <button className={page === 'dashboard' ? 'is-active' : ''} onClick={() => go('dashboard')}>
            Dashboard
          </button>
          <button className={page === 'agents' || page === 'agent-details' ? 'is-active' : ''} onClick={() => go('agents')}>
            Agents
          </button>
          <button className={page === 'marketplace' || page === 'coverage-details' ? 'is-active' : ''} onClick={() => go('marketplace')}>
            Marketplace
          </button>
          <button className={page === 'claims' ? 'is-active' : ''} onClick={() => go('claims')}>
            Claims
          </button>
          <button className={page === 'docs' ? 'is-active' : ''} onClick={() => go('docs')}>
            Docs
          </button>

          <button className="mobile-connect" onClick={handleConnectWallet}>
            {wallet ? BlockchainService.shortenAddress(wallet) : 'Connect wallet'}
          </button>
        </nav>

        <div className="header-actions">
          {isWrongNetwork ? (
            <button className="chain-pill is-warning" onClick={handleSwitchNetwork} title="Click to switch network">
              <CircleAlert size={12} /> Switch to BOT Chain
            </button>
          ) : (
            <span className="chain-pill">
              <span className="status-dot" /> BOT Chain (677)
            </span>
          )}

          <button className="wallet-button" onClick={handleConnectWallet}>
            <Wallet size={16} />
            {wallet ? BlockchainService.shortenAddress(wallet) : 'Connect wallet'}
          </button>

          <button
            className="menu-button"
            onClick={() => setMobileMenu(!mobileMenu)}
            aria-label="Toggle navigation"
          >
            {mobileMenu ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      <main>
        {page === 'home' && <HomePage go={go} />}
        {page === 'dashboard' && (
          <DashboardPage
            wallet={wallet}
            balance={balance}
            chainId={chainId}
            onConnect={handleConnectWallet}
            onSwitchNetwork={handleSwitchNetwork}
            go={go}
          />
        )}
        {page === 'agents' && <AgentsPage go={go} toast={showToast} />}
        {page === 'agent-details' && <AgentDetailsPage go={go} />}
        {page === 'marketplace' && <MarketplacePage go={go} toast={showToast} />}
        {page === 'coverage-details' && <CoverageDetailsPage go={go} />}
        {page === 'claims' && <ClaimsPage go={go} toast={showToast} />}
        {page === 'docs' && <DocsPage />}
      </main>

      <footer className="site-footer">
        <div className="footer-top">
          <div>
            <button className="brand" onClick={() => go('home')}>
              <span className="brand-mark"><span /></span>
              <span>BONDAT</span>
            </button>
            <p>
              Verifiable protection for services<br />in the autonomous economy.
            </p>
          </div>
          <div className="footer-links">
            <button onClick={() => go('docs')}>Documentation <ArrowUpRight size={14} /></button>
            <a href="https://www.botchain.ai/" target="_blank" rel="noreferrer">
              BOT Chain <ExternalLink size={14} />
            </a>
            <a href={BOT_CHAIN_MAINNET.blockExplorerUrl} target="_blank" rel="noreferrer">
              BOTScan <ExternalLink size={14} />
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Bondat Protocol</span>
          <span>Target Network: BOT Chain Mainnet · Chain ID {BOT_CHAIN_MAINNET.chainId}</span>
          <span className="footer-social">Decentralized Agent Performance Insurance</span>
        </div>
      </footer>

      {toast && (
        <div className="toast">
          {toast.type === 'error' ? (
            <CircleAlert size={17} style={{ color: 'var(--terra)' }} />
          ) : toast.type === 'success' ? (
            <CheckCircle2 size={17} style={{ color: '#5c7b56' }} />
          ) : (
            <Info size={17} />
          )}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} aria-label="Close notification">
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   PAGE: Landing (Home)
   ========================================================================== */

function HomePage({ go }: { go: (page: Page) => void }) {
  const scrollToExplore = () => {
    const el = document.getElementById('protocol-lifecycle');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <section className="hero section-pad">
        <div className="eyebrow">
          <span className="eyebrow-line" /> Protocol for service certainty <span className="eyebrow-badge">01 / 04</span>
        </div>
        <div className="hero-grid">
          <div>
            <h1>
              Protection for<br />
              <em>the autonomous</em><br />
              economy.
            </h1>
            <p className="hero-copy">
              Bondat makes AI services accountable. Operators lock collateral against defined commitments on BOT Chain, so customers can buy certainty—not promises.
            </p>
            <div className="button-row">
              <button className="button button-dark" onClick={() => go('dashboard')}>
                Explore protocol <ArrowRight size={17} />
              </button>
              <button className="button button-outline" onClick={() => go('agents')}>
                Protect your agent <ArrowUpRight size={17} />
              </button>
            </div>
            <div className="hero-note">
              <span className="pulse-dot" /> Live on BOT Chain Mainnet (Chain ID 677)
              <span className="note-separator" />
              <a
                href={getExplorerAddressUrl(CONTRACT_CONFIG.address)}
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--terra)', textDecoration: 'underline' }}
              >
                Contract: {BlockchainService.shortenAddress(CONTRACT_CONFIG.address)}
              </a>
            </div>
          </div>
          <div className="hero-art">
            <div className="art-orbit orbit-one" />
            <div className="art-orbit orbit-two" />
            <div className="art-core">
              <ShieldCheck size={42} strokeWidth={1.2} />
              <span>COLLATERAL<br /><strong>×</strong> TRUST</span>
            </div>
            <div className="art-label art-label-a">SERVICE<br />COMMITMENT</div>
            <div className="art-label art-label-b">VERIFIABLE<br />OUTCOMES</div>
            <div className="art-cross cross-a" />
            <div className="art-cross cross-b" />
          </div>
        </div>
        <div className="hero-scroll" style={{ cursor: 'pointer' }} onClick={scrollToExplore}>
          <span>Scroll to explore</span>
          <ArrowDownRight size={17} />
        </div>
      </section>

      <section className="signal-strip" id="protocol-lifecycle">
        <div className="signal-intro">
          One protocol.<br />
          <strong>Every commitment.</strong>
        </div>
        {[
          { label: 'Operator deposits', page: 'agents' as Page },
          { label: 'Customer covers', page: 'marketplace' as Page },
          { label: 'Evidence resolves', page: 'claims' as Page },
        ].map((item, i) => (
          <div
            className="signal-item"
            key={item.label}
            style={{ cursor: 'pointer' }}
            onClick={() => go(item.page)}
            title={`Navigate to ${item.label}`}
          >
            <span>0{i + 1}</span>
            <b>{item.label}</b>
            <ArrowUpRight size={16} />
          </div>
        ))}
      </section>

      <section className="section-pad section-block">
        <div className="section-heading">
          <div>
            <div className="eyebrow"><span className="eyebrow-line" /> The protocol</div>
            <h2>Make performance<br /><em>provable.</em></h2>
          </div>
          <p>
            Autonomous services move fast. Accountability should move with them. Bondat connects an operator’s stake to a customer’s outcome through one transparent on-chain lifecycle.
          </p>
        </div>
        <div className="lifecycle-grid">
          {LIFECYCLE_STEPS.map((step) => (
            <div
              className="lifecycle-card"
              key={step.num}
              style={{ cursor: 'pointer' }}
              onClick={() => go(step.target)}
              title={`View ${step.title}`}
            >
              <span className="card-index">{step.num}</span>
              <div className="lifecycle-icon">
                {step.num === '01' ? <Fingerprint /> : step.num === '02' ? <Lock /> : step.num === '03' ? <BadgeCheck /> : <FileCheck2 />}
              </div>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
              <ArrowUpRight className="card-arrow" size={18} />
            </div>
          ))}
        </div>
      </section>

      <section className="dark-band section-pad">
        <div className="eyebrow eyebrow-light"><span className="eyebrow-line" /> Why Bondat</div>
        <div className="dark-band-grid">
          <h2>Trust is not a<br /><em>feature.</em><br />It is the foundation.</h2>
          <div className="feature-list">
            {[
              ['01', 'Collateral-backed', 'An operator’s stake creates a direct economic guarantee behind every defined commitment.'],
              ['02', 'Specific by design', 'Customers protect one service, one deadline, and one measurable outcome at a time.'],
              ['03', 'Transparent always', 'Policy state, evidence, and settlement are designed to be independently verifiable.'],
            ].map(([n, t, b]) => (
              <div className="feature-row" key={n}>
                <span>{n}</span>
                <div>
                  <h3>{t}</h3>
                  <p>{b}</p>
                </div>
                <ArrowUpRight size={18} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad commitment-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow"><span className="eyebrow-line" /> Coverage categories</div>
            <h2>Cover what<br /><em>can fail.</em></h2>
          </div>
          <p>
            Coverage is built around real service commitments—not vague promises. Define the failure condition, set the window, and make recourse clear before work begins.
          </p>
        </div>
        <div className="category-grid">
          <div className="category-large">
            <div className="category-number">01</div>
            <Zap size={28} />
            <h3>Missed delivery</h3>
            <p>Protect a time-bound service commitment with a clear delivery deadline.</p>
            <button onClick={() => go('marketplace')}>
              Explore coverage <ArrowRight size={16} />
            </button>
          </div>
          <div className="category-stack">
            <div
              className="category-small"
              style={{ cursor: 'pointer' }}
              onClick={() => go('marketplace')}
            >
              <div>
                <span>02</span>
                <h3>Invalid output</h3>
                <p>When the result does not match the agreed specification.</p>
              </div>
              <Code2 size={28} />
            </div>
            <div
              className="category-small"
              style={{ cursor: 'pointer' }}
              onClick={() => go('marketplace')}
            >
              <div>
                <span>03</span>
                <h3>Service downtime</h3>
                <p>For critical agents that need to be available when called.</p>
              </div>
              <Clock3 size={28} />
            </div>
          </div>
        </div>
      </section>

      <section className="closing-cta section-pad">
        <div className="closing-art">
          <div className="closing-square" />
          <div className="closing-square square-two" />
          <Sparkles size={25} />
        </div>
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> Start with certainty</div>
          <h2>Build the economy<br /><em>you can trust.</em></h2>
          <p>Explore the registry, register an agent, or learn how protection works on Bondat.</p>
          <div className="button-row">
            <button className="button button-dark" onClick={() => go('agents')}>
              Browse agents <ArrowRight size={17} />
            </button>
            <button className="button button-outline" onClick={() => go('docs')}>
              Read the docs <BookOpen size={16} />
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

/* ==========================================================================
   PAGE: Dashboard
   ========================================================================== */

function DashboardPage({
  wallet,
  balance,
  chainId,
  onConnect,
  onSwitchNetwork,
  go,
}: {
  wallet: string;
  balance: string | null;
  chainId: number | null;
  onConnect: () => void;
  onSwitchNetwork: () => void;
  go: (page: Page) => void;
}) {
  const isWrongChain = wallet && chainId !== null && chainId !== BOT_CHAIN_MAINNET.chainId;

  return (
    <PageFrame
      eyebrow="Your protocol overview"
      title={<>Good to see you<br /><em>back.</em></>}
      subtitle="Your on-chain activity, collateral, and commitments in one place."
    >
      <div className="dashboard-wallet">
        <div>
          <span className="muted-label">Connected wallet</span>
          <strong>{wallet ? wallet : 'No wallet connected'}</strong>
          {wallet && (
            <div style={{ marginTop: 6, display: 'flex', gap: 14, fontSize: 11, color: 'var(--muted)' }}>
              <span>Balance: <b>{balance !== null ? `${balance} BOT` : 'Querying RPC...'}</b></span>
              <span>Network: <b>{chainId === BOT_CHAIN_MAINNET.chainId ? 'BOT Chain Mainnet (677)' : `Chain ID ${chainId ?? 'Unknown'}`}</b></span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {isWrongChain && (
            <button className="button button-orange" onClick={onSwitchNetwork}>
              <CircleAlert size={16} /> Switch to BOT Chain
            </button>
          )}
          <button className="button button-dark" onClick={onConnect}>
            <Wallet size={16} /> {wallet ? 'Change wallet' : 'Connect wallet'}
          </button>
        </div>
      </div>

      <div className="integration-notice" style={{ background: 'rgba(92, 123, 86, 0.08)', borderColor: '#5c7b56' }}>
        <CheckCircle2 size={18} style={{ color: '#5c7b56' }} />
        <div>
          <strong style={{ color: '#2b4d24' }}>BondatCore Live on BOT Chain Mainnet</strong>
          <p>
            Official Contract:{' '}
            <a
              href={getExplorerAddressUrl(CONTRACT_CONFIG.address)}
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--terra)', fontWeight: 700 }}
            >
              {CONTRACT_CONFIG.address} <ExternalLink size={12} style={{ display: 'inline' }} />
            </a>
            {' '}· Block {CONTRACT_CONFIG.blockNumber} · Chain ID {BOT_CHAIN_MAINNET.chainId}
          </p>
        </div>
      </div>

      <div className="metrics-grid">
        {[
          ['Total collateral', '0 BOT', 'Live deposits on BOT Chain'],
          ['Available collateral', '0 BOT', 'Ready to back commitments'],
          ['Locked collateral', '0 BOT', 'Underwriting active coverage'],
          ['Registered agents', '0', 'Mainnet registry ready'],
        ].map(([label, val, detail]) => (
          <div className="metric-card" key={label}>
            <span>{label}</span>
            <strong>{val}</strong>
            <small>{detail}</small>
          </div>
        ))}
      </div>

      <div className="dashboard-lower">
        <EmptyPanel
          icon={<Network />}
          title="No agents registered"
          text="Your registered agents and their commitments will appear here once submitted on BOT Chain."
          action="Register an agent"
          onAction={() => go('agents')}
        />
        <EmptyPanel
          icon={<FileCheck2 />}
          title="No active policies"
          text="Coverage policies protecting specific commitments will appear here."
          action="Explore marketplace"
          onAction={() => go('marketplace')}
        />
      </div>
    </PageFrame>
  );
}

/* ==========================================================================
   PAGE: Agent Registry
   ========================================================================== */

function AgentsPage({ go, toast }: { go: (page: Page) => void; toast: (msg: string, type?: 'info' | 'error' | 'success') => void }) {
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<ServiceCategory>('All categories');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // Form states with validation
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ServiceCategory>('General service');
  const [description, setDescription] = useState('');
  const [bondPledge, setBondPledge] = useState('100');
  const [failureCondition, setFailureCondition] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Agent name is required.';
    if (!description.trim()) errs.description = 'Service description is required.';
    else if (description.trim().length < 15) errs.description = 'Provide at least 15 characters describing service scope.';
    if (!bondPledge || isNaN(Number(bondPledge)) || Number(bondPledge) <= 0) {
      errs.bondPledge = 'Must pledge a valid positive BOT amount.';
    }
    if (!failureCondition.trim()) {
      errs.failureCondition = 'Explicit failure condition is required.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegisterSubmit = async () => {
    if (!validateForm()) {
      toast('Please correct the validation errors in the form.', 'error');
      return;
    }

    const res = await BlockchainService.registerAgent({
      name,
      category,
      description,
      collateralPledged: bondPledge,
      failureCondition,
      operatorAddress: '',
      slaWindowHours: 24,
    });

    if (res.success) {
      toast(res.message, 'success');
      setShowForm(false);
    } else {
      toast(res.message, 'error');
    }
  };

  const computedHash = name ? BlockchainService.generateAgentMetadataHash(name, category, description) : 'Generated on registration';

  return (
    <PageFrame
      eyebrow="On-chain directory"
      title={<>The agent<br /><em>registry.</em></>}
      subtitle="Discover autonomous services backed by accountable operators on BOT Chain Mainnet."
      action={
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="button button-outline" onClick={() => go('agent-details')}>
            View sample spec <ArrowUpRight size={16} />
          </button>
          <button className="button button-dark" onClick={() => setShowForm(!showForm)}>
            <Plus size={17} /> Register agent
          </button>
        </div>
      }
    >
      {showForm && (
        <div className="form-card">
          <div className="form-card-head">
            <div>
              <span className="muted-label">New registration · BOT Chain Mainnet</span>
              <h3>Register an agent</h3>
            </div>
            <button className="icon-button" onClick={() => setShowForm(false)} aria-label="Close form">
              <X size={18} />
            </button>
          </div>

          <div className="form-grid">
            <label>
              Agent name
              <input
                className={errors.name ? 'is-invalid' : ''}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                }}
                placeholder="e.g. Atlas Research Agent"
              />
              {errors.name && <span className="form-error"><CircleAlert size={12} /> {errors.name}</span>}
            </label>

            <label>
              Service category
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ServiceCategory)}
              >
                <option value="General service">General service</option>
                <option value="Data & research">Data & research</option>
                <option value="Execution">Execution</option>
                <option value="Monitoring">Monitoring</option>
              </select>
            </label>

            <label>
              Initial performance bond pledge (BOT)
              <input
                type="number"
                min="1"
                className={errors.bondPledge ? 'is-invalid' : ''}
                value={bondPledge}
                onChange={(e) => {
                  setBondPledge(e.target.value);
                  if (errors.bondPledge) setErrors((prev) => ({ ...prev, bondPledge: '' }));
                }}
                placeholder="100"
              />
              {errors.bondPledge && <span className="form-error"><CircleAlert size={12} /> {errors.bondPledge}</span>}
            </label>

            <label>
              Verifiable failure condition
              <input
                className={errors.failureCondition ? 'is-invalid' : ''}
                value={failureCondition}
                onChange={(e) => {
                  setFailureCondition(e.target.value);
                  if (errors.failureCondition) setErrors((prev) => ({ ...prev, failureCondition: '' }));
                }}
                placeholder="e.g. Failure to deliver response within 600s or schema mismatch"
              />
              {errors.failureCondition && <span className="form-error"><CircleAlert size={12} /> {errors.failureCondition}</span>}
            </label>

            <label className="full">
              Service description & commitments
              <textarea
                className={errors.description ? 'is-invalid' : ''}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (errors.description) setErrors((prev) => ({ ...prev, description: '' }));
                }}
                placeholder="What does this agent commit to delivering? What evidence establishes completed delivery?"
              />
              {errors.description && <span className="form-error"><CircleAlert size={12} /> {errors.description}</span>}
            </label>
          </div>

          <div className="metadata-preview">
            <span><Link2 size={15} /> Deterministic Metadata Hash</span>
            <code>{computedHash}</code>
          </div>

          <div className="form-actions">
            <button className="button button-outline" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button className="button button-orange" onClick={handleRegisterSubmit}>
              Continue to deposit <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="registry-toolbar">
        <span>0 agents registered on BOT Chain Mainnet</span>
        <div className="filter-wrapper">
          <button
            className="filter-button"
            onClick={() => setShowFilterMenu(!showFilterMenu)}
          >
            {filter} <ChevronDown size={15} />
          </button>
          {showFilterMenu && (
            <div className="filter-menu">
              {(['All categories', 'Data & research', 'Execution', 'Monitoring', 'General service'] as ServiceCategory[]).map((cat) => (
                <button
                  key={cat}
                  className={filter === cat ? 'is-selected' : ''}
                  onClick={() => {
                    setFilter(cat);
                    setShowFilterMenu(false);
                  }}
                >
                  <span>{cat}</span>
                  {filter === cat && <CheckCircle2 size={13} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <EmptyPanel
        icon={<Network />}
        title="The registry is waiting for its first agent"
        text="No agent records have been registered on BOT Chain Mainnet yet. Contract deployment is pending. Operators can preview specification blueprints or prepare registrations."
        action="Register an agent"
        onAction={() => setShowForm(true)}
      />
    </PageFrame>
  );
}

/* ==========================================================================
   PAGE: Agent Details (Connected Route)
   ========================================================================== */

function AgentDetailsPage({ go }: { go: (page: Page) => void }) {
  return (
    <PageFrame
      eyebrow="Agent Specification"
      title={<>Commitment<br /><em>architecture.</em></>}
      subtitle="Detailed view of agent performance terms, collateral locks, and settlement parameters."
      action={
        <button className="button button-dark" onClick={() => go('coverage-details')}>
          Inspect coverage policy <ArrowRight size={16} />
        </button>
      }
    >
      <button className="back-nav" onClick={() => go('agents')}>
        ← Back to Registry
      </button>

      <div className="integration-notice">
        <Info size={18} />
        <div>
          <strong>BOT Chain Integration Blueprint</strong>
          <p>
            This specification represents the immutable contract schema for registered agents on BOT Chain (Chain ID 677). When the core contract is deployed, live agent records will hydrate directly from this data structure.
          </p>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <span className="badge-tag badge-terra">Data & Research</span>
            <span className="badge-tag badge-green">Contract Deployment Ready</span>
          </div>

          <h3 style={{ fontSize: 26, margin: '0 0 10px' }}>Reference Agent Architecture</h3>
          <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, margin: '0 0 24px' }}>
            A sample deterministic agent specification illustrating collateral allocation, measurable failure triggers, and cryptographic verification protocol.
          </p>

          <h4 className="detail-section-title">Service Commitment Scope</h4>
          <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.7 }}>
            Commits to delivering indexed research datasets, structured financial query results, or autonomous task completion within agreed time thresholds.
          </p>

          <h4 className="detail-section-title" style={{ marginTop: 28 }}>Verifiable Failure Triggers</h4>
          <div className="workflow-steps">
            <div className="workflow-step">
              <span>TRIGGER 01</span>
              <h4>Missed Delivery Deadline</h4>
              <p>Failure to commit valid output hash on BOT Chain within the agreed block timestamp window.</p>
            </div>
            <div className="workflow-step">
              <span>TRIGGER 02</span>
              <h4>Schema Invalidation</h4>
              <p>Output payload does not conform to the pre-agreed JSON schema or signature requirement.</p>
            </div>
            <div className="workflow-step">
              <span>TRIGGER 03</span>
              <h4>Service Downtime</h4>
              <p>Target endpoint fails health checks for more than 3 consecutive epoch intervals.</p>
            </div>
          </div>
        </div>

        <div className="detail-aside">
          <span className="muted-label">Agent Metrics</span>
          <h3 style={{ fontSize: 20, margin: '6px 0 20px' }}>On-chain Parameters</h3>

          <div className="spec-list">
            <div className="spec-row">
              <span>Operator</span>
              <strong>Unset (Pending Mainnet)</strong>
            </div>
            <div className="spec-row">
              <span>Target Network</span>
              <strong>BOT Chain (677)</strong>
            </div>
            <div className="spec-row">
              <span>Performance Bond</span>
              <strong>100 BOT</strong>
            </div>
            <div className="spec-row">
              <span>Collateral Ratio</span>
              <strong>100% Locked</strong>
            </div>
            <div className="spec-row">
              <span>Claim Window</span>
              <strong>72 Hours</strong>
            </div>
            <div className="spec-row">
              <span>Arbitrator</span>
              <strong>Designated Bondat Pool</strong>
            </div>
          </div>

          <button
            className="button button-dark full-button"
            onClick={() => go('coverage-details')}
          >
            Review coverage terms <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </PageFrame>
  );
}

/* ==========================================================================
   PAGE: Coverage Marketplace
   ========================================================================== */

function MarketplacePage({ go, toast }: { go: (page: Page) => void; toast: (msg: string, type?: 'info' | 'error' | 'success') => void }) {
  const [amount, setAmount] = useState('50');
  const [deadline, setDeadline] = useState('');
  const [error, setError] = useState('');

  const numAmount = parseFloat(amount) || 0;
  const premium = (numAmount * (CONTRACT_CONFIG.standardPremiumRatePercent / 100)).toFixed(2);
  const protocolFee = (numAmount * (CONTRACT_CONFIG.protocolFeePercent / 100)).toFixed(2);
  const total = (parseFloat(premium) + parseFloat(protocolFee)).toFixed(2);

  const handlePurchase = async () => {
    if (numAmount <= 0) {
      setError('Please enter a valid coverage amount.');
      return;
    }
    setError('');

    const res = await BlockchainService.purchaseCoverage(1, numAmount, deadline);
    if (res.success) {
      toast(res.message, 'success');
    } else {
      toast(res.message, 'error');
    }
  };

  return (
    <PageFrame
      eyebrow="Protection marketplace"
      title={<>Choose certainty<br /><em>with intent.</em></>}
      subtitle="Purchase coverage for a defined service commitment on BOT Chain Mainnet."
      action={
        <button className="button button-outline" onClick={() => go('coverage-details')}>
          Policy details <ArrowUpRight size={16} />
        </button>
      }
    >
      <div className="marketplace-layout">
        <div className="market-empty">
          <div className="empty-illustration">
            <ShieldCheck size={34} />
          </div>
          <h3>No eligible agents yet</h3>
          <p>
            Agents with deposited collateral will appear here when ready to accept coverage. The protocol contract is live at {BlockchainService.shortenAddress(CONTRACT_CONFIG.address)} on BOT Chain Mainnet.
          </p>
          <div style={{ marginTop: 20 }}>
            <button className="button button-dark" onClick={() => go('coverage-details')}>
              View Policy Blueprint <ArrowRight size={16} />
            </button>
          </div>
        </div>

        <div className="coverage-form">
          <div className="muted-label">Coverage preview · BOT Chain Mainnet</div>
          <h3>Define your protection</h3>

          <label>
            Coverage amount (BOT)
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value.replace(/[^0-9.]/g, ''));
                if (error) setError('');
              }}
              placeholder="50"
            />
            {error && <span className="form-error"><CircleAlert size={12} /> {error}</span>}
          </label>

          <label>
            Commitment Category
            <select>
              <option>Missed delivery deadline</option>
              <option>Invalid output / Schema mismatch</option>
              <option>Service downtime</option>
            </select>
          </label>

          <label>
            Delivery deadline
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </label>

          <div className="fee-line">
            <span>
              Premium ({CONTRACT_CONFIG.standardPremiumRatePercent}%): <b>{premium} BOT</b>
            </span>
            <span>
              Protocol fee ({CONTRACT_CONFIG.protocolFeePercent}%): <b>{protocolFee} BOT</b>
            </span>
            <span className="fee-total">
              Total required: <b>{total} BOT</b>
            </span>
          </div>

          <button className="button button-dark full-button" onClick={handlePurchase}>
            Purchase coverage <ArrowRight size={17} />
          </button>
        </div>
      </div>
    </PageFrame>
  );
}

/* ==========================================================================
   PAGE: Coverage Details (Connected Route)
   ========================================================================== */

function CoverageDetailsPage({ go }: { go: (page: Page) => void }) {
  return (
    <PageFrame
      eyebrow="Policy Terms & Mechanics"
      title={<>Coverage<br /><em>specifications.</em></>}
      subtitle="How collateral backing, failure condition triggers, and claim settlements function."
      action={
        <button className="button button-dark" onClick={() => go('marketplace')}>
          Configure coverage <ArrowRight size={16} />
        </button>
      }
    >
      <button className="back-nav" onClick={() => go('marketplace')}>
        ← Back to Marketplace
      </button>

      <div className="integration-notice">
        <Info size={18} />
        <div>
          <strong>BOT Chain Policy Architecture</strong>
          <p>
            Coverage policies are cryptographically anchored smart contracts. Once deployed on BOT Chain (Chain ID 677), underwriting is 100% collateralized by the operator's locked performance bond.
          </p>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-card">
          <span className="badge-tag badge-terra">Standard Protection Policy</span>
          <h3 style={{ fontSize: 24, margin: '14px 0 10px' }}>Policy Mechanics & Settlement</h3>
          <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, margin: '0 0 24px' }}>
            Bondat policies protect buyers of AI agent services by locking an equivalent operator performance bond for the entire duration of the service window.
          </p>

          <h4 className="detail-section-title">Lifecycle & Settlement Flow</h4>
          <div className="workflow-steps">
            <div className="workflow-step">
              <span>STEP 01</span>
              <h4>Policy Underwriting</h4>
              <p>Customer deposits premium + 1.5% protocol fee. Bondat locks an equivalent amount of the operator's BOT collateral.</p>
            </div>
            <div className="workflow-step">
              <span>STEP 02</span>
              <h4>Execution Period</h4>
              <p>The agent performs work under the specified deadline and delivery parameters.</p>
            </div>
            <div className="workflow-step">
              <span>STEP 03</span>
              <h4>Settlement or Claim</h4>
              <p>If successful, collateral is unlocked. In event of failure, customer submits evidence hash during the 72-hour claim window.</p>
            </div>
          </div>
        </div>

        <div className="detail-aside">
          <span className="muted-label">Policy Specifications</span>
          <h3 style={{ fontSize: 20, margin: '6px 0 20px' }}>Coverage Parameters</h3>

          <div className="spec-list">
            <div className="spec-row">
              <span>Collateral Backing</span>
              <strong>1:1 (100% of cover)</strong>
            </div>
            <div className="spec-row">
              <span>Protocol Fee</span>
              <strong>{CONTRACT_CONFIG.protocolFeePercent}%</strong>
            </div>
            <div className="spec-row">
              <span>Claim Window</span>
              <strong>72 Hours post-deadline</strong>
            </div>
            <div className="spec-row">
              <span>Evidence Storage</span>
              <strong>Cryptographic Hash</strong>
            </div>
            <div className="spec-row">
              <span>Network</span>
              <strong>BOT Chain Mainnet</strong>
            </div>
          </div>

          <button
            className="button button-dark full-button"
            onClick={() => go('marketplace')}
          >
            Go to marketplace <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </PageFrame>
  );
}

/* ==========================================================================
   PAGE: Claims Center
   ========================================================================== */

function ClaimsPage({ go, toast }: { go: (page: Page) => void; toast: (msg: string, type?: 'info' | 'error' | 'success') => void }) {
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [policyId, setPolicyId] = useState('');
  const [evidenceHash, setEvidenceHash] = useState('');
  const [summary, setSummary] = useState('');
  const [claimErrors, setClaimErrors] = useState<Record<string, string>>({});

  const validateClaim = () => {
    const errs: Record<string, string> = {};
    if (!policyId.trim()) errs.policyId = 'Policy ID or Reference is required.';
    if (!evidenceHash.trim()) errs.evidenceHash = 'Evidence hash (0x...) is required.';
    if (!summary.trim()) errs.summary = 'Incident description is required.';
    setClaimErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmitClaim = async () => {
    if (!validateClaim()) {
      toast('Please complete all required fields.', 'error');
      return;
    }

    const res = await BlockchainService.submitClaim({
      policyId,
      agentName: 'Target Agent',
      failureReason: 'Missed delivery',
      evidenceHash,
      summary,
      claimAmountBot: '0',
    });

    if (res.success) {
      toast(res.message, 'success');
      setShowClaimForm(false);
    } else {
      toast(res.message, 'error');
    }
  };

  return (
    <PageFrame
      eyebrow="Resolution layer"
      title={<>Claims,<br /><em>made clear.</em></>}
      subtitle="Track evidence, outcomes, and payouts across every protected commitment on BOT Chain."
      action={
        <button className="button button-dark" onClick={() => setShowClaimForm(!showClaimForm)}>
          <Plus size={16} /> File a claim
        </button>
      }
    >
      <div className="claims-summary">
        <div>
          <span className="muted-label">Open claims</span>
          <strong>0</strong>
        </div>
        <div>
          <span className="muted-label">Resolved claims</span>
          <strong>0</strong>
        </div>
        <div>
          <span className="muted-label">Total payouts</span>
          <strong>0 BOT</strong>
        </div>
      </div>

      {showClaimForm && (
        <div className="form-card" style={{ marginBottom: 30 }}>
          <div className="form-card-head">
            <div>
              <span className="muted-label">Resolution Layer · Claim Filing</span>
              <h3>File a service failure claim</h3>
            </div>
            <button className="icon-button" onClick={() => setShowClaimForm(false)} aria-label="Close form">
              <X size={18} />
            </button>
          </div>

          <div className="form-grid">
            <label>
              Policy ID or Reference
              <input
                className={claimErrors.policyId ? 'is-invalid' : ''}
                value={policyId}
                onChange={(e) => {
                  setPolicyId(e.target.value);
                  if (claimErrors.policyId) setClaimErrors((prev) => ({ ...prev, policyId: '' }));
                }}
                placeholder="e.g. 0xpolicy-ref-001"
              />
              {claimErrors.policyId && <span className="form-error"><CircleAlert size={12} /> {claimErrors.policyId}</span>}
            </label>

            <label>
              Failure type
              <select>
                <option>Missed delivery</option>
                <option>Invalid output</option>
                <option>Service downtime</option>
              </select>
            </label>

            <label className="full">
              Evidence hash (SHA-256 or Calldata root)
              <input
                className={claimErrors.evidenceHash ? 'is-invalid' : ''}
                value={evidenceHash}
                onChange={(e) => {
                  setEvidenceHash(e.target.value);
                  if (claimErrors.evidenceHash) setClaimErrors((prev) => ({ ...prev, evidenceHash: '' }));
                }}
                placeholder="0x..."
              />
              {claimErrors.evidenceHash && <span className="form-error"><CircleAlert size={12} /> {claimErrors.evidenceHash}</span>}
            </label>

            <label className="full">
              Incident summary
              <textarea
                className={claimErrors.summary ? 'is-invalid' : ''}
                value={summary}
                onChange={(e) => {
                  setSummary(e.target.value);
                  if (claimErrors.summary) setClaimErrors((prev) => ({ ...prev, summary: '' }));
                }}
                placeholder="Describe the failure, delivery cutoff time, and logs demonstrating breach of commitment."
              />
              {claimErrors.summary && <span className="form-error"><CircleAlert size={12} /> {claimErrors.summary}</span>}
            </label>
          </div>

          <div className="form-actions">
            <button className="button button-outline" onClick={() => setShowClaimForm(false)}>
              Cancel
            </button>
            <button className="button button-orange" onClick={handleSubmitClaim}>
              Submit for verification <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      <EmptyPanel
        icon={<FileCheck2 />}
        title="No claims submitted"
        text="Submitted claims and their cryptographic evidence hashes will appear here. A claim can only be opened against an active policy on BOT Chain Mainnet."
        action="View marketplace"
        onAction={() => go('marketplace')}
      />
    </PageFrame>
  );
}

/* ==========================================================================
   PAGE: Documentation
   ========================================================================== */

function DocsPage() {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const DOCS = [
    { id: 'doc-0', num: '01', title: 'What Bondat does', content: 'Bondat connects an AI agent operator’s collateral to a customer’s service expectation. When an operator defines a commitment and deposits BOT on BOT Chain Mainnet, customers can purchase protection against specific, verifiable service failures.' },
    { id: 'doc-1', num: '02', title: 'How collateral works', content: 'Collateral is a performance bond locked on BOT Chain. It is dedicated to an agent’s active commitments and can be released when the service resolves successfully. Available, unencumbered collateral can be withdrawn by the operator at any time.' },
    { id: 'doc-2', num: '03', title: 'How coverage works', content: 'Customers choose an eligible agent, define the commitment they want protected, select an amount in BOT, and pay a standard premium (5%) plus protocol fee (1.5%). The on-chain policy records the service scope, delivery deadline, claim window, and coverage amount.' },
    { id: 'doc-3', num: '04', title: 'How claims work', content: 'If a protected service fails, the customer submits evidence during the 72-hour claim window. Evidence is represented by a cryptographic hash, keeping the protocol verifiable without requiring proprietary customer service data to be exposed on-chain.' },
    { id: 'doc-4', num: '05', title: 'Protocol fees', content: 'Fees are displayed before a policy is purchased (standard protocol fee: 1.5%). All fees are denominated in BOT on BOT Chain. The final fee schedule will be anchored to the verified smart contract deployment.' },
    { id: 'doc-5', num: '06', title: 'Risks & limitations', content: 'Coverage is not a guarantee that every real-world dispute can be objectively assessed. Customers should understand the commitment definition, evidence requirements, claim window, smart contract risk, and BOT Chain network dynamics before purchasing.' },
    { id: 'doc-6', num: '07', title: 'The arbitrator', content: 'When a claim requires review, the designated arbitrator evaluates the commitment and submitted evidence under the policy’s deterministic rules. The arbitrator cannot alter the original coverage terms or modify locked collateral.' },
    { id: 'doc-7', num: '08', title: 'BOT Chain Mainnet verification', content: `BondatCore is deployed on BOT Chain Mainnet (Chain ID 677, RPC: ${BOT_CHAIN_MAINNET.rpcUrl}). Official verified contract address: ${CONTRACT_CONFIG.address}. Verified deployment transaction: ${CONTRACT_CONFIG.deploymentTxHash} at block ${CONTRACT_CONFIG.blockNumber}.` },
  ];

  return (
    <PageFrame
      eyebrow="Protocol reference"
      title={<>The Bondat<br /><em>handbook.</em></>}
      subtitle="A plain-language guide to collateral-backed protection for autonomous services."
    >
      <div className="docs-layout">
        <aside className="docs-nav">
          <span>Contents</span>
          {DOCS.map((doc) => (
            <button
              key={doc.id}
              onClick={() => scrollTo(doc.id)}
              style={{ textAlign: 'left', background: 'none', border: 'none', padding: 0 }}
            >
              <a href={`#${doc.id}`} onClick={(e) => { e.preventDefault(); scrollTo(doc.id); }}>
                {doc.num} {doc.title}
              </a>
            </button>
          ))}
        </aside>

        <article className="docs-article">
          {DOCS.map((doc) => (
            <DocSection key={doc.id} id={doc.id} number={doc.num} title={doc.title}>
              {doc.content}
            </DocSection>
          ))}
        </article>
      </div>
    </PageFrame>
  );
}

/* ==========================================================================
   SHARED UI PRIMITIVES
   ========================================================================== */

function PageFrame({
  eyebrow,
  title,
  subtitle,
  children,
  action,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="page-frame section-pad">
      <div className="page-title-row">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" /> {eyebrow}
          </div>
          <h1>{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyPanel({
  icon,
  title,
  text,
  action,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  action: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty-panel">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
      <button className="text-button" onClick={onAction}>
        {action} <ArrowRight size={16} />
      </button>
    </div>
  );
}

function DocSection({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="doc-section" id={id}>
      <span>{number}</span>
      <div>
        <h2>{title}</h2>
        <p>{children}</p>
      </div>
    </section>
  );
}
