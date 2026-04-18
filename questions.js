// 設定你的 Google 試算表 CSV 網址。如果留空，就會使用下方的預設題庫。
window.GOOGLE_SHEETS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS3GGhqV60I4liGtLBeZrY5SopikYnFIpw07ocaCq4MxJBtNJfaygp6pndOsuvu9VF07DVArz2NkC1t/pub?output=csv";

// Default question bank — loaded if nothing in localStorage or Google Sheets
window.DEFAULT_QUESTIONS = [
  {
    id: 1,
    points: 10,
    difficulty: 1,
    question: "地球上最大的洋是？",
    choices: ["大西洋", "印度洋", "太平洋", "北冰洋"],
    correct: 2
  },
  {
    id: 2,
    points: 20,
    difficulty: 1,
    question: "光的速度大約是每秒多少公里？",
    choices: ["30 萬", "3 萬", "300 萬", "3000"],
    correct: 0
  },
  {
    id: 3,
    points: 40,
    difficulty: 2,
    question: "下列哪個不是程式語言？",
    choices: ["Python", "Java", "Cobra", "HTML"],
    correct: 3
  },
  {
    id: 4,
    points: 80,
    difficulty: 2,
    question: "梵高的名畫《星夜》大約創作於哪一年？",
    choices: ["1789", "1889", "1929", "1989"],
    correct: 1
  },
  {
    id: 5,
    points: 160,
    difficulty: 3,
    question: "下列哪一個元素的化學符號是 Au？",
    choices: ["銀", "鋁", "金", "銅"],
    correct: 2
  },
  {
    id: 6,
    points: 320,
    difficulty: 3,
    question: "莎士比亞的《哈姆雷特》是哪個國家的王子？",
    choices: ["英格蘭", "丹麥", "挪威", "蘇格蘭"],
    correct: 1
  },
  {
    id: 7,
    points: 640,
    difficulty: 4,
    question: "DNA 的雙螺旋結構是由誰發現的？",
    choices: ["愛因斯坦", "達爾文", "華生與克里克", "孟德爾"],
    correct: 2
  },
  {
    id: 8,
    points: 1280,
    difficulty: 4,
    question: "「The Great Gatsby」的作者是？",
    choices: ["Hemingway", "Fitzgerald", "Steinbeck", "Faulkner"],
    correct: 1
  },
  {
    id: 9,
    points: 2560,
    difficulty: 5,
    question: "在標準大氣壓下，水的沸點是攝氏多少度？",
    choices: ["90", "100", "110", "120"],
    correct: 1
  },
  {
    id: 10,
    points: 5120,
    difficulty: 5,
    question: "費馬最後定理是由哪位數學家在 1994 年證明的？",
    choices: ["Andrew Wiles", "Terence Tao", "Grigori Perelman", "John Nash"],
    correct: 0
  }
];
