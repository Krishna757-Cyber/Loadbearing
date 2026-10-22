/**
 * LoadBearing Internationalization (i18n) Engine.
 * Supports: English (en), Hindi (hi), Spanish (es), French (fr), German (de), Japanese (ja).
 */

export type SupportedLanguage = "en" | "hi" | "es" | "fr" | "de" | "ja";

export interface LanguageMeta {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
}

export const LANGUAGES: LanguageMeta[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
];

export const TRANSLATIONS: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    // Brand
    brandName: "LoadBearing",
    brandTagline: "Care shared fairly. Nothing falls between people.",
    
    // Navigation
    globe: "Globe",
    handoffs: "Handoffs",
    brief: "Brief",
    privacy: "Privacy",
    viewAs: "View as",
    sharing: "sharing",
    
    // Caregiver Status
    awake: "Awake",
    asleep: "Asleep",
    sleepTax: "sleep tax (counted x2)",
    
    // Handoff Drawer
    careHandoffs: "Care Handoffs",
    all: "All",
    awaiting: "Awaiting",
    accepted: "Accepted",
    resolved: "Resolved",
    nothingWaiting: "Nothing is waiting on anyone.",
    allInSafeHands: "All care tasks and moments are in safe hands.",
    accept: "Accept",
    decline: "Decline",
    resolve: "Resolve",
    
    // Voice & Orb
    speakToAlexa: "Speak to Alexa+ Simulated Surface",
    typeInstead: "Type message instead",
    listening: "Listening to your voice...",
    keepPrivate: "Keep Private",
    shareWithFamily: "Share with Family",
    typePlaceholder: "Type a care note, memory or task...",
    
    // Theme
    theme: "Theme",
    dark: "Dark Mode",
    light: "Light Mode",
    custom: "Custom",
    neonCyber: "Cyberpunk",
    emeraldForest: "Emerald Forest",
    roseTwilight: "Rose Twilight",
    
    // A11y
    accessibility: "Accessibility",
    highContrast: "High Contrast",
    largeText: "Large Text",
    reducedMotion: "Reduced Motion",
    sceneView: "Scene View",
    globe3d: "3D Globe",
    strip2d: "2D Strip",
  },
  hi: {
    // Brand
    brandName: "LoadBearing",
    brandTagline: "देखभाल का निष्पक्ष बँटवारा। कोई भी ज़िम्मेदारी न छूटे।",
    
    // Navigation
    globe: "ग्लोब",
    handoffs: "हैंडऑफ़",
    brief: "दैनिक विवरण",
    privacy: "गोपनीयता",
    viewAs: "के रूप में देखें",
    sharing: "साझा कर रहे हैं",
    
    // Caregiver Status
    awake: "जग रहे हैं",
    asleep: "सो रहे हैं",
    sleepTax: "स्लीप टैक्स (दोगुना गिना गया)",
    
    // Handoff Drawer
    careHandoffs: "देखभाल कार्य",
    all: "सभी",
    awaiting: "स्वीकृति की प्रतीक्षा",
    accepted: "स्वीकृत",
    resolved: "पूर्ण",
    nothingWaiting: "कोई भी कार्य लंबित नहीं है।",
    allInSafeHands: "परिवार के सभी कार्य सुरक्षित हाथों में हैं।",
    accept: "स्वीकार करें",
    decline: "अस्वीकार करें",
    resolve: "समाधान दर्ज करें",
    
    // Voice & Orb
    speakToAlexa: "Alexa+ सिम्युलेटेड वॉइस से बात करें",
    typeInstead: "टाइप करके संदेश भेजें",
    listening: "आपकी आवाज़ सुन रहे हैं...",
    keepPrivate: "निजी रखें",
    shareWithFamily: "परिवार के साथ साझा करें",
    typePlaceholder: "कोई देखभाल संदेश, याद या कार्य लिखें...",
    
    // Theme
    theme: "थीम",
    dark: "डार्क मोड",
    light: "लाइट मोड",
    custom: "कस्टम",
    neonCyber: "साइबरपंक",
    emeraldForest: "एमराल्ड वन",
    roseTwilight: "गुलाबी संध्या",
    
    // A11y
    accessibility: "सुलभता (Accessibility)",
    highContrast: "हाई कंट्रास्ट",
    largeText: "बड़ा टेक्स्ट",
    reducedMotion: "धीमी गति",
    sceneView: "दृश्य मोड",
    globe3d: "3D ग्लोब",
    strip2d: "2D पट्टी",
  },
  es: {
    // Brand
    brandName: "LoadBearing",
    brandTagline: "Cuidado compartido justamente. Nadie queda desatendido.",
    
    // Navigation
    globe: "Globo",
    handoffs: "Traspasos",
    brief: "Resumen",
    privacy: "Privacidad",
    viewAs: "Ver como",
    sharing: "compartiendo",
    
    // Caregiver Status
    awake: "Despierto",
    asleep: "Dormido",
    sleepTax: "tasa nocturna (cuenta x2)",
    
    // Handoff Drawer
    careHandoffs: "Traspasos de Cuidado",
    all: "Todos",
    awaiting: "Pendiente",
    accepted: "Aceptado",
    resolved: "Resuelto",
    nothingWaiting: "No hay tareas pendientes.",
    allInSafeHands: "Todas las tareas de cuidado están en buenas manos.",
    accept: "Aceptar",
    decline: "Rechazar",
    resolve: "Resolver",
    
    // Voice & Orb
    speakToAlexa: "Hablar a superficie simulada Alexa+",
    typeInstead: "Escribir en su lugar",
    listening: "Escuchando su voz...",
    keepPrivate: "Mantener privado",
    shareWithFamily: "Compartir con la familia",
    typePlaceholder: "Escriba una nota de cuidado, recuerdo o tarea...",
    
    // Theme
    theme: "Tema",
    dark: "Modo Oscuro",
    light: "Modo Claro",
    custom: "Personalizado",
    neonCyber: "Cyberpunk",
    emeraldForest: "Bosque Esmeralda",
    roseTwilight: "Crepúsculo Rosa",
    
    // A11y
    accessibility: "Accesibilidad",
    highContrast: "Alto Contraste",
    largeText: "Texto Grande",
    reducedMotion: "Movimiento Reducido",
    sceneView: "Vista de Escena",
    globe3d: "Globo 3D",
    strip2d: "Tira 2D",
  },
  fr: {
    // Brand
    brandName: "LoadBearing",
    brandTagline: "Soin partagé équitablement. Rien n'est laissé pour compte.",
    
    // Navigation
    globe: "Globe",
    handoffs: "Passations",
    brief: "Résumé",
    privacy: "Confidentialité",
    viewAs: "Voir comme",
    sharing: "partagent",
    
    // Caregiver Status
    awake: "Éveillé",
    asleep: "Endormi",
    sleepTax: "taxe sommeil (comptée x2)",
    
    // Handoff Drawer
    careHandoffs: "Passations de Soins",
    all: "Tous",
    awaiting: "En attente",
    accepted: "Accepté",
    resolved: "Résolu",
    nothingWaiting: "Aucune tâche en attente.",
    allInSafeHands: "Toutes les tâches sont entre de bonnes mains.",
    accept: "Accepter",
    decline: "Décliner",
    resolve: "Résoudre",
    
    // Voice & Orb
    speakToAlexa: "Parler à la surface simulée Alexa+",
    typeInstead: "Écrire à la place",
    listening: "À votre écoute...",
    keepPrivate: "Garder privé",
    shareWithFamily: "Partager avec la famille",
    typePlaceholder: "Écrivez une note de soin, un souvenir ou une tâche...",
    
    // Theme
    theme: "Thème",
    dark: "Mode Sombre",
    light: "Mode Clair",
    custom: "Personnalisé",
    neonCyber: "Cyberpunk",
    emeraldForest: "Forêt d'Émeraude",
    roseTwilight: "Crépuscule Rose",
    
    // A11y
    accessibility: "Accessibilité",
    highContrast: "Contraste Élevé",
    largeText: "Grand Texte",
    reducedMotion: "Mouvements Réduits",
    sceneView: "Vue Scène",
    globe3d: "Globe 3D",
    strip2d: "Bande 2D",
  },
  de: {
    // Brand
    brandName: "LoadBearing",
    brandTagline: "Pflege fair geteilt. Niemand bleibt auf der Strecke.",
    
    // Navigation
    globe: "Globus",
    handoffs: "Übergaben",
    brief: "Bericht",
    privacy: "Datenschutz",
    viewAs: "Anzeigen als",
    sharing: "teilen",
    
    // Caregiver Status
    awake: "Wach",
    asleep: "Schläft",
    sleepTax: "Schlaf-Zuschlag (zählt x2)",
    
    // Handoff Drawer
    careHandoffs: "Pflege-Übergaben",
    all: "Alle",
    awaiting: "Ausstehend",
    accepted: "Angenommen",
    resolved: "Erledigt",
    nothingWaiting: "Nichts steht aus.",
    allInSafeHands: "Alle Aufgaben sind in sicheren Händen.",
    accept: "Annehmen",
    decline: "Ablehnen",
    resolve: "Erledigen",
    
    // Voice & Orb
    speakToAlexa: "Mit simulierter Alexa+-Oberfläche sprechen",
    typeInstead: "Stattdessen tippen",
    listening: "Höre zu...",
    keepPrivate: "Privat halten",
    shareWithFamily: "Mit Familie teilen",
    typePlaceholder: "Pflegenotiz, Erinnerung oder Aufgabe eingeben...",
    
    // Theme
    theme: "Design",
    dark: "Dunkler Modus",
    light: "Heller Modus",
    custom: "Benutzerdefiniert",
    neonCyber: "Cyberpunk",
    emeraldForest: "Smaragdwald",
    roseTwilight: "Rosendämmerung",
    
    // A11y
    accessibility: "Barrierefreiheit",
    highContrast: "Hoher Kontrast",
    largeText: "Großer Text",
    reducedMotion: "Reduzierte Bewegung",
    sceneView: "Szenen-Ansicht",
    globe3d: "3D-Globus",
    strip2d: "2D-Leiste",
  },
  ja: {
    // Brand
    brandName: "LoadBearing",
    brandTagline: "介護を公平に分担。誰も取り残さない。",
    
    // Navigation
    globe: "地球儀",
    handoffs: "引き継ぎ",
    brief: "要約",
    privacy: "プライバシー",
    viewAs: "視点を切替",
    sharing: "共有中",
    
    // Caregiver Status
    awake: "起床",
    asleep: "就寝中",
    sleepTax: "深夜負担（2倍換算）",
    
    // Handoff Drawer
    careHandoffs: "ケア引き継ぎ一覧",
    all: "すべて",
    awaiting: "承諾待ち",
    accepted: "承諾済み",
    resolved: "完了",
    nothingWaiting: "待機中のタスクはありません。",
    allInSafeHands: "すべてのケアタスクは適切に管理されています。",
    accept: "承諾",
    decline: "辞退",
    resolve: "完了にする",
    
    // Voice & Orb
    speakToAlexa: "Alexa+シミュレーション音声に話しかける",
    typeInstead: "テキストで入力",
    listening: "音声を認識中...",
    keepPrivate: "非公開にする",
    shareWithFamily: "家族と共有する",
    typePlaceholder: "ケアノート、思い出、タスクを入力...",
    
    // Theme
    theme: "テーマ",
    dark: "ダークモード",
    light: "ライトモード",
    custom: "カスタム",
    neonCyber: "サイバーパンク",
    emeraldForest: "エメラルドの森",
    roseTwilight: "ローズトワイライト",
    
    // A11y
    accessibility: "アクセシビリティ",
    highContrast: "ハイコントラスト",
    largeText: "テキスト拡大",
    reducedMotion: "動きを減らす",
    sceneView: "シーン表示",
    globe3d: "3D地球儀",
    strip2d: "2Dストリップ",
  },
};

export function t(key: string, lang: SupportedLanguage = "en"): string {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
  return dict[key] || TRANSLATIONS.en[key] || key;
}

export function getLocaleForLanguage(lang: SupportedLanguage): string {
  switch (lang) {
    case "hi":
      return "hi-IN";
    case "es":
      return "es-ES";
    case "fr":
      return "fr-FR";
    case "de":
      return "de-DE";
    case "ja":
      return "ja-JP";
    case "en":
    default:
      return "en-US";
  }
}

