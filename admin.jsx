// Admin — manage multiple question banks (A, B, C...) via BankStore
const { useState, useEffect, useMemo, useRef } = React;

const LETTERS = ['A', 'B', 'C', 'D'];

function blankQuestion(nextId, points = 10) {
  return { id: nextId, points, difficulty: 1, question: '', choices: ['', '', '', ''], correct: 0 };
}

function DiffDots({ level }) {
  return (
    <span className="q-diff">
      {[1, 2, 3, 4, 5].map(i => <i key={i} className={i <= level ? 'on' : ''}></i>)}
    </span>
  );
}

function Toast({ msg, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [msg]);
  return <div className={`toast ${type || ''}`}>{msg}</div>;
}

/* ─────────── Bank bar ─────────── */
function BankBar({ banks, activeCode, onSelect, onNew, onDuplicate, onRename, onDelete }) {
  return (
    <div className="bank-bar">
      <div className="bank-bar-label">
        <div className="bank-bar-label-zh">題 庫 代 號</div>
        <div className="bank-bar-label-en">Bank Code</div>
      </div>
      <div className="bank-chips">
        {banks.map(b => (
          <button
            key={b.code}
            className={`bank-chip ${b.code === activeCode ? 'active' : ''}`}
            onClick={() => onSelect(b.code)}
            title={b.name}
          >
            <span className="bank-chip-code">{b.code}</span>
            <span className="bank-chip-name">{b.name}</span>
            <span className="bank-chip-count">{b.questions.length}</span>
          </button>
        ))}
        <button className="bank-chip bank-chip-new" onClick={onNew} title="新增題庫">
          <span className="bank-chip-code">＋</span>
          <span className="bank-chip-name">新增題庫</span>
        </button>
      </div>
      <div className="bank-bar-actions">
        <button className="btn small" onClick={onRename}>更 名</button>
        <button className="btn small" onClick={onDuplicate}>複 製</button>
        <button className="btn small danger" onClick={onDelete}>刪 除</button>
      </div>
    </div>
  );
}

/* ─────────── Bank dialog (create / duplicate / rename) ─────────── */
function BankDialog({ mode, defaultCode, defaultName, onSubmit, onClose }) {
  const [code, setCode] = useState(defaultCode || '');
  const [name, setName] = useState(defaultName || '');
  const [err, setErr] = useState(null);

  const titles = {
    new: '新 增 題 庫', duplicate: '複 製 題 庫', rename: '重 新 命 名'
  };

  function submit() {
    try { onSubmit({ code: code.trim().toUpperCase(), name: name.trim() }); }
    catch (e) { setErr(e.message || '操作失敗'); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{minWidth: 400, maxWidth: 480}}>
        <div className="modal-title">{titles[mode]}</div>
        <div className="modal-sub">{mode === 'rename' ? 'Rename bank' : 'Choose a unique code (A–Z, 0–9)'}</div>
        {mode !== 'rename' && (
          <div className="field">
            <label className="field-label">代號 Code · 例如 A / B / C</label>
            <input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase().slice(0, 4))}
              placeholder="B"
              style={{letterSpacing: '0.2em', fontFamily: "'JetBrains Mono', monospace"}}
              autoFocus
            />
          </div>
        )}
        <div className="field">
          <label className="field-label">名稱 Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="題庫名稱" autoFocus={mode === 'rename'} />
        </div>
        {err && <div style={{color: 'var(--crimson)', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '0.1em'}}>⚠ {err}</div>}
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>取 消</button>
          <button className="btn primary" onClick={submit}>確 定</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Import modal ─────────── */
