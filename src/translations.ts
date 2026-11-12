import { screensAr, screensEn, type ScreensDict } from './i18n/screens';
export type Language = 'ar' | 'en';

export interface TranslationDictionary {
  /** redesigned screens */
  s: ScreensDict;
  media: {
    athlete: string;
    stopAnimation: string;
    playAnimation: string;
    downloadImage: string;
    recordingVideo: string;
    startRecording: string;
    buildingFrames: string;
    videoReady: string;
    downloadVideo: string;
    livePreview: string;
    years: string;
    xBodyWeight: string;
    close: string;
  };
  testTypes: {
    cmj_arms: string;
    cmj_no_arms: string;
    sj_no_arms: string;
    sj_arms: string;
    approach: string;
    rsi: string;
    power_clean: string;
    full_squat: string;
    bench_press: string;
  };
  nav: {
    verticalJump: string;
  };
  common: {
    loadingData: string;
    retry: string;
    loadFailedTitle: string;
    save: string;
    saving: string;
    cancel: string;
    delete: string;
    edit: string;
    filter: string;
    male: string;
    female: string;
    error: string;
    success: string;
    confirm: string;
    status: string;
    notes: string;
    close: string;
    print: string;
  };
  hud: {
    addCoach: string;
    addAthlete: string;
    favorites: string;
    fullName: string;
    birthYear: string;
    gender: string;
    weightKg: string;
    heightCm: string;
    standingReachCm: string;
    legLengthM: string;
    squatTrochanterM: string;
    squatTrochanterHelp: string;
    noCoach: string;
  };
  roster: {
    title: string;
    allCoaches: string;
    weight: string;
    height: string;
    age: string;
    years: string;
  };
  profile: {
    noAthleteTitle: string;
    editAthlete: string;
    newTest: string;
    legLengthM: string;
    cmjNoArms: string;
    readinessBaseline: string;
    readinessNotEnough: string;
    contactTime: string;
    flightTime: string;
    eurTitle: string;
    repsCount: string;
    dunkMargin: string;
    rimMargin: string;
    filterRsi: string;
    filterStrength: string;
  };
  jumpConsole: {
    exportingTitle: string;
    exportingHint: string;
    title: string;
    openCamera: string;
    peakPower: string;
  };
  manualEntry: {
    title: string;
  };
  rsiConsole: {
    title: string;
    contactTime: string;
    flightTime: string;
  };
  fvpConsole: {
    title: string;
    jumpHeightCm: string;
    imbalancePercent: string;
    flightTimeS: string;
    reasonTooFew: string;
    reasonNoVariation: string;
    reasonSlope: string;
    reasonR2: string;
    reasonMissing: string;
    load: string;
    height: string;
    bandWell: string;
    bandModForce: string;
    bandModVel: string;
    bandLargeForce: string;
    bandLargeVel: string;
    prescForce: string;
    prescVel: string;
    prescBalanced: string;
  };
  leaderboard: {
    title: string;
  };
  ui: {
    mg60fpsMotionGraphicVideo: string;
    mgGeneratePlayableHdStory: string;
    jcJumpTestResultSaved: string;
    jcErrorSavingMeasurement: string;
    jcAthlete: string;
    jcPeakforceLabJumpAnalysis: string;
    jcYourBrowserDoesNot: string;
    jcPreparingVideoPlayer: string;
    jcSeekingToStartPosition: string;
    jcInitializingRecorder: string;
    jcCanvasCapturestreamIsNot: string;
    jcStartingVideoPlayback: string;
    jcKneeL: string;
    jcKneeR: string;
    jcHeight: string;
    jcLiveHeight: string;
    jcPeakJump: string;
    jcMaxHeight: string;
    jcAthlete2: string;
    jcWeight: string;
    jcDate: string;
    jcTestType: string;
    jcVideoExportedSuccessfully: string;
    jcYourVideoAnalysisIs: string;
    jcShareVideo: string;
    jcSaveVideo: string;
    jcIphoneIpadUsersTo: string;
  };
}

