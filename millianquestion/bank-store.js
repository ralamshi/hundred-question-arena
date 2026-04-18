// Shared bank storage — multiple question banks keyed by code (A, B, C...)
// Schema v2 in localStorage:
//   quiz_banks_v2 = { banks: { "A": { code, name, questions: [...] }, ... }, activeCode: "A" }
// Back-compat: if old quiz_questions_v1 exists (no v2), migrate as bank "A".

window.BankStore = (function() {
  const V2_KEY = 'quiz_banks_v2';
  const V1_KEY = 'quiz_questions_v1';

  function defaultState() {
    return {
      banks: {
        'A': {
          code: 'A',
          name: '預設題庫',
          questions: window.DEFAULT_QUESTIONS.map(q => ({...q, choices: [...q.choices]}))
        }
      },
      activeCode: 'A'
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(V2_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.banks && parsed.activeCode) return parsed;
      }
    } catch (e) {}
    // Try migrating v1
    try {
      const v1 = localStorage.getItem(V1_KEY);
      if (v1) {
        const qs = JSON.parse(v1);
        if (Array.isArray(qs)) {
          const st = defaultState();
          st.banks['A'].questions = qs;
          st.banks['A'].name = '預設題庫 A';
          save(st);
          return st;
        }
      }
    } catch (e) {}
    const fresh = defaultState();
    save(fresh);
    return fresh;
  }

  function save(state) {
    localStorage.setItem(V2_KEY, JSON.stringify(state));
  }

  function getActiveQuestions() {
    const s = load();
    return s.banks[s.activeCode]?.questions || [];
  }

  function getActiveBank() {
    const s = load();
    return s.banks[s.activeCode];
  }

  function listBanks() {
    const s = load();
    return Object.values(s.banks).sort((a, b) => a.code.localeCompare(b.code));
  }

  function setActive(code) {
    const s = load();
    if (s.banks[code]) {
      s.activeCode = code;
      save(s);
    }
    return s;
  }

  function saveQuestions(qs) {
    const s = load();
    if (!s.banks[s.activeCode]) return s;
    s.banks[s.activeCode].questions = qs;
    save(s);
    return s;
  }

  function saveQuestionsTo(code, qs) {
    const s = load();
    if (!s.banks[code]) return s;
    s.banks[code].questions = qs;
    save(s);
    return s;
  }

  function createBank(code, name) {
    code = (code || '').trim().toUpperCase();
    if (!code) throw new Error('代號不可為空');
    if (!/^[A-Z0-9]{1,4}$/.test(code)) throw new Error('代號只能用 A-Z 或 0-9，最多 4 字');
    const s = load();
    if (s.banks[code]) throw new Error(`代號「${code}」已存在`);
    s.banks[code] = {
      code,
      name: name?.trim() || `題庫 ${code}`,
      questions: []
    };
    s.activeCode = code;
    save(s);
    return s;
  }

  function duplicateBank(fromCode, newCode, newName) {
    newCode = (newCode || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{1,4}$/.test(newCode)) throw new Error('代號只能用 A-Z 或 0-9，最多 4 字');
    const s = load();
    if (s.banks[newCode]) throw new Error(`代號「${newCode}」已存在`);
    const src = s.banks[fromCode];
    if (!src) throw new Error('找不到來源題庫');
    s.banks[newCode] = {
      code: newCode,
      name: newName?.trim() || `${src.name} · 副本`,
      questions: src.questions.map(q => ({...q, choices: [...q.choices]}))
    };
    s.activeCode = newCode;
    save(s);
    return s;
  }

  function renameBank(code, name) {
    const s = load();
    if (s.banks[code]) {
      s.banks[code].name = (name || '').trim() || s.banks[code].name;
      save(s);
    }
    return s;
  }

  function deleteBank(code) {
    const s = load();
    if (!s.banks[code]) return s;
    if (Object.keys(s.banks).length <= 1) throw new Error('至少需保留一個題庫');
    delete s.banks[code];
    if (s.activeCode === code) s.activeCode = Object.keys(s.banks)[0];
    save(s);
    return s;
  }

  return {
    load, save,
    getActiveQuestions, getActiveBank, listBanks,
    setActive, saveQuestions, saveQuestionsTo,
    createBank, duplicateBank, renameBank, deleteBank
  };
})();
