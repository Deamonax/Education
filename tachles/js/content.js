/* Tachles: content bank. Plain script, exposes window.TC.
   Drill item: {id, cat, he?, wrong, right[], need, trap, en, hx?}
   - he: Hebrew prompt (translate drills). Absent = fix-the-sentence item.
   - need: regex the answer must match (the key chunk).
   - trap: regex of the typical Hebrew-English mistake.
   - en: one-line English note. hx: optional item-specific Hebrew note (else category Hebrew). */
(function () {
  var CATS = {
    article: { label: "Articles (a / an / the)",
      en: "English needs a or an before a singular countable noun: a product manager, an email. Hebrew has no word for 'a', so it tends to disappear.",
      he: "באנגלית חייבים a או an לפני שם עצם ביחיד שאפשר לספור: a product manager, an email. בעברית אין מילה כזאת, ולכן היא נשמטת." },
    perfect: { label: "Present perfect",
      en: "For something that started in the past and is still true, English uses the present perfect: I have worked here for five years. For a finished moment in the past, use the simple past: I sent it yesterday.",
      he: "כשמשהו התחיל בעבר ועדיין נמשך, באנגלית משתמשים ב-present perfect: I have worked here for five years. בעברית אומרים 'אני עובדת כאן חמש שנים', ולכן קל לטעות." },
    copula: { label: "Missing is / are",
      en: "English always needs a verb: The report is ready. In the Hebrew present tense the verb 'to be' disappears.",
      he: "באנגלית חייבים is או are: The report is ready. בעברית בהווה אין פועל 'להיות', ולכן הוא נשמט." },
    question: { label: "Question form",
      en: "Questions need do / does / did, or a flipped verb: Why did the client cancel? When are you releasing it? In Hebrew a question is just intonation.",
      he: "בשאלה באנגלית צריך do / does / did או היפוך של סדר המילים: Why did the client cancel? בעברית שאלה היא רק אינטונציה." },
    it: { label: "It, not he / she",
      en: "Things are always 'it' in English, never he or she.",
      he: "באנגלית חפצים ודברים הם תמיד it, אף פעם לא he או she, גם כשבעברית המילה בזכר או בנקבה." },
    countable: { label: "Uncountable nouns",
      en: "Some nouns are uncountable in English: information, advice, feedback, research, work. No 'a' and no -s.",
      he: "יש מילים שבאנגלית לא סופרים: information, advice, feedback, research, work. בלי a ובלי s בסוף." },
    comparative: { label: "Comparatives",
      en: "Short adjectives take -er: better, cheaper, easier. Never 'more better'.",
      he: "תארים קצרים מקבלים er: better, cheaper, easier. לא אומרים more better, גם אם בעברית אומרים 'יותר טוב'." },
    there: { label: "There is / have",
      en: "To say something exists, use there is / there are. Use 'have' for owning.",
      he: "המילה 'יש' מתורגמת לפעמים ל-there is / there are (משהו קיים) ולפעמים ל-have (למישהו יש). זה לא אותו דבר." },
    order: { label: "Word order",
      en: "English word order is strict: subject, verb, object, then the rest. Always and also go before the main verb. In 'I don't know where it is', the verb goes last.",
      he: "סדר המילים באנגלית קבוע: נושא, פועל, מושא. מילים כמו always ו-also באות לפני הפועל. בשאלה עקיפה הפועל בסוף: I don't know where the file is." },
    ifwhen: { label: "Tense after if / when",
      en: "After if, when and as soon as, use the present tense for the future: When I arrive, I'll call you.",
      he: "אחרי if, when, as soon as משתמשים בהווה גם כשמדברים על העתיד: When I arrive, I'll call you. בעברית אומרים 'כשאגיע', ולכן נוטים להוסיף will." },
    prep: { label: "Prepositions",
      en: "Prepositions don't translate one to one. Learn the word and its preposition as one chunk: responsible for, depend on, wait for.",
      he: "מילות יחס לא מתורגמות מילה במילה. לומדים את הצירוף כולו: responsible for, depends on, wait for." },
    calque: { label: "Literal translations",
      en: "Hebrew expressions translated word for word sound strange in English. Learn the English expression as a whole.",
      he: "ביטוי עברי שמתורגם מילה במילה נשמע מוזר באנגלית. לומדים את הביטוי האנגלי כיחידה אחת." },
    tone: { label: "Tone (direct vs. polite)",
      en: "American work English softens requests and criticism: could you, I'd like, I think there might be. Hebrew directness can sound rude in English even when it isn't meant that way.",
      he: "באנגלית אמריקאית בעבודה מרככים בקשות וביקורת: could you, I'd like, I think there might be. ישירות עברית יכולה להישמע גסה באנגלית, גם כשזו לא הכוונה." },
    runon: { label: "Run-on sentences",
      en: "Two complete sentences can't be joined with only a comma. Use a period, a semicolon, or a linking word like so, but or and.",
      he: "אי אפשר לחבר שני משפטים שלמים רק עם פסיק. שמים נקודה, נקודה-פסיק, או מילת קישור כמו so, but או and." },
    caps: { label: "Capital letters",
      en: "Capitals for I, days, months, languages, countries, quarters (Q3) and the start of a sentence.",
      he: "באנגלית כותבים באות גדולה את I, ימים, חודשים, שפות, מדינות, Q3 ותחילת משפט. בעברית אין אותיות גדולות, ולכן קל לשכוח." },
    homophone: { label: "Sound-alike words",
      en: "Words that sound the same are spelled differently: its / it's, then / than, affect / effect, lose / loose, there / their / they're, your / you're.",
      he: "מילים שנשמעות אותו דבר נכתבות אחרת: its / it's, then / than, affect / effect. כותבים לפי המשמעות, לא לפי הצליל." },
    spelling: { label: "American spelling",
      en: "American spelling: -ize, -yze, -or, -ter (prioritize, analyze, color, behavior, center).",
      he: "איות אמריקאי: ize, yze, or (prioritize, analyze, color, behavior). לא לערבב עם איות בריטי." },
    agreement: { label: "Subject-verb agreement",
      en: "Singular subject, singular verb: the team is, each of the teams has, he doesn't. In American English a team or company is singular.",
      he: "נושא ביחיד, פועל ביחיד: the team is, he doesn't. באנגלית אמריקאית צוות או חברה הם ביחיד." },
    colloc: { label: "Fintech and product phrases",
      en: "Fintech and product English use fixed verb + noun pairs: process a payment, charge a fee, hit a target, align on, roll out.",
      he: "באנגלית של פינטק ומוצר יש צירופים קבועים של פועל ושם עצם: process a payment, charge a fee, hit a target. לומדים אותם כיחידה." },
    pron: { label: "Pronunciation",
      en: "Sounds and stress that change meaning or make you harder to follow.",
      he: "צלילים והטעמות שמשנים משמעות או מקשים על ההבנה." },
    other: { label: "Other",
      en: "Other grammar or word choice.",
      he: "דקדוק או בחירת מילים אחרים." }
  };

  // Shorthand builder: d(id, cat, he, wrong, right[], need, trap, en, hx)
  function d(id, cat, he, wrong, right, need, trap, en, hx) {
    var o = { id: id, cat: cat, wrong: wrong, right: right, need: need, trap: trap, en: en };
    if (he) o.he = he;
    if (hx) o.hx = hx;
    return o;
  }

  var DRILLS = [
    // ---------- prepositions and literal translations at work ----------
    d("p01", "prep", "אני אחראית על הפרויקט הזה.", "I'm responsible on this project.", ["I'm responsible for this project.", "I am responsible for this project."], /responsible for/i, /responsible (on|about)/i, "Responsible takes 'for'.", "אחראית על = responsible for, לא on."),
    d("p02", "prep", "תשלח לי את זה עד יום שישי.", "Send it to me until Friday.", ["Please send it to me by Friday.", "Send it to me by Friday.", "Can you send it to me by Friday?"], /by friday/i, /until friday/i, "A deadline is 'by'. 'Until' means the whole time up to that moment.", "עד (דדליין) = by. המילה until פירושה 'כל הזמן עד', למשל I'm here until 5."),
    d("p03", "calque", "אני אבדוק ואחזור אלייך.", "I will check and return to you.", ["I'll check and get back to you.", "I will check and get back to you.", "Let me check and get back to you."], /get back to you/i, /(return|come back) to you/i, "In English you 'get back to' someone.", "לחזור אל מישהו (עם תשובה) = get back to someone."),
    d("p04", "prep", "בואו נדון בתקציב בפגישה.", "Let's discuss about the budget in the meeting.", ["Let's discuss the budget in the meeting.", "Let's discuss the budget at the meeting."], /discuss the budget/i, /discuss about/i, "Discuss takes no preposition. Talk about, but discuss the budget.", "discuss בלי about. אפשר talk about או discuss the budget."),
    d("p05", "prep", "ההכנסות עלו ב-2 אחוז ברבעון הזה.", "Revenue rose in 2 percent this quarter.", ["Revenue rose by 2 percent this quarter.", "Revenue rose by 2% this quarter.", "Revenue increased by 2% this quarter."], /(rose|increased|grew|went up) by (2|two) ?(%|percent)/i, /(rose|increased|grew|went up) in (2|two)/i, "A change in numbers is 'by': rose by 2%.", "עלה ב- (שינוי במספר) = rose by."),
    d("p06", "prep", "זה תלוי ברגולטור.", "It depends in the regulator.", ["It depends on the regulator.", "That depends on the regulator."], /depends on/i, /depends (in|of|from|at)/i, "Depend takes 'on'.", "תלוי ב- = depends on."),
    d("p07", "prep", "אנחנו מחכים לאישור מהבנק.", "We are waiting to the approval from the bank.", ["We're waiting for approval from the bank.", "We are waiting for approval from the bank.", "We're waiting for the bank's approval."], /waiting for/i, /waiting to (the )?(approval|bank)/i, "Wait takes 'for'.", "מחכים ל- = waiting for."),
    d("p08", "prep", "הם מפחדים משינויים.", "They are afraid from changes.", ["They're afraid of change.", "They are afraid of change.", "They're afraid of changes."], /afraid of/i, /afraid from/i, "Afraid takes 'of'.", "מפחד מ- = afraid of."),
    d("p09", "prep", "הלקוח כועס עלינו.", "The client is angry on us.", ["The client is upset with us.", "The client is angry with us.", "The client is mad at us."], /(angry|upset|mad|frustrated) (with|at) us/i, /(angry|upset|mad) on us/i, "Angry with someone, mad at someone. At work, 'upset with us' sounds most natural.", "כועס על = angry with / mad at."),
    d("p10", "calque", "תוכל להסביר לי את הנתונים?", "Can you explain me the data?", ["Can you explain the data to me?", "Could you explain the data to me?", "Can you walk me through the data?"], /explain (the data|it|this) to me|walk me through/i, /explain me/i, "Explain something TO someone. Never 'explain me'.", "להסביר לי = explain to me. לא explain me."),
    d("p11", "calque", "ממתי זה ככה?", "From when is it like this?", ["Since when has it been like this?", "How long has it been like this?"], /since when|how long has/i, /from when/i, "'Since when' or 'how long has it been'.", "ממתי = since when, לא from when."),
    d("p12", "calque", "בזמן האחרון יש יותר ניסיונות הונאה.", "In the last time there are more fraud attempts.", ["Lately there have been more fraud attempts.", "Recently there have been more fraud attempts.", "There have been more fraud attempts lately."], /lately|recently/i, /in the last time/i, "'In the last time' is Hebrew. Say lately or recently.", "בזמן האחרון = lately / recently."),
    d("p13", "calque", "אנחנו צריכים לקבל החלטה היום.", "We need to take a decision today.", ["We need to make a decision today.", "We need to decide today."], /make a decision|decide today/i, /(take|receive|get) a decision/i, "In American English you make a decision.", "לקבל החלטה = make a decision (באמריקאית)."),
    d("p14", "calque", "בוא נקבע פגישה עם הצוות.", "Let's make a meeting with the team.", ["Let's set up a meeting with the team.", "Let's schedule a meeting with the team."], /(set up|schedule|book) a meeting/i, /(make|fix|determine) a meeting/i, "Set up or schedule a meeting.", "לקבוע פגישה = set up / schedule a meeting."),
    d("p15", "calque", "לא הצלחתי לסיים את המצגת.", "I didn't succeed to finish the presentation.", ["I didn't manage to finish the presentation.", "I wasn't able to finish the presentation.", "I couldn't finish the presentation."], /(manage to|able to|couldn't|could not) finish/i, /succeed(ed)? to/i, "'Succeed to' is not English. Use manage to, be able to, or couldn't.", "לא הצלחתי ל- = I didn't manage to / I wasn't able to."),
    d("p16", "calque", "לדעתי, כדאי לחכות.", "According to me, it's worth to wait.", ["In my view, we should wait.", "I think we should wait.", "In my opinion, it's worth waiting."], /in my (view|opinion)|i think/i, /according to me|worth to/i, "'According to me' sounds odd. Say I think or in my view. Also: worth waiting, not worth to wait.", "לדעתי = I think / in my view."),
    d("p17", "calque", "הלקוח עוד לא חזר אליי.", "The client didn't return to me yet.", ["The client hasn't gotten back to me yet.", "The client hasn't gotten back to me."], /(hasn't|has not) (gotten|got) back to me/i, /(return(ed)?|came back) to me/i, "Get back to someone, and 'yet' needs the present perfect: hasn't gotten back.", "חזר אליי (עם תשובה) = got back to me. עם yet משתמשים ב-hasn't."),
    d("p18", "prep", "אנחנו בהתחלה של הפרויקט.", "We are in the beginning of the project.", ["We're at the beginning of the project.", "We're in the early stages of the project.", "We're at the start of the project."], /at the (beginning|start)|early stages/i, /in the beginning of the project/i, "At the beginning of something.", "בהתחלה של = at the beginning of."),
    d("p19", "calque", "תפתחי את המצלמה בבקשה.", "Please open the camera.", ["Please turn on your camera.", "Can you turn your camera on?"], /turn on (your|the) camera|turn (your|the) camera on/i, /open (your|the) camera/i, "Cameras and lights are turned on and off, not opened and closed.", "לפתוח מצלמה = turn on your camera."),
    d("p20", "calque", "תסגור את המיקרופון בבקשה.", "Please close the microphone.", ["Please mute your mic.", "Could you mute yourself?", "Please turn off your microphone."], /mute|turn off/i, /close (your|the) (mic|microphone)/i, "You mute a mic.", "לסגור מיקרופון = mute."),
    d("p21", "calque", "תעשה לי טובה ותבדוק את זה.", "Make me a favor and check this.", ["Do me a favor and check this.", "Could you do me a favor and check this?"], /do me a favou?r/i, /make me a favou?r/i, "You DO someone a favor.", "לעשות טובה = do a favor."),
    d("p22", "calque", "המספר הזה לא אומר לי כלום.", "This number doesn't say me anything.", ["This number doesn't mean anything to me.", "This number means nothing to me."], /mean anything to me|means nothing to me/i, /say me/i, "Something means (nothing) to you.", "לא אומר לי כלום = doesn't mean anything to me."),
    d("p23", "prep", "הצוות מורכב משישה מפתחים.", "The team is built from six developers.", ["The team consists of six developers.", "The team is made up of six developers.", "The team has six developers."], /consists of|made up of|has six/i, /consists from|built from|composed from/i, "Consist of, be made up of.", "מורכב מ- = consists of / is made up of."),
    d("p24", "prep", "מי משלם על השירות?", "Who pays on the service?", ["Who pays for the service?"], /pays for/i, /pays on/i, "Pay for something.", "משלם על = pays for."),
    d("p25", "calque", "תקשיב לי רגע.", "Listen me a second.", ["Listen to me for a second.", "Hear me out for a second."], /listen to me|hear me out/i, /listen me/i, "Listen TO someone.", "להקשיב ל- = listen to."),
    d("p26", "prep", "אני אתקשר אליו מחר.", "I will call to him tomorrow.", ["I'll call him tomorrow.", "I will call him tomorrow."], /call him/i, /call to him/i, "Call someone, with no 'to'.", "להתקשר אל = call (בלי to)."),
    d("p27", "calque", "נכנסתי לפגישה מאוחר.", "I entered to the meeting late.", ["I joined the meeting late.", "I joined the call late."], /joined the (meeting|call)/i, /entered (to )?the (meeting|call)/i, "You join a meeting or a call.", "להיכנס לפגישה = join a meeting."),
    d("p28", "prep", "הגעתי למשרד בשמונה.", "I arrived to the office at eight.", ["I got to the office at eight.", "I arrived at the office at eight."], /(arrived at|got to) the office/i, /arrived to/i, "Arrive at a place, or get to a place.", "להגיע ל- = arrive at / get to."),
    d("p29", "calque", "תשימו לב לפרטים.", "Put attention to the details.", ["Pay attention to the details.", "Please pay attention to the details."], /pay attention to/i, /(put|give) attention/i, "You pay attention.", "לשים לב = pay attention."),
    d("p30", "calque", "זה לא משנה.", "It doesn't change.", ["It doesn't matter.", "That doesn't matter."], /doesn't matter|does not matter/i, /doesn't change|does not change/i, "'Lo meshane' means it doesn't matter.", "לא משנה = it doesn't matter."),
    d("p31", "prep", "נשלח את העדכון בסוף השבוע.", "We will send the update in the end of the week.", ["We'll send the update at the end of the week.", "We'll send the update by the end of the week."], /(at|by) the end of the week/i, /in the end of the week/i, "At the end of the week. 'In the end' means finally.", "בסוף השבוע = at the end of the week."),
    d("p32", "prep", "היא מאוד טובה בניתוח נתונים.", "She is very good in data analysis.", ["She's very good at data analysis.", "She is very good at data analysis."], /good at/i, /good in/i, "Good at something.", "טובה ב- = good at."),
    d("p33", "calque", "עשיתי טעות בחישוב.", "I did a mistake in the calculation.", ["I made a mistake in the calculation."], /made a mistake/i, /did a mistake/i, "You make a mistake.", "לעשות טעות = make a mistake."),
    d("p34", "calque", "זה עליי, אני אטפל בזה.", "It's on me, I will treat it.", ["I'll take care of it.", "I'm on it.", "Leave it with me, I'll handle it."], /take care of it|i'?m on it|handle it/i, /treat it|it'?s on me/i, "'It's on me' means I'm paying. Say I'll take care of it or I'm on it.", "'זה עליי' בעבודה = I'll take care of it / I'm on it. המשפט It's on me פירושו 'אני מזמינה'."),

    // ---------- tone ----------
    d("t01", "tone", "תשלח לי את הדוח.", "Send me the report.", ["Could you send me the report when you get a chance?", "Can you send me the report, please?"], /could you|can you|would you|would you mind|please/i, /^send me the report\.?$/i, "Add could you / when you get a chance. A bare command sounds like an order."),
    d("t02", "tone", "(על המספרים של עמית) זה לא נכון.", "This is wrong.", ["I think there might be an issue with these numbers.", "I'm not sure these numbers are right. Can we double-check?"], /i think|might|may|not sure|double.check|seems/i, /^(this|it) is wrong\.?$|^it'?s wrong\.?$/i, "Soften criticism of someone's work: I think there might be an issue."),
    d("t03", "tone", "אני רוצה לדבר על המספרים.", "I want to talk about the numbers.", ["I'd like to go over the numbers.", "Can we go over the numbers?"], /i'?d like|i would like|can we|could we/i, /^i want/i, "'I want' sounds demanding at work. Use I'd like or can we."),
    d("t04", "tone", "(מייל) למה לא ענית לי?", "Why you didn't answer me?", ["Just following up on my last email.", "Just checking in on my previous email."], /following up|follow up|checking in/i, /why (you )?didn'?t you|why you didn'?t/i, "Follow up instead of asking why. It's friendlier and gets the same result."),
    d("t05", "tone", "אנחנו לא יכולים לעשות את זה.", "We can't do it.", ["I'm not sure we can do that by then. What if we split it into two releases?", "That might be hard to fit in. Could we look at the scope together?"], /not sure|might be (hard|difficult|tricky)|what if|could we|let'?s look/i, /^we can'?t do (it|that)\.?$/i, "Push back with an alternative, not a closed door."),
    d("t06", "tone", "תעשה את זה עד מחר.", "Do it until tomorrow.", ["Would you be able to get this done by tomorrow?", "Could you get this done by tomorrow?"], /would you be able|could you|can you/i, /^do (it|this)/i, "Turn the order into a question. And: by tomorrow, not until."),
    d("t07", "tone", "אני לא מסכימה.", "I don't agree.", ["I see it a bit differently.", "I'm not sure I agree. Here's how I see it."], /see it (a bit |slightly )?differently|not sure i agree|another way to look/i, /^i (don'?t agree|disagree)\.?$/i, "Disagree softly, then give your view."),
    d("t08", "tone", "זה לא בעדיפות שלנו עכשיו.", "This is not our priority now.", ["That's not something we can prioritize right now.", "We can't prioritize that this quarter, but let's revisit it."], /(right now|at the moment|this quarter|for now|revisit)/i, /^this is not our priority now\.?$/i, "Say no to the timing, not to the person."),

    // ---------- articles ----------
    d("a01", "article", "אני מנהלת מוצר.", "I am product manager.", ["I'm a product manager.", "I am a product manager."], /\ba (group )?product manager/i, /i'?m (group )?product manager|i am (group )?product manager/i, "A job title needs 'a': I'm a product manager."),
    d("a02", "article", "צריך להתיישר על הרודמפ.", "We need to align on roadmap.", ["We need to align on the roadmap."], /on the roadmap/i, /on roadmap\b/i, "A specific thing both of you know needs 'the'."),
    d("a03", "article", "יש לנו בעיה עם הספק.", "We have problem with the vendor.", ["We have a problem with the vendor.", "There's a problem with the vendor."], /a problem with the/i, /have problem/i, "One problem: a problem."),
    d("a04", "article", "זה רעיון טוב.", "That's good idea.", ["That's a good idea.", "That is a good idea."], /a good idea/i, /(that|it)('s| is) good idea/i, "Adjective + singular noun still needs 'a'."),
    d("a05", "article", "שלחתי לך מייל אתמול.", "I sent you email yesterday.", ["I sent you an email yesterday."], /an email/i, /sent you (a )?email/i, "'An' before a vowel sound: an email."),
    d("a06", "article", "אנחנו צריכים החלטה עד יום שני.", "We need decision by Monday.", ["We need a decision by Monday."], /a decision by monday/i, /need decision/i, "One decision: a decision."),
    d("a07", "article", "היא מהנדסת מצוינת.", "She is excellent engineer.", ["She's an excellent engineer.", "She's a great engineer."], /an excellent engineer|a great engineer/i, /(she'?s|is) excellent engineer/i, "An before a vowel sound: an excellent engineer."),
    d("a08", "article", "כסף זה לא הכול.", "The money is not everything.", ["Money isn't everything.", "Money is not everything."], /^money/i, /^the money/i, "General ideas take no 'the': Money isn't everything.", "כשמדברים על משהו באופן כללי, בלי the: Money isn't everything."),
    d("a09", "article", "הלקוחות שלנו רוצים אפליקציה פשוטה יותר.", "Our customers want simpler app.", ["Our customers want a simpler app."], /a simpler app/i, /want simpler app/i, "One app: a simpler app."),

    // ---------- present perfect ----------
    d("f01", "perfect", "אני עובדת בחברה כבר חמש שנים.", "I work in the company already five years.", ["I've been working at the company for five years.", "I have worked at the company for five years.", "I've worked here for five years."], /(have|'ve) (been working|worked)/i, /^i (work|am working) (in|at)/i, "Still true today: I've worked here for five years."),
    d("f02", "perfect", "עוד לא שחררנו את הגרסה.", "We didn't release the version yet.", ["We haven't released the version yet.", "We have not released the new version yet."], /haven'?t|have not/i, /didn'?t (release|ship|send)/i, "With 'yet', use the present perfect: haven't released."),
    d("f03", "perfect", "אף פעם לא עבדתי עם הספק הזה.", "I never worked with this vendor.", ["I've never worked with this vendor.", "I have never worked with this vendor."], /(have|'ve) never worked/i, /^i never worked/i, "Life experience up to now: I've never worked with..."),
    d("f04", "perfect", "כמה זמן את בצוות?", "How long you are in the team?", ["How long have you been on the team?"], /how long have you been/i, /how long (you are|are you)/i, "How long have you been on the team?"),
    d("f05", "perfect", "אנחנו מחכים לתשובה כבר שבועיים.", "We wait for an answer already two weeks.", ["We've been waiting for an answer for two weeks.", "We have been waiting for an answer for two weeks."], /(have|'ve) been waiting/i, /^we (wait|are waiting)/i, "Started in the past, still going: we've been waiting."),
    d("f06", "perfect", "המספרים השתפרו מאז ינואר.", "The numbers improved from January.", ["The numbers have improved since January."], /have improved since/i, /improved from january|improve since/i, "Since + a starting point needs the present perfect."),
    d("f07", "perfect", "היא עובדת פה מאז 2022.", "She works here since 2022.", ["She has worked here since 2022.", "She's been working here since 2022."], /(has|'s) (been working|worked) here since/i, /she (works|is working) here since/i, "Since 2022 means up to now: she has worked here since 2022."),
    d("f08", "perfect", "אתמול שלחתי את הדוח.", "Yesterday I have sent the report.", ["I sent the report yesterday.", "Yesterday I sent the report."], /i sent the report/i, /have sent/i, "A finished moment (yesterday) takes the simple past.", "כשיש זמן שהסתיים (yesterday, last week) משתמשים ב-past simple, לא ב-have."),

    // ---------- copula ----------
    d("c01", "copula", "הדוח מוכן.", "The report ready.", ["The report is ready.", "The report's ready."], /report('s| is) ready/i, /report ready\.?$/i, "English needs 'is'."),
    d("c02", "copula", "הצוות מאוד חזק.", "The team very strong.", ["The team is very strong.", "The team's very strong."], /team('s| is) (very|really) strong/i, /team very strong/i, "English needs 'is'."),
    d("c03", "copula", "המספרים טובים החודש.", "The numbers good this month.", ["The numbers are good this month.", "The numbers look good this month."], /numbers (are|look) good/i, /numbers good/i, "English needs 'are' (or 'look')."),

    // ---------- questions ----------
    d("q01", "question", "מתי אתם משחררים את הפיצ'ר?", "When you release the feature?", ["When are you releasing the feature?", "When will you release the feature?", "When are you launching the feature?"], /when (are|will) you/i, /when you (are|release|will)/i, "Flip the verb or add an auxiliary: When are you releasing it?"),
    d("q02", "question", "למה הלקוח ביטל?", "Why the client canceled?", ["Why did the client cancel?"], /why did the (client|customer) cancel/i, /why the (client|customer) (canceled|cancelled|cancel)/i, "Past question: why did + base verb."),
    d("q03", "question", "כמה זה עולה?", "How much it costs?", ["How much does it cost?"], /how much does (it|this) cost/i, /how much (it|this) costs?/i, "Present question: does + base verb."),
    d("q04", "question", "מה את חושבת על ההצעה?", "What you think about the proposal?", ["What do you think about the proposal?", "What do you think of the proposal?"], /what do you think/i, /what you think/i, "What do you think...?"),
    d("q05", "question", "מתי הפגישה מתחילה?", "When the meeting starts?", ["When does the meeting start?"], /when does the meeting start/i, /when the meeting starts?/i, "When does the meeting start?"),
    d("q06", "question", "למה זה לקח כל כך הרבה זמן?", "Why it took so long?", ["Why did it take so long?", "Why did this take so long?"], /why did (it|this) take/i, /why (it|this) took/i, "Why did it take so long?"),

    // ---------- it ----------
    d("g01", "it", "המערכת לא עובדת, היא נופלת כל הזמן.", "The system doesn't work, she falls all the time.", ["The system isn't working; it keeps crashing.", "The system isn't working. It keeps going down."], /\bit (keeps|crashes|goes)/i, /\bshe\b/i, "A system is 'it'. And: keeps crashing / keeps going down."),
    d("g02", "it", "האפליקציה צריכה תיקון, היא איטית מדי.", "The app needs a fix, she is too slow.", ["The app needs a fix; it's too slow.", "The app needs a fix. It's too slow."], /\bit('s| is) too slow/i, /\bshe('s| is)\b/i, "An app is 'it'."),
    d("g03", "it", "הדוח? הוא כבר נשלח.", "The report? He was already sent.", ["The report? It's already been sent.", "The report? It was already sent."], /\bit('s| has| was)/i, /\bhe\b/i, "A report is 'it'."),

    // ---------- uncountable ----------
    d("u01", "countable", "קיבלנו מידע חדש מהלקוח.", "We got new informations from the client.", ["We got new information from the client."], /information/i, /informations|an information/i, "Information is uncountable."),
    d("u02", "countable", "אני צריכה עצה.", "I need an advice.", ["I need some advice.", "I need advice.", "Can I get your advice?"], /advice/i, /an advice|advices/i, "Advice is uncountable: some advice, a piece of advice."),
    d("u03", "countable", "קיבלתי משוב טוב מההנהלה.", "I got a good feedback from management.", ["I got good feedback from management.", "I got some good feedback from management."], /feedback/i, /a (good )?feedback|feedbacks/i, "Feedback is uncountable."),
    d("u04", "countable", "עשינו מחקר על המשתמשים.", "We did a research on the users.", ["We did research on our users.", "We did user research."], /research/i, /a research|researches/i, "Research is uncountable."),
    d("u05", "countable", "יש לנו הרבה עבודה השבוע.", "We have a lot of works this week.", ["We have a lot of work this week."], /a lot of work|lots of work/i, /works|many work/i, "Work (tasks) is uncountable."),

    // ---------- comparatives ----------
    d("m01", "comparative", "הגרסה החדשה יותר טובה.", "The new version is more better.", ["The new version is better."], /\bbetter\b/i, /more (better|good)/i, "Better already means 'more good'."),
    d("m02", "comparative", "זה יותר קל ממה שחשבתי.", "It's more easy than I thought.", ["It's easier than I thought."], /easier than/i, /more eas(y|ier)/i, "Short adjective: easier."),
    d("m03", "comparative", "הספק הזה יותר זול.", "This vendor is more cheap.", ["This vendor is cheaper."], /cheaper/i, /more cheap/i, "Short adjective: cheaper."),

    // ---------- there is ----------
    d("h01", "there", "במוצר יש באג קריטי.", "In the product have a critical bug.", ["There's a critical bug in the product.", "The product has a critical bug."], /there('s| is) a critical bug|has a critical bug/i, /in the product (have|has)|^have a/i, "Existence: there is. Or make the product the subject: the product has."),
    d("h02", "there", "יש הרבה סיכונים בתוכנית.", "In the plan have a lot of risks.", ["There are a lot of risks in the plan.", "The plan has a lot of risks."], /there are (a lot of|many) risks|has (a lot of|many) risks/i, /in the plan (have|has)|^have/i, "Plural existence: there are."),

    // ---------- word order ----------
    d("w01", "order", "אני אוהבת מאוד את הרעיון הזה.", "I like very much this idea.", ["I really like this idea.", "I like this idea a lot."], /really like this idea|like this idea (very much|a lot)/i, /like very much/i, "Never put 'very much' between the verb and the object."),
    d("w02", "order", "גם אני חושבת שכדאי לחכות.", "Also I think we should wait.", ["I also think we should wait.", "I think we should wait too."], /i also think|too\.?$/i, /^also i think/i, "Also goes before the verb: I also think."),
    d("w03", "order", "אני תמיד בודקת את המספרים פעמיים.", "I check always the numbers twice.", ["I always check the numbers twice.", "I always double-check the numbers."], /i always (check|double)/i, /always i check|i check always/i, "Always goes before the verb."),
    d("w04", "order", "אני לא יודעת איפה הקובץ.", "I don't know where is the file.", ["I don't know where the file is."], /where the file is/i, /where is the file/i, "Inside a sentence, no question order: where the file is."),
    d("w05", "order", "תעדכנו אותי מה הסטטוס.", "Let me know what is the status.", ["Let me know what the status is.", "Keep me posted on the status."], /what the status is|posted on the status/i, /what('s| is) the status/i, "Inside a sentence: what the status is."),

    // ---------- if / when ----------
    d("i01", "ifwhen", "כשאגיע, אתקשר אלייך.", "When I will arrive, I will call you.", ["When I arrive, I'll call you.", "When I get there, I'll call you."], /when i (arrive|get there|get in)/i, /when i will/i, "No will after when: When I arrive."),
    d("i02", "ifwhen", "אם הבנק יאשר, נשיק בשבוע הבא.", "If the bank will approve, we will launch next week.", ["If the bank approves, we'll launch next week."], /if the bank approves/i, /if the bank will/i, "No will after if: If the bank approves."),
    d("i03", "ifwhen", "ברגע שהנתונים יגיעו, אשלח לך.", "As soon as the data will arrive, I will send you.", ["As soon as the data comes in, I'll send it to you.", "As soon as the data arrives, I'll send it to you."], /as soon as the data (arrives|comes in|is in|lands)/i, /data will/i, "No will after as soon as. And send IT to you."),

    // ---------- fintech and product phrases ----------
    d("v01", "colloc", "צריך לעבד את התשלום היום.", "We need to do the payment today.", ["We need to process the payment today."], /process the payment/i, /do the payment/i, "A system or bank processes a payment."),
    d("v02", "colloc", "סימנו את העסקה כחשודה.", "We signed the transaction as suspicious.", ["We flagged the transaction as suspicious."], /flagged/i, /signed/i, "Flag a transaction."),
    d("v03", "colloc", "אנחנו גובים עמלה של 1%.", "We take a fee of 1%.", ["We charge a 1% fee.", "We charge a fee of 1%."], /charge a (1 ?% |one percent )?fee/i, /take a (1 ?% )?fee/i, "Charge a fee."),
    d("v04", "colloc", "גייסנו 20 מיליון דולר.", "We collected 20 million dollars.", ["We raised 20 million dollars.", "We raised $20 million."], /raised/i, /collected|recruited|brought/i, "Raise money, raise a round."),
    d("v05", "colloc", "עמדנו ביעד.", "We stood in the target.", ["We hit our target.", "We met our target.", "We hit our goal."], /(hit|met|reached) (our|the) (target|goal)/i, /stood (in|at)/i, "Hit / meet a target."),
    d("v06", "colloc", "בואו נתיישר על העדיפויות.", "Let's get aligned about the priorities.", ["Let's align on priorities.", "Let's get aligned on priorities."], /align(ed)? on/i, /align(ed)? (about|for|in)/i, "Align on something."),
    d("v07", "colloc", "אני אעלה את זה למנהלת שלי.", "I will raise it up to my manager.", ["I'll escalate this to my manager.", "I'll raise this with my manager."], /escalate (this|it) to|raise (this|it) with/i, /raise (it|this) up to|escalate on/i, "Escalate to, or raise it with."),
    d("v08", "colloc", "נשחרר את זה ל-10% מהמשתמשים.", "We will open it to 10% from the users.", ["We'll roll it out to 10% of users.", "We'll release it to 10% of users."], /(roll(ing)? (it )?out|release( it)?) to 10/i, /open (it )?to 10|from the users/i, "Roll out to 10% OF users."),
    d("v09", "colloc", "ההמרה ירדה בשתי נקודות אחוז.", "The conversion went down in two percent.", ["Conversion dropped by two percentage points.", "Conversion fell by 2 percentage points."], /percentage points/i, /in two percent|by (two|2) ?(%|percent)\b/i, "From 5% to 3% is two percentage points, not two percent.", "ירידה מ-5% ל-3% היא שתי נקודות אחוז (percentage points), לא 2 percent."),
    d("v10", "colloc", "צריך להוציא את זה מהסקופ.", "We need to take it from the scope.", ["We need to cut this from the scope.", "We need to take this out of scope.", "Let's descope this."], /out of (the )?scope|cut (this|it) from|descope|scope (it|this) (out|down)/i, /take (it|this) from the scope/i, "Take something out of scope, or descope it."),
    d("v11", "colloc", "בואו נחזור לזה אחרי הסטנדאפ.", "Let's return back to this after the standup.", ["Let's circle back on this after the stand-up.", "Let's come back to this after the stand-up."], /circle back|come back to (this|it)/i, /return back/i, "Circle back or come back to it. 'Return back' says back twice."),

    // ---------- writing: fix the sentence (no Hebrew prompt) ----------
    d("r01", "runon", null, "The test failed, we will rerun it tomorrow.", ["The test failed, so we'll rerun it tomorrow.", "The test failed. We'll rerun it tomorrow.", "The test failed; we'll rerun it tomorrow."], /failed(;|\.|,? so|,? and)/i, /failed, we/i, "Two full sentences: use a period, a semicolon, or 'so'."),
    d("r02", "runon", null, "Thanks for the update, I will review it today.", ["Thanks for the update. I'll review it today.", "Thanks for the update! I'll review it today."], /update(\.|!|;)/i, /update, i/i, "Two full sentences: split them."),
    d("r03", "runon", null, "The numbers look good, however we need to check churn.", ["The numbers look good; however, we need to check churn.", "The numbers look good. However, we need to check churn.", "The numbers look good, but we need to check churn."], /(;|\.) however,|, but we/i, /good, however/i, "'However' is not a linking word like 'but'. Use a semicolon or period before it, and a comma after it."),
    d("r04", "runon", null, "I talked with legal and they approved it and we can launch on Monday and I will update the team.", ["I talked with legal, and they approved it. We can launch on Monday. I'll update the team."], /\.[^.]+\.[^.]*/i, /and we can launch on monday and/i, "Split long 'and... and... and' chains into short sentences."),
    d("k01", "caps", null, "i will send the deck on monday.", ["I will send the deck on Monday.", "I'll send the deck on Monday."], /^I\b.*Monday/, /^i\b|monday/, "Capital I and capital Monday."),
    d("k02", "caps", null, "We are expanding to europe in q3.", ["We are expanding to Europe in Q3.", "We're expanding to Europe in Q3."], /Europe.*Q3/, /europe|q3/, "Capital Europe and Q3."),
    d("k03", "caps", null, "my english is getting better every week.", ["My English is getting better every week."], /^My English/, /^my|english/, "Capital at the start, and languages always have a capital."),
    d("k04", "caps", null, "The launch moved to january, after the holidays.", ["The launch moved to January, after the holidays."], /January/, /january/, "Months have a capital."),
    d("o01", "homophone", null, "Its a great feature, but it's adoption is low.", ["It's a great feature, but its adoption is low."], /^it'?s a great feature, but its adoption/i, /^its a|it's adoption/i, "it's = it is. its = belonging to it."),
    d("o02", "homophone", null, "The new flow is faster then the old one.", ["The new flow is faster than the old one."], /faster than/i, /faster then/i, "Comparisons use than. Then is about time."),
    d("o03", "homophone", null, "This change will effect our revenue.", ["This change will affect our revenue."], /will affect/i, /will effect/i, "affect = verb (to change). effect = noun (the result)."),
    d("o04", "homophone", null, "We don't want to loose customers.", ["We don't want to lose customers."], /to lose/i, /loose/i, "lose (a customer) vs. loose (not tight)."),
    d("o05", "homophone", null, "Their is a bug in the checkout.", ["There is a bug in the checkout.", "There's a bug in the checkout."], /^there('s| is)/i, /^their/i, "there = place / existence. their = belonging to them."),
    d("o06", "homophone", null, "Your welcome to join the call.", ["You're welcome to join the call.", "You are welcome to join the call."], /^you('re| are) welcome/i, /^your welcome/i, "you're = you are."),
    d("s01", "spelling", null, "We need to prioritise the backlog.", ["We need to prioritize the backlog."], /prioritize/i, /prioritise/i, "American: -ize."),
    d("s02", "spelling", null, "Let me analyse the data first.", ["Let me analyze the data first."], /analyze/i, /analyse/i, "American: analyze."),
    d("s03", "spelling", null, "We changed the colour of the button.", ["We changed the color of the button."], /\bcolor\b/i, /colour/i, "American: color."),
    d("s04", "spelling", null, "User behaviour changed after the update.", ["User behavior changed after the update."], /behavior/i, /behaviour/i, "American: behavior."),
    d("s05", "spelling", null, "The organisation is growing fast.", ["The organization is growing fast."], /organization/i, /organisation/i, "American: organization."),
    d("y01", "agreement", null, "Each of the teams have a quarterly goal.", ["Each of the teams has a quarterly goal."], /teams has/i, /teams have/i, "Each = one: each of the teams has."),
    d("y02", "agreement", null, "The team are working on it.", ["The team is working on it.", "The team's working on it."], /team('s| is)/i, /team are/i, "In American English a team is singular."),
    d("y03", "agreement", null, "He don't have access yet.", ["He doesn't have access yet.", "He does not have access yet."], /doesn'?t have|does not have/i, /don'?t have/i, "He / she / it: doesn't."),
    d("y04", "agreement", null, "The company have three offices.", ["The company has three offices."], /company has/i, /company have/i, "In American English a company is singular.")
  ];

  // Stress: syllables + index of the stressed one.
  var STRESS = [
    ["compliance", ["com", "pli", "ance"], 1], ["liquidity", ["li", "quid", "i", "ty"], 1], ["volatility", ["vol", "a", "til", "i", "ty"], 2],
    ["analytics", ["an", "a", "lyt", "ics"], 2], ["revenue", ["rev", "e", "nue"], 0], ["percentage", ["per", "cent", "age"], 1],
    ["develop", ["de", "vel", "op"], 1], ["development", ["de", "vel", "op", "ment"], 1], ["determine", ["de", "ter", "mine"], 1],
    ["process", ["proc", "ess"], 0], ["invoice", ["in", "voice"], 0], ["category", ["cat", "e", "go", "ry"], 0],
    ["economy", ["e", "con", "o", "my"], 1], ["economic", ["e", "co", "nom", "ic"], 2], ["strategy", ["strat", "e", "gy"], 0],
    ["strategic", ["stra", "te", "gic"], 1], ["priority", ["pri", "or", "i", "ty"], 1], ["prioritize", ["pri", "or", "i", "tize"], 1],
    ["quarterly", ["quar", "ter", "ly"], 0], ["customer", ["cus", "tom", "er"], 0], ["reconciliation", ["rec", "on", "cil", "i", "a", "tion"], 4],
    ["authorization", ["au", "thor", "i", "za", "tion"], 3], ["regulatory", ["reg", "u", "la", "to", "ry"], 0], ["transaction", ["trans", "ac", "tion"], 1],
    ["settlement", ["set", "tle", "ment"], 0], ["interest", ["in", "ter", "est"], 0], ["fiduciary", ["fi", "du", "ci", "ar", "y"], 1],
    ["infrastructure", ["in", "fra", "struc", "ture"], 0], ["architecture", ["ar", "chi", "tec", "ture"], 0], ["executive", ["ex", "ec", "u", "tive"], 1],
    ["engineer", ["en", "gi", "neer"], 2], ["component", ["com", "po", "nent"], 1], ["deliverable", ["de", "liv", "er", "a", "ble"], 1],
    ["stakeholder", ["stake", "hold", "er"], 0], ["analysis", ["a", "nal", "y", "sis"], 1], ["analyst", ["an", "a", "lyst"], 0],
    ["available", ["a", "vail", "a", "ble"], 1], ["comfortable", ["com", "fort", "a", "ble"], 0], ["necessary", ["nec", "es", "sar", "y"], 0],
    ["presentation", ["pres", "en", "ta", "tion"], 2], ["competitor", ["com", "pet", "i", "tor"], 1], ["mortgage", ["mort", "gage"], 0],
    ["onboarding", ["on", "board", "ing"], 0], ["portfolio", ["port", "fo", "li", "o"], 1], ["parameter", ["pa", "ram", "e", "ter"], 1]
  ];

  var PAIRS = [
    { id: "i_ee", name: "ship / sheep (short i vs. long ee)", he: "בעברית יש רק צליל i אחד. באנגלית יש קצר (ship) וארוך (sheep), וזה משנה משמעות.",
      pairs: [["ship", "sheep"], ["live", "leave"], ["fill", "feel"], ["sit", "seat"], ["bit", "beat"], ["slip", "sleep"], ["list", "least"], ["still", "steal"]] },
    { id: "u_oo", name: "full / fool (short u vs. long oo)", he: "גם כאן: צליל קצר (full) וארוך (fool).",
      pairs: [["full", "fool"], ["pull", "pool"], ["look", "Luke"], ["could", "cooed"]] },
    { id: "ae_uh", name: "cap / cup (a vs. u)", he: "באנגלית a פתוחה (cap) שונה מ-u קצרה (cup). בעברית שתיהן נשמעות כמו a.",
      pairs: [["cap", "cup"], ["bad", "bud"], ["hat", "hut"], ["cat", "cut"], ["match", "much"], ["ran", "run"], ["bank", "bunk"]] },
    { id: "er_or", name: "work / walk (er vs. aw)", he: "work נשמע כמו 'וֶרְק' עם r אמריקאית, walk כמו 'ווֹק'. החלפה ביניהם מבלבלת.",
      pairs: [["work", "walk"], ["shirt", "short"], ["bird", "board"], ["turn", "torn"], ["word", "ward"]] },
    { id: "w_v", name: "west / vest (w vs. v)", he: "w עם שפתיים עגולות בלי שיניים. v עם שיניים על השפה התחתונה.",
      pairs: [["west", "vest"], ["wine", "vine"], ["wet", "vet"], ["while", "vile"]] },
    { id: "th_t", name: "three / tree (th vs. t)", he: "th: הלשון בין השיניים ונושפים. לא t ולא s.",
      pairs: [["three", "tree"], ["thank", "tank"], ["thin", "tin"], ["both", "boat"]] },
    { id: "th_s", name: "think / sink (th vs. s)", he: "th: הלשון בין השיניים. s: הלשון מאחורי השיניים.",
      pairs: [["think", "sink"], ["thing", "sing"], ["path", "pass"], ["mouth", "mouse"]] },
    { id: "th_d", name: "they / day (voiced th vs. d)", he: "th קולי (they) עם הלשון בין השיניים, לא d.",
      pairs: [["they", "day"], ["those", "doze"], ["then", "den"]] }
  ];

  var ED = [
    ["worked", "t"], ["shipped", "t"], ["launched", "t"], ["discussed", "t"], ["missed", "t"], ["checked", "t"], ["asked", "t"],
    ["signed", "d"], ["approved", "d"], ["planned", "d"], ["delivered", "d"], ["closed", "d"], ["called", "d"], ["reviewed", "d"],
    ["needed", "id"], ["updated", "id"], ["tested", "id"], ["decided", "id"], ["reported", "id"], ["added", "id"], ["invested", "id"]
  ];

  var CANCANT = [
    "I can join the call at three.", "I can't join the call at three.", "We can ship it this sprint.", "We can't ship it this sprint.",
    "She can approve the budget.", "She can't approve the budget.", "You can see the dashboard now.", "You can't see the dashboard now."
  ];

  var SHADOW = [
    "Let's circle back on this after the stand-up.",
    "I'd like to walk you through the numbers for the third quarter.",
    "Conversion dropped by two percentage points, mostly on mobile.",
    "We flagged the transaction as suspicious and paused the payout.",
    "I'm not sure we can hit that date without cutting scope.",
    "Could you send me the deck when you get a chance?",
    "The regulator wants a full reconciliation by the end of the month.",
    "We've been working on the onboarding flow for six weeks.",
    "What would it take to roll this out to ten percent of users?",
    "I see it a bit differently. Here's what the data shows.",
    "Our main competitor charges a lower fee, but their approval rate is worse.",
    "If the bank approves the integration, we'll launch next week.",
    "Thanks for flagging that. I'll take care of it today.",
    "The team has been doing great work on liquidity reporting.",
    "Let me check with compliance and get back to you by Friday.",
    "We need to make a decision on the roadmap before the executive review.",
    "Revenue is up eight percent quarter over quarter.",
    "I don't know yet, but I'll find out and follow up.",
    "Can we align on priorities before we commit to a timeline?",
    "The authorization rate improved after we changed the routing logic."
  ];

  // Role-play scenarios for a fintech Group Product Manager.
  var SCENARIOS = [
    { id: "roadmap", title: "Roadmap review with the VP",
      brief: "You present your team's roadmap. The VP of Product challenges one priority and asks what you would cut.",
      partner: "Dana, VP of Product. Sharp, busy, friendly but direct. Asks 'why now?' and 'what would you cut?'.",
      open: "Thanks for making time. So, walk me through what's at the top of the list for next quarter and why." },
    { id: "update", title: "Quarterly update with numbers",
      brief: "Give a short update to leadership: one win, one number, one risk, and one decision you need from them.",
      partner: "Mark, Chief Operating Officer. Wants numbers and a clear ask. Interrupts if it gets long.",
      open: "Okay, you've got five minutes. What do I need to know?" },
    { id: "feedback", title: "Feedback to a PM on your team",
      brief: "Give constructive feedback to a PM whose spec was unclear and caused engineering rework. Stay kind and specific.",
      partner: "Alex, a mid-level PM who reports to you. A bit defensive at first, open once he feels heard.",
      open: "Hey, you wanted to chat about the payouts spec?" },
    { id: "pushback", title: "Push back on a deadline",
      brief: "Sales promised a client a feature by the end of the month. Push back without sounding rude, and offer an alternative.",
      partner: "Jenna, Head of Sales. Under pressure from a big client, persistent, wants a yes.",
      open: "I really need this for Northwind by the end of the month. Can your team make that happen?" },
    { id: "compliance", title: "Explain a compliance requirement",
      brief: "Explain to an engineering lead why a new KYC check must ship before launch, and agree on a plan.",
      partner: "Sam, engineering lead. Skeptical of 'compliance stuff', worried about the timeline.",
      open: "So I heard we need to add another KYC step? That's going to slow everything down." },
    { id: "partner", title: "Partner call about failed payments",
      brief: "A partner bank reports a spike in failed payments. Find out what is going on, show you're on it, agree on next steps.",
      partner: "Priya, partnership manager at a bank. Polite but concerned; her management is asking questions.",
      open: "Hi, thanks for jumping on. We've seen failed payments go up a lot since Tuesday. Do you know what's happening?" },
    { id: "pitch", title: "Pitch a new initiative",
      brief: "Pitch a new initiative in two minutes: the problem, the bet, the expected impact, and what you need.",
      partner: "Chris, CEO. Curious, asks about the market size and the risk.",
      open: "I hear you have an idea. Go ahead, I'm listening." },
    { id: "smalltalk", title: "Small talk before a call",
      brief: "The first minutes of a call with a US colleague you don't know well. Keep it light and natural, then move to the agenda.",
      partner: "Taylor, a product director in New York. Chatty and warm.",
      open: "Hey! Good to finally meet you. How's your week going so far?" }
  ];

  // Prompts for free speaking (4/3/2 and measurements). COMPARE is always the same, for old vs. new.
  var COMPARE = "Tell me about your role and what your team is working on right now.";
  var SPEAK = [
    "Walk me through your team's top priority this quarter and why it matters.",
    "Describe a product decision you made recently. What were the trade-offs?",
    "Explain how a card payment works, from the moment a customer taps to when the merchant gets paid.",
    "Tell me about a time a launch didn't go as planned. What did you learn?",
    "How do you decide what NOT to build?",
    "Describe your ideal relationship between product and engineering.",
    "What is one metric you watch every week, and what does it tell you?",
    "How would you explain your product to someone who has never used a bank app?",
    "What makes a good product manager, in your view?",
    "Describe a disagreement with a stakeholder and how you handled it.",
    "What is the biggest risk for your product in the next six months?",
    "How do you onboard a new PM to your team?",
    "Explain KYC and why it matters to a customer who finds it annoying.",
    "What trend in fintech are you most excited about, and why?",
    "How do you prepare for an important executive review?",
    "Describe a feature you're proud of. What problem did it solve?",
    "How do you balance speed and compliance in your team?",
    "What would you change about how your company plans the roadmap?",
    "Tell me about a customer insight that surprised you.",
    "How do you give feedback to someone who is senior to you?"
  ];
  var INTAKE_SPEAK = [COMPARE, "Describe a product decision you made recently. What were the trade-offs?", "What would you do in your first 90 days if you joined a new fintech company?"];

  var WRITE_TASKS = [
    { id: "w_update", title: "Status update to leadership", task: "Write a 5 to 7 sentence update to your VP: one win, one number, one risk, one decision you need." },
    { id: "w_decline", title: "Say no to a request", task: "Sales asked for a custom feature for one client. Write a short, friendly reply that says no for this quarter and offers an alternative." },
    { id: "w_feedback", title: "Written feedback", task: "Write feedback to a PM on your team about a spec that was unclear. Be kind and specific; suggest one concrete improvement." },
    { id: "w_prd", title: "PRD problem statement", task: "Write the problem statement of a PRD (4 to 6 sentences) for a feature that reduces failed payments." },
    { id: "w_followup", title: "Follow-up email", task: "You sent a partner a question a week ago and got no answer. Write a short follow-up that is friendly and clear." },
    { id: "w_release", title: "Release note", task: "Write a customer-facing release note (3 to 5 sentences) for a faster payout feature. No promises you can't keep." },
    { id: "w_slack", title: "Slack message", task: "Write a Slack message to your team: the launch moves one week because of a compliance check. Keep it calm and short." },
    { id: "w_intro", title: "Introduce two people", task: "Write an email that introduces a new engineering manager to a partner bank contact." }
  ];

  window.TC = { CATS: CATS, DRILLS: DRILLS, STRESS: STRESS, PAIRS: PAIRS, ED: ED, CANCANT: CANCANT, SHADOW: SHADOW,
    SCENARIOS: SCENARIOS, SPEAK: SPEAK, COMPARE: COMPARE, INTAKE_SPEAK: INTAKE_SPEAK, WRITE_TASKS: WRITE_TASKS };
})();
