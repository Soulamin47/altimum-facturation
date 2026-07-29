(() => {
  "use strict";

  const STORAGE = {
    draft: "altimum-invoice-draft-v2",
    legacyDraft: "altimum-invoice-draft-v1",
    counter: "altimum-invoice-counter",
    quoteCounter: "altimum-quote-counter",
    clients: "altimum-invoice-clients-v1",
    invoices: "altimum-invoice-history-v1"
  };

  const euro = new Intl.NumberFormat("fr-BE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2
  });
  const dateFormatter = new Intl.DateTimeFormat("fr-BE", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
  const shortDateFormatter = new Intl.DateTimeFormat("fr-BE");
  const monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

  const $ = (selector) => document.querySelector(selector);
  const elements = {
    itemsBody: $("#itemsBody"),
    itemTemplate: $("#lineItemTemplate"),
    addLine: $("#addLine"),
    addLineLabel: $("#addLineLabel"),
    newInvoice: $("#newInvoice"),
    saveInvoice: $("#saveInvoice"),
    emailInvoice: $("#emailInvoice"),
    printInvoice: $("#printInvoice"),
    invoice: $("#invoice"),
    saveClient: $("#saveClient"),
    savedClientSelect: $("#savedClientSelect"),
    saveStatus: $("#saveStatus"),
    documentType: $("#documentType"),
    settingsTitle: $("#settingsTitle"),
    settingsDescription: $("#settingsDescription"),
    documentKicker: $("#documentKicker"),
    documentTitle: $("#documentTitle"),
    documentNumberLabel: $("#documentNumberLabel"),
    documentFooter: $("#documentFooter"),
    clientBlockLabel: $("#clientBlockLabel"),
    dateLabel: $("#dateLabel"),
    dueDateLabel: $("#dueDateLabel"),
    descriptionColumnLabel: $("#descriptionColumnLabel"),
    priceColumnLabel: $("#priceColumnLabel"),
    totalColumnLabel: $("#totalColumnLabel"),
    invoiceNumber: $("#invoiceNumber"),
    invoiceNumberDisplay: $("#invoiceNumberDisplay"),
    invoiceDate: $("#invoiceDate"),
    invoiceDateDisplay: $("#invoiceDateDisplay"),
    paymentDays: $("#paymentDays"),
    dueDateDisplay: $("#dueDateDisplay"),
    discountRate: $("#discountRate"),
    vatRate: $("#vatRate"),
    clientName: $("#clientName"),
    clientAddress: $("#clientAddress"),
    clientVat: $("#clientVat"),
    clientEmail: $("#clientEmail"),
    invoiceNotes: $("#invoiceNotes"),
    quoteIssuer: $("#quoteIssuer"),
    quoteValidityDays: $("#quoteValidityDays"),
    quoteDuration: $("#quoteDuration"),
    quoteSubject: $("#quoteSubject"),
    quoteIntro: $("#quoteIntro"),
    quoteIntroduction: $("#quoteIntroduction"),
    quoteSectionHeading: $("#quoteSectionHeading"),
    quoteIssuerDisplay: $("#quoteIssuerDisplay"),
    quoteValidityDisplay: $("#quoteValidityDisplay"),
    quoteDurationDisplay: $("#quoteDurationDisplay"),
    quoteSubjectDisplay: $("#quoteSubjectDisplay"),
    quoteIntroDisplay: $("#quoteIntroDisplay"),
    subtotalAmount: $("#subtotalAmount"),
    discountRow: $("#discountRow"),
    discountLabel: $("#discountLabel"),
    discountAmount: $("#discountAmount"),
    vatLabel: $("#vatLabel"),
    vatAmount: $("#vatAmount"),
    grandTotal: $("#grandTotal"),
    clientCountBadge: $("#clientCountBadge"),
    invoiceCountBadge: $("#invoiceCountBadge"),
    clientSearch: $("#clientSearch"),
    clientGrid: $("#clientGrid"),
    clientsEmpty: $("#clientsEmpty"),
    addClientFromView: $("#addClientFromView"),
    historySearch: $("#historySearch"),
    historyBody: $("#historyBody"),
    historyEmpty: $("#historyEmpty"),
    historyTableWrap: $("#historyTableWrap"),
    exportExcel: $("#exportExcel"),
    exportExcelStats: $("#exportExcelStats"),
    statRevenue: $("#statRevenue"),
    statRevenueSub: $("#statRevenueSub"),
    statPaidCount: $("#statPaidCount"),
    statPaidAmount: $("#statPaidAmount"),
    statPendingCount: $("#statPendingCount"),
    statPendingAmount: $("#statPendingAmount"),
    statOverdueCount: $("#statOverdueCount"),
    statOverdueAmount: $("#statOverdueAmount"),
    statQuoteCount: $("#statQuoteCount"),
    statQuoteAmount: $("#statQuoteAmount"),
    chartYear: $("#chartYear"),
    monthlyChart: $("#monthlyChart"),
    paymentSummary: $("#paymentSummary"),
    topClients: $("#topClients")
  };

  let clients = readCollection(STORAGE.clients);
  let invoices = readCollection(STORAGE.invoices);
  let currentInvoiceId = null;
  let currentClientId = null;
  let saveTimer;
  let statusTimer;

  function readCollection(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function writeCollection(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function makeId(prefix) {
    if (window.crypto?.randomUUID) return `${prefix}-${window.crypto.randomUUID()}`;
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function escapeHtml(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeXml(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&apos;");
  }

  function toNumber(value) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }

  function toIsoDate(date) {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  function parseIsoDate(value) {
    if (!value) return null;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function getDueDate(invoiceDate = elements.invoiceDate.value, paymentDays = elements.paymentDays.value) {
    const date = parseIsoDate(invoiceDate);
    if (!date) return "";
    date.setDate(date.getDate() + toNumber(paymentDays));
    return toIsoDate(date);
  }

  function generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const counter = Math.max(1, Number.parseInt(localStorage.getItem(STORAGE.counter), 10) || 1);
    return `FAC-${year}-${String(counter).padStart(3, "0")}`;
  }

  function generateQuoteNumber() {
    const now = new Date();
    const counter = Math.max(1, Number.parseInt(localStorage.getItem(STORAGE.quoteCounter), 10) || 1);
    return `ALT-${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(counter).padStart(3, "0")}`;
  }

  function announce(message, duration = 1800) {
    elements.saveStatus.textContent = message;
    window.clearTimeout(statusTimer);
    statusTimer = window.setTimeout(() => {
      elements.saveStatus.textContent = "Sauvegarde automatique";
    }, duration);
  }

  function createLine(item = {}) {
    const fragment = elements.itemTemplate.content.cloneNode(true);
    const row = fragment.querySelector(".line-item");
    row.querySelector(".item-description").value = item.description || "";
    row.querySelector(".item-details").value = item.details || "";
    row.querySelector(".item-quantity").value = item.quantity ?? 1;
    row.querySelector(".item-price").value = item.price ?? 0;

    row.addEventListener("input", () => {
      calculate();
      scheduleDraftSave();
    });
    row.querySelector(".remove-line").addEventListener("click", () => {
      row.remove();
      if (!elements.itemsBody.children.length) createLine();
      calculate();
      scheduleDraftSave();
    });

    elements.itemsBody.appendChild(fragment);
    calculate();
  }

  function getItems() {
    return [...elements.itemsBody.querySelectorAll(".line-item")].map((row) => ({
      description: row.querySelector(".item-description").value.trim(),
      details: row.querySelector(".item-details").value.trim(),
      quantity: toNumber(row.querySelector(".item-quantity").value),
      price: toNumber(row.querySelector(".item-price").value)
    }));
  }

  function getTotals(state = null) {
    const items = state?.items || getItems();
    const subtotal = items.reduce((sum, item) => sum + toNumber(item.quantity) * toNumber(item.price), 0);
    const discountRate = Math.min(100, toNumber(state?.discountRate ?? elements.discountRate.value));
    const discountAmount = subtotal * (discountRate / 100);
    const taxableAmount = subtotal - discountAmount;
    const vatRate = toNumber(state?.vatRate ?? elements.vatRate.value);
    const vatAmount = taxableAmount * (vatRate / 100);
    return {
      subtotal,
      discountAmount,
      taxableAmount,
      vatAmount,
      grandTotal: taxableAmount + vatAmount
    };
  }

  function calculate() {
    elements.itemsBody.querySelectorAll(".line-item").forEach((row) => {
      const total = toNumber(row.querySelector(".item-quantity").value) *
        toNumber(row.querySelector(".item-price").value);
      row.querySelector(".item-total").textContent = euro.format(total);
    });

    const totals = getTotals();
    const discountRate = Math.min(100, toNumber(elements.discountRate.value));
    const vatRate = toNumber(elements.vatRate.value);
    elements.subtotalAmount.textContent = euro.format(totals.subtotal);
    elements.discountRow.hidden = discountRate <= 0;
    elements.discountLabel.textContent = `Remise ${discountRate.toLocaleString("fr-BE")} %`;
    elements.discountAmount.textContent = `− ${euro.format(totals.discountAmount)}`;
    elements.vatLabel.textContent = `TVA ${vatRate.toLocaleString("fr-BE")} %`;
    elements.vatAmount.textContent = euro.format(totals.vatAmount);
    elements.grandTotal.textContent = euro.format(totals.grandTotal);
    return totals;
  }

  function updateDocumentMeta() {
    const number = elements.invoiceNumber.value.trim() || "Sans numéro";
    const isQuote = elements.documentType.value === "quote";
    elements.invoice.classList.toggle("is-quote", isQuote);
    document.querySelectorAll(".quote-only-setting").forEach((element) => {
      element.hidden = !isQuote;
    });
    document.querySelectorAll(".invoice-only-setting").forEach((element) => {
      element.hidden = isQuote;
    });
    elements.quoteIntroduction.hidden = !isQuote;
    elements.quoteSectionHeading.hidden = !isQuote;
    elements.documentTitle.textContent = isQuote ? "Offre" : "Facture";
    elements.documentKicker.textContent = isQuote ? "Proposition commerciale" : "Document commercial";
    elements.documentNumberLabel.textContent = isQuote ? "Référence de l’offre" : "Numéro de facture";
    elements.settingsTitle.textContent = isQuote ? "Préparer l’offre" : "Préparer la facture";
    elements.settingsDescription.textContent = isQuote
      ? "Présentez les postes, les détails des travaux et les montants de votre proposition."
      : "Remplissez les champs et ajoutez vos prestations. Les montants se calculent automatiquement.";
    elements.newInvoice.textContent = isQuote ? "Nouvelle offre" : "Nouvelle facture";
    elements.clientBlockLabel.textContent = isQuote ? "À l’attention de" : "Facturé à";
    elements.dateLabel.textContent = isQuote ? "Date de l’offre" : "Date d’émission";
    elements.dueDateLabel.textContent = isQuote ? "Valable jusqu’au" : "Date d’échéance";
    elements.descriptionColumnLabel.textContent = isQuote ? "Poste" : "Produit / prestation";
    elements.priceColumnLabel.textContent = isQuote ? "Montant HTVA" : "Prix unit. HT";
    elements.totalColumnLabel.textContent = "Total HT";
    elements.addLineLabel.textContent = isQuote ? "Ajouter un poste à l’offre" : "Ajouter un produit ou une prestation";
    elements.documentFooter.innerHTML = isQuote
      ? "<strong>Merci pour votre confiance.</strong><br>Cette offre reste soumise à votre acceptation et aux conditions convenues avec Altimum SRL."
      : "<strong>Merci pour votre confiance.</strong><br>Tout paiement est à effectuer selon les modalités convenues avec Altimum SRL.";
    elements.invoiceNumberDisplay.textContent = number;
    document.title = `${isQuote ? "Offre" : "Facture"} ${number} — Altimum`;

    const date = parseIsoDate(elements.invoiceDate.value);
    const dueDate = parseIsoDate(getDueDate(
      elements.invoiceDate.value,
      isQuote ? elements.quoteValidityDays.value : elements.paymentDays.value
    ));
    elements.invoiceDateDisplay.textContent = date ? dateFormatter.format(date) : "—";
    elements.dueDateDisplay.textContent = dueDate ? dateFormatter.format(dueDate) : "—";
    elements.quoteIssuerDisplay.textContent = elements.quoteIssuer.value.trim() || "Alma Angel";
    elements.quoteValidityDisplay.textContent = `${elements.quoteValidityDays.value || 30} jours`;
    elements.quoteDurationDisplay.textContent = elements.quoteDuration.value.trim() || "À convenir";
    elements.quoteSubjectDisplay.textContent = elements.quoteSubject.value.trim() || "Votre demande de travaux";
    elements.quoteIntroDisplay.textContent = elements.quoteIntro.value.trim() ||
      "Suite à votre demande et à l’analyse réalisée, nous vous remettons notre meilleure offre pour l’exécution des travaux décrits ci-dessous.";
  }

  function getState() {
    return {
      id: currentInvoiceId,
      clientId: currentClientId,
      documentType: elements.documentType.value,
      invoiceNumber: elements.invoiceNumber.value.trim(),
      invoiceDate: elements.invoiceDate.value,
      dueDate: getDueDate(
        elements.invoiceDate.value,
        elements.documentType.value === "quote" ? elements.quoteValidityDays.value : elements.paymentDays.value
      ),
      paymentDays: elements.paymentDays.value,
      discountRate: elements.discountRate.value,
      vatRate: elements.vatRate.value,
      clientName: elements.clientName.value.trim(),
      clientAddress: elements.clientAddress.value.trim(),
      clientVat: elements.clientVat.value.trim(),
      clientEmail: elements.clientEmail.value.trim(),
      invoiceNotes: elements.invoiceNotes.value.trim(),
      quoteIssuer: elements.quoteIssuer.value.trim(),
      quoteValidityDays: elements.quoteValidityDays.value,
      quoteDuration: elements.quoteDuration.value.trim(),
      quoteSubject: elements.quoteSubject.value.trim(),
      quoteIntro: elements.quoteIntro.value.trim(),
      items: getItems()
    };
  }

  function saveDraft(message) {
    try {
      localStorage.setItem(STORAGE.draft, JSON.stringify(getState()));
      if (message) announce(message);
    } catch {
      elements.saveStatus.textContent = "Sauvegarde indisponible";
    }
  }

  function scheduleDraftSave() {
    window.clearTimeout(saveTimer);
    elements.saveStatus.textContent = "Modification…";
    saveTimer = window.setTimeout(() => {
      saveDraft();
      announce("Brouillon sauvegardé");
    }, 600);
  }

  function applyState(state = {}) {
    currentInvoiceId = state.id || null;
    currentClientId = state.clientId || null;
    elements.documentType.value = state.documentType || "invoice";
    elements.invoiceNumber.value = state.invoiceNumber ||
      (elements.documentType.value === "quote" ? generateQuoteNumber() : generateInvoiceNumber());
    elements.invoiceDate.value = state.invoiceDate || toIsoDate(new Date());
    elements.paymentDays.value = state.paymentDays ?? "30";
    elements.discountRate.value = state.discountRate ?? "0";
    elements.vatRate.value = state.vatRate ?? "21";
    elements.clientName.value = state.clientName || "";
    elements.clientAddress.value = state.clientAddress || "";
    elements.clientVat.value = state.clientVat || "";
    elements.clientEmail.value = state.clientEmail || "";
    elements.invoiceNotes.value = state.invoiceNotes || "";
    elements.quoteIssuer.value = state.quoteIssuer || "Alma Angel";
    elements.quoteValidityDays.value = state.quoteValidityDays || "30";
    elements.quoteDuration.value = state.quoteDuration || "3 semaines";
    elements.quoteSubject.value = state.quoteSubject || "";
    elements.quoteIntro.value = state.quoteIntro || "";
    elements.savedClientSelect.value = currentClientId || "";
    elements.itemsBody.textContent = "";
    (state.items?.length ? state.items : [{ quantity: 1, price: 0 }]).forEach(createLine);
    updateDocumentMeta();
    calculate();
  }

  function loadDraft() {
    try {
      const draft = JSON.parse(localStorage.getItem(STORAGE.draft) || localStorage.getItem(STORAGE.legacyDraft));
      applyState(draft || {});
      if (draft) announce("Brouillon restauré");
    } catch {
      applyState({});
    }
  }

  function startNewDocument(mode = "invoice", force = false) {
    const hasContent = getItems().some((item) => item.description || item.price) || elements.clientName.value;
    const documentName = mode === "quote" ? "offre" : "facture";
    if (!force && hasContent && !window.confirm(`Créer une nouvelle ${documentName} et remplacer le brouillon actuel ?`)) return false;

    const counterKey = mode === "quote" ? STORAGE.quoteCounter : STORAGE.counter;
    const currentNumber = Number.parseInt(localStorage.getItem(counterKey), 10) || 1;
    const nextNumber = currentNumber + 1;
    localStorage.setItem(counterKey, String(nextNumber));
    localStorage.removeItem(STORAGE.draft);
    const now = new Date();
    const number = mode === "quote"
      ? `ALT-${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(nextNumber).padStart(3, "0")}`
      : `FAC-${now.getFullYear()}-${String(nextNumber).padStart(3, "0")}`;
    applyState({
      documentType: mode,
      invoiceNumber: number,
      invoiceDate: toIsoDate(now),
      paymentDays: "30",
      quoteValidityDays: "30",
      quoteIssuer: "Alma Angel",
      quoteDuration: "3 semaines",
      vatRate: "21",
      items: [{ quantity: 1, price: 0 }]
    });
    saveDraft(`Nouvelle ${documentName} créée`);
    showView("invoiceView");
    elements.clientName.focus();
    return true;
  }

  function startNewInvoice(force = false) {
    startNewDocument("invoice", force);
  }

  function saveCurrentClient({ silent = false } = {}) {
    const client = {
      id: currentClientId || makeId("client"),
      name: elements.clientName.value.trim(),
      address: elements.clientAddress.value.trim(),
      vat: elements.clientVat.value.trim(),
      email: elements.clientEmail.value.trim(),
      updatedAt: new Date().toISOString()
    };

    if (!client.name) {
      if (!silent) window.alert("Indiquez d’abord le nom du client.");
      return null;
    }

    const existingIndex = clients.findIndex((item) =>
      item.id === client.id ||
      (!currentClientId && item.name.toLocaleLowerCase("fr") === client.name.toLocaleLowerCase("fr"))
    );
    if (existingIndex >= 0) {
      client.id = clients[existingIndex].id;
      clients[existingIndex] = client;
    } else {
      clients.unshift(client);
    }

    currentClientId = client.id;
    writeCollection(STORAGE.clients, clients);
    refreshClientInterface();
    elements.savedClientSelect.value = client.id;
    saveDraft();
    if (!silent) announce("Client enregistré");
    return client;
  }

  function selectClient(id) {
    const client = clients.find((item) => item.id === id);
    if (!client) return;
    currentClientId = client.id;
    elements.clientName.value = client.name;
    elements.clientAddress.value = client.address || "";
    elements.clientVat.value = client.vat || "";
    elements.clientEmail.value = client.email || "";
    elements.savedClientSelect.value = id;
    saveDraft("Client sélectionné");
  }

  function deleteClient(id) {
    const client = clients.find((item) => item.id === id);
    if (!client || !window.confirm(`Supprimer le client « ${client.name} » ?`)) return;
    clients = clients.filter((item) => item.id !== id);
    if (currentClientId === id) currentClientId = null;
    writeCollection(STORAGE.clients, clients);
    refreshClientInterface();
  }

  function refreshClientInterface() {
    elements.clientCountBadge.textContent = clients.length;
    elements.savedClientSelect.innerHTML = '<option value="">Choisir un client…</option>' +
      clients
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, "fr"))
        .map((client) => `<option value="${escapeHtml(client.id)}">${escapeHtml(client.name)}</option>`)
        .join("");
    if (currentClientId) elements.savedClientSelect.value = currentClientId;
    renderClients();
  }

  function renderClients() {
    const query = elements.clientSearch.value.trim().toLocaleLowerCase("fr");
    const filtered = clients.filter((client) =>
      [client.name, client.email, client.vat, client.address].join(" ").toLocaleLowerCase("fr").includes(query)
    );
    elements.clientsEmpty.hidden = clients.length > 0;
    elements.clientGrid.hidden = clients.length === 0;
    elements.clientGrid.innerHTML = filtered.map((client) => `
      <article class="client-card">
        <div class="client-card__initial">${escapeHtml(client.name.charAt(0).toUpperCase())}</div>
        <h3>${escapeHtml(client.name)}</h3>
        ${client.address ? `<p>${escapeHtml(client.address)}</p>` : ""}
        ${client.email ? `<p>${escapeHtml(client.email)}</p>` : ""}
        ${client.vat ? `<p>TVA : ${escapeHtml(client.vat)}</p>` : ""}
        <div class="card-actions">
          <button type="button" class="mini-button" data-client-action="invoice" data-client-id="${escapeHtml(client.id)}">Créer une facture</button>
          <button type="button" class="mini-button" data-client-action="edit" data-client-id="${escapeHtml(client.id)}">Modifier</button>
          <button type="button" class="mini-button mini-button--danger" data-client-action="delete" data-client-id="${escapeHtml(client.id)}">Supprimer</button>
        </div>
      </article>
    `).join("");
  }

  function saveInvoiceToHistory({ silent = false } = {}) {
    const state = getState();
    const documentName = state.documentType === "quote" ? "l’offre" : "la facture";
    if (!state.clientName) {
      if (!silent) window.alert(`Indiquez le nom du client avant d’enregistrer ${documentName}.`);
      return null;
    }
    if (!state.invoiceNumber) {
      if (!silent) window.alert(`Indiquez une référence pour ${documentName}.`);
      return null;
    }

    const client = saveCurrentClient({ silent: true });
    state.clientId = client?.id || currentClientId;
    state.id = currentInvoiceId || makeId("invoice");
    const previousDocument = invoices.find((invoice) => invoice.id === state.id);
    state.status = previousDocument?.documentType === state.documentType
      ? previousDocument.status
      : (state.documentType === "quote" ? "sent" : "unpaid");
    state.createdAt = previousDocument?.createdAt || new Date().toISOString();
    state.updatedAt = new Date().toISOString();
    state.totals = getTotals(state);

    const sameNumber = invoices.find((invoice) => invoice.invoiceNumber === state.invoiceNumber && invoice.id !== state.id);
    if (sameNumber && !silent && !window.confirm(`Le document ${state.invoiceNumber} existe déjà. Le remplacer ?`)) return null;
    if (sameNumber) invoices = invoices.filter((invoice) => invoice.id !== sameNumber.id);

    const index = invoices.findIndex((invoice) => invoice.id === state.id);
    if (index >= 0) invoices[index] = state;
    else invoices.unshift(state);

    currentInvoiceId = state.id;
    writeCollection(STORAGE.invoices, invoices);
    saveDraft();
    refreshHistoryInterface();
    renderStats();
    if (!silent) announce(`${state.documentType === "quote" ? "Offre" : "Facture"} enregistrée dans l’historique`);
    return state;
  }

  function openInvoice(id) {
    const invoice = invoices.find((item) => item.id === id);
    if (!invoice) return;
    applyState(invoice);
    saveDraft(`${invoice.documentType === "quote" ? "Offre" : "Facture"} ouverte`);
    showView("invoiceView");
  }

  function deleteInvoice(id) {
    const invoice = invoices.find((item) => item.id === id);
    if (!invoice || !window.confirm(`Supprimer définitivement le document ${invoice.invoiceNumber} de l’historique ?`)) return;
    invoices = invoices.filter((item) => item.id !== id);
    if (currentInvoiceId === id) currentInvoiceId = null;
    writeCollection(STORAGE.invoices, invoices);
    refreshHistoryInterface();
    renderStats();
  }

  function updateInvoiceStatus(id, status) {
    const invoice = invoices.find((item) => item.id === id);
    if (!invoice) return;
    invoice.status = status;
    invoice.updatedAt = new Date().toISOString();
    writeCollection(STORAGE.invoices, invoices);
    renderHistory();
    renderStats();
  }

  function displayStatus(invoice) {
    if (invoice.documentType === "quote") return invoice.status || "sent";
    if (invoice.status === "paid") return "paid";
    if (invoice.status === "cancelled") return "cancelled";
    const due = parseIsoDate(invoice.dueDate);
    return due && due < new Date(new Date().setHours(0, 0, 0, 0)) ? "overdue" : "unpaid";
  }

  function refreshHistoryInterface() {
    elements.invoiceCountBadge.textContent = invoices.length;
    renderHistory();
  }

  function renderHistory() {
    const query = elements.historySearch.value.trim().toLocaleLowerCase("fr");
    const filtered = invoices
      .slice()
      .sort((a, b) => (b.invoiceDate || "").localeCompare(a.invoiceDate || ""))
      .filter((invoice) =>
        [invoice.invoiceNumber, invoice.clientName, invoice.clientEmail].join(" ").toLocaleLowerCase("fr").includes(query)
      );

    elements.historyEmpty.hidden = invoices.length > 0;
    elements.historyTableWrap.hidden = invoices.length === 0;
    elements.historyBody.innerHTML = filtered.map((invoice) => {
      const totals = invoice.totals || getTotals(invoice);
      const display = displayStatus(invoice);
      const date = parseIsoDate(invoice.invoiceDate);
      const due = parseIsoDate(invoice.dueDate || getDueDate(invoice.invoiceDate, invoice.paymentDays));
      const isQuote = invoice.documentType === "quote";
      const statusOptions = isQuote
        ? `
          <option value="sent" ${invoice.status === "sent" ? "selected" : ""}>Envoyé</option>
          <option value="accepted" ${invoice.status === "accepted" ? "selected" : ""}>Accepté</option>
          <option value="refused" ${invoice.status === "refused" ? "selected" : ""}>Refusé</option>
        `
        : `
          <option value="unpaid" ${invoice.status === "unpaid" ? "selected" : ""}>${display === "overdue" ? "En retard" : "À payer"}</option>
          <option value="paid" ${invoice.status === "paid" ? "selected" : ""}>Payée</option>
          <option value="cancelled" ${invoice.status === "cancelled" ? "selected" : ""}>Annulée</option>
        `;
      return `
        <tr>
          <td><strong>${escapeHtml(invoice.invoiceNumber)}</strong><br><small>${isQuote ? "Offre" : "Facture"}</small></td>
          <td>${escapeHtml(invoice.clientName)}</td>
          <td>${date ? shortDateFormatter.format(date) : "—"}</td>
          <td>${due ? shortDateFormatter.format(due) : "—"}</td>
          <td>${euro.format(totals.grandTotal)}</td>
          <td>
            <select class="status-select" data-status-id="${escapeHtml(invoice.id)}" aria-label="Statut de ${escapeHtml(invoice.invoiceNumber)}">
              ${statusOptions}
            </select>
          </td>
          <td>
            <div class="table-actions">
              <button type="button" class="mini-button" data-invoice-action="open" data-invoice-id="${escapeHtml(invoice.id)}">Ouvrir</button>
              <button type="button" class="mini-button" data-invoice-action="email" data-invoice-id="${escapeHtml(invoice.id)}">Email</button>
              <button type="button" class="mini-button mini-button--danger" data-invoice-action="delete" data-invoice-id="${escapeHtml(invoice.id)}">Supprimer</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  function emailInvoice(invoice = null) {
    const state = invoice || saveInvoiceToHistory({ silent: true });
    if (!state) {
      window.alert("Complétez au minimum le nom du client et le numéro de facture avant l’envoi.");
      return;
    }
    if (!state.clientEmail) {
      window.alert("Ajoutez l’adresse email du client avant l’envoi.");
      return;
    }
    const totals = state.totals || getTotals(state);
    const isQuote = state.documentType === "quote";
    const subject = `${isQuote ? "Offre" : "Facture"} ${state.invoiceNumber} — Altimum`;
    const body = [
      `Bonjour ${state.clientName},`,
      "",
      `Veuillez trouver ${isQuote ? "l’offre" : "la facture"} ${state.invoiceNumber}, d’un montant total de ${euro.format(totals.grandTotal)}.`,
      ...(isQuote ? [] : [`Date d’échéance : ${state.dueDate ? dateFormatter.format(parseIsoDate(state.dueDate)) : "selon les conditions convenues"}.`]),
      "",
      `Merci d’ajouter le PDF ${isQuote ? "de l’offre" : "de la facture"} en pièce jointe avant l’envoi.`,
      "",
      "Bien à vous,",
      "Altimum Projects & Solutions",
      "+32 486 27 40 24 · info@altimum.be"
    ].join("\n");
    window.location.href = `mailto:${encodeURIComponent(state.clientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function renderStats() {
    const activeInvoices = invoices.filter((invoice) =>
      invoice.documentType !== "quote" && invoice.status !== "cancelled"
    );
    const quotes = invoices.filter((invoice) => invoice.documentType === "quote");
    const paidInvoices = activeInvoices.filter((invoice) => invoice.status === "paid");
    const overdueInvoices = activeInvoices.filter((invoice) => displayStatus(invoice) === "overdue");
    const unpaidInvoices = activeInvoices.filter((invoice) =>
      invoice.status !== "paid" && displayStatus(invoice) !== "overdue"
    );
    const now = new Date();
    const monthInvoices = activeInvoices.filter((invoice) => {
      const date = parseIsoDate(invoice.invoiceDate);
      return date && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    });
    const sumTotal = (collection) => collection.reduce(
      (sum, invoice) => sum + (invoice.totals || getTotals(invoice)).grandTotal,
      0
    );
    const monthRevenue = sumTotal(monthInvoices);
    const paidTotal = sumTotal(paidInvoices);
    const unpaidTotal = sumTotal(unpaidInvoices);
    const overdueTotal = sumTotal(overdueInvoices);
    const sentQuotes = quotes;
    const quoteTotal = sumTotal(sentQuotes);

    elements.statRevenue.textContent = euro.format(monthRevenue);
    elements.statRevenueSub.textContent = `${monthInvoices.length} facture${monthInvoices.length > 1 ? "s" : ""} ce mois-ci`;
    elements.statPaidCount.textContent = paidInvoices.length;
    elements.statPaidAmount.textContent = `${euro.format(paidTotal)} encaissé`;
    elements.statPendingCount.textContent = unpaidInvoices.length;
    elements.statPendingAmount.textContent = `${euro.format(unpaidTotal)} à recevoir`;
    elements.statOverdueCount.textContent = overdueInvoices.length;
    elements.statOverdueAmount.textContent = `${euro.format(overdueTotal)} en retard`;
    elements.statQuoteCount.textContent = sentQuotes.length;
    elements.statQuoteAmount.textContent = `${euro.format(quoteTotal)} proposés`;

    const year = new Date().getFullYear();
    elements.chartYear.textContent = year;
    const months = Array(12).fill(0);
    activeInvoices.forEach((invoice) => {
      const date = parseIsoDate(invoice.invoiceDate);
      if (date?.getFullYear() === year) months[date.getMonth()] += (invoice.totals || getTotals(invoice)).grandTotal;
    });
    const max = Math.max(...months, 1);
    elements.monthlyChart.innerHTML = months.map((amount, index) => `
      <div class="chart-column" title="${monthNames[index]} : ${euro.format(amount)}">
        <div class="chart-bar-wrap">
          <div class="chart-bar" style="height:${Math.max(2, (amount / max) * 100)}%"></div>
        </div>
        <span>${monthNames[index]}</span>
      </div>
    `).join("");

    const maxStatusCount = Math.max(paidInvoices.length, unpaidInvoices.length, overdueInvoices.length, 1);
    elements.paymentSummary.innerHTML = `
      <div class="summary-row"><span>Payées</span><div class="status-track"><div class="status-fill" style="width:${(paidInvoices.length / maxStatusCount) * 100}%"></div></div><strong>${paidInvoices.length}</strong></div>
      <div class="summary-row"><span>En attente</span><div class="status-track"><div class="status-fill status-fill--pending" style="width:${(unpaidInvoices.length / maxStatusCount) * 100}%"></div></div><strong>${unpaidInvoices.length}</strong></div>
      <div class="summary-row"><span>En retard</span><div class="status-track"><div class="status-fill status-fill--overdue" style="width:${(overdueInvoices.length / maxStatusCount) * 100}%"></div></div><strong>${overdueInvoices.length}</strong></div>
    `;

    const clientTotals = new Map();
    activeInvoices.forEach((invoice) => {
      const name = invoice.clientName || "Client non renseigné";
      clientTotals.set(name, (clientTotals.get(name) || 0) + (invoice.totals || getTotals(invoice)).grandTotal);
    });
    const top = [...clientTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    elements.topClients.innerHTML = top.length
      ? top.map(([name, amount], index) => `
          <div class="summary-row"><span>${index + 1}. ${escapeHtml(name)}</span><strong>${euro.format(amount)}</strong></div>
        `).join("")
      : '<div class="summary-row"><span>Aucune donnée disponible</span><strong>—</strong></div>';
  }

  function excelCell(value, type = "String", style = "") {
    return `<Cell${style ? ` ss:StyleID="${style}"` : ""}><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`;
  }

  function exportToExcel() {
    if (!invoices.length) {
      window.alert("Enregistrez au moins une facture avant l’export Excel.");
      return;
    }

    const invoiceRows = invoices.map((invoice) => {
      const totals = invoice.totals || getTotals(invoice);
      const statusLabels = {
        paid: "Payée",
        unpaid: displayStatus(invoice) === "overdue" ? "En retard" : "À payer",
        cancelled: "Annulée",
        sent: "Envoyé",
        accepted: "Accepté",
        refused: "Refusé"
      };
      return `<Row>
        ${excelCell(invoice.documentType === "quote" ? "Offre" : "Facture")}
        ${excelCell(invoice.invoiceNumber)}
        ${excelCell(invoice.invoiceDate)}
        ${excelCell(invoice.dueDate || getDueDate(invoice.invoiceDate, invoice.paymentDays))}
        ${excelCell(invoice.clientName)}
        ${excelCell(invoice.clientEmail || "")}
        ${excelCell(invoice.clientVat || "")}
        ${excelCell(totals.subtotal, "Number")}
        ${excelCell(totals.discountAmount, "Number")}
        ${excelCell(totals.taxableAmount, "Number")}
        ${excelCell(totals.vatAmount, "Number")}
        ${excelCell(totals.grandTotal, "Number")}
        ${excelCell(statusLabels[invoice.status] || "À payer")}
      </Row>`;
    }).join("");

    const itemRows = invoices.flatMap((invoice) =>
      invoice.items.map((item) => `<Row>
        ${excelCell(invoice.documentType === "quote" ? "Offre" : "Facture")}
        ${excelCell(invoice.invoiceNumber)}
        ${excelCell(invoice.clientName)}
        ${excelCell(item.description)}
        ${excelCell(item.details || "")}
        ${excelCell(item.quantity, "Number")}
        ${excelCell(item.price, "Number")}
        ${excelCell(item.quantity * item.price, "Number")}
      </Row>`)
    ).join("");

    const clientRows = clients.map((client) => `<Row>
      ${excelCell(client.name)}
      ${excelCell(client.address || "")}
      ${excelCell(client.email || "")}
      ${excelCell(client.vat || "")}
    </Row>`).join("");

    const activeInvoices = invoices.filter((invoice) =>
      invoice.documentType !== "quote" && invoice.status !== "cancelled"
    );
    const revenue = activeInvoices.reduce((sum, invoice) => sum + (invoice.totals || getTotals(invoice)).grandTotal, 0);
    const netTotal = activeInvoices.reduce((sum, invoice) => sum + (invoice.totals || getTotals(invoice)).taxableAmount, 0);
    const vatTotal = activeInvoices.reduce((sum, invoice) => sum + (invoice.totals || getTotals(invoice)).vatAmount, 0);

    const workbook = `<?xml version="1.0"?>
      <?mso-application progid="Excel.Sheet"?>
      <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
        xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
        <Styles>
          <Style ss:ID="Header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#8B1538" ss:Pattern="Solid"/></Style>
        </Styles>
        <Worksheet ss:Name="Résumé"><Table>
          <Row>${excelCell("Indicateur", "String", "Header")}${excelCell("Valeur", "String", "Header")}</Row>
          <Row>${excelCell("Nombre de factures")}${excelCell(activeInvoices.length, "Number")}</Row>
          <Row>${excelCell("Chiffre d’affaires TTC")}${excelCell(revenue, "Number")}</Row>
          <Row>${excelCell("Total HT")}${excelCell(netTotal, "Number")}</Row>
          <Row>${excelCell("TVA facturée")}${excelCell(vatTotal, "Number")}</Row>
          <Row>${excelCell("Facture moyenne")}${excelCell(activeInvoices.length ? revenue / activeInvoices.length : 0, "Number")}</Row>
        </Table></Worksheet>
        <Worksheet ss:Name="Documents"><Table>
          <Row>${["Type", "N° document", "Date", "Échéance", "Client", "Email", "N° TVA", "Sous-total HT", "Remise", "Total HT", "TVA", "Total TTC", "Statut"].map((name) => excelCell(name, "String", "Header")).join("")}</Row>
          ${invoiceRows}
        </Table></Worksheet>
        <Worksheet ss:Name="Lignes"><Table>
          <Row>${["Type", "N° document", "Client", "Poste / prestation", "Description détaillée", "Quantité", "Prix unitaire HT", "Total HT"].map((name) => excelCell(name, "String", "Header")).join("")}</Row>
          ${itemRows}
        </Table></Worksheet>
        <Worksheet ss:Name="Clients"><Table>
          <Row>${["Client", "Adresse", "Email", "N° TVA"].map((name) => excelCell(name, "String", "Header")).join("")}</Row>
          ${clientRows}
        </Table></Worksheet>
      </Workbook>`;

    const blob = new Blob(["\ufeff", workbook], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `altimum-factures-${toIsoDate(new Date())}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    announce("Export Excel téléchargé");
  }

  function showView(viewId) {
    document.querySelectorAll(".app-view").forEach((view) => {
      const active = view.id === viewId;
      view.hidden = !active;
      view.classList.toggle("is-active", active);
    });
    document.querySelectorAll(".nav-tab").forEach((tab) => {
      const matchesView = tab.dataset.view === viewId;
      const matchesMode = !tab.dataset.documentMode || tab.dataset.documentMode === elements.documentType.value;
      tab.classList.toggle("is-active", matchesView && matchesMode);
    });
    if (viewId === "clientsView") renderClients();
    if (viewId === "historyView") renderHistory();
    if (viewId === "statsView") renderStats();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.querySelectorAll(".nav-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const mode = tab.dataset.documentMode;
      if (mode && mode !== elements.documentType.value) {
        startNewDocument(mode);
        return;
      }
      showView(tab.dataset.view);
    });
  });

  elements.addLine.addEventListener("click", () => {
    createLine();
    elements.itemsBody.lastElementChild.querySelector(".item-description").focus();
    scheduleDraftSave();
  });
  elements.newInvoice.addEventListener("click", () => startNewDocument(elements.documentType.value));
  elements.saveInvoice.addEventListener("click", () => saveInvoiceToHistory());
  elements.saveClient.addEventListener("click", () => saveCurrentClient());
  elements.emailInvoice.addEventListener("click", () => emailInvoice());
  elements.printInvoice.addEventListener("click", () => {
    saveInvoiceToHistory({ silent: true });
    saveDraft("Prête à imprimer");
    window.print();
  });
  elements.savedClientSelect.addEventListener("change", () => {
    if (elements.savedClientSelect.value) selectClient(elements.savedClientSelect.value);
  });
  elements.documentType.addEventListener("change", () => {
    updateDocumentMeta();
    scheduleDraftSave();
  });
  elements.clientSearch.addEventListener("input", renderClients);
  elements.historySearch.addEventListener("input", renderHistory);
  elements.exportExcel.addEventListener("click", exportToExcel);
  elements.exportExcelStats.addEventListener("click", exportToExcel);
  elements.addClientFromView.addEventListener("click", () => {
    startNewInvoice(true);
    elements.clientName.focus();
  });

  elements.clientGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-client-action]");
    if (!button) return;
    const { clientAction, clientId } = button.dataset;
    if (clientAction === "delete") deleteClient(clientId);
    if (clientAction === "edit") {
      selectClient(clientId);
      showView("invoiceView");
      elements.clientName.focus();
    }
    if (clientAction === "invoice") {
      startNewInvoice(true);
      selectClient(clientId);
      showView("invoiceView");
    }
  });

  elements.historyBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-invoice-action]");
    if (!button) return;
    const invoice = invoices.find((item) => item.id === button.dataset.invoiceId);
    if (button.dataset.invoiceAction === "open") openInvoice(button.dataset.invoiceId);
    if (button.dataset.invoiceAction === "delete") deleteInvoice(button.dataset.invoiceId);
    if (button.dataset.invoiceAction === "email" && invoice) emailInvoice(invoice);
  });
  elements.historyBody.addEventListener("change", (event) => {
    const select = event.target.closest("[data-status-id]");
    if (select) updateInvoiceStatus(select.dataset.statusId, select.value);
  });

  [
    elements.invoiceNumber,
    elements.invoiceDate,
    elements.paymentDays,
    elements.discountRate,
    elements.vatRate,
    elements.clientName,
    elements.clientAddress,
    elements.clientVat,
    elements.clientEmail,
    elements.invoiceNotes,
    elements.quoteIssuer,
    elements.quoteValidityDays,
    elements.quoteDuration,
    elements.quoteSubject,
    elements.quoteIntro
  ].forEach((field) => {
    field.addEventListener("input", () => {
      updateDocumentMeta();
      calculate();
      scheduleDraftSave();
    });
    field.addEventListener("change", () => {
      updateDocumentMeta();
      calculate();
      scheduleDraftSave();
    });
  });

  window.addEventListener("beforeprint", () => {
    updateDocumentMeta();
    calculate();
  });

  refreshClientInterface();
  refreshHistoryInterface();
  renderStats();
  loadDraft();
})();