function ImportModal({ onImport, onClose }) {
  const [text, setText] = useState('');
  const [err, setErr] = useState(null);

  function parseCSVLine(line) {
    const r = []; let cur = ''; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
      else if (ch === ',' && !inQ) { r.push(cur); cur = ''; }
      else cur += ch;
    }
    r.push(cur); return r.map(s => s.trim());
  }

  function handleImport() {
    setErr(null);
    try {
      let data;
      try { data = JSON.parse(text); }
      catch {
        const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
        data = lines.map((line, i) => {
          const parts = parseCSVLine(line);
          if (parts.length < 6) throw new Error(`第 ${i+1} 行欄位不足`);
          return {
            id: i + 1,
            question: parts[0],
            choices: [parts[1], parts[2], parts[3], parts[4]],
            correct: parseInt(parts[5], 10),
            points: parts[6] ? parseInt(parts[6], 10) : 10 * Math.pow(2, i),
            difficulty: Math.min(5, Math.max(1, Math.floor(i / 2) + 1)),
          };
        });
      }
      if (!Array.isArray(data)) throw new Error('資料必須是陣列');
      const cleaned = data.map((q, i) => ({
        id: q.id ?? i + 1,
        question: String(q.question || '').trim(),
        choices: (q.choices || []).slice(0, 4).map(c => String(c).trim()),
        correct: Number(q.correct) || 0,
        points: Number(q.points) || 10,
        difficulty: Number(q.difficulty) || 1,
      }));
      for (const q of cleaned) {
        if (!q.question) throw new Error('有題目為空');
        if (q.choices.length !== 4) throw new Error('每題必須有 4 個選項');
        if (q.correct < 0 || q.correct > 3) throw new Error('正確答案編號必須是 0-3');
      }
      onImport(cleaned);
    } catch (e) { setErr(e.message || '解析失敗'); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">批 量 貼 上</div>
        <div className="modal-sub">Paste JSON or CSV · Imports into active bank</div>
        <div style={{fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--ink-dim)', marginBottom: 10, letterSpacing: '0.1em', lineHeight: 1.6}}>
          <strong style={{color: 'var(--gold-400)'}}>JSON:</strong> [{"{"}"question":"...","choices":["A","B","C","D"],"correct":0,"points":10{"}"}]<br/>
          <strong style={{color: 'var(--gold-400)'}}>CSV:</strong> question,A,B,C,D,correctIndex,points
        </div>
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder={`[\n  {\n    "question": "…",\n    "choices": ["A","B","C","D"],\n    "correct": 0,\n    "points": 10\n  }\n]`} />
        {err && <div style={{color: 'var(--crimson)', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginTop: 8, letterSpacing: '0.1em'}}>⚠ {err}</div>}
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>取 消</button>
          <button className="btn primary" onClick={handleImport} disabled={!text.trim()}>匯 入（覆蓋）</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Editor ─────────── */
function Editor({ question, onChange, onSave, onCancel, onDelete, isNew }) {
  if (!question) {
    return (
      <div className="editor">
        <div className="editor-title">題 目 編 輯</div>
        <div className="empty-state">從左側選擇題目進行編輯<br/>或點擊「新增題目」開始</div>
      </div>
    );
  }
  const update = (f, v) => onChange({...question, [f]: v});
  const updateChoice = (i, v) => {
    const c = [...question.choices]; c[i] = v; onChange({...question, choices: c});
  };
  return (
    <div className="editor">
      <div className="editor-title">{isNew ? '新 增 題 目' : '題 目 編 輯'}</div>
      <div className="field">
        <label className="field-label">題目 Question</label>
        <textarea value={question.question} onChange={e => update('question', e.target.value)} placeholder="輸入題目內容…" />
      </div>
      <div className="field">
        <label className="field-label">選項 Choices · 點擊字母設為正確答案</label>
        {question.choices.map((c, i) => (
          <div key={i} className="choice-row">
            <button
              className={`choice-letter ${question.correct === i ? 'correct' : ''}`}
              onClick={() => update('correct', i)}
              title={question.correct === i ? '正確答案' : '設為正確答案'}
            >{LETTERS[i]}</button>
            <input value={c} onChange={e => updateChoice(i, e.target.value)} placeholder={`選項 ${LETTERS[i]}`} />
          </div>
        ))}
      </div>
      <div className="field-row">
        <div className="field">
          <label className="field-label">分數 Points</label>
          <input type="number" min="1" value={question.points} onChange={e => update('points', Math.max(1, parseInt(e.target.value) || 1))} />
        </div>
        <div className="field">
          <label className="field-label">難度 Difficulty 1–5</label>
          <select value={question.difficulty} onChange={e => update('difficulty', parseInt(e.target.value))}>
            {[1,2,3,4,5].map(n => <option key={n} value={n}>{'◆'.repeat(n)} ({n})</option>)}
          </select>
        </div>
      </div>
      <div className="editor-actions">
        {!isNew && <button className="btn danger" onClick={onDelete}>刪 除</button>}
        <button className="btn" onClick={onCancel}>取 消</button>
        <button className="btn primary" onClick={onSave}>{isNew ? '新 增' : '儲 存'}</button>
      </div>
    </div>
  );
}

/* ─────────── Main App ─────────── */
function AdminApp() {
  const [state, setState] = useState(() => window.BankStore.load());
  const [activeId, setActiveId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [sortBy, setSortBy] = useState('order');
  const [importOpen, setImportOpen] = useState(false);
  const [bankDialog, setBankDialog] = useState(null); // {mode, defaultCode, defaultName}
  const [toast, setToast] = useState(null);
  const fileRef = useRef();

  const banks = useMemo(() => Object.values(state.banks).sort((a,b) => a.code.localeCompare(b.code)), [state]);
  const activeBank = state.banks[state.activeCode];
  const questions = activeBank?.questions || [];

  const sorted = useMemo(() => {
    const arr = [...questions];
    if (sortBy === 'points-asc') arr.sort((a,b) => a.points - b.points);
    else if (sortBy === 'points-desc') arr.sort((a,b) => b.points - a.points);
    else if (sortBy === 'difficulty-asc') arr.sort((a,b) => a.difficulty - b.difficulty);
    else if (sortBy === 'difficulty-desc') arr.sort((a,b) => b.difficulty - a.difficulty);
    return arr;
  }, [questions, sortBy]);

  const showToast = (msg, type) => setToast({msg, type});
  const refresh = () => setState(window.BankStore.load());

  function updateQuestions(next) {
    window.BankStore.saveQuestions(next);
    refresh();
  }

  function handleSelectBank(code) {
    window.BankStore.setActive(code);
    setDraft(null); setActiveId(null); setIsNew(false);
    refresh();
    showToast(`已切換至題庫 ${code}`);
  }

  function handleSelect(q) {
    setActiveId(q.id);
    setDraft({...q, choices: [...q.choices]});
    setIsNew(false);
  }

  function handleNew() {
    const nextId = Math.max(0, ...questions.map(q => q.id || 0)) + 1;
    const lastPts = questions.length > 0 ? questions[questions.length - 1].points * 2 : 10;
    setDraft(blankQuestion(nextId, lastPts));
    setActiveId(null); setIsNew(true);
  }

  function handleSaveDraft() {
    if (!draft.question.trim()) { showToast('題目不可為空', 'error'); return; }
    if (draft.choices.some(c => !c.trim())) { showToast('選項不可為空', 'error'); return; }
    const next = isNew ? [...questions, draft] : questions.map(q => q.id === draft.id ? draft : q);
    updateQuestions(next);
    setActiveId(draft.id); setIsNew(false);
    showToast(isNew ? '已新增題目' : '已儲存變更');
  }

  function handleCancelDraft() { setDraft(null); setActiveId(null); setIsNew(false); }

  function handleDelete() {
    if (!confirm('確定刪除這一題？')) return;
    updateQuestions(questions.filter(q => q.id !== draft.id));
    setDraft(null); setActiveId(null);
    showToast('已刪除');
  }

  function handleMove(q, dir) {
    const idx = questions.findIndex(x => x.id === q.id);
    const ni = idx + dir;
    if (ni < 0 || ni >= questions.length) return;
    const next = [...questions];
    [next[idx], next[ni]] = [next[ni], next[idx]];
    updateQuestions(next);
  }

  function handleExport() {
    const payload = { code: activeBank.code, name: activeBank.name, questions };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `題庫-${activeBank.code}-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`已匯出題庫 ${activeBank.code}`);
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        // Accept either a raw array or {code, name, questions}
        const qs = Array.isArray(data) ? data : data.questions;
        if (!Array.isArray(qs)) throw new Error();
        updateQuestions(qs);
        showToast(`已匯入 ${qs.length} 題`);
      } catch { showToast('檔案格式錯誤', 'error'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleImportBulk(data) {
    updateQuestions(data);
    setImportOpen(false);
    setDraft(null); setActiveId(null);
    showToast(`已匯入 ${data.length} 題`);
  }

  // ─── Bank operations ───
  function handleNewBank() {
    // Suggest next letter
    const used = new Set(banks.map(b => b.code));
    let suggest = 'A';
    for (const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') { if (!used.has(c)) { suggest = c; break; } }
    setBankDialog({ mode: 'new', defaultCode: suggest, defaultName: `題庫 ${suggest}` });
  }
  function handleDuplicateBank() {
    const used = new Set(banks.map(b => b.code));
    let suggest = 'B';
    for (const c of 'BCDEFGHIJKLMNOPQRSTUVWXYZ') { if (!used.has(c)) { suggest = c; break; } }
    setBankDialog({ mode: 'duplicate', defaultCode: suggest, defaultName: `${activeBank.name} · 副本` });
  }
  function handleRenameBank() {
    setBankDialog({ mode: 'rename', defaultCode: activeBank.code, defaultName: activeBank.name });
  }
  function handleDeleteBank() {
    if (banks.length <= 1) { showToast('至少需保留一個題庫', 'error'); return; }
    if (!confirm(`確定刪除題庫 ${activeBank.code}「${activeBank.name}」？此動作無法還原。`)) return;
    try {
      window.BankStore.deleteBank(activeBank.code);
      setDraft(null); setActiveId(null);
      refresh();
      showToast(`已刪除題庫 ${activeBank.code}`);
    } catch (e) { showToast(e.message, 'error'); }
  }

  function handleBankDialogSubmit({ code, name }) {
    try {
      if (bankDialog.mode === 'new') window.BankStore.createBank(code, name);
      else if (bankDialog.mode === 'duplicate') window.BankStore.duplicateBank(activeBank.code, code, name);
      else if (bankDialog.mode === 'rename') window.BankStore.renameBank(activeBank.code, name);
      setBankDialog(null);
      setDraft(null); setActiveId(null);
      refresh();
      showToast({new: '已新增題庫', duplicate: '已複製題庫', rename: '已更名'}[bankDialog.mode]);
    } catch (e) { throw e; }
  }

  const totalPoints = questions.reduce((a, q) => a + (q.points || 0), 0);

  return (
    <>
      <div className="admin-header">
        <div>
          <div className="admin-title">題 目 後 台</div>
          <div className="admin-sub">Question Bank · Admin Console</div>
        </div>
        <div className="admin-actions">
          <a className="back-link" href="index.html">← 返 回 遊 戲</a>
          <button className="btn" onClick={() => fileRef.current?.click()}>匯 入 檔 案</button>
          <input ref={fileRef} type="file" accept=".json,application/json" onChange={handleImportFile} style={{display: 'none'}} />
          <button className="btn" onClick={() => setImportOpen(true)}>批 量 貼 上</button>
          <button className="btn" onClick={handleExport}>匯 出 JSON</button>
          <button className="btn primary" onClick={handleNew}>+ 新 增 題 目</button>
        </div>
      </div>

      <BankBar
        banks={banks}
        activeCode={state.activeCode}
        onSelect={handleSelectBank}
        onNew={handleNewBank}
        onDuplicate={handleDuplicateBank}
        onRename={handleRenameBank}
        onDelete={handleDeleteBank}
      />

      <div className="stats">
        <div className="stat">
          <div className="stat-label">當前題庫 Active Bank</div>
          <div className="stat-value"><span style={{fontFamily: "'JetBrains Mono', monospace", fontSize: 22, marginRight: 8}}>【{activeBank?.code}】</span>{activeBank?.name}</div>
        </div>
        <div className="stat">
          <div className="stat-label">題目數 Questions</div>
          <div className="stat-value">{questions.length}</div>
        </div>
        <div className="stat">
          <div className="stat-label">最高分 Max Score</div>
          <div className="stat-value">{totalPoints.toLocaleString()}</div>
        </div>
        <div className="stat">
          <div className="stat-label">平均難度 Avg Diff</div>
          <div className="stat-value">
            {questions.length > 0 ? (questions.reduce((a,q) => a+(q.difficulty||1), 0) / questions.length).toFixed(1) : '—'}
          </div>
        </div>
      </div>

      <div className="admin-body">
        <div>
          <div className="list-header">
            <div className="list-title">題 目 列 表</div>
            <div className="sort-controls">
              <span>排序</span>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="order">預設順序</option>
                <option value="points-asc">分數 ↑</option>
                <option value="points-desc">分數 ↓</option>
                <option value="difficulty-asc">難度 ↑</option>
                <option value="difficulty-desc">難度 ↓</option>
              </select>
            </div>
          </div>
          <div className="question-list">
            {sorted.length === 0 && <div className="empty-state">題庫 {activeBank?.code} 沒有題目。<br/>點擊「新增題目」開始。</div>}
            {sorted.map((q) => (
              <div
                key={q.id}
                className={`q-card ${activeId === q.id ? 'active' : ''}`}
                onClick={() => handleSelect(q)}
              >
                <div className="q-top">
                  <div className="q-meta">
                    <span>#{String(questions.indexOf(q) + 1).padStart(2, '0')}</span>
                    <span className="q-points">{q.points?.toLocaleString() ?? 0} pts</span>
                    <DiffDots level={q.difficulty || 1} />
                  </div>
                  <div className="q-actions" onClick={e => e.stopPropagation()}>
                    {sortBy === 'order' && (
                      <>
                        <button className="q-icon-btn" onClick={() => handleMove(q, -1)} title="上移">↑</button>
                        <button className="q-icon-btn" onClick={() => handleMove(q, 1)} title="下移">↓</button>
                      </>
                    )}
                  </div>
                </div>
                <div className="q-text">{q.question || '(無題目)'}</div>
                <div className="q-preview">
                  {q.choices.map((c, j) => (
                    <span key={j} className={q.correct === j ? 'correct' : ''}>
                      {LETTERS[j]}. {c || '—'}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Editor
          question={draft}
          onChange={setDraft}
          onSave={handleSaveDraft}
          onCancel={handleCancelDraft}
          onDelete={handleDelete}
          isNew={isNew}
        />
      </div>

      {importOpen && <ImportModal onImport={handleImportBulk} onClose={() => setImportOpen(false)} />}
      {bankDialog && <BankDialog
        mode={bankDialog.mode}
        defaultCode={bankDialog.defaultCode}
        defaultName={bankDialog.defaultName}
        onSubmit={handleBankDialogSubmit}
        onClose={() => setBankDialog(null)}
      />}
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<AdminApp />);