export const translations: Record<Language, TranslationDictionary> = {
  ar: {
    s: screensAr,
    media: {
      athlete: 'اللاعب',
      stopAnimation: 'إيقاف الحركة',
      playAnimation: 'تشغيل الحركة',
      downloadImage: '📸 تحميل صورة HD',
      recordingVideo: 'جاري تسجيل الفيديو',
      startRecording: '🎬 بدء تسجيل وتوليد الفيديو 60FPS',
      buildingFrames: 'جاري بناء ورسم إطارات الفيديو (6 ثوانٍ كاملة)...',
      videoReady: 'تم استخراج الفيديو المتحرك بنجاح (6 ثوانٍ كاملة WebM HD)!',
      downloadVideo: '⬇️ تحميل ملف الفيديو فوراً',
      livePreview: '📌 معاينة بطاقة الموشن جرافيك الحية:',
      years: 'سنة',
      xBodyWeight: 'ضعف وزن الجسم',
      close: 'إغلاق',
    },
    testTypes: {
      cmj_arms: 'CMJ بالذراعين',
      cmj_no_arms: 'CMJ بدون ذراعين',
      sj_no_arms: 'وثبة ثبات (SJ)',
      sj_arms: 'SJ بالذراعين',
      approach: 'وثبة الاقتراب',
      rsi: 'وثبة السقوط / RSI',
      power_clean: 'باور كلين',
      full_squat: 'سكوات كامل',
      bench_press: 'بنش برس',
    },
    ui: {
      mg60fpsMotionGraphicVideo: 'محرك فيديو الموشن جرافيك 60FPS الحقيقي',
      mgGeneratePlayableHdStory: 'استخراج واستبدال فيديو متحرك حقيقي قابل للتشغيل بمدّة كاملة وصور عالية الدقة',
      jcJumpTestResultSaved: '✅ تم حفظ نتيجة القفزة بنجاح في ملف اللاعب!',
      jcErrorSavingMeasurement: 'خطأ في حفظ القياس',
      jcAthlete: 'اللاعب',
      jcPeakforceLabJumpAnalysis: 'PeakForce Lab - تحليل الوثب',
      jcYourBrowserDoesNot: 'متصفحك لا يدعم مشاركة ملفات الفيديو مباشرة. يرجى حفظ الفيديو ومشاركته يدوياً.',
      jcPreparingVideoPlayer: 'جاري تهيئة مشغل الفيديو...',
      jcSeekingToStartPosition: 'جاري الانتقال إلى موضع البدء...',
      jcInitializingRecorder: 'جاري تهيئة مسجل الفيديو...',
      jcCanvasCapturestreamIsNot: 'خاصية التقاط الفيديو غير مدعومة في هذا المتصفح.',
      jcStartingVideoPlayback: 'جاري تشغيل الفيديو...',
      jcKneeL: 'ركبة L:',
      jcKneeR: 'ركبة R:',
      jcHeight: 'الارتفاع',
      jcLiveHeight: 'الارتفاع المباشر',
      jcPeakJump: 'الارتقاء الأقصى 👑',
      jcMaxHeight: 'الارتقاء الأقصى 👑',
      jcAthlete2: 'اللاعب',
      jcWeight: 'الوزن',
      jcDate: 'التاريخ',
      jcTestType: 'نوع الاختبار',
      jcVideoExportedSuccessfully: 'تم تصدير الفيديو بنجاح! 🎉',
      jcYourVideoAnalysisIs: 'فيديو التحليل الخاص بك جاهز الآن. يمكنك معاينته بالأسفل، مشاركته مباشرة، أو تحميله على جهازك.',
      jcShareVideo: 'مشاركة الفيديو',
      jcSaveVideo: 'حفظ الفيديو',
      jcIphoneIpadUsersTo: '💡 لمستخدمي الآيفون والآيباد: لحفظ الفيديو مباشرة في ألبوم الصور (الاستوديو)، اضغط على "مشاركة الفيديو" ثم اختر "حفظ الفيديو" (Save Video) من القائمة.',
    },
    nav: {
      verticalJump: 'الوثب الرأسي',
    },
    common: {
      loadingData: 'جاري تحميل البيانات…',
      retry: 'حاول تاني',
      loadFailedTitle: 'مقدرناش نحمّل البيانات',
      save: 'حفظ',
      saving: 'جاري الحفظ...',
      cancel: 'إلغاء',
      delete: 'حذف',
      edit: 'تعديل',
      filter: 'تصفية',
      male: 'ذكر',
      female: 'أنثى',
      error: 'حدث خطأ',
      success: 'تم بنجاح',
      confirm: 'تأكيد',
      status: 'الحالة',
      notes: 'ملاحظات',
      close: 'إغلاق',
      print: 'طباعة التقرير',
    },
    hud: {
      addCoach: 'إضافة مدرب',
      addAthlete: 'تسجيل لاعب',
      favorites: 'اللاعبون المفضّلون',
      fullName: 'الاسم الكامل',
      birthYear: 'سنة الميلاد',
      gender: 'النوع',
      weightKg: 'الوزن (كجم)',
      heightCm: 'طول اللاعب (سم)',
      standingReachCm: 'الوصول من الثبات (سم)',
      legLengthM: 'طول الرجل (م)',
      squatTrochanterM: 'ارتفاع المدور في قرفصاء 90° (م)',
      squatTrochanterHelp: 'طول الرجل = من المدور الكبير لأطراف الأصابع والقدم ممدودة. hPO = طول الرجل − ارتفاع نفس النقطة في قرفصاء 90°.',
      noCoach: '-- بدون مدرب --',
    },
    roster: {
      title: 'لوحة تحكم الفريق Roster Dashboard',
      allCoaches: 'جميع اللاعبين (الكل)',
      weight: 'الوزن:',
      height: 'الطول:',
      age: 'العمر:',
      years: 'سنة',
    },
    profile: {
      noAthleteTitle: 'لم يتم اختيار أي لاعب',
      editAthlete: 'تعديل البيانات',
      newTest: 'تسجيل اختبار جديد',
      legLengthM: 'طول الطرف:',
      cmjNoArms: 'وثب بدون ذراعين (CMJ No Arms)',
      readinessBaseline: 'خط الأساس (آخر 14 يوم)',
      readinessNotEnough: 'بيانات غير كافية: محتاج 3 اختبارات CMJ على الأقل في الـ14 يوم اللي قبل آخر اختبار',
      contactTime: 'زمن التلامس GCT',
      flightTime: 'زمن الطيران',
      eurTitle: 'نسبة الاستفادة اللامركزية (EUR Ratio)',
      repsCount: 'التكرارات:',
      dunkMargin: 'فارق الدنك المريح (سم)',
      rimMargin: 'فارق حلقة السلة (سم)',
      filterRsi: 'اختبارات RSI فقط',
      filterStrength: 'تمارين القوة 1RM فقط',
    },
    jumpConsole: {
      exportingTitle: 'جاري تصدير فيديو التحليل 🎥',
      exportingHint: 'استنى شوية بنركّب شريط الارتفاع والمنحنى على الفيديو…',
      title: 'منصة قياس وتحليل الوثب الرأسي',
      openCamera: 'تسجيل بالكاميرا المباشرة',
      peakPower: 'القدرة الانفجارية القصوى',
    },
    manualEntry: {
      title: 'وحدة الإدخال اليدوي السريع',
    },
    rsiConsole: {
      title: 'حاسبة ومحلل مؤشر القوة التفاعلية (RSI)',
      contactTime: 'زمن التلامس بالأرض (GCT):',
      flightTime: 'زمن الطيران (Flight Time):',
    },
    fvpConsole: {
      title: 'منحنى القوة والسرعة (Force-Velocity Profile)',
      jumpHeightCm: 'الارتفاع (سم)',
      imbalancePercent: 'نسبة الخلل الميكانيكي FV-imb%:',
      flightTimeS: 'زمن الطيران (ث)',
      reasonTooFew: 'محتاج محاولتين صالحتين على الأقل.',
      reasonNoVariation: 'كل المحاولات بنفس السرعة، مفيش خط نقدر نرسمه.',
      reasonSlope: 'الميل موجب أو صفر (القوة مش بتقل مع زيادة السرعة). راجع الأوزان وأزمنة الطيران.',
      reasonR2: 'R² أقل من 0.9، النقاط مش على خط واحد. أعد المحاولات.',
      reasonMissing: 'ناقص وزن اللاعب أو مسافة الدفع hPO.',
      load: 'الحمل',
      height: 'الارتفاع',
      bandWell: 'متوازن (90–110%)',
      bandModForce: 'عجز قوة متوسط (60–90%)',
      bandModVel: 'عجز سرعة متوسط (110–140%)',
      bandLargeForce: 'عجز قوة كبير (أقل من 60%)',
      bandLargeVel: 'عجز سرعة كبير (أكثر من 140%)',
      prescForce: 'أولوية لتمارين القوة القصوى (أحمال ثقيلة، سرعة بطيئة).',
      prescVel: 'أولوية للقفز الباليستي بأحمال خفيفة أو بمساعدة.',
      prescBalanced: 'حافظ على تدريب متوازن على كامل المنحنى.',
    },
    leaderboard: {
      title: 'لوحة المتصدرين والأرقام القياسية',
    },
  },
  en: {
    s: screensEn,
    media: {
      athlete: 'Athlete',
      stopAnimation: 'Pause animation',
      playAnimation: 'Play animation',
      downloadImage: '📸 Download HD image',
      recordingVideo: 'Recording video',
      startRecording: '🎬 Record 60 FPS video',
      buildingFrames: 'Rendering video frames (6 seconds)...',
      videoReady: 'Video ready (6 s, WebM HD)!',
      downloadVideo: '⬇️ Download video',
      livePreview: '📌 Live card preview:',
      years: 'yrs',
      xBodyWeight: 'x body weight',
      close: 'Close',
    },
    testTypes: {
      cmj_arms: 'CMJ (with arms)',
      cmj_no_arms: 'CMJ (no arms)',
      sj_no_arms: 'Squat Jump (SJ)',
      sj_arms: 'SJ (with arms)',
      approach: 'Approach jump',
      rsi: 'Drop jump / RSI',
      power_clean: 'Power clean',
      full_squat: 'Full squat',
      bench_press: 'Bench press',
    },
    ui: {
      mg60fpsMotionGraphicVideo: '60FPS Motion Graphic Video Engine',
      mgGeneratePlayableHdStory: 'Generate playable HD story videos & screenshots for athlete stats',
      jcJumpTestResultSaved: '✅ Jump test result saved successfully to athlete profile!',
      jcErrorSavingMeasurement: 'Error saving measurement',
      jcAthlete: 'Athlete',
      jcPeakforceLabJumpAnalysis: 'PeakForce Lab - Jump Analysis',
      jcYourBrowserDoesNot: 'Your browser does not support direct sharing of video files. Please download the video and share it manually.',
      jcPreparingVideoPlayer: 'Preparing video player...',
      jcSeekingToStartPosition: 'Seeking to start position...',
      jcInitializingRecorder: 'Initializing recorder...',
      jcCanvasCapturestreamIsNot: 'Canvas captureStream is not supported by this browser.',
      jcStartingVideoPlayback: 'Starting video playback...',
      jcKneeL: 'Knee L:',
      jcKneeR: 'Knee R:',
      jcHeight: 'HEIGHT',
      jcLiveHeight: 'LIVE HEIGHT',
      jcPeakJump: 'PEAK JUMP 👑',
      jcMaxHeight: 'MAX HEIGHT 👑',
      jcAthlete2: 'ATHLETE',
      jcWeight: 'WEIGHT',
      jcDate: 'DATE',
      jcTestType: 'TEST TYPE',
      jcVideoExportedSuccessfully: 'Video Exported Successfully! 🎉',
      jcYourVideoAnalysisIs: 'Your video analysis is ready. Preview it below, share it directly, or download it to your device.',
      jcShareVideo: 'Share Video',
      jcSaveVideo: 'Save Video',
      jcIphoneIpadUsersTo: '💡 iPhone/iPad Users: To save the video directly to your Photos App (Gallery), click "Share Video" then select "Save Video" from the options list.',
    },
    nav: {
      verticalJump: 'Vertical Jump',
    },
    common: {
      loadingData: 'Loading data…',
      retry: 'Try again',
      loadFailedTitle: 'Could not load data',
      save: 'Save',
      saving: 'Saving...',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      filter: 'Filter',
      male: 'Male',
      female: 'Female',
      error: 'An error occurred',
      success: 'Operation completed successfully',
      confirm: 'Confirm',
      status: 'Status',
      notes: 'Notes',
      close: 'Close',
      print: 'Print Report',
    },
    hud: {
      addCoach: 'Add Coach',
      addAthlete: 'Register Athlete',
      favorites: 'Favorite Athletes',
      fullName: 'Full Name',
      birthYear: 'Birth Year',
      gender: 'Gender',
      weightKg: 'Weight (kg)',
      heightCm: 'Height (cm)',
      standingReachCm: 'Standing Reach (cm)',
      legLengthM: 'Leg Length (m)',
      squatTrochanterM: 'Trochanter height in 90° squat (m)',
      squatTrochanterHelp: 'Leg length = greater trochanter to toes, feet extended. hPO = leg length − height of the same point in a 90° squat.',
      noCoach: '-- No Coach --',
    },
    roster: {
      title: 'Team Roster Dashboard',
      allCoaches: 'All Athletes (Total Roster)',
      weight: 'Weight:',
      height: 'Height:',
      age: 'Age:',
      years: 'yrs',
    },
    profile: {
      noAthleteTitle: 'No Athlete Selected',
      editAthlete: 'Edit Athlete',
      newTest: 'Log New Test',
      legLengthM: 'Leg Length:',
      cmjNoArms: 'CMJ (No Arms)',
      readinessBaseline: 'Baseline (previous 14 days)',
      readinessNotEnough: 'Not enough data: needs at least 3 CMJ tests in the 14 days before the latest test',
      contactTime: 'Contact Time (GCT)',
      flightTime: 'Flight Duration',
      eurTitle: 'Eccentric Utilization Ratio (EUR)',
      repsCount: 'Reps:',
      dunkMargin: 'Basketball Dunk Margin (cm)',
      rimMargin: 'Rim Touch Clearance (cm)',
      filterRsi: 'RSI Drop Jumps Only',
      filterStrength: '1RM Strength Only',
    },
    jumpConsole: {
      exportingTitle: 'Exporting analysis video 🎥',
      exportingHint: 'Hold on while the height bar and curve are drawn onto your video…',
      title: 'Vertical Jump Video Telemetry',
      openCamera: 'Live Camera Capture',
      peakPower: 'Peak Mechanical Power',
    },
    manualEntry: {
      title: 'Rapid Telemetry Entry Console',
    },
    rsiConsole: {
      title: 'Reactive Strength Index (RSI) Analyzer',
      contactTime: 'Ground Contact Time (GCT):',
      flightTime: 'Flight Duration (s):',
    },
    fvpConsole: {
      title: 'Force-Velocity Profiling (F-V Curve)',
      jumpHeightCm: 'Jump Height (cm)',
      imbalancePercent: 'Mechanical Imbalance FV-imb%:',
      flightTimeS: 'Flight time (s)',
      reasonTooFew: 'At least two valid trials are needed.',
      reasonNoVariation: 'All trials have the same velocity; no line can be fitted.',
      reasonSlope: 'Slope is zero or positive (force does not drop as velocity rises). Check the loads and flight times.',
      reasonR2: 'R² is below 0.9; the points are not on a line. Repeat the trials.',
      reasonMissing: 'Missing body mass or push-off distance (hPO).',
      load: 'Load',
      height: 'Height',
      bandWell: 'Well balanced (90–110%)',
      bandModForce: 'Moderate force deficit (60–90%)',
      bandModVel: 'Moderate velocity deficit (110–140%)',
      bandLargeForce: 'Large force deficit (< 60%)',
      bandLargeVel: 'Large velocity deficit (> 140%)',
      prescForce: 'Prioritise maximal strength work (heavy loads, slow velocity).',
      prescVel: 'Prioritise ballistic jumps with light or assisted loads.',
      prescBalanced: 'Keep training across the whole force-velocity spectrum.',
    },
    leaderboard: {
      title: 'Athlete Leaderboard & Records',
    },
  },
};
