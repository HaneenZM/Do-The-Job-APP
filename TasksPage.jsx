import React, { useEffect, useState, useMemo } from "react";
import {
  useQuery,
  useAction,
  getTasks,
  createTask,
  updateTask,
  toggleTaskStatus,
  deleteTask,
  clearUserTasks,
} from "wasp/client/operations";

const TasksPage = () => {
  const { data: tasks = [], isLoading, error, refetch } = useQuery(getTasks);
  const createTaskFn = useAction(createTask);
  const updateTaskFn = useAction(updateTask);
  const toggleTaskStatusFn = useAction(toggleTaskStatus);
  const deleteTaskFn = useAction(deleteTask);
  const clearUserTasksFn = useAction(clearUserTasks);

  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState("MEDIUM");
  const [editingId, setEditingId] = useState(null);
  const [editingDescription, setEditingDescription] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Ensure most recent tasks are shown first
  const sortedTasks = useMemo(() => {
    try {
      return [...tasks].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (e) {
      return tasks;
    }
  }, [tasks]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      // Try best-effort to clear tasks for this session.
      try {
        // Fire-and-forget
        clearUserTasksFn();
      } catch (err) {
        // ignore
      }

      // Some browsers show a confirmation when set
      e.preventDefault();
      e.returnValue = "Your tasks will be cleared when you leave this page.";
      return e.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      try {
        clearUserTasksFn();
      } catch (err) {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const safeCall = async (fn) => {
    setIsProcessing(true);
    try {
      const res = await fn();
      if (refetch) await refetch();
      return res;
    } catch (err) {
      console.error(err);
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreate = async () => {
    const desc = (newDescription || "").trim();
    if (!desc) return;
    await safeCall(() => createTaskFn({ description: desc, priority: newPriority }));
    setNewDescription("");
    setNewPriority("MEDIUM");
  };

  const handleStartEdit = (task) => {
    setEditingId(task.id);
    setEditingDescription(task.description || "");
  };

  const handleSaveEdit = async (id) => {
    const desc = (editingDescription || "").trim();
    if (!desc) return;
    await safeCall(() => updateTaskFn({ id, description: desc }));
    setEditingId(null);
    setEditingDescription("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingDescription("");
  };

  const handlePriorityChange = async (id, priority) => {
    await safeCall(() => updateTaskFn({ id, priority }));
  };

  const handleStatusChange = async (id, status) => {
    await safeCall(() => updateTaskFn({ id, status }));
  };

  const handleToggleQuick = async (id) => {
    await safeCall(() => toggleTaskStatusFn({ id }));
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this task?")) return;
    await safeCall(() => deleteTaskFn({ id }));
  };

  const handleClearNow = async () => {
    if (!window.confirm("Clear all tasks now? This will remove them for this session.")) return;
    await safeCall(() => clearUserTasksFn());
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-3xl">
        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 mb-1">DoTheJobAPP</h1>
              <p className="text-sm text-slate-600">A lightweight session-based to-do list. Tasks are cleared when you leave the page.</p>
            </div>
            <div className="text-sm text-slate-500">Session-based ? No sign-up required</div>
          </div>

          <p className="text-sm text-amber-700 bg-amber-100 p-3 rounded my-4">
            Disclaimer: All tasks are stored only for this page session and will be cleared when you exit or refresh the page.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
            <input
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="New task description"
              className="col-span-2 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-sky-300"
            />

            <div className="flex gap-2">
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                className="px-3 py-2 border rounded-md focus:outline-none"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
              </select>
              <button
                onClick={handleCreate}
                disabled={isProcessing}
                className="bg-sky-600 disabled:opacity-60 hover:bg-sky-700 text-white font-semibold px-4 py-2 rounded-md"
              >
                Add
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-slate-600">Your tasks (most recent first)</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => refetch?.()}
                className="text-sm bg-slate-200 hover:bg-slate-300 px-3 py-1 rounded"
              >
                Refresh
              </button>
              <button
                onClick={handleClearNow}
                disabled={isProcessing}
                className="text-sm bg-red-500 disabled:opacity-60 hover:bg-red-600 text-white px-3 py-1 rounded"
              >
                Clear tasks now
              </button>
            </div>
          </div>

          {isLoading && <div className="text-center py-6">Loading tasks...</div>}
          {error && <div className="text-red-600">Error loading tasks: {error.message || String(error)}</div>}

          <div className="space-y-3">
            {sortedTasks.length === 0 && !isLoading && (
              <div className="text-center text-slate-500 py-6">No tasks yet ? add one above.</div>
            )}

            {sortedTasks.map((task) => (
              <div
                key={task.id}
                className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 bg-slate-50 p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3 md:w-1/12">
                  <input
                    type="checkbox"
                    checked={task.status === "DONE"}
                    onChange={() => handleToggleQuick(task.id)}
                    className="h-5 w-5"
                    aria-label={`Toggle status for ${task.description}`}
                  />
                  <div className="text-xs text-slate-500">{new Date(task.createdAt).toLocaleString()}</div>
                </div>

                <div className="flex-1 md:w-7/12">
                  {editingId === task.id ? (
                    <div className="flex gap-2">
                      <input
                        value={editingDescription}
                        onChange={(e) => setEditingDescription(e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-md"
                      />
                      <button
                        onClick={() => handleSaveEdit(task.id)}
                        disabled={isProcessing}
                        className="bg-green-500 disabled:opacity-60 hover:bg-green-600 text-white px-3 py-1 rounded"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-slate-800 font-medium">{task.description}</div>
                        <div className="text-xs text-slate-500">Priority: {task.priority} ? Status: {task.status}</div>
                      </div>
                      <div className="md:hidden">
                        <button
                          onClick={() => handleStartEdit(task)}
                          className="text-sm bg-slate-200 hover:bg-slate-300 px-2 py-1 rounded mr-2"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 md:flex-row md:items-center md:w-5/12">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600">Priority</label>
                    <select
                      value={task.priority}
                      onChange={(e) => handlePriorityChange(task.id, e.target.value)}
                      className="px-2 py-1 border rounded"
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600">Status</label>
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task.id, e.target.value)}
                      className="px-2 py-1 border rounded"
                    >
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="DONE">DONE</option>
                      <option value="NEEDS_ATTENTION">NEEDS_ATTENTION</option>
                    </select>
                  </div>

                  <div className="ml-auto flex gap-2">
                    <button
                      onClick={() => handleStartEdit(task)}
                      className="hidden md:inline-block bg-amber-300 hover:bg-amber-400 px-3 py-1 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(task.id)}
                      disabled={isProcessing}
                      className="bg-red-500 disabled:opacity-60 hover:bg-red-600 text-white px-3 py-1 rounded"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-xs text-slate-500">Tip: Use the checkbox on the left to quickly toggle between DONE and IN_PROGRESS.</div>
        </div>
      </div>
    </div>
  );
};

export default TasksPage;
