export type Language = 'ar' | 'en';

export interface TranslationDictionary {
  nav: {
    roster: string;
    rosterShort: string;
    rosterTag: string;
    verticalJump: string;
    verticalJumpShort: string;
    verticalJumpTag: string;
    manualEntry: string;
    manualEntryShort: string;
    manualEntryTag: string;
    rsiCalculator: string;
    rsiCalculatorShort: string;
    rsiCalculatorTag: string;
    fvpCurve: string;
    fvpCurveShort: string;
    fvpCurveTag: string;
    athleteProfile: string;
    athleteProfileShort: string;
    athleteProfileTag: string;
    leaderboard: string;
    leaderboardShort: string;
    leaderboardTag: string;
    telemetryModules: string;
    systemOnline: string;
    synced: string;
    syncing: string;
    offlineMode: string;
  };
  common: {
    save: string;
    saving: string;
    cancel: string;
    delete: string;
    deleting: string;
    edit: string;
    add: string;
    search: string;
    filter: string;
    all: string;
    male: string;
    female: string;
    cm: string;
    inches: string;
    kg: string;
    sec: string;
    ms: string;
    watts: string;
    wattsPerKg: string;
    metersPerSec: string;
    date: string;
    actions: string;
    loading: string;
    error: string;
    success: string;
    confirm: string;
    confirmDelete: string;
    noData: string;
    pr: string;
    personalBest: string;
    optimal: string;
    warning: string;
    fatigue: string;
    elite: string;
    status: string;
    notes: string;
    close: string;
    back: string;
    view: string;
    export: string;
    print: string;
  };
  hud: {
    appTitle: string;
    appSubtitle: string;
    versionBadge: string;
    addCoach: string;
    addAthlete: string;
    selectAthlete: string;
    searchAthletePlaceholder: string;
    favorites: string;
    unassignedAthletes: string;
    noMatchingAthletes: string;
    noActiveAthlete: string;
    selectAthleteHint: string;
    themeDark: string;
    themeLight: string;
    registerCoachTitle: string;
    coachFullName: string;
    coachPlaceholder: string;
    saveCoach: string;
    registeredCoaches: string;
    deleteCoach: string;
    newAthleteTitle: string;
    fullName: string;
    birthYear: string;
    gender: string;
    weightKg: string;
    heightCm: string;
    standingReachCm: string;
    legLengthM: string;
    assignedCoach: string;
    saveAthlete: string;
    deleteAthlete: string;
    noCoach: string;
  };
  roster: {
    title: string;
    subtitle: string;
    handbookBtn: string;
    coachFilter: string;
    allCoaches: string;
    unassigned: string;
    searchPlaceholder: string;
    allGenders: string;
    malesOnly: string;
    femalesOnly: string;
    cmjStatic: string;
    approachDynamic: string;
    rsiReactive: string;
    notMeasured: string;
    reach: string;
    weight: string;
    height: string;
    age: string;
    years: string;
    startTesting: string;
    viewProfile: string;
    juniorFlag: string;
    emptyTitle: string;
    emptyDesc: string;
    handbookTitle: string;
    menTab: string;
    womenTab: string;
    rsiTab: string;
    juniorsTab: string;
  };
  profile: {
    athleteDossier: string;
    noAthleteTitle: string;
    noAthleteDesc: string;
    exportCard: string;
    editAthlete: string;
    newTest: string;
    ageYears: string;
    massKg: string;
    statureCm: string;
    legLengthM: string;
    reachCm: string;
    peakCmj: string;
    cmjWithArms: string;
    cmjNoArms: string;
    squatJump: string;
    armGain: string;
    peakApproach: string;
    peakRsi: string;
    fvpStatus: string;
    cnsReadiness: string;
    contactTime: string;
    flightTime: string;
    vsAvg: string;
    optimalReadiness: string;
    moderateFatigue: string;
    highFatigue: string;
    fastSsc: string;
    moderateSsc: string;
    slowSsc: string;
    forceDeficit: string;
    velocityDeficit: string;
    balancedProfile: string;
    progressionTab: string;
    elasticityTab: string;
    strengthTab: string;
    radarTab: string;
    historyTab: string;
    jumpHeightTrend: string;
    powerTrend: string;
    eurTitle: string;
    eurFormula: string;
    eurScore: string;
    eurRatio: string;
    reactiveIndex: string;
    elasticDominant: string;
    elasticDominantDesc: string;
    strengthDominant: string;
    strengthDominantDesc: string;
    wellBalanced: string;
    wellBalancedDesc: string;
    generalDeficit: string;
    generalDeficitDesc: string;
    strength1rmTitle: string;
    fullSquat1rm: string;
    benchPress1rm: string;
    powerClean1rm: string;
    bwRatio: string;
    repsCount: string;
    weekBlock: string;
    radarTitle: string;
    volleyballClearance: string;
    dunkMargin: string;
    rimMargin: string;
    testHistoryTitle: string;
    filterAll: string;
    filterCmj: string;
    filterRsi: string;
    filterStrength: string;
    testTypeCol: string;
    scoreCol: string;
    contactTimeCol: string;
    powerCol: string;
    dateCol: string;
    deleteRecordConfirm: string;
    editRecordTitle: string;
    printReportTitle: string;
    includeStrengthOption: string;
    generatePdf: string;
  };
  jumpConsole: {
    title: string;
    subtitle: string;
    selectVideo: string;
    openCamera: string;
    playbackControls: string;
    autoDetect: string;
    detecting: string;
    takeoffPoint: string;
    landingPoint: string;
    touchdownPoint: string;
    flightDuration: string;
    calculatedHeight: string;
    takeoffVel: string;
    peakPower: string;
    saveTestResult: string;
    testTypeTag: string;
    slowMoPreset: string;
    frameByFrame: string;
  };
  manualEntry: {
    title: string;
    subtitle: string;
    jumpMode: string;
    strengthMode: string;
    testTypeLabel: string;
    dateLabel: string;
    heightInput: string;
    flightTimeInput: string;
    contactTimeInput: string;
    rsiDirectInput: string;
    rsiModeToggle: string;
    rsiModeDirect: string;
    rsiModeAutoHeight: string;
    rsiModeAutoFlight: string;
    gctMillisecondsHint: string;
    boxHeightInput: string;
    addedLoadInput: string;
    strengthLiftLabel: string;
    weightLiftedInput: string;
    weekNumberLabel: string;
    repsCountLabel: string;
    bwRatioLabel: string;
    notesLabel: string;
    saveMeasurement: string;
    printInfographic: string;
    recentLoggedTitle: string;
    estimated1rm: string;
  };
  rsiConsole: {
    title: string;
    subtitle: string;
    methodToggle: string;
    heightGctMethod: string;
    flightGctMethod: string;
    boxHeight: string;
    contactTime: string;
    flightTime: string;
    jumpHeight: string;
    rsiScore: string;
    gctClassification: string;
    fastSscDesc: string;
    moderateSscDesc: string;
    slowSscDesc: string;
    saveRsiTest: string;
    liveFeedback: string;
  };
  fvpConsole: {
    title: string;
    subtitle: string;
    methodDesc: string;
    jumpInputsTitle: string;
    bodyMass: string;
    pushOffDistance: string;
    loadTrial: string;
    jumpHeightCm: string;
    f0Force: string;
    v0Velocity: string;
    pmaxPower: string;
    sfvSlope: string;
    sfvOptSlope: string;
    imbalancePercent: string;
    actualVsOptCurve: string;
    trainingPrescription: string;
    highForceDeficitPresc: string;
    highVelocityDeficitPresc: string;
    balancedPresc: string;
  };
  leaderboard: {
    title: string;
    subtitle: string;
    categoryVertical: string;
    categoryRsi: string;
    allAthletes: string;
    males: string;
    females: string;
    rankCol: string;
    athleteCol: string;
    scoreCol: string;
    categoryCol: string;
    dateCol: string;
    emptyTitle: string;
    emptyDesc: string;
    podiumGold: string;
    podiumSilver: string;
    podiumBronze: string;
  };
}

