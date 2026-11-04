const STORAGE_KEY = "plantpal-plants-v1";
const plantIcons = ["🪴", "🌿", "🌱", "🍃", "🌵"];
const tones = ["mint", "peach", "blue", "yellow", "lilac"];

function dateOnly(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function shiftDate(date, amount) {
  const shifted = dateOnly(date);
  shifted.setDate(shifted.getDate() + amount);
  return shifted;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function makeSamplePlants() {
  const today = dateOnly(new Date());
  return [
    { id: "sample-moss", name: "Moss", type: "Monstera deliciosa", frequency: 7, lastWatered: toDateKey(shiftDate(today, -7)), icon: "🪴", tone: "mint" },
    { id: "sample-fern", name: "Fernie", type: "Boston fern", frequency: 3, lastWatered: toDateKey(shiftDate(today, -2)), icon: "🌿", tone: "blue" },
    { id: "sample-olive", name: "Olive", type: "Fiddle-leaf fig", frequency: 10, lastWatered: toDateKey(shiftDate(today, -8)), icon: "🌱", tone: "yellow" },
    { id: "sample-pip", name: "Pip", type: "Golden pothos", frequency: 7, lastWatered: toDateKey(shiftDate(today, -9)), icon: "🍃", tone: "peach" },
    { id: "sample-sage", name: "Sage", type: "Snake plant", frequency: 14, lastWatered: toDateKey(shiftDate(today, -13)), icon: "🌵", tone: "lilac" }
  ];
}

function loadPlants() {
  try {
    const savedPlants = localStorage.getItem(STORAGE_KEY);
    if (savedPlants) {
      const parsed = JSON.parse(savedPlants);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (error) {
    console.warn("PlantPal could not load saved plants.", error);
  }
  return makeSamplePlants();
}

let plants = loadPlants();
let activeFilter = "all";

const plantList = document.querySelector("#plant-list");
const emptyState = document.querySelector("#empty-state");
const addDialog = document.querySelector("#add-dialog");
const plusDialog = document.querySelector("#plus-dialog");
const plantForm = document.querySelector("#plant-form");
const formError = document.querySelector("#form-error");

function savePlants() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plants));
  } catch (error) {
    console.warn("PlantPal could not save plants in this browser.", error);
  }
}

function daysUntilWatering(plant) {
  const nextWatering = shiftDate(fromDateKey(plant.lastWatered), Number(plant.frequency));
  return Math.round((nextWatering - dateOnly(new Date())) / 86400000);
}

function formatDate(date) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

function getDueLabel(days) {
  if (days < 0) return `Overdue by ${Math.abs(days)} ${Math.abs(days) === 1 ? "day" : "days"}`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function renderPlant(plant, index) {
  const days = daysUntilWatering(plant);
  const nextDate = shiftDate(fromDateKey(plant.lastWatered), Number(plant.frequency));
  const due = days <= 0;
  const wateredToday = plant.lastWatered === toDateKey(new Date());
  const actionLabel = wateredToday ? "Watered today" : "Watered today";

  return `<article class="plant-card" style="animation-delay:${Math.min(index, 6) * 45}ms">
    <div class="plant-art" data-tone="${escapeHtml(plant.tone || "mint")}" aria-hidden="true">${escapeHtml(plant.icon || "🌱")}</div>
    <div class="plant-details"><h3>${escapeHtml(plant.name)}</h3><p>${escapeHtml(plant.type)} · every ${Number(plant.frequency)} days</p></div>
    <div class="plant-schedule"><strong class="plant-status${due ? " is-due" : ""}">${getDueLabel(days)}</strong><span>Next: ${formatDate(nextDate)}</span></div>
    <button class="water-button${wateredToday ? " is-watered" : ""}" type="button" data-water-id="${escapeHtml(plant.id)}" aria-label="Mark ${escapeHtml(plant.name)} as watered today">${wateredToday ? "✓ " : ""}${actionLabel}</button>
  </article>`;
}

function render() {
  const dueCount = plants.filter((plant) => daysUntilWatering(plant) <= 0).length;
  const visiblePlants = plants
    .filter((plant) => activeFilter === "all" || daysUntilWatering(plant) <= 0)
    .sort((first, second) => daysUntilWatering(first) - daysUntilWatering(second));

  document.querySelector("#plant-count").textContent = plants.length;
  document.querySelector("#due-count").textContent = dueCount;
  document.querySelector("#all-tab-count").textContent = plants.length;
  document.querySelector("#due-tab-count").textContent = dueCount;
  plantList.innerHTML = visiblePlants.map(renderPlant).join("");
  emptyState.hidden = plants.length > 0;
  plantList.hidden = visiblePlants.length === 0;
  if (plants.length > 0 && visiblePlants.length === 0) {
    plantList.innerHTML = `<div class="empty-state filter-empty"><span class="empty-illustration" aria-hidden="true">✨</span><h3>All caught up</h3><p>None of your plants need water right now.</p></div>`;
    plantList.hidden = false;
  }
}

document.querySelector("#today-label").textContent = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(new Date());

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach((tab) => {
      const selected = tab === button;
      tab.classList.toggle("is-active", selected);
      tab.setAttribute("aria-pressed", String(selected));
    });
    render();
  });
});

plantList.addEventListener("click", (event) => {
  const waterButton = event.target.closest("[data-water-id]");
  if (!waterButton) return;
  const plant = plants.find((item) => item.id === waterButton.dataset.waterId);
  if (!plant) return;
  plant.lastWatered = toDateKey(new Date());
  savePlants();
  render();
});

function openDialog(dialog) {
  if (typeof dialog.showModal === "function") dialog.showModal();
}

function closeDialog(dialog) {
  if (dialog.open) dialog.close();
}

document.querySelector("#add-open").addEventListener("click", () => openDialog(addDialog));
document.querySelector("#empty-add").addEventListener("click", () => openDialog(addDialog));
document.querySelector("#plus-open").addEventListener("click", () => openDialog(plusDialog));
document.querySelector("#plus-preview").addEventListener("click", () => openDialog(plusDialog));

document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => closeDialog(document.getElementById(button.dataset.close)));
});

plantForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(plantForm);
  const name = String(formData.get("name")).trim();
  const type = String(formData.get("type")).trim();
  const frequency = Number(formData.get("frequency"));
  if (!name || !type || !Number.isInteger(frequency) || frequency < 1 || frequency > 365) {
    formError.textContent = "Add a name, type, and watering interval from 1 to 365 days.";
    formError.hidden = false;
    return;
  }

  plants.push({
    id: `plant-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    type,
    frequency,
    lastWatered: toDateKey(new Date()),
    icon: plantIcons[plants.length % plantIcons.length],
    tone: tones[plants.length % tones.length]
  });
  savePlants();
  plantForm.reset();
  document.querySelector("#plant-frequency").value = "7";
  formError.hidden = true;
  closeDialog(addDialog);
  activeFilter = "all";
  document.querySelectorAll("[data-filter]").forEach((tab) => {
    const selected = tab.dataset.filter === "all";
    tab.classList.toggle("is-active", selected);
    tab.setAttribute("aria-pressed", String(selected));
  });
  render();
});

addDialog.addEventListener("click", (event) => {
  if (event.target === addDialog) closeDialog(addDialog);
});
plusDialog.addEventListener("click", (event) => {
  if (event.target === plusDialog) closeDialog(plusDialog);
});

render();