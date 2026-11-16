import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BriefcaseBusiness,
  Ruler,
  MessageSquareText,
  Settings,
  LogOut,
  Plus
} from 'lucide-react';

import { supabase, configured } from './supabase';

const DUMMY_PROJECTS: any[] = [
  {
    id: 'p-1001',
    title: 'Vintage Bungalow, Alankar',
    slug: 'vintage-bungalow-alankar',
    category: 'Residential',
    location: 'Nampally, Hyderabad',
    description:
      'Restored 1940s bungalow with high ceilings, teak-jali ventilation and a colonnade courtyard. Delivered as a slow-living home with preserved heritage details and updated plumbing.',
    cover_image: ''
  },
  {
    id: 'p-1002',
    title: 'Koti Corporate Office Wing',
    slug: 'koti-corporate-office-wing',
    category: 'Commercial',
    location: 'Koti, Hyderabad',
    description:
      'A two-floor corporate extension for a mid-size professional services practice, planned around daylight, breakout zones and a central circulation spine.',
    cover_image: ''
  },
  {
    id: 'p-1003',
    title: 'Gachibowli Apartment Renovation',
    slug: 'gachibowli-apartment-renovation',
    category: 'Interior',
    location: 'Gachibowli, Hyderabad',
    description:
      'Complete interior renovation of a 3-bedroom apartment: furniture revamp, accent wall, open kitchen, and a planned rooftop lounge for the owner family.',
    cover_image: ''
  }
];

export const LOGIN_EMAIL = 'admin@smengineers.com';
export const LOGIN_PASSWORD = 'smengineers2026';

interface ProjectForm {
  title: string;
  slug: string;
  category: string;
  location: string;
  description: string;
  cover_image: string;
  is_published: boolean;
}

interface ServiceRow {
  id: string;
  title: string;
  slug: string;
  is_published: boolean;
}

interface EnquiryRow {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  service_name: string;
  status: string;
  created_at: string;
}