export const translations: Record<Language, TranslationDictionary> = {
  ar: {
    nav: {
      roster: 'لوحة اللاعبين',
      rosterShort: 'اللاعبين',
      rosterTag: 'القوائم والمعايير',
      verticalJump: 'الوثب الرأسي',
      verticalJumpShort: 'الوثب',
      verticalJumpTag: 'CMJ / SJ / DJ',
      manualEntry: 'إدخال يدوي',
      manualEntryShort: 'يدوي',
      manualEntryTag: 'تسجيل سريع وأوزان',
      rsiCalculator: 'مؤشر RSI',
      rsiCalculatorShort: 'RSI',
      rsiCalculatorTag: 'القوة التفاعلية والارتداد',
      fvpCurve: 'منحنى FVP',
      fvpCurveShort: 'FVP',
      fvpCurveTag: 'القوة والسرعة المثالية',
      athleteProfile: 'ملف اللاعب',
      athleteProfileShort: 'الملف',
      athleteProfileTag: 'الرادار والتقارير',
      leaderboard: 'المتصدرين',
      leaderboardShort: 'المتصدرين',
      leaderboardTag: 'الأرقام القياسية',
      telemetryModules: 'أقسام النظام',
      systemOnline: 'النظام متصل',
      synced: 'مزامنة فورية',
      syncing: 'جاري التحديث...',
      offlineMode: 'وضع عدم الاتصال',
    },
    common: {
      save: 'حفظ',
      saving: 'جاري الحفظ...',
      cancel: 'إلغاء',
      delete: 'حذف',
      deleting: 'جاري الحذف...',
      edit: 'تعديل',
      add: 'إضافة',
      search: 'بحث...',
      filter: 'تصفية',
      all: 'الكل',
      male: 'ذكر',
      female: 'أنثى',
      cm: 'سم',
      inches: 'إنش',
      kg: 'كجم',
      sec: 'ثانية',
      ms: 'مللي ثانية',
      watts: 'واط',
      wattsPerKg: 'واط/كجم',
      metersPerSec: 'م/ث',
      date: 'التاريخ',
      actions: 'إجراءات',
      loading: 'جاري التحميل...',
      error: 'حدث خطأ',
      success: 'تم بنجاح',
      confirm: 'تأكيد',
      confirmDelete: 'هل أنت متأكد من الحذف؟',
      noData: 'لا توجد بيانات مسجلة',
      pr: 'رقم قياسي',
      personalBest: 'أفضل رقم شخصي',
      optimal: 'مثالي',
      warning: 'تحذير',
      fatigue: 'إجهاد عصبي',
      elite: 'نخبة',
      status: 'الحالة',
      notes: 'ملاحظات',
      close: 'إغلاق',
      back: 'رجوع',
      view: 'عرض',
      export: 'تصدير',
      print: 'طباعة التقرير',
    },
    hud: {
      appTitle: 'Vertical Lab',
      appSubtitle: 'مختبر الأداء الرياضي والميكانيكا الحيوية',
      versionBadge: 'v2.0 PRO',
      addCoach: 'إضافة مدرب',
      addAthlete: 'تسجيل لاعب',
      selectAthlete: '-- اختر لاعباً للبدء --',
      searchAthletePlaceholder: 'اكتب اسم اللاعب للبحث المباشر...',
      favorites: 'اللاعبون المفضّلون',
      unassignedAthletes: 'لاعبون بدون مدرب',
      noMatchingAthletes: 'لم يتم العثور على لاعبين مطابقين',
      noActiveAthlete: 'لم يتم تحديد لاعب',
      selectAthleteHint: 'اختر لاعباً للبدء',
      themeDark: 'داكن',
      themeLight: 'مضيء',
      registerCoachTitle: 'تسجيل مدرب جديد',
      coachFullName: 'اسم المدرب الكامل',
      coachPlaceholder: 'مثال: الكابتن أحمد علي',
      saveCoach: 'حفظ بيانات المدرب',
      registeredCoaches: 'المدربون المسجلون',
      deleteCoach: 'حذف المدرب',
      newAthleteTitle: 'تسجيل رياضي جديد',
      fullName: 'الاسم الكامل',
      birthYear: 'سنة الميلاد',
      gender: 'النوع',
      weightKg: 'الوزن (كجم)',
      heightCm: 'طول اللاعب (سم)',
      standingReachCm: 'الوصول من الثبات (سم)',
      legLengthM: 'طول الرجل (م)',
      assignedCoach: 'المدرب المسؤول',
      saveAthlete: 'حفظ بيانات اللاعب',
      deleteAthlete: 'حذف اللاعب',
      noCoach: '-- بدون مدرب --',
    },
    roster: {
      title: 'لوحة تحكم الفريق Roster Dashboard',
      subtitle: 'تتبع وتصنيف الأداء البيوميكانيكي لجميع اللاعبين بناءً على المعايير المصرية والدولية',
      handbookBtn: 'دليل المعايير والمراجع 📖',
      coachFilter: 'المدرب المسؤول:',
      allCoaches: 'جميع اللاعبين (الكل)',
      unassigned: 'لاعبون بدون مدرب',
      searchPlaceholder: 'ابحث عن لاعب بالاسم...',
      allGenders: 'جميع الفئات',
      malesOnly: 'ذكور فقط',
      femalesOnly: 'إناث فقط',
      cmjStatic: 'CMJ ثبات',
      approachDynamic: 'Approach حركي',
      rsiReactive: 'RSI ارتداد',
      notMeasured: 'لم يقاس',
      reach: 'الوصول:',
      weight: 'الوزن:',
      height: 'الطول:',
      age: 'العمر:',
      years: 'سنة',
      startTesting: 'بدء القياسات ⏱️',
      viewProfile: 'عرض الملف الكامل 📊',
      juniorFlag: 'معامل ناشئين مفعّل (خصم 15% من الحدود)',
      emptyTitle: 'لا يوجد لاعبين مطبقين',
      emptyDesc: 'لم يتم العثور على لاعبين يطابقون خيارات البحث. يرجى إضافة لاعبين جدد وتخصيص المدرب لهم.',
      handbookTitle: 'دليل معايير الأداء والقياسات البيوميكانيكية',
      menTab: 'الرجال (Men)',
      womenTab: 'السيدات (Women)',
      rsiTab: 'مؤشر الارتداد (RSI)',
      juniorsTab: 'الناشئين (Juniors)',
    },
    profile: {
      athleteDossier: 'الملف البيوميكانيكي للرياضي',
      noAthleteTitle: 'لم يتم اختيار أي لاعب',
      noAthleteDesc: 'يرجى اختيار لاعب من قائمة اللاعبين بالأعلى لعرض ملف القياسات والتأهيل الكامل.',
      exportCard: 'بطاقة المشاركة ⚡',
      editAthlete: 'تعديل البيانات',
      newTest: 'تسجيل اختبار جديد',
      ageYears: 'العمر:',
      massKg: 'الوزن:',
      statureCm: 'الطول:',
      legLengthM: 'طول الطرف:',
      reachCm: 'الوصول من الثبات:',
      peakCmj: 'أعلى وثب CMJ',
      cmjWithArms: 'أعلى وثب بالذراعين (CMJ)',
      cmjNoArms: 'وثب بدون ذراعين (CMJ No Arms)',
      squatJump: 'وثب من الثبات (Squat Jump SJ)',
      armGain: 'مساهمة الذراعين',
      peakApproach: 'أعلى ارتقاء Approach',
      peakRsi: 'أعلى مؤشر RSI',
      fvpStatus: 'توازن القوة والسرعة F-V',
      cnsReadiness: 'جاهزية الجهاز العصبي CNS',
      contactTime: 'زمن التلامس GCT',
      flightTime: 'زمن الطيران',
      vsAvg: 'مقارنة بالمعدل',
      optimalReadiness: 'جاهزية مثالية ⚡',
      moderateFatigue: 'إجهاد عصبي متوسط ⚠️',
      highFatigue: 'إجهاد عصبي عالي 🔴',
      fastSsc: 'Fast SSC (مرونة ارتدادية فائقة)',
      moderateSsc: 'Moderate SSC (كفاءة ارتدادية متوسطة)',
      slowSsc: 'Slow SSC (اعتماد عضلي على القوة)',
      forceDeficit: 'عجز في القوة القصوى (Force Deficit)',
      velocityDeficit: 'عجز في السرعة القصوى (Velocity Deficit)',
      balancedProfile: 'توازن مثالي بين القوة والسرعة',
      progressionTab: 'الارتقاء والتطور 📈',
      elasticityTab: 'مصفوفة المرونة والقوة ⚡',
      strengthTab: 'سجلات القوة 1RM 🏋️',
      radarTab: 'رادار القدرات البدنية 🕸️',
      historyTab: 'سجل الاختبارات والتاريخ 📋',
      jumpHeightTrend: 'مسار تطور ارتفاع الوثب (سم)',
      powerTrend: 'مسار تطور القدرة الانفجارية (واط)',
      eurTitle: 'نسبة الاستفادة اللامركزية (EUR Ratio)',
      eurFormula: 'EUR = CMJ (بدون ذراعين) ÷ SJ (من الثبات)',
      eurScore: 'قيمة مؤشر EUR',
      eurRatio: 'معدل الاستغلال اللامركزي (EUR)',
      reactiveIndex: 'مؤشر الارتداد (DJ / CMJ)',
      elasticDominant: 'نمط مرن مطاطي ارتدادي (Elastic-Dominant)',
      elasticDominantDesc: 'استغلال عالي جداً لمنعكس الاستطالة؛ الأوتار مطاطية وتتطلب تمارين أوزان ثقيلة لرفع القوة العضلية البحتة (F0).',
      strengthDominant: 'نمط عضلي انقباضي بطيء (Muscle-Dominant)',
      strengthDominantDesc: 'فارق ضئيل بين CMJ بدون أذرع و SJ؛ اللاعب يعتمد على القوة العضلية ويفقد الارتداد؛ يحتاج لبلايومتريكس سريع وتمارين هبوط.',
      wellBalanced: 'توازن نخبة مثالي بين الأوتار والعضلات',
      wellBalancedDesc: 'توازن استثنائي وتناغم تام بين القوة الانقباضية العضلية والصلابة الوترية الارتدادية.',
      generalDeficit: 'عجز عام في منظومة القدرة الانفجارية',
      generalDeficitDesc: 'سجل كلا من اختبار CMJ (بدون أذرع) و Squat Jump لحساب مصفوفة المرونة ومعامل EUR بدقة.',
      strength1rmTitle: 'سجلات القوة القصوى المقدرة 1RM',
      fullSquat1rm: 'سكوات كامل (Full Squat)',
      benchPress1rm: 'بنش برس (Bench Press)',
      powerClean1rm: 'باور كلين (Power Clean)',
      bwRatio: 'نسبة الوزن للجسم:',
      repsCount: 'التكرارات:',
      weekBlock: 'الأسبوع:',
      radarTitle: 'رادار التقييم البيوميكانيكي الشامل',
      volleyballClearance: 'فارق شبكة الطائرة (سم)',
      dunkMargin: 'فارق الدنك المريح (سم)',
      rimMargin: 'فارق حلقة السلة (سم)',
      testHistoryTitle: 'سجل الجلسات والاختبارات السابقة',
      filterAll: 'جميع الاختبارات',
      filterCmj: 'الوثب الرأسي فقط',
      filterRsi: 'اختبارات RSI فقط',
      filterStrength: 'تمارين القوة 1RM فقط',
      testTypeCol: 'نوع الاختبار',
      scoreCol: 'النتيجة / الارتفاع',
      contactTimeCol: 'زمن التلامس GCT',
      powerCol: 'القدرة (واط)',
      dateCol: 'التاريخ',
      deleteRecordConfirm: 'هل أنت متأكد من حذف هذا السجل نهائياً؟',
      editRecordTitle: 'تعديل سجل الاختبار',
      printReportTitle: 'خيارات تصدير ملف اللاعب PDF',
      includeStrengthOption: 'تضمين جدول تمارين القوة القصوى (1RM) في التقرير',
      generatePdf: 'تحميل وطباعة التقرير 📄',
    },
    jumpConsole: {
      title: 'منصة قياس وتحليل الوثب الرأسي',
      subtitle: 'تحليل دقيق بالفيديو وبمعدل إطارات مرتفع مع كشف آلي لنقاط الإقلاع والهبوط',
      selectVideo: 'اختر فيديو من الجهاز',
      openCamera: 'تسجيل بالكاميرا المباشرة',
      playbackControls: 'أدوات التحكم بالإطارات والبطء',
      autoDetect: 'كشف آلي للقفزة 🤖',
      detecting: 'جاري التحليل الحركي...',
      takeoffPoint: 'لحظة الإقلاع (Takeoff)',
      landingPoint: 'لحظة الهبوط (Landing)',
      touchdownPoint: 'لحظة ملامسة الصندوق (DJ)',
      flightDuration: 'زمن الطيران المحسوب',
      calculatedHeight: 'ارتفاع الوثب النهائي',
      takeoffVel: 'السرعة الابتدائية للإقلاع',
      peakPower: 'القدرة الانفجارية القصوى',
      saveTestResult: 'حفظ النتيجة في ملف اللاعب 💾',
      testTypeTag: 'نوع الوثب المحلل:',
      slowMoPreset: 'سرعة العرض / الفريمات:',
      frameByFrame: 'تحريك إطار بإطار:',
    },
    manualEntry: {
      title: 'وحدة الإدخال اليدوي السريع',
      subtitle: 'تسجيل نتائج الاختبارات الميدانية وأوزان القوة القصوى 1RM فورياً',
      jumpMode: 'اختبارات الوثب والارتقاء 🚀',
      strengthMode: 'اختبارات القوة 1RM 🏋️',
      testTypeLabel: 'نوع الاختبار:',
      dateLabel: 'تاريخ الاختبار:',
      heightInput: 'ارتفاع القفزة (سم):',
      flightTimeInput: 'زمن الطيران (ثانية):',
      contactTimeInput: 'زمن التلامس بالأرض (GCT):',
      rsiDirectInput: 'مؤشر RSI المباشر:',
      rsiModeToggle: 'طريقة إدخال الـ RSI:',
      rsiModeDirect: 'إدخال رقم RSI يدوياً ✍️',
      rsiModeAutoHeight: 'حساب تلقائي (الارتفاع ÷ التلامس)',
      rsiModeAutoFlight: 'حساب تلقائي (زمن الطيران ÷ التلامس)',
      gctMillisecondsHint: 'بالمللي ثانية (ms) أو بالثواني (s)',
      boxHeightInput: 'ارتفاع صندوق السقوط (سم):',
      addedLoadInput: 'الوزن الإضافي المرفوع (كجم):',
      strengthLiftLabel: 'التمرين المحدد:',
      weightLiftedInput: 'الوزن المرفوع (كجم):',
      weekNumberLabel: 'رقم الأسبوع التدريبي:',
      repsCountLabel: 'عدد التكرارات المنجزة:',
      bwRatioLabel: 'معامل وزن الجسم:',
      notesLabel: 'ملاحظات الكابتن:',
      saveMeasurement: 'حفظ النتيجة في ملف اللاعب 💾',
      printInfographic: 'طباعة إنفوجرافيك الإدخال 🖨️',
      recentLoggedTitle: 'آخر القياسات المسجلة للاعب',
      estimated1rm: 'القوة القصوى المقدرة 1RM:',
    },
    rsiConsole: {
      title: 'حاسبة ومحلل مؤشر القوة التفاعلية (RSI)',
      subtitle: 'تقييم كفاءة دورة التمدد والتقصير (Stretch-Shortening Cycle) وزمن التلامس مع الأرض',
      methodToggle: 'طريقة الحساب المعتمدة:',
      heightGctMethod: 'الارتفاع (م) ÷ زمن التلامس (ث) [القياسي]',
      flightGctMethod: 'زمن الطيران (ث) ÷ زمن التلامس (ث)',
      boxHeight: 'ارتفاع الصندوق المستخدم:',
      contactTime: 'زمن التلامس بالأرض (GCT):',
      flightTime: 'زمن الطيران (Flight Time):',
      jumpHeight: 'ارتفاع الوثبة الناتج:',
      rsiScore: 'مؤشر القوة التفاعلية RSI النهائي:',
      gctClassification: 'تصنيف زمن التلامس الحركي:',
      fastSscDesc: 'أقل من 170ms: كفاءة مرنة استثنائية (Fast SSC)',
      moderateSscDesc: '170ms إلى 250ms: كفاءة متوسطة متوازنة (Moderate SSC)',
      slowSscDesc: 'أكثر من 250ms: اعتماد بطيء على القوة العضلية (Slow SSC)',
      saveRsiTest: 'حفظ نتيجة RSI للاعب 💾',
      liveFeedback: 'التشخيص الحركي الفوري:',
    },
    fvpConsole: {
      title: 'منحنى القوة والسرعة (Force-Velocity Profile)',
      subtitle: 'تحليل ميكانيكي دقيق وفق طريقة البروفيسور ساموزينو لتحديد العجز التدريبي بدقة',
      methodDesc: 'أدخل 4 محاولات قفز بأوزان تدريجية مختلفة لحساب القوة القصوى والسرعة المثالية',
      jumpInputsTitle: 'بيانات القفزات الأربع المحملة بالأوزان:',
      bodyMass: 'كتلة جسم اللاعب (كجم):',
      pushOffDistance: 'مسافة الدفع الحركي (متر):',
      loadTrial: 'محاولة قفز',
      jumpHeightCm: 'الارتفاع (سم)',
      f0Force: 'القوة النظرية القصوى F₀:',
      v0Velocity: 'السرعة النظرية القصوى V₀:',
      pmaxPower: 'القدرة القصوى Pmax:',
      sfvSlope: 'ميل المنحنى الحالي Sfv:',
      sfvOptSlope: 'الميل المثالي المطلوب Sfv(opt):',
      imbalancePercent: 'نسبة الخلل الميكانيكي FV-imb%:',
      actualVsOptCurve: 'مقارنة المنحنى الحالي بالمنحنى المثالي',
      trainingPrescription: 'التوصية والبروتوكول التدريبي المعتمد:',
      highForceDeficitPresc: 'عجز حاد في القوة -> التركيز على أوزان ثقيلة وسكوات بطيء لرفع F₀',
      highVelocityDeficitPresc: 'عجز حاد في السرعة -> التركيز على بليومتريك سريع ومساعد لرفع V₀',
      balancedPresc: 'ملف متوازن ومثالي -> الحفاظ على التدريب التبادلي المشترك للقدرة',
    },
    leaderboard: {
      title: 'لوحة المتصدرين والأرقام القياسية',
      subtitle: 'ترتيب أفضل أداء للاعبي الفريق في الوثب الرأسي ومؤشر القوة التفاعلية RSI',
      categoryVertical: 'الوثب الرأسي العمودي 🚀',
      categoryRsi: 'مؤشر القوة التفاعلية RSI ⚡',
      allAthletes: 'جميع اللاعبين',
      males: 'ذكور فقط',
      females: 'إناث فقط',
      rankCol: 'المركز',
      athleteCol: 'اسم اللاعب',
      scoreCol: 'أفضل رقم مسجل',
      categoryCol: 'الفئة',
      dateCol: 'التاريخ',
      emptyTitle: 'لا توجد أرقام مسجلة حالياً',
      emptyDesc: 'سجل قفزات واختبارات للاعبي الفريق للظهور في لوحة الشرف.',
      podiumGold: 'المركز الأول 🥇',
      podiumSilver: 'المركز الثاني 🥈',
      podiumBronze: 'المركز الثالث 🥉',
    },
  },
  en: {
    nav: {
      roster: 'Roster Dashboard',
      rosterShort: 'Roster',
      rosterTag: 'Athletes & Norms',
      verticalJump: 'Vertical Jump',
      verticalJumpShort: 'Jump',
      verticalJumpTag: 'CMJ / SJ / DJ',
      manualEntry: 'Manual Entry',
      manualEntryShort: 'Manual',
      manualEntryTag: 'Rapid Log & 1RM',
      rsiCalculator: 'RSI Calculator',
      rsiCalculatorShort: 'RSI',
      rsiCalculatorTag: 'Reactive Strength',
      fvpCurve: 'F-V Profile',
      fvpCurveShort: 'FVP',
      fvpCurveTag: 'Samozino Method',
      athleteProfile: 'Athlete Profile',
      athleteProfileShort: 'Profile',
      athleteProfileTag: 'Radar & Dossier',
      leaderboard: 'Leaderboard',
      leaderboardShort: 'Leaderboard',
      leaderboardTag: 'PRs & Rankings',
      telemetryModules: 'TELEMETRY MODULES',
      systemOnline: 'ONLINE',
      synced: 'SYNCED',
      syncing: 'SYNCING...',
      offlineMode: 'OFFLINE MODE',
    },
    common: {
      save: 'Save',
      saving: 'Saving...',
      cancel: 'Cancel',
      delete: 'Delete',
      deleting: 'Deleting...',
      edit: 'Edit',
      add: 'Add',
      search: 'Search...',
      filter: 'Filter',
      all: 'All',
      male: 'Male',
      female: 'Female',
      cm: 'cm',
      inches: 'in',
      kg: 'kg',
      sec: 's',
      ms: 'ms',
      watts: 'W',
      wattsPerKg: 'W/kg',
      metersPerSec: 'm/s',
      date: 'Date',
      actions: 'Actions',
      loading: 'Loading...',
      error: 'An error occurred',
      success: 'Operation completed successfully',
      confirm: 'Confirm',
      confirmDelete: 'Are you sure you want to delete this record?',
      noData: 'No records found',
      pr: 'PR',
      personalBest: 'Personal Best',
      optimal: 'Optimal',
      warning: 'Warning',
      fatigue: 'CNS Fatigue',
      elite: 'Elite',
      status: 'Status',
      notes: 'Notes',
      close: 'Close',
      back: 'Back',
      view: 'View',
      export: 'Export',
      print: 'Print Report',
    },
    hud: {
      appTitle: 'Vertical Lab',
      appSubtitle: 'Athletic Performance & Biomechanics Lab',
      versionBadge: 'v2.0 PRO',
      addCoach: 'Add Coach',
      addAthlete: 'Register Athlete',
      selectAthlete: '-- Select athlete to start --',
      searchAthletePlaceholder: 'Type athlete name to search...',
      favorites: 'Favorite Athletes',
      unassignedAthletes: 'Unassigned Athletes',
      noMatchingAthletes: 'No matching athletes found',
      noActiveAthlete: 'No Active Athlete',
      selectAthleteHint: 'Select Athlete',
      themeDark: 'Dark',
      themeLight: 'Light',
      registerCoachTitle: 'Register New Coach',
      coachFullName: 'Coach Full Name',
      coachPlaceholder: 'e.g. Coach Ahmed Ali',
      saveCoach: 'Save Coach Data',
      registeredCoaches: 'Registered Coaches',
      deleteCoach: 'Delete Coach',
      newAthleteTitle: 'Register New Athlete',
      fullName: 'Full Name',
      birthYear: 'Birth Year',
      gender: 'Gender',
      weightKg: 'Weight (kg)',
      heightCm: 'Height (cm)',
      standingReachCm: 'Standing Reach (cm)',
      legLengthM: 'Leg Length (m)',
      assignedCoach: 'Assigned Coach',
      saveAthlete: 'Save Athlete',
      deleteAthlete: 'Delete Athlete',
      noCoach: '-- No Coach --',
    },
    roster: {
      title: 'Team Roster Dashboard',
      subtitle: 'Track and classify biomechanical telemetry across all team athletes',
      handbookBtn: 'Normative Standards Handbook 📖',
      coachFilter: 'Assigned Coach:',
      allCoaches: 'All Athletes (Total Roster)',
      unassigned: 'Unassigned Athletes',
      searchPlaceholder: 'Search athlete by name...',
      allGenders: 'All Genders',
      malesOnly: 'Males Only',
      femalesOnly: 'Females Only',
      cmjStatic: 'CMJ Static',
      approachDynamic: 'Approach Jump',
      rsiReactive: 'RSI Reactive',
      notMeasured: 'Not Tested',
      reach: 'Reach:',
      weight: 'Weight:',
      height: 'Height:',
      age: 'Age:',
      years: 'yrs',
      startTesting: 'Start Testing ⏱️',
      viewProfile: 'Full Dossier 📊',
      juniorFlag: 'Junior Factor Active (15% Threshold Discount)',
      emptyTitle: 'No Matching Athletes',
      emptyDesc: 'No athletes match the current filter criteria. Register new athletes to populate this coach roster.',
      handbookTitle: 'Biomechanical Telemetry & Performance Norms',
      menTab: 'Men Standards',
      womenTab: 'Women Standards',
      rsiTab: 'RSI Standards',
      juniorsTab: 'Junior Standards',
    },
    profile: {
      athleteDossier: 'Athlete Biomechanical Dossier',
      noAthleteTitle: 'No Athlete Selected',
      noAthleteDesc: 'Please select an athlete from the roster header to view their full biomechanical dossier.',
      exportCard: 'Export Card ⚡',
      editAthlete: 'Edit Athlete',
      newTest: 'Log New Test',
      ageYears: 'Age:',
      massKg: 'Mass:',
      statureCm: 'Height:',
      legLengthM: 'Leg Length:',
      reachCm: 'Standing Reach:',
      peakCmj: 'Peak CMJ Height',
      cmjWithArms: 'CMJ (with Arms)',
      cmjNoArms: 'CMJ (No Arms)',
      squatJump: 'Squat Jump (SJ Static)',
      armGain: 'Arm Swing Gain',
      peakApproach: 'Peak Approach',
      peakRsi: 'Peak RSI Score',
      fvpStatus: 'F-V Profile Status',
      cnsReadiness: 'CNS Readiness Score',
      contactTime: 'Contact Time (GCT)',
      flightTime: 'Flight Duration',
      vsAvg: 'vs Average',
      optimalReadiness: 'Optimal Readiness ⚡',
      moderateFatigue: 'Moderate Fatigue ⚠️',
      highFatigue: 'High CNS Fatigue 🔴',
      fastSsc: 'Fast SSC (Elite Elasticity)',
      moderateSsc: 'Moderate SSC (Balanced)',
      slowSsc: 'Slow SSC (Strength Dependent)',
      forceDeficit: 'High Force Deficit',
      velocityDeficit: 'High Velocity Deficit',
      balancedProfile: 'Well-Balanced Profile',
      progressionTab: 'Progression 📈',
      elasticityTab: 'Elasticity vs Strength ⚡',
      strengthTab: 'Strength 1RM Records 🏋️',
      radarTab: 'Capacity Radar 🕸️',
      historyTab: 'Test Session Log 📋',
      jumpHeightTrend: 'Jump Height Progression Trend (cm)',
      powerTrend: 'Explosive Peak Power Trend (Watts)',
      eurTitle: 'Eccentric Utilization Ratio (EUR)',
      eurFormula: 'EUR = CMJ (no arms) ÷ Squat Jump (SJ)',
      eurScore: 'EUR Index Value',
      eurRatio: 'EUR Ratio',
      reactiveIndex: 'Reactive Index (DJ / CMJ)',
      elasticDominant: 'Elastic-Dominant (High Tendon Recoil)',
      elasticDominantDesc: 'High tendon compliance and stretch recoil. Athlete needs heavy slow resistance (F0) to balance strength.',
      strengthDominant: 'Muscle-Dominant (Slow Force Production)',
      strengthDominantDesc: 'High contractile muscular force but deficient stretch-shortening recoil. Athlete needs elastic plyometrics.',
      wellBalanced: 'Elite Equilibrium (Optimal Tendon-Muscle)',
      wellBalancedDesc: 'Optimal harmony between muscle cross-sectional force and tendon stiffness recoil.',
      generalDeficit: 'General Explosive Deficit',
      generalDeficitDesc: 'Log both CMJ (no arms) and Squat Jump (SJ) tests to calculate full elasticity profile.',
      strength1rmTitle: 'Estimated Maximum Strength (1RM)',
      fullSquat1rm: 'Full Squat 1RM',
      benchPress1rm: 'Bench Press 1RM',
      powerClean1rm: 'Power Clean 1RM',
      bwRatio: 'Bodyweight Ratio:',
      repsCount: 'Reps:',
      weekBlock: 'Week:',
      radarTitle: 'Biomechanical Capacity Matrix',
      volleyballClearance: 'Volleyball Net Margin (cm)',
      dunkMargin: 'Basketball Dunk Margin (cm)',
      rimMargin: 'Rim Touch Clearance (cm)',
      testHistoryTitle: 'Historical Session Records & Log',
      filterAll: 'All Tests',
      filterCmj: 'Vertical Jump Only',
      filterRsi: 'RSI Drop Jumps Only',
      filterStrength: '1RM Strength Only',
      testTypeCol: 'Test Type',
      scoreCol: 'Score / Height',
      contactTimeCol: 'Ground Contact (GCT)',
      powerCol: 'Peak Power',
      dateCol: 'Date',
      deleteRecordConfirm: 'Are you sure you want to permanently delete this test record?',
      editRecordTitle: 'Edit Test Record',
      printReportTitle: 'Athlete PDF Export Configuration',
      includeStrengthOption: 'Include Maximum Strength (1RM) table in report',
      generatePdf: 'Download PDF Report 📄',
    },
    jumpConsole: {
      title: 'Vertical Jump Video Telemetry',
      subtitle: 'High-frame-rate video analysis with automated takeoff and landing phase recognition',
      selectVideo: 'Choose Video File',
      openCamera: 'Live Camera Capture',
      playbackControls: 'Playback & Slow Motion Controls',
      autoDetect: 'AI Auto Phase Detection 🤖',
      detecting: 'Analyzing kinematics...',
      takeoffPoint: 'Takeoff Frame',
      landingPoint: 'Landing Frame',
      touchdownPoint: 'Box Touchdown (DJ)',
      flightDuration: 'Calculated Flight Duration',
      calculatedHeight: 'Final Jump Height',
      takeoffVel: 'Takeoff Velocity',
      peakPower: 'Peak Mechanical Power',
      saveTestResult: 'Save Result to Athlete Dossier 💾',
      testTypeTag: 'Jump Category:',
      slowMoPreset: 'Playback Frame Speed:',
      frameByFrame: 'Step Frame-by-Frame:',
    },
    manualEntry: {
      title: 'Rapid Telemetry Entry Console',
      subtitle: 'Directly record field testing metrics and 1RM maximum strength benchmarks',
      jumpMode: 'Jump & Explosive Testing 🚀',
      strengthMode: '1RM Strength Testing 🏋️',
      testTypeLabel: 'Test Type:',
      dateLabel: 'Test Date:',
      heightInput: 'Jump Height (cm):',
      flightTimeInput: 'Flight Duration (s):',
      contactTimeInput: 'Ground Contact Time (GCT):',
      rsiDirectInput: 'Direct RSI Score:',
      rsiModeToggle: 'RSI Calculation Mode:',
      rsiModeDirect: 'Direct Manual RSI ✍️',
      rsiModeAutoHeight: 'Auto (Height / GCT)',
      rsiModeAutoFlight: 'Auto (Flight / GCT)',
      gctMillisecondsHint: 'in milliseconds (ms) or seconds (s)',
      boxHeightInput: 'Drop Box Height (cm):',
      addedLoadInput: 'Added Load (kg):',
      strengthLiftLabel: 'Strength Exercise:',
      weightLiftedInput: 'Weight Lifted (kg):',
      weekNumberLabel: 'Training Week Block:',
      repsCountLabel: 'Completed Repetitions:',
      bwRatioLabel: 'Bodyweight Multiplier:',
      notesLabel: 'Coach Notes:',
      saveMeasurement: 'Save Measurement to Dossier 💾',
      printInfographic: 'Print Manual Infographic 🖨️',
      recentLoggedTitle: 'Recent Logged Records',
      estimated1rm: 'Estimated 1RM Benchmark:',
    },
    rsiConsole: {
      title: 'Reactive Strength Index (RSI) Analyzer',
      subtitle: 'Evaluate Stretch-Shortening Cycle (SSC) efficiency and ground contact time dynamics',
      methodToggle: 'Calculation Methodology:',
      heightGctMethod: 'Jump Height (m) ÷ Contact Time (s) [Standard]',
      flightGctMethod: 'Flight Time (s) ÷ Contact Time (s)',
      boxHeight: 'Drop Box Height:',
      contactTime: 'Ground Contact Time (GCT):',
      flightTime: 'Flight Duration (s):',
      jumpHeight: 'Resulting Jump Height:',
      rsiScore: 'Final RSI Index Score:',
      gctClassification: 'Ground Contact Classification:',
      fastSscDesc: '< 170ms: Elite Elastic SSC Recoil',
      moderateSscDesc: '170ms - 250ms: Moderate Dynamic SSC',
      slowSscDesc: '> 250ms: Slow Muscle-Dependent SSC',
      saveRsiTest: 'Save RSI Record to Dossier 💾',
      liveFeedback: 'Biomechanical Diagnostic:',
    },
    fvpConsole: {
      title: 'Force-Velocity Profiling (F-V Curve)',
      subtitle: 'Precise Samozino method evaluation to pinpoint mechanical deficits and prescribe training',
      methodDesc: 'Input 4 loaded squat jump trials to calculate theoretical maximum force and optimal velocity',
      jumpInputsTitle: 'Progressive Loaded Jump Inputs:',
      bodyMass: 'Athlete Body Mass (kg):',
      pushOffDistance: 'Push-Off Distance h₀ (m):',
      loadTrial: 'Loaded Trial',
      jumpHeightCm: 'Jump Height (cm)',
      f0Force: 'Theoretical Max Force F₀:',
      v0Velocity: 'Theoretical Max Velocity V₀:',
      pmaxPower: 'Max Mechanical Power Pmax:',
      sfvSlope: 'Actual F-V Slope Sfv:',
      sfvOptSlope: 'Optimal Required Slope Sfv(opt):',
      imbalancePercent: 'Mechanical Imbalance FV-imb%:',
      actualVsOptCurve: 'Current vs Optimal Slope Comparison',
      trainingPrescription: 'Prescribed Training Protocol:',
      highForceDeficitPresc: 'Severe Force Deficit -> Prioritize heavy slow resistance and deep squats to raise F₀',
      highVelocityDeficitPresc: 'Severe Velocity Deficit -> Prioritize high-speed ballistics and assisted jumps to raise V₀',
      balancedPresc: 'Well-Balanced Profile -> Maintain combined contrast and power training',
    },
    leaderboard: {
      title: 'Athlete Leaderboard & Records',
      subtitle: 'Rankings and podiums for vertical jump heights and reactive strength RSI',
      categoryVertical: 'Vertical Jump PRs 🚀',
      categoryRsi: 'RSI Reactive Index PRs ⚡',
      allAthletes: 'All Athletes',
      males: 'Males Only',
      females: 'Females Only',
      rankCol: 'Rank',
      athleteCol: 'Athlete',
      scoreCol: 'Top Score',
      categoryCol: 'Category',
      dateCol: 'Date',
      emptyTitle: 'No Records Logged Yet',
      emptyDesc: 'Perform jump tests or log manual measurements to establish team rankings.',
      podiumGold: 'Gold Medal 🥇',
      podiumSilver: 'Silver Medal 🥈',
      podiumBronze: 'Bronze Medal 🥉',
    },
  },
};
