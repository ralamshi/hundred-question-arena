// 百問擂台 — main game component
const { useState, useEffect, useRef, useMemo } = React;

const LETTERS = ['A', 'B', 'C', 'D'];
const STORAGE_KEY = 'quiz_questions_v1';

async function fetchQuestions(bankCode = 'A') {
  const defaultQuestions = window.BankStore ? window.BankStore.getActiveQuestions() : window.DEFAULT_QUESTIONS;

  if (!window.GOOGLE_SHEETS_URL_BASE || !window.GOOGLE_SHEETS_BANKS) {
    return defaultQuestions;
  }

  const bankConfig = window.GOOGLE_SHEETS_BANKS.find(b => b.code === bankCode) || window.GOOGLE_SHEETS_BANKS[0];
  const fetchUrl = `${window.GOOGLE_SHEETS_URL_BASE}?output=csv&gid=${bankConfig.gid}`;

  try {
    const res = await fetch(fetchUrl);
    if (!res.ok) throw new Error('Fetch failed');
    const text = await res.text();
    const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
    
    const parseCSVLine = (line) => {
      const r = []; let cur = ''; let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
        else if (ch === ',' && !inQ) { r.push(cur); cur = ''; }
        else cur += ch;
      }
      r.push(cur); return r.map(s => s.trim());
    };

    let startIndex = 0;
    if (lines[0] && (lines[0].includes('問題') || lines[0].includes('Question'))) {
      startIndex = 1;
    }

    const data = [];
    for (let i = startIndex; i < lines.length; i++) {
      const parts = parseCSVLine(lines[i]);
      if (parts.length < 6) continue;
      data.push({
        id: i,
        question: parts[0],
        choices: [parts[1], parts[2], parts[3], parts[4]],
        correct: parseInt(parts[5], 10) || 0,
        points: parts[6] ? parseInt(parts[6], 10) : 10 * Math.pow(2, i - startIndex),
        difficulty: parts[7] ? parseInt(parts[7], 10) : Math.min(5, Math.max(1, Math.floor((i - startIndex) / 2) + 1)),
      });
    }

    if (data.length > 0) return data;
    return defaultQuestions;
  } catch (err) {
    console.error('Failed to load Google Sheets CSV:', err);
    return defaultQuestions;
  }
}

function shuffleChoicesIfNeeded(q) {
  return q; // keep as authored
}

