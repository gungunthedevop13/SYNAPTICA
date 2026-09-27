import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "quill/dist/quill.snow.css";
import Quill from "quill";
import "quill/modules/clipboard";
import "quill/modules/syntax";
import "../components/NotesPage.css";

// Registered once at module load — was previously re-registered on every
// render inside the component body, which is wasteful and can trigger
// Quill console warnings about re-registering an already-known format.
const Font = Quill.import("formats/font");
Font.whitelist = ["sans", "serif", "monospace", "roboto", "georgia", "arial", "tahoma", "verdana"];
Quill.register(Font, true);

const QUILL_TOOLBAR = [
  [
    { font: ["sans", "serif", "monospace", "roboto", "georgia", "arial", "tahoma", "verdana"] },
    { size: ["small", false, "large", "huge"] },
  ],
  [{ header: [1, 2, 3, false] }],
  ["bold", "italic", "underline", "strike"],
  [{ list: "ordered" }, { list: "bullet" }, { list: "check" }],
  ["code-block"],
  ["link", "image"],
  [{ color: [] }, { background: [] }],
  [{ align: [] }],
  ["clean"],
];

// Escapes text before it's interpolated into an HTML string — the exported
// note's title was previously injected raw, so a title containing something
// like `</h1><script>` would execute in the print window.
const escapeHtml = (str) =>
  String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const NotesPage = () => {
  const navigate = useNavigate();
  const editorRef = useRef(null);
  const quillInstanceRef = useRef(null);

  const [notebooks, setNotebooks] = useState(() => {
    const saved = localStorage.getItem("notebooks");
    return saved ? JSON.parse(saved) : { "My Notebook": { General: [] } };
  });

  const [selectedNotebook, setSelectedNotebook] = useState("My Notebook");
  const [selectedSection, setSelectedSection] = useState("General");
  const currentNotes = notebooks[selectedNotebook]?.[selectedSection] || [];

  const [showStickyNotes, setShowStickyNotes] = useState(false);
  const [stickyNotes, setStickyNotes] = useState(() => {
    const saved = localStorage.getItem("stickyNotes");
    return saved ? JSON.parse(saved) : [];
  });
  const stickyPanelRef = useRef(null);
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem("stickyPanelPosition");
    return saved ? JSON.parse(saved) : { x: 100, y: 100 };
  });
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [panelSize, setPanelSize] = useState(() => {
    const saved = localStorage.getItem("stickyPanelSize");
    return saved ? JSON.parse(saved) : { width: 300 };
  });
  const [resizing, setResizing] = useState(false);

  const addStickyNote = () => {
    const newNote = { id: Date.now(), content: "", color: "#fffae6" };
    const updatedNotes = [...stickyNotes, newNote];
    setStickyNotes(updatedNotes);
    localStorage.setItem("stickyNotes", JSON.stringify(updatedNotes));
  };

  const handleStickyNoteChange = (id, content) => {
    const updatedNotes = stickyNotes.map((note) =>
      note.id === id ? { ...note, content } : note
    );
    setStickyNotes(updatedNotes);
    localStorage.setItem("stickyNotes", JSON.stringify(updatedNotes));
  };

  const deleteStickyNote = (id) => {
    if (!window.confirm("Delete this sticky note?")) return;
    const updatedNotes = stickyNotes.filter((note) => note.id !== id);
    setStickyNotes(updatedNotes);
    localStorage.setItem("stickyNotes", JSON.stringify(updatedNotes));
  };

  const handleDragStart = (e) => {
    setDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e) => {
    if (dragging) {
      // Clamp within the viewport so the panel can never be dragged
      // somewhere unreachable.
      const maxX = window.innerWidth - 60;
      const maxY = window.innerHeight - 40;
      const nextX = Math.min(Math.max(0, e.clientX - dragOffset.x), maxX);
      const nextY = Math.min(Math.max(0, e.clientY - dragOffset.y), maxY);
      setPosition({ x: nextX, y: nextY });
    }
    if (resizing) {
      setPanelSize((prev) => ({
        ...prev,
        width: Math.max(200, e.clientX - position.x),
      }));
    }
  };

  const handleMouseUp = () => {
    if (dragging) {
      localStorage.setItem("stickyPanelPosition", JSON.stringify(position));
    }
    if (resizing) {
      localStorage.setItem("stickyPanelSize", JSON.stringify(panelSize));
    }
    setDragging(false);
    setResizing(false);
  };

  const handleResizeStart = () => setResizing(true);

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, resizing, dragOffset, position, panelSize]);

  const [selectedNote, setSelectedNote] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [saveError, setSaveError] = useState("");

  const getTagColor = (tag) => {
    const hash = [...tag].reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 70%)`;
  };

  useEffect(() => {
    if (editorRef.current && !quillInstanceRef.current) {
      quillInstanceRef.current = new Quill(editorRef.current, {
        theme: "snow",
        placeholder: "Write your notes here...",
        modules: { toolbar: QUILL_TOOLBAR },
      });
    }
  }, []);

  const handlePrintNote = () => {
    const content = quillInstanceRef.current?.root.innerHTML;
    if (!content || content === "<p><br></p>") {
      setSaveError("Nothing to export — write something first.");
      return;
    }

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Exported Note</title>
          <style>
            body {
              font-family: 'Segoe UI', sans-serif;
              padding: 40px;
              line-height: 1.6;
              color: #333;
            }
            h1 {
              text-align: center;
              font-size: 24px;
            }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(selectedNote?.title || noteTitle || "Untitled Note")}</h1>
          ${content}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  // Whether the editor currently holds changes that haven't been saved —
  // used to guard against silently discarding/overwriting work when
  // switching notebooks, sections, or notes.
  const isDirty = () => {
    const currentContent = quillInstanceRef.current?.root.innerHTML || "";
    const savedContent = selectedNote?.content || "";
    const savedTitle = selectedNote?.title || "";
    const isBlank = currentContent === "" || currentContent === "<p><br></p>";

    if (!selectedNote) {
      // New, unsaved note: dirty only if the person actually typed something.
      return !isBlank || noteTitle.trim() !== "" || tags.length > 0;
    }
    return (
      currentContent !== savedContent ||
      noteTitle !== savedTitle ||
      JSON.stringify(tags) !== JSON.stringify(selectedNote.tags || [])
    );
  };

  const resetEditor = () => {
    setSelectedNote(null);
    setEditingIndex(null);
    setNoteTitle("");
    setTags([]);
    setSaveError("");
    quillInstanceRef.current?.setContents([]);
  };

  // Wraps any "switch context" action (new note, select a different note,
  // change notebook/section) with an unsaved-changes confirmation — this is
  // what actually fixes the data-loss bug: previously, switching notebooks
  // mid-edit left the editor showing stale content against a stale
  // editingIndex, so hitting Save could silently overwrite an unrelated
  // note in the new context.
  const guardedSwitch = (action) => {
    if (isDirty() && !window.confirm("You have unsaved changes. Discard them?")) {
      return;
    }
    resetEditor();
    action();
  };

  const handleNewNote = () => {
    guardedSwitch(() => {});
  };

  const saveNote = () => {
    const content = quillInstanceRef.current?.root.innerHTML || "";
    if (!content || content === "<p><br></p>") {
      setSaveError("Can't save an empty note — write something first.");
      return;
    }
    const title = noteTitle.trim();
    if (!title) {
      setSaveError("Give this note a title before saving.");
      return;
    }

    const noteData = {
      id: selectedNote?.id || Date.now(),
      title,
      content,
      tags,
    };

    setNotebooks((prev) => {
      const existingSection = prev[selectedNotebook]?.[selectedSection] || [];
      const updatedSection =
        editingIndex !== null
          ? existingSection.map((n, i) => (i === editingIndex ? noteData : n))
          : [...existingSection, noteData];

      const updated = {
        ...prev,
        [selectedNotebook]: {
          ...prev[selectedNotebook],
          [selectedSection]: updatedSection,
        },
      };
      localStorage.setItem("notebooks", JSON.stringify(updated));
      return updated;
    });

    setSaveError("");
    resetEditor();
  };

  const deleteNote = (index) => {
    if (!window.confirm("Are you sure you want to delete this note?")) return;

    setNotebooks((prev) => {
      const existingSection = prev[selectedNotebook]?.[selectedSection];
      if (!existingSection) return prev;

      const updatedSection = existingSection.filter((_, i) => i !== index);
      const updated = {
        ...prev,
        [selectedNotebook]: {
          ...prev[selectedNotebook],
          [selectedSection]: updatedSection,
        },
      };
      localStorage.setItem("notebooks", JSON.stringify(updated));
      return updated;
    });

    if (editingIndex === index) {
      resetEditor();
    }
  };

  const addTag = (e) => {
    e.preventDefault();
    if (tagInput.trim()) {
      const tagLabel = tagInput.trim();
      if (!tags.find((t) => t.label === tagLabel)) {
        const color = getTagColor(tagLabel);
        setTags([...tags, { label: tagLabel, color }]);
      }
      setTagInput("");
    }
  };

  const filteredNotes = currentNotes.filter((note) =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectNote = (note) => {
    guardedSwitch(() => {
      const index = currentNotes.findIndex((n) => n.id === note.id);
      setSelectedNote(note);
      setEditingIndex(index);
      setNoteTitle(note.title);
      setTags(note.tags || []);
      if (quillInstanceRef.current) {
        quillInstanceRef.current.root.innerHTML = note.content;
      }
    });
  };

  const handleNotebookChange = (newNotebook) => {
    guardedSwitch(() => {
      setSelectedNotebook(newNotebook);
      const sections = Object.keys(notebooks[newNotebook] || {});
      setSelectedSection(sections[0] || "General");
    });
  };

  const handleSectionChange = (newSection) => {
    guardedSwitch(() => {
      setSelectedSection(newSection);
    });
  };

  return (
    <div className="notes-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <button className="notes-back" onClick={() => navigate("/home")}>
            ← Back
          </button>
          <h2>Notes</h2>
          <div className="notebook-selectors">
            <select
              value={selectedNotebook}
              onChange={(e) => handleNotebookChange(e.target.value)}
            >
              {Object.keys(notebooks).map((name, idx) => (
                <option key={idx} value={name}>{name}</option>
              ))}
            </select>
            <select
              value={selectedSection}
              onChange={(e) => handleSectionChange(e.target.value)}
            >
              {Object.keys(notebooks[selectedNotebook] || {}).map((section, idx) => (
                <option key={idx} value={section}>{section}</option>
              ))}
            </select>
          </div>

          <div className="notebook-buttons">
            <button
              onClick={() => {
                const name = prompt("Enter new notebook name:");
                if (name && !notebooks[name]) {
                  const updated = { ...notebooks, [name]: { General: [] } };
                  setNotebooks(updated);
                  localStorage.setItem("notebooks", JSON.stringify(updated));
                  guardedSwitch(() => {
                    setSelectedNotebook(name);
                    setSelectedSection("General");
                  });
                } else if (notebooks[name]) {
                  alert("Notebook already exists.");
                }
              }}
            >
              + New Notebook
            </button>

            <button
              onClick={() => {
                const section = prompt("Enter new section name:");
                if (
                  section &&
                  notebooks[selectedNotebook] &&
                  !notebooks[selectedNotebook][section]
                ) {
                  const updated = {
                    ...notebooks,
                    [selectedNotebook]: {
                      ...notebooks[selectedNotebook],
                      [section]: [],
                    },
                  };
                  setNotebooks(updated);
                  localStorage.setItem("notebooks", JSON.stringify(updated));
                  guardedSwitch(() => setSelectedSection(section));
                } else if (
                  notebooks[selectedNotebook] &&
                  notebooks[selectedNotebook][section]
                ) {
                  alert("Section already exists.");
                }
              }}
            >
              + New Section
            </button>
          </div>

          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="notes-list">
          {filteredNotes.map((note) => {
            const actualIndex = currentNotes.findIndex((n) => n.id === note.id);
            return (
              <div
                key={note.id}
                className="note-preview"
                onClick={() => handleSelectNote(note)}
              >
                <h4>{note.title}</h4>
                <div className="note-tags">
                  {note.tags?.map((tag, i) => (
                    <span
                      key={i}
                      className="tag-badge"
                      style={{ backgroundColor: tag.color, color: "#171a12" }}
                    >
                      {tag.label}
                    </span>
                  ))}
                </div>
                <div className="note-actions">
                  <button
                    className="note-action-btn"
                    aria-label={`Edit "${note.title}"`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectNote(note);
                    }}
                  >
                    <i className="ti ti-pencil" aria-hidden="true" />
                  </button>
                  <button
                    className="note-action-btn delete"
                    aria-label={`Delete "${note.title}"`}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNote(actualIndex);
                    }}
                  >
                    <i className="ti ti-trash" aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="main-editor">
        <div className="editor-toolbar">
          <div className="editor-title-row">
            <input
              type="text"
              className="editor-title-input"
              placeholder="Note title..."
              value={noteTitle}
              onChange={(e) => { setNoteTitle(e.target.value); setSaveError(""); }}
            />
            {editingIndex !== null && (
              <button className="editor-new-note-btn" onClick={handleNewNote}>
                + New note
              </button>
            )}
          </div>

          <div className="editor-toolbar-actions">
            <form onSubmit={addTag} className="tag-form-inline">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add tag"
              />
              <button type="submit">Add</button>
            </form>
            <button onClick={saveNote}>
              {editingIndex !== null ? "Update" : "Save"}
            </button>
            <button onClick={handlePrintNote}>Export</button>
            <button
              onClick={() => setShowStickyNotes(!showStickyNotes)}
              className="sticky-toggle-button"
            >
              Sticky Notes
            </button>
          </div>

          {saveError && <div className="editor-save-error">{saveError}</div>}

          <div className="tag-display">
            {tags.map((tag, i) => (
              <span
                key={i}
                className="tag-badge"
                style={{ backgroundColor: tag.color, color: "#171a12" }}
              >
                {tag.label}
              </span>
            ))}
          </div>
        </div>

        <div className="quill-editor" ref={editorRef} />
      </div>

      {showStickyNotes && (
        <div
          className="sticky-panel"
          ref={stickyPanelRef}
          style={{ top: position.y, left: position.x, width: panelSize.width }}
        >
          <div className="sticky-panel-header" onMouseDown={handleDragStart}>
            <span>Sticky Notes</span>
            <button onClick={() => setShowStickyNotes(false)} aria-label="Close sticky notes">✖</button>
          </div>
          <div className="sticky-panel-content">
            {stickyNotes.map((note) => (
              <div key={note.id} className="sticky-note" style={{ backgroundColor: note.color }}>
                <div
                  className="sticky-note-body"
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => handleStickyNoteChange(note.id, e.currentTarget.innerHTML)}
                  ref={(el) => {
                    if (el && !el.innerHTML) el.innerHTML = note.content;
                  }}
                ></div>
                <button onClick={() => deleteStickyNote(note.id)} aria-label="Delete sticky note">✖</button>
              </div>
            ))}
          </div>
          <button className="add-sticky-button" onClick={addStickyNote}>
            + Add Sticky
          </button>
          <div className="resize-handle" onMouseDown={handleResizeStart}></div>
        </div>
      )}
    </div>
  );
};

export default NotesPage;