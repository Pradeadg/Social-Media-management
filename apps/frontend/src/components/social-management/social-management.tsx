'use client';

import { useCallback, useEffect, useRef, useState, ReactNode } from 'react';
import Link from 'next/link';
import { skillCategories } from '@gitroom/helpers/social-management/skill-categories';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import styles from './social-management.module.css';

type Row = {
  id: string;
  kind: string;
  title: string;
  status: string;
  revision: number;
  data: any;
  createdAt: string;
};
type Tab =
  | 'overview'
  | 'brand'
  | 'agent'
  | 'research'
  | 'content'
  | 'inbox'
  | 'metrics'
  | 'automation'
  | 'skills'
  | 'settings';
const sections: [Tab, string][] = [
  ['overview', 'Ringkasan'],
  ['brand', 'Profil brand'],
  ['agent', 'Agent workspace'],
  ['research', 'Riset & sumber'],
  ['content', 'Rencana konten'],
  ['inbox', 'Inbox & chatbot'],
  ['metrics', 'Analisis'],
  ['automation', 'Rutinitas'],
  ['skills', 'Pustaka skill'],
  ['settings', 'Pengaturan'],
];
const workflowNames: Record<string, string> = {
  strategy: 'Strategi brand',
  campaign: 'Kampanye & kalender',
  content: 'Pembuatan konten',
  research: 'Riset & ide',
  report: 'Laporan kinerja',
};
const statuses: Record<string, string> = {
  ready: 'Tersimpan',
  queued: 'Menunggu',
  running: 'Berjalan',
  completed: 'Selesai',
  failed: 'Perlu diperiksa',
  cancelled: 'Dihentikan',
  draft: 'Draft',
  approved: 'Disetujui',
  exported: 'Di kalender Postiz',
  exporting: 'Periksa kalender',
  handoff: 'Perlu pemilik',
  active: 'Aktif',
  paused: 'Dijeda',
  processing: 'Menyusun balasan',
  sending: 'Mengirim',
  sent: 'Terkirim',
  'delivery-unknown': 'Periksa inbox asli',
};
const brandLabels: Record<string, string> = {
  name: 'Nama brand',
  description: 'Tentang brand',
  audience: 'Audiens utama',
  voice: 'Gaya bahasa',
  goals: 'Tujuan media sosial',
  offers: 'Layanan, harga, dan ketentuan',
  boundaries: 'Batasan dan klaim yang dilarang',
  faq: 'FAQ / pengetahuan layanan',
  timezone: 'Zona waktu',
  platforms: 'Platform',
  sourceUrls: 'URL sumber brand',
};
const blankSkill = {
  name: '',
  description: '',
  category: 'strategy',
  instructions: '',
};
const emptyContent = {
  title: '',
  platform: 'instagram',
  format: 'caption',
  caption: '',
  mediaBrief: '',
  plannedDate: '',
  approved: false,
};
function Icon({ type = 'grid' }: { type?: string }) {
  const paths: Record<string, ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </>
    ),
    spark: (
      <>
        <path d="m12 3 2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6Z" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    chat: <path d="M21 11a8 8 0 0 1-8 8H6l-4 3V11a9 9 0 0 1 19 0Z" />,
  };
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[type] || paths.grid}
    </svg>
  );
}
function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
function Badge({ status }: { status: string }) {
  return (
    <span
      className={`${styles.badge} ${
        ['active', 'completed', 'sent', 'exported', 'ready'].includes(status)
          ? styles.good
          : ['failed', 'handoff', 'delivery-unknown'].includes(status)
          ? styles.warn
          : ''
      }`}
    >
      {statuses[status] || status}
    </span>
  );
}
function Empty({ title, description }: { title: string; description: string }) {
  return (
    <div className={styles.empty}>
      <Icon type="spark" />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
function Card({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}) {
  return (
    <section className={styles.card}>
      {title && (
        <header className={styles.cardHead}>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </header>
      )}
      {children}
    </section>
  );
}
function Modal({
  label,
  onClose,
  children,
}: {
  label: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={styles.modal}
      aria-label={label}
      onCancel={onClose}
    >
      {children}
    </dialog>
  );
}

export function SocialManagement() {
  const fetcher = useFetch();
  const initialized = useRef(false);
  const [tab, setTab] = useState<Tab>('overview'),
    [state, setState] = useState<any>(null),
    [workspace, setWorkspace] = useState<any>(null),
    [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [workflow, setWorkflow] = useState('strategy'),
    [brief, setBrief] = useState(''),
    [chosenSkills, setChosenSkills] = useState<string[]>([]),
    [selectedRun, setSelectedRun] = useState('');
  const [source, setSource] = useState({
    title: '',
    type: 'url',
    url: '',
    text: '',
    knowledge: false,
  });
  const [draft, setDraft] = useState({ ...emptyContent }),
    [editing, setEditing] = useState<Row | null>(null),
    [exportChannel, setExportChannel] = useState<Record<string, string>>({});
  const [customerText, setCustomerText] = useState(''),
    [replyEdits, setReplyEdits] = useState<Record<string, string>>({}),
    [confirmMessage, setConfirmMessage] = useState<Row | null>(null);
  const [metric, setMetric] = useState<any>({
    title: '',
    platform: 'instagram',
    date: new Date().toISOString().slice(0, 10),
    source: '',
    reach: '',
    likes: '',
    comments: '',
    shares: '',
    saves: '',
  });
  const [automation, setAutomation] = useState({
    name: '',
    workflow: 'content',
    brief: '',
    intervalHours: 168,
    enabled: false,
  });
  const [skillPicker, setSkillPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerCategory, setPickerCategory] = useState('all');
  const [skillCategory, setSkillCategory] = useState('all');
  const [creatingSkill, setCreatingSkill] = useState(false);
  const [customSkill, setCustomSkill] = useState({ ...blankSkill });
  const [importPreview, setImportPreview] = useState<any>(null);
  const [importFields, setImportFields] = useState<string[]>([]);
  const [researchFocus, setResearchFocus] = useState('');
  const [search, setSearch] = useState(''),
    [skillText, setSkillText] = useState<any>(null),
    [autoConfirmed, setAutoConfirmed] = useState(false);
  const api = useCallback(
    async (path: string, method = 'GET', body?: unknown) => {
      const response = await fetcher('/social-management' + path, {
        method,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      const result = await response
        .json()
        .catch(() => ({ message: 'Respons server tidak dapat dibaca.' }));
      if (!response.ok)
        throw new Error(
          Array.isArray(result.message)
            ? result.message.join(', ')
            : result.message || `Permintaan gagal (${response.status}).`
        );
      return result;
    },
    [fetcher]
  );
  const load = useCallback(async () => {
    const data = await api('');
    setState(data);
    if (!initialized.current) {
      setWorkspace(data.workspace.data);
      setRevision(data.workspace.revision);
      initialized.current = true;
    }
  }, [api]);
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, [load]);
  useEffect(() => {
    const t = setInterval(() => {
      void load().catch(() => {});
    }, 10000);
    return () => clearInterval(t);
  }, [load]);
  async function act(action: () => Promise<any>, message = 'Tersimpan.') {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      await load();
      setNotice(message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Permintaan gagal.');
    } finally {
      setBusy(false);
    }
  }
  async function saveWorkspace() {
    await act(async () => {
      const saved = await api('/workspace', 'PUT', {
        data: {
          ...workspace,
          brand: {
            ...workspace.brand,
            sourceUrls: (workspace.brand.sourceUrls || [])
              .map((u: string) => u.trim())
              .filter(Boolean),
          },
        },
        revision,
        confirmAutoReplies: autoConfirmed,
      });
      setWorkspace(saved.data);
      setRevision(saved.revision);
      setAutoConfirmed(false);
    });
  }
  const filteredSkills = (query: string, category: string) =>
    (state?.skills || []).filter(
      (s: any) =>
        (category === 'all' || s.category === category) &&
        (s.id + ' ' + s.name + ' ' + s.description)
          .toLowerCase()
          .includes(query.trim().toLowerCase())
    );
  const toggleSkill = (id: string) =>
    setChosenSkills((chosen) =>
      chosen.includes(id)
        ? chosen.filter((v) => v !== id)
        : chosen.length < 6
        ? [...chosen, id]
        : chosen
    );
  const categoryOptions = (
    <>
      <option value="all">Semua kemampuan</option>
      {Object.entries(skillCategories).map(([id, label]) => (
        <option key={id} value={id}>
          {label}
        </option>
      ))}
    </>
  );
  const brandDirty =
    !!workspace &&
    JSON.stringify(workspace.brand) !==
      JSON.stringify(state?.workspace.data.brand);
  async function importBrandFile(file?: File) {
    if (!file) return;
    await act(async () => {
      if (file.size > 60000) throw new Error('Ukuran file maksimal 60 KB.');
      const preview = await api('/brand/import-preview', 'POST', {
        filename: file.name,
        text: await file.text(),
      });
      setImportFields(preview.fields);
      setImportPreview({ ...preview, filename: file.name });
    }, 'Pratinjau import siap. Profil belum diubah.');
  }
  function downloadBrandTemplate() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            name: 'Pradea',
            description: 'Jasa desain visual untuk bisnis.',
            audience: 'Pemilik usaha',
            voice: 'Ramah dan jelas',
            goals: 'Meningkatkan permintaan jasa',
            offers: 'Isi layanan dan harga resmi',
            boundaries: 'Jangan mengarang klaim',
            faq: 'Pertanyaan: Apa layanan yang tersedia?\nJawaban: Desain visual.',
            timezone: 'Asia/Jakarta',
            platforms: ['instagram', 'facebook', 'tiktok'],
            sourceUrls: [],
          },
          null,
          2
        ),
      ],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob),
      link = document.createElement('a');
    link.href = url;
    link.download = 'template-profil-brand.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const records: Row[] = state?.records || [];
  const rows = (kind: string) => records.filter((r) => r.kind === kind);
  const runs = rows('run'),
    contents = rows('content'),
    messages = rows('message'),
    sources = rows('source');
  const currentRun = runs.find((r) => r.id === selectedRun) || runs[0];
  const modelReady =
    state?.llm.online &&
    state.llm.models.includes(state.workspace.data.settings.model);
  const working = runs.filter((r) => ['queued', 'running'].includes(r.status));
  const date = (value: string) =>
    new Date(value).toLocaleString('id-ID', {
      timeZone: workspace?.brand.timezone || 'Asia/Jakarta',
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  const updateBrand = (key: string, value: any) =>
    setWorkspace({ ...workspace, brand: { ...workspace.brand, [key]: value } });
  const updateSettings = (key: string, value: any) =>
    setWorkspace({
      ...workspace,
      settings: { ...workspace.settings, [key]: value },
    });
  const textArea = (key: string, label: string, hint?: string) => (
    <Field key={key} label={label} hint={hint}>
      <textarea
        rows={3}
        value={workspace.brand[key]}
        onChange={(e) => updateBrand(key, e.target.value)}
      />
    </Field>
  );

  return (
    <div className={styles.shell}>
      <div className={styles.body}>
        <nav className={styles.nav} aria-label="Social Management">
          {sections.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-current={tab === id ? 'page' : undefined}
              className={tab === id ? styles.selected : ''}
            >
              {label}
            </button>
          ))}
        </nav>
        <main className={styles.main} aria-busy={busy}>
          <header className={styles.top}>
            <div>
              <h2>{sections.find(([id]) => id === tab)?.[1]}</h2>
              <p>Strategi, konten, dan percakapan Pradea.</p>
            </div>
          </header>
          <div className={styles.statusbar}>
            <span>
              <i className={modelReady ? styles.online : styles.offline} />
              {modelReady ? 'LLM lokal siap' : 'LLM belum dikonfigurasi'}
            </span>
            <span>{state?.skills.length || 0} skill tersedia</span>
            <span>{working.length} tugas aktif</span>
            <span>Publikasi melalui Postiz</span>
          </div>
          {error && (
            <div className={styles.error} role="alert">
              {error}
              <button
                onClick={() => setError('')}
                aria-label="Tutup pesan kesalahan"
              >
                ×
              </button>
            </div>
          )}
          {notice && (
            <div className={styles.notice} role="status">
              {notice}
              <button
                onClick={() => setNotice('')}
                aria-label="Tutup pemberitahuan"
              >
                ×
              </button>
            </div>
          )}

          {!state || !workspace ? (
            <Card>
              <p>
                {error
                  ? 'Modul belum dapat dimuat. Pastikan backend dan tabel Social Management sudah siap.'
                  : 'Memuat workspace…'}
              </p>
              <button
                onClick={() => void act(load, 'Workspace dimuat.')}
                disabled={busy}
              >
                Muat ulang
              </button>
            </Card>
          ) : (
            <>
              {tab === 'overview' && (
                <>
                  <section className={styles.hero}>
                    <div>
                      <h3>Workspace Pradea</h3>
                      <p>
                        Susun strategi dan draft dengan konteks brand. Tinjau
                        hasil, lalu lanjutkan publikasi di kalender Postiz.
                      </p>
                    </div>
                    <button
                      className={styles.primary}
                      onClick={() => setTab('agent')}
                    >
                      Mulai tugas agent <Icon type="arrow" />
                    </button>
                  </section>
                  <div className={styles.stats}>
                    <Card>
                      <span>Sumber pengetahuan</span>
                      <strong>{sources.length}</strong>
                      <small>Referensi dengan asal data</small>
                    </Card>
                    <Card>
                      <span>Konten dalam rencana</span>
                      <strong>{contents.length}</strong>
                      <small>
                        {contents.filter((c) => c.data.approved).length} sudah
                        direview
                      </small>
                    </Card>
                    <Card>
                      <span>Percakapan perlu perhatian</span>
                      <strong>
                        {
                          messages.filter((m) =>
                            ['handoff', 'failed', 'delivery-unknown'].includes(
                              m.status
                            )
                          ).length
                        }
                      </strong>
                      <small>Termasuk simulasi yang ditandai</small>
                    </Card>
                  </div>
                  <div className={styles.twoCol}>
                    <Card title="Langkah berikutnya">
                      <div className={styles.checklist}>
                        {[
                          [
                            !!workspace.brand.description,
                            'Lengkapi profil dan FAQ brand',
                            'brand',
                          ],
                          [
                            sources.length > 0,
                            'Tambahkan referensi dan data publik',
                            'research',
                          ],
                          [
                            !!modelReady,
                            'Hubungkan model LLM lokal',
                            'settings',
                          ],
                          [
                            !!state.messaging.ready,
                            'Hubungkan messaging Meta',
                            'inbox',
                          ],
                        ].map(([done, label, target]) => (
                          <button
                            key={String(label)}
                            onClick={() => setTab(target as Tab)}
                          >
                            <span className={done ? styles.done : styles.todo}>
                              {done ? <Icon type="check" /> : '·'}
                            </span>
                            <span>{label}</span>
                            <Icon type="arrow" />
                          </button>
                        ))}
                      </div>
                    </Card>
                    <Card title="Aktivitas terbaru">
                      {runs.length ? (
                        runs.slice(0, 3).map((r) => (
                          <button
                            className={styles.runItem}
                            key={r.id}
                            onClick={() => {
                              setSelectedRun(r.id);
                              setTab('agent');
                            }}
                          >
                            <span>
                              {r.title}
                              <small>{date(r.createdAt)}</small>
                            </span>
                            <Badge status={r.status} />
                          </button>
                        ))
                      ) : (
                        <Empty
                          title="Belum ada tugas"
                          description="Mulai dengan strategi brand atau rencana konten mingguan."
                        />
                      )}
                    </Card>
                  </div>
                </>
              )}
              {tab === 'brand' && (
                <>
                  <Card
                    title="Import profil brand"
                    subtitle="Isi profil langsung dari file JSON, CSV, TXT, atau Markdown (maks. 60 KB). Tinjau kolom yang akan diisi sebelum menyimpan."
                  >
                    <Field
                      label="Pilih file profil brand"
                      hint="TXT/MD dapat memakai judul seperti Nama brand:, Audiens utama:, atau FAQ:. Teks tanpa judul masuk ke Tentang brand (maks. 3.000 karakter)."
                    >
                      <input
                        type="file"
                        accept=".json,.csv,.txt,.md"
                        disabled={busy}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = '';
                          void importBrandFile(file);
                        }}
                      />
                    </Field>
                    <button onClick={downloadBrandTemplate}>
                      Unduh template JSON
                    </button>
                  </Card>
                  <Card
                    title="Konteks yang dibaca setiap agent"
                    subtitle="Isi fakta bisnis yang benar. Informasi ini menjadi rujukan strategi, konten, dan chatbot."
                  >
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void saveWorkspace();
                      }}
                    >
                      <div className={styles.twoCol}>
                        <Field label="Nama brand">
                          <input
                            required
                            value={workspace.brand.name}
                            maxLength={100}
                            onChange={(e) =>
                              updateBrand('name', e.target.value)
                            }
                          />
                        </Field>
                        <Field label="Zona waktu">
                          <input
                            value={workspace.brand.timezone}
                            onChange={(e) =>
                              updateBrand('timezone', e.target.value)
                            }
                          />
                        </Field>
                        {textArea(
                          'description',
                          'Tentang brand',
                          'Apa yang Pradea kerjakan dan apa yang membedakannya?'
                        )}
                        {textArea('audience', 'Audiens utama')}
                        {textArea('voice', 'Gaya bahasa')}
                        {textArea('goals', 'Tujuan media sosial')}
                        {textArea(
                          'offers',
                          'Layanan, harga, dan ketentuan',
                          'Cantumkan hanya informasi yang boleh disampaikan kepada pelanggan.'
                        )}
                        {textArea(
                          'boundaries',
                          'Batasan dan klaim yang dilarang'
                        )}
                      </div>
                      <Field
                        label="FAQ / pengetahuan layanan"
                        hint="Tulis pertanyaan dan jawaban resmi. Chatbot mengalihkan ke pemilik jika jawabannya belum tersedia."
                      >
                        <textarea
                          rows={8}
                          value={workspace.brand.faq}
                          onChange={(e) => updateBrand('faq', e.target.value)}
                        />
                      </Field>
                      <Field
                        label="URL sumber brand"
                        hint="Satu URL HTTPS per baris, maksimal 5: situs brand, katalog, blog, atau referensi publik. Dipakai saat riset AI otomatis."
                      >
                        <textarea
                          rows={3}
                          value={(workspace.brand.sourceUrls || []).join('\n')}
                          onChange={(e) =>
                            updateBrand(
                              'sourceUrls',
                              e.target.value.split('\n')
                            )
                          }
                          placeholder="https://website-brand.com"
                        />
                      </Field>
                      <div className={styles.actions}>
                        <button className={styles.primary} disabled={busy}>
                          Simpan profil brand
                        </button>
                        <small>
                          Perubahan belum dipakai agent sampai disimpan.
                        </small>
                      </div>
                    </form>
                  </Card>
                </>
              )}
              {tab === 'agent' && (
                <>
                  <Card
                    title="Berikan tujuan. Agent menyusun langkahnya."
                    subtitle="Agent memilih skill, membaca profil dan sumber, lalu menyimpan hasil tiap langkah. Tidak mengunggah atau mengirim postingan."
                  >
                    <form
                      className={styles.agentForm}
                      onSubmit={(e) => {
                        e.preventDefault();
                        void act(async () => {
                          const run = await api('/runs', 'POST', {
                            workflow,
                            brief,
                            skills: chosenSkills,
                          });
                          setSelectedRun(run.id);
                        }, 'Tugas masuk antrean. Hasil setiap langkah akan muncul di bawah.');
                      }}
                    >
                      <div className={styles.twoCol}>
                        <Field label="Jenis pekerjaan">
                          <select
                            value={workflow}
                            onChange={(e) => setWorkflow(e.target.value)}
                          >
                            {Object.entries(workflowNames).map(([k, v]) => (
                              <option key={k} value={k}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Konteks yang digunakan">
                          <div className={styles.info}>
                            {workspace.brand.name} · {sources.length} sumber ·{' '}
                            {rows('metric').length} data kinerja
                          </div>
                        </Field>
                      </div>
                      <Field label="Tujuan dan brief">
                        <textarea
                          required
                          rows={4}
                          minLength={5}
                          maxLength={6000}
                          value={brief}
                          onChange={(e) => setBrief(e.target.value)}
                          placeholder="Contoh: siapkan kampanye 7 hari untuk jasa desain Pradea. Buat versi Instagram, Facebook, dan skrip TikTok."
                        />
                      </Field>
                      <div className={styles.chips}>
                        {chosenSkills.map((id) => (
                          <button
                            type="button"
                            key={id}
                            onClick={() =>
                              setChosenSkills(
                                chosenSkills.filter((s) => s !== id)
                              )
                            }
                          >
                            {state.skills.find((s: any) => s.id === id)?.name ||
                              id}{' '}
                            ×
                          </button>
                        ))}
                      </div>
                      <div className={styles.actions}>
                        <button
                          className={styles.primary}
                          disabled={busy || !modelReady}
                        >
                          Jalankan agent <Icon type="spark" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPickerSearch('');
                            setPickerCategory('all');
                            setSkillPicker(true);
                          }}
                        >
                          Pilih skill tambahan
                        </button>
                        {!modelReady && (
                          <small>
                            Model lokal belum siap. Pilih model di Pengaturan.
                          </small>
                        )}
                      </div>
                    </form>
                  </Card>
                  <div className={styles.twoCol}>
                    <Card title="Riwayat tugas">
                      {runs.length ? (
                        runs.map((r) => (
                          <button
                            key={r.id}
                            className={`${styles.runItem} ${
                              currentRun?.id === r.id ? styles.activeRun : ''
                            }`}
                            onClick={() => setSelectedRun(r.id)}
                          >
                            <span>
                              {r.title}
                              <small>
                                {workflowNames[r.data.workflow]} ·{' '}
                                {date(r.createdAt)}
                              </small>
                            </span>
                            <Badge status={r.status} />
                          </button>
                        ))
                      ) : (
                        <Empty
                          title="Ruang untuk ide pertama"
                          description="Tugas baru akan tampil di sini bersama status dan hasilnya."
                        />
                      )}
                    </Card>
                    <Card title="Hasil & jejak pekerjaan">
                      {currentRun ? (
                        <>
                          <div className={styles.row}>
                            <Badge status={currentRun.status} />
                            {['queued', 'running'].includes(
                              currentRun.status
                            ) && (
                              <button
                                disabled={busy}
                                onClick={() =>
                                  void act(
                                    () =>
                                      api(
                                        `/runs/${currentRun.id}/cancel`,
                                        'POST',
                                        {}
                                      ),
                                    'Tugas dihentikan setelah panggilan model yang sedang berlangsung selesai.'
                                  )
                                }
                              >
                                Hentikan
                              </button>
                            )}
                          </div>
                          {currentRun.data.currentSkill && (
                            <p className={styles.muted}>
                              Skill: {currentRun.data.currentSkill}
                            </p>
                          )}
                          {currentRun.data.error && (
                            <p role="alert" className={styles.error}>
                              {currentRun.data.error}
                            </p>
                          )}
                          {currentRun.data.steps?.map((s: any, i: number) => (
                            <details key={i} className={styles.detail}>
                              <summary>
                                {i + 1}. {s.skill} ·{' '}
                                {s.status === 'completed'
                                  ? 'Selesai'
                                  : 'Perlu diperiksa'}
                              </summary>
                              <pre>{s.result}</pre>
                            </details>
                          ))}
                          {currentRun.data.output && (
                            <>
                              <h3>Hasil akhir</h3>
                              <pre className={styles.output}>
                                {currentRun.data.output}
                              </pre>
                              <button
                                onClick={() => {
                                  void navigator.clipboard
                                    .writeText(currentRun.data.output)
                                    .then(() => setNotice('Hasil disalin.'))
                                    .catch(() =>
                                      setError(
                                        'Clipboard tidak tersedia. Pilih teks untuk menyalin.'
                                      )
                                    );
                                }}
                              >
                                Salin hasil
                              </button>
                            </>
                          )}
                          {currentRun.data.draftCount > 0 && (
                            <button
                              className={styles.primary}
                              onClick={() => setTab('content')}
                            >
                              Lihat {currentRun.data.draftCount} draft
                            </button>
                          )}
                        </>
                      ) : (
                        <p>Pilih tugas untuk membaca hasil.</p>
                      )}
                    </Card>
                  </div>
                </>
              )}
              {tab === 'research' && (
                <>
                  <Card
                    title="Riset otomatis dengan AI"
                    subtitle="Agent membaca profil brand tersimpan, mengambil URL sumber brand, lalu menyusun temuan dan ide beserta sumbernya."
                  >
                    <div className={styles.info}>
                      {state.workspace.data.brand.name} ·{' '}
                      {(state.workspace.data.brand.sourceUrls || []).length} URL
                      brand · {sources.length} sumber tersimpan
                    </div>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void act(async () => {
                          const run = await api('/research/auto', 'POST', {
                            focus: researchFocus,
                          });
                          setSelectedRun(run.id);
                        }, 'Riset masuk antrean. Hasil akan muncul di bagian hasil riset.');
                      }}
                    >
                      <Field label="Fokus riset (opsional)">
                        <textarea
                          rows={3}
                          maxLength={2000}
                          value={researchFocus}
                          onChange={(e) => setResearchFocus(e.target.value)}
                          placeholder="Contoh: peluang konten untuk menarik pemilik UMKM."
                        />
                      </Field>
                      <div className={styles.actions}>
                        <button
                          className={styles.primary}
                          disabled={busy || !modelReady || brandDirty}
                        >
                          Mulai riset AI <Icon type="spark" />
                        </button>
                        {brandDirty && (
                          <small>
                            Simpan perubahan Profil brand terlebih dahulu.
                          </small>
                        )}
                        {!modelReady && (
                          <small>
                            Siap digunakan setelah model lokal dipilih di
                            Pengaturan.
                          </small>
                        )}
                      </div>
                      <p className={styles.muted}>
                        Riset memakai URL dan catatan yang tersedia, bukan
                        pencarian seluruh internet. Tidak ada API berbayar.
                      </p>
                    </form>
                  </Card>
                  <Card title="Hasil riset">
                    {runs.filter((r) => r.data.workflow === 'research')
                      .length ? (
                      runs
                        .filter((r) => r.data.workflow === 'research')
                        .map((r) => (
                          <details className={styles.detail} key={r.id}>
                            <summary>
                              {r.title} · {statuses[r.status] || r.status} ·{' '}
                              {date(r.createdAt)}
                            </summary>
                            {r.data.error && (
                              <p className={styles.error}>{r.data.error}</p>
                            )}
                            <pre>
                              {r.data.output || 'Hasil belum tersedia.'}
                            </pre>
                            {r.data.sourceEvidence?.map((e: any, i: number) => (
                              <p className={styles.muted} key={i}>
                                {e.title}
                                {e.url ? ' · ' + e.url : ''}
                                {e.fetchedAt ? ' · ' + date(e.fetchedAt) : ''}
                              </p>
                            ))}
                            <button
                              onClick={() => {
                                setSelectedRun(r.id);
                                setTab('agent');
                              }}
                            >
                              Lihat langkah agent
                            </button>
                          </details>
                        ))
                    ) : (
                      <Empty
                        title="Belum ada hasil riset"
                        description="Tambahkan sumber di profil brand, lalu mulai riset AI."
                      />
                    )}
                  </Card>
                  <Card
                    title="Riset dari sumber yang bisa ditelusuri"
                    subtitle="Ambil teks dari situs HTTPS publik, atau impor catatan dari sumber yang lu miliki. Tidak membuka login dan tidak mengambil data privat."
                  >
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void act(async () => {
                          await api('/sources', 'POST', source);
                          setSource({
                            ...source,
                            title: '',
                            url: '',
                            text: '',
                          });
                        }, 'Sumber disimpan beserta asal dan waktu pengambilannya.');
                      }}
                    >
                      <div className={styles.twoCol}>
                        <Field label="Judul sumber">
                          <input
                            required
                            maxLength={200}
                            value={source.title}
                            onChange={(e) =>
                              setSource({ ...source, title: e.target.value })
                            }
                          />
                        </Field>
                        <Field label="Cara menambahkan">
                          <select
                            value={source.type}
                            onChange={(e) =>
                              setSource({ ...source, type: e.target.value })
                            }
                          >
                            <option value="url">
                              Ambil halaman publik / RSS
                            </option>
                            <option value="note">
                              Impor catatan / hasil ekspor
                            </option>
                          </select>
                        </Field>
                      </div>
                      {source.type === 'url' ? (
                        <Field
                          label="URL HTTPS"
                          hint="Crawler mematuhi robots.txt. Instagram, Facebook, dan TikTok menggunakan API resmi atau impor data."
                        >
                          <input
                            required
                            type="url"
                            value={source.url}
                            onChange={(e) =>
                              setSource({ ...source, url: e.target.value })
                            }
                            placeholder="https://contoh.com/artikel"
                          />
                        </Field>
                      ) : (
                        <Field label="Catatan dengan asal data">
                          <textarea
                            required
                            rows={7}
                            maxLength={20000}
                            value={source.text}
                            onChange={(e) =>
                              setSource({ ...source, text: e.target.value })
                            }
                            placeholder="Tempel informasi yang boleh digunakan dan sertakan URL atau asalnya."
                          />
                        </Field>
                      )}
                      <label className={styles.check}>
                        <input
                          type="checkbox"
                          checked={source.knowledge}
                          onChange={(e) =>
                            setSource({
                              ...source,
                              knowledge: e.target.checked,
                            })
                          }
                        />
                        Informasi ini sudah saya tinjau dan boleh dipakai untuk
                        jawaban chatbot
                      </label>
                      <button className={styles.primary} disabled={busy}>
                        {busy ? 'Mengambil sumber…' : 'Tambahkan sumber'}
                      </button>
                    </form>
                  </Card>
                  {sources.length ? (
                    <div className={styles.twoCol}>
                      {sources.map((s) => (
                        <Card key={s.id} title={s.title}>
                          <div className={styles.row}>
                            <Badge status="ready" />
                            <small>
                              {s.data.knowledge
                                ? 'Pengetahuan chatbot'
                                : 'Referensi riset'}
                            </small>
                          </div>
                          <p className={styles.muted}>
                            {date(s.data.fetchedAt || s.createdAt)}
                          </p>
                          {s.data.url && (
                            <a
                              href={s.data.url}
                              target="_blank"
                              rel="noreferrer"
                              className={styles.sourceUrl}
                            >
                              {s.data.url}
                            </a>
                          )}
                          <details className={styles.detail}>
                            <summary>Lihat teks sumber</summary>
                            <pre>{s.data.text}</pre>
                          </details>
                          {s.data.type === 'url' && (
                            <button
                              disabled={busy}
                              onClick={() =>
                                void act(
                                  () =>
                                    api(`/sources/${s.id}/refresh`, 'POST', {}),
                                  'Sumber diperbarui.'
                                )
                              }
                            >
                              Ambil ulang
                            </button>
                          )}
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Empty
                      title="Bangun dasar riset Pradea"
                      description="Tambahkan situs brand, artikel industri, atau catatan tentang audiens. Agent akan mencantumkan keterbatasan sumber."
                    />
                  )}
                </>
              )}
              {tab === 'content' && (
                <>
                  <Card
                    title={
                      editing ? 'Edit draft konten' : 'Rencana konten & review'
                    }
                    subtitle="Draft agent dan draft manual berada di sini. Setelah direview, kirim sebagai draft ke Postiz; media, upload, dan jadwal tetap di editor Postiz."
                  >
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void act(async () => {
                          await api(
                            editing ? `/content/${editing.id}` : '/content',
                            editing ? 'PUT' : 'POST',
                            editing
                              ? { data: draft, revision: editing.revision }
                              : draft
                          );
                          setDraft({ ...emptyContent });
                          setEditing(null);
                        });
                      }}
                    >
                      <div className={styles.twoCol}>
                        <Field label="Judul konten">
                          <input
                            required
                            value={draft.title}
                            onChange={(e) =>
                              setDraft({ ...draft, title: e.target.value })
                            }
                          />
                        </Field>
                        <Field label="Platform">
                          <select
                            value={draft.platform}
                            onChange={(e) =>
                              setDraft({ ...draft, platform: e.target.value })
                            }
                          >
                            {['instagram', 'facebook', 'tiktok'].map((p) => (
                              <option key={p}>{p}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Format">
                          <input
                            value={draft.format}
                            onChange={(e) =>
                              setDraft({ ...draft, format: e.target.value })
                            }
                          />
                        </Field>
                        <Field label="Tanggal rencana (belum terjadwal)">
                          <input
                            type="date"
                            value={draft.plannedDate}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                plannedDate: e.target.value,
                              })
                            }
                          />
                        </Field>
                      </div>
                      <Field label="Caption / naskah">
                        <textarea
                          required
                          rows={5}
                          value={draft.caption}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              caption: e.target.value,
                              approved: false,
                            })
                          }
                        />
                      </Field>
                      <Field label="Brief visual / produksi">
                        <textarea
                          rows={3}
                          value={draft.mediaBrief}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              mediaBrief: e.target.value,
                              approved: false,
                            })
                          }
                        />
                      </Field>
                      <label className={styles.check}>
                        <input
                          type="checkbox"
                          checked={draft.approved}
                          onChange={(e) =>
                            setDraft({ ...draft, approved: e.target.checked })
                          }
                        />
                        Saya sudah meninjau konten ini
                      </label>
                      <div className={styles.actions}>
                        <button className={styles.primary} disabled={busy}>
                          Simpan draft
                        </button>
                        {editing && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(null);
                              setDraft({ ...emptyContent });
                            }}
                          >
                            Batal edit
                          </button>
                        )}
                      </div>
                    </form>
                  </Card>
                  <div className={styles.twoCol}>
                    {contents.map((c) => (
                      <Card key={c.id} title={c.title}>
                        <div className={styles.row}>
                          <span className={styles.platform}>
                            {c.data.platform} · {c.data.format}
                          </span>
                          <Badge status={c.status} />
                        </div>
                        <p className={styles.muted}>
                          {c.data.plannedDate || 'Tanggal belum ditentukan'}
                        </p>
                        <pre className={styles.contentPreview}>
                          {c.data.caption}
                        </pre>
                        {c.data.mediaBrief && (
                          <details className={styles.detail}>
                            <summary>Brief produksi</summary>
                            <pre>{c.data.mediaBrief}</pre>
                          </details>
                        )}
                        {!['exported', 'exporting'].includes(c.status) && (
                          <button
                            onClick={() => {
                              setEditing(c);
                              setDraft({ ...emptyContent, ...c.data });
                              window.scrollTo({ top: 0, behavior: 'auto' });
                            }}
                          >
                            Edit & review
                          </button>
                        )}
                        {c.status === 'exported'
                          ? null
                          : c.data.approved && (
                              <div className={styles.export}>
                                <Field label="Akun tujuan draft">
                                  <select
                                    value={exportChannel[c.id] || ''}
                                    onChange={(e) =>
                                      setExportChannel({
                                        ...exportChannel,
                                        [c.id]: e.target.value,
                                      })
                                    }
                                  >
                                    <option value="">
                                      Pilih akun terhubung
                                    </option>
                                    {state.channels
                                      .filter((ch: any) =>
                                        ch.providerIdentifier.startsWith(
                                          c.data.platform
                                        )
                                      )
                                      .map((ch: any) => (
                                        <option key={ch.id} value={ch.id}>
                                          {ch.name}
                                        </option>
                                      ))}
                                  </select>
                                </Field>
                                <button
                                  disabled={
                                    busy ||
                                    !exportChannel[c.id] ||
                                    c.status === 'exporting'
                                  }
                                  onClick={() =>
                                    void act(
                                      () =>
                                        api(`/content/${c.id}/export`, 'POST', {
                                          integrationId: exportChannel[c.id],
                                        }),
                                      'Draft dibuat di kalender Postiz. Belum dipublikasikan.'
                                    )
                                  }
                                >
                                  Buat draft di Postiz
                                </button>
                              </div>
                            )}
                        {c.data.error && <p role="alert">{c.data.error}</p>}
                      </Card>
                    ))}
                  </div>
                </>
              )}
              {tab === 'inbox' && (
                <>
                  <Card
                    title="Percakapan yang tetap punya konteks"
                    subtitle="Chatbot membaca profil, FAQ, dan pengetahuan yang sudah ditinjau. Pertanyaan di luar pengetahuan serta permintaan manusia dialihkan ke pemilik."
                  >
                    <div className={styles.row}>
                      <Badge
                        status={state.messaging.ready ? 'active' : 'paused'}
                      />
                      <p>
                        {state.messaging.ready
                          ? 'Messaging Meta dikonfigurasi'
                          : 'Instagram / Facebook belum terhubung ke messaging'}
                      </p>
                    </div>
                    <p className={styles.muted}>
                      Mode saat ini: {state.workspace.data.settings.chatbotMode}
                      . TikTok DM belum tersedia di konektor ini. Simulasi tidak
                      mengirim pesan ke akun sosial.
                    </p>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void act(
                          () =>
                            api('/inbox/simulate', 'POST', {
                              text: customerText,
                            }),
                          'Simulasi selesai; tidak ada pesan terkirim ke media sosial.'
                        );
                      }}
                    >
                      <Field label="Uji pesan pelanggan">
                        <textarea
                          required
                          rows={3}
                          maxLength={6000}
                          value={customerText}
                          onChange={(e) => setCustomerText(e.target.value)}
                          placeholder="Contoh: Halo, Pradea melayani desain apa saja?"
                        />
                      </Field>
                      <div className={styles.actions}>
                        <button
                          className={styles.primary}
                          disabled={busy || !modelReady}
                        >
                          Uji chatbot lokal
                        </button>
                        <button
                          type="button"
                          onClick={() => setTab('settings')}
                        >
                          Atur mode balasan
                        </button>
                      </div>
                    </form>
                  </Card>
                  {messages.length ? (
                    messages.map((m) => (
                      <Card key={m.id}>
                        <div className={styles.row}>
                          <strong>{m.title}</strong>
                          <Badge status={m.status} />
                        </div>
                        <small>
                          {m.data.live
                            ? 'Pesan Meta terverifikasi'
                            : 'Simulasi lokal'}{' '}
                          · {date(m.data.receivedAt || m.createdAt)}
                        </small>
                        <div className={styles.bubble}>{m.data.text}</div>
                        {m.data.reply && (
                          <div className={styles.botBubble}>
                            <small>Usulan jawaban AI</small>
                            <p>{m.data.reply}</p>
                          </div>
                        )}
                        {m.data.reason && (
                          <p className={styles.muted}>{m.data.reason}</p>
                        )}
                        {m.data.error && (
                          <p role="alert" className={styles.error}>
                            {m.data.error}
                          </p>
                        )}
                        {m.data.live && (
                          <>
                            <div className={styles.actions}>
                              <button
                                disabled={busy}
                                onClick={() =>
                                  void act(
                                    () =>
                                      api(`/inbox/${m.id}/handoff`, 'POST', {
                                        paused: true,
                                      }),
                                    'Percakapan diambil alih. Balasan otomatis untuk pelanggan ini dijeda.'
                                  )
                                }
                              >
                                Ambil alih percakapan
                              </button>
                              <button
                                disabled={busy}
                                onClick={() =>
                                  void act(
                                    () =>
                                      api(`/inbox/${m.id}/handoff`, 'POST', {
                                        paused: false,
                                      }),
                                    'Percakapan dikembalikan ke mode chatbot yang dipilih.'
                                  )
                                }
                              >
                                Kembalikan ke chatbot
                              </button>
                            </div>
                            {['draft', 'handoff'].includes(m.status) && (
                              <>
                                <Field label="Balasan yang akan dikirim">
                                  <textarea
                                    maxLength={900}
                                    rows={3}
                                    value={
                                      replyEdits[m.id] ?? m.data.reply ?? ''
                                    }
                                    onChange={(e) =>
                                      setReplyEdits({
                                        ...replyEdits,
                                        [m.id]: e.target.value,
                                      })
                                    }
                                  />
                                </Field>
                                <button
                                  disabled={
                                    busy ||
                                    !(
                                      replyEdits[m.id] ??
                                      m.data.reply ??
                                      ''
                                    ).trim()
                                  }
                                  onClick={() => setConfirmMessage(m)}
                                >
                                  Tinjau pengiriman
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </Card>
                    ))
                  ) : (
                    <Empty
                      title="Inbox siap menerima percakapan"
                      description="Hubungkan messaging Meta untuk pesan asli, atau uji FAQ dengan LLM lokal setelah model disiapkan."
                    />
                  )}
                </>
              )}
              {tab === 'metrics' && (
                <>
                  <Card
                    title="Analisis dari angka asli"
                    subtitle="Masukkan angka dari dashboard platform. Kolom kosong berarti belum tersedia, bukan nol. Agent memakai data ini untuk laporan dan ide eksperimen."
                  >
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void act(async () => {
                          const values = { ...metric };
                          for (const key of [
                            'reach',
                            'likes',
                            'comments',
                            'shares',
                            'saves',
                          ])
                            values[key] =
                              metric[key] === '' ? null : Number(metric[key]);
                          await api('/metrics', 'POST', { metrics: [values] });
                          setMetric({
                            ...metric,
                            title: '',
                            reach: '',
                            likes: '',
                            comments: '',
                            shares: '',
                            saves: '',
                          });
                        }, 'Data kinerja disimpan.');
                      }}
                    >
                      <div className={styles.twoCol}>
                        <Field label="Judul postingan / periode">
                          <input
                            required
                            value={metric.title}
                            onChange={(e) =>
                              setMetric({ ...metric, title: e.target.value })
                            }
                          />
                        </Field>
                        <Field label="Platform">
                          <select
                            value={metric.platform}
                            onChange={(e) =>
                              setMetric({ ...metric, platform: e.target.value })
                            }
                          >
                            {['instagram', 'facebook', 'tiktok'].map((p) => (
                              <option key={p}>{p}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Tanggal pengukuran">
                          <input
                            required
                            type="date"
                            value={metric.date}
                            onChange={(e) =>
                              setMetric({ ...metric, date: e.target.value })
                            }
                          />
                        </Field>
                        <Field label="Asal data / URL postingan">
                          <input
                            required
                            minLength={3}
                            value={metric.source}
                            onChange={(e) =>
                              setMetric({ ...metric, source: e.target.value })
                            }
                          />
                        </Field>
                      </div>
                      <div className={styles.metricFields}>
                        {[
                          ['reach', 'Jangkauan'],
                          ['likes', 'Like'],
                          ['comments', 'Komentar'],
                          ['shares', 'Dibagikan'],
                          ['saves', 'Disimpan'],
                        ].map(([k, label]) => (
                          <Field key={k} label={label}>
                            <input
                              type="number"
                              min={0}
                              value={metric[k]}
                              onChange={(e) =>
                                setMetric({ ...metric, [k]: e.target.value })
                              }
                            />
                          </Field>
                        ))}
                      </div>
                      <div className={styles.actions}>
                        <button className={styles.primary} disabled={busy}>
                          Simpan data
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setWorkflow('report');
                            setBrief(
                              'Analisis data kinerja yang tersedia, jelaskan keterbatasannya, lalu usulkan tiga perbaikan konten.'
                            );
                            setTab('agent');
                          }}
                        >
                          Susun laporan dengan agent
                        </button>
                        <Link href="/analytics">Analytics Postiz →</Link>
                      </div>
                    </form>
                  </Card>
                  <Card title="Catatan kinerja">
                    {rows('metric').length ? (
                      <div className={styles.tableWrap}>
                        <table>
                          <thead>
                            <tr>
                              <th>Konten</th>
                              <th>Platform</th>
                              <th>Tanggal</th>
                              <th>Jangkauan</th>
                              <th>Interaksi / jangkauan</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows('metric').map((m) => {
                              const d = m.data;
                              const complete = [
                                d.likes,
                                d.comments,
                                d.shares,
                                d.saves,
                              ].every((v) => v !== null && v !== undefined);
                              return (
                                <tr key={m.id}>
                                  <td>
                                    {m.title}
                                    <small>{d.source}</small>
                                  </td>
                                  <td>{d.platform}</td>
                                  <td>{d.date}</td>
                                  <td>{d.reach ?? 'Belum ada'}</td>
                                  <td>
                                    {complete && d.reach > 0
                                      ? (
                                          ((d.likes +
                                            d.comments +
                                            d.shares +
                                            d.saves) /
                                            d.reach) *
                                          100
                                        ).toFixed(2) + '%'
                                      : 'Data belum lengkap'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <Empty
                        title="Belum ada angka untuk dianalisis"
                        description="Data tidak diisi dengan contoh atau angka buatan. Tambahkan pengukuran pertama di atas."
                      />
                    )}
                  </Card>
                </>
              )}
              {tab === 'automation' && (
                <>
                  <Card
                    title="Rutinitas yang bekerja di belakang layar"
                    subtitle="Jalankan riset, perencanaan, pembuatan draft, atau laporan berkala selama backend dan LLM lokal aktif. Rutinitas tidak menerbitkan konten."
                  >
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void act(
                          () => api('/automations', 'POST', automation),
                          'Rutinitas disimpan. Waktu berikutnya dihitung dari saat penyimpanan.'
                        );
                      }}
                    >
                      <div className={styles.twoCol}>
                        <Field label="Nama rutinitas">
                          <input
                            required
                            value={automation.name}
                            onChange={(e) =>
                              setAutomation({
                                ...automation,
                                name: e.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field label="Jenis pekerjaan">
                          <select
                            value={automation.workflow}
                            onChange={(e) =>
                              setAutomation({
                                ...automation,
                                workflow: e.target.value,
                              })
                            }
                          >
                            {Object.entries(workflowNames).map(([k, v]) => (
                              <option key={k} value={k}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Jalankan setiap">
                          <select
                            value={automation.intervalHours}
                            onChange={(e) =>
                              setAutomation({
                                ...automation,
                                intervalHours: Number(e.target.value),
                              })
                            }
                          >
                            <option value={24}>24 jam</option>
                            <option value={72}>3 hari</option>
                            <option value={168}>7 hari</option>
                            <option value={720}>30 hari</option>
                          </select>
                        </Field>
                      </div>
                      <Field label="Brief tugas berulang">
                        <textarea
                          required
                          minLength={5}
                          rows={4}
                          value={automation.brief}
                          onChange={(e) =>
                            setAutomation({
                              ...automation,
                              brief: e.target.value,
                            })
                          }
                        />
                      </Field>
                      <label className={styles.check}>
                        <input
                          type="checkbox"
                          disabled={!modelReady}
                          checked={automation.enabled}
                          onChange={(e) =>
                            setAutomation({
                              ...automation,
                              enabled: e.target.checked,
                            })
                          }
                        />
                        Aktifkan rutinitas ini (memakai komputasi lokal)
                      </label>
                      <button className={styles.primary} disabled={busy}>
                        Simpan rutinitas
                      </button>
                    </form>
                  </Card>
                  {rows('automation').map((a) => (
                    <Card key={a.id} title={a.title}>
                      <div className={styles.row}>
                        <Badge status={a.status} />
                        <span>Setiap {a.data.intervalHours} jam</span>
                      </div>
                      <p>{a.data.brief}</p>
                      <p className={styles.muted}>
                        Berikutnya: {date(a.data.nextRun)}
                      </p>
                      <button
                        disabled={
                          busy || (a.status !== 'active' && !modelReady)
                        }
                        onClick={() =>
                          void act(() =>
                            api(`/automations/${a.id}`, 'PUT', {
                              revision: a.revision,
                              data: {
                                ...a.data,
                                enabled: a.status !== 'active',
                              },
                            })
                          )
                        }
                      >
                        {a.status === 'active'
                          ? 'Jeda rutinitas'
                          : 'Aktifkan rutinitas'}
                      </button>
                    </Card>
                  ))}
                </>
              )}
              {tab === 'skills' && (
                <>
                  <Card
                    title={`${state.skills.length} panduan kerja dalam satu workspace`}
                    subtitle="Pilih panduan sesuai kemampuan yang dibutuhkan atau buat skill sendiri. Skill media menghasilkan brief sampai alat kreatif terkait dihubungkan."
                  >
                    <div className={styles.twoCol}>
                      <Field label="Cari skill">
                        <input
                          type="search"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="caption, strategy, reels, analytics…"
                        />
                      </Field>
                      <Field label="Filter kemampuan">
                        <select
                          value={skillCategory}
                          onChange={(e) => setSkillCategory(e.target.value)}
                        >
                          {categoryOptions}
                        </select>
                      </Field>
                    </div>
                    <button
                      className={styles.primary}
                      onClick={() => {
                        setError('');
                        setCreatingSkill(true);
                      }}
                    >
                      Buat skill
                    </button>
                    <p className={styles.muted}>
                      Dipilih untuk tugas berikutnya: {chosenSkills.length}/6.
                      {filteredSkills(search, skillCategory).length} skill cocok
                      dengan filter.
                    </p>
                  </Card>
                  <div className={styles.skillGrid}>
                    {filteredSkills(search, skillCategory).map((s: any) => (
                      <Card key={s.id}>
                        <div className={styles.row}>
                          <Icon type="spark" />
                          <span className={styles.badge}>
                            {s.mode === 'text'
                              ? 'Agent teks'
                              : s.mode === 'brief-only'
                              ? 'Brief media'
                              : 'Postiz manual'}
                          </span>
                        </div>
                        <h3>{s.name || s.id}</h3>
                        <p className={styles.muted}>
                          {
                            skillCategories[
                              s.category as keyof typeof skillCategories
                            ]
                          }
                          {s.custom ? ' · Buatan sendiri' : ''}
                        </p>
                        <p className={styles.skillDescription}>
                          {s.description}
                        </p>
                        <div className={styles.actions}>
                          <button
                            disabled={busy}
                            onClick={() =>
                              void act(
                                async () =>
                                  setSkillText({
                                    id: s.id,
                                    ...(await api(`/skills/${s.id}`)),
                                  }),
                                'Panduan skill dibuka.'
                              )
                            }
                          >
                            Baca
                          </button>
                          {s.mode === 'text' && (
                            <button
                              disabled={
                                !chosenSkills.includes(s.id) &&
                                chosenSkills.length >= 6
                              }
                              onClick={() =>
                                setChosenSkills(
                                  chosenSkills.includes(s.id)
                                    ? chosenSkills.filter((v) => v !== s.id)
                                    : [...chosenSkills, s.id]
                                )
                              }
                            >
                              {chosenSkills.includes(s.id)
                                ? 'Batalkan pilihan'
                                : 'Pakai di agent'}
                            </button>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </>
              )}
              {tab === 'skills' &&
                filteredSkills(search, skillCategory).length === 0 && (
                  <Empty
                    title="Skill tidak ditemukan"
                    description="Coba kata kunci lain atau pilih Semua kemampuan."
                  />
                )}
              {tab === 'settings' && (
                <>
                  <Card
                    title="LLM lokal · tanpa API berbayar"
                    subtitle="Model belum diunduh sesuai pilihan lu. Jalankan Ollama dan unduh model pilihan sebelum memilihnya di bawah."
                  >
                    <div className={styles.row}>
                      <Badge status={state.llm.online ? 'active' : 'paused'} />
                      <span>
                        {state.llm.online
                          ? 'Ollama terdeteksi di PC ini'
                          : 'Ollama belum berjalan'}
                      </span>
                    </div>
                    <Field label="Model lokal yang tersedia">
                      <select
                        value={workspace.settings.model}
                        onChange={(e) =>
                          updateSettings('model', e.target.value)
                        }
                      >
                        <option value="">Pilih model</option>
                        {state.llm.models.map((m: string) => (
                          <option key={m}>{m}</option>
                        ))}
                      </select>
                    </Field>
                    <div className={styles.actions}>
                      <button
                        disabled={busy}
                        onClick={() =>
                          void act(load, 'Daftar model diperbarui.')
                        }
                      >
                        Periksa model
                      </button>
                      <button
                        className={styles.primary}
                        disabled={busy}
                        onClick={() => void saveWorkspace()}
                      >
                        Simpan pengaturan
                      </button>
                    </div>
                  </Card>
                  <Card title="Perilaku chatbot">
                    <div className={styles.twoCol}>
                      <Field label="Mode balasan">
                        <select
                          value={workspace.settings.chatbotMode}
                          onChange={(e) =>
                            updateSettings('chatbotMode', e.target.value)
                          }
                        >
                          <option value="off">
                            Mati — pemilik menangani pesan
                          </option>
                          <option value="draft">
                            Draft — AI menyarankan jawaban
                          </option>
                          <option
                            value="auto"
                            disabled={!state.messaging.ready || !modelReady}
                          >
                            Otomatis — FAQ, dengan pengalihan ke pemilik
                          </option>
                        </select>
                      </Field>
                      <Field label="Batas balasan dalam 24 jam">
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={workspace.settings.maxRepliesPerDay}
                          onChange={(e) =>
                            updateSettings(
                              'maxRepliesPerDay',
                              Number(e.target.value)
                            )
                          }
                        />
                      </Field>
                    </div>
                    <Field label="Pengenalan bot yang dikirim bersama balasan">
                      <textarea
                        rows={2}
                        maxLength={250}
                        value={workspace.settings.botDisclosure}
                        onChange={(e) =>
                          updateSettings('botDisclosure', e.target.value)
                        }
                      />
                    </Field>
                    <Field
                      label="Kata yang mengalihkan ke pemilik"
                      hint="Pisahkan dengan koma."
                    >
                      <textarea
                        rows={2}
                        value={workspace.settings.handoffWords}
                        onChange={(e) =>
                          updateSettings('handoffWords', e.target.value)
                        }
                      />
                    </Field>
                    {workspace.settings.chatbotMode === 'auto' &&
                      state.workspace.data.settings.chatbotMode !== 'auto' && (
                        <label className={styles.check}>
                          <input
                            type="checkbox"
                            checked={autoConfirmed}
                            onChange={(e) => setAutoConfirmed(e.target.checked)}
                          />
                          Saya mengizinkan balasan AI otomatis untuk pesan masuk
                          pada akun Meta yang saya hubungkan, sesuai FAQ dan
                          batas di atas.
                        </label>
                      )}
                    <button
                      className={styles.primary}
                      disabled={busy}
                      onClick={() => void saveWorkspace()}
                    >
                      Simpan pengaturan chatbot
                    </button>
                    <p className={styles.muted}>
                      Mode otomatis memerlukan model lokal, FAQ, webhook HTTPS,
                      dan izin messaging Meta. Balasan hanya untuk pesan masuk
                      dalam jendela 24 jam. Tidak ada DM massal.
                    </p>
                  </Card>
                  <Card title="Status integrasi">
                    <div className={styles.checklist}>
                      <p>
                        Publikasi: editor dan kalender Postiz yang sudah ada.
                      </p>
                      <p>
                        Riset: halaman HTTPS publik dan impor catatan; bukan
                        scraping akun privat.
                      </p>
                      <p>
                        Instagram / Facebook messaging:{' '}
                        {state.messaging.ready
                          ? 'dikonfigurasi; pastikan webhook terverifikasi'
                          : 'belum dikonfigurasi'}
                        .
                      </p>
                      <p>TikTok DM: belum didukung konektor ini.</p>
                      <p>
                        Generasi gambar/video: brief tersedia; alat eksternal
                        belum diaktifkan.
                      </p>
                    </div>
                  </Card>
                </>
              )}
            </>
          )}
        </main>
      </div>
      {importPreview && (
        <Modal
          label="Pratinjau import profil"
          onClose={() => setImportPreview(null)}
        >
          <div className={styles.row}>
            <h2>Pratinjau import profil</h2>
            <button onClick={() => setImportPreview(null)}>Batal import</button>
          </div>
          <p>
            {importPreview.filename} · Pilih kolom yang ingin diterapkan. Kolom
            lain tetap memakai data sekarang.
          </p>
          {importPreview.ignored.length > 0 && (
            <p className={styles.muted}>
              Kolom tidak dikenali: {importPreview.ignored.join(', ')}
            </p>
          )}
          {importPreview.fields.map((key: string) => (
            <section className={styles.importField} key={key}>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={importFields.includes(key)}
                  onChange={(e) =>
                    setImportFields(
                      e.target.checked
                        ? [...importFields, key]
                        : importFields.filter((k) => k !== key)
                    )
                  }
                />
                {brandLabels[key]}
              </label>
              <small>Sekarang</small>
              <pre>{String(workspace.brand[key] || 'Belum diisi')}</pre>
              <small>Dari file</small>
              <pre>
                {Array.isArray(importPreview.brand[key])
                  ? importPreview.brand[key].join('\n')
                  : importPreview.brand[key] || '(kosong)'}
              </pre>
            </section>
          ))}
          <div className={styles.actions}>
            <button
              className={styles.primary}
              disabled={!importFields.length}
              onClick={() => {
                const patch = Object.fromEntries(
                  importFields.map((k) => [k, importPreview.brand[k]])
                );
                setWorkspace({
                  ...workspace,
                  brand: { ...workspace.brand, ...patch },
                });
                setImportPreview(null);
                setNotice(
                  'Data import diterapkan ke form. Klik Simpan profil brand untuk menyimpan.'
                );
              }}
            >
              Terapkan ke profil
            </button>
          </div>
        </Modal>
      )}
      {skillPicker && (
        <Modal
          label="Pilih agentic skill"
          onClose={() => setSkillPicker(false)}
        >
          <div className={styles.row}>
            <h2>Pilih agentic skill</h2>
            <button onClick={() => setSkillPicker(false)}>
              Selesai memilih
            </button>
          </div>
          <div className={styles.twoCol}>
            <Field label="Cari agentic skill">
              <input
                autoFocus
                type="search"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder="Cari nama atau kemampuan skill…"
              />
            </Field>
            <Field label="Filter kemampuan agent">
              <select
                value={pickerCategory}
                onChange={(e) => setPickerCategory(e.target.value)}
              >
                {categoryOptions}
              </select>
            </Field>
          </div>
          <p role="status" className={styles.muted}>
            {chosenSkills.length}/6 dipilih ·{' '}
            {filteredSkills(pickerSearch, pickerCategory).length} skill
            ditemukan. Kosongkan pilihan untuk pemilihan otomatis.
          </p>
          <div className={styles.skillList}>
            {filteredSkills(pickerSearch, pickerCategory).map((skill: any) => (
              <label className={styles.skillOption} key={skill.id}>
                <input
                  type="checkbox"
                  checked={chosenSkills.includes(skill.id)}
                  disabled={
                    skill.mode !== 'text' ||
                    (!chosenSkills.includes(skill.id) &&
                      chosenSkills.length >= 6)
                  }
                  onChange={() => toggleSkill(skill.id)}
                />
                <span>
                  <strong>{skill.name || skill.id}</strong>
                  <small>
                    {
                      skillCategories[
                        skill.category as keyof typeof skillCategories
                      ]
                    }
                    {skill.custom ? ' · Buatan sendiri' : ''}
                  </small>
                  <p>{skill.description}</p>
                  {skill.mode !== 'text' && (
                    <small>
                      {skill.mode === 'brief-only'
                        ? 'Memerlukan alat media; tersedia sebagai panduan di Pustaka skill.'
                        : 'Publikasi melalui editor Postiz; tersedia sebagai panduan.'}
                    </small>
                  )}
                </span>
              </label>
            ))}
            {!filteredSkills(pickerSearch, pickerCategory).length && (
              <Empty
                title="Skill tidak ditemukan"
                description="Ubah kata kunci atau filter kemampuan."
              />
            )}
          </div>
        </Modal>
      )}
      {creatingSkill && (
        <Modal
          label="Buat skill sendiri"
          onClose={() => {
            if (!busy) setCreatingSkill(false);
          }}
        >
          <div className={styles.row}>
            <h2>Buat skill sendiri</h2>
            <button disabled={busy} onClick={() => setCreatingSkill(false)}>
              Batal
            </button>
          </div>
          <p className={styles.muted}>
            Skill disimpan sebagai panduan kerja agent di workspace ini. Isi
            tujuan, langkah kerja, batasan, dan bentuk hasil yang diinginkan.
          </p>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void act(async () => {
                await api('/skills', 'POST', customSkill);
                setCreatingSkill(false);
                setCustomSkill({ ...blankSkill });
              }, 'Skill disimpan dan tersedia di pemilih agent.');
            }}
          >
            <Field label="Nama skill">
              <input
                autoFocus
                required
                minLength={3}
                maxLength={100}
                value={customSkill.name}
                onChange={(e) =>
                  setCustomSkill({ ...customSkill, name: e.target.value })
                }
              />
            </Field>
            <Field label="Kemampuan utama">
              <select
                value={customSkill.category}
                onChange={(e) =>
                  setCustomSkill({ ...customSkill, category: e.target.value })
                }
              >
                {Object.entries(skillCategories).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Deskripsi skill">
              <textarea
                required
                rows={2}
                minLength={10}
                maxLength={1000}
                value={customSkill.description}
                onChange={(e) =>
                  setCustomSkill({
                    ...customSkill,
                    description: e.target.value,
                  })
                }
              />
            </Field>
            <Field
              label="Instruksi agent"
              hint="Panduan teks/Markdown, 30–18.000 karakter. Skill tidak menambah akses alat atau publikasi otomatis."
            >
              <textarea
                required
                rows={9}
                minLength={30}
                maxLength={18000}
                value={customSkill.instructions}
                onChange={(e) =>
                  setCustomSkill({
                    ...customSkill,
                    instructions: e.target.value,
                  })
                }
                placeholder={
                  'Tujuan:\n\nLangkah kerja:\n1. Baca profil brand.\n2. ...\n\nBatasan:\n\nFormat hasil:'
                }
              />
            </Field>
            <button className={styles.primary} disabled={busy}>
              {busy ? 'Menyimpan…' : 'Simpan skill'}
            </button>
          </form>
        </Modal>
      )}
      {skillText && (
        <Modal
          label={`Panduan ${skillText.id}`}
          onClose={() => setSkillText(null)}
        >
          <div className={styles.row}>
            <h2>{skillText.id}</h2>
            <button autoFocus onClick={() => setSkillText(null)}>
              Tutup panduan
            </button>
          </div>
          <pre>{skillText.content}</pre>
        </Modal>
      )}
      {confirmMessage && (
        <Modal
          label="Konfirmasi balasan"
          onClose={() => setConfirmMessage(null)}
        >
          <h2>Kirim balasan ke {confirmMessage.title}?</h2>
          <p>
            Pesan berikut dikirim ke pelanggan yang mengirim pesan ini melalui{' '}
            {confirmMessage.data.platform}.
          </p>
          <pre>
            {workspace.settings.botDisclosure +
              '\n\n' +
              (replyEdits[confirmMessage.id] ?? confirmMessage.data.reply)}
          </pre>
          <div className={styles.actions}>
            <button autoFocus onClick={() => setConfirmMessage(null)}>
              Batal
            </button>
            <button
              className={styles.primary}
              disabled={busy}
              onClick={() =>
                void act(async () => {
                  await api(`/inbox/${confirmMessage.id}/approve`, 'POST', {
                    reply:
                      replyEdits[confirmMessage.id] ??
                      confirmMessage.data.reply,
                    revision: confirmMessage.revision,
                    confirmed: true,
                  });
                  setConfirmMessage(null);
                }, 'Balasan disetujui dan masuk antrean pengiriman.')
              }
            >
              Ya, kirim balasan
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