function Splash({ onStart, onAdmin, questionCount, activeBank, banks, onSelectBank, isLoading }) {
  return (
    <div className="splash">
      <div className="splash-logo">Q</div>
      <div className="splash-brand">
        <div className="splash-title">百問擂台</div>
      </div>
      <div className="splash-meta">
        四個選擇題。三條求助。<br/>
        答對一條，分數翻倍。答錯不扣分，繼續挑戰。
        {isLoading && <div style={{marginTop: '1rem', color: 'var(--gold-400)'}}>正在從 Google 試算表載入最新題庫...</div>}
        {!isLoading && window.GOOGLE_SHEETS_URL_BASE && <div style={{marginTop: '1rem', color: 'var(--ink-dim)', fontSize: 13}}>※ 已啟用多重線上雲端題庫 ※</div>}
      </div>
      {banks && banks.length > 0 && (
        <div className="splash-banks">
          <div className="splash-banks-label">題 庫 代 號 · Bank</div>
          <div className="splash-bank-chips">
            {banks.map(b => (
              <button
                key={b.code}
                className={`splash-bank-chip ${b.code === activeBank?.code ? 'active' : ''}`}
                onClick={() => onSelectBank(b.code)}
              >
                <span className="splash-bank-chip-code">{b.code}</span>
                <span className="splash-bank-chip-name">{b.name}</span>
                <span className="splash-bank-chip-count">{b.questions.length} 題</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="splash-actions">
        <button className="btn primary" onClick={onStart} disabled={isLoading || questionCount === 0}>
          {isLoading ? '載 入 中...' : '開 始 遊 戲'}
        </button>
        <button className="btn" onClick={onAdmin}>進 入 後 台</button>
      </div>
    </div>
  );
}

function Lifelines({ state, onUse, disabled }) {
  const items = [
    { key: 'fifty', name: '對半消除', desc: '50 : 50', icon: '50' },
    { key: 'audience', name: '現場投票', desc: 'Ask Audience', icon: '⌘' },
    { key: 'phone', name: '打電話問朋友', desc: 'Call a Friend', icon: '☏' },
  ];
  return (
    <div className="side-panel left">
      <div className="panel-label">求 助 Lifelines</div>
      {items.map(it => (
        <div
          key={it.key}
          className={`lifeline ${state[it.key] ? 'used' : ''} ${disabled ? 'disabled' : ''}`}
          onClick={() => !state[it.key] && !disabled && onUse(it.key)}
        >
          <div className="lifeline-icon">{it.icon}</div>
          <div className="lifeline-text">
            <div className="lifeline-name">{it.name}</div>
            <div className="lifeline-desc">{it.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Ladder({ questions, currentIndex, score, justPassed }) {
  // Show highest question at top, Q1 at bottom (Millionaire-style ascending ladder)
  const ordered = questions.map((q, i) => ({q, i})).reverse();
  return (
    <div className="side-panel right">
      <div className="panel-label">分 數 階 梯</div>
      <div className="ladder">
        {ordered.map(({q, i}) => {
          const isCurrent = i === currentIndex;
          const isPassed = i < currentIndex;
          const isMilestone = (i + 1) % 5 === 0;
          const isJustPassed = justPassed === i;
          return (
            <div key={i} className={`rung ${isCurrent ? 'current' : ''} ${isPassed ? 'passed' : ''} ${isMilestone ? 'milestone' : ''} ${isJustPassed ? 'just-passed' : ''}`}>
              <span className="rung-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="rung-pts">{q.points.toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuestionStage({ question, index, total }) {
  return (
    <div className="question-stage">
      <div className="question-num">Q {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</div>
      <div className="question-text">{question.question}</div>
    </div>
  );
}

function Answers({ choices, selected, locked, correct, wrong, eliminated, onSelect, disabled }) {
  return (
    <div className="answers">
      {choices.map((c, i) => {
        const classes = ['answer'];
        if (eliminated.includes(i)) classes.push('eliminated');
        if (selected === i && !locked) classes.push('selected');
        if (correct === i) classes.push('correct');
        if (wrong === i) classes.push('wrong');
        if (disabled) classes.push('disabled');
        return (
          <div
            key={i}
            className={classes.join(' ')}
            onClick={() => !disabled && !eliminated.includes(i) && onSelect(i)}
          >
            <div className="answer-letter">{LETTERS[i]}:</div>
            <div className="answer-text">{c}</div>
          </div>
        );
      })}
    </div>
  );
}

function AudienceModal({ question, eliminated, onClose }) {
  const [pcts, setPcts] = useState([0, 0, 0, 0]);
  const [targetPcts, setTargetPcts] = useState([0, 0, 0, 0]);

  useEffect(() => {
    const correct = question.correct;
    const raw = [0, 0, 0, 0];
    const correctPct = 45 + Math.floor(Math.random() * 25);
    raw[correct] = correctPct;
    let remaining = 100 - correctPct;
    const others = [0, 1, 2, 3].filter(i => i !== correct && !eliminated.includes(i));
    eliminated.forEach(i => raw[i] = 0);
    others.forEach((i, idx) => {
      if (idx === others.length - 1) raw[i] = remaining;
      else {
        const share = Math.floor(remaining * (0.2 + Math.random() * 0.5));
        raw[i] = share;
        remaining -= share;
      }
    });
    const total = raw.reduce((a, b) => a + b, 0);
    if (total !== 100 && total > 0) {
      const scale = 100 / total;
      for (let i = 0; i < 4; i++) raw[i] = Math.round(raw[i] * scale);
    }
    setTargetPcts(raw);
    // Animate: start at 0, tick up
    setPcts([0, 0, 0, 0]);
    const steps = 30;
    let step = 0;
    const tick = setInterval(() => {
      step++;
      const t = step / steps;
      const eased = 1 - Math.pow(1 - t, 3);
      setPcts(raw.map(v => Math.round(v * eased)));
      if (step >= steps) clearInterval(tick);
    }, 30);
    return () => clearInterval(tick);
  }, [question]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">◆ 現 場 觀 眾 投 票 ◆</div>
        <div className="bars">
          {pcts.map((p, i) => (
            <div key={i} className="bar-col">
              <div className="bar-track">
                <div className="bar" style={{height: `${p * 1.8}px`}}>
                  <div className="bar-pct">{p}%</div>
                </div>
              </div>
              <div className="bar-letter">{LETTERS[i]}</div>
            </div>
          ))}
        </div>
        <button className="btn modal-close" onClick={onClose}>了 解</button>
      </div>
    </div>
  );
}

function PhoneModal({ question, onClose }) {
  const [phase, setPhase] = useState('dialing'); // dialing → thinking → answer
  const [friend] = useState(() => {
    const names = ['阿文 · 歷史教授', '小慧 · 文學系研究生', '威威 · 實驗室博士後', '詹姆士 · 流行文化記者'];
    return names[Math.floor(Math.random() * names.length)];
  });
  const [hint, setHint] = useState('');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('thinking'), 1400);
    const t2 = setTimeout(() => {
      setPhase('answer');
      // 70% gives the correct letter, 30% gives "I think it might be X or Y, not sure"
      const roll = Math.random();
      if (roll < 0.7) {
        setHint(`我有九成把握是 ${LETTERS[question.correct]}。`);
      } else {
        const others = [0, 1, 2, 3].filter(i => i !== question.correct);
        const wrongGuess = others[Math.floor(Math.random() * others.length)];
        const pair = Math.random() < 0.5
          ? `應該在 ${LETTERS[question.correct]} 和 ${LETTERS[wrongGuess]} 之間，我比較傾向 ${LETTERS[question.correct]}。`
          : `老實說我不太確定……可能是 ${LETTERS[question.correct]}？`;
        setHint(pair);
      }
    }, 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">☏ 打 電 話 問 朋 友 ☏</div>
        <div className="phone-friend">連線對象：{friend}</div>
        <div className="phone-content">
          {phase === 'dialing' && <span>正 在 撥 號<span className="dots"></span></span>}
          {phase === 'thinking' && <span>讓 他 看 看 題 目<span className="dots"></span></span>}
          {phase === 'answer' && <span style={{color: 'var(--gold-300)'}}>「{hint}」</span>}
        </div>
        <button className="btn modal-close" onClick={onClose} disabled={phase !== 'answer'}>
          掛 斷
        </button>
      </div>
    </div>
  );
}

function GameOver({ score, maxScore, correctCount, total, onRestart, onAdmin }) {
  return (
    <div className="gameover">
      <div className="gameover-card">
        <div className="gameover-label">◆ Final Score ◆</div>
        <div className="gameover-score">{score.toLocaleString()}</div>
        <div className="gameover-units">總 得 分</div>
        <div className="gameover-msg">
          你答對 <span style={{color: 'var(--gold-300)'}}>{correctCount}</span> / {total} 題<br/>
          <span style={{fontSize: 14, color: 'var(--ink-dim)', fontStyle: 'italic'}}>
            {correctCount === total
              ? '完美通關 — 極少人能做到。'
              : correctCount >= total * 0.7
                ? '博學強記。今晚的冠軍。'
                : correctCount >= total * 0.4
                  ? '不錯的表現，下次再戰。'
                  : '下次會更好，留著機會再挑戰。'}
          </span>
        </div>
        <div className="gameover-actions">
          <button className="btn primary" onClick={onRestart}>再 玩 一 次</button>
          <button className="btn" onClick={onAdmin}>管 理 題 目</button>
        </div>
      </div>
    </div>
  );
}

function FlashLayer({ type }) {
  if (!type) return null;
  return <div className={`flash flash-${type}`}></div>;
}

function Confetti({ show }) {
  if (!show) return null;
  const pieces = Array.from({length: 40}, (_, i) => i);
  return (
    <div className="confetti">
      {pieces.map(i => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.4;
        const dur = 1.6 + Math.random() * 1.2;
        const rot = Math.random() * 360;
        const colors = ['var(--gold-200)', 'var(--gold-300)', 'var(--gold-400)', 'var(--gold-500)'];
        const bg = colors[i % colors.length];
        return (
          <span key={i} style={{
            left: `${left}%`,
            animationDelay: `${delay}s`,
            animationDuration: `${dur}s`,
            transform: `rotate(${rot}deg)`,
            background: bg,
          }}></span>
        );
      })}
    </div>
  );
}

function App() {
  const [screen, setScreen] = useState('splash'); // splash | playing | gameover
  const [activeBankCode, setActiveBankCode] = useState(() => (window.GOOGLE_SHEETS_BANKS && window.GOOGLE_SHEETS_BANKS[0]?.code) || 'A');
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [selected, setSelected] = useState(null);
  const [locked, setLocked] = useState(false);
  const [revealed, setRevealed] = useState(null); // {correct, picked}
  const [eliminated, setEliminated] = useState([]);
  const [lifelines, setLifelines] = useState({fifty: false, audience: false, phone: false});
  const [modal, setModal] = useState(null); // 'audience' | 'phone'
  const [flash, setFlash] = useState(null);
  const [confetti, setConfetti] = useState(false);
  const [justPassed, setJustPassed] = useState(null);
  const [safetyMsg, setSafetyMsg] = useState(null);
  const [muted, setMuted] = useState(() => localStorage.getItem('quiz_muted') === '1');
  const tensionStartedRef = useRef(false);

  useEffect(() => {
    window.QuizAudio.setMuted(muted);
    localStorage.setItem('quiz_muted', muted ? '1' : '0');
  }, [muted]);

  // Load questions on mount and focus
  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    fetchQuestions(activeBankCode).then(qs => {
      if (mounted) {
        setQuestions(qs);
        setIsLoading(false);
      }
    });

    const onFocus = () => {
      fetchQuestions(activeBankCode).then(qs => {
        if (mounted) setQuestions(qs);
      });
    };
    window.addEventListener('focus', onFocus);
    return () => {
      mounted = false;
      window.removeEventListener('focus', onFocus);
    };
  }, [activeBankCode]);

  const currentQ = questions[index];

  function startGame() {
    window.QuizAudio.ensureCtx();
    window.QuizAudio.intro();
    // questions are already loaded from the effect
    setIndex(0);
    setScore(0);
    setCorrectCount(0);
    setSelected(null);
    setLocked(false);
    setRevealed(null);
    setEliminated([]);
    setLifelines({fifty: false, audience: false, phone: false});
    setScreen('playing');
  }

  function openAdmin() {
    window.location.href = 'admin.html';
  }
  // (no-op — keeps openAdmin pointing at admin page)

  function handleSelect(i) {
    if (locked || revealed) return;
    window.QuizAudio.click();
    setSelected(i);
    if (!tensionStartedRef.current) {
      window.QuizAudio.startTension();
      tensionStartedRef.current = true;
    }
  }

  function handleLockIn() {
    if (selected == null || locked) return;
    window.QuizAudio.stopTension();
    tensionStartedRef.current = false;
    window.QuizAudio.lockIn();
    setLocked(true);
    // reveal after a dramatic pause
    setTimeout(() => {
      const isCorrect = selected === currentQ.correct;
      setRevealed({correct: currentQ.correct, picked: selected});
      if (isCorrect) {
        window.QuizAudio.correct();
        setFlash('correct');
        setConfetti(true);
        setScore(s => s + currentQ.points);
        setCorrectCount(c => c + 1);
        setJustPassed(index);
        setTimeout(() => setJustPassed(null), 1600);
        if ((index + 1) % 5 === 0) {
          setTimeout(() => setSafetyMsg(`第 ${index + 1} 題 通 關 · 繼 續 挑 戰`), 600);
          setTimeout(() => setSafetyMsg(null), 2600);
        }
        setTimeout(() => setConfetti(false), 2600);
      } else {
        window.QuizAudio.wrong();
        setFlash('wrong');
      }
      setTimeout(() => setFlash(null), 900);
    }, 2200);
  }

  function handleNext() {
    if (index + 1 >= questions.length) {
      setScreen('gameover');
      return;
    }
    setIndex(i => i + 1);
    setSelected(null);
    setLocked(false);
    setRevealed(null);
    setEliminated([]);
  }

  function handleLifeline(key) {
    if (lifelines[key] || locked || revealed) return;
    window.QuizAudio.lifeline();
    setLifelines(l => ({...l, [key]: true}));
    if (key === 'fifty') {
      // remove 2 wrong answers
      const wrongs = [0, 1, 2, 3].filter(i => i !== currentQ.correct);
      // shuffle
      for (let i = wrongs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [wrongs[i], wrongs[j]] = [wrongs[j], wrongs[i]];
      }
      setEliminated(wrongs.slice(0, 2));
    } else if (key === 'audience') {
      setModal('audience');
    } else if (key === 'phone') {
      setModal('phone');
    }
  }

  if (screen === 'splash') {
    const isCloud = !!window.GOOGLE_SHEETS_URL_BASE;
    const banks = isCloud ? window.GOOGLE_SHEETS_BANKS : (window.BankStore ? window.BankStore.listBanks() : []);
    const activeBank = isCloud 
      ? window.GOOGLE_SHEETS_BANKS.find(b => b.code === activeBankCode)
      : (window.BankStore ? window.BankStore.getActiveBank() : null);

    const handleSelectBank = (code) => {
      if (isCloud) {
        setActiveBankCode(code);
      } else if (window.BankStore) {
        window.BankStore.setActive(code);
        setActiveBankCode(code);
      }
    };
    return <Splash onStart={startGame} onAdmin={openAdmin} questionCount={questions.length} activeBank={activeBank} banks={banks} onSelectBank={handleSelectBank} isLoading={isLoading} />;
  }

  return (
    <>
      <div className="stage-floor"></div>
      <div className="beams">
        <div className="beam" style={{'--r': '-8deg'}}></div>
        <div className="beam" style={{'--r': '-3deg'}}></div>
        <div className="beam" style={{'--r': '3deg'}}></div>
        <div className="beam" style={{'--r': '8deg'}}></div>
      </div>

      <div className="app">
        <div className="topbar">
          <div className="brand">
            <div className="brand-mark"></div>
            <div className="brand-text">
              <div className="brand-title">百問擂台</div>
              <div className="brand-sub">Arena · 題庫 {activeBankCode}</div>
            </div>
          </div>
          <div className="topbar-actions">
            <button className={`icon-btn ${!muted ? 'active' : ''}`} onClick={() => setMuted(m => !m)} title="音效">
              {muted ? '♪̸' : '♪'}
            </button>
            <button className="icon-btn" onClick={openAdmin} title="後台">⚙</button>
          </div>
        </div>

        <div className="main">
          <Lifelines state={lifelines} onUse={handleLifeline} disabled={locked || revealed} />

          <div className="center">
            <div className="score-banner">
              Current Score
              <span className="pts">{score.toLocaleString()}</span>
            </div>
            {currentQ && <QuestionStage question={currentQ} index={index} total={questions.length} />}
            {currentQ && <Answers
              choices={currentQ.choices}
              selected={selected}
              locked={locked}
              correct={revealed ? revealed.correct : null}
              wrong={revealed && revealed.picked !== revealed.correct ? revealed.picked : null}
              eliminated={eliminated}
              onSelect={handleSelect}
              disabled={locked || revealed}
            />}
            <div className="action-bar">
              {!revealed && !locked && (
                <button className="btn primary" disabled={selected == null} onClick={handleLockIn}>
                  鎖 定 答 案
                </button>
              )}
              {locked && !revealed && (
                <div style={{fontFamily: "'JetBrains Mono', monospace", fontSize: 12, letterSpacing: '0.3em', color: 'var(--gold-300)', textTransform: 'uppercase'}}>
                  揭 曉 中<span className="dots"></span>
                </div>
              )}
              {revealed && (
                <button className="btn primary" onClick={handleNext}>
                  {index + 1 >= questions.length ? '查 看 結 果' : '下 一 題'}
                </button>
              )}
            </div>
          </div>

          <Ladder questions={questions} currentIndex={index} score={score} justPassed={justPassed} />
        </div>
      </div>

      {modal === 'audience' && <AudienceModal question={currentQ} eliminated={eliminated} onClose={() => setModal(null)} />}
      {modal === 'phone' && <PhoneModal question={currentQ} onClose={() => setModal(null)} />}

      <FlashLayer type={flash} />
      <Confetti show={confetti} />
      {safetyMsg && <div className="safety-toast">{safetyMsg}</div>}

      {screen === 'gameover' && (
        <GameOver
          score={score}
          maxScore={questions.reduce((a, q) => a + q.points, 0)}
          correctCount={correctCount}
          total={questions.length}
          onRestart={startGame}
          onAdmin={openAdmin}
        />
      )}
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