function AdminDashboard() {
  const loc = useLocation();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Overview');
  const [projects, setProjects] = useState<any[]>(DUMMY_PROJECTS);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [enquiries, setEnquiries] = useState<EnquiryRow[]>([]);
  const [msg, setMsg] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Keep a lightweight session in localStorage so logout is deterministic
  // even when there is no Supabase backend. Write on login, read on mount.
  useEffect(() => {
    const stored = localStorage.getItem('admin_session');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { email: string };
        if (parsed.email) setSession({ user: { email: parsed.email } });
      } catch {
        /* ignore malformed storage */
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (session?.user?.email) {
      localStorage.setItem('admin_session', JSON.stringify({ email: session.user.email }));
    } else {
      localStorage.removeItem('admin_session');
    }
  }, [session]);

  const clearMsg = () => setMsg('');
  const clearLoginError = () => setLoginError('');

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearMsg();
    setLoginError('');

    const d = new FormData(e.currentTarget);
    const email = String(d.get('email') || '').trim();
    const password = String(d.get('password') || '');

    if (!email || !password) {
      setLoginError('Both email and password are required.');
      return;
    }

    if (email === LOGIN_EMAIL && password === LOGIN_PASSWORD) {
      setSession({ user: { email } });
      setMsg('Signed in. The dummy workspace is ready.');
    } else {
      setLoginError('Incorrect email or password. Use admin@smengineers.com / smengineers2026.');
    }
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem('admin_session');
    setMsg('Signed out.');
    clearLoginError();
    // Reset to the dummy data view so the workspace is re-readable.
    setProjects(DUMMY_PROJECTS);
  };

  const saveProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearMsg();
    const d = new FormData(e.currentTarget);
    const values: ProjectForm = {
      title: String(d.get('title')),
      slug: String(d.get('slug')),
      category: String(d.get('category')),
      location: String(d.get('location')) || '',
      description: String(d.get('description')),
      cover_image: String(d.get('cover_image')) || '',
      is_published: d.get('is_published') === 'on'
    };
    if (configured) {
      const { error } = await supabase!.from('projects').insert(values);
      if (error) {
        setMsg(error.message);
        return;
      }
      setMsg('Project saved.');
    } else {
      setProjects(prev => [values, ...prev]);
      setMsg('Project saved (dummy data, this device only).');
    }
  };

  const updateProject = async (id: string, patch: Partial<ProjectForm>) => {
    if (configured) {
      const { error } = await supabase!.from('projects').update(patch).eq('id', id);
      if (error) setMsg(error.message);
      else setMsg('Project updated.');
    }
  };

  const deleteProject = async (id: string) => {
    if (!confirm('Delete this project? This cannot be undone.')) return;
    if (configured) {
      const { error } = await supabase!.from('projects').delete().eq('id', id);
      if (error) setMsg(error.message);
      else setMsg('Project deleted.');
    } else {
      setProjects(prev => prev.filter(p => p.id !== id));
      setMsg('Project deleted (dummy data).');
    }
  };

  const searchQuery = (() => {
    const el = document.activeElement as HTMLInputElement | null;
    return el?.value || '';
  })();

  const filteredProjects = projects.filter(p => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return `${p.title} ${p.slug} ${p.category} ${p.location}`.toLowerCase().includes(q);
  });

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <Link to="/" className="brand light">
          <img className="brand-logo" src="/assets/sm-engineers-brand-identity.png" alt="S.M. Engineers & Architects" />
        </Link>
        <div className="admin-label">WORKSPACE</div>
        {[
          ['Overview', LayoutDashboard],
          ['Projects', BriefcaseBusiness],
          ['Services', Ruler],
          ['Enquiries', MessageSquareText],
          ['Settings', Settings]
        ].map(([n, I]) => (
          <button key={n} className={tab === n ? 'selected' : ''} onClick={() => setTab(n)}>
            <I size={17} />
            {n}
          </button>
        ))}
        <button onClick={handleLogout} className="signout">
          <LogOut size={17} />
          Sign out
        </button>
      </aside>

      <main className="admin-main">
        {!session?.user?.email ? (
          <div className="admin-auth">
            <div className="admin-auth-card">
              <div className="admin-auth-logo">
                <img src="/assets/sm-engineers-brand-identity.png" alt="S.M. Engineers & Architects" />
              </div>
              <h1 className="admin-auth-title">Administrator sign in</h1>
              <p className="admin-auth-sub">Use the credentials below to open the workspace. No backend is deployed, so sign-in checks against a local dummy account.</p>
              <form className="admin-auth-form" onSubmit={handleLogin} noValidate>
                <div className="field-row">
                  <label>Email address<input type="email" name="email" required placeholder="admin@smengineers.com" /></label>
                </div>
                <div className="field-row">
                  <label>Password<input type="password" name="password" required placeholder="••••••••" /></label>
                </div>
                {loginError && <p className="admin-message error">{loginError}</p>}
                {msg && !loginError && <p className="admin-message">{msg}</p>}
                <button className="button orange" type="submit">
                  Sign in
                </button>
              </form>
              <p className="admin-auth-hint">Demo account: admin@smengineers.com / smengineers2026</p>
            </div>
          </div>
        ) : (
          <>
            <header className="admin-top">
              <span>ADMINISTRATION / {tab.toUpperCase()}</span>
              <span>
                {session.user.email}
                <button onClick={handleLogout}>
                  <LogOut size={16} />
                </button>
              </span>
            </header>
            <section className="admin-content">
              {tab === 'Projects' && (
                <>
                  <div className="admin-title">
                    <div>
                      <div className="eyebrow dark">CONTENT MANAGEMENT</div>
                      <h2>Projects</h2>
                    </div>
                    <button className="button orange" onClick={() => {
                      const form = document.getElementById('project-form') as HTMLFormElement | null;
                      if (form) form.classList.toggle('hidden');
                    }}>
                      <Plus size={16} /> Add project
                    </button>
                  </div>
                  {msg && <p className="admin-message">{msg}</p>}
                  <form id="project-form" className="admin-form" onSubmit={saveProject}>
                    <div className="field-row">
                      <label>Project title *<input required name="title" /></label>
                      <label>URL slug *<input required name="slug" pattern="[a-z0-9-]+" /></label>
                    </div>
                    <div className="field-row">
                      <label>Category<select name="category">
                        {['Residential', 'Commercial', 'Interior', 'Landscape', 'Other'].map(x => <option key={x}>{x}</option>)}
                      </select></label>
                      <label>Location<input name="location" /></label>
                    </div>
                    <label>Description *<textarea name="description" required rows={3} /></label>
                    <label>Cover image URL<input name="cover_image" type="url" /></label>
                    <label className="consent">
                      <input type="checkbox" name="is_published" />
                      <span>Publish project</span>
                    </label>
                    <button className="button orange">Save project</button>
                  </form>
                  <div className="admin-title">
                    <div>
                      <div className="eyebrow dark">DUMMY PROJECTS</div>
                      <p className="quiet">No backend is configured, so these records are seeded in memory. Add, edit or remove them here without a backend.</p>
                    </div>
                  </div>
                  <div className="admin-table">
                    <div className="table-head">
                      <span>PROJECT</span>
                      <span>CATEGORY</span>
                      <span>LOCATION</span>
                      <span>STATUS</span>
                      <span>ACTIONS</span>
                    </div>
                    {filteredProjects.map(p => (
                      <div className="table-row" key={p.id}>
                        <b>{p.title}<small>{p.category}</small></b>
                        <span>{p.location || '—'}</span>
                        <span>{p.is_published ? 'Published' : 'Draft'}</span>
                        <span>
                          <button
                            className="danger-text"
                            onClick={() => deleteProject(p.id)}
                          >
                            Delete
                          </button>
                        </span>
                      </div>
                    ))}
                    {!filteredProjects.length && <p className="table-empty">No projects yet.</p>}
                  </div>
                </>
              )}
              {tab === 'Services' && (
                <>
                  <div className="admin-title">
                    <div>
                      <div className="eyebrow dark">CONTENT MANAGEMENT</div>
                      <h2>Services</h2>
                    </div>
                  </div>
                  <div className="admin-table">
                    <div className="table-head">
                      <span>SERVICE</span>
                      <span>SLUG</span>
                      <span>PUBLIC STATUS</span>
                    </div>
                    {services.map(s => (
                      <div className="table-row" key={s.id}>
                        <b>{s.title}</b>
                        <span>{s.slug}</span>
                        <span>{s.is_published ? 'Published' : 'Hidden'}</span>
                      </div>
                    ))}
                    <p className="table-empty">Service records can be updated in Supabase. The public pages include the source service descriptions; service editing interface is not enabled.</p>
                  </div>
                </>
              )}
              {tab === 'Enquiries' && (
                <>
                  <div className="admin-title">
                    <div>
                      <div className="eyebrow dark">CUSTOMER ENQUIRIES</div>
                      <h2>Enquiries</h2>
                    </div>
                  </div>
                  <div className="admin-table enquiry-table">
                    <div className="table-head enquiry-cols">
                      <span>ENQUIRY</span>
                      <span>SERVICE</span>
                      <span>RECEIVED</span>
                      <span>STATUS</span>
                    </div>
                    {enquiries.map(r => (
                      <div className="table-row enquiry-cols" key={r.id}>
                        <b>{r.full_name}<small>{r.phone} · {r.email}</small></b>
                        <span>{r.service_name || 'General'}</span>
                        <span>{new Date(r.created_at).toLocaleDateString('en-IN')}</span>
                        <span>
                          <select value={r.status} onChange={e => {
                            const { error } = supabase!.from('enquiries').update({ status: e.target.value }).eq('id', r.id);
                            if (error) setMsg(error.message);
                            else setMsg('Enquiry status updated.');
                          }}>
                            {['New', 'Contacted', 'Consultation Scheduled', 'In Progress', 'Converted', 'Closed'].map(s => <option key={s}>{s}</option>)}
                          </select>
                        </span>
                      </div>
                    ))}
                    {!enquiries.length && <p className="table-empty">No enquiries yet.</p>}
                  </div>
                </>
              )}
              {tab === 'Overview' && (
                <>
                  <div className="admin-title">
                    <div>
                      <div className="eyebrow dark">OVERVIEW</div>
                      <h2>Workspace</h2>
                      <p className="quiet">Counts reflect records returned by the database under your administrator account. Without a backend, dummy projects are shown.</p>
                    </div>
                  </div>
                  <div className="metric-grid">
                    {[
                      ['Projects', projects.length],
                      ['Services', services.length],
                      ['Enquiries', enquiries.length]
                    ].map(([a, b]) => (
                      <div key={a}>
                        <span>{a}</span>
                        <b>{b}</b>
                      </div>
                    ))}
                  </div>
                  <div className="admin-title">
                    <div>
                      <div className="eyebrow dark">NOTES</div>
                      <p>
                        Project records are stored in memory until a Supabase project URL and anon key are configured. Once configured, the dashboard reads and writes the shared projects table.
                      </p>
                    </div>
                  </div>
                </>
              )}
              {tab === 'Settings' && (
                <>
                  <div className="admin-title">
                    <div>
                      <div className="eyebrow dark">ACCOUNT</div>
                      <h2>Settings</h2>
                    </div>
                  </div>
                  <div className="settings-info">
                    <h3>Company contact settings</h3>
                    <p>Public contact details are currently sourced from the application configuration: 9866608135 · smengineers@gmail.com · D.No. 11/2/8/2, Road No. 6, Venkateswara Colony, Saroornagar, Hyderabad – 500035</p>
                    <p>To change public contact details, update <code>src/site.tsx</code> and deploy. Editable settings require a configured settings record and editing interface.</p>
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;
