// Interface text for homework pages (the homework itself is in English).
import { getIntlLocale } from "@/utils/locale";

const COPY = {
  en: {
    homework: "Homework",
    myHomework: "My homework",
    assigned: "Homework you assigned",
    toDo: "To do",
    submitted: "Submitted",
    reviewed: "Reviewed",
    status: { ASSIGNED: "Not started", IN_PROGRESS: "In progress", SUBMITTED: "Submitted", REVIEWED: "Reviewed" },
    due: "Due",
    overdue: "Overdue",
    noDue: "No due date",
    tasksDone: (done, total) => `${done} of ${total} tasks`,
    taskCount: (n) => `${n} tasks`,
    lastActive: "Last active",
    never: "Not opened yet",
    open: "Open",
    review: "Review",
    emptyLearner: "No homework yet. After a session, your teacher's homework will appear here.",
    emptyTeacher: "You haven't assigned any homework yet. Open a past session to assign some.",
    emptySection: "Nothing here.",
    loading: "Loading homework…",
    loadError: "We couldn't load this homework. Refresh the page to try again.",
    back: "All homework",
    // player
    from: (name) => `From ${name}`,
    teacherNote: "Note from your teacher",
    noteToLearner: "Your note to the learner",
    expressions: "Your expressions from the lesson",
    task: (n, total) => `Task ${n} of ${total}`,
    minutes: (n) => `${n} min`,
    prev: "Previous",
    next: "Next task",
    reviewSubmit: "Review and submit",
    saving: "Saving…",
    saved: "Saved",
    savedLocal: "Saved on this device. We'll sync when you're back online.",
    saveError: "Couldn't save. We'll keep trying.",
    conflict: "This homework was updated on another device. We loaded the latest version.",
    check: "Check my answers",
    checking: "Checking…",
    checkResult: (c, t) => `${c} of ${t} correct`,
    checkAllRight: "All correct. Well done!",
    checkHint: "Fix the ones marked in red, then check again.",
    chooseAnswer: "Choose…",
    words: (n) => `${n} words`,
    wordTarget: (min, max) => (min && max ? `Aim for ${min}–${max} words` : min ? `At least ${min} words` : `Up to ${max} words`),
    selfCheck: "Check your work",
    reflection: "Your notes",
    wordBankHint: "Tap a word to put it in the next empty gap.",
    summaryTitle: "Ready to hand it in?",
    summaryBody: "Check that every task is done. After you submit, your teacher can review it and you can't change your answers.",
    notDone: "Not finished",
    done: "Done",
    submit: "Submit homework",
    submitting: "Submitting…",
    submitAnyway: "Some tasks aren't finished. Submit anyway?",
    confirmSubmit: "Yes, submit",
    cancel: "Cancel",
    submittedBanner: "Submitted. Your teacher will review it soon.",
    reviewedBanner: "Your teacher reviewed this homework.",
    teacherComment: "Teacher's comment",
    overallComment: "Overall comment",
    yourAnswer: "Your answer",
    noAnswer: "No answer",
    // teacher
    learner: "Learner",
    score: "Auto-marked",
    correctAnswer: "Correct answer",
    modelAnswers: "Model answers",
    commentPlaceholder: "Comment on this task (the learner sees it after you mark it reviewed)",
    overallPlaceholder: "Overall feedback for the learner",
    saveComments: "Save comments",
    savingComments: "Saving…",
    commentsSaved: "Comments saved",
    markReviewed: "Mark as reviewed and notify learner",
    markReviewedWait: "You can mark it as reviewed once the learner submits it.",
    remove: "Remove homework",
    removeConfirm: "Remove this homework? The learner's answers will be deleted.",
    removed: "Homework removed",
    readOnlyView: "You're viewing as another user. Homework is read-only.",
    // assign panel
    assignTitle: "Homework",
    assignHint: "Assign interactive homework. The learner does it on the platform and you can follow their progress.",
    learnerPanelHint: "Homework from this session",
    pick: "Homework",
    suggested: "matches this lesson",
    learners: "Send to",
    dueDate: "Due date",
    nextSessionHint: (when) => `Next session: ${when}`,
    note: "Note for the learner (optional)",
    notePlaceholder: "e.g. Focus on task 4, and record yourself twice.",
    assign: "Assign homework",
    assigning: "Assigning…",
    assignedToast: (n) => (n === 1 ? "Homework assigned. The learner has been notified." : `Homework assigned to ${n} learners.`),
    alreadyAssigned: "This homework was already assigned to these learners.",
    cantAssignYet: "You can assign homework once the session has started.",
    sessionHomework: "Assigned for this session",
  },
  ar: {
    homework: "الواجبات",
    myHomework: "واجباتي",
    assigned: "الواجبات التي أرسلتها",
    toDo: "مطلوب",
    submitted: "تم التسليم",
    reviewed: "تمت المراجعة",
    status: { ASSIGNED: "لم يبدأ", IN_PROGRESS: "قيد الحل", SUBMITTED: "تم التسليم", REVIEWED: "تمت المراجعة" },
    due: "آخر موعد",
    overdue: "متأخر",
    noDue: "بدون موعد نهائي",
    tasksDone: (done, total) => `${done} من ${total} مهام`,
    taskCount: (n) => `${n} مهام`,
    lastActive: "آخر نشاط",
    never: "لم يُفتح بعد",
    open: "افتح",
    review: "راجع",
    emptyLearner: "لا توجد واجبات بعد. بعد كل حصة، سيظهر هنا الواجب الذي يرسله معلمك.",
    emptyTeacher: "لم ترسل أي واجبات بعد. افتح حصة سابقة لإرسال واجب.",
    emptySection: "لا يوجد شيء هنا.",
    loading: "جارٍ تحميل الواجب…",
    loadError: "تعذّر تحميل الواجب. حدّث الصفحة وحاول مرة أخرى.",
    back: "كل الواجبات",
    from: (name) => `من ${name}`,
    teacherNote: "ملاحظة من معلمك",
    noteToLearner: "ملاحظتك للمتعلم",
    expressions: "تعبيرات الدرس",
    task: (n, total) => `المهمة ${n} من ${total}`,
    minutes: (n) => `${n} دقيقة`,
    prev: "السابق",
    next: "المهمة التالية",
    reviewSubmit: "راجع وسلّم",
    saving: "جارٍ الحفظ…",
    saved: "تم الحفظ",
    savedLocal: "تم الحفظ على هذا الجهاز، وسنرفعه عند عودة الاتصال.",
    saveError: "تعذّر الحفظ. سنحاول مرة أخرى.",
    conflict: "تم تحديث هذا الواجب من جهاز آخر، فحمّلنا أحدث نسخة.",
    check: "تحقّق من إجاباتي",
    checking: "جارٍ التحقق…",
    checkResult: (c, t) => `${c} من ${t} صحيحة`,
    checkAllRight: "كل الإجابات صحيحة. أحسنت!",
    checkHint: "صحّح الإجابات المظللة بالأحمر ثم تحقّق مرة أخرى.",
    chooseAnswer: "اختر…",
    words: (n) => `${n} كلمة`,
    wordTarget: (min, max) => (min && max ? `المطلوب ${min}–${max} كلمة` : min ? `${min} كلمة على الأقل` : `حتى ${max} كلمة`),
    selfCheck: "راجع عملك",
    reflection: "ملاحظاتك",
    wordBankHint: "اضغط على كلمة لتضعها في أول فراغ فارغ.",
    summaryTitle: "جاهز للتسليم؟",
    summaryBody: "تأكد من إنهاء كل المهام. بعد التسليم سيراجعه معلمك، ولن تتمكن من تعديل إجاباتك.",
    notDone: "لم تكتمل",
    done: "مكتملة",
    submit: "سلّم الواجب",
    submitting: "جارٍ التسليم…",
    submitAnyway: "بعض المهام لم تكتمل. هل تريد التسليم على أي حال؟",
    confirmSubmit: "نعم، سلّم",
    cancel: "إلغاء",
    submittedBanner: "تم التسليم. سيراجعه معلمك قريبًا.",
    reviewedBanner: "راجع معلمك هذا الواجب.",
    teacherComment: "تعليق المعلم",
    overallComment: "التعليق العام",
    yourAnswer: "إجابتك",
    noAnswer: "لا توجد إجابة",
    learner: "المتعلم",
    score: "التصحيح التلقائي",
    correctAnswer: "الإجابة الصحيحة",
    modelAnswers: "إجابات نموذجية",
    commentPlaceholder: "تعليق على هذه المهمة (يراه المتعلم بعد إنهاء المراجعة)",
    overallPlaceholder: "ملاحظات عامة للمتعلم",
    saveComments: "احفظ التعليقات",
    savingComments: "جارٍ الحفظ…",
    commentsSaved: "تم حفظ التعليقات",
    markReviewed: "أنهِ المراجعة وأبلغ المتعلم",
    markReviewedWait: "يمكنك إنهاء المراجعة بعد أن يسلّم المتعلم الواجب.",
    remove: "احذف الواجب",
    removeConfirm: "هل تريد حذف هذا الواجب؟ ستُحذف إجابات المتعلم.",
    removed: "تم حذف الواجب",
    readOnlyView: "أنت تتصفح بحساب مستخدم آخر، لذا الواجب للقراءة فقط.",
    assignTitle: "الواجب",
    assignHint: "أرسل واجبًا تفاعليًا يحله المتعلم على المنصة، وتابع تقدمه.",
    learnerPanelHint: "واجبات هذه الحصة",
    pick: "الواجب",
    suggested: "مناسب لهذا الدرس",
    learners: "أرسله إلى",
    dueDate: "آخر موعد للتسليم",
    nextSessionHint: (when) => `الحصة القادمة: ${when}`,
    note: "ملاحظة للمتعلم (اختياري)",
    notePlaceholder: "مثال: ركّز على المهمة 4، وسجّل نفسك مرتين.",
    assign: "أرسل الواجب",
    assigning: "جارٍ الإرسال…",
    assignedToast: (n) => (n === 1 ? "تم إرسال الواجب وإبلاغ المتعلم." : `تم إرسال الواجب إلى ${n} متعلمين.`),
    alreadyAssigned: "هذا الواجب أُرسل بالفعل لهؤلاء المتعلمين.",
    cantAssignYet: "يمكنك إرسال الواجب بعد بدء الحصة.",
    sessionHomework: "الواجبات المرسلة لهذه الحصة",
  },
};

export function homeworkCopy(locale) {
  return COPY[locale === "ar" ? "ar" : "en"];
}

export function localeFromPath(pathname) {
  return pathname?.startsWith("/ar") ? "ar" : "en";
}

export function formatDue(value, locale, withTime = true) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(date);
}

export function isOverdue(item) {
  return (
    item?.dueAt &&
    (item.status === "ASSIGNED" || item.status === "IN_PROGRESS") &&
    new Date(item.dueAt).getTime() < Date.now()
  );
}

export function relativeTime(value, locale) {
  if (!value) return "";
  const diff = (new Date(value).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(getIntlLocale(locale), { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  return rtf.format(Math.round(diff / 86400), "day");
}

export function wordCount(text) {
  return String(text || "").trim().split(/\s+/).filter(Boolean).length;
}

/** "Choose…" style datetime-local value in the viewer's own time zone. */
export function toLocalInputValue(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
