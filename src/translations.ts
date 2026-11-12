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
  };
  common: {
    save: string;
    saving: string;
    cancel: string;
    delete: string;
    edit: string;
    filter: string;
    male: string;
    female: string;
    actions: string;
    error: string;
    success: string;
    confirm: string;
    confirmDelete: string;
    noData: string;
    status: string;
    notes: string;
    close: string;
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
    squatTrochanterM: string;
    squatTrochanterHelp: string;
    hpoLabel: string;
    hpoEstimatedBadge: string;
    assignedCoach: string;
    saveAthlete: string;
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
    weight: string;
    height: string;
    age: string;
    years: string;
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
    massKg: string;
    statureCm: string;
    legLengthM: string;
    reachCm: string;
    cmjWithArms: string;
    cmjNoArms: string;
    squatJump: string;
    armGain: string;
    peakApproach: string;
    peakRsi: string;
    fvpStatus: string;
    readinessBaseline: string;
    readinessNotEnough: string;
    cnsReadiness: string;
    contactTime: string;
    flightTime: string;
    optimalReadiness: string;
    moderateFatigue: string;
    highFatigue: string;
    forceDeficit: string;
    velocityDeficit: string;
    balancedProfile: string;
    progressionTab: string;
    elasticityTab: string;
    strengthTab: string;
    jumpHeightTrend: string;
    eurTitle: string;
    eurFormula: string;
    eurRatio: string;
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
    flightTimeCol: string;
    jumpHeightCol: string;
    rsiScoreCol: string;
    deleteRecordConfirm: string;
    editRecordTitle: string;
    editTestTypeLabel: string;
    editDateLabel: string;
    editJumpHeightLabel: string;
    editFlightTimeLabel: string;
    editRsiScoreLabel: string;
    editContactTimeLabel: string;
    editBoxHeightLabel: string;
    editTakeoffVelocityLabel: string;
    editPeakPowerLabel: string;
    editCleanWeightLabel: string;
    editRepsCountLabel: string;
    editWeekNumberLabel: string;
    subfilterAll: string;
    subfilterCmjArms: string;
    subfilterCmjNoArms: string;
    subfilterSquatJump: string;
    subfilterApproach: string;
    printReportTitle: string;
    includeStrengthOption: string;
    generatePdf: string;
  };
  jumpConsole: {
    title: string;
    subtitle: string;
    selectVideo: string;
    openCamera: string;
    peakPower: string;
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
    boxHeightInput: string;
    strengthLiftLabel: string;
    weightLiftedInput: string;
    weekNumberLabel: string;
    repsCountLabel: string;
    notesLabel: string;
    saveMeasurement: string;
    recentLoggedTitle: string;
  };
  rsiConsole: {
    title: string;
    subtitle: string;
    heightGctMethod: string;
    flightGctMethod: string;
    contactTime: string;
    flightTime: string;
    jumpHeight: string;
    rsiScore: string;
    saveRsiTest: string;
  };
  fvpConsole: {
    title: string;
    subtitle: string;
    methodDesc: string;
    bodyMass: string;
    loadTrial: string;
    jumpHeightCm: string;
    f0Force: string;
    v0Velocity: string;
    pmaxPower: string;
    sfvSlope: string;
    sfvOptSlope: string;
    imbalancePercent: string;
    actualVsOptCurve: string;
    flightTimeS: string;
    trial: string;
    addTrial: string;
    removeTrial: string;
    compute: string;
    invalidTitle: string;
    reasonTooFew: string;
    reasonNoVariation: string;
    reasonSlope: string;
    reasonR2: string;
    reasonMissing: string;
    rawPoints: string;
    load: string;
    height: string;
    force: string;
    velocity: string;
    bandWell: string;
    bandModForce: string;
    bandModVel: string;
    bandLargeForce: string;
    bandLargeVel: string;
    prescForce: string;
    prescVel: string;
    prescBalanced: string;
    optimalCurve: string;
    actualCurve: string;
    tabFvp: string;
    tabFt: string;
    ftTitle: string;
    ftSubtitle: string;
    ftSampling: string;
    ftPaste: string;
    ftLoadFile: string;
    ftAnalyze: string;
    ftMethod: string;
    ftErrTooShort: string;
    ftErrQuiet: string;
    ftErrOnset: string;
    ftErrTakeoff: string;
    ftErrVelocity: string;
    ftJumpHeight: string;
    ftTakeoffVel: string;
    ftTimeToTakeoff: string;
    ftRsiMod: string;
    ftPeakForce: string;
    ftMeanPropForce: string;
    ftPeakPower: string;
    ftImpulse: string;
    ftBodyWeight: string;
    ftPropDuration: string;
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
    },
    common: {
      save: 'حفظ',
      saving: 'جاري الحفظ...',
      cancel: 'إلغاء',
      delete: 'حذف',
      edit: 'تعديل',
      filter: 'تصفية',
      male: 'ذكر',
      female: 'أنثى',
      actions: 'إجراءات',
      error: 'حدث خطأ',
      success: 'تم بنجاح',
      confirm: 'تأكيد',
      confirmDelete: 'هل أنت متأكد من الحذف؟',
      noData: 'لا توجد بيانات مسجلة',
      status: 'الحالة',
      notes: 'ملاحظات',
      close: 'إغلاق',
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
      squatTrochanterM: 'ارتفاع المدور في قرفصاء 90° (م)',
      squatTrochanterHelp: 'طول الرجل = من المدور الكبير لأطراف الأصابع والقدم ممدودة. hPO = طول الرجل − ارتفاع نفس النقطة في قرفصاء 90°.',
      hpoLabel: 'مسافة الدفع hPO',
      hpoEstimatedBadge: 'hPO تقديري',
      assignedCoach: 'المدرب المسؤول',
      saveAthlete: 'حفظ بيانات اللاعب',
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
      weight: 'الوزن:',
      height: 'الطول:',
      age: 'العمر:',
      years: 'سنة',
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
      massKg: 'الوزن:',
      statureCm: 'الطول:',
      legLengthM: 'طول الطرف:',
      reachCm: 'الوصول من الثبات:',
      cmjWithArms: 'أعلى وثب بالذراعين (CMJ)',
      cmjNoArms: 'وثب بدون ذراعين (CMJ No Arms)',
      squatJump: 'وثب من الثبات (Squat Jump SJ)',
      armGain: 'مساهمة الذراعين',
      peakApproach: 'أعلى ارتقاء Approach',
      peakRsi: 'أعلى مؤشر RSI',
      fvpStatus: 'توازن القوة والسرعة F-V',
      readinessBaseline: 'خط الأساس (آخر 14 يوم)',
      readinessNotEnough: 'بيانات غير كافية: محتاج 3 اختبارات CMJ على الأقل في الـ14 يوم اللي قبل آخر اختبار',
      cnsReadiness: 'جاهزية الجهاز العصبي CNS',
      contactTime: 'زمن التلامس GCT',
      flightTime: 'زمن الطيران',
      optimalReadiness: 'جاهزية مثالية ⚡',
      moderateFatigue: 'إجهاد عصبي متوسط ⚠️',
      highFatigue: 'إجهاد عصبي عالي 🔴',
      forceDeficit: 'عجز في القوة القصوى (Force Deficit)',
      velocityDeficit: 'عجز في السرعة القصوى (Velocity Deficit)',
      balancedProfile: 'توازن مثالي بين القوة والسرعة',
      progressionTab: 'الارتقاء والتطور 📈',
      elasticityTab: 'مصفوفة المرونة والقوة ⚡',
      strengthTab: 'سجلات القوة 1RM 🏋️',
      jumpHeightTrend: 'مسار تطور ارتفاع الوثب (سم)',
      eurTitle: 'نسبة الاستفادة اللامركزية (EUR Ratio)',
      eurFormula: 'EUR = CMJ (بدون ذراعين) ÷ SJ (من الثبات)',
      eurRatio: 'معدل الاستغلال اللامركزي (EUR)',
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
      flightTimeCol: 'زمن الطيران (FT)',
      jumpHeightCol: 'ارتفاع القفزة (سم)',
      rsiScoreCol: 'مؤشر RSI',
      deleteRecordConfirm: 'هل أنت متأكد من حذف هذا السجل نهائياً؟',
      editRecordTitle: 'تعديل سجل الاختبار والقياسات',
      editTestTypeLabel: 'نوع الاختبار / القفزة',
      editDateLabel: 'تاريخ الاختبار',
      editJumpHeightLabel: 'ارتفاع القفزة (سم)',
      editFlightTimeLabel: 'زمن الطيران (ثواني)',
      editRsiScoreLabel: 'رقم مؤشر RSI',
      editContactTimeLabel: 'زمن التلامس (مللي ثانية أو ثواني)',
      editBoxHeightLabel: 'ارتفاع صندوق الهبوط (سم)',
      editTakeoffVelocityLabel: 'سرعة الانطلاق (م/ث)',
      editPeakPowerLabel: 'القدرة الانفجارية القصوى (واط)',
      editCleanWeightLabel: 'الوزن المرفوع (كجم)',
      editRepsCountLabel: 'عدد التكرارات',
      editWeekNumberLabel: 'رقم الأسبوع التدريبي',
      subfilterAll: 'جميع الوثب الرأسي',
      subfilterCmjArms: 'CMJ بالأذرع (with arms)',
      subfilterCmjNoArms: 'CMJ بدون أذرع (no arms)',
      subfilterSquatJump: 'وثب من الثبات (Squat Jump SJ)',
      subfilterApproach: 'قفزة اقتراب (Approach)',
      printReportTitle: 'خيارات تصدير ملف اللاعب PDF',
      includeStrengthOption: 'تضمين جدول تمارين القوة القصوى (1RM) في التقرير',
      generatePdf: 'تحميل وطباعة التقرير 📄',
    },
    jumpConsole: {
      title: 'منصة قياس وتحليل الوثب الرأسي',
      subtitle: 'تحليل دقيق بالفيديو وبمعدل إطارات مرتفع مع كشف آلي لنقاط الإقلاع والهبوط',
      selectVideo: 'اختر فيديو من الجهاز',
      openCamera: 'تسجيل بالكاميرا المباشرة',
      peakPower: 'القدرة الانفجارية القصوى',
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
      contactTimeInput: 'زمن التلامس بالأرض (GCT) بالملّي ثانية:',
      rsiDirectInput: 'مؤشر RSI المباشر:',
      rsiModeToggle: 'طريقة إدخال الـ RSI:',
      rsiModeDirect: 'إدخال رقم RSI يدوياً ✍️',
      rsiModeAutoHeight: 'حساب تلقائي (الارتفاع ÷ التلامس)',
      rsiModeAutoFlight: 'حساب تلقائي (زمن الطيران ÷ التلامس)',
      boxHeightInput: 'ارتفاع صندوق السقوط (سم):',
      strengthLiftLabel: 'التمرين المحدد:',
      weightLiftedInput: 'الوزن المرفوع (كجم):',
      weekNumberLabel: 'رقم الأسبوع التدريبي:',
      repsCountLabel: 'عدد التكرارات المنجزة:',
      notesLabel: 'ملاحظات الكابتن:',
      saveMeasurement: 'حفظ النتيجة في ملف اللاعب 💾',
      recentLoggedTitle: 'آخر القياسات المسجلة للاعب',
    },
    rsiConsole: {
      title: 'حاسبة ومحلل مؤشر القوة التفاعلية (RSI)',
      subtitle: 'تقييم كفاءة دورة التمدد والتقصير (Stretch-Shortening Cycle) وزمن التلامس مع الأرض',
      heightGctMethod: 'الارتفاع (م) ÷ زمن التلامس (ث) [القياسي]',
      flightGctMethod: 'زمن الطيران (ث) ÷ زمن التلامس (ث)',
      contactTime: 'زمن التلامس بالأرض (GCT):',
      flightTime: 'زمن الطيران (Flight Time):',
      jumpHeight: 'ارتفاع الوثبة الناتج:',
      rsiScore: 'مؤشر القوة التفاعلية RSI النهائي:',
      saveRsiTest: 'حفظ نتيجة RSI للاعب 💾',
    },
    fvpConsole: {
      title: 'منحنى القوة والسرعة (Force-Velocity Profile)',
      subtitle: 'تحليل ميكانيكي دقيق وفق طريقة البروفيسور ساموزينو لتحديد العجز التدريبي بدقة',
      methodDesc: 'أدخل 4 محاولات قفز بأوزان تدريجية مختلفة لحساب القوة القصوى والسرعة المثالية',
      bodyMass: 'كتلة جسم اللاعب (كجم):',
      loadTrial: 'محاولة قفز',
      jumpHeightCm: 'الارتفاع (سم)',
      f0Force: 'القوة النظرية القصوى F₀:',
      v0Velocity: 'السرعة النظرية القصوى V₀:',
      pmaxPower: 'القدرة القصوى Pmax:',
      sfvSlope: 'ميل المنحنى الحالي Sfv:',
      sfvOptSlope: 'الميل المثالي المطلوب Sfv(opt):',
      imbalancePercent: 'نسبة الخلل الميكانيكي FV-imb%:',
      actualVsOptCurve: 'مقارنة المنحنى الحالي بالمنحنى المثالي',
      flightTimeS: 'زمن الطيران (ث)',
      trial: 'المحاولة',
      addTrial: 'إضافة محاولة',
      removeTrial: 'حذف',
      compute: 'احسب ملف القوة والسرعة',
      invalidTitle: 'ملف غير صالح',
      reasonTooFew: 'محتاج محاولتين صالحتين على الأقل.',
      reasonNoVariation: 'كل المحاولات بنفس السرعة، مفيش خط نقدر نرسمه.',
      reasonSlope: 'الميل موجب أو صفر (القوة مش بتقل مع زيادة السرعة). راجع الأوزان وأزمنة الطيران.',
      reasonR2: 'R² أقل من 0.9، النقاط مش على خط واحد. أعد المحاولات.',
      reasonMissing: 'ناقص وزن اللاعب أو مسافة الدفع hPO.',
      rawPoints: 'النقاط الخام',
      load: 'الحمل',
      height: 'الارتفاع',
      force: 'القوة',
      velocity: 'السرعة',
      bandWell: 'متوازن (90–110%)',
      bandModForce: 'عجز قوة متوسط (60–90%)',
      bandModVel: 'عجز سرعة متوسط (110–140%)',
      bandLargeForce: 'عجز قوة كبير (أقل من 60%)',
      bandLargeVel: 'عجز سرعة كبير (أكثر من 140%)',
      prescForce: 'أولوية لتمارين القوة القصوى (أحمال ثقيلة، سرعة بطيئة).',
      prescVel: 'أولوية للقفز الباليستي بأحمال خفيفة أو بمساعدة.',
      prescBalanced: 'حافظ على تدريب متوازن على كامل المنحنى.',
      optimalCurve: 'المنحنى الأمثل (نفس Pmax)',
      actualCurve: 'منحنى اللاعب',
      tabFvp: 'ملف القوة والسرعة',
      tabFt: 'منحنى القوة والزمن',
      ftTitle: 'تحليل منحنى القوة والزمن (CMJ)',
      ftSubtitle: 'الصق قيم القوة الرأسية (نيوتن) من منصة القوة. أول ثانية لازم تكون وقوف ثابت.',
      ftSampling: 'معدل العينات (Hz)',
      ftPaste: 'قيم القوة مفصولة بفواصل أو مسافات أو أسطر',
      ftLoadFile: 'تحميل ملف CSV / TXT',
      ftAnalyze: 'حلّل',
      ftMethod: 'بداية الحركة = أول قيمة أقل من وزن الجسم − 5×SD لفترة الوقوف. الإقلاع = القوة أقل من 20 نيوتن. السرعة بتكامل (F − BW)/m.',
      ftErrTooShort: 'البيانات أقصر من 1.2 ثانية عند معدل العينات ده.',
      ftErrQuiet: 'مفيش فترة وقوف ثابت في أول ثانية.',
      ftErrOnset: 'مقدرناش نحدد بداية الحركة.',
      ftErrTakeoff: 'مقدرناش نحدد لحظة الإقلاع (القوة مانزلتش تحت 20 نيوتن).',
      ftErrVelocity: 'سرعة الإقلاع طلعت سالبة؛ راجع البيانات.',
      ftJumpHeight: 'ارتفاع القفزة (دفع-زخم)',
      ftTakeoffVel: 'سرعة الإقلاع',
      ftTimeToTakeoff: 'زمن حتى الإقلاع',
      ftRsiMod: 'RSImod',
      ftPeakForce: 'ذروة القوة',
      ftMeanPropForce: 'متوسط قوة الدفع',
      ftPeakPower: 'ذروة القدرة',
      ftImpulse: 'الدفع الصافي',
      ftBodyWeight: 'وزن الجسم (من الوقوف)',
      ftPropDuration: 'مدة مرحلة الدفع',
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
    },
    common: {
      save: 'Save',
      saving: 'Saving...',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      filter: 'Filter',
      male: 'Male',
      female: 'Female',
      actions: 'Actions',
      error: 'An error occurred',
      success: 'Operation completed successfully',
      confirm: 'Confirm',
      confirmDelete: 'Are you sure you want to delete this record?',
      noData: 'No records found',
      status: 'Status',
      notes: 'Notes',
      close: 'Close',
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
      squatTrochanterM: 'Trochanter height in 90° squat (m)',
      squatTrochanterHelp: 'Leg length = greater trochanter to toes, feet extended. hPO = leg length − height of the same point in a 90° squat.',
      hpoLabel: 'Push-off distance hPO',
      hpoEstimatedBadge: 'estimated hPO',
      assignedCoach: 'Assigned Coach',
      saveAthlete: 'Save Athlete',
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
      weight: 'Weight:',
      height: 'Height:',
      age: 'Age:',
      years: 'yrs',
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
      massKg: 'Mass:',
      statureCm: 'Height:',
      legLengthM: 'Leg Length:',
      reachCm: 'Standing Reach:',
      cmjWithArms: 'CMJ (with Arms)',
      cmjNoArms: 'CMJ (No Arms)',
      squatJump: 'Squat Jump (SJ Static)',
      armGain: 'Arm Swing Gain',
      peakApproach: 'Peak Approach',
      peakRsi: 'Peak RSI Score',
      fvpStatus: 'F-V Profile Status',
      readinessBaseline: 'Baseline (previous 14 days)',
      readinessNotEnough: 'Not enough data: needs at least 3 CMJ tests in the 14 days before the latest test',
      cnsReadiness: 'CNS Readiness Score',
      contactTime: 'Contact Time (GCT)',
      flightTime: 'Flight Duration',
      optimalReadiness: 'Optimal Readiness ⚡',
      moderateFatigue: 'Moderate Fatigue ⚠️',
      highFatigue: 'High CNS Fatigue 🔴',
      forceDeficit: 'High Force Deficit',
      velocityDeficit: 'High Velocity Deficit',
      balancedProfile: 'Well-Balanced Profile',
      progressionTab: 'Progression 📈',
      elasticityTab: 'Elasticity vs Strength ⚡',
      strengthTab: 'Strength 1RM Records 🏋️',
      jumpHeightTrend: 'Jump Height Progression Trend (cm)',
      eurTitle: 'Eccentric Utilization Ratio (EUR)',
      eurFormula: 'EUR = CMJ (no arms) ÷ Squat Jump (SJ)',
      eurRatio: 'EUR Ratio',
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
      flightTimeCol: 'Flight Time (FT)',
      jumpHeightCol: 'Jump Height (cm)',
      rsiScoreCol: 'RSI Score',
      deleteRecordConfirm: 'Are you sure you want to permanently delete this test record?',
      editRecordTitle: 'Edit Test Record & Telemetry',
      editTestTypeLabel: 'Test / Jump Type',
      editDateLabel: 'Test Date',
      editJumpHeightLabel: 'Jump Height (cm)',
      editFlightTimeLabel: 'Flight Time (seconds)',
      editRsiScoreLabel: 'RSI Index Score',
      editContactTimeLabel: 'Ground Contact Time (ms / s)',
      editBoxHeightLabel: 'Drop Box Height (cm)',
      editTakeoffVelocityLabel: 'Takeoff Velocity (m/s)',
      editPeakPowerLabel: 'Peak Power (Watts)',
      editCleanWeightLabel: 'Lifted Weight (kg)',
      editRepsCountLabel: 'Reps Count',
      editWeekNumberLabel: 'Training Week Number',
      subfilterAll: 'All Vertical Jumps',
      subfilterCmjArms: 'CMJ (with arms)',
      subfilterCmjNoArms: 'CMJ (no arms)',
      subfilterSquatJump: 'Squat Jump (SJ)',
      subfilterApproach: 'Approach Jump',
      printReportTitle: 'Athlete PDF Export Configuration',
      includeStrengthOption: 'Include Maximum Strength (1RM) table in report',
      generatePdf: 'Download PDF Report 📄',
    },
    jumpConsole: {
      title: 'Vertical Jump Video Telemetry',
      subtitle: 'High-frame-rate video analysis with automated takeoff and landing phase recognition',
      selectVideo: 'Choose Video File',
      openCamera: 'Live Camera Capture',
      peakPower: 'Peak Mechanical Power',
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
      contactTimeInput: 'Ground Contact Time (GCT, ms):',
      rsiDirectInput: 'Direct RSI Score:',
      rsiModeToggle: 'RSI Calculation Mode:',
      rsiModeDirect: 'Direct Manual RSI ✍️',
      rsiModeAutoHeight: 'Auto (Height / GCT)',
      rsiModeAutoFlight: 'Auto (Flight / GCT)',
      boxHeightInput: 'Drop Box Height (cm):',
      strengthLiftLabel: 'Strength Exercise:',
      weightLiftedInput: 'Weight Lifted (kg):',
      weekNumberLabel: 'Training Week Block:',
      repsCountLabel: 'Completed Repetitions:',
      notesLabel: 'Coach Notes:',
      saveMeasurement: 'Save Measurement to Dossier 💾',
      recentLoggedTitle: 'Recent Logged Records',
    },
    rsiConsole: {
      title: 'Reactive Strength Index (RSI) Analyzer',
      subtitle: 'Evaluate Stretch-Shortening Cycle (SSC) efficiency and ground contact time dynamics',
      heightGctMethod: 'Jump Height (m) ÷ Contact Time (s) [Standard]',
      flightGctMethod: 'Flight Time (s) ÷ Contact Time (s)',
      contactTime: 'Ground Contact Time (GCT):',
      flightTime: 'Flight Duration (s):',
      jumpHeight: 'Resulting Jump Height:',
      rsiScore: 'Final RSI Index Score:',
      saveRsiTest: 'Save RSI Record to Dossier 💾',
    },
    fvpConsole: {
      title: 'Force-Velocity Profiling (F-V Curve)',
      subtitle: 'Precise Samozino method evaluation to pinpoint mechanical deficits and prescribe training',
      methodDesc: 'Input 4 loaded squat jump trials to calculate theoretical maximum force and optimal velocity',
      bodyMass: 'Athlete Body Mass (kg):',
      loadTrial: 'Loaded Trial',
      jumpHeightCm: 'Jump Height (cm)',
      f0Force: 'Theoretical Max Force F₀:',
      v0Velocity: 'Theoretical Max Velocity V₀:',
      pmaxPower: 'Max Mechanical Power Pmax:',
      sfvSlope: 'Actual F-V Slope Sfv:',
      sfvOptSlope: 'Optimal Required Slope Sfv(opt):',
      imbalancePercent: 'Mechanical Imbalance FV-imb%:',
      actualVsOptCurve: 'Current vs Optimal Slope Comparison',
      flightTimeS: 'Flight time (s)',
      trial: 'Trial',
      addTrial: 'Add trial',
      removeTrial: 'Remove',
      compute: 'Compute F-V profile',
      invalidTitle: 'Invalid profile',
      reasonTooFew: 'At least two valid trials are needed.',
      reasonNoVariation: 'All trials have the same velocity; no line can be fitted.',
      reasonSlope: 'Slope is zero or positive (force does not drop as velocity rises). Check the loads and flight times.',
      reasonR2: 'R² is below 0.9; the points are not on a line. Repeat the trials.',
      reasonMissing: 'Missing body mass or push-off distance (hPO).',
      rawPoints: 'Raw points',
      load: 'Load',
      height: 'Height',
      force: 'Force',
      velocity: 'Velocity',
      bandWell: 'Well balanced (90–110%)',
      bandModForce: 'Moderate force deficit (60–90%)',
      bandModVel: 'Moderate velocity deficit (110–140%)',
      bandLargeForce: 'Large force deficit (< 60%)',
      bandLargeVel: 'Large velocity deficit (> 140%)',
      prescForce: 'Prioritise maximal strength work (heavy loads, slow velocity).',
      prescVel: 'Prioritise ballistic jumps with light or assisted loads.',
      prescBalanced: 'Keep training across the whole force-velocity spectrum.',
      optimalCurve: 'Optimal profile (same Pmax)',
      actualCurve: 'Athlete profile',
      tabFvp: 'F-V profile',
      tabFt: 'Force-time',
      ftTitle: 'Force-time analysis (CMJ)',
      ftSubtitle: 'Paste vertical force samples (N) from a force plate. The first second must be quiet standing.',
      ftSampling: 'Sampling rate (Hz)',
      ftPaste: 'Force values separated by commas, spaces or new lines',
      ftLoadFile: 'Load CSV / TXT file',
      ftAnalyze: 'Analyse',
      ftMethod: 'Onset = first sample below BW − 5×SD of quiet standing. Take-off = force below 20 N. Velocity by integrating (F − BW)/m.',
      ftErrTooShort: 'Signal is shorter than 1.2 s at this sampling rate.',
      ftErrQuiet: 'No quiet-standing phase in the first second.',
      ftErrOnset: 'Movement onset could not be detected.',
      ftErrTakeoff: 'Take-off not found (force never drops below 20 N).',
      ftErrVelocity: 'Take-off velocity is not positive; check the data.',
      ftJumpHeight: 'Jump height (impulse-momentum)',
      ftTakeoffVel: 'Take-off velocity',
      ftTimeToTakeoff: 'Time to take-off',
      ftRsiMod: 'RSImod',
      ftPeakForce: 'Peak force',
      ftMeanPropForce: 'Mean propulsive force',
      ftPeakPower: 'Peak power',
      ftImpulse: 'Net impulse',
      ftBodyWeight: 'Body weight (quiet standing)',
      ftPropDuration: 'Propulsive duration',
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
      dateCol: 'Date',
      emptyTitle: 'No Records Logged Yet',
      emptyDesc: 'Perform jump tests or log manual measurements to establish team rankings.',
      podiumGold: 'Gold Medal 🥇',
      podiumSilver: 'Silver Medal 🥈',
      podiumBronze: 'Bronze Medal 🥉',
    },
  },
};
