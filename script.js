const SUPABASE_URL = "ВСТАВЬ_СЮДА_SUPABASE_URL";
const SUPABASE_ANON_KEY = "ВСТАВЬ_СЮДА_SUPABASE_ANON_KEY";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const taskInput = document.getElementById("taskInput");
const addBtn = document.getElementById("addBtn");
const taskList = document.getElementById("taskList");
const searchInput = document.getElementById("searchInput");
const taskCounter = document.getElementById("taskCounter");
const statusText = document.getElementById("statusText");
const clearCompletedBtn = document.getElementById("clearCompletedBtn");
const filterButtons = document.querySelectorAll(".filter-btn");

let tasks = [];
let currentFilter = "all";

function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const active = total - completed;

    taskCounter.textContent = `${total} задач`;
    statusText.textContent = `Всего: ${total} | Выполнено: ${completed} | Осталось: ${active}`;
}

function getFilteredTasks() {
    const searchText = searchInput.value.toLowerCase().trim();

    return tasks.filter(task => {
        const matchesSearch = task.text.toLowerCase().includes(searchText);

        if (currentFilter === "active") {
            return !task.completed && matchesSearch;
        }

        if (currentFilter === "completed") {
            return task.completed && matchesSearch;
        }

        return matchesSearch;
    });
}

async function loadTasks() {
    taskList.innerHTML = `<div class="loading-message">Загрузка задач...</div>`;

    const { data, error } = await client
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Ошибка загрузки задач:", error.message);
        taskList.innerHTML = `<div class="empty-message">Ошибка загрузки данных.</div>`;
        return;
    }

    tasks = data || [];
    renderTasks();
}

async function addTask() {
    const text = taskInput.value.trim();

    if (text === "") {
        alert("Введите задачу.");
        return;
    }

    const { error } = await client.from("tasks").insert([
        {
            text: text,
            completed: false
        }
    ]);

    if (error) {
        console.error("Ошибка добавления:", error.message);
        alert("Не удалось добавить задачу.");
        return;
    }

    taskInput.value = "";
    await loadTasks();
}

async function deleteTask(id) {
    const { error } = await client
        .from("tasks")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Ошибка удаления:", error.message);
        alert("Не удалось удалить задачу.");
        return;
    }

    await loadTasks();
}

async function toggleTask(id, completed) {
    const { error } = await client
        .from("tasks")
        .update({ completed: !completed })
        .eq("id", id);

    if (error) {
        console.error("Ошибка обновления:", error.message);
        alert("Не удалось обновить задачу.");
        return;
    }

    await loadTasks();
}

function editTask(id) {
    const taskItem = document.querySelector(`[data-id="${id}"]`);
    const task = tasks.find(t => t.id === id);

    if (!taskItem || !task) return;

    taskItem.innerHTML = `
    <div class="task-left">
      <input type="text" class="edit-input" maxlength="100" />
    </div>
    <div class="task-actions">
      <button class="action-btn save-btn">Сохранить</button>
      <button class="action-btn cancel-btn">Отмена</button>
    </div>
  `;

    const editInput = taskItem.querySelector(".edit-input");
    const saveBtn = taskItem.querySelector(".save-btn");
    const cancelBtn = taskItem.querySelector(".cancel-btn");

    editInput.value = task.text;
    editInput.focus();
    editInput.setSelectionRange(editInput.value.length, editInput.value.length);

    saveBtn.addEventListener("click", () => saveEdit(id, editInput.value));
    cancelBtn.addEventListener("click", renderTasks);

    editInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            saveEdit(id, editInput.value);
        }
        if (event.key === "Escape") {
            renderTasks();
        }
    });
}

async function saveEdit(id, newText) {
    const trimmedText = newText.trim();

    if (trimmedText === "") {
        alert("Задача не может быть пустой.");
        return;
    }

    const { error } = await client
        .from("tasks")
        .update({ text: trimmedText })
        .eq("id", id);

    if (error) {
        console.error("Ошибка редактирования:", error.message);
        alert("Не удалось сохранить изменения.");
        return;
    }

    await loadTasks();
}

async function clearCompletedTasks() {
    const { error } = await client
        .from("tasks")
        .delete()
        .eq("completed", true);

    if (error) {
        console.error("Ошибка очистки:", error.message);
        alert("Не удалось очистить выполненные задачи.");
        return;
    }

    await loadTasks();
}

function renderTasks() {
    taskList.innerHTML = "";

    const filteredTasks = getFilteredTasks();

    if (filteredTasks.length === 0) {
        taskList.innerHTML = `<div class="empty-message">Задач пока нет или ничего не найдено.</div>`;
        updateStats();
        return;
    }

    filteredTasks.forEach(task => {
        const li = document.createElement("li");
        li.className = `task-item ${task.completed ? "completed" : ""}`;
        li.setAttribute("data-id", task.id);

        const left = document.createElement("div");
        left.className = "task-left";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "task-checkbox";
        checkbox.checked = task.completed;

        const textSpan = document.createElement("span");
        textSpan.className = "task-text";
        textSpan.textContent = task.text;

        left.appendChild(checkbox);
        left.appendChild(textSpan);

        const actions = document.createElement("div");
        actions.className = "task-actions";

        const editBtn = document.createElement("button");
        editBtn.className = "action-btn edit-btn";
        editBtn.textContent = "Изменить";

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "action-btn delete-btn";
        deleteBtn.textContent = "Удалить";

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);

        li.appendChild(left);
        li.appendChild(actions);

        checkbox.addEventListener("change", () => toggleTask(task.id, task.completed));
        editBtn.addEventListener("click", () => editTask(task.id));
        deleteBtn.addEventListener("click", () => deleteTask(task.id));

        taskList.appendChild(li);
    });

    updateStats();
}

addBtn.addEventListener("click", addTask);

taskInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        addTask();
    }
});

searchInput.addEventListener("input", renderTasks);

filterButtons.forEach(button => {
    button.addEventListener("click", () => {
        filterButtons.forEach(btn => btn.classList.remove("active"));
        button.classList.add("active");
        currentFilter = button.dataset.filter;
        renderTasks();
    });
});

clearCompletedBtn.addEventListener("click", clearCompletedTasks);

loadTasks();