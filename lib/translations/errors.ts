/**
 * The messages the server hands back to a form, in every language.
 *
 * The server writes them in Turkish and the text travels as it is, so a message
 * can be matched by its own wording: the keys here are those exact Turkish
 * sentences. Translating at the point where the text is shown, with the
 * language the page is in, keeps the server code and its tests as they are.
 *
 * A `#` stands for a number. It is how a limit that comes from a constant ("at
 * most 160 characters") is matched without listing every value: the number in
 * the incoming message is lifted out, the rest is looked up, and the number goes
 * back in where the `#` is. A message with a number that is part of the wording
 * itself ("0,5 ile 5") is listed with its digits and found first.
 *
 * `tr` is only given for a message that was not written in Turkish to begin
 * with. See localizeError in lib/error-text.ts.
 */
export type ErrorTranslation = {
  tr?: string;
  en: string;
  de: string;
  fr: string;
  es: string;
  it: string;
};

export const errorTranslations: Record<string, ErrorTranslation> = {
  // ── Accounts, sessions and permissions
  "Giriş yapmalısın": {
    en: "You need to sign in",
    de: "Du musst dich anmelden",
    fr: "Tu dois te connecter",
    es: "Debes iniciar sesión",
    it: "Devi accedere",
  },
  "Kullanıcı bulunamadı": {
    en: "User not found",
    de: "Nutzer nicht gefunden",
    fr: "Utilisateur introuvable",
    es: "Usuario no encontrado",
    it: "Utente non trovato",
  },
  "Hesabınız askıya alınmış": {
    en: "Your account has been suspended",
    de: "Dein Konto wurde gesperrt",
    fr: "Ton compte a été suspendu",
    es: "Tu cuenta ha sido suspendida",
    it: "Il tuo account è stato sospeso",
  },
  "Bu işlem için yetkiniz yok": {
    en: "You are not allowed to do this",
    de: "Dafür fehlt dir die Berechtigung",
    fr: "Tu n'as pas l'autorisation de faire cela",
    es: "No tienes permiso para hacer esto",
    it: "Non hai il permesso di farlo",
  },
  "Çok fazla istek. Lütfen biraz sonra tekrar dene.": {
    en: "Too many requests. Please try again in a moment.",
    de: "Zu viele Anfragen. Bitte versuche es gleich noch einmal.",
    fr: "Trop de requêtes. Réessaie dans un instant.",
    es: "Demasiadas solicitudes. Inténtalo de nuevo en un momento.",
    it: "Troppe richieste. Riprova tra poco.",
  },
  "Bir hata oluştu": {
    en: "Something went wrong",
    de: "Es ist ein Fehler aufgetreten",
    fr: "Une erreur s'est produite",
    es: "Se ha producido un error",
    it: "Si è verificato un errore",
  },
  "Onay metni eşleşmedi": {
    en: "The confirmation text did not match",
    de: "Der Bestätigungstext stimmt nicht überein",
    fr: "Le texte de confirmation ne correspond pas",
    es: "El texto de confirmación no coincide",
    it: "Il testo di conferma non corrisponde",
  },
  "Son admin hesabı silinemez. Önce başka bir hesabı admin yap.": {
    en: "The last admin account cannot be deleted. Make another account an admin first.",
    de: "Das letzte Admin-Konto kann nicht gelöscht werden. Mache zuerst ein anderes Konto zum Admin.",
    fr: "Le dernier compte administrateur ne peut pas être supprimé. Nomme d'abord un autre administrateur.",
    es: "La última cuenta de administrador no se puede eliminar. Haz administrador a otra cuenta primero.",
    it: "L'ultimo account amministratore non può essere eliminato. Rendi prima amministratore un altro account.",
  },

  // ── Moderation
  "Geçersiz yorum": {
    en: "Invalid review",
    de: "Ungültige Bewertung",
    fr: "Avis invalide",
    es: "Reseña no válida",
    it: "Recensione non valida",
  },
  "Geçersiz kullanıcı": {
    en: "Invalid user",
    de: "Ungültiger Nutzer",
    fr: "Utilisateur invalide",
    es: "Usuario no válido",
    it: "Utente non valido",
  },
  "Kendi hesabınızı askıya alamazsınız": {
    en: "You cannot suspend your own account",
    de: "Du kannst dein eigenes Konto nicht sperren",
    fr: "Tu ne peux pas suspendre ton propre compte",
    es: "No puedes suspender tu propia cuenta",
    it: "Non puoi sospendere il tuo account",
  },
  "Başka bir admini askıya alamazsınız": {
    en: "You cannot suspend another admin",
    de: "Du kannst keinen anderen Admin sperren",
    fr: "Tu ne peux pas suspendre un autre administrateur",
    es: "No puedes suspender a otro administrador",
    it: "Non puoi sospendere un altro amministratore",
  },
  "Kendi hesabınızı silemezsiniz": {
    en: "You cannot delete your own account",
    de: "Du kannst dein eigenes Konto nicht löschen",
    fr: "Tu ne peux pas supprimer ton propre compte",
    es: "No puedes eliminar tu propia cuenta",
    it: "Non puoi eliminare il tuo account",
  },
  "Başka bir admini silemezsiniz": {
    en: "You cannot delete another admin",
    de: "Du kannst keinen anderen Admin löschen",
    fr: "Tu ne peux pas supprimer un autre administrateur",
    es: "No puedes eliminar a otro administrador",
    it: "Non puoi eliminare un altro amministratore",
  },

  // ── Cities, reviews and the profile
  "Şehir bulunamadı": {
    en: "City not found",
    de: "Stadt nicht gefunden",
    fr: "Ville introuvable",
    es: "Ciudad no encontrada",
    it: "Città non trovata",
  },
  "Invalid cityId": {
    tr: "Geçersiz şehir",
    en: "Invalid city",
    de: "Ungültige Stadt",
    fr: "Ville invalide",
    es: "Ciudad no válida",
    it: "Città non valida",
  },
  "Bu şehre zaten yorum yaptınız.": {
    en: "You have already reviewed this city.",
    de: "Du hast diese Stadt bereits bewertet.",
    fr: "Tu as déjà évalué cette ville.",
    es: "Ya has reseñado esta ciudad.",
    it: "Hai già recensito questa città.",
  },
  "Puanlar 0,5 ile 5 yıldız arasında olmalı": {
    en: "Ratings must be between 0.5 and 5 stars",
    de: "Bewertungen müssen zwischen 0,5 und 5 Sternen liegen",
    fr: "Les notes doivent être comprises entre 0,5 et 5 étoiles",
    es: "Las puntuaciones deben estar entre 0,5 y 5 estrellas",
    it: "I voti devono essere tra 0,5 e 5 stelle",
  },
  "Yorum en fazla # karakter olabilir": {
    en: "A review can be at most # characters long",
    de: "Eine Bewertung darf höchstens # Zeichen lang sein",
    fr: "Un avis peut contenir # caractères au maximum",
    es: "Una reseña puede tener como máximo # caracteres",
    it: "Una recensione può avere al massimo # caratteri",
  },
  "Bu şehir zaten listende": {
    en: "This city is already in your list",
    de: "Diese Stadt ist bereits in deiner Liste",
    fr: "Cette ville est déjà dans ta liste",
    es: "Esta ciudad ya está en tu lista",
    it: "Questa città è già nella tua lista",
  },
  "En fazla # şehir seçebilirsin": {
    en: "You can pick at most # cities",
    de: "Du kannst höchstens # Städte wählen",
    fr: "Tu peux choisir # villes au maximum",
    es: "Puedes elegir como máximo # ciudades",
    it: "Puoi scegliere al massimo # città",
  },
  "Geçersiz avatar": {
    en: "Invalid avatar",
    de: "Ungültiger Avatar",
    fr: "Avatar invalide",
    es: "Avatar no válido",
    it: "Avatar non valido",
  },
  "Bu kullanıcı adı zaten alınmış": {
    en: "This username is already taken",
    de: "Dieser Nutzername ist bereits vergeben",
    fr: "Ce nom d'utilisateur est déjà pris",
    es: "Este nombre de usuario ya está en uso",
    it: "Questo nome utente è già in uso",
  },
  "Geçersiz bio": {
    en: "Invalid bio",
    de: "Ungültige Bio",
    fr: "Bio invalide",
    es: "Biografía no válida",
    it: "Bio non valida",
  },
  "Bio en fazla # karakter olabilir": {
    en: "Your bio can be at most # characters long",
    de: "Die Bio darf höchstens # Zeichen lang sein",
    fr: "La bio peut contenir # caractères au maximum",
    es: "La biografía puede tener como máximo # caracteres",
    it: "La bio può avere al massimo # caratteri",
  },
  "Geçersiz ad": {
    en: "Invalid name",
    de: "Ungültiger Name",
    fr: "Nom invalide",
    es: "Nombre no válido",
    it: "Nome non valido",
  },
  "Ad en fazla # karakter olabilir": {
    en: "The name can be at most # characters long",
    de: "Der Name darf höchstens # Zeichen lang sein",
    fr: "Le nom peut contenir # caractères au maximum",
    es: "El nombre puede tener como máximo # caracteres",
    it: "Il nome può avere al massimo # caratteri",
  },
  "Geçersiz konum": {
    en: "Invalid location",
    de: "Ungültiger Ort",
    fr: "Lieu invalide",
    es: "Ubicación no válida",
    it: "Posizione non valida",
  },
  "Konum en fazla # karakter olabilir": {
    en: "The location can be at most # characters long",
    de: "Der Ort darf höchstens # Zeichen lang sein",
    fr: "Le lieu peut contenir # caractères au maximum",
    es: "La ubicación puede tener como máximo # caracteres",
    it: "La posizione può avere al massimo # caratteri",
  },
  "Kullanıcı adı gerekli": {
    en: "A username is required",
    de: "Ein Nutzername ist erforderlich",
    fr: "Un nom d'utilisateur est requis",
    es: "Se necesita un nombre de usuario",
    it: "Serve un nome utente",
  },
  "En az # karakter olmalı": {
    en: "Must be at least # characters long",
    de: "Muss mindestens # Zeichen lang sein",
    fr: "Doit contenir au moins # caractères",
    es: "Debe tener al menos # caracteres",
    it: "Deve avere almeno # caratteri",
  },
  "En fazla # karakter olmalı": {
    en: "Must be at most # characters long",
    de: "Darf höchstens # Zeichen lang sein",
    fr: "Doit contenir # caractères au maximum",
    es: "Debe tener como máximo # caracteres",
    it: "Deve avere al massimo # caratteri",
  },
  "Sadece harf, rakam, _ ve - kullanılabilir": {
    en: "Only letters, digits, _ and - are allowed",
    de: "Nur Buchstaben, Ziffern, _ und - sind erlaubt",
    fr: "Seuls les lettres, chiffres, _ et - sont autorisés",
    es: "Solo se permiten letras, números, _ y -",
    it: "Sono ammessi solo lettere, numeri, _ e -",
  },
  "Geçersiz veri": {
    en: "Invalid data",
    de: "Ungültige Daten",
    fr: "Données invalides",
    es: "Datos no válidos",
    it: "Dati non validi",
  },
  "Geçerli bir tarih seç": {
    en: "Pick a valid date",
    de: "Wähle ein gültiges Datum",
    fr: "Choisis une date valide",
    es: "Elige una fecha válida",
    it: "Scegli una data valida",
  },
  "Başlangıç tarihi bitişten sonra olamaz": {
    en: "The start date cannot be after the end date",
    de: "Das Startdatum darf nicht nach dem Enddatum liegen",
    fr: "La date de début ne peut pas être postérieure à la date de fin",
    es: "La fecha de inicio no puede ser posterior a la de fin",
    it: "La data di inizio non può essere successiva a quella di fine",
  },

  // ── Following and blocking
  "Kendini takip edemezsin": {
    en: "You cannot follow yourself",
    de: "Du kannst dir nicht selbst folgen",
    fr: "Tu ne peux pas te suivre toi-même",
    es: "No puedes seguirte a ti mismo",
    it: "Non puoi seguire te stesso",
  },
  "Bu kullanıcıyı takip edemezsin": {
    en: "You cannot follow this user",
    de: "Du kannst diesem Nutzer nicht folgen",
    fr: "Tu ne peux pas suivre cet utilisateur",
    es: "No puedes seguir a este usuario",
    it: "Non puoi seguire questo utente",
  },
  "Kendini engelleyemezsin": {
    en: "You cannot block yourself",
    de: "Du kannst dich nicht selbst blockieren",
    fr: "Tu ne peux pas te bloquer toi-même",
    es: "No puedes bloquearte a ti mismo",
    it: "Non puoi bloccare te stesso",
  },

  // ── Comments and replies
  "Yorum bulunamadı": {
    en: "Comment not found",
    de: "Kommentar nicht gefunden",
    fr: "Commentaire introuvable",
    es: "Comentario no encontrado",
    it: "Commento non trovato",
  },
  "Yanıt verilecek yorum bulunamadı": {
    en: "The comment you are replying to was not found",
    de: "Der Kommentar, auf den du antwortest, wurde nicht gefunden",
    fr: "Le commentaire auquel tu réponds est introuvable",
    es: "No se encontró el comentario al que respondes",
    it: "Il commento a cui rispondi non è stato trovato",
  },
  "Bu yoruma yanıt veremezsin": {
    en: "You cannot reply to this comment",
    de: "Auf diesen Kommentar kannst du nicht antworten",
    fr: "Tu ne peux pas répondre à ce commentaire",
    es: "No puedes responder a este comentario",
    it: "Non puoi rispondere a questo commento",
  },
  "Yanıt boş olamaz": {
    en: "The reply cannot be empty",
    de: "Die Antwort darf nicht leer sein",
    fr: "La réponse ne peut pas être vide",
    es: "La respuesta no puede estar vacía",
    it: "La risposta non può essere vuota",
  },
  "Yanıt en fazla # karakter olabilir": {
    en: "A reply can be at most # characters long",
    de: "Eine Antwort darf höchstens # Zeichen lang sein",
    fr: "Une réponse peut contenir # caractères au maximum",
    es: "Una respuesta puede tener como máximo # caracteres",
    it: "Una risposta può avere al massimo # caratteri",
  },
  "Yanıt bulunamadı": {
    en: "Reply not found",
    de: "Antwort nicht gefunden",
    fr: "Réponse introuvable",
    es: "Respuesta no encontrada",
    it: "Risposta non trovata",
  },

  // ── Trip planner
  "Plan bulunamadı": {
    en: "Plan not found",
    de: "Plan nicht gefunden",
    fr: "Plan introuvable",
    es: "Plan no encontrado",
    it: "Piano non trovato",
  },
  "En fazla # plan oluşturabilirsin": {
    en: "You can create at most # plans",
    de: "Du kannst höchstens # Pläne erstellen",
    fr: "Tu peux créer # plans au maximum",
    es: "Puedes crear como máximo # planes",
    it: "Puoi creare al massimo # piani",
  },
  "Bu saat planın tarihleri dışında": {
    en: "This time is outside the plan's dates",
    de: "Diese Uhrzeit liegt außerhalb der Plandaten",
    fr: "Cette heure est en dehors des dates du plan",
    es: "Esta hora queda fuera de las fechas del plan",
    it: "Quest'ora è fuori dalle date del piano",
  },
  "Bu gün planın tarihleri dışında": {
    en: "This day is outside the plan's dates",
    de: "Dieser Tag liegt außerhalb der Plandaten",
    fr: "Ce jour est en dehors des dates du plan",
    es: "Este día queda fuera de las fechas del plan",
    it: "Questo giorno è fuori dalle date del piano",
  },
  "Öğe bulunamadı": {
    en: "Item not found",
    de: "Eintrag nicht gefunden",
    fr: "Élément introuvable",
    es: "Elemento no encontrado",
    it: "Elemento non trovato",
  },
  "Bir planda en fazla # öğe olabilir": {
    en: "A plan can have at most # items",
    de: "Ein Plan kann höchstens # Einträge haben",
    fr: "Un plan peut contenir # éléments au maximum",
    es: "Un plan puede tener como máximo # elementos",
    it: "Un piano può avere al massimo # elementi",
  },
  "Harcama bulunamadı": {
    en: "Expense not found",
    de: "Ausgabe nicht gefunden",
    fr: "Dépense introuvable",
    es: "Gasto no encontrado",
    it: "Spesa non trovata",
  },
  "Bu plana daha fazla harcama eklenemez": {
    en: "No more expenses can be added to this plan",
    de: "Zu diesem Plan können keine weiteren Ausgaben hinzugefügt werden",
    fr: "Impossible d'ajouter d'autres dépenses à ce plan",
    es: "No se pueden añadir más gastos a este plan",
    it: "Non si possono aggiungere altre spese a questo piano",
  },
  "Bir şehre en fazla # madde eklenebilir": {
    en: "At most # to-do items can be added to a city",
    de: "Zu einer Stadt können höchstens # Aufgaben hinzugefügt werden",
    fr: "On peut ajouter # tâches au maximum à une ville",
    es: "Se pueden añadir como máximo # tareas a una ciudad",
    it: "A una città si possono aggiungere al massimo # attività",
  },
  "Madde bulunamadı": {
    en: "To-do item not found",
    de: "Aufgabe nicht gefunden",
    fr: "Tâche introuvable",
    es: "Tarea no encontrada",
    it: "Attività non trovata",
  },
  "Geçerli bir saat gir": {
    en: "Enter a valid time",
    de: "Gib eine gültige Uhrzeit ein",
    fr: "Saisis une heure valide",
    es: "Introduce una hora válida",
    it: "Inserisci un'ora valida",
  },
  "Plan için bir başlık yaz": {
    en: "Give the plan a title",
    de: "Gib dem Plan einen Titel",
    fr: "Donne un titre au plan",
    es: "Ponle un título al plan",
    it: "Dai un titolo al piano",
  },
  "Başlık en fazla # karakter olabilir": {
    en: "The title can be at most # characters long",
    de: "Der Titel darf höchstens # Zeichen lang sein",
    fr: "Le titre peut contenir # caractères au maximum",
    es: "El título puede tener como máximo # caracteres",
    it: "Il titolo può avere al massimo # caratteri",
  },
  "Açıklama en fazla # karakter olabilir": {
    en: "The description can be at most # characters long",
    de: "Die Beschreibung darf höchstens # Zeichen lang sein",
    fr: "La description peut contenir # caractères au maximum",
    es: "La descripción puede tener como máximo # caracteres",
    it: "La descrizione può avere al massimo # caratteri",
  },
  "Geçersiz para birimi": {
    en: "Invalid currency",
    de: "Ungültige Währung",
    fr: "Devise invalide",
    es: "Moneda no válida",
    it: "Valuta non valida",
  },
  "Geçersiz görünürlük": {
    en: "Invalid visibility",
    de: "Ungültige Sichtbarkeit",
    fr: "Visibilité invalide",
    es: "Visibilidad no válida",
    it: "Visibilità non valida",
  },
  "Bitiş tarihi başlangıçtan önce olamaz": {
    en: "The end date cannot be before the start date",
    de: "Das Enddatum darf nicht vor dem Startdatum liegen",
    fr: "La date de fin ne peut pas être antérieure à la date de début",
    es: "La fecha de fin no puede ser anterior a la de inicio",
    it: "La data di fine non può essere precedente a quella di inizio",
  },
  "Bir plan en fazla # gün sürebilir": {
    en: "A plan can last at most # days",
    de: "Ein Plan kann höchstens # Tage dauern",
    fr: "Un plan peut durer # jours au maximum",
    es: "Un plan puede durar como máximo # días",
    it: "Un piano può durare al massimo # giorni",
  },
  "Geçerli bir bütçe gir": {
    en: "Enter a valid budget",
    de: "Gib ein gültiges Budget ein",
    fr: "Saisis un budget valide",
    es: "Introduce un presupuesto válido",
    it: "Inserisci un budget valido",
  },
  "Geçersiz tür": {
    en: "Invalid type",
    de: "Ungültiger Typ",
    fr: "Type invalide",
    es: "Tipo no válido",
    it: "Tipo non valido",
  },
  "Bir başlık yaz": {
    en: "Write a title",
    de: "Gib einen Titel ein",
    fr: "Saisis un titre",
    es: "Escribe un título",
    it: "Scrivi un titolo",
  },
  "Not en fazla # karakter olabilir": {
    en: "The note can be at most # characters long",
    de: "Die Notiz darf höchstens # Zeichen lang sein",
    fr: "La note peut contenir # caractères au maximum",
    es: "La nota puede tener como máximo # caracteres",
    it: "La nota può avere al massimo # caratteri",
  },
  "Notlar en fazla # karakter olabilir": {
    en: "The notes can be at most # characters long",
    de: "Die Notizen dürfen höchstens # Zeichen lang sein",
    fr: "Les notes peuvent contenir # caractères au maximum",
    es: "Las notas pueden tener como máximo # caracteres",
    it: "Le note possono avere al massimo # caratteri",
  },
  "Bitiş saati başlangıçtan önce olamaz": {
    en: "The end time cannot be before the start time",
    de: "Die Endzeit darf nicht vor der Startzeit liegen",
    fr: "L'heure de fin ne peut pas être antérieure à l'heure de début",
    es: "La hora de fin no puede ser anterior a la de inicio",
    it: "L'ora di fine non può essere precedente a quella di inizio",
  },
  "Konum eksik": {
    en: "The location is missing",
    de: "Der Ort fehlt",
    fr: "Le lieu est manquant",
    es: "Falta la ubicación",
    it: "Manca la posizione",
  },
  "Varış konumu eksik": {
    en: "The destination is missing",
    de: "Das Ziel fehlt",
    fr: "La destination est manquante",
    es: "Falta el destino",
    it: "Manca la destinazione",
  },
  "Geçerli bir tutar gir": {
    en: "Enter a valid amount",
    de: "Gib einen gültigen Betrag ein",
    fr: "Saisis un montant valide",
    es: "Introduce un importe válido",
    it: "Inserisci un importo valido",
  },
  "Bir şey yaz": {
    en: "Write something",
    de: "Schreibe etwas",
    fr: "Écris quelque chose",
    es: "Escribe algo",
    it: "Scrivi qualcosa",
  },
  "En fazla # karakter olabilir": {
    en: "At most # characters",
    de: "Höchstens # Zeichen",
    fr: "# caractères au maximum",
    es: "Como máximo # caracteres",
    it: "Al massimo # caratteri",
  },
};
